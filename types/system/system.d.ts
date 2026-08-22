export {};

declare global {
    type ServiceMonitorStatus = "HEALTHY" | "WARNING" | "DEGRADED" | "DOWN";

    type ServiceMonitorDependency = {
        name: string;
        status: "UP" | "DOWN";
        latency_ms: number;
        message: string;
    };

    type ServiceMonitorSummary = {
        cpu_usage: number;
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
        service_name: string;
        host_name: string;
        os_name: string;
        uptime_seconds: number;
        summary: ServiceMonitorSummary;
        history: ServiceMonitorPoint[];
        dependencies: ServiceMonitorDependency[];
    };
}
