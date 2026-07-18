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
    list(params: NotificationQueryParams): Promise<IResult<Page<Notification>>> {
        return get<IResult<Page<Notification>>>("/api/notification/list", params);
    },
    /**
     * 获取未读数量
     */
    unreadCount(): Promise<IResult<number>> {
        return get<IResult<number>>("/api/notification/unread-count");
    },
    /**
     * 标记单条已读
     * @param id 消息ID
     */
    markAsRead(id: string): Promise<IResult<void>> {
        return put<IResult<void>>(`/api/notification/${id}/read`);
    },
    /**
     * 全部标记已读
     */
    markAllAsRead(): Promise<IResult<void>> {
        return put<IResult<void>>("/api/notification/read-all");
    },
    /**
     * 删除消息
     * @param id 消息ID
     */
    delete(id: string): Promise<IResult<void>> {
        return del<IResult<void>>(`/api/notification/${id}`);
    },
    /**
     * 批量删除
     * @param ids 消息ID数组
     */
    batchDelete(ids: string[]): Promise<IResult<void>> {
        return post<IResult<void>>("/api/notification/batch-delete", { body: ids });
    }
};
