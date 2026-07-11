import { get } from "@/plugin/request/api.ts";

/**
 * 会议相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-07-11
 */
export const meetingApi = {
    /**
     * 分页查询会议列表
     * @param params 查询参数
     */
    page(params?: MeetingPageParams): Promise<Page<MeetingVO>> {
        return get<Page<MeetingVO>>("/api/oa/meeting/page", params);
    }
};
