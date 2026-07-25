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

/**
 * 打开 loading 遮罩
 */
function open(): void {
    startTime = Date.now();
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
async function close(): Promise<void> {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minLoadingTime - elapsed);
    setTimeout(() => {
        if (loading) {
            loading.close();
        }
        loading = undefined;
    }, remaining);
}

/**
 * 显示 loading 层（引用计数 +1）
 */
export function showLoading(): void {
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
        close().then(() => {
            console.log("loading关闭");
        });
    }
}
