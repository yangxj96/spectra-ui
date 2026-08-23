import { del, get, post } from "@/plugin/request/api.ts";

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
    },

    pageRequests(params?: NotificationAdminRequestQuery): Promise<Page<NotificationRequestAdminVO>> {
        return get<Page<NotificationRequestAdminVO>>(`${ADMIN_API}/requests`, params);
    },

    requestDetail(id: string): Promise<NotificationRequestAdminVO> {
        return get<NotificationRequestAdminVO>(`${ADMIN_API}/requests/${id}`);
    },

    pageTasks(params?: NotificationAdminTaskQuery): Promise<Page<NotificationTaskAdminVO>> {
        return get<Page<NotificationTaskAdminVO>>(`${ADMIN_API}/tasks`, params);
    },

    taskDetail(id: string): Promise<NotificationTaskAdminVO> {
        return get<NotificationTaskAdminVO>(`${ADMIN_API}/tasks/${id}`);
    },

    pageDeliveries(params?: NotificationAdminDeliveryQuery): Promise<Page<NotificationDeliveryAdminVO>> {
        return get<Page<NotificationDeliveryAdminVO>>(`${ADMIN_API}/deliveries`, params);
    },

    retryTask(id: string): Promise<void> {
        return post<void>(`${ADMIN_API}/tasks/${id}/retry`);
    },

    cancelTask(id: string): Promise<void> {
        return del<void>(`${ADMIN_API}/tasks/${id}`);
    }
};
