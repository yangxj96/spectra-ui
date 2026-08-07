import { get, post, put } from "@/plugin/request/api.ts";

export const AssetApi = {
    page(params?: AssetPageParams): Promise<Page<AssetVO>> {
        return get<Page<AssetVO>>("/api/oa/assets/page", params);
    },
    get(id: string): Promise<AssetVO> {
        return get<AssetVO>(`/api/oa/assets/${id}`);
    },
    create(params: AssetSaveParams): Promise<string> {
        return post<string>("/api/oa/assets", params);
    },
    update(id: string, params: AssetSaveParams): Promise<void> {
        return put<void>(`/api/oa/assets/${id}`, params);
    },
    categories(): Promise<AssetCategoryVO[]> {
        return get<AssetCategoryVO[]>("/api/oa/assets/categories");
    },
    createCategory(params: AssetCategorySaveParams): Promise<string> {
        return post<string>("/api/oa/assets/categories", params);
    },
    updateCategory(id: string, params: AssetCategorySaveParams): Promise<void> {
        return put<void>(`/api/oa/assets/categories/${id}`, params);
    },
    assign(id: string, params?: AssetOperationParams): Promise<void> {
        return post<void>(`/api/oa/assets/${id}/assign`, params);
    },
    returnAsset(id: string, params?: AssetOperationParams): Promise<void> {
        return post<void>(`/api/oa/assets/${id}/return`, params);
    },
    transfer(id: string, params?: AssetOperationParams): Promise<void> {
        return post<void>(`/api/oa/assets/${id}/transfer`, params);
    },
    maintenance(id: string, params?: AssetOperationParams): Promise<void> {
        return post<void>(`/api/oa/assets/${id}/maintenance`, params);
    },
    scrap(id: string, params?: AssetOperationParams): Promise<void> {
        return post<void>(`/api/oa/assets/${id}/scrap`, params);
    },
    fromPurchase(params: AssetPurchaseDraftParams): Promise<AssetVO[]> {
        return post<AssetVO[]>("/api/oa/assets/from-purchase", params);
    }
};
