import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: "/oa",
        component: () => import("@/layouts/Default/index.vue"),
        children: [
            {
                path: "asset",
                name: "OAAsset",
                component: () => import("@/views/OA/Asset/index.vue"),
                meta: { title: "资产管理", requiresAuth: true, requiredMenu: "OAAsset" }
            },
            {
                path: "attendance",
                name: "OAAttendance",
                component: () => import("@/views/OA/Attendance/index.vue"),
                meta: { title: "考勤管理", requiresAuth: true, requiredMenu: "OAAttendance" }
            },
            {
                path: "leave",
                name: "OALeave",
                component: () => import("@/views/OA/Leave/index.vue"),
                meta: { title: "请假申请", requiresAuth: true, requiredMenu: "OALeave" }
            },
            {
                path: "calendar",
                name: "OACalendar",
                component: () => import("@/views/OA/Calendar/index.vue"),
                meta: { title: "日历管理", requiresAuth: true, requiredMenu: "OACalendar" }
            },
            {
                path: "contact",
                name: "OAContact",
                component: () => import("@/views/OA/Contact/index.vue"),
                meta: { title: "通讯录", requiresAuth: true, requiredMenu: "OAContact" }
            },
            {
                path: "contract",
                name: "OAContract",
                component: () => import("@/views/OA/Contract/index.vue"),
                meta: { title: "合同管理", requiresAuth: true, requiredMenu: "OAContract" }
            },
            {
                path: "document",
                name: "OADocument",
                component: () => import("@/views/OA/Document/index.vue"),
                meta: { title: "文档管理", requiresAuth: true, requiredMenu: "OADocument" }
            },
            {
                path: "meeting",
                name: "OAMeeting",
                component: () => import("@/views/OA/Meeting/index.vue"),
                meta: { title: "会议管理", requiresAuth: true, requiredMenu: "OAMeeting" }
            },
            {
                path: "notice",
                name: "OANotice",
                component: () => import("@/views/OA/Notice/index.vue"),
                meta: { title: "公告通知", requiresAuth: true, requiredMenu: "OANotice" }
            },
            {
                path: "report",
                name: "OAReport",
                component: () => import("@/views/OA/Report/index.vue"),
                meta: { title: "报表管理", requiresAuth: true, requiredMenu: "OAReport" }
            }
        ]
    }
] satisfies RouteRecordRaw[];
