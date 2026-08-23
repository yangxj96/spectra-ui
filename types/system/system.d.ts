export {};

declare global {
    type ServiceMonitorStatus = "HEALTHY" | "WARNING" | "DEGRADED" | "DOWN";

    type ServiceMonitorDataFreshness = "CURRENT" | "DELAYED" | "STALE" | "UNAVAILABLE";

    type ServiceMonitorHistoryRange = "30m" | "6h" | "24h";

    type ServiceMonitorDependency = {
        name: string;
        status: "UP" | "DOWN";
        latency_ms: number;
        message: string;
    };

    type ServiceMonitorHealthComponent = {
        name: string;
        status: "UP" | "DOWN" | "OUT_OF_SERVICE" | "UNKNOWN";
        message: string;
        checked_at: string;
    };

    type ServiceMonitorSummary = {
        cpu_usage: number;
        cpu_logical_cores: number;
        system_memory_usage: number;
        system_memory_total_bytes: number;
        system_memory_used_bytes: number;
        system_memory_available_bytes: number;
        jvm_heap_usage: number;
        jvm_heap_used_bytes: number;
        jvm_heap_max_bytes: number;
        jvm_non_heap_used_bytes: number;
        live_thread_count: number;
        peak_thread_count: number;
        gc_count: number;
        qps: number;
        error_rate: number;
        p95_response_ms: number;
        request_metrics_available: boolean;
    };

    type ServiceMonitorPoint = {
        collected_at: string;
        cpu_usage: number;
        system_memory_usage: number;
        jvm_heap_usage: number;
        live_thread_count: number;
        gc_count: number;
        qps: number;
        error_rate: number;
        p95_response_ms: number;
    };

    type ServiceMonitorOverview = {
        collected_at: string;
        status: ServiceMonitorStatus;
        status_message: string;
        data_freshness: ServiceMonitorDataFreshness;
        data_age_seconds: number;
        service_name: string;
        host_name: string;
        os_name: string;
        uptime_seconds: number;
        summary: ServiceMonitorSummary;
        history: ServiceMonitorPoint[];
        dependencies: ServiceMonitorDependency[];
        health_components: ServiceMonitorHealthComponent[];
        health_check_latency_ms: number;
    };

    type ServiceMonitorHistory = {
        range: ServiceMonitorHistoryRange;
        from: string;
        to: string;
        points: ServiceMonitorPoint[];
    };

    type ServiceMonitorAlertRule = {
        id: string;
        code: string;
        name: string;
        metric_code: string;
        metric_label: string;
        operator_code: "GTE" | "GT" | "LTE" | "LT" | "EQ" | "NE";
        threshold_value?: number;
        expected_value?: string;
        severity: "WARNING" | "CRITICAL";
        enabled: boolean;
        consecutive_failures: number;
        cooldown_seconds: number;
        remark?: string;
        version: number;
        updated_at?: string;
    };

    type ServiceMonitorAlertEvent = {
        id: string;
        rule_id: string;
        rule_code: string;
        rule_name: string;
        metric_code: string;
        severity: "WARNING" | "CRITICAL";
        state: "ACTIVE" | "RECOVERED";
        current_value?: string;
        threshold_value?: number;
        expected_value?: string;
        message: string;
        first_occurred_at: string;
        last_occurred_at: string;
        recovered_at?: string;
        occurrence_count: number;
        last_notified_at?: string;
    };

    type ServiceMonitorAlertSummary = {
        active_count: number;
        warning_count: number;
        critical_count: number;
        recovered_today_count: number;
    };

    type ServiceMonitorRuntimeDiagnostic = {
        generated_at: string;
        memory_pools: Array<{
            name: string;
            used_bytes: number;
            committed_bytes: number;
            max_bytes: number;
            usage: number;
        }>;
        garbage_collectors: Array<{
            name: string;
            collection_count: number;
            collection_time_ms: number;
        }>;
        thread_states: Array<{ state: string; count: number }>;
        connection_pool?: {
            name: string;
            status: string;
            active?: number;
            idle?: number;
            total?: number;
            maximum?: number;
        };
        redis?: { status: string; latency_ms: number };
        slow_endpoints: Array<{
            method: string;
            uri: string;
            status: string;
            count: number;
            p95_response_ms: number;
        }>;
    };

    type ServiceMonitorDiagnosticTask = {
        id: string;
        task_type: "THREAD_DUMP" | "HEAP_DUMP";
        status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED" | "EXPIRED";
        display_name: string;
        file_size?: number;
        error_message?: string;
        requested_at: string;
        started_at?: string;
        completed_at?: string;
        expires_at: string;
    };
}
