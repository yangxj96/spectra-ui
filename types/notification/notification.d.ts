/** 消息类型枚举 - 可扩展 */
type NotificationType = "system" | "workflow" | "oa" | "inner_mail" | "approval" | string;

/** 消息实体 */
interface Notification {
    id: string;
    title: string;
    content: string;
    type: NotificationType;
    sender_id?: string;
    sender_name?: string;
    link?: string;
    is_read: boolean;
    read_at?: string;
    receiver_id?: string;
    extra?: Record<string, unknown>;
    created_at: string;
}

/** 当前用户用途×渠道通知偏好 */
interface NotificationPreference {
    id?: string;
    purpose: string;
    channel: string;
    enabled: boolean;
    do_not_disturb: boolean;
    do_not_disturb_start?: string;
    do_not_disturb_end?: string;
}

/** 更新当前用户通知偏好 */
interface NotificationPreferenceUpdate {
    purpose: string;
    channel: string;
    enabled: boolean;
    doNotDisturb?: boolean;
}

/** 消息查询参数 */
interface NotificationQueryParams {
    page_num: number;
    page_size: number;
    type?: NotificationType | "all";
    is_read?: boolean;
    keyword?: string;
    start_time?: string;
    end_time?: string;
}

/** 消息类型配置 */
interface NotificationTypeConfig {
    type: NotificationType;
    label: string;
    color: string;
    icon: string;
}
