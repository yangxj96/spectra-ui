import { hideLoading, showLoading } from "@/plugin/element/loading";

/** 请求生命周期协调器：统一管理取消、并发去重、全局 loading 和优先级配额。 */
type PendingRequest = {
    controller: AbortController;
    persistent: boolean;
};

const pendingRequests = new Map<string, PendingRequest>();
const inflightRequests = new Map<string, Promise<unknown>>();
let loadingCount = 0;

export function registerRequest(key: string, controller: AbortController, persistent = false): void {
    // persistent 请求不会因会话失效被批量取消，例如需要跨页面继续的后台任务。
    pendingRequests.set(key, { controller, persistent });
}

/** 请求结束后移除取消登记；重复调用是安全的。 */
export function unregisterRequest(key: string): void {
    pendingRequests.delete(key);
}

export function cancelAllRequests(): void {
    // 使用快照式遍历删除，确保取消同步触发的回调不会影响其他请求处理。
    for (const [key, request] of pendingRequests) {
        if (request.persistent) continue;
        request.controller.abort();
        pendingRequests.delete(key);
    }
}

/** 获取相同请求键对应的进行中 Promise，实现并发请求去重。 */
export function getInflightRequest(key: string): Promise<unknown> | undefined {
    return inflightRequests.get(key);
}

/** 登记进行中请求；调用方负责在 finally 中移除。 */
export function setInflightRequest(key: string, promise: Promise<unknown>): void {
    inflightRequests.set(key, promise);
}

/** 删除并发去重登记，允许下一次相同请求重新执行。 */
export function removeInflightRequest(key: string): void {
    inflightRequests.delete(key);
}

export function acquireLoading(): void {
    // loading 使用引用计数，只有第一个请求显示、最后一个请求结束时隐藏。
    if (loadingCount === 0 && typeof document !== "undefined") showLoading();
    loadingCount++;
}

export function releaseLoading(): void {
    if (loadingCount <= 0) return;
    loadingCount--;
    if (loadingCount === 0 && typeof document !== "undefined") hideLoading();
}

export function getLoadingCount(): number {
    return loadingCount;
}

const priorityLimit = { high: 10, normal: 6, low: 2 } as const;
export type RequestPriority = keyof typeof priorityLimit;
const priorityRunning: Record<RequestPriority, number> = { high: 0, normal: 0, low: 0 };

export async function waitPriority(priority: RequestPriority): Promise<void> {
    // 同一优先级使用轻量轮询限流，避免大批请求同时占满浏览器连接。
    while (priorityRunning[priority] >= priorityLimit[priority]) {
        await new Promise(resolve => setTimeout(resolve, 16));
    }
    priorityRunning[priority]++;
}

export function releasePriority(priority: RequestPriority): void {
    priorityRunning[priority] = Math.max(0, priorityRunning[priority] - 1);
}
