import { get } from "@/plugin/request/api.ts";

const DEPARTMENT_API_OPTIONS = {
    headers: {
        "Api-Version": "1.0.0"
    }
};

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

    /** 查询指定部门的直属主/关联成员，不展开下级部门。 */
    departmentMembers(params: DepartmentMemberPage): Promise<PageResult<DepartmentMemberCandidate>> {
        return get<PageResult<DepartmentMemberCandidate>>(
            "/api/user/department-members",
            params,
            DEPARTMENT_API_OPTIONS
        );
    }
};
