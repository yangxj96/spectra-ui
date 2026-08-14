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
}
