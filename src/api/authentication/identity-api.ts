import { del, get, post } from "@/plugin/request/api.ts";

/**
 * 目标认证身份绑定相关接口。
 *
 * @author yangxj96
 * @version 1.0
 * @since 2026-08-15
 */
export const AuthenticationIdentityApi = {
    /** 获取当前用户的有效认证身份列表。 */
    async list(
        options?: Pick<RequestOptions<"/api/security/identities">, "loading">
    ): Promise<AuthenticationIdentityVO[]> {
        return options
            ? get<AuthenticationIdentityVO[]>("/api/security/identities", undefined, options)
            : get<AuthenticationIdentityVO[]>("/api/security/identities");
    },

    /** 绑定手机号认证身份。 */
    async bindPhone(params: { phone: string; code: string }): Promise<void> {
        return post<void>("/api/security/identities/phone", params);
    },

    /** 发送绑定手机号验证码。 */
    async sendBindingPhoneCode(phone: string): Promise<void> {
        return post<void>("/api/security/authentication/bind/sms", { phone });
    },

    /** 绑定邮箱认证身份。 */
    async bindEmail(params: { email: string; code: string }): Promise<void> {
        return post<void>("/api/security/identities/email", params);
    },

    /** 发送绑定邮箱验证码。 */
    async sendBindingEmailCode(email: string): Promise<void> {
        return post<void>("/api/security/authentication/bind/email", { email });
    },

    /** 撤销单个认证身份。 */
    async unbind(identityId: string): Promise<void> {
        return del<void>(`/api/security/identities/${identityId}`);
    }
};
