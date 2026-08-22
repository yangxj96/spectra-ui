import { del, get, post, put } from "@/plugin/request/api.ts";

const AUTHORIZATION_API_OPTIONS = {
    headers: {
        "Api-Version": "1.0.0"
    }
};

/** 目标 Role 授权状态与 Preview/Apply 接口。 */
export const AuthorizationApi = {
    profiles(): Promise<AuthorizationProfile[]> {
        return get<AuthorizationProfile[]>(
            "/api/security/authorization/profiles",
            undefined,
            AUTHORIZATION_API_OPTIONS
        );
    },

    profile(id: string): Promise<AuthorizationProfile> {
        return get<AuthorizationProfile>(
            `/api/security/authorization/profiles/${id}`,
            undefined,
            AUTHORIZATION_API_OPTIONS
        );
    },

    createProfile(params: AuthorizationProfileSave): Promise<void> {
        return post<void>("/api/security/authorization/profiles", params, AUTHORIZATION_API_OPTIONS);
    },

    updateProfile(id: string, params: AuthorizationProfileSave): Promise<void> {
        return put<void>(`/api/security/authorization/profiles/${id}`, params, AUTHORIZATION_API_OPTIONS);
    },

    disableProfile(id: string): Promise<void> {
        return del<void>(`/api/security/authorization/profiles/${id}`, undefined, AUTHORIZATION_API_OPTIONS);
    },

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

    organizationVersion(): Promise<number> {
        return get<number>(
            "/api/security/authorization/departments/organization-version",
            undefined,
            AUTHORIZATION_API_OPTIONS
        );
    },

    previewDepartmentCreate(params: OrganizationChange): Promise<OrganizationChangePreview> {
        return post<OrganizationChangePreview>(
            "/api/security/authorization/departments/impact-preview",
            params,
            AUTHORIZATION_API_OPTIONS
        );
    },

    applyDepartmentCreate(params: OrganizationCreateApply): Promise<void> {
        return post<void>("/api/security/authorization/departments/impact-apply", params, AUTHORIZATION_API_OPTIONS);
    },

    previewDepartment(departmentId: string, params: OrganizationChange): Promise<OrganizationChangePreview> {
        return post<OrganizationChangePreview>(
            `/api/security/authorization/departments/${departmentId}/impact-preview`,
            params,
            AUTHORIZATION_API_OPTIONS
        );
    },

    applyDepartment(departmentId: string, params: OrganizationChangeApply): Promise<void> {
        return post<void>(
            `/api/security/authorization/departments/${departmentId}/impact-apply`,
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
