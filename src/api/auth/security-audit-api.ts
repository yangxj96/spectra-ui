import { download, get } from "@/plugin/request/api.ts";

/** Security Audit 只读查询与导出接口。 */
export const SecurityAuditApi = {
    page(params?: SecurityAuditPageParams): Promise<Page<SecurityAuditVO>> {
        return get<Page<SecurityAuditVO>>("/api/security/audit/page", params);
    },
    detail(eventId: string): Promise<SecurityAuditVO> {
        return get<SecurityAuditVO>(`/api/security/audit/${eventId}`);
    },
    retention(): Promise<SecurityAuditRetention> {
        return get<SecurityAuditRetention>("/api/security/audit/retention");
    },
    async export(params?: Omit<SecurityAuditPageParams, "page_num" | "page_size">): Promise<Blob> {
        return download("/api/security/audit/export", { params });
    }
};
