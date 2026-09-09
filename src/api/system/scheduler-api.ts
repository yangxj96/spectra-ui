import { del, get, post, put } from "@/plugin/request/api.ts";

const QUARTZ_API = "/api/scheduler/quartz";

function resourceKey(value: string): string {
    return encodeURIComponent(value);
}

/** Quartz Job、Trigger 和执行历史 API。 */
export const QuartzSchedulerApi = {
    /** 查询代码白名单中的 Job 类型和参数 schema。 */
    jobTypes(): Promise<QuartzJobTypeVO[]> {
        return get<QuartzJobTypeVO[]>(`${QUARTZ_API}/job-types`);
    },

    /** 分页查询 Quartz Job。 */
    jobs(params?: BasePageParams): Promise<Page<QuartzJobVO>> {
        return get<Page<QuartzJobVO>>(`${QUARTZ_API}/jobs`, params);
    },

    /** 查询单个 Quartz Job 和其唯一 Trigger。 */
    job(jobKey: string): Promise<QuartzJobVO> {
        return get<QuartzJobVO>(`${QUARTZ_API}/jobs/${resourceKey(jobKey)}`);
    },

    /** 创建由服务端生成 JobKey 的普通 Job。 */
    createJob(params: QuartzJobCreateParams): Promise<QuartzJobVO> {
        return post<QuartzJobVO>(`${QUARTZ_API}/jobs`, params);
    },

    /** 更新 Job 的展示信息、参数和唯一 Trigger。 */
    updateJob(jobKey: string, params: QuartzJobUpdateParams): Promise<QuartzJobVO> {
        return put<QuartzJobVO>(`${QUARTZ_API}/jobs/${resourceKey(jobKey)}`, params);
    },

    /** 删除普通 Job；内置 Job 由服务端拒绝。 */
    deleteJob(jobKey: string): Promise<void> {
        return del<void>(`${QUARTZ_API}/jobs/${resourceKey(jobKey)}`);
    },

    /** 暂停 Job 的唯一 Trigger。 */
    pauseJob(jobKey: string): Promise<void> {
        return post<void>(`${QUARTZ_API}/jobs/${resourceKey(jobKey)}/pause`);
    },

    /** 恢复 Job 的唯一 Trigger。 */
    resumeJob(jobKey: string): Promise<void> {
        return post<void>(`${QUARTZ_API}/jobs/${resourceKey(jobKey)}/resume`);
    },

    /** 使用现有 JobDataMap 立即触发一次 Job。 */
    triggerJob(jobKey: string): Promise<void> {
        return post<void>(`${QUARTZ_API}/jobs/${resourceKey(jobKey)}/trigger`);
    },

    /** 查询 Trigger 详情。 */
    trigger(triggerKey: string): Promise<QuartzTriggerVO> {
        return get<QuartzTriggerVO>(`${QUARTZ_API}/triggers/${resourceKey(triggerKey)}`);
    },

    /** 分页查询执行历史。 */
    executionHistory(params?: QuartzHistoryQuery): Promise<Page<QuartzExecutionHistoryVO>> {
        return get<Page<QuartzExecutionHistoryVO>>(`${QUARTZ_API}/execution-history`, params);
    },

    /** 查询单条执行历史详情。 */
    executionHistoryDetail(id: string): Promise<QuartzExecutionHistoryVO> {
        return get<QuartzExecutionHistoryVO>(`${QUARTZ_API}/execution-history/${resourceKey(id)}`);
    }
};
