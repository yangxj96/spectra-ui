import { get } from "@/plugin/request/api.ts";

/**
 * OA 工作台摘要接口。页面复用现有 Dashboard。
 */
export const WorkbenchApi = {
    summary(): Promise<WorkbenchSummary> {
        return get<WorkbenchSummary>("/api/oa/workbench/summary");
    }
};
