/**
 * 角色类型转换器
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-04-23 00:00:00
 */
export const roleConverter = {
    createForm(): RoleForm {
        return {
            id: "",
            name: "",
            code: "",
            state: false,
            scope: 0,
            target_ids: [],
            builtin: false,
            remark: ""
        };
    },
    toForm(datum: RolePageVO): RoleForm {
        return {
            id: datum.id ?? "",
            name: datum.name ?? "",
            code: datum.code ?? "",
            state: datum.state ?? false,
            scope: datum.scope ?? 0,
            target_ids: datum.target_ids ?? [],
            builtin: datum.builtin ?? false,
            remark: datum.remark ?? ""
        };
    },
    toDTO(datum: RoleForm): RoleDTO {
        return {
            id: datum.id ?? "",
            name: datum.name ?? "",
            code: datum.code ?? "",
            state: datum.state ?? false,
            scope: datum.scope ?? 0,
            target_ids: datum.target_ids ?? [],
            builtin: datum.builtin ?? false,
            remark: datum.remark ?? ""
        };
    }
};
