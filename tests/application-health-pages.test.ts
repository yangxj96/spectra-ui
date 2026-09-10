import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("应用健康检查页面", () => {
    it("应该使用服务监控健康聚合接口而不是继续展示占位页", () => {
        const route = source("src/plugin/router/modules/devops.ts");
        const page = source("src/views/Devops/Monitor/ApplicationHealth/index.vue");
        const routeStart = route.indexOf('path: "monitor/application-health"');
        const routeEnd = route.indexOf("},", routeStart) + 2;
        const applicationRoute = route.slice(routeStart, routeEnd);

        expect(applicationRoute).toContain('path: "monitor/application-health"');
        expect(applicationRoute).toContain(
            'component: () => import("@/views/Devops/Monitor/ApplicationHealth/index.vue")'
        );
        expect(applicationRoute).not.toContain('component: () => import("@/views/Devops/Placeholder/index.vue")');
        expect(page).toContain("ServiceMonitorApi.getOverview");
    });

    it("应该展示总体状态、应用存活、依赖就绪和运行信息", () => {
        const page = source("src/views/Devops/Monitor/ApplicationHealth/index.vue");

        expect(page).toContain("应用健康检查");
        expect(page).toContain("应用存活状态");
        expect(page).toContain("依赖就绪状态");
        expect(page).toContain("应用运行信息");
        expect(page).toContain("health_components");
        expect(page).toContain("dependencies");
        expect(page).toContain("data_freshness");
        expect(page).toContain("statusText");
    });

    it("应该将健康状态和数据新鲜度转换为中文", () => {
        const page = source("src/views/Devops/Monitor/ApplicationHealth/index.vue");

        expect(page).toContain('HEALTHY: "正常"');
        expect(page).toContain('WARNING: "警告"');
        expect(page).toContain('DEGRADED: "降级"');
        expect(page).toContain('DOWN: "不可用"');
        expect(page).toContain('CURRENT: "数据正常"');
        expect(page).toContain('STALE: "数据过期"');
        expect(page).not.toContain("{{ overview.status }}");
    });

    it("应该保留自动刷新并在页面卸载时清理轮询", () => {
        const page = source("src/views/Devops/Monitor/ApplicationHealth/index.vue");

        expect(page).toContain("setInterval");
        expect(page).toContain("onUnmounted");
        expect(page).toContain("clearInterval");
        expect(page).toContain("刷新");
        expect(page).toContain("不展示连接串、凭据或安全数据原文");
    });

    it("顶部只保留刷新操作并让主体使用固定高度布局", () => {
        const page = source("src/views/Devops/Monitor/ApplicationHealth/index.vue");

        expect(page).not.toContain("<h2>应用健康检查</h2>");
        expect(page).not.toContain("检查应用实例和业务依赖是否具备正常提供服务的条件。");
        expect(page).toContain('class="health-toolbar"');
        expect(page).toContain('class="health-body"');
        expect(page).toContain("overflow: hidden");
        expect(page).toContain("min-height: 0");
    });
});
