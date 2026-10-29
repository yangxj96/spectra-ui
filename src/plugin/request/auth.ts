import { AuthApi } from "@/api/auth/auth-api";
import { useUserStore } from "@/plugin/store/modules/use-user-store";

import { getSessionEpoch, invalidateSessionScope } from "./request-lifecycle";

/** 当前进行中的刷新请求；所有并发调用共享同一个 Promise，避免并发刷新覆盖 Token。 */
let refreshPromise: Promise<Token | null> | null = null;
/** 刷新请求所属会话代数；会话切换后旧刷新结果必须丢弃。 */
let refreshEpoch = -1;
/** 防止 Fetch 和 XHR 在同一次会话失效时重复提示和重复跳转。 */
let sessionExpirationClaimed = false;

const CSRF_COOKIE_NAME = "XSRF-TOKEN";

/**
 * Web Refresh 请求必须同时携带 CSRF Cookie 和对应 Header。
 * 退出登录后服务端会清除该 Cookie，此时直接发起 Refresh 只会得到 CSRF 错误。
 */
function hasCsrfCookie(): boolean {
    if (typeof document === "undefined") return true;

    const prefix = `${encodeURIComponent(CSRF_COOKIE_NAME)}=`;
    return document.cookie.split(";").some(item => {
        const cookie = item.trim();
        return cookie.startsWith(prefix) && cookie.slice(prefix.length).trim().length > 0;
    });
}

/**
 * 获取当前 access_token
 * @returns token 字符串，未登录时返回 null
 */
export function getAccessToken(): string | null {
    const token = useUserStore().token.access_token;
    return token || null;
}

/**
 * 刷新 Token（并发安全）
 * 多个请求同时触发 401 时，只有第一个会真正发起刷新请求，
 * 其余请求排入队列等待刷新完成后共享新 Token。
 *
 * 刷新结果绑定发起时的会话代数：登录身份已切换或会话已失效时，
 * 迟到的刷新既不能覆盖新 Token，也不能清理新会话。
 * @returns 新 Token，刷新失败或会话已切换时返回 null
 */
export async function refreshAccessToken(): Promise<Token | null> {
    const store = useUserStore();
    const startEpoch = getSessionEpoch();
    if (!hasCsrfCookie()) {
        // 缺少 CSRF Cookie 时刷新必然失败，先清理本地会话，避免无效请求反复重试。
        if (startEpoch === getSessionEpoch()) expireSession();
        return null;
    }

    // 已有同一会话的刷新进行中，直接共享结果；跨会话的旧刷新不能复用。
    if (refreshPromise && refreshEpoch === startEpoch) {
        return refreshPromise;
    }

    refreshEpoch = startEpoch;
    refreshPromise = (async () => {
        try {
            // Web Refresh Token 位于 HttpOnly Cookie，不能从 JS 读取或写入 localStorage。
            const newToken = await AuthApi.refresh();
            if (startEpoch !== getSessionEpoch()) return null;
            store.setToken(newToken);
            sessionExpirationClaimed = false;
            return newToken;
        } catch {
            // 只有仍是同一会话时才清理；旧刷新失败不能影响刚建立的新身份。
            if (startEpoch === getSessionEpoch()) expireSession();
            return null;
        } finally {
            if (refreshEpoch === startEpoch) {
                refreshPromise = null;
                refreshEpoch = -1;
            }
        }
    })();

    return refreshPromise;
}

/** 登录成功后以新会话代数替换旧身份范围，旧缓存、旧请求和旧 Store 数据全部失效。 */
export function beginSession(token: Token): void {
    invalidateSessionScope();
    sessionExpirationClaimed = false;
    useUserStore().setToken(token);
}

/**
 * 幂等清理会话；认证模块不依赖 Router，导航由调用方负责。
 * 同时清空请求缓存、去重登记、在途请求和其他 Store 的会话范围数据。
 */
export function expireSession(): void {
    invalidateSessionScope();
}

/** 让 Fetch 与 XHR 共享一次会话失效提示和跳转。 */
export function claimSessionExpiration(): boolean {
    if (sessionExpirationClaimed) return false;
    sessionExpirationClaimed = true;
    return true;
}

/** 登录成功后允许下一次独立会话再次触发失效处理。 */
export function resetSessionExpiration(): void {
    sessionExpirationClaimed = false;
}

/**
 * 验证当前 Token 是否有效
 * 通过尝试刷新 Token 来判断会话是否仍然可用
 * @returns true 表示 Token 有效
 */
export async function validateToken(): Promise<boolean> {
    const newToken = await refreshAccessToken();

    return newToken !== null;
}
