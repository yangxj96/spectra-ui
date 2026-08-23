export {};

declare global {
    interface NotificationControlledSendAudience {
        user_ids: string[];
        department_ids: string[];
        role_ids: string[];
    }

    interface NotificationControlledSendParams {
        idempotency_key: string;
        purpose: string;
        channels: NotificationAdminChannel[];
        template_version_ids: Record<NotificationAdminChannel, string>;
        audience: NotificationControlledSendAudience;
        parameters: Record<string, unknown>;
        business_type?: string;
        business_id?: string;
        link?: string;
    }

    interface NotificationControlledSendApplyParams {
        preview_id: string;
        preview_token: string;
        request_hash: string;
    }

    interface NotificationControlledSendChannelAvailability {
        channel: NotificationAdminChannel;
        available: boolean;
        reason?: string | null;
    }

    interface NotificationControlledSendTemplateVO {
        template_id: string;
        channel: NotificationAdminChannel;
        version_no: number;
        version_digest: string;
        title?: string | null;
        content: string;
        html?: string | null;
    }

    interface NotificationControlledSendSampleVO {
        channel: NotificationAdminChannel;
        recipient_masked: string;
    }

    interface NotificationControlledSendPreviewVO {
        preview_id: string;
        preview_token: string;
        request_hash: string;
        expires_at: string;
        candidate_user_count: number;
        eligible_task_count: number;
        skipped_task_count: number;
        skipped_counts: Record<string, number>;
        channel_availability: Partial<Record<NotificationAdminChannel, NotificationControlledSendChannelAvailability>>;
        templates: Partial<Record<NotificationAdminChannel, NotificationControlledSendTemplateVO>>;
        samples: NotificationControlledSendSampleVO[];
    }

    interface NotificationControlledSendApplyVO {
        request_id: string;
        status: string;
        task_count: number;
        idempotent_replay: boolean;
    }
}
