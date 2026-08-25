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
        return get<Page<Notification>>("/api/notification/list", { ...params });
    },
    /**
     * 获取消息详情
     * @param id 消息ID
     */
    detail(id: string): Promise<Notification> {
        return get<Notification>(`/api/notification/${id}`);
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
     * @param options 请求选项
     */
    delete(id: string, options?: Pick<RequestOptions<string>, "loading">): Promise<void> {
        return options
            ? del<void>(`/api/notification/${id}`, undefined, options)
            : del<void>(`/api/notification/${id}`);
    },
    /**
     * 批量删除
     * @param ids 消息ID数组
     */
    batchDelete(ids: string[]): Promise<void> {
        return post<void>("/api/notification/batch-delete", { ids });
    },
    /**
     * 获取当前用户用途×渠道偏好
     */
    preferences(): Promise<NotificationPreference[]> {
        return get<NotificationPreference[]>("/api/notification-center/preferences");
    },
    /**
     * 保存当前用户可选通知偏好；后端使用 query 参数接收表单
     */
    savePreference(params: NotificationPreferenceUpdate): Promise<void> {
        return put<void>("/api/notification-center/preferences", undefined, {
            params: {
                purpose: params.purpose,
                channel: params.channel,
                enabled: params.enabled,
                doNotDisturb: params.doNotDisturb ?? false
            }
        });
    }
};
