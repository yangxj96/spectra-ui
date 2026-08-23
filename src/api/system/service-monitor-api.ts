import { download, get, post, put } from "@/plugin/request/api.ts";

/**
 * 服务器信息相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2025-11-11 15:00:00
 */
export const ServiceMonitorApi = {
    /**
     * 获取服务监控总览
     */
    getOverview(
        options?: Pick<RequestOptions<"/api/service/monitor/overview">, "loading">
    ): Promise<ServiceMonitorOverview> {
        return get<ServiceMonitorOverview>("/api/service/monitor/overview", undefined, options);
    },

    /**
     * 获取服务监控历史趋势
     */
    getHistory(
        range: ServiceMonitorHistoryRange,
        options?: Pick<RequestOptions<"/api/service/monitor/history">, "loading">
    ): Promise<ServiceMonitorHistory> {
        return get<ServiceMonitorHistory>("/api/service/monitor/history", { range }, options);
    },

    getAlertSummary(options?: Pick<RequestOptions<"/api/service/monitor/alerts/summary">, "loading">) {
        return get<ServiceMonitorAlertSummary>("/api/service/monitor/alerts/summary", undefined, options);
    },

    getAlertRules(options?: Pick<RequestOptions<"/api/service/monitor/alerts/rules">, "loading">) {
        return get<ServiceMonitorAlertRule[]>("/api/service/monitor/alerts/rules", undefined, options);
    },

    updateAlertRule(
        id: string,
        data: Partial<ServiceMonitorAlertRule> & { expected_version: number },
        options?: Pick<RequestOptions<"/api/service/monitor/alerts/rules/{id}">, "loading">
    ) {
        return put<void, "/api/service/monitor/alerts/rules/{id}">("/api/service/monitor/alerts/rules/{id}", data, {
            ...options,
            pathParams: { id },
            noBody: true
        });
    },

    getAlertEvents(activeOnly = true, options?: Pick<RequestOptions<"/api/service/monitor/alerts/events">, "loading">) {
        return get<ServiceMonitorAlertEvent[]>("/api/service/monitor/alerts/events", { activeOnly }, options);
    },

    getRuntimeDiagnostic(options?: Pick<RequestOptions<"/api/service/monitor/diagnostics/runtime">, "loading">) {
        return get<ServiceMonitorRuntimeDiagnostic>("/api/service/monitor/diagnostics/runtime", undefined, options);
    },

    createDiagnosticTask(
        taskType: "THREAD_DUMP" | "HEAP_DUMP",
        confirm: boolean,
        options?: Pick<RequestOptions<"/api/service/monitor/diagnostics/tasks">, "loading">
    ) {
        return post<ServiceMonitorDiagnosticTask>(
            "/api/service/monitor/diagnostics/tasks",
            { task_type: taskType, confirm },
            options
        );
    },

    getDiagnosticTasks(options?: Pick<RequestOptions<"/api/service/monitor/diagnostics/tasks">, "loading">) {
        return get<ServiceMonitorDiagnosticTask[]>("/api/service/monitor/diagnostics/tasks", undefined, options);
    },

    getDiagnosticTask(
        id: string,
        options?: Pick<RequestOptions<"/api/service/monitor/diagnostics/tasks/{id}">, "loading">
    ) {
        return get<ServiceMonitorDiagnosticTask, "/api/service/monitor/diagnostics/tasks/{id}">(
            "/api/service/monitor/diagnostics/tasks/{id}",
            undefined,
            { ...options, pathParams: { id } }
        );
    },

    async downloadDiagnosticTask(id: string): Promise<void> {
        await download<"/api/service/monitor/diagnostics/tasks/{id}/download">(
            "/api/service/monitor/diagnostics/tasks/{id}/download",
            { pathParams: { id } }
        );
    }
};
