import { get, post } from "@/plugin/request/api.ts";

/**
 * 会议相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-07-11
 */
export const MeetingApi = {
    create(params: MeetingCreateParams): Promise<void> {
        return post<void>("/api/oa/meeting", params);
    },
    /**
     * 分页查询会议列表
     * @param params 查询参数
     */
    page(params?: MeetingPageParams): Promise<Page<MeetingVO>> {
        return get<Page<MeetingVO>>("/api/oa/meeting/page", params);
    },
    respond(id: string, status: string): Promise<void> {
        return post<void>(`/api/oa/meeting/${id}/response`, { status });
    },
    checkIn(id: string): Promise<void> {
        return post<void>(`/api/oa/meeting/${id}/check-in`);
    }
};
