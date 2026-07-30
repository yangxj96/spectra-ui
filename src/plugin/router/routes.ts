import commonRoutes from "@/plugin/router/modules/common.ts";
import exampleRoutes from "@/plugin/router/modules/example.ts";
import monitorRoutes from "@/plugin/router/modules/monitor.ts";
import oaRoutes from "@/plugin/router/modules/oa.ts";
import systemRoutes from "@/plugin/router/modules/system.ts";

import type { RouteRecordRaw } from "vue-router";

/**
 * 静态路由表
 * 页面路由由前端注册，菜单 API 仅决定导航展示和菜单访问权限
 */
export default [
    ...commonRoutes,
    ...systemRoutes,
    ...monitorRoutes,
    ...oaRoutes,
    ...exampleRoutes,
    {
        path: "/:pathMatch(.*)*",
        redirect: "/404"
    }
] as RouteRecordRaw[];
