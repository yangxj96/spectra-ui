import { get, post, put } from "@/plugin/request/api.ts";

const ADMIN_API = "/api/scheduler/admin";

/** 单体调度管理 API。 */
export const SchedulerAdminApi = {
    catalog(): Promise<SchedulerCatalogVO[]> {
        return get<SchedulerCatalogVO[]>(`${ADMIN_API}/catalog`);
    },
    jobs(params?: SchedulerJobQuery): Promise<Page<SchedulerJobVO>> {
        return get<Page<SchedulerJobVO>>(`${ADMIN_API}/jobs`, params);
    },
    createJob(params: SchedulerJobSaveParams): Promise<SchedulerJobVO> {
        return post<SchedulerJobVO>(`${ADMIN_API}/jobs`, params);
    },
    updateJob(id: string, params: SchedulerJobSaveParams): Promise<SchedulerJobVO> {
        return put<SchedulerJobVO>(`${ADMIN_API}/jobs/${id}`, params);
    },
    enableJob(id: string, params: SchedulerOperationParams): Promise<SchedulerJobVO> {
        return post<SchedulerJobVO>(`${ADMIN_API}/jobs/${id}/enable`, params);
    },
    disableJob(id: string, params: SchedulerOperationParams): Promise<SchedulerJobVO> {
        return post<SchedulerJobVO>(`${ADMIN_API}/jobs/${id}/disable`, params);
    },
    archiveJob(id: string, params: SchedulerOperationParams): Promise<SchedulerJobVO> {
        return post<SchedulerJobVO>(`${ADMIN_API}/jobs/${id}/archive`, params);
    },
    triggerJob(id: string, params: SchedulerTriggerParams): Promise<SchedulerExecutionVO> {
        return post<SchedulerExecutionVO>(`${ADMIN_API}/jobs/${id}/trigger`, params);
    },
    executions(params?: SchedulerExecutionQuery): Promise<Page<SchedulerExecutionVO>> {
        return get<Page<SchedulerExecutionVO>>(`${ADMIN_API}/executions`, params);
    },
    execution(id: string): Promise<SchedulerExecutionVO> {
        return get<SchedulerExecutionVO>(`${ADMIN_API}/executions/${id}`);
    },
    retryExecution(id: string, params: SchedulerExecutionActionParams): Promise<SchedulerExecutionVO> {
        return post<SchedulerExecutionVO>(`${ADMIN_API}/executions/${id}/retry`, params);
    },
    cancelExecution(id: string, params: SchedulerExecutionActionParams): Promise<SchedulerExecutionVO> {
        return post<SchedulerExecutionVO>(`${ADMIN_API}/executions/${id}/cancel`, params);
    },
    resolveExecution(id: string, params: SchedulerExecutionActionParams): Promise<SchedulerExecutionVO> {
        return post<SchedulerExecutionVO>(`${ADMIN_API}/executions/${id}/resolve`, params);
    },
    loops(params?: SchedulerLoopQuery): Promise<Page<SchedulerLoopRuntimeVO>> {
        return get<Page<SchedulerLoopRuntimeVO>>(`${ADMIN_API}/loops`, params);
    },
    command(jobId: string, params: SchedulerLoopCommandParams): Promise<SchedulerControlCommandVO> {
        return post<SchedulerControlCommandVO>(`${ADMIN_API}/loops/${jobId}/commands`, params);
    },
    commands(jobId: string, params?: BasePageParams): Promise<Page<SchedulerControlCommandVO>> {
        return get<Page<SchedulerControlCommandVO>>(`${ADMIN_API}/loops/${jobId}/commands`, params);
    },
    operations(jobId: string, params?: BasePageParams): Promise<Page<SchedulerOperationVO>> {
        return get<Page<SchedulerOperationVO>>(`${ADMIN_API}/jobs/${jobId}/operations`, params);
    },
    errors(jobId: string, params?: Omit<SchedulerLoopErrorQuery, "job_id">): Promise<Page<SchedulerLoopErrorVO>> {
        return get<Page<SchedulerLoopErrorVO>>(`${ADMIN_API}/loops/${jobId}/errors`, params);
    }
};
