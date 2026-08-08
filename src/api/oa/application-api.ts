import { del, get, post, put } from "@/plugin/request/api.ts";

/**
 * OA 通用申请与申请类型配置接口。
 */
export const ApplicationApi = {
    page(
        params?: BasePageParams & { type_code?: string; status?: string; keyword?: string }
    ): Promise<Page<ApplicationVO>> {
        return get<Page<ApplicationVO>>("/api/oa/applications/page", params);
    },
    get(id: string): Promise<ApplicationVO> {
        return get<ApplicationVO>(`/api/oa/applications/${id}`);
    },
    listTypes(): Promise<ApplicationTypeVO[]> {
        return get<ApplicationTypeVO[]>("/api/oa/applications/types");
    },
    listAllTypes(): Promise<ApplicationTypeVO[]> {
        return get<ApplicationTypeVO[]>("/api/oa/applications/types/all");
    },
    createType(params: ApplicationTypeSaveParams): Promise<string> {
        return post<string>("/api/oa/applications/types", params);
    },
    updateType(id: string, params: ApplicationTypeSaveParams): Promise<void> {
        return put<void>(`/api/oa/applications/types/${id}`, params);
    },
    deleteType(id: string): Promise<void> {
        return del<void>(`/api/oa/applications/types/${id}`);
    },
    withdraw(id: string): Promise<void> {
        return post<void>(`/api/oa/applications/${id}/withdraw`);
    },
    cancel(id: string): Promise<void> {
        return post<void>(`/api/oa/applications/${id}/cancel`);
    }
};
