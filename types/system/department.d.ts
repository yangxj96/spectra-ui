export {};

declare global {
    // 部门树形响应
    type DepartmentTreeVO = {
        // 主键ID
        id: string;
        // 上级ID
        pid?: string;
        // 名称
        name: string;
        // 代码
        code: string;
        // 类型
        type: number;
        // 行政区划ID
        region_id: string;
        // 行政区划名称
        region_name: string;
        // 路径
        path: string;
        // 排序
        sort: number;
        // 备注
        remark?: string;
        // 下级部门
        children?: DepartmentTreeVO[];
    };

    // 部门表单编辑类型
    type DepartmentForm = {
        // 主键ID
        id: string;
        // 上级ID
        pid: string;
        // 名称
        name: string;
        // 代码
        code: string;
        // 类型
        type: number | undefined;
        // 行政区划ID
        region_id: string;
        // 行政区划名称
        region_name: string;
        // 路径
        path: string;
        // 排序
        sort: number | undefined;
        // 备注
        remark: string;
    };

    // 部门编辑请求类型
    type DepartmentDTO = {
        // 主键ID
        id: string;
        // 上级ID
        pid: string;
        // 名称
        name: string;
        // 代码
        code: string;
        // 类型
        type: number | undefined;
        // 行政区划ID
        region_id: string;
        // 路径
        path: string;
        // 排序
        sort: number | undefined;
        // 备注
        remark: string;
    };

    // 部门新增请求类型（主键和组织机构编码均由后端生成）
    type DepartmentCreateDTO = Omit<DepartmentDTO, "id" | "code">;

    /** 分页查询部门直属成员的筛选条件。 */
    type DepartmentMemberPage = {
        departmentId: string;
        keyword?: string;
        pageNum: number;
        pageSize: number;
    };

    /** 部门拆分时显示的最少直属成员信息。 */
    type DepartmentMemberCandidate = {
        id: string;
        username: string;
        real_name: string;
        status: string;
        primary_member: boolean;
        associated_member: boolean;
    };

    /** 后端分页结果。 */
    type PageResult<T> = {
        records: T[];
        total: number;
        size: number;
        current: number;
        pages: number;
    };

    /** 合并或拆分时创建的新部门资料。 */
    type DepartmentRestructureDepartment = {
        name: string;
        type: number;
        region_id: string;
        sort?: number;
        remark?: string;
    };
}
