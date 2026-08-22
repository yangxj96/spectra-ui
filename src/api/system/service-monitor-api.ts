import { get } from "@/plugin/request/api.ts";

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
    }
};
