import { del, get, post, put } from "@/plugin/request/api.ts";

/**
 * 通知相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2026-07-19 10:00:00
 */
export const NotificationApi = {
    /**
     * 获取消息列表
     * @param params 查询参数
     */
    list(params: NotificationQueryParams): Promise<Page<Notification>> {
        return get<Page<Notification>>("/api/notification/list", params);
    },
    /**
     * 获取未读数量
     */
    unreadCount(): Promise<number> {
        return get<number>("/api/notification/unread-count");
    },
    /**
     * 标记单条已读
     * @param id 消息ID
     */
    markAsRead(id: string): Promise<void> {
        return put<void>(`/api/notification/${id}/read`);
    },
    /**
     * 全部标记已读
     */
    markAllAsRead(): Promise<void> {
        return put<void>("/api/notification/read-all");
    },
    /**
     * 删除消息
     * @param id 消息ID
     */
    delete(id: string): Promise<void> {
        return del<void>(`/api/notification/${id}`);
    },
    /**
     * 批量删除
     * @param ids 消息ID数组
     */
    batchDelete(ids: string[]): Promise<void> {
        return post<void>("/api/notification/batch-delete", { body: ids });
    }
};
