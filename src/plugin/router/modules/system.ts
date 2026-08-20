import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: "/system",
        component: () => import("@/layouts/Default/index.vue"),
        children: [
            {
                path: "user",
                name: "SystemUser",
                component: () => import("@/views/System/User/index.vue"),
                meta: { title: "用户管理", requiresAuth: true, requiredMenu: "SystemUser" }
            },
            {
                path: "RBAC",
                name: "SystemRBAC",
                component: () => import("@/views/System/RBAC/index.vue"),
                meta: { title: "访问控制", requiresAuth: true, requiredMenu: "SystemRBAC" }
            },
            {
                path: "dept",
                name: "SystemDept",
                component: () => import("@/views/System/Dept/index.vue"),
                meta: { title: "部门管理", requiresAuth: true, requiredMenu: "SystemDept" }
            },
            {
                path: "dict",
                name: "SystemDict",
                component: () => import("@/views/System/Dict/index.vue"),
                meta: { title: "字典管理", requiresAuth: true, requiredMenu: "SystemDict" }
            },
            {
                path: "menu",
                name: "SystemMenu",
                component: () => import("@/views/System/Menu/index.vue"),
                meta: { title: "菜单管理", requiresAuth: true, requiredMenu: "SystemMenu" }
            },
            {
                path: "workflow",
                name: "SystemWorkflow",
                component: () => import("@/views/System/Workflow/index.vue"),
                meta: { title: "流程管理", requiresAuth: true, requiredMenu: "SystemWorkflow" }
            },
            {
                path: "region",
                name: "SystemRegion",
                component: () => import("@/views/System/Region/index.vue"),
                meta: { title: "行政区划", requiresAuth: true, requiredMenu: "SystemRegion" }
            },
            {
                path: "flow-edit",
                name: "WorkflowEdit",
                component: () => import("@/views/System/Workflow/components/WorkflowDesigner/index.vue"),
                meta: {
                    title: "流程编辑",
                    requiresAuth: true,
                    requiredMenu: "SystemWorkflow",
                    activeMenu: "SystemWorkflow"
                }
            },
            {
                path: "form-edit",
                name: "FormEdit",
                component: () => import("@/views/System/Workflow/components/FormDesigner/index.vue"),
                meta: {
                    title: "表单编辑",
                    requiresAuth: true,
                    requiredMenu: "SystemWorkflow",
                    activeMenu: "SystemWorkflow"
                }
            },
            {
                path: "form-preview",
                name: "FormPreview",
                component: () => import("@/views/System/Workflow/components/FormPreview/index.vue"),
                meta: {
                    title: "表单预览",
                    requiresAuth: true,
                    requiredMenu: "SystemWorkflow",
                    activeMenu: "SystemWorkflow"
                }
            }
        ]
    }
] satisfies RouteRecordRaw[];
