/** 站内消息 */
interface Notification {
    id: string;
    title: string;
    content: string;
    template_code?: string;
    link?: string;
    is_read: boolean;
    read_at?: string;
    receiver_user_id?: string;
    created_at: string;
}

/** 消息查询参数 */
interface NotificationQueryParams {
    page_num: number;
    page_size: number;
    is_read?: boolean;
    keyword?: string;
    start_time?: string;
    end_time?: string;
}
