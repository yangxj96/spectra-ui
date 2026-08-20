import { defineStore } from "pinia";

import { NotificationApi } from "@/api/notification/notification-api.ts";

/** 消息类型配置 */
const notificationPurposeConfigs: NotificationPurposeConfig[] = [
    { purpose: "SYSTEM_NOTICE", label: "系统通知", color: "#409eff", icon: "icon-notification" },
    { purpose: "WORKFLOW_TODO", label: "工作流待办", color: "#e6a23c", icon: "icon-workflow" },
    { purpose: "WORKFLOW_RESULT", label: "工作流结果", color: "#f56c6c", icon: "icon-workflow" },
    { purpose: "OA_NOTICE", label: "OA 通知", color: "#67c23a", icon: "icon-office" },
    { purpose: "OA_REMINDER", label: "OA 提醒", color: "#67c23a", icon: "icon-office" },
    { purpose: "INNER_MESSAGE", label: "站内信", color: "#909399", icon: "icon-mail" },
    { purpose: "SECURITY_ALERT", label: "安全告警", color: "#f56c6c", icon: "icon-warning" },
    { purpose: "LOGIN_CODE", label: "登录验证", color: "#909399", icon: "icon-lock" },
    { purpose: "BIND_PHONE_CODE", label: "手机验证", color: "#909399", icon: "icon-lock" },
    { purpose: "BIND_EMAIL_CODE", label: "邮箱验证", color: "#909399", icon: "icon-lock" },
    { purpose: "RESET_PASSWORD_CODE", label: "密码重置验证", color: "#909399", icon: "icon-lock" }
];

/** 通知 Store 状态 */
interface NotificationState {
    /** 当前页消息列表 */
    notifications: Notification[];
    /** 未读消息总数 */
    unreadCount: number;
    /** 是否正在加载 */
    loading: boolean;
    /** 当前筛选的通知用途 */
    currentPurpose: NotificationPurpose | "all";
    /** 通知用途配置列表 */
    purposeConfigs: NotificationPurposeConfig[];
    /** 消息总数 */
    total: number;
}

/**
 * 消息通知状态管理
 * 管理消息列表、未读数、类型筛选、已读/删除操作
 */
export const useNotificationStore = defineStore("notification", {
    state: (): NotificationState => ({
        notifications: [],
        unreadCount: 0,
        loading: false,
        currentPurpose: "all",
        purposeConfigs: notificationPurposeConfigs,
        total: 0
    }),

    getters: {
        /** 根据用途获取标签 */
        getPurposeLabel:
            state =>
            (purpose: NotificationPurpose): string => {
                return state.purposeConfigs.find(c => c.purpose === purpose)?.label ?? purpose;
            },
        /** 根据用途获取颜色 */
        getPurposeColor:
            state =>
            (purpose: NotificationPurpose): string => {
                return state.purposeConfigs.find(c => c.purpose === purpose)?.color ?? "#909399";
            },
        /** 根据用途获取图标 */
        getPurposeIcon:
            state =>
            (purpose: NotificationPurpose): string => {
                return state.purposeConfigs.find(c => c.purpose === purpose)?.icon ?? "icon-notification";
            },
        /** 筛选后的消息列表 */
        filteredNotifications: (state): Notification[] => {
            if (state.currentPurpose === "all") {
                return state.notifications;
            }
            return state.notifications.filter(n => n.purpose === state.currentPurpose);
        }
    },

    actions: {
        /** 获取消息列表 */
        async fetchNotifications(params?: NotificationQueryParams): Promise<void> {
            this.loading = true;
            try {
                const queryParams: NotificationQueryParams = {
                    page_num: params?.page_num ?? 1,
                    page_size: params?.page_size ?? 20
                };
                if (params?.purpose && params.purpose !== "all") {
                    queryParams.purpose = params.purpose;
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
                const result = await NotificationApi.list(queryParams);
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

        /** 设置当前筛选用途 */
        setCurrentPurpose(purpose: NotificationPurpose | "all"): void {
            this.currentPurpose = purpose;
        }
    }
});
