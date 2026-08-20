import { get, post } from "@/plugin/request/api";

/**
 * 首次系统初始化接口。
 *
 * @author yangxj96
 * @version 1.0
 * @since 2026-08-20
 */
export const SystemInitializationApi = {
    /** 查询系统初始化状态。 */
    status(): Promise<SystemInitializationStatus> {
        return get<SystemInitializationStatus>("/api/system/initialization/status", undefined, {
            skipAuth: true,
            priority: "high",
            fetchPriority: "high",
            persistent: true
        });
    },

    /** 创建首个 DEV_OPS 用户并开始 TOTP 登记。 */
    start(from: SystemInitializationStartFrom, initializationToken: string): Promise<SystemInitializationStartVO> {
        return post<SystemInitializationStartVO>("/api/system/initialization/start", from, {
            skipAuth: true,
            priority: "high",
            fetchPriority: "high",
            headers: {
                "X-Spectra-Initialization-Token": initializationToken
            }
        });
    },

    /** 确认首个用户的 TOTP 验证码。 */
    confirmMfa(from: SystemInitializationMfaConfirmFrom): Promise<SystemInitializationMfaConfirmVO> {
        return post<SystemInitializationMfaConfirmVO>("/api/system/initialization/mfa/confirm", from, {
            skipAuth: true,
            priority: "high",
            fetchPriority: "high"
        });
    },

    /** 使用已确认的 MFA 完成初始化并签发首个 Token。 */
    complete(from: SystemInitializationCompleteFrom): Promise<Token> {
        return post<Token>("/api/system/initialization/complete", from, {
            skipAuth: true,
            priority: "high",
            fetchPriority: "high"
        });
    }
};
