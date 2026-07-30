import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: "/monitor",
        component: () => import("@/layouts/Default/index.vue"),
        children: [
            {
                path: "task",
                name: "MonitorTask",
                component: () => import("@/views/Monitor/Task/index.vue"),
                meta: { title: "定时任务", requiresAuth: true, requiredMenu: "MonitorTask" }
            },
            {
                path: "server",
                name: "MonitorServer",
                component: () => import("@/views/Monitor/Server/index.vue"),
                meta: { title: "服务监控", requiresAuth: true, requiredMenu: "MonitorServer" }
            },
            {
                path: "online",
                name: "MonitorOnline",
                component: () => import("@/views/Monitor/Online/index.vue"),
                meta: { title: "在线用户", requiresAuth: true, requiredMenu: "MonitorOnline" }
            },
            {
                path: "cache",
                name: "MonitorCache",
                component: () => import("@/views/Monitor/Cache/index.vue"),
                meta: { title: "缓存监控", requiresAuth: true, requiredMenu: "MonitorCache" }
            }
        ]
    }
] satisfies RouteRecordRaw[];
