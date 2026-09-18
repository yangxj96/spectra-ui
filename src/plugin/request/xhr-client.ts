import { GlobalUtils } from "@/utils/global-utils";
import { MessageUtils } from "@/utils/message-utils";

import { claimSessionExpiration, expireSession, getAccessToken, refreshAccessToken } from "./auth";
import { BinaryRequestError, RequestCancelledError } from "./error";
import { registerRequest, unregisterRequest } from "./request-lifecycle";

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

function parseXhrError(xhr: XMLHttpRequest, headers: Headers): BinaryRequestError {
    // 上传接口可能返回统一 JSON，也可能只返回文本或响应头错误码，按优先级保留可展示消息。
    const raw = xhr.responseText;
    let payload: { code?: number | string; msg?: string } | undefined;
    try {
        payload = raw ? (JSON.parse(raw) as { code?: number | string; msg?: string }) : undefined;
    } catch {
        payload = undefined;
    }
    const message = payload?.msg || (raw && raw.trim()) || xhr.statusText || "二进制请求失败";
    return new BinaryRequestError(xhr.status, message, payload?.code ?? headers.get("x-error-code") ?? undefined);
}

type XhrContext = {
    token: string | null;
    controller: AbortController;
};

async function expireAndReject(): Promise<never> {
    // 上传和普通请求共用会话失效处理，确保用户只看到一次过期提示并回到登录页。
    await expireSession();
    if (claimSessionExpiration()) {
        MessageUtils.error("登录已过期");
        GlobalUtils.toLogin();
    }
    throw new BinaryRequestError(401, "登录已过期", 401);
}

/** 发起一次不可重试的 XHR；是否刷新 Token 由 requestBinary 的外层循环决定。 */
function send(
    url: string,
    body: Blob | ArrayBuffer | ArrayBufferView,
    options: XhrRequestOptions,
    context: XhrContext
): Promise<BinaryResponse> {
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
                finish(() => reject(parseXhrError(xhr, responseHeaderMap)));
            }
        };
        xhr.onerror = () => finish(() => reject(new BinaryRequestError(0, "网络请求失败")));
        xhr.ontimeout = () => finish(() => reject(new BinaryRequestError(408, "二进制请求超时")));
        xhr.onabort = () => finish(() => reject(new RequestCancelledError()));
        // 将 Fetch 风格的 AbortSignal 映射到 XHR 的 abort 事件，保持两个客户端的取消语义一致。
        context.controller.signal.addEventListener("abort", () => xhr.abort(), { once: true });
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
    // 注册到统一请求生命周期，登录失效时可以取消正在进行的本地上传。
    registerRequest(key, controller);
    if (options.signal) {
        if (options.signal.aborted) controller.abort();
        else options.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    try {
        let token = auth === "required" ? getAccessToken() : null;
        let retried = false;
        while (true) {
            try {
                return await send(url, body, { ...options, auth }, { token, controller });
            } catch (error) {
                if (
                    // 仅本地认证请求允许刷新；预签名地址和显式关闭重试的调用直接抛出原错误。
                    error instanceof BinaryRequestError &&
                    error.status === 401 &&
                    auth === "required" &&
                    options.retryOnAuth !== false &&
                    !retried
                ) {
                    retried = true;
                    const newToken = await refreshAccessToken();
                    if (!newToken) return expireAndReject();
                    token = newToken.access_token;
                    continue;
                }
                throw error;
            }
        }
    } finally {
        unregisterRequest(key);
    }
}
