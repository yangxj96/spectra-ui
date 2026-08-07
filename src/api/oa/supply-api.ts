import { get, post, put } from "@/plugin/request/api.ts";

export const SupplyApi = {
    page(params?: SupplyPageParams): Promise<Page<SupplyItemVO>> {
        return get<Page<SupplyItemVO>>("/api/oa/supplies/page", params);
    },
    get(id: string): Promise<SupplyItemVO> {
        return get<SupplyItemVO>(`/api/oa/supplies/${id}`);
    },
    create(params: SupplySaveParams): Promise<string> {
        return post<string>("/api/oa/supplies", params);
    },
    update(id: string, params: SupplySaveParams): Promise<void> {
        return put<void>(`/api/oa/supplies/${id}`, params);
    },
    inbound(id: string, params: SupplyOperationParams): Promise<void> {
        return post<void>(`/api/oa/supplies/${id}/inbound`, params);
    },
    issue(id: string, params: SupplyOperationParams): Promise<void> {
        return post<void>(`/api/oa/supplies/${id}/issue`, params);
    },
    returnStock(id: string, params: SupplyOperationParams): Promise<void> {
        return post<void>(`/api/oa/supplies/${id}/return`, params);
    },
    adjust(id: string, params: SupplyOperationParams): Promise<void> {
        return post<void>(`/api/oa/supplies/${id}/adjust`, params);
    },
    lowStock(): Promise<SupplyItemVO[]> {
        return get<SupplyItemVO[]>("/api/oa/supplies/low-stock");
    }
};
