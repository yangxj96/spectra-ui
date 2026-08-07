import { del, get, post, put } from "@/plugin/request/api.ts";

/**
 * 合同台账接口。
 */
export const ContractApi = {
    page(params?: ContractPageParams): Promise<Page<ContractVO>> {
        return get<Page<ContractVO>>("/api/oa/contract/page", params);
    },
    get(id: string): Promise<ContractVO> {
        return get<ContractVO>(`/api/oa/contract/${id}`);
    },
    create(params: ContractSaveParams): Promise<string> {
        return post<string>("/api/oa/contract", params);
    },
    update(id: string, params: ContractSaveParams): Promise<void> {
        return put<void>(`/api/oa/contract/${id}`, params);
    },
    delete(id: string): Promise<void> {
        return del<void>(`/api/oa/contract/${id}`);
    },
    addVersion(id: string, params: ContractVersionParams): Promise<string> {
        return post<string>(`/api/oa/contract/${id}/versions`, params);
    },
    versions(id: string): Promise<ContractVersionVO[]> {
        return get<ContractVersionVO[]>(`/api/oa/contract/${id}/versions`);
    },
    createMilestone(id: string, params: ContractMilestoneSaveParams): Promise<string> {
        return post<string>(`/api/oa/contract/${id}/milestones`, params);
    },
    milestones(id: string): Promise<ContractMilestoneVO[]> {
        return get<ContractMilestoneVO[]>(`/api/oa/contract/${id}/milestones`);
    },
    updateMilestone(id: string, milestoneId: string, params: ContractMilestoneUpdateParams): Promise<void> {
        return put<void>(`/api/oa/contract/${id}/milestones/${milestoneId}`, params);
    },
    sign(id: string): Promise<void> {
        return post<void>(`/api/oa/contract/${id}/sign`);
    },
    activate(id: string): Promise<void> {
        return post<void>(`/api/oa/contract/${id}/activate`);
    },
    terminate(id: string): Promise<void> {
        return post<void>(`/api/oa/contract/${id}/terminate`);
    }
};
