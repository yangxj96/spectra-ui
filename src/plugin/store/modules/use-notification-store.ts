import { defineStore } from "pinia";

import { NotificationApi } from "@/api/notification/notification-api.ts";

/** 通知查询的会话代数；身份切换后旧响应不能写回新会话。 */
let notificationScopeGeneration = 0;

function buildNotificationQuery(params?: NotificationQueryParams): NotificationQueryParams {
    const queryParams: NotificationQueryParams = {
        page_num: params?.page_num ?? 1,
        page_size: params?.page_size ?? 20
    };
    const optionalKeys: Array<keyof NotificationQueryParams> = ["is_read", "keyword", "start_time", "end_time"];
    optionalKeys.forEach(key => {
        const value = params?.[key];
        if (value !== undefined && value !== "") {
            queryParams[key] = value as never;
        }
    });
    return queryParams;
}

/** 通知 Store 状态 */
interface NotificationState {
    /** 当前页消息列表 */
    notifications: Notification[];
    /** 未读消息总数 */
    unreadCount: number;
    /** 是否正在加载 */
    loading: boolean;
    /** 消息总数 */
    total: number;
}

/**
 * 消息通知状态管理
 * 管理消息列表、未读数和已读/删除操作
 */
export const useNotificationStore = defineStore("notification", {
    state: (): NotificationState => ({
        notifications: [],
        unreadCount: 0,
        loading: false,
        total: 0
    }),

    getters: {
        /** 当前消息列表 */
        filteredNotifications: (state): Notification[] => state.notifications
    },

    actions: {
        /** 获取消息列表 */
        async fetchNotifications(params?: NotificationQueryParams): Promise<void> {
            const generation = notificationScopeGeneration;
            this.loading = true;
            try {
                const result = await NotificationApi.list(buildNotificationQuery(params));
                if (generation !== notificationScopeGeneration) return;
                this.notifications = result.records ?? [];
                this.total = result.total ?? 0;
            } catch (error) {
                console.error("[NotificationStore] 获取消息列表失败", error);
            } finally {
                if (generation === notificationScopeGeneration) this.loading = false;
            }
        },

        /** 刷新未读数 */
        async refreshUnreadCount(): Promise<void> {
            const generation = notificationScopeGeneration;
            try {
                const result = await NotificationApi.unreadCount();
                if (generation !== notificationScopeGeneration) return;
                this.unreadCount = result as number;
            } catch (error) {
                console.error("[NotificationStore] 获取未读数失败", error);
            }
        },

        /** 标记单条已读 */
        async markAsRead(id: string): Promise<void> {
            try {
                await NotificationApi.markAsRead(id);
                const notification = this.notifications.find(n => n.id === id);
                if (notification && !notification.is_read) {
                    notification.is_read = true;
                    this.unreadCount = Math.max(0, this.unreadCount - 1);
                }
            } catch (error) {
                console.error("[NotificationStore] 标记已读失败", error);
            }
        },

        /** 全部标记已读 */
        async markAllAsRead(): Promise<void> {
            try {
                await NotificationApi.markAllAsRead();
                this.notifications.forEach(n => {
                    n.is_read = true;
                });
                this.unreadCount = 0;
            } catch (error) {
                console.error("[NotificationStore] 全部标记已读失败", error);
            }
        },

        /** 删除消息 */
        async deleteNotification(id: string, options?: Pick<RequestOptions<string>, "loading">): Promise<void> {
            try {
                await NotificationApi.delete(id, options);
                const index = this.notifications.findIndex(n => n.id === id);
                if (index > -1) {
                    const notification = this.notifications[index];
                    if (notification && !notification.is_read) {
                        this.unreadCount = Math.max(0, this.unreadCount - 1);
                    }
                    this.notifications.splice(index, 1);
                }
            } catch (error) {
                console.error("[NotificationStore] 删除消息失败", error);
            }
        },

        /** 批量删除 */
        async batchDelete(ids: string[]): Promise<void> {
            try {
                await NotificationApi.batchDelete(ids);
                ids.forEach(id => {
                    const index = this.notifications.findIndex(n => n.id === id);
                    if (index > -1) {
                        const notification = this.notifications[index];
                        if (notification && !notification.is_read) {
                            this.unreadCount = Math.max(0, this.unreadCount - 1);
                        }
                        this.notifications.splice(index, 1);
                    }
                });
            } catch (error) {
                console.error("[NotificationStore] 批量删除失败", error);
            }
        },

        /** 会话切换或退出时清空身份范围数据，并使在途查询失效。 */
        resetSessionScope(): void {
            notificationScopeGeneration++;
            this.notifications = [];
            this.unreadCount = 0;
            this.loading = false;
            this.total = 0;
        }
    }
});
