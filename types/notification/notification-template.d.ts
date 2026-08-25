export {};

declare global {
    type NotificationTemplateState = "DRAFT" | "PUBLISHED" | "DISABLED" | "ARCHIVED";

    type NotificationTemplateChannel = "IN_APP" | "SMS" | "EMAIL";

    interface NotificationTemplateVO {
        id: string;
        template_group_code: string;
        template_name: string;
        channel: NotificationTemplateChannel;
        purpose: string;
        version_no: number;
        state: NotificationTemplateState;
        title_template?: string | null;
        content_template: string;
        html_template?: string | null;
        parameter_schema: Record<string, unknown>;
        provider_template_code?: string | null;
        version_digest: string;
        version: number;
        created_at?: string;
        updated_at?: string;
    }

    interface NotificationTemplateChannelGroupVO {
        channel: NotificationTemplateChannel;
        current?: NotificationTemplateVO | null;
        draft?: NotificationTemplateVO | null;
    }

    interface NotificationTemplateGroupVO {
        template_group_code: string;
        template_name: string;
        purpose: string;
        channels: NotificationTemplateChannelGroupVO[];
        updated_at?: string;
    }

    interface NotificationTemplatePageParams extends BasePageParams {
        template_group_code?: string;
        channel?: NotificationTemplateChannel;
        purpose?: string;
        state?: NotificationTemplateState;
    }

    interface NotificationTemplateSaveParams {
        id?: string;
        template_group_code: string;
        template_name: string;
        channel: NotificationTemplateChannel;
        purpose: string;
        title_template?: string;
        content_template: string;
        html_template?: string;
        parameter_schema: Record<string, unknown>;
        provider_template_code?: string;
        version?: number;
    }

    interface NotificationTemplatePreviewParams {
        template_id?: string;
        channel?: NotificationTemplateChannel;
        purpose?: string;
        title_template?: string;
        content_template?: string;
        html_template?: string;
        parameter_schema?: Record<string, unknown>;
        parameters: Record<string, unknown>;
        sensitive_parameters?: Record<string, unknown>;
    }

    interface NotificationTemplatePreviewVO {
        template_id?: string | null;
        template_group_code?: string | null;
        channel?: NotificationTemplateChannel | string | null;
        purpose?: string | null;
        version_no?: number | null;
        title?: string | null;
        content: string;
        html?: string | null;
        previewed_at: string;
    }
}
