export {};

declare global {
    type AuditLogPageParams = BasePageParams & {
        category?: "OPERATION" | "SECURITY";
        event_type?: string;
        operator?: string;
        target_id?: string;
        result?: "STARTED" | "SUCCEEDED" | "FAILED" | "DENIED";
        from?: string;
        to?: string;
    };

    type AuditLogVO = {
        event_id: string;
        occurred_at: string;
        category: "OPERATION" | "SECURITY";
        event_type: string;
        operator_id?: string;
        operator_name?: string;
        target_id?: string;
        client?: string;
        ip?: string;
        user_agent?: string;
        http_method?: string;
        request_url?: string;
        http_status?: number;
        duration_ms?: number;
        before: Record<string, unknown>;
        after: Record<string, unknown>;
        reason?: string;
        result: "STARTED" | "SUCCEEDED" | "FAILED" | "DENIED";
        failure_code?: string;
        failure_type?: string;
        failure_reason?: string;
        correlation_id?: string;
    };
}
