/**
 * 部门类型转换器
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-04-22 00:00:00
 */
export const deptConverter = {
    /** 创建空白部门表单（新增时使用） */
    createForm(): DepartmentForm {
        return {
            id: "",
            pid: "",
            name: "",
            code: "",
            type: undefined,
            region_id: "",
            region_name: "",
            path: "",
            sort: undefined,
            remark: ""
        };
    },
    /** 树形数据转表单回显 */
    toForm(datum: DepartmentTreeVO): DepartmentForm {
        return {
            id: datum.id ?? "",
            pid: datum.pid ?? "",
            name: datum.name ?? "",
            code: datum.code ?? "",
            type: datum.type ?? undefined,
            region_id: datum.region_id ?? "",
            region_name: datum.region_name ?? "",
            path: datum.path ?? "",
            sort: datum.sort ?? undefined,
            remark: datum.remark ?? ""
        };
    },
    /** 表单数据转接口请求参数 */
    toDTO(datum: DepartmentForm): DepartmentDTO {
        return {
            id: datum.id ?? "",
            pid: datum.pid ?? "",
            name: datum.name ?? "",
            code: datum.code ?? "",
            type: datum.type ?? undefined,
            region_id: datum.region_id ?? "",
            path: datum.path ?? "",
            sort: datum.sort ?? undefined,
            remark: datum.remark ?? ""
        };
    },
    /** 部门新增请求数据（主键和编码由后端自动生成） */
    toCreateDTO(datum: DepartmentForm): DepartmentCreateDTO {
        const dto = this.toDTO(datum);
        return {
            pid: dto.pid,
            name: dto.name,
            type: dto.type,
            region_id: dto.region_id,
            path: dto.path,
            sort: dto.sort,
            remark: dto.remark
        };
    },
    /** 部门安全变更 Preview 请求，不携带后端生成的 ID、编码和路径。 */
    toOrganizationChange(datum: DepartmentForm, organizationVersion: number): OrganizationChange {
        if (datum.type === undefined) {
            throw new Error("部门类型不能为空");
        }
        return {
            expected_organization_version: organizationVersion,
            new_parent_id: datum.pid || undefined,
            name: datum.name,
            type: datum.type,
            region_id: datum.region_id,
            sort: datum.sort,
            remark: datum.remark || undefined
        };
    }
};
