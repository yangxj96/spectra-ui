import { get } from "@/plugin/request/api.ts";

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
    }
};
