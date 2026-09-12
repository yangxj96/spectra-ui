import { download, get } from "@/plugin/request/api.ts";

/** 统一操作与安全审计日志查询接口。 */
export const AuditLogApi = {
    page(params?: AuditLogPageParams): Promise<Page<AuditLogVO>> {
        return get<Page<AuditLogVO>>("/api/audit/page", params);
    },
    detail(eventId: string, occurredAt: string): Promise<AuditLogVO> {
        return get<AuditLogVO>(`/api/audit/${eventId}`, { occurred_at: occurredAt });
    },
    async export(params?: Omit<AuditLogPageParams, "page_num" | "page_size">): Promise<Blob> {
        return download("/api/audit/export", { params });
    }
};
