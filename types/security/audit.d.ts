export {};

declare global {
    type SecurityAuditPageParams = BasePageParams & {
        event_type?: string;
        operator_id?: string;
        target_id?: string;
        result?: "STARTED" | "SUCCEEDED" | "FAILED" | "DENIED";
        from?: string;
        to?: string;
    };

    type SecurityAuditVO = {
        event_id: string;
        event_type: string;
        operator_id?: string;
        target_id?: string;
        client?: string;
        ip?: string;
        user_agent?: string;
        before: Record<string, unknown>;
        after: Record<string, unknown>;
        reason?: string;
        occurred_at: string;
        result: "STARTED" | "SUCCEEDED" | "FAILED" | "DENIED";
        correlation_id?: string;
    };

    type SecurityAuditRetention = {
        policy_key: string;
        hot_retention_months: number;
        total_retention_years: number;
        archive_backend: string;
        state: string;
        version: number;
    };
}
