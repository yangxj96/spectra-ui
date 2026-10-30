import { del, get, post, put } from "@/plugin/request/api.ts";

const SMS_CONFIG_API = "/api/notification/admin/sms-configs";

/**
 * 短信配置管理接口。
 */
export const NotificationSmsConfigApi = {
    list(): Promise<NotificationSmsConfigVO[]> {
        return get<NotificationSmsConfigVO[]>(`${SMS_CONFIG_API}/list`);
    },

    detail(id: string): Promise<NotificationSmsConfigVO> {
        return get<NotificationSmsConfigVO>(`${SMS_CONFIG_API}/${id}`);
    },

    create(params: NotificationSmsConfigSaveParams): Promise<string> {
        return post<string>(SMS_CONFIG_API, params);
    },

    update(id: string, params: NotificationSmsConfigSaveParams): Promise<void> {
        return put<void>(`${SMS_CONFIG_API}/${id}`, params);
    },

    delete(id: string): Promise<void> {
        return del<void>(`${SMS_CONFIG_API}/${id}`);
    },

    activate(id: string): Promise<void> {
        return post<void>(`${SMS_CONFIG_API}/${id}/activate`);
    }
};
