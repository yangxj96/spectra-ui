import { isRequestCancelled } from "@/plugin/request/error";

/** 仅对网络错误、服务端错误和限流做有界重试；取消与客户端错误直接失败。 */
export function isRetryable(error: unknown): boolean {
    if (isRequestCancelled(error)) return false;
    if (typeof error === "object" && error !== null && "status" in error) {
        const status = (error as { status?: unknown }).status;
        return typeof status !== "number" || status >= 500 || status === 408 || status === 429;
    }
    return true;
}
