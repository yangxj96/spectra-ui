import { del, get, post } from "@/plugin/request/api.ts";

/**
 * 账号绑定相关接口
 *
 * @author yangxj96
 * @version 1.0
 * @since 2026-07-19
 */
export const AccountApi = {
    /**
     * 获取当前用户绑定的账号列表
     */
    async list(): Promise<AccountVO[]> {
        return get<AccountVO[]>("/api/account/list");
    },

    /**
     * 绑定手机号
     * @param params 手机号和验证码
     */
    async bindPhone(params: { phone: string; code: string }): Promise<void> {
        return post<void>("/api/account/bindPhone", params);
    },

    /**
     * 绑定邮箱
     * @param params 邮箱和验证码
     */
    async bindEmail(params: { email: string; code: string }): Promise<void> {
        return post<void>("/api/account/bindEmail", params);
    },

    /**
     * 解绑账号
     * @param accountId 账号ID
     */
    async unbind(accountId: string): Promise<void> {
        return del<void>(`/api/account/unbind/${accountId}`);
    }
};
