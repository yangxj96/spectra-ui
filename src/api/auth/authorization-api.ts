import { get, post } from "@/plugin/request/api.ts";

/** 目标 Role 授权状态与 Preview/Apply 接口。 */
export const AuthorizationApi = {
    currentRole(roleId: string): Promise<RoleAuthorizationState> {
        return get<RoleAuthorizationState>(`/api/security/authorization/roles/${roleId}`);
    },

    previewRole(roleId: string, params: RoleAuthorizationChange): Promise<RoleAuthorizationPreview> {
        return post<RoleAuthorizationPreview>(`/api/security/authorization/roles/${roleId}/impact-preview`, params);
    },

    applyRole(roleId: string, params: RoleAuthorizationApply): Promise<void> {
        return post<void>(`/api/security/authorization/roles/${roleId}/impact-apply`, params);
    }
};
