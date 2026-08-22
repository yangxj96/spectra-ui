/**
 * 角色类型转换器
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-04-23 00:00:00
 */
export const roleKindLabels: Record<string, string> = {
    BUSINESS: "业务角色",
    DEV_OPS: "运维角色",
    SYSTEM_ADMIN: "系统管理员",
    AUDITOR: "审计角色"
};

export const roleConverter = {
    /** 创建空白角色表单（新增时使用） */
    createForm(): RoleForm {
        return {
            id: "",
            name: "",
            code: "",
            state: true,
            builtin: false,
            authority_level: 1,
            role_kind: "BUSINESS",
            remark: ""
        };
    },
    /** 列表数据转表单回显 */
    toForm(datum: RolePageVO): RoleForm {
        return {
            id: datum.id ?? "",
            name: datum.name ?? "",
            code: datum.code ?? "",
            state: datum.state ?? true,
            builtin: datum.builtin ?? false,
            authority_level: datum.authority_level ?? 1,
            role_kind: datum.role_kind ?? "BUSINESS",
            remark: datum.remark ?? ""
        };
    }
};
