import { del, get, post, put } from "@/plugin/request/api";

/**
 * 角色相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2025-11-11 15:00:00
 */
export const RoleApi = {
    /**
     * 提交角色编辑器内容，兼容新增和编辑。
     * @param params 角色编辑器提交参数
     */
    saveEditor(params: RoleEditorSave): Promise<RolePageVO> {
        return post<RolePageVO>("/api/role/editor", params);
    },
    /**
     * 启用角色
     * @param id 角色ID
     */
    enable(id: string): Promise<void> {
        return put<void>(`/api/role/${id}/enable`);
    },
    /**
     * 禁用角色
     * @param id 角色ID
     */
    disable(id: string): Promise<void> {
        return put<void>(`/api/role/${id}/disable`);
    },
    /**
     * 根据ID删除角色
     * @param id 角色ID
     */
    delete(id: string): Promise<void> {
        return del<void>("/api/role/" + id);
    },
    /**
     * 分页查询
     * @param params 分页参数
     */
    page(params?: RolePageParams): Promise<Page<RolePageVO>> {
        return get<Page<RolePageVO>>("/api/role/page", params);
    },
    /**
     * 列表查询（全量）
     */
    list(): Promise<RolePageVO[]> {
        return get<RolePageVO[]>("/api/role/list");
    },
    /**
     * 查询角色详情
     * @param id 角色ID
     */
    detail(id: string): Promise<RolePageVO> {
        return get<RolePageVO>(`/api/role/${id}`);
    },
    /**
     * 根据角色ID获取角色下有哪些菜单
     * @param roleId 角色ID
     */
    getRoleMenu(roleId: string): Promise<Menu[]> {
        return get<Menu[]>(`/api/role/${roleId}/menu`);
    }
};
