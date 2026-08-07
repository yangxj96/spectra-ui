import { get, post, put } from "@/plugin/request/api.ts";

/**
 * 费用报销接口。
 */
export const ReimbursementApi = {
    page(params?: ReimbursementPageParams): Promise<Page<ReimbursementVO>> {
        return get<Page<ReimbursementVO>>("/api/oa/reimbursements/page", params);
    },
    get(id: string): Promise<ReimbursementVO> {
        return get<ReimbursementVO>(`/api/oa/reimbursements/${id}`);
    },
    create(params: ReimbursementSaveParams): Promise<string> {
        return post<string>("/api/oa/reimbursements", params);
    },
    update(id: string, params: ReimbursementSaveParams): Promise<void> {
        return put<void>(`/api/oa/reimbursements/${id}`, params);
    },
    submit(id: string, params?: ReimbursementSubmitParams): Promise<void> {
        return post<void>(`/api/oa/reimbursements/${id}/submit`, params);
    },
    withdraw(id: string): Promise<void> {
        return post<void>(`/api/oa/reimbursements/${id}/withdraw`);
    },
    cancel(id: string): Promise<void> {
        return post<void>(`/api/oa/reimbursements/${id}/cancel`);
    },
    payment(id: string, params?: ReimbursementPaymentParams): Promise<void> {
        return post<void>(`/api/oa/reimbursements/${id}/payment`, params);
    }
};
