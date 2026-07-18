import { defineStore } from "pinia";

import { NotificationApi } from "@/api/notification/notification-api.ts";

/** 消息类型配置 */
const notificationTypeConfigs: NotificationTypeConfig[] = [
    { type: "system", label: "系统通知", color: "#409eff", icon: "icon-notification" },
    { type: "workflow", label: "工作流", color: "#e6a23c", icon: "icon-workflow" },
    { type: "oa", label: "OA", color: "#67c23a", icon: "icon-office" },
    { type: "inner_mail", label: "站内信", color: "#909399", icon: "icon-mail" },
    { type: "approval", label: "待我审批", color: "#f56c6c", icon: "icon-approval" }
];

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    currentType: NotificationType | "all";
    typeConfigs: NotificationTypeConfig[];
    total: number;
}

export const useNotificationStore = defineStore("notification", {
    state: (): NotificationState => ({
        notifications: [],
        unreadCount: 0,
        loading: false,
        currentType: "all",
        typeConfigs: notificationTypeConfigs,
        total: 0
    }),

    getters: {
        /** 根据类型获取标签 */
        getTypeLabel:
            state =>
            (type: NotificationType): string => {
                return state.typeConfigs.find(c => c.type === type)?.label ?? type;
            },
        /** 根据类型获取颜色 */
        getTypeColor:
            state =>
            (type: NotificationType): string => {
                return state.typeConfigs.find(c => c.type === type)?.color ?? "#909399";
            },
        /** 筛选后的消息列表 */
        filteredNotifications: (state): Notification[] => {
            if (state.currentType === "all") {
                return state.notifications;
            }
            return state.notifications.filter(n => n.type === state.currentType);
        }
    },

    actions: {
        /** 获取消息列表 */
        async fetchNotifications(params?: NotificationQueryParams): Promise<void> {
            this.loading = true;
            try {
                const queryParams: Record<string, unknown> = {
                    page_num: params?.page_num ?? 1,
                    page_size: params?.page_size ?? 20
                };
                if (params?.type && params.type !== "all") {
                    queryParams.type = params.type;
                }
                if (params?.is_read !== undefined) {
                    queryParams.is_read = params.is_read;
                }
                if (params?.keyword) {
                    queryParams.keyword = params.keyword;
                }
                if (params?.start_time) {
                    queryParams.start_time = params.start_time;
                }
                if (params?.end_time) {
                    queryParams.end_time = params.end_time;
                }
                const result = await NotificationApi.list(queryParams as NotificationQueryParams);
                this.notifications = result.records ?? [];
                this.total = result.total ?? 0;
            } catch (error) {
                console.error("[NotificationStore] 获取消息列表失败", error);
            } finally {
                this.loading = false;
            }
        },

        /** 刷新未读数 */
        async refreshUnreadCount(): Promise<void> {
            try {
                const result = await NotificationApi.unreadCount();
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
        async deleteNotification(id: string): Promise<void> {
            try {
                await NotificationApi.delete(id);
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

        /** 设置当前筛选类型 */
        setCurrentType(type: NotificationType | "all"): void {
            this.currentType = type;
        }
    }
});
