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

    /** 用户的目标 RoleAssignment 及其逐 Permission Boundary。 */
    type AuthorizationAssignment = {
        assignment_id: string;
        user_id: string;
        role_id: string;
        role_code: string;
        role_kind: string;
        role_name: string;
        role_system_managed: boolean;
        role_state: "ACTIVE" | "DISABLED";
        role_version: number;
        role_permission_count: number;
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

    /** 组织部门新增、编辑和移动 Preview 请求。 */
    type OrganizationChange = {
        expected_organization_version: number;
        new_parent_id?: string;
        name: string;
        type: number;
        region_id: string;
        sort?: number;
        remark?: string;
    };

    /** 组织变更影响预览。 */
    type OrganizationChangePreview = {
        department_id?: string;
        new_parent_id?: string;
        preview_token: string;
        expected_organization_version: number;
        after_organization_version: number;
        expires_at: string;
        affected_assignment_count: number;
        affected_user_count: number;
        expands_effective_authority: boolean;
    };

    /** 已有部门编辑/移动 Apply 请求。 */
    type OrganizationChangeApply = OrganizationChange & {
        preview_token: string;
    };

    /** 新部门 Apply 请求。部门主键由后端 MyBatis-Plus 插入时生成。 */
    type OrganizationCreateApply = OrganizationChangeApply;

    /** 可复用授权方案中的 Scope 配置。部门使用稳定业务编码。 */
    type AuthorizationProfileScope = {
        mode: "NONE" | "ALL" | "SELF" | "RULES";
        resource_code?: string;
        department_codes: string[];
        include_descendants: boolean;
    };

    /** 可复用授权方案中的 Permission Boundary。 */
    type AuthorizationProfileBoundary = {
        permission: string;
        access: AuthorizationProfileScope;
        grant?: AuthorizationProfileScope;
    };

    /** 可复用授权方案中的 Role 配置。 */
    type AuthorizationProfileAssignment = {
        role_code: string;
        role_version: number;
        boundaries: AuthorizationProfileBoundary[];
    };

    /** 可复用授权方案。 */
    type AuthorizationProfile = {
        id: string;
        code: string;
        name: string;
        description?: string;
        state: "ACTIVE" | "DISABLED";
        version: number;
        assignments: AuthorizationProfileAssignment[];
    };

    /** 授权方案创建和修改请求。 */
    type AuthorizationProfileSave = {
        id?: string;
        code: string;
        name: string;
        description?: string;
        expected_version?: number;
        assignments: AuthorizationProfileAssignment[];
    };
}
