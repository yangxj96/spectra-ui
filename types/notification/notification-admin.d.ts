export {};

declare global {
    type NotificationAdminChannel = "IN_APP" | "SMS" | "EMAIL";

    type NotificationProviderType = "ALIYUN_SMS" | "TENCENT_SMS" | "SMTP" | "HTTP_JSON" | "MOCK" | "IN_APP";
    type NotificationProviderState = "NOT_CONFIGURED" | "DISABLED" | "HEALTHY" | "UNHEALTHY" | "BLOCKED";

    interface NotificationChannelAvailabilityVO {
        channel: NotificationAdminChannel;
        available: boolean;
        reason?: string | null;
    }

    interface NotificationOverviewChannelSummary {
        availability: NotificationChannelAvailabilityVO;
        pending_task_count: number;
        failed_task_count: number;
        unknown_task_count: number;
    }

    interface NotificationOverviewTrendPoint {
        bucket_at: string;
        total_count: number;
        success_count: number;
        failed_count: number;
        unknown_count: number;
    }

    interface NotificationOverviewErrorSummary {
        occurred_at: string;
        channel: NotificationAdminChannel;
        status: string;
        error_code?: string | null;
        message?: string | null;
    }

    interface NotificationOverviewVO {
        generated_at: string;
        range_hours: number;
        pending_task_count: number;
        processing_task_count: number;
        oldest_pending_task_at?: string | null;
        failed_task_count: number;
        unknown_task_count: number;
        delivery_count: number;
        successful_delivery_count: number;
        failed_delivery_count: number;
        unknown_delivery_count: number;
        failure_rate: number;
        channels: NotificationOverviewChannelSummary[];
        trend: NotificationOverviewTrendPoint[];
        recent_errors: NotificationOverviewErrorSummary[];
    }

    interface NotificationAdminRequestQuery extends BasePageParams {
        request_id?: string;
        status?: string;
        purpose?: string;
        source_module?: string;
        business_type?: string;
        business_id?: string;
        start_time?: string;
        end_time?: string;
    }

    interface NotificationAdminTaskQuery extends BasePageParams {
        request_id?: string;
        task_id?: string;
        recipient_user_id?: string;
        status?: string;
        channel?: NotificationAdminChannel;
        purpose?: string;
        start_time?: string;
        end_time?: string;
    }

    interface NotificationAdminDeliveryQuery extends BasePageParams {
        request_id?: string;
        task_id?: string;
        recipient_user_id?: string;
        status?: string;
        channel?: NotificationAdminChannel;
        start_time?: string;
        end_time?: string;
    }

    interface NotificationRequestAdminVO {
        id: string;
        business_type?: string | null;
        business_id?: string | null;
        template_code: string;
        template_snapshot?: Record<string, unknown> | null;
        purpose: string;
        source_module?: string | null;
        recipient_count: number;
        task_count: number;
        status: string;
        scheduled_at?: string | null;
        expires_at?: string | null;
        created_at: string;
        updated_at: string;
        priority?: number | null;
    }

    interface NotificationTaskAdminVO {
        id: string;
        request_id: string;
        template_id?: string | null;
        template_version_no?: number | null;
        template_version_digest?: string | null;
        recipient_user_id?: string | null;
        recipient_address?: string | null;
        channel: NotificationAdminChannel;
        purpose: string;
        status: string;
        retry_count: number;
        last_error?: string | null;
        scheduled_at?: string | null;
        expires_at?: string | null;
        created_at: string;
        updated_at: string;
    }

    interface NotificationDeliveryAdminVO {
        id: string;
        task_id: string;
        template_id?: string | null;
        template_version_no?: number | null;
        template_version_digest?: string | null;
        channel: NotificationAdminChannel;
        provider_code?: string | null;
        provider_message_id?: string | null;
        status: string;
        response_summary?: string | null;
        error_code?: string | null;
        error_message?: string | null;
        sent_at?: string | null;
        created_at: string;
    }

    interface NotificationProviderVO {
        channel: NotificationAdminChannel;
        provider_type?: NotificationProviderType | string | null;
        state: NotificationProviderState;
        enabled: boolean;
        reason?: string | null;
        endpoint?: string | null;
        port: number;
        region?: string | null;
        credential_id?: string | null;
        app_id?: string | null;
        sign_name?: string | null;
        sender_address?: string | null;
        sender_name?: string | null;
        ssl_enabled: boolean;
        starttls_enabled: boolean;
        timeout_ms: number;
        rate_limit_per_second: number;
        max_attempts: number;
        template_code?: string | null;
        template_parameter_order?: string | null;
        secret_configured: boolean;
        secret_key_id?: string | null;
        updated_at?: string | null;
        checked_at?: string | null;
    }

    interface NotificationProviderSaveParams {
        provider_type: NotificationProviderType;
        enabled: boolean;
        endpoint: string;
        port: number;
        region: string;
        credential_id: string;
        app_id: string;
        sign_name: string;
        sender_address: string;
        sender_name: string;
        ssl_enabled: boolean;
        starttls_enabled: boolean;
        timeout_ms: number;
        rate_limit_per_second: number;
        max_attempts: number;
        template_code: string;
        template_parameter_order: string;
        secret?: string;
        clear_secret: boolean;
    }

    interface NotificationProviderHealthVO {
        state: NotificationProviderState;
        reason: string;
        checked_at: string;
    }

    interface NotificationProviderTestParams {
        recipient_address: string;
        title: string;
        content: string;
        confirmation: string;
    }

    interface NotificationProviderTestVO {
        channel: NotificationAdminChannel;
        provider_code: string;
        status: string;
        provider_message_id?: string | null;
        summary?: string | null;
        tested_at: string;
    }
}
