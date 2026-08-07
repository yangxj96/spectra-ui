import { get, post, put } from "@/plugin/request/api.ts";

/**
 * 采购申请接口。
 */
export const PurchaseApi = {
    page(params?: PurchasePageParams): Promise<Page<PurchaseVO>> {
        return get<Page<PurchaseVO>>("/api/oa/purchases/page", params);
    },
    get(id: string): Promise<PurchaseVO> {
        return get<PurchaseVO>(`/api/oa/purchases/${id}`);
    },
    create(params: PurchaseSaveParams): Promise<string> {
        return post<string>("/api/oa/purchases", params);
    },
    update(id: string, params: PurchaseSaveParams): Promise<void> {
        return put<void>(`/api/oa/purchases/${id}`, params);
    },
    submit(id: string, params?: PurchaseSubmitParams): Promise<void> {
        return post<void>(`/api/oa/purchases/${id}/submit`, params);
    },
    withdraw(id: string): Promise<void> {
        return post<void>(`/api/oa/purchases/${id}/withdraw`);
    },
    cancel(id: string): Promise<void> {
        return post<void>(`/api/oa/purchases/${id}/cancel`);
    },
    execute(id: string, params: PurchaseExecuteParams): Promise<void> {
        return post<void>(`/api/oa/purchases/${id}/execute`, params);
    },
    receive(id: string, params: PurchaseReceiptParams): Promise<void> {
        return post<void>(`/api/oa/purchases/${id}/receipts`, params);
    }
};
