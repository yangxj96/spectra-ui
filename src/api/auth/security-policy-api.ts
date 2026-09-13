import { get } from "@/plugin/request/api.ts";

const noCache = { cache: false } as const;

/** 当前用户可读取的安全策略接口。 */
export const SecurityPolicyApi = {
    /** 获取当前生效的密码校验规则。 */
    passwordPolicy(): Promise<SecurityPasswordPolicyVO> {
        return get<SecurityPasswordPolicyVO>("/api/security/policy/password", undefined, noCache);
    }
};
