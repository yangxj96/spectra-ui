export {};

declare global {
    type NotificationHistoryChannel = "IN_APP" | "SMS" | "EMAIL";
    type NotificationHistoryStatus = "SUCCESS" | "FAILED";
    type NotificationSmsProvider = "ALIYUN" | "TENCENT" | "MOCK";
    type NotificationEmailProvider = "SMTP" | "MOCK";
    type NotificationEmailSslMode = "NONE" | "SSL" | "STARTTLS";

    interface NotificationMessageVO {
        id: string;
        channel: NotificationHistoryChannel;
        template_code: string;
        title?: string;
        content?: string;
        html_content?: string;
        status: NotificationHistoryStatus;
        error_code?: string;
        error_message?: string;
        provider?: string;
        recipient_user_id?: string;
        recipient_address?: string;
        read_at?: string;
        business_type?: string;
        business_id?: string;
        source_module?: string;
        link?: string;
        created_at: string;
    }

    interface NotificationHistoryQuery extends BasePageParams {
        channel?: NotificationHistoryChannel;
        status?: NotificationHistoryStatus;
        keyword?: string;
        start_time?: string;
        end_time?: string;
    }

    interface NotificationSmsConfigVO {
        id: string;
        name: string;
        provider: NotificationSmsProvider;
        access_key_id?: string;
        access_key_secret?: string;
        sign_name?: string;
        provider_template_code?: string;
        region?: string;
        extra?: Record<string, unknown>;
        active: boolean;
        created_at?: string;
    }

    interface NotificationSmsConfigSaveParams {
        name: string;
        provider: NotificationSmsProvider;
        access_key_id?: string;
        access_key_secret?: string;
        sign_name?: string;
        provider_template_code?: string;
        region?: string;
        extra?: Record<string, unknown>;
    }

    interface NotificationEmailConfigVO {
        id: string;
        name: string;
        provider: NotificationEmailProvider;
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        from_address?: string;
        from_name?: string;
        ssl_mode: NotificationEmailSslMode;
        extra?: Record<string, unknown>;
        active: boolean;
        created_at?: string;
    }

    interface NotificationEmailConfigSaveParams {
        name: string;
        provider: NotificationEmailProvider;
        host?: string;
        port?: number;
        username?: string;
        password?: string;
        from_address?: string;
        from_name?: string;
        ssl_mode?: NotificationEmailSslMode;
        extra?: Record<string, unknown>;
    }
}
