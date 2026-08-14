import { get } from "@/plugin/request/api.ts";

export type SecurityContextResponse = {
    permissions: string[];
    grantable_permissions?: string[];
    grantablePermissions?: string[];
};

/** 当前登录主体的目标授权上下文。 */
export const SecurityContextApi = {
    async current(): Promise<SecurityContextResponse> {
        return get<SecurityContextResponse>("/api/security/context");
    }
};
