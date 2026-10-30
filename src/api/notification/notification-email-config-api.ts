import { del, get, post, put } from "@/plugin/request/api.ts";

const EMAIL_CONFIG_API = "/api/notification/admin/email-configs";

/**
 * 邮件配置管理接口。
 */
export const NotificationEmailConfigApi = {
    list(): Promise<NotificationEmailConfigVO[]> {
        return get<NotificationEmailConfigVO[]>(`${EMAIL_CONFIG_API}/list`);
    },

    detail(id: string): Promise<NotificationEmailConfigVO> {
        return get<NotificationEmailConfigVO>(`${EMAIL_CONFIG_API}/${id}`);
    },

    create(params: NotificationEmailConfigSaveParams): Promise<string> {
        return post<string>(EMAIL_CONFIG_API, params);
    },

    update(id: string, params: NotificationEmailConfigSaveParams): Promise<void> {
        return put<void>(`${EMAIL_CONFIG_API}/${id}`, params);
    },

    delete(id: string): Promise<void> {
        return del<void>(`${EMAIL_CONFIG_API}/${id}`);
    },

    activate(id: string): Promise<void> {
        return post<void>(`${EMAIL_CONFIG_API}/${id}/activate`);
    }
};
