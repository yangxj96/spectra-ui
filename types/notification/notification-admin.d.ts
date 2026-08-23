export {};

declare global {
    type NotificationAdminChannel = "IN_APP" | "SMS" | "EMAIL";

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
}
