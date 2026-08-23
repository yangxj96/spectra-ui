import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: "/devops",
        component: () => import("@/layouts/Default/index.vue"),
        children: [
            {
                path: "monitor/server",
                name: "DevopsMonitorServer",
                component: () => import("@/views/Devops/Monitor/Server/index.vue"),
                meta: { title: "服务监控", requiresAuth: true, requiredMenu: "DevopsMonitorServer" }
            },
            {
                path: "monitor/cache",
                name: "DevopsMonitorCache",
                component: () => import("@/views/Devops/Monitor/Cache/index.vue"),
                meta: { title: "缓存监控", requiresAuth: true, requiredMenu: "DevopsMonitorCache" }
            },
            {
                path: "monitor/application-health",
                name: "DevopsApplicationHealth",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "应用健康检查", requiresAuth: true, requiredMenu: "DevopsApplicationHealth" }
            },
            {
                path: "notification/overview",
                name: "DevopsNotificationOverview",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "通知运行概览", requiresAuth: true, requiredMenu: "DevopsNotificationOverview" }
            },
            {
                path: "notification/request",
                name: "DevopsNotificationRequest",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "通知请求", requiresAuth: true, requiredMenu: "DevopsNotificationRequest" }
            },
            {
                path: "notification/delivery-task",
                name: "DevopsNotificationDeliveryTask",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "投递任务", requiresAuth: true, requiredMenu: "DevopsNotificationDeliveryTask" }
            },
            {
                path: "notification/delivery-record",
                name: "DevopsNotificationDeliveryRecord",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "投递记录", requiresAuth: true, requiredMenu: "DevopsNotificationDeliveryRecord" }
            },
            {
                path: "notification/template",
                name: "DevopsNotificationTemplate",
                component: () => import("@/views/Devops/Notification/Template/index.vue"),
                meta: { title: "模板管理", requiresAuth: true, requiredMenu: "DevopsNotificationTemplate" }
            },
            {
                path: "scheduler/task",
                name: "DevopsSchedulerTask",
                component: () => import("@/views/Devops/Scheduler/Task/index.vue"),
                meta: { title: "定时任务", requiresAuth: true, requiredMenu: "DevopsSchedulerTask" }
            },
            {
                path: "scheduler/execution",
                name: "DevopsSchedulerExecution",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "调度执行记录", requiresAuth: true, requiredMenu: "DevopsSchedulerExecution" }
            },
            {
                path: "system-maintenance/configured",
                name: "DevopsConfigured",
                component: () => import("@/views/Devops/SystemMaintenance/Configured/index.vue"),
                meta: { title: "系统配置", requiresAuth: true, requiredMenu: "DevopsConfigured" }
            },
            {
                path: "system-maintenance/storage",
                name: "DevopsStorage",
                component: () => import("@/views/Devops/SystemMaintenance/Storage/index.vue"),
                meta: { title: "文件管理", requiresAuth: true, requiredMenu: "DevopsStorage" }
            },
            {
                path: "system-maintenance/encryption-key",
                name: "DevopsEncryptionKey",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "加密密钥", requiresAuth: true, requiredMenu: "DevopsEncryptionKey" }
            },
            {
                path: "system-maintenance/cache-clear",
                name: "DevopsCacheClear",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "缓存清理", requiresAuth: true, requiredMenu: "DevopsCacheClear" }
            },
            {
                path: "security/context",
                name: "DevopsSecurityContext",
                component: () => import("@/views/Devops/Security/Context/index.vue"),
                meta: { title: "安全上下文", requiresAuth: true, requiredMenu: "DevopsSecurityContext" }
            },
            {
                path: "security/audit",
                name: "DevopsSecurityAudit",
                component: () => import("@/views/Devops/Security/Audit/index.vue"),
                meta: { title: "安全审计", requiresAuth: true, requiredMenu: "DevopsSecurityAudit" }
            },
            {
                path: "security/online",
                name: "DevopsSecurityOnline",
                component: () => import("@/views/Devops/Security/Online/index.vue"),
                meta: { title: "在线用户", requiresAuth: true, requiredMenu: "DevopsSecurityOnline" }
            },
            {
                path: "security/operation-log",
                name: "DevopsOperationLog",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "操作日志", requiresAuth: true, requiredMenu: "DevopsOperationLog" }
            },
            {
                path: "security/security-event",
                name: "DevopsSecurityEvent",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "安全事件", requiresAuth: true, requiredMenu: "DevopsSecurityEvent" }
            },
            {
                path: "security/session-kick",
                name: "DevopsSessionKick",
                component: () => import("@/views/Devops/Placeholder/index.vue"),
                meta: { title: "会话踢出", requiresAuth: true, requiredMenu: "DevopsSessionKick" }
            }
        ]
    }
] satisfies RouteRecordRaw[];
