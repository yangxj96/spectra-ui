import { ElLoading } from "element-plus";

import type { LoadingInstance } from "element-plus/lib/components/loading/src/loading";

/** 当前活跃的 loading 请求计数 */
let count: number = 0;

/** loading 开始显示的时间戳 */
let startTime: number = 0;

/** 最小 loading 显示时间（毫秒），不足则补足，防止闪烁 */
const minLoadingTime: number = 300;

/** ElLoading 实例 */
let loading: LoadingInstance | undefined;

/** 延迟关闭任务；新请求到来时必须取消，避免关闭新操作的遮罩。 */
let closeTimer: ReturnType<typeof setTimeout> | null = null;

/** 当前遮罩实例序号，关闭任务只允许结束自己对应的实例。 */
let loadingInstanceId = 0;

/**
 * 打开 loading 遮罩
 */
function open(): void {
    startTime = Date.now();
    loadingInstanceId++;
    const els = document.querySelectorAll(".loading-box");
    const arr = [...els] as HTMLElement[];
    loading = ElLoading.service({
        target: arr.at(-1),
        lock: true,
        text: "数据加载中...",
        background: "rgba(0,0,0,0.5)"
    });
}

/**
 * 关闭 loading 遮罩（补足最小显示时间后关闭）
 */
function close(): void {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minLoadingTime - elapsed);
    const instanceId = loadingInstanceId;
    if (closeTimer) clearTimeout(closeTimer);
    closeTimer = setTimeout(() => {
        closeTimer = null;
        if (loading && instanceId === loadingInstanceId && count === 0) {
            loading.close();
            loading = undefined;
        }
    }, remaining);
}

/**
 * 显示 loading 层（引用计数 +1）
 */
export function showLoading(): void {
    // 新操作开始时取消旧的延迟关闭任务，复用尚未真正关闭的遮罩。
    if (closeTimer) {
        clearTimeout(closeTimer);
        closeTimer = null;
    }
    if (count === 0 && loading === undefined) {
        open();
    }
    count++;
}

/**
 * 关闭 loading 层（引用计数 -1，归零时关闭）
 */
export function hideLoading(): void {
    if (count <= 0) {
        return;
    }
    count--;
    if (count === 0) {
        close();
    }
}
