import { get, post, put } from "@/plugin/request/api.ts";

/**
 * 请假申请接口。
 */
export const LeaveApi = {
    page(params?: LeavePageParams): Promise<Page<LeaveVO>> {
        return get<Page<LeaveVO>>("/api/oa/leave/page", params);
    },
    get(id: string): Promise<LeaveVO> {
        return get<LeaveVO>(`/api/oa/leave/${id}`);
    },
    create(params: LeaveCreateParams): Promise<string> {
        return post<string>("/api/oa/leave", params);
    },
    update(id: string, params: LeaveCreateParams): Promise<void> {
        return put<void>(`/api/oa/leave/${id}`, params);
    },
    submit(id: string, params?: LeaveSubmitParams): Promise<void> {
        return post<void>(`/api/oa/leave/${id}/submit`, params);
    },
    withdraw(id: string): Promise<void> {
        return post<void>(`/api/oa/leave/${id}/withdraw`);
    },
    cancel(id: string): Promise<void> {
        return post<void>(`/api/oa/leave/${id}/cancel`);
    }
};
