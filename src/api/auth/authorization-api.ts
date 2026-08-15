import { get, post } from "@/plugin/request/api.ts";

const AUTHORIZATION_API_OPTIONS = {
    headers: {
        "Api-Version": "2.0.0"
    }
};

/** 目标 Role 授权状态与 Preview/Apply 接口。 */
export const AuthorizationApi = {
    assignments(userId: string): Promise<AuthorizationAssignment[]> {
        return get<AuthorizationAssignment[]>(
            `/api/security/authorization/users/${userId}/assignments`,
            undefined,
            AUTHORIZATION_API_OPTIONS
        );
    },

    currentRole(roleId: string): Promise<RoleAuthorizationState> {
        return get<RoleAuthorizationState>(
            `/api/security/authorization/roles/${roleId}`,
            undefined,
            AUTHORIZATION_API_OPTIONS
        );
    },

    previewRole(roleId: string, params: RoleAuthorizationChange): Promise<RoleAuthorizationPreview> {
        return post<RoleAuthorizationPreview>(
            `/api/security/authorization/roles/${roleId}/impact-preview`,
            params,
            AUTHORIZATION_API_OPTIONS
        );
    },

    applyRole(roleId: string, params: RoleAuthorizationApply): Promise<void> {
        return post<void>(
            `/api/security/authorization/roles/${roleId}/impact-apply`,
            params,
            AUTHORIZATION_API_OPTIONS
        );
    },

    previewAssignment(userId: string, params: AuthorizationAssignmentChange): Promise<AuthorizationAssignmentPreview> {
        return post<AuthorizationAssignmentPreview>(
            `/api/security/authorization/users/${userId}/assignments/preview`,
            params,
            AUTHORIZATION_API_OPTIONS
        );
    },

    applyAssignment(userId: string, params: AuthorizationAssignmentChange & { preview_token: string }): Promise<void> {
        return post<void>(
            `/api/security/authorization/users/${userId}/assignments/apply`,
            params,
            AUTHORIZATION_API_OPTIONS
        );
    }
};
