import { get, post } from "@/plugin/request/api";

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
            priority: "high",
            fetchPriority: "high"
        });
    },
    /** 开始首次 TOTP 登记。 */
    beginMfaEnrollment(challengeId: string): Promise<MfaEnrollment> {
        return post<MfaEnrollment>(
            "/api/security/mfa/setup/totp/enroll",
            { challenge_id: challengeId },
            { skipAuth: true }
        );
    },
    /** 确认首次 TOTP 登记。 */
    confirmMfaEnrollment(challengeId: string, enrollmentId: string, code: string): Promise<string[]> {
        return post<string[]>(
            "/api/security/mfa/setup/totp/confirm",
            { challenge_id: challengeId, enrollment_id: enrollmentId, code },
            { skipAuth: true }
        );
    },
    /** 查询当前登录用户的 MFA 状态。 */
    mfaStatus(options?: Pick<RequestOptions<"/api/security/mfa/status">, "loading">): Promise<MfaStatus> {
        return options
            ? get<MfaStatus>("/api/security/mfa/status", undefined, options)
            : get<MfaStatus>("/api/security/mfa/status");
    },
    /** 开始已登录用户的 TOTP 登记。 */
    beginAuthenticatedMfaEnrollment(): Promise<MfaEnrollment> {
        return post<MfaEnrollment>("/api/security/mfa/totp/enroll");
    },
    /** 确认已登录用户的 TOTP 登记。 */
    confirmAuthenticatedMfaEnrollment(enrollmentId: string, code: string): Promise<string[]> {
        return post<string[]>("/api/security/mfa/totp/confirm", {
            enrollment_id: enrollmentId,
            code
        });
    },
    /** 停用当前登录用户的 TOTP MFA。 */
    disableMfa(code: string): Promise<void> {
        return post<void>("/api/security/mfa/totp/disable", { code }, { loading: false, noBody: true });
    },
    /** 校验已有 MFA 并签发正式会话。 */
    verifyMfa(challengeId: string, code: string): Promise<Token> {
        return post<Token>(
            "/api/security/authentication/mfa/verify",
            { challenge_id: challengeId, code },
            { skipAuth: true }
        );
    },
    /** 完成首次 MFA 登记并签发正式会话。 */
    completeMfaEnrollment(challengeId: string): Promise<Token> {
        return post<Token>(
            "/api/security/authentication/mfa/complete",
            { challenge_id: challengeId },
            { skipAuth: true }
        );
    },
    /**
     * 退出登录
     */
    logout(): Promise<void> {
        return post<void>("/api/security/authentication/logout", undefined, {
            // Logout 是终止会话的请求，401 时不能再触发 Refresh。
            _skipRefresh: true,
            noBody: true
        });
    },
    /**
     * 刷新token
     */
    refresh(refreshToken?: string): Promise<Token> {
        return post<Token>(
            "/api/security/authentication/refresh",
            refreshToken ? { refresh_token: refreshToken } : undefined,
            {
                skipAuth: true,
                _skipRefresh: true
            }
        );
    }
};
