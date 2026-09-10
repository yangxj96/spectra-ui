export {};

declare global {
    type CacheOperationStatus = "ACCEPTED" | "SUCCEEDED" | "PARTIAL" | "FAILED" | "UNKNOWN";
    type CacheRuntimeStatus = "AVAILABLE" | "UNAVAILABLE" | "UNSUPPORTED";

    interface CacheStatistics {
        key_count?: number | null;
        hit_count?: number | null;
        miss_count?: number | null;
        hit_rate?: number | null;
        status: CacheRuntimeStatus;
    }

    interface CacheRegion {
        code: string;
        display_name: string;
        provider: string;
        mode: string;
        ttl_seconds?: number | null;
        supports_stats: boolean;
        supports_clear: boolean;
        statistics: CacheStatistics;
    }

    interface SecurityRuntime {
        status: CacheRuntimeStatus;
        online_session_count?: number | null;
        session_status: CacheRuntimeStatus;
        verification_status: CacheRuntimeStatus;
        login_failure_status: CacheRuntimeStatus;
        nonce_status: CacheRuntimeStatus;
        nonce_cutoff_epoch_second?: number | null;
        refresh_replay_status: CacheRuntimeStatus;
    }

    interface CacheMonitorOverview {
        status: CacheRuntimeStatus;
        generated_at: string;
        region_count: number;
        online_session_count?: number | null;
        issue_count: number;
        security_redis_status: CacheRuntimeStatus;
    }

    interface CacheOperation {
        operation_id?: string | null;
        operation_type: string;
        status: CacheOperationStatus;
        affected_count: number;
        broadcast_accepted: boolean;
        message: string;
        completed_at?: string | null;
    }

    interface CacheBusinessClearRequest {
        region_codes: string[];
        all_regions: boolean;
        all_instances: boolean;
        operation_id?: string;
        reason: string;
        confirmation: string;
    }

    interface SecurityVerificationClearRequest {
        type: SecurityVerificationType;
        target: string;
        clear_attempts: boolean;
        reason: string;
        confirmed: boolean;
    }

    type SecurityVerificationType = "KAPTCHA" | "LOGIN_SMS" | "LOGIN_EMAIL" | "BIND_PHONE" | "BIND_EMAIL";

    interface SecurityTargetCandidateQuery {
        keyword: string;
    }

    interface SecurityVerificationCandidateQuery extends SecurityTargetCandidateQuery {
        type: SecurityVerificationType;
    }

    interface SecurityUserCandidate {
        id: string;
        username?: string | null;
        real_name?: string | null;
        employee_no?: string | null;
    }

    interface SecurityVerificationCandidate {
        target: string;
        masked_target: string;
        user_id: string;
        username?: string | null;
        real_name?: string | null;
        employee_no?: string | null;
    }
}
