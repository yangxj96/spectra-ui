import { type RouteRecordRaw } from "vue-router";

/**
 * 静态路由表（无需权限）
 * 包含登录、404、401、重定向等公共页面
 * 动态路由由菜单 API 返回后在路由守卫中注册
 */
export default [
    {
        path: "/login",
        name: "login",
        component: () => import("@/views/Login/index.vue"),
        meta: {
            title: "登录"
        }
    },
    {
        path: "/404",
        name: "no_matching",
        component: () => import("@/views/Common/NotFound/index.vue"),
        meta: {
            title: "未匹配到页面"
        }
    },
    {
        path: "/401",
        name: "no_access",
        component: () => import("@/views/Common/NoAccess/index.vue"),
        meta: {
            title: "无权访问"
        }
    },
    {
        path: "/redirect/:path*",
        name: "redirect",
        component: () => import("@/views/Common/Redirect/index.vue"),
        meta: {
            title: "返回原来页面"
        }
    }
] as Array<RouteRecordRaw>;
