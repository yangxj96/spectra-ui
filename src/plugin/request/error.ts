/** 可识别的请求错误。 */
export class HttpRequestError extends Error {
    readonly status?: number;
    readonly errorCode?: string;

    constructor(message: string, errorCode?: string, status?: number) {
        super(message);
        this.name = "HttpRequestError";
        this.status = status;
        this.errorCode = errorCode;
    }
}

/** 上传请求错误，保留 HTTP 状态和服务端错误码。 */
export class BinaryRequestError extends Error {
    readonly status: number;
    readonly errorCode?: string;

    constructor(status: number, message: string, errorCode?: string) {
        super(message);
        this.name = "BinaryRequestError";
        this.status = status;
        this.errorCode = errorCode;
    }
}

/** 主动取消不应被页面当作服务端错误提示。 */
export class RequestCancelledError extends Error {
    constructor(message = "请求已取消") {
        super(message);
        this.name = "RequestCancelledError";
    }
}

export type ParsedResponseError = {
    message: string;
    status?: number;
    errorCode?: string;
};

/** HTTP 状态缺少业务消息时使用的稳定前端提示。 */
const DEFAULT_FALLBACK = "网络请求失败";

const STATUS_MESSAGES: Record<number, string> = {
    400: "请求参数无效",
    401: "登录已过期",
    403: "没有权限执行此操作",
    404: "请求资源不存在",
    409: "请求状态冲突",
    429: "请求过于频繁",
    500: "系统内部错误，请联系管理员",
    502: "网关服务异常",
    503: "服务暂不可用",
    504: "服务响应超时"
};

function nonBlank(value: unknown): value is string {
    return typeof value === "string" && value.trim().length > 0;
}

function responseMessage(status: number | undefined, fallback: string): string {
    // 调用方显式提供 fallback 时，表示该接口有更准确的业务语义，应覆盖通用状态提示。
    if (fallback !== DEFAULT_FALLBACK) return fallback;
    return (status === undefined ? undefined : STATUS_MESSAGES[status]) ?? fallback;
}

function resolvePayload(payload: unknown): { message?: string; errorCode?: string } {
    if (typeof payload === "string") {
        return nonBlank(payload) ? { message: payload.trim() } : {};
    }
    if (typeof payload !== "object" || payload === null) return {};

    const candidate = payload as Record<string, unknown>;
    const message = nonBlank(candidate.msg) ? candidate.msg.trim() : undefined;
    const errorCode = nonBlank(candidate.error_code) ? candidate.error_code : undefined;
    return { message, errorCode };
}

/**
 * 读取统一 JSON、普通文本或空响应，始终返回可展示的安全消息。
 * 响应体读取失败时不会抛出 JSON 解析异常覆盖原始请求错误。
 *
 * @param response Fetch 响应；网络层没有响应时可以传 undefined
 * @param fallback 无法从响应中解析消息时使用的提示
 * @returns 标准化的消息、HTTP 状态和业务错误码
 */
export async function parseResponseError(
    response: Response | undefined,
    fallback = DEFAULT_FALLBACK
): Promise<ParsedResponseError> {
    if (!response) return { message: fallback };

    let payload: unknown;
    try {
        const text = await response.text();
        if (text.trim()) {
            try {
                payload = JSON.parse(text) as unknown;
            } catch {
                payload = text;
            }
        }
    } catch {
        payload = undefined;
    }

    const resolved = resolvePayload(payload);
    return {
        status: response.status,
        errorCode: resolved.errorCode,
        message: resolved.message ?? responseMessage(response.status, fallback)
    };
}

/** 识别 Fetch 或 XHR 的主动取消。 */
export function isRequestCancelled(error: unknown): boolean {
    return (
        error instanceof RequestCancelledError ||
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
    );
}
