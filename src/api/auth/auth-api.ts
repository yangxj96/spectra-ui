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
        return post<Token>("/api/auth/login", form, {
            priority: "high",
            fetchPriority: "high"
        });
    },
    /**
     * 退出登录
     */
    logout(): Promise<void> {
        return post<void>("/api/auth/logout", undefined, {
            // Logout 是终止会话的请求，401 时不能再触发 Refresh。
            _skipRefresh: true,
            noBody: true
        });
    },
    /**
     * 刷新token
     */
    refresh(refreshToken?: string): Promise<Token> {
        return post<Token>("/api/auth/refresh", refreshToken ? { refresh_token: refreshToken } : undefined, {
            skipAuth: true,
            _skipRefresh: true
        });
    }
};
