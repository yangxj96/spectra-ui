import qs from "qs";

import { hideLoading, showLoading } from "@/plugin/element/loading";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store";
import { decrypt, encrypt, generateIv, sign, verifySignature } from "@/utils/crypto/crypto-utils";
import { GlobalUtils } from "@/utils/global-utils";
import { MessageUtils } from "@/utils/message-utils";

import { getToken, refreshToken } from "./auth";
import { getCache, setCache } from "./cache";

/**
 * API 基础地址
 */
const BASE_URL = import.meta.env.VITE_API_URL;

/**
 * 请求超时时间
 */
const TIMEOUT = 60000;

/**
 * 正在执行的请求 controller
 * 用于取消请求
 */
const pending = new Map<string, AbortController>();

/**
 * 标记为 persistent 的请求 key
 * 路由切换时不会被 cancelAllRequests 取消
 */
const persistentKeys = new Set<string>();

/**
 * 正在执行的请求 Promise
 * 用于请求共享（防抖）
 */
const inflightRequests = new Map<string, Promise<unknown>>();

/**
 * 当前Loading计数
 */
let loadingCount = 0;

/**
 * 开启Loading
 */
function startLoading() {
    if (loadingCount === 0) {
        showLoading();
    }
    loadingCount++;
}

/**
 * 结束Loading
 */
function endLoading() {
    loadingCount--;

    if (loadingCount <= 0) {
        loadingCount = 0;
        hideLoading();
    }
}

/**
 * 请求优先级并发限制
 */
const priorityLimit = {
    high: 10,
    normal: 6,
    low: 2
} as const;

type HttpPriority = keyof typeof priorityLimit;

/**
 * 当前优先级运行数量
 */
const priorityRunning: Record<HttpPriority, number> = {
    high: 0,
    normal: 0,
    low: 0
};

/**
 * 等待优先级队列
 * 防止某些请求占满浏览器并发
 */
async function waitPriority(priority: HttpPriority) {
    while (priorityRunning[priority] >= priorityLimit[priority]) {
        await new Promise(r => setTimeout(r, 16));
    }
    priorityRunning[priority]++;
}

/**
 * 释放优先级
 */
function releasePriority(priority: HttpPriority) {
    priorityRunning[priority]--;
}

/**
 * 取消所有请求
 */
export function cancelAllRequests() {
    for (const [key, controller] of pending) {
        if (!persistentKeys.has(key)) {
            controller.abort();
            pending.delete(key);
        }
    }
}

/**
 * 生成请求唯一 key
 * 用于 dedupe / cache / inflight
 */
function createKey(url: string, method: string, body?: unknown, params?: unknown) {
    return `${method}:${url}:${stableStringify(params ?? {})}:${stableStringify(body ?? {})}`;
}

/**
 * 从 Content-Disposition 解析文件名
 */
function getFilename(disposition: string | null): string | null {
    if (!disposition) return null;

    const match = disposition.match(/filename\*?=(?:UTF-8''|")?([^\";]+)/);

    if (!match || !match[1]) return null;

    return decodeURIComponent(match[1]);
}

/**
 * 拼接 URL
 */
function joinUrl(base: string, url: string) {
    const normalizedPath = "/" + url.replace(/^\/+/, "");
    if (!base || base === "/") {
        return normalizedPath;
    }
    return base.replace(/\/+$/, "") + normalizedPath;
}

/**
 * 稳定 JSON 序列化
 * 保证对象 key 顺序一致
 * 避免相同请求生成不同 key
 */
function stableStringify(value: unknown): string {
    if (value === null || typeof value !== "object") {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(",")}]`;
    }

    const obj = value as Record<string, unknown>;

    const keys = Object.keys(obj).sort();

    const entries = keys.map(key => {
        return `"${key}":${stableStringify(obj[key])}`;
    });

    return `{${entries.join(",")}}`;
}

/**
 * 加密请求体
 */
async function encryptRequest(body: unknown): Promise<{
    data: string;
    key: string;
    iv: string;
    nonce: string;
    timestamp: number;
    signature: string;
}> {
    const pubKey = useCryptoStore().server_public_key;
    const privKey = useCryptoStore().client_private_key;
    if (!pubKey || !privKey) {
        throw new Error("密钥未就绪，无法加密请求");
    }

    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const iv = generateIv();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

    const { encryptedData, encryptedKey } = await encrypt(bodyStr, iv, pubKey);

    const signContent = `data=${encryptedData}&nonce=${nonce}&timestamp=${timestamp}`;
    const signature = await sign(signContent, privKey);

    return {
        data: encryptedData,
        key: encryptedKey,
        iv,
        nonce,
        timestamp,
        signature
    };
}

/**
 * 加密请求体（不签名，用于 clientPrivateKey 未就绪时，如登录请求）
 */
async function encryptBodyWithoutSign(body: unknown): Promise<{
    data: string;
    key: string;
    iv: string;
    nonce: string;
    timestamp: number;
}> {
    const pubKey = useCryptoStore().server_public_key;
    if (!pubKey) {
        throw new Error("服务端公钥未就绪，无法加密请求");
    }

    const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
    const iv = generateIv();
    const timestamp = Math.floor(Date.now() / 1000);
    const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

    const { encryptedData, encryptedKey } = await encrypt(bodyStr, iv, pubKey);

    return {
        data: encryptedData,
        key: encryptedKey,
        iv,
        nonce,
        timestamp
    };
}

/**
 * 解密响应体
 */
async function decryptResponse<T>(encryptedBody: {
    data: string;
    key: string;
    iv: string;
    nonce: string;
    signature: string;
    timestamp: number;
}): Promise<T> {
    const pubKey = useCryptoStore().server_public_key;
    const privKey = useCryptoStore().client_private_key;
    if (!pubKey || !privKey) {
        throw new Error("密钥未就绪，无法解密响应");
    }

    // 验签（使用服务端公钥验证后端签名）
    const signData = `data=${encryptedBody.data}&nonce=${encryptedBody.nonce}&timestamp=${encryptedBody.timestamp}`;
    const isValid = await verifySignature(encryptedBody.signature, signData, pubKey);
    if (!isValid) {
        throw new Error("签名验证失败，数据可能被篡改");
    }

    // 解密（使用客户端私钥解密响应 AES 密钥）
    const json = await decrypt(encryptedBody.key, encryptedBody.data, encryptedBody.iv, privKey);
    return JSON.parse(json) as T;
}

/**
 * 路径替换
 */
function resolvePathParams(url: string, pathParams?: Record<string, unknown>) {
    if (!pathParams) return url;

    return url.replace(/\{(\w+)\}/g, (_, key) => {
        const value = pathParams[key];

        if (value === undefined || value === null) {
            throw new Error(`Missing path param: ${key}`);
        }

        return encodeURIComponent(String(value));
    });
}

/**
 * 加密请求体（条件判断 + 加密）
 */
async function encryptRequestBody(
    body: BodyInit | null | undefined,
    isFormData: boolean,
    method: string
): Promise<BodyInit | null | undefined> {
    if (!useCryptoStore().enabled || !useCryptoStore().server_public_key || isFormData || !body || method === "GET") {
        return body;
    }
    if (useCryptoStore().client_private_key) {
        return JSON.stringify(await encryptRequest(body));
    }
    return JSON.stringify(await encryptBodyWithoutSign(body));
}

/**
 * 文件下载处理
 */
async function handleBlobDownload(res: Response): Promise<Blob | null> {
    const contentType = res.headers.get("content-type");
    if (
        !contentType?.includes("application/octet-stream") &&
        !contentType?.includes("application/pdf") &&
        !contentType?.includes("application/vnd") &&
        !contentType?.includes("text/csv") &&
        !contentType?.includes("image/png") &&
        !contentType?.includes("image/jpeg")
    ) {
        return null;
    }
    const blob = await res.blob();
    const disposition = res.headers.get("content-disposition");
    if (disposition) {
        const filename = getFilename(disposition) || "download";
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        window.URL.revokeObjectURL(url);
    }
    return blob;
}

/**
 * 解密响应体（条件判断 + 解密）
 */
async function decryptResult<T>(data: T | undefined): Promise<T | undefined> {
    if (
        !useCryptoStore().enabled ||
        !useCryptoStore().client_private_key ||
        !data ||
        typeof data !== "object" ||
        !("signature" in (data as Record<string, unknown>))
    ) {
        return data;
    }
    const encrypted = data as unknown as {
        data: string;
        key: string;
        iv: string;
        nonce: string;
        signature: string;
        timestamp: number;
    };
    return decryptResponse<T>(encrypted);
}

/**
 * 核心请求方法
 */
export async function request<T, U extends string>(url: U, options: RequestOptions<U> = {}): Promise<T> {
    // 参数定义
    const {
        params,
        loading = true,
        priority = "normal",
        fetchPriority = "auto",
        retry = 0,
        cache = false,
        dedupe = true,
        persistent = false,
        headers,
        _retry,
        skipAuth = false,
        _skipRefresh = false,
        noBody = false,
        ...rest
    } = options;

    const resolvedUrl = resolvePathParams(url, options.pathParams);

    // 拼接 URL
    let finalUrl = joinUrl(BASE_URL, resolvedUrl);

    // 处理 query 参数
    if (params) {
        const query = qs.stringify(params, {
            arrayFormat: "indices",
            allowDots: true
        });

        if (query) {
            finalUrl += `?${query}`;
        }
    }

    const method = (rest.method || "GET").toUpperCase();

    // 生成请求 key
    const key = createKey(finalUrl, method, rest.body, { params, pathParams: options.pathParams });

    // cache 命中
    if (cache) {
        const data = getCache<T>(key);
        if (data) return data;
    }

    // 请求共享（防抖）
    if (dedupe && inflightRequests.has(key)) {
        return inflightRequests.get(key) as Promise<T>;
    }

    // 去重请求
    if (dedupe) {
        pending.get(key)?.abort();
    }

    const controller = new AbortController();

    pending.set(key, controller);

    if (persistent) {
        persistentKeys.add(key);
    }

    // 请求超时
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);

    const token = getToken();

    const requestPromise = (async () => {
        if (loading) startLoading();

        try {
            const isFormData = rest.body instanceof FormData;

            rest.body = await encryptRequestBody(rest.body, isFormData, method);

            // 等待优先级
            await waitPriority(priority);

            const res = await fetch(finalUrl, {
                ...rest,
                priority: fetchPriority,
                headers: {
                    ...(isFormData ? {} : { "Content-Type": "application/json" }),
                    "Api-Version": "1.0.0",
                    ...(!["GET", "HEAD", "OPTIONS"].includes(method)
                        ? { "X-XSRF-TOKEN": readCookie("XSRF-TOKEN") ?? "" }
                        : {}),
                    ...(!skipAuth && token ? { Authorization: `Bearer ${token}` } : {}),
                    ...headers
                },
                credentials: "include",
                signal: controller.signal
            });
            // Token 过期自动刷新
            if (res.status === 401 && !_retry && !_skipRefresh) {
                console.debug(`[HTTP] ${method} ${finalUrl} 返回 401，尝试刷新 token`);
                const newToken = await refreshToken();

                if (newToken) {
                    return request<T, U>(url, {
                        ...options,
                        retry: 0,
                        _retry: true
                    });
                }

                MessageUtils.error("登录已过期", () => {
                    GlobalUtils.toLogin();
                });

                throw new Error("Unauthorized");
            }

            // HTTP 错误处理
            if (!res.ok) {
                await handleHttpError(res);
            }

            const blob = await handleBlobDownload(res);
            if (blob) return blob as T;

            if (noBody) return undefined as T;

            // JSON 响应
            const result: IResult<T> = await res.json();

            result.data = await decryptResult<T>(result.data);

            // 业务错误处理
            if (result.code !== 200) {
                MessageUtils.error(result.msg || "请求失败");
                throw new Error(result.msg || "Business Error");
            }

            // 写入缓存
            if (cache) {
                setCache(key, result.data);
            }

            return result.data as T;
        } catch (err) {
            // 自动重试
            if (retry > 0) {
                await new Promise(r => setTimeout(r, 300));
                return request<T, U>(url, {
                    ...options,
                    retry: retry - 1
                });
            }
            throw err;
        } finally {
            clearTimeout(timeout);
            pending.delete(key);
            persistentKeys.delete(key);
            inflightRequests.delete(key);
            releasePriority(priority);
            if (loading) {
                endLoading();
            }
        }
    })();
    inflightRequests.set(key, requestPromise);
    return requestPromise;
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

/**
 * HTTP 错误处理
 */
async function handleHttpError(res: Response) {
    const status = res.status;
    let data: unknown = null;
    try {
        if (res.headers.get("content-type")?.includes("application/json")) {
            data = await res.json();
        }
    } catch {
        // response body is not JSON
    }
    const msg = typeof data === "object" && data !== null && "msg" in data ? (data as { msg: string }).msg : "未知错误";
    if (status >= 400 && status <= 499) {
        MessageUtils.error(msg);
        throw new Error(msg);
    }
    if (status >= 500) {
        MessageUtils.notify.error(`${msg}`, "服务器错误");
        throw new Error(msg);
    }
}

/**
 * 页面关闭自动取消请求
 */
if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => {
        cancelAllRequests();
    });
}
