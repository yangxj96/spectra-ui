import { AuthApi } from "@/api/auth/auth-api";
import { useUserStore } from "@/plugin/store/modules/use-user-store";

/** 是否正在刷新 Token（防止并发刷新） */
let refreshing = false;
/** 等待刷新完成的回调队列 */
let queue: (() => void)[] = [];

/**
 * 获取当前 access_token
 * @returns token 字符串，未登录时返回 null
 */
export function getToken(): string | null {
    const token = useUserStore().token.access_token;
    return token || null;
}

/**
 * 刷新 Token（并发安全）
 * 多个请求同时触发 401 时，只有第一个会真正发起刷新请求，
 * 其余请求排入队列等待刷新完成后共享新 Token
 * @returns 新 Token，刷新失败返回 null
 */
export async function refreshToken(): Promise<Token | null> {
    const store = useUserStore();
    const refreshTokenValue = store.token.refresh_token;

    if (!refreshTokenValue) {
        return null;
    }

    // 已有刷新进行中，加入等待队列
    if (refreshing) {
        return new Promise(resolve => {
            queue.push(() => resolve(store.token));
        });
    }

    refreshing = true;

    try {
        const newToken = await AuthApi.refresh(refreshTokenValue);

        store.token = newToken;

        queue.forEach(cb => cb());
        queue = [];

        return newToken;
    } catch {
        queue = [];
        return null;
    } finally {
        refreshing = false;
    }
}

/**
 * 验证当前 Token 是否有效
 * 通过尝试刷新 Token 来判断会话是否仍然可用
 * @returns true 表示 Token 有效
 */
export async function validateToken(): Promise<boolean> {
    const store = useUserStore();

    if (!store.token.refresh_token) {
        return false;
    }

    const newToken = await refreshToken();

    return newToken !== null;
}
