export {};

declare global {
    // 权限
    type Authority = BaseEntity & {
        // 父ID
        pid?: string;
        // 权限名称
        name: string;
        // 权限编码
        code: string;
    };

    // 权限树形
    type AuthorityTree = Authority & {
        // 下级权限
        children: AuthorityTree[];
        // Permission 允许的数据范围模式；资源分组节点为空
        allowed_scope_modes?: ("NONE" | "ALL" | "SELF" | "RULES")[];
    };

    // 角色分页查询VO
    type RolePageVO = {
        // 主键ID
        id: string;
        //角色名称
        name: string;
        // 角色代码
        code: string;
        //角色状态
        state: boolean;
        // 是否内置
        builtin: boolean;
        // 授权并发版本
        version: number;
        // 管理边界等级
        authority_level?: number;
        // 目标角色类型
        role_kind?: string;
        //角色备注
        remark: string;
    };

    // 角色编辑表单类型
    type RoleForm = {
        // 主键ID
        id: string;
        // 角色名称
        name: string;
        // 角色代码
        code: string;
        // 角色状态
        state: boolean;
        // 是否内置
        builtin: boolean | undefined;
        // 管理边界等级（系统角色元数据，只读）
        authority_level: number;
        // 角色类型（系统角色元数据，只读）
        role_kind: string;
        // 角色备注
        remark: string;
    };

    // 角色编辑器最终提交请求类型
    type RoleEditorSave = {
        // 角色ID，新增时为空
        id?: string;
        // 角色名称
        name: string;
        // 角色代码
        code: string;
        // 角色备注
        remark: string;
        // 授权并发版本，新增时为空
        expected_version?: number;
        // 授权管理等级
        authority_level: number;
        // 角色可使用的权限编码
        permission_codes: string[];
        // 角色可向下授予的权限编码
        grantable_permission_codes: string[];
        // 角色菜单ID
        menu_ids: string[];
    };
}
