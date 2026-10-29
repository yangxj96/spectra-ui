import qs from "qs";

import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store";
import { decrypt, encrypt, generateIv, sign, verifySignature } from "@/utils/crypto/crypto-utils";
import { GlobalUtils } from "@/utils/global-utils";
import { MessageUtils } from "@/utils/message-utils";

import { claimSessionExpiration, expireSession, getAccessToken, refreshAccessToken } from "./auth";
import { getCache, setCache } from "./cache";
import { HttpRequestError, isRequestCancelled, parseResponseError, RequestCancelledError } from "./error";
import {
    acquireLoading,
    cancelAllRequests,
    getInflightRequest,
    getSessionEpoch,
    registerRequest,
    releaseLoading,
    releasePriority,
    removeInflightRequest,
    setInflightRequest,
    unregisterRequest,
    waitPriority
} from "./request-lifecycle";

import type { RequestPriority } from "./request-lifecycle";

const BASE_URL = import.meta.env.VITE_API_URL;
const DEFAULT_TIMEOUT = 60000;
const DEFAULT_RETRY_DEADLINE = 10000;
const RETRYABLE_STATUS = new Set([408, 425, 429, 502, 503, 504]);
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
let binaryRequestSequence = 0;

export { HttpRequestError } from "./error";

/** 判断请求体是否已经是二进制数据；这类数据不能按 JSON 加密或序列化。 */
function isBinaryBody(body: unknown): body is Blob | ArrayBuffer | ArrayBufferView {
    return (
        (typeof Blob !== "undefined" && body instanceof Blob) || body instanceof ArrayBuffer || ArrayBuffer.isView(body)
    );
}

function stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    return `{${Object.keys(value as Record<string, unknown>)
        .sort()
        .map(key => `"${key}":${stableStringify((value as Record<string, unknown>)[key])}`)
        .join(",")}}`;
}

function createKey(url: string, method: string, body?: unknown, params?: unknown): string {
    // 会话代数进入键：身份切换后旧缓存和旧去重登记不可见，避免跨身份复用响应。
    const bodyKey = isBinaryBody(body) ? `binary:${++binaryRequestSequence}` : stableStringify(body ?? {});
    return `${getSessionEpoch()}:${method}:${url}:${stableStringify(params ?? {})}:${bodyKey}`;
}

function joinUrl(base: string, url: string): string {
    const path = "/" + url.replace(/^\/+/, "");
    if (!base || base === "/") return path;
    return base.replace(/\/+$/, "") + path;
}

function resolvePathParams(url: string, pathParams?: Record<string, unknown>): string {
    if (!pathParams) return url;
    return url.replace(/\{(\w+)\}/g, (_, key: string) => {
        const value = pathParams[key];
        if (value === undefined || value === null) throw new Error(`Missing path param: ${key}`);
        return encodeURIComponent(String(value));
    });
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

function getFilename(disposition: string | null): string | null {
    if (!disposition) return null;
    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/);
    return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function generateNonce(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function delay(milliseconds: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

type EncryptedResponseBody = {
    data: string;
    key: string;
    iv: string;
    nonce: string;
    signature: string;
    timestamp: number;
};

async function encryptRequestBody(body: BodyInit | null | undefined, isFormData: boolean, method: string) {
    const cryptoStore = useCryptoStore();
    // FormData、二进制和 GET 请求保持原始传输格式，只有普通业务 JSON 才进入请求加密流程。
    if (!cryptoStore.enabled || isFormData || !body || method === "GET") return body;
    if (!cryptoStore.server_public_key) throw new Error("通信加密公钥未就绪");
    const bodyText = typeof body === "string" ? body : JSON.stringify(body);
    const iv = generateIv();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = generateNonce();
    const { encryptedData, encryptedKey } = await encrypt(bodyText, iv, cryptoStore.server_public_key);
    const payload = { data: encryptedData, key: encryptedKey, iv, nonce, timestamp } as Record<string, unknown>;
    if (cryptoStore.client_private_key) {
        payload.signature = await sign(
            `data=${encryptedData}&nonce=${nonce}&timestamp=${timestamp}`,
            cryptoStore.client_private_key
        );
    }
    return JSON.stringify(payload);
}

async function decryptResponse<T>(body: EncryptedResponseBody): Promise<T> {
    const cryptoStore = useCryptoStore();
    if (!cryptoStore.server_public_key || !cryptoStore.client_private_key) {
        throw new Error("密钥未就绪，无法解密响应");
    }
    const signContent = `data=${body.data}&nonce=${body.nonce}&timestamp=${body.timestamp}`;
    if (!(await verifySignature(body.signature, signContent, cryptoStore.server_public_key))) {
        throw new Error("签名验证失败，数据可能被篡改");
    }
    const json = await decrypt(body.key, body.data, body.iv, cryptoStore.client_private_key);
    return JSON.parse(json) as T;
}

async function decryptResult<T>(data: T | undefined): Promise<T | undefined> {
    const cryptoStore = useCryptoStore();
    if (!cryptoStore.enabled || !data || typeof data !== "object") return data;
    const value = data as Record<string, unknown>;
    const encrypted =
        typeof value.data === "string" &&
        typeof value.key === "string" &&
        typeof value.iv === "string" &&
        typeof value.nonce === "string" &&
        typeof value.signature === "string" &&
        typeof value.timestamp === "number";
    return encrypted ? decryptResponse<T>(value as unknown as EncryptedResponseBody) : data;
}

async function handleBlobDownload(res: Response, shouldDownload: boolean): Promise<Blob | null> {
    const contentType = res.headers.get("content-type") ?? "";
    const downloadable = [
        "application/octet-stream",
        "application/pdf",
        "application/vnd",
        "text/csv",
        "image/png",
        "image/jpeg"
    ];
    // 只有明确的可下载媒体类型才读取 Blob，普通 JSON 错误响应继续走统一解析流程。
    if (!downloadable.some(type => contentType.includes(type))) return null;
    const blob = await res.blob();
    if (shouldDownload && typeof window !== "undefined") {
        const filename = getFilename(res.headers.get("content-disposition")) ?? "download";
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    }
    return blob;
}

async function failSession(): Promise<never> {
    // Fetch 和 XHR 都会进入这里；会话清理可重复执行，但提示和跳转只允许一次。
    expireSession();
    const error = new HttpRequestError("登录已过期", "UNAUTHENTICATED", 401);
    if (claimSessionExpiration()) {
        MessageUtils.error(error);
        GlobalUtils.toLogin();
    }
    throw error;
}

/** 刷新失败时区分“会话已切换到新身份”和“当前会话过期”。 */
function handleRefreshFailure(epoch: number): Promise<never> {
    if (epoch !== getSessionEpoch() && getAccessToken()) {
        return Promise.reject(new RequestCancelledError("会话已切换"));
    }
    return failSession();
}

function bindRequestSignal(signal: AbortSignal | null | undefined, controller: AbortController): void {
    if (!signal) return;
    if (signal.aborted) throw new RequestCancelledError();
    signal.addEventListener("abort", () => controller.abort(), { once: true });
}

function requestHeaders(context: {
    method: string;
    isFormData: boolean;
    isBinary: boolean;
    auth: "required" | "skip";
    token: string | null;
    headers?: HeadersInit;
}): HeadersInit {
    return {
        ...(!context.isFormData && !context.isBinary ? { "Content-Type": "application/json" } : {}),
        "Api-Version": "1.0.0",
        ...(!["GET", "HEAD", "OPTIONS"].includes(context.method)
            ? { "X-XSRF-TOKEN": readCookie("XSRF-TOKEN") ?? "" }
            : {}),
        ...(context.auth === "required" && context.token ? { Authorization: `Bearer ${context.token}` } : {}),
        ...context.headers,
        "X-Client-Type": "WEB"
    };
}

type AuthFetchContext = {
    rest: RequestInit;
    method: string;
    fetchPriority: RequestInit["priority"];
    isFormData: boolean;
    isBinary: boolean;
    auth: "required" | "skip";
    retryOnAuth: boolean;
    headers?: HeadersInit;
    controller: AbortController;
    epoch: number;
};

async function fetchWithAuth(
    finalUrl: string,
    body: BodyInit | null | undefined,
    context: AuthFetchContext
): Promise<Response> {
    let token = getAccessToken();
    let authRetried = false;
    while (true) {
        const response = await fetch(finalUrl, {
            ...context.rest,
            body,
            priority: context.fetchPriority,
            headers: requestHeaders({
                method: context.method,
                isFormData: context.isFormData,
                isBinary: context.isBinary,
                auth: context.auth,
                token,
                headers: context.headers
            }),
            credentials: "include",
            signal: context.controller.signal
        });
        if (response.status !== 401 || context.auth !== "required" || !context.retryOnAuth || authRetried)
            return response;
        const refreshEpoch = context.epoch;
        authRetried = true;
        const newToken = await refreshAccessToken();
        // 会话已切换到新登录时不能再清理新身份；纯过期则仍需统一提示和跳转登录。
        if (!newToken) return handleRefreshFailure(refreshEpoch);
        token = newToken.access_token;
    }
}

async function parseSuccessfulResponse<T>(
    response: Response,
    options: { responseType: string; download: boolean; noBody: boolean; cache: boolean; key: string }
): Promise<T> {
    if (options.responseType === "blob") return (await response.blob()) as T;
    const blob = await handleBlobDownload(response, options.download);
    if (blob) return blob as T;
    if (options.noBody || options.responseType === "empty") return undefined as T;
    let result: IResult<T>;
    try {
        result = (await response.json()) as IResult<T>;
    } catch {
        throw new HttpRequestError("响应数据格式错误", undefined, response.status);
    }
    result.data = await decryptResult<T>(result.data);
    if (result.code !== 200) {
        throw new HttpRequestError(result.msg || "请求失败", result.error_code, response.status);
    }
    if (options.cache) setCache(options.key, result.data);
    return result.data as T;
}

type ExecuteContext = {
    finalUrl: string;
    method: string;
    rest: RequestInit;
    body: BodyInit | null | undefined;
    fetchPriority: RequestInit["priority"];
    auth: "required" | "skip";
    retryOnAuth: boolean;
    headers?: HeadersInit;
    controller: AbortController;
    responseType: string;
    download: boolean;
    noBody: boolean;
    cache: boolean;
    key: string;
    errorFallback?: string;
    epoch: number;
};

async function executeRequest<T>(context: ExecuteContext): Promise<T> {
    const response = await fetchWithAuth(context.finalUrl, context.body, {
        rest: context.rest,
        method: context.method,
        fetchPriority: context.fetchPriority,
        isFormData: context.body instanceof FormData,
        isBinary: isBinaryBody(context.body),
        auth: context.auth,
        retryOnAuth: context.retryOnAuth,
        headers: context.headers,
        controller: context.controller,
        epoch: context.epoch
    });
    if (!response.ok) {
        const parsed = await parseResponseError(response, context.errorFallback);
        if (parsed.status === 401 && context.auth === "required") {
            if (context.epoch !== getSessionEpoch()) throw new RequestCancelledError("会话已切换");
            return failSession();
        }
        throw new HttpRequestError(parsed.message, parsed.errorCode, parsed.status);
    }
    return parseSuccessfulResponse<T>(response, context);
}

function requestMeta<U extends string>(
    url: U,
    options: RequestOptions<U>,
    rest: RequestInit
): {
    finalUrl: string;
    method: string;
    key: string;
} {
    const resolvedUrl = resolvePathParams(url, options.pathParams);
    let finalUrl = joinUrl(BASE_URL, resolvedUrl);
    if (options.params) {
        const query = qs.stringify(options.params, { arrayFormat: "indices", allowDots: true });
        if (query) finalUrl += `?${query}`;
    }
    const method = (rest.method || "GET").toUpperCase();
    return {
        finalUrl,
        method,
        key: createKey(finalUrl, method, rest.body, { params: options.params, pathParams: options.pathParams })
    };
}

function reusableRequest<T>(key: string, cache: boolean, dedupe: boolean): T | Promise<T> | undefined {
    if (cache) {
        const cached = getCache<T>(key);
        if (cached !== undefined) return cached;
    }
    if (dedupe) {
        const existing = getInflightRequest(key);
        if (existing) return existing as Promise<T>;
    }
    return undefined;
}

async function prepareBody(body: BodyInit | null | undefined, method: string): Promise<BodyInit | null | undefined> {
    const isFormData = body instanceof FormData;
    const isBinary = isBinaryBody(body);
    return isBinary ? body : encryptRequestBody(body, isFormData, method);
}

const REQUEST_DEFAULTS = {
    loading: false,
    download: false,
    priority: "normal" as RequestPriority,
    fetchPriority: "auto" as RequestInit["priority"],
    retry: 0,
    idempotent: false,
    retryDeadlineMs: DEFAULT_RETRY_DEADLINE,
    cache: false,
    dedupe: true,
    persistent: false,
    auth: "required" as "required" | "skip",
    retryOnAuth: true,
    noBody: false,
    responseType: "json" as "json" | "blob" | "empty",
    timeout: DEFAULT_TIMEOUT
};

function normalizeRequestOptions<U extends string>(options: RequestOptions<U>) {
    // cache 与 priority 在 RequestInit 中另有语义，必须从透传给 fetch 的 rest 中剔除。
    const { params, cache, priority, ...rest } = options;
    return {
        ...REQUEST_DEFAULTS,
        ...options,
        cache: cache ?? REQUEST_DEFAULTS.cache,
        priority: priority ?? REQUEST_DEFAULTS.priority,
        params,
        rest
    };
}

/** 只有安全方法或显式声明幂等的写入才允许在分类错误下重试。 */
function shouldRetry(
    error: unknown,
    method: string,
    context: { retry: number; idempotent: boolean; deadline: number }
) {
    if (context.retry <= 0 || Date.now() >= context.deadline) return false;
    if (!SAFE_METHODS.has(method) && !context.idempotent) return false;
    if (error instanceof HttpRequestError) {
        if (error.errorCode === "UNAUTHENTICATED") return false;
        return error.status === undefined || RETRYABLE_STATUS.has(error.status);
    }
    // Fetch 的网络层失败通常是 TypeError；加解密等本地错误不在此列。
    return error instanceof TypeError;
}

type RequestLifecycleContext<T> = {
    finalUrl: string;
    method: string;
    rest: RequestInit;
    loading: boolean;
    retry: number;
    idempotent: boolean;
    deadline: number;
    priority: RequestPriority;
    fetchPriority: RequestInit["priority"];
    auth: "required" | "skip";
    retryOnAuth: boolean;
    headers?: HeadersInit;
    responseType: string;
    download: boolean;
    noBody: boolean;
    cache: boolean;
    key: string;
    errorFallback?: string;
    timeout: number;
    signal: AbortSignal | null | undefined;
    persistent: boolean;
    execute: (controller: AbortController) => Promise<T>;
};

/** 执行一次尝试；每次尝试使用独立控制器并在 finally 释放登记和优先级配额。 */
async function attemptRequest<T>(context: RequestLifecycleContext<T>): Promise<T> {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let priorityAcquired = false;
    try {
        bindRequestSignal(context.signal, controller);
        registerRequest(context.key, controller, context.persistent);
        timeoutId = setTimeout(() => controller.abort(), context.timeout);
        await waitPriority(context.priority);
        priorityAcquired = true;
        return await context.execute(controller);
    } finally {
        if (timeoutId) clearTimeout(timeoutId);
        unregisterRequest(context.key);
        if (priorityAcquired) releasePriority(context.priority);
    }
}

async function retryLoop<T>(context: RequestLifecycleContext<T>): Promise<T> {
    let attempt = 0;
    for (;;) {
        try {
            return await attemptRequest(context);
        } catch (error) {
            if (isRequestCancelled(error)) throw new RequestCancelledError();
            if (!shouldRetry(error, context.method, context)) {
                MessageUtils.error(error);
                throw error;
            }
            attempt++;
            await delay(Math.min(200 * attempt, 1000));
        }
    }
}

async function runWithLifecycle<T>(context: RequestLifecycleContext<T>): Promise<T> {
    if (context.loading) acquireLoading();
    try {
        return await retryLoop(context);
    } finally {
        removeInflightRequest(context.key);
        if (context.loading) releaseLoading();
    }
}

/**
 * 普通 HTTP 请求唯一入口。
 *
 * <p>这里统一负责 URL 参数、请求加密、认证头、超时、取消、缓存、去重、错误解析和 Token 刷新。
 * 文件二进制上传必须改用 {@link requestBinary}，避免 Fetch 无法提供稳定的上传进度。</p>
 */
export async function request<T, U extends string>(url: U, options: RequestOptions<U> = {}): Promise<T> {
    const {
        loading,
        download,
        priority,
        fetchPriority,
        retry,
        idempotent,
        retryDeadlineMs,
        cache,
        dedupe,
        persistent,
        headers,
        auth,
        retryOnAuth,
        errorFallback,
        noBody,
        responseType,
        timeout,
        signal,
        rest
    } = normalizeRequestOptions(options);

    const { finalUrl, method, key } = requestMeta(url, options, rest);
    // 先生成请求身份，再决定是否命中缓存或复用同一条并发请求。
    const reusable = reusableRequest<T>(key, cache, dedupe);
    if (reusable !== undefined) return reusable;

    const epoch = getSessionEpoch();
    const requestPromise = runWithLifecycle<T>({
        finalUrl,
        method,
        rest,
        loading,
        retry,
        idempotent,
        deadline: Date.now() + retryDeadlineMs,
        priority,
        fetchPriority,
        auth,
        retryOnAuth,
        headers,
        responseType,
        download,
        noBody,
        cache,
        key,
        errorFallback,
        timeout,
        signal,
        persistent,
        execute: async controller => {
            const body = await prepareBody(rest.body, method);
            return executeRequest<T>({
                finalUrl,
                method,
                rest,
                body,
                fetchPriority,
                auth,
                retryOnAuth,
                headers,
                controller,
                responseType,
                download,
                noBody,
                cache,
                key,
                errorFallback,
                epoch
            });
        }
    });
    if (dedupe) setInflightRequest(key, requestPromise);
    return requestPromise;
}

if (typeof window !== "undefined") window.addEventListener("beforeunload", () => cancelAllRequests(true));
