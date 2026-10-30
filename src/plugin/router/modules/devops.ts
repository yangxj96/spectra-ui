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
                component: () => import("@/views/Devops/Monitor/ApplicationHealth/index.vue"),
                meta: { title: "应用健康检查", requiresAuth: true, requiredMenu: "DevopsApplicationHealth" }
            },
            {
                path: "notification/history",
                name: "DevopsNotificationHistory",
                component: () => import("@/views/Devops/Notification/History/index.vue"),
                meta: { title: "通知历史", requiresAuth: true, requiredMenu: "DevopsNotificationHistory" }
            },
            {
                path: "notification/template",
                name: "DevopsNotificationTemplate",
                component: () => import("@/views/Devops/Notification/Template/index.vue"),
                meta: { title: "模板管理", requiresAuth: true, requiredMenu: "DevopsNotificationTemplate" }
            },
            {
                path: "notification/sms-config",
                name: "DevopsNotificationSmsConfig",
                component: () => import("@/views/Devops/Notification/SmsConfig/index.vue"),
                meta: { title: "短信配置", requiresAuth: true, requiredMenu: "DevopsNotificationSmsConfig" }
            },
            {
                path: "notification/email-config",
                name: "DevopsNotificationEmailConfig",
                component: () => import("@/views/Devops/Notification/EmailConfig/index.vue"),
                meta: { title: "邮件配置", requiresAuth: true, requiredMenu: "DevopsNotificationEmailConfig" }
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
                component: () => import("@/views/Devops/Scheduler/Execution/index.vue"),
                meta: { title: "调度执行记录", requiresAuth: true, requiredMenu: "DevopsSchedulerExecution" }
            },
            {
                path: "system-maintenance/configured",
                name: "DevopsConfigured",
                component: () => import("@/views/Devops/SystemMaintenance/Configured/index.vue"),
                meta: { title: "系统配置", requiresAuth: true, requiredMenu: "DevopsConfigured" }
            },
            {
                path: "file/upload",
                name: "DevopsFileUpload",
                component: () => import("@/views/Devops/File/Upload/index.vue"),
                meta: { title: "文件上传", requiresAuth: true, requiredMenu: "DevopsFileUpload" }
            },
            {
                path: "file/assets",
                name: "DevopsStorage",
                component: () => import("@/views/Devops/File/Assets/index.vue"),
                meta: { title: "文件资产", requiresAuth: true, requiredMenu: "DevopsStorage" }
            },
            {
                path: "file/upload-tasks",
                name: "DevopsUploadTasks",
                component: () => import("@/views/Devops/File/UploadTask/index.vue"),
                meta: { title: "上传任务", requiresAuth: true, requiredMenu: "DevopsUploadTasks" }
            },
            {
                path: "file/references",
                name: "DevopsFileReferences",
                component: () => import("@/views/Devops/File/Reference/index.vue"),
                meta: { title: "文件引用", requiresAuth: true, requiredMenu: "DevopsFileReferences" }
            },
            {
                path: "file/types",
                name: "DevopsFileTypes",
                component: () => import("@/views/Devops/File/Type/index.vue"),
                meta: { title: "文件类型策略", requiresAuth: true, requiredMenu: "DevopsFileTypes" }
            },
            {
                path: "system-maintenance/secret-management",
                name: "DevopsSecretManagement",
                component: () => import("@/views/Devops/SystemMaintenance/SecretManagement/index.vue"),
                meta: { title: "密钥管理", requiresAuth: true, requiredMenu: "DevopsSecretManagement" }
            },
            {
                path: "system-maintenance/cache-clear",
                name: "DevopsCacheClear",
                component: () => import("@/views/Devops/SystemMaintenance/CacheClear/index.vue"),
                meta: { title: "缓存清理", requiresAuth: true, requiredMenu: "DevopsCacheClear" }
            },
            {
                path: "audit-log",
                name: "DevopsAuditLog",
                component: () => import("@/views/Devops/AuditLog/index.vue"),
                meta: { title: "审计日志", requiresAuth: true, requiredMenu: "DevopsAuditLog" }
            },
            {
                path: "audit-log/detail",
                name: "DevopsAuditLogDetail",
                component: () => import("@/views/Devops/AuditLog/Detail/index.vue"),
                meta: { title: "审计日志详情", requiresAuth: true, requiredMenu: "DevopsAuditLog" }
            },
            {
                path: "security/online",
                name: "DevopsSecurityOnline",
                component: () => import("@/views/Devops/Security/Online/index.vue"),
                meta: { title: "在线用户", requiresAuth: true, requiredMenu: "DevopsSecurityOnline" }
            }
        ]
    }
] satisfies RouteRecordRaw[];
