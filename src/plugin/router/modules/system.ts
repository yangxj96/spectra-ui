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
                path: "user/create",
                name: "SystemUserCreate",
                component: () => import("@/views/System/User/components/UserEdit/index.vue"),
                meta: {
                    title: "新增用户",
                    requiresAuth: true,
                    requiredMenu: "SystemUser",
                    activeMenu: "SystemUser"
                }
            },
            {
                path: "user/:id/edit",
                name: "SystemUserEdit",
                component: () => import("@/views/System/User/components/UserEdit/index.vue"),
                meta: {
                    title: "编辑用户",
                    requiresAuth: true,
                    requiredMenu: "SystemUser",
                    activeMenu: "SystemUser"
                }
            },
            {
                path: "user/import",
                name: "SystemUserImport",
                component: () => import("@/views/System/UserImport/index.vue"),
                meta: {
                    title: "批量导入用户",
                    requiresAuth: true,
                    requiredMenu: "SystemUser",
                    activeMenu: "SystemUser"
                }
            },
            {
                path: "roles",
                name: "SystemRoleManagement",
                component: () => import("@/views/System/RBAC/index.vue"),
                meta: { title: "角色管理", requiresAuth: true, requiredMenu: "SystemRoleManagement" }
            },
            {
                path: "roles/create",
                name: "SystemRoleCreate",
                component: () => import("@/views/System/RBAC/components/RoleEdit/index.vue"),
                meta: {
                    title: "新增角色",
                    requiresAuth: true,
                    requiredMenu: "SystemRoleManagement",
                    activeMenu: "SystemRoleManagement"
                }
            },
            {
                path: "roles/:id/edit",
                name: "SystemRoleEdit",
                component: () => import("@/views/System/RBAC/components/RoleEdit/index.vue"),
                meta: {
                    title: "编辑角色",
                    requiresAuth: true,
                    requiredMenu: "SystemRoleManagement",
                    activeMenu: "SystemRoleManagement"
                }
            },
            {
                path: "authorization-profiles",
                name: "SystemAuthorizationProfiles",
                component: () => import("@/views/System/AuthorizationProfile/index.vue"),
                meta: {
                    title: "授权方案",
                    requiresAuth: true,
                    requiredMenu: "SystemAuthorizationProfiles",
                    activeMenu: "SystemAuthorizationProfiles"
                }
            },
            {
                path: "authorization-profiles/create",
                name: "SystemAuthorizationProfileCreate",
                component: () =>
                    import("@/views/System/AuthorizationProfile/components/AuthorizationProfileEdit/index.vue"),
                meta: {
                    title: "新建授权方案",
                    requiresAuth: true,
                    requiredMenu: "SystemAuthorizationProfiles",
                    activeMenu: "SystemAuthorizationProfiles"
                }
            },
            {
                path: "authorization-profiles/:id/edit",
                name: "SystemAuthorizationProfileEdit",
                component: () =>
                    import("@/views/System/AuthorizationProfile/components/AuthorizationProfileEdit/index.vue"),
                meta: {
                    title: "编辑授权方案",
                    requiresAuth: true,
                    requiredMenu: "SystemAuthorizationProfiles",
                    activeMenu: "SystemAuthorizationProfiles"
                }
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
