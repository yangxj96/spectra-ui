export {};

declare global {
    type NotificationTemplateChannel = "IN_APP" | "SMS" | "EMAIL";

    interface NotificationTemplateVO {
        id: string;
        code: string;
        name: string;
        channel: NotificationTemplateChannel;
        title_template?: string | null;
        content_template: string;
        html_template?: string | null;
        provider_template_code?: string | null;
        builtin: boolean;
        enabled: boolean;
        created_at?: string;
    }

    interface NotificationTemplatePageParams extends BasePageParams {
        keyword?: string;
        channel?: NotificationTemplateChannel;
        enabled?: boolean;
    }

    interface NotificationTemplateSaveParams {
        code: string;
        name: string;
        channel: NotificationTemplateChannel;
        title_template?: string;
        content_template: string;
        html_template?: string;
        provider_template_code?: string;
        enabled?: boolean;
    }
}
