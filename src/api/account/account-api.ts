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

/** 账号绑定信息 */
export interface AccountVO {
    /** 账号ID */
    id: string;
    /** 登录类型：PASSWORD/SMS/EMAIL/OTP */
    type: "PASSWORD" | "SMS" | "EMAIL" | "OTP";
    /** 登录名称 */
    loginName: string;
    /** 状态：1-正常 2-禁用 3-未验证 */
    status: number;
    /** 是否已验证：0-未验证 1-已验证 */
    verified: number;
    /** 是否为当前登录方式 */
    current: boolean;
}
