import { AuthApi } from "@/api/auth/auth-api";
import { useUserStore } from "@/plugin/store/modules/use-user-store";

/** 当前进行中的刷新请求；所有并发调用共享同一个 Promise。 */
let refreshPromise: Promise<Token | null> | null = null;

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
    // 已有刷新进行中，直接共享结果；失败也必须让所有等待者收到 null，不能悬挂。
    if (refreshPromise) {
        return refreshPromise;
    }

    refreshPromise = (async () => {
        try {
            // Web Refresh Token 位于 HttpOnly Cookie，不能从 JS 读取或写入 localStorage。
            const newToken = await AuthApi.refresh();
            store.token = newToken;
            return newToken;
        } catch {
            return null;
        } finally {
            refreshPromise = null;
        }
    })();

    return refreshPromise;
}

/**
 * 验证当前 Token 是否有效
 * 通过尝试刷新 Token 来判断会话是否仍然可用
 * @returns true 表示 Token 有效
 */
export async function validateToken(): Promise<boolean> {
    const newToken = await refreshToken();

    return newToken !== null;
}
