import { post } from "@/plugin/request/api";

/**
 * 认证授权相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2025-11-11 15:00:00
 */
export const AuthApi = {
    /**
     * 用户登录
     */
    login(form: LoginForm): Promise<Token> {
        return post<Token>("/api/security/authentication/login", form, {
            // 登录本身尚未建立会话，401 表示凭据错误，不能触发 Refresh 或会话跳转。
            auth: "skip",
            retryOnAuth: false,
            errorFallback: "账号或密码错误",
            priority: "high",
            fetchPriority: "high"
        });
    },
    /**
     * 退出登录
     */
    logout(): Promise<void> {
        return post<void>("/api/security/authentication/logout", undefined, {
            // Logout 是终止会话的请求，401 时不能再触发 Refresh。
            auth: "required",
            retryOnAuth: false,
            noBody: true
        });
    },
    /**
     * 使用 Web HttpOnly Cookie 刷新 Access Token，不从前端接收或发送 Refresh Token。
     */
    refresh(): Promise<Token> {
        return post<Token>("/api/security/authentication/refresh", undefined, {
            auth: "skip",
            retryOnAuth: false
        });
    }
};
