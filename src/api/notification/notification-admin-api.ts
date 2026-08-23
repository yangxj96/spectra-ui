import { get } from "@/plugin/request/api.ts";

const ADMIN_API = "/api/notification/admin";

/**
 * 通知运维管理接口。
 */
export const NotificationAdminApi = {
    overview(
        hours = 24,
        options?: Pick<RequestOptions<"/api/notification/admin/overview">, "loading">
    ): Promise<NotificationOverviewVO> {
        return get<NotificationOverviewVO>(`${ADMIN_API}/overview`, { hours }, options);
    }
};
