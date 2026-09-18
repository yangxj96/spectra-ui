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
    getInflightRequest,
    registerRequest,
    releaseLoading,
    releasePriority,
    removeInflightRequest,
    setInflightRequest,
    unregisterRequest,
    waitPriority
} from "./request-lifecycle";

const BASE_URL = import.meta.env.VITE_API_URL;
const DEFAULT_TIMEOUT = 60000;
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
    // 普通请求使用稳定键支持缓存和并发去重；二进制请求不尝试序列化内容，直接按序号区分。
    const bodyKey = isBinaryBody(body) ? `binary:${++binaryRequestSequence}` : stableStringify(body ?? {});
    return `${method}:${url}:${stableStringify(params ?? {})}:${bodyKey}`;
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
    if (!cryptoStore.enabled || !cryptoStore.server_public_key || isFormData || !body || method === "GET") return body;
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

function nestedFailure(data: unknown): { code: number; msg: string } | undefined {
    // 部分后端代理会把失败响应嵌套在 data 中，避免只检查顶层 code 而吞掉真实消息。
    if (typeof data !== "object" || data === null) return undefined;
    const candidate = data as { code?: unknown; msg?: unknown };
    return typeof candidate.code === "number" && candidate.code >= 400 && typeof candidate.msg === "string"
        ? { code: candidate.code, msg: candidate.msg }
        : undefined;
}

function extractErrorCode(message: string | undefined): string | undefined {
    return message ? /^([A-Z][A-Z0-9_]*):/.exec(message)?.[1] : undefined;
}

async function failSession(): Promise<never> {
    // Fetch 和 XHR 都会进入这里；会话清理可重复执行，但提示和跳转只允许一次。
    await expireSession();
    if (claimSessionExpiration()) {
        MessageUtils.error("登录已过期");
        GlobalUtils.toLogin();
    }
    throw new HttpRequestError("登录已过期", 401, 401);
}

/**
 * 普通 HTTP 请求唯一入口。
 *
 * <p>这里统一负责 URL 参数、请求加密、认证头、超时、取消、缓存、去重、错误解析和 Token 刷新。
 * 文件二进制上传必须改用 {@link requestBinary}，避免 Fetch 无法提供稳定的上传进度。</p>
 */
export async function request<T, U extends string>(url: U, options: RequestOptions<U> = {}): Promise<T> {
    const {
        params,
        loading = true,
        download = false,
        priority = "normal",
        fetchPriority = "auto",
        retry = 0,
        cache = false,
        dedupe = true,
        persistent = false,
        headers,
        auth = "required",
        retryOnAuth = true,
        errorFallback,
        noBody = false,
        responseType = "json",
        timeout = DEFAULT_TIMEOUT,
        signal,
        ...rest
    } = options;

    const resolvedUrl = resolvePathParams(url, options.pathParams);
    let finalUrl = joinUrl(BASE_URL, resolvedUrl);
    if (params) {
        const query = qs.stringify(params, { arrayFormat: "indices", allowDots: true });
        if (query) finalUrl += `?${query}`;
    }
    const method = (rest.method || "GET").toUpperCase();
    // 先生成请求身份，再决定是否命中缓存或复用同一条并发请求。
    const key = createKey(finalUrl, method, rest.body, { params, pathParams: options.pathParams });
    if (cache) {
        const cached = getCache<T>(key);
        if (cached !== undefined) return cached;
    }
    if (dedupe) {
        const existing = getInflightRequest(key);
        if (existing) return existing as Promise<T>;
    }

    // 每个请求都使用自己的控制器；会话失效时由 request-lifecycle 批量取消非持久请求。
    const controller = new AbortController();
    if (signal) {
        if (signal.aborted) throw new RequestCancelledError();
        signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
    registerRequest(key, controller, persistent);
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const requestPromise = (async () => {
        if (loading) acquireLoading();
        try {
            const isFormData = rest.body instanceof FormData;
            const isBinary = isBinaryBody(rest.body);
            const body = isBinary ? rest.body : await encryptRequestBody(rest.body, isFormData, method);
            await waitPriority(priority);
            let token = getAccessToken();
            let authRetried = false;
            let response: Response;
            while (true) {
                response = await fetch(finalUrl, {
                    ...rest,
                    body,
                    priority: fetchPriority,
                    headers: {
                        ...(!isFormData && !isBinary ? { "Content-Type": "application/json" } : {}),
                        "Api-Version": "1.0.0",
                        ...(!["GET", "HEAD", "OPTIONS"].includes(method)
                            ? { "X-XSRF-TOKEN": readCookie("XSRF-TOKEN") ?? "" }
                            : {}),
                        ...(auth === "required" && token ? { Authorization: `Bearer ${token}` } : {}),
                        ...headers,
                        "X-Client-Type": "WEB"
                    },
                    credentials: "include",
                    signal: controller.signal
                });
                // 401 只允许触发一次刷新和重试；刷新请求本身使用 auth=skip，避免递归刷新。
                if (response.status !== 401 || auth !== "required" || !retryOnAuth || authRetried) break;
                authRetried = true;
                const newToken = await refreshAccessToken();
                if (!newToken) return failSession();
                token = newToken.access_token;
            }

            if (!response.ok) {
                // HTTP 层错误优先读取服务端统一响应，不能让 JSON 解析异常覆盖真实错误消息。
                const parsed = await parseResponseError(response, errorFallback);
                // 只有已携带会话凭据的请求才把 401 解释为会话失效；登录/刷新等 auth=skip 请求必须保留自身错误语义。
                if (parsed.status === 401 && auth === "required") return failSession();
                if (!isRequestCancelled(parsed)) MessageUtils.error(parsed.message);
                throw new HttpRequestError(
                    parsed.message,
                    parsed.code ?? extractErrorCode(parsed.message),
                    parsed.status
                );
            }
            if (responseType === "blob") return (await response.blob()) as T;
            const blob = await handleBlobDownload(response, download);
            if (blob) return blob as T;
            if (noBody || responseType === "empty") return undefined as T;
            let result: IResult<T>;
            try {
                result = (await response.json()) as IResult<T>;
            } catch {
                throw new HttpRequestError("响应数据格式错误", undefined, response.status);
            }
            result.data = await decryptResult<T>(result.data);
            // 同时检查统一响应 code 和 data 内嵌失败，兼容网关转发后的错误结构。
            const nested = nestedFailure(result.data);
            if (nested) throw new HttpRequestError(nested.msg, extractErrorCode(nested.msg), nested.code);
            if (result.code !== 200) {
                MessageUtils.error(result.msg || "请求失败");
                throw new HttpRequestError(result.msg || "请求失败", extractErrorCode(result.msg), result.code);
            }
            if (cache) setCache(key, result.data);
            return result.data as T;
        } catch (error) {
            if (isRequestCancelled(error)) throw new RequestCancelledError();
            if (retry > 0) {
                await new Promise(resolve => setTimeout(resolve, 300));
                return request<T, U>(url, { ...options, retry: retry - 1 });
            }
            throw error;
        } finally {
            // 无论成功、失败、取消还是重试，所有请求资源都必须在这里释放。
            clearTimeout(timeoutId);
            unregisterRequest(key);
            removeInflightRequest(key);
            releasePriority(priority);
            if (loading) releaseLoading();
        }
    })();
    if (dedupe) setInflightRequest(key, requestPromise);
    return requestPromise;
}

if (typeof window !== "undefined") window.addEventListener("beforeunload", () => unregisterRequest(""));
