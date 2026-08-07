import { get, post, put } from "@/plugin/request/api.ts";

export const NoticeApi = {
    page(params?: NoticePageParams): Promise<Page<NoticeVO>> {
        return get<Page<NoticeVO>>("/api/oa/notice/page", params);
    },
    get(id: string): Promise<NoticeVO> {
        return get<NoticeVO>(`/api/oa/notice/${id}`);
    },
    create(params: NoticeCreateParams): Promise<NoticeVO> {
        return post<NoticeVO>("/api/oa/notice", params);
    },
    publish(id: string): Promise<void> {
        return post<void>(`/api/oa/notice/${id}/publish`);
    },
    revoke(id: string): Promise<void> {
        return post<void>(`/api/oa/notice/${id}/revoke`);
    },
    markRead(id: string): Promise<void> {
        return put<void>(`/api/oa/notice/${id}/read`);
    }
};
