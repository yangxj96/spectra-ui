import { del, get } from "@/plugin/request/api.ts";

/**
 * 组织机构相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2025-11-11 15:00:00
 */
export const DepartmentApi = {
    /**
     * 获取组织机构树形列表
     */
    tree(): Promise<DepartmentTreeVO[]> {
        return get<DepartmentTreeVO[]>("/api/department/tree");
    },
    /**
     * 根据ID删除组织机构
     * @param id 组织机构ID
     */
    deleteById(id: string): Promise<void> {
        return del<void>(`/api/department/${id}`);
    }
};
