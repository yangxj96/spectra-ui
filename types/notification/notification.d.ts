/** 通知用途枚举，与后端 NotificationPurpose 保持一致 */
type NotificationPurpose =
    | "LOGIN_CODE"
    | "BIND_PHONE_CODE"
    | "BIND_EMAIL_CODE"
    | "RESET_PASSWORD_CODE"
    | "SECURITY_ALERT"
    | "SYSTEM_NOTICE"
    | "WORKFLOW_TODO"
    | "WORKFLOW_RESULT"
    | "OA_NOTICE"
    | "OA_REMINDER"
    | "INNER_MESSAGE";

/** 消息实体 */
interface Notification {
    id: string;
    title: string;
    content: string;
    purpose: NotificationPurpose;
    sender_user_id?: string;
    sender_name?: string;
    link?: string;
    is_read: boolean;
    read_at?: string;
    receiver_user_id?: string;
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
    purpose?: NotificationPurpose | "all";
    is_read?: boolean;
    keyword?: string;
    start_time?: string;
    end_time?: string;
}

/** 通知用途配置 */
interface NotificationPurposeConfig {
    purpose: NotificationPurpose;
    label: string;
    color: string;
    icon: string;
}
