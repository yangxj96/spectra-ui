import { get, post, put } from "@/plugin/request/api.ts";

const TEMPLATE_API = "/api/notification/admin/templates";

/**
 * 通知模板管理接口。
 */
export const NotificationTemplateApi = {
    page(params?: NotificationTemplatePageParams): Promise<Page<NotificationTemplateVO>> {
        return get<Page<NotificationTemplateVO>>(TEMPLATE_API, params);
    },

    groupPage(params?: NotificationTemplatePageParams): Promise<Page<NotificationTemplateGroupVO>> {
        return get<Page<NotificationTemplateGroupVO>>(`${TEMPLATE_API}/groups`, params);
    },

    detail(id: string): Promise<NotificationTemplateVO> {
        return get<NotificationTemplateVO>(`${TEMPLATE_API}/${id}`);
    },

    create(params: NotificationTemplateSaveParams): Promise<NotificationTemplateVO> {
        return post<NotificationTemplateVO>(TEMPLATE_API, params);
    },

    update(id: string, params: NotificationTemplateSaveParams): Promise<NotificationTemplateVO> {
        return put<NotificationTemplateVO>(`${TEMPLATE_API}/${id}`, params);
    },

    publish(id: string, version: number): Promise<void> {
        return post<void>(`${TEMPLATE_API}/${id}/publish`, { version });
    },

    disable(id: string, version: number): Promise<void> {
        return post<void>(`${TEMPLATE_API}/${id}/disable`, { version });
    },

    enable(id: string, version: number): Promise<void> {
        return post<void>(`${TEMPLATE_API}/${id}/enable`, { version });
    },

    archive(id: string, version: number): Promise<void> {
        return post<void>(`${TEMPLATE_API}/${id}/archive`, { version });
    },

    versions(id: string): Promise<NotificationTemplateVO[]> {
        return get<NotificationTemplateVO[]>(`${TEMPLATE_API}/${id}/versions`);
    },

    preview(params: NotificationTemplatePreviewParams): Promise<NotificationTemplatePreviewVO> {
        return post<NotificationTemplatePreviewVO>(`${TEMPLATE_API}/preview`, params);
    }
};
