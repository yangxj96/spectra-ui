import { get, post, put } from "@/plugin/request/api.ts";

const PROVIDER_API = "/api/notification/admin/providers";

/**
 * 通知 Provider 配置和健康检查接口。
 */
export const NotificationProviderApi = {
    list(): Promise<NotificationProviderVO[]> {
        return get<NotificationProviderVO[]>(PROVIDER_API);
    },

    save(channel: NotificationAdminChannel, params: NotificationProviderSaveParams): Promise<NotificationProviderVO> {
        return put<NotificationProviderVO>(`${PROVIDER_API}/${channel}`, params);
    },

    health(channel: NotificationAdminChannel): Promise<NotificationProviderHealthVO> {
        return post<NotificationProviderHealthVO>(`${PROVIDER_API}/${channel}/health`);
    }
};
