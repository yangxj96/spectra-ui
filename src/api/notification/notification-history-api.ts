import { get } from "@/plugin/request/api.ts";

const HISTORY_API = "/api/notification/admin/messages";

/**
 * 通知发送历史管理接口。
 */
export const NotificationHistoryApi = {
    page(params?: NotificationHistoryQuery): Promise<Page<NotificationMessageVO>> {
        return get<Page<NotificationMessageVO>>(`${HISTORY_API}/page`, params);
    },

    detail(id: string): Promise<NotificationMessageVO> {
        return get<NotificationMessageVO>(`${HISTORY_API}/${id}`);
    }
};
