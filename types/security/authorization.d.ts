export {};

declare global {
    /** Role 当前目标授权状态。 */
    type RoleAuthorizationState = {
        role_id: string;
        version: number;
        authority_level: number;
        permission_codes: string[];
        grantable_permission_codes: string[];
    };

    /** Role Permission/GrantablePermission/authorityLevel 变更请求。 */
    type RoleAuthorizationChange = {
        expected_version: number;
        authority_level: number;
        permission_codes: string[];
        grantable_permission_codes: string[];
    };

    /** Role 授权变更影响预览。 */
    type RoleAuthorizationPreview = {
        role_id: string;
        preview_token: string;
        expected_version: number;
        expires_at: string;
        affected_assignment_count: number;
        affected_user_count: number;
        expands_effective_authority: boolean;
    };

    /** Role 授权变更 Apply 请求。 */
    type RoleAuthorizationApply = RoleAuthorizationChange & {
        preview_token: string;
    };

    /** 用户的目标 RoleAssignment 及其逐 Permission Boundary。 */
    type AuthorizationAssignment = {
        assignment_id: string;
        user_id: string;
        role_id: string;
        role_code: string;
        role_kind: string;
        role_name: string;
        role_system_managed: boolean;
        role_version: number;
        version: number;
        state: "ACTIVE" | "REVOKED" | "EXPIRED";
        valid_from?: string;
        valid_until?: string;
        access_boundaries: AuthorizationBoundary[];
        grant_boundaries: AuthorizationBoundary[];
    };

    type AuthorizationBoundary = {
        permission_code: string;
        scope_mode: "NONE" | "ALL" | "SELF" | "RULES";
        resource_code?: string;
        rules: AuthorizationScopeRule[];
    };

    type AuthorizationScopeRule = {
        rule_type: string;
        department_id?: string;
        include_descendants: boolean;
    };

    type AuthorizationScopeChange = {
        mode: "NONE" | "ALL" | "SELF" | "RULES";
        department_ids: string[];
        include_descendants: boolean;
    };

    type AuthorizationBoundaryChange = {
        permission: string;
        access: AuthorizationScopeChange;
        grant?: AuthorizationScopeChange;
    };

    type AuthorizationAssignmentChange = {
        assignment_id?: string;
        role_id: string;
        expected_version: number;
        boundaries: AuthorizationBoundaryChange[];
    };

    type AuthorizationAssignmentPreview = {
        preview_token: string;
        target_user_id: string;
        assignment_id: string;
        expected_version: number;
        expires_at: string;
        affected_assignment_count: number;
        affected_user_count: number;
    };
}
