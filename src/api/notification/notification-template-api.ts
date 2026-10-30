import { del, get, post, put } from "@/plugin/request/api.ts";

const TEMPLATE_API = "/api/notification/admin/templates";

/**
 * 通知模板管理接口。
 */
export const NotificationTemplateApi = {
    page(params?: NotificationTemplatePageParams): Promise<Page<NotificationTemplateVO>> {
        return get<Page<NotificationTemplateVO>>(`${TEMPLATE_API}/page`, params);
    },

    detail(id: string): Promise<NotificationTemplateVO> {
        return get<NotificationTemplateVO>(`${TEMPLATE_API}/${id}`);
    },

    create(params: NotificationTemplateSaveParams): Promise<string> {
        return post<string>(TEMPLATE_API, params);
    },

    update(id: string, params: NotificationTemplateSaveParams): Promise<void> {
        return put<void>(`${TEMPLATE_API}/${id}`, params);
    },

    delete(id: string): Promise<void> {
        return del<void>(`${TEMPLATE_API}/${id}`);
    },

    changeEnabled(id: string, enabled: boolean): Promise<void> {
        return put<void>(`${TEMPLATE_API}/${id}/enabled`, { enabled });
    }
};
