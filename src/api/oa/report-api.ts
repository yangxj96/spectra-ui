import { download, get } from "@/plugin/request/api.ts";

export const ReportApi = {
    departmentStats(params?: DepartmentStatsParams): Promise<DepartmentStatsVO[]> {
        return get<DepartmentStatsVO[]>("/api/oa/report/department", params);
    },
    exportDepartmentStats(params?: DepartmentStatsParams): Promise<Blob> {
        return download<"/api/oa/report/department/export">("/api/oa/report/department/export", { params });
    }
};
