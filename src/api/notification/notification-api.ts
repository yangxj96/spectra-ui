import { del, get, post, put } from "@/plugin/request/api.ts";

/**
 * 当前用户消息中心接口。
 */
export const NotificationApi = {
    list(params: NotificationQueryParams): Promise<Page<Notification>> {
        return get<Page<Notification>>("/api/notification/list", { ...params });
    },

    detail(id: string): Promise<Notification> {
        return get<Notification>(`/api/notification/${id}`);
    },

    unreadCount(): Promise<number> {
        return get<number>("/api/notification/unread-count");
    },

    markAsRead(id: string): Promise<void> {
        return put<void>(`/api/notification/${id}/read`);
    },

    markAllAsRead(): Promise<void> {
        return put<void>("/api/notification/read-all");
    },

    delete(id: string, options?: Pick<RequestOptions<string>, "loading">): Promise<void> {
        return options
            ? del<void>(`/api/notification/${id}`, undefined, options)
            : del<void>(`/api/notification/${id}`);
    },

    batchDelete(ids: string[]): Promise<void> {
        return post<void>("/api/notification/batch-delete", { ids });
    }
};
