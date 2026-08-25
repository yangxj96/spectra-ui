import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: "/exampl",
        component: () => import("@/layouts/Default/index.vue"),
        children: [
            {
                path: "form",
                name: "ExampleForm",
                component: () => import("@/views/Example/Form/index.vue"),
                meta: { title: "表单示例", requiresAuth: true, requiredMenu: "ExampleForm" }
            },
            {
                path: "table",
                name: "ExampleTable",
                component: () => import("@/views/Example/Table/index.vue"),
                meta: { title: "列表示例", requiresAuth: true, requiredMenu: "ExampleTable" }
            },
            {
                path: "echarts",
                name: "ExampleEcharts",
                component: () => import("@/views/Example/Echarts/index.vue"),
                meta: { title: "图表示例", requiresAuth: true, requiredMenu: "ExampleEcharts" }
            }
        ]
    }
] satisfies RouteRecordRaw[];
