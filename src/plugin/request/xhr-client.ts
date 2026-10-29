import { GlobalUtils } from "@/utils/global-utils";
import { MessageUtils } from "@/utils/message-utils";

import { claimSessionExpiration, expireSession, getAccessToken, refreshAccessToken } from "./auth";
import { BinaryRequestError, RequestCancelledError } from "./error";
import { getSessionEpoch, registerRequest, unregisterRequest } from "./request-lifecycle";

const BASE_URL = import.meta.env.VITE_API_URL;
let requestSequence = 0;

/** XHR 上传请求的最小配置；external 用于不属于当前 Web API 的预签名地址。 */
export type XhrRequestOptions = {
    headers?: Record<string, string>;
    signal?: AbortSignal;
    external?: boolean;
    auth?: "required" | "skip";
    retryOnAuth?: boolean;
    timeout?: number;
    onUploadProgress?: (loaded: number, total: number) => void;
};

export type BinaryResponse = {
    status: number;
    headers: Headers;
};

function joinUrl(base: string, url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    const path = "/" + url.replace(/^\/+/, "");
    if (!base || base === "/") return path;
    return base.replace(/\/+$/, "") + path;
}

function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const prefix = `${encodeURIComponent(name)}=`;
    const value = document.cookie
        .split(";")
        .map(item => item.trim())
        .find(item => item.startsWith(prefix));
    return value ? decodeURIComponent(value.slice(prefix.length)) : null;
}

function responseHeaders(xhr: XMLHttpRequest): Headers {
    const headers = new Headers();
    for (const line of xhr
        .getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/)) {
        const separator = line.indexOf(":");
        if (separator > 0) headers.append(line.slice(0, separator).trim(), line.slice(separator + 1).trim());
    }
    return headers;
}

function parseXhrError(xhr: XMLHttpRequest): BinaryRequestError {
    // 仅统一 JSON 的 error_code 表示稳定业务错误标识。
    const raw = xhr.responseText;
    let payload: { msg?: string; error_code?: string } | undefined;
    try {
        payload = raw ? (JSON.parse(raw) as { msg?: string; error_code?: string }) : undefined;
    } catch {
        payload = undefined;
    }
    const message = payload?.msg || (raw && raw.trim()) || xhr.statusText || "二进制请求失败";
    return new BinaryRequestError(xhr.status, message, payload?.error_code);
}

type XhrContext = {
    token: string | null;
    controller: AbortController;
    epoch: number;
};

/** 刷新失败时区分“会话已切换到新身份”和“当前会话过期”。 */
function handleRefreshFailure(epoch: number): Promise<never> {
    if (epoch !== getSessionEpoch() && getAccessToken()) {
        return Promise.reject(new RequestCancelledError("会话已切换"));
    }
    return expireAndReject();
}

async function expireAndReject(): Promise<never> {
    // 上传和普通请求共用会话失效处理，确保用户只看到一次过期提示并回到登录页。
    expireSession();
    const error = new BinaryRequestError(401, "登录已过期", "UNAUTHENTICATED");
    if (claimSessionExpiration()) {
        MessageUtils.error(error);
        GlobalUtils.toLogin();
    }
    throw error;
}

/** 发起一次不可重试的 XHR；是否刷新 Token 由 requestBinary 的外层循环决定。 */
function send(
    url: string,
    body: Blob | ArrayBuffer | ArrayBufferView,
    options: XhrRequestOptions,
    context: XhrContext
): Promise<BinaryResponse> {
    if (context.controller.signal.aborted) throw new RequestCancelledError();
    const external = options.external === true;
    const finalUrl = external ? url : joinUrl(BASE_URL, url);
    const headers = new Headers(options.headers);
    // 预签名上传不能携带当前站点的认证头、API 版本和 CSRF 头，否则签名可能失效。
    if (!external && options.auth !== "skip") {
        headers.set("Api-Version", "1.0.0");
        headers.set("X-Client-Type", "WEB");
        const csrf = readCookie("XSRF-TOKEN");
        if (csrf) headers.set("X-XSRF-TOKEN", csrf);
        if (context.token) headers.set("Authorization", `Bearer ${context.token}`);
    }
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", body instanceof Blob && body.type ? body.type : "application/octet-stream");
    }

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        let settled = false;
        const finish = (callback: () => void) => {
            if (settled) return;
            settled = true;
            callback();
        };
        xhr.open("PUT", finalUrl, true);
        xhr.withCredentials = !external;
        xhr.timeout = options.timeout ?? 10 * 60 * 1000;
        for (const [name, value] of headers.entries()) {
            try {
                xhr.setRequestHeader(name, value);
            } catch {
                // 浏览器禁止 Content-Length 等受限请求头，实际长度由传输层设置。
            }
        }
        // progress 事件只负责上报已发送字节，断点续传的累计进度由上层上传工作流计算。
        xhr.upload.onprogress = event => {
            if (event.lengthComputable) options.onUploadProgress?.(event.loaded, event.total);
        };
        xhr.onload = () => {
            const responseHeaderMap = responseHeaders(xhr);
            if (xhr.status >= 200 && xhr.status < 300) {
                finish(() => resolve({ status: xhr.status, headers: responseHeaderMap }));
            } else {
                finish(() => reject(parseXhrError(xhr)));
            }
        };
        xhr.onerror = () => finish(() => reject(new BinaryRequestError(0, "网络请求失败")));
        xhr.ontimeout = () => finish(() => reject(new BinaryRequestError(408, "二进制请求超时")));
        xhr.onabort = () => finish(() => reject(new RequestCancelledError()));
        // 将 Fetch 风格的 AbortSignal 映射到 XHR 的 abort 事件，保持两个客户端的取消语义一致。
        // 监听必须在 send 前注册；注册后再次检查，避免刷新等待期间错过取消事件。
        context.controller.signal.addEventListener("abort", () => xhr.abort(), { once: true });
        if (context.controller.signal.aborted) {
            finish(() => reject(new RequestCancelledError()));
            return;
        }
        const requestBody = ArrayBuffer.isView(body)
            ? new Uint8Array(body.buffer, body.byteOffset, body.byteLength).slice().buffer
            : body;
        xhr.send(requestBody);
    });
}

/**
 * 文件上传唯一的 XHR 入口。
 *
 * <p>本地 API 上传允许一次 401 刷新重试；外部预签名上传不参与 Web 认证刷新，避免把站点 Token 发给对象存储。</p>
 */
export async function requestBinary(
    url: string,
    body: Blob | ArrayBuffer | ArrayBufferView,
    options: XhrRequestOptions = {}
): Promise<BinaryResponse> {
    const external = options.external === true;
    const auth = external ? "skip" : (options.auth ?? "required");
    const key = `xhr:${++requestSequence}`;
    const controller = new AbortController();
    const epoch = getSessionEpoch();
    // 注册到统一请求生命周期，登录失效时可以取消正在进行的本地上传。
    registerRequest(key, controller);
    bindAbortSignal(options.signal, controller);
    try {
        return await sendWithAuthRetry({ url, body, options, auth, controller, epoch });
    } finally {
        unregisterRequest(key);
    }
}

function bindAbortSignal(signal: AbortSignal | undefined, controller: AbortController): void {
    if (!signal) return;
    if (signal.aborted) {
        controller.abort();
        return;
    }
    signal.addEventListener("abort", () => controller.abort(), { once: true });
}

type XhrRetryContext = {
    url: string;
    body: Blob | ArrayBuffer | ArrayBufferView;
    options: XhrRequestOptions;
    auth: "required" | "skip";
    controller: AbortController;
    epoch: number;
};

async function sendWithAuthRetry(context: XhrRetryContext): Promise<BinaryResponse> {
    const { url, body, options, auth, controller, epoch } = context;
    let token = auth === "required" ? getAccessToken() : null;
    let retried = false;
    while (true) {
        try {
            return await send(url, body, { ...options, auth }, { token, controller, epoch });
        } catch (error) {
            if (!canRefresh(error, auth, options, retried)) throw error;
            retried = true;
            const newToken = await refreshAccessToken();
            if (!newToken) return handleRefreshFailure(epoch);
            token = newToken.access_token;
        }
    }
}

function canRefresh(error: unknown, auth: "required" | "skip", options: XhrRequestOptions, retried: boolean): boolean {
    return (
        error instanceof BinaryRequestError &&
        error.status === 401 &&
        auth === "required" &&
        options.retryOnAuth !== false &&
        !retried
    );
}
