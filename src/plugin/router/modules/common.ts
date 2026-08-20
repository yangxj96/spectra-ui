import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: "/login",
        name: "Login",
        component: () => import("@/views/Login/index.vue"),
        meta: { title: "登录" }
    },
    {
        path: "/initialization",
        name: "SystemInitialization",
        component: () => import("@/views/Initialization/index.vue"),
        meta: { title: "系统初始化" }
    },
    {
        path: "/system-guide",
        name: "SystemGuide",
        component: () => import("@/views/SystemGuide/index.vue"),
        meta: { title: "系统设置引导", requiresAuth: true }
    },
    {
        path: "/",
        component: () => import("@/layouts/Blank/index.vue"),
        children: [
            {
                path: "",
                name: "Dashboard",
                component: () => import("@/views/Dashboard/index.vue"),
                meta: { title: "首页", requiresAuth: true, requiredMenu: "Dashboard" }
            },
            {
                path: "profile",
                name: "Profile",
                component: () => import("@/views/Profile/index.vue"),
                meta: { title: "个人中心", requiresAuth: true }
            },
            {
                path: "notification",
                name: "Notification",
                component: () => import("@/views/Notification/index.vue"),
                meta: { title: "消息中心", requiresAuth: true }
            }
        ]
    },
    {
        path: "/401",
        name: "NoAccess",
        component: () => import("@/views/Common/NoAccess/index.vue"),
        meta: { title: "无权访问", requiresAuth: true }
    },
    {
        path: "/404",
        name: "NotFound",
        component: () => import("@/views/Common/NotFound/index.vue"),
        meta: { title: "未匹配到页面", requiresAuth: true }
    },
    {
        path: "/redirect/:path*",
        name: "Redirect",
        component: () => import("@/views/Common/Redirect/index.vue"),
        meta: { title: "返回原来页面", requiresAuth: true }
    }
] satisfies RouteRecordRaw[];
