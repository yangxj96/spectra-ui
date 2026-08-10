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
                path: "asset/create",
                name: "OAAssetCreate",
                component: () => import("@/views/OA/Asset/components/AssetCreate/index.vue"),
                meta: {
                    title: "新建资产",
                    requiresAuth: true,
                    requiredMenu: "OAAsset",
                    activeMenu: "OAAsset"
                }
            },
            {
                path: "asset/from-purchase",
                name: "OAAssetFromPurchase",
                component: () => import("@/views/OA/Asset/components/AssetFromPurchase/index.vue"),
                meta: {
                    title: "采购收货转资产",
                    requiresAuth: true,
                    requiredMenu: "OAAsset",
                    activeMenu: "OAAsset"
                }
            },
            {
                path: "supply",
                name: "OASupply",
                component: () => import("@/views/OA/Supply/index.vue"),
                meta: { title: "办公用品", requiresAuth: true, requiredMenu: "OASupply" }
            },
            {
                path: "supply/create",
                name: "OASupplyCreate",
                component: () => import("@/views/OA/Supply/components/SupplyCreate/index.vue"),
                meta: {
                    title: "新建办公用品",
                    requiresAuth: true,
                    requiredMenu: "OASupply",
                    activeMenu: "OASupply"
                }
            },
            {
                path: "leave",
                name: "OALeave",
                component: () => import("@/views/OA/Leave/index.vue"),
                meta: { title: "请假申请", requiresAuth: true, requiredMenu: "OALeave" }
            },
            {
                path: "leave/edit",
                name: "OALeaveEdit",
                component: () => import("@/views/OA/Leave/components/LeaveEdit/index.vue"),
                meta: {
                    title: "请假申请",
                    requiresAuth: true,
                    requiredMenu: "OALeave",
                    activeMenu: "OALeave"
                }
            },
            {
                path: "application-types",
                name: "OAApplicationTypes",
                component: () => import("@/views/OA/ApplicationType/index.vue"),
                meta: { title: "申请类型", requiresAuth: true, requiredMenu: "OAApplicationTypes" }
            },
            {
                path: "application-types/edit",
                name: "OAApplicationTypeEdit",
                component: () => import("@/views/OA/ApplicationType/components/ApplicationTypeEdit/index.vue"),
                meta: {
                    title: "申请类型",
                    requiresAuth: true,
                    requiredMenu: "OAApplicationTypes",
                    activeMenu: "OAApplicationTypes"
                }
            },
            {
                path: "approval",
                name: "OAApproval",
                component: () => import("@/views/OA/Approval/index.vue"),
                meta: { title: "审批中心", requiresAuth: true, requiredMenu: "OAApproval" }
            },
            {
                path: "approval/finance/reimbursement",
                name: "OAApprovalReimbursement",
                component: () => import("@/views/OA/Approval/index.vue"),
                meta: {
                    title: "费用报销审批",
                    requiresAuth: true,
                    requiredMenu: "OAApprovalReimbursement",
                    approvalProcessKey: "oa_reimbursement_approval"
                }
            },
            {
                path: "approval/asset/purchase",
                name: "OAApprovalPurchase",
                component: () => import("@/views/OA/Approval/index.vue"),
                meta: {
                    title: "采购申请审批",
                    requiresAuth: true,
                    requiredMenu: "OAApprovalPurchase",
                    approvalProcessKey: "oa_purchase_approval"
                }
            },
            {
                path: "approval/hr/leave",
                name: "OAApprovalLeave",
                component: () => import("@/views/OA/Approval/index.vue"),
                meta: {
                    title: "请假审批",
                    requiresAuth: true,
                    requiredMenu: "OAApprovalLeave",
                    approvalProcessKey: "oa_leave_approval"
                }
            },
            {
                path: "reimbursement",
                name: "OAReimbursement",
                component: () => import("@/views/OA/Reimbursement/index.vue"),
                meta: { title: "费用报销", requiresAuth: true, requiredMenu: "OAReimbursement" }
            },
            {
                path: "reimbursement/edit",
                name: "OAReimbursementEdit",
                component: () => import("@/views/OA/Reimbursement/components/ReimbursementEdit/index.vue"),
                meta: {
                    title: "费用报销",
                    requiresAuth: true,
                    requiredMenu: "OAReimbursement",
                    activeMenu: "OAReimbursement"
                }
            },
            {
                path: "purchase",
                name: "OAPurchase",
                component: () => import("@/views/OA/Purchase/index.vue"),
                meta: { title: "采购申请", requiresAuth: true, requiredMenu: "OAPurchase" }
            },
            {
                path: "purchase/edit",
                name: "OAPurchaseEdit",
                component: () => import("@/views/OA/Purchase/components/PurchaseEdit/index.vue"),
                meta: {
                    title: "采购申请",
                    requiresAuth: true,
                    requiredMenu: "OAPurchase",
                    activeMenu: "OAPurchase"
                }
            },
            {
                path: "calendar",
                name: "OACalendar",
                component: () => import("@/views/OA/Calendar/index.vue"),
                meta: { title: "日历管理", requiresAuth: true, requiredMenu: "OACalendar" }
            },
            {
                path: "calendar/create",
                name: "OACalendarCreate",
                component: () => import("@/views/OA/Calendar/components/CalendarCreate/index.vue"),
                meta: {
                    title: "新建日程",
                    requiresAuth: true,
                    requiredMenu: "OACalendar",
                    activeMenu: "OACalendar"
                }
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
                path: "contract/edit",
                name: "OAContractEdit",
                component: () => import("@/views/OA/Contract/components/ContractEdit/index.vue"),
                meta: {
                    title: "合同管理",
                    requiresAuth: true,
                    requiredMenu: "OAContract",
                    activeMenu: "OAContract"
                }
            },
            {
                path: "contract/milestone/create",
                name: "OAContractMilestoneCreate",
                component: () => import("@/views/OA/Contract/components/ContractMilestoneCreate/index.vue"),
                meta: {
                    title: "新增履约节点",
                    requiresAuth: true,
                    requiredMenu: "OAContract",
                    activeMenu: "OAContract"
                }
            },
            {
                path: "document",
                name: "OADocument",
                component: () => import("@/views/OA/Document/index.vue"),
                meta: { title: "文档管理", requiresAuth: true, requiredMenu: "OADocument" }
            },
            {
                path: "document/edit",
                name: "OADocumentEdit",
                component: () => import("@/views/OA/Document/components/DocumentEdit/index.vue"),
                meta: {
                    title: "文档管理",
                    requiresAuth: true,
                    requiredMenu: "OADocument",
                    activeMenu: "OADocument"
                }
            },
            {
                path: "document/folder/create",
                name: "OADocumentFolderCreate",
                component: () => import("@/views/OA/Document/components/DocumentFolderCreate/index.vue"),
                meta: {
                    title: "新建文档目录",
                    requiresAuth: true,
                    requiredMenu: "OADocument",
                    activeMenu: "OADocument"
                }
            },
            {
                path: "meeting",
                name: "OAMeeting",
                component: () => import("@/views/OA/Meeting/index.vue"),
                meta: { title: "会议管理", requiresAuth: true, requiredMenu: "OAMeeting" }
            },
            {
                path: "meeting/create",
                name: "OAMeetingCreate",
                component: () => import("@/views/OA/Meeting/components/MeetingCreate/index.vue"),
                meta: {
                    title: "新建会议",
                    requiresAuth: true,
                    requiredMenu: "OAMeeting",
                    activeMenu: "OAMeeting"
                }
            },
            {
                path: "notice",
                name: "OANotice",
                component: () => import("@/views/OA/Notice/index.vue"),
                meta: { title: "公告通知", requiresAuth: true, requiredMenu: "OANotice" }
            },
            {
                path: "notice/create",
                name: "OANoticeCreate",
                component: () => import("@/views/OA/Notice/components/NoticeCreate/index.vue"),
                meta: {
                    title: "发布公告",
                    requiresAuth: true,
                    requiredMenu: "OANotice",
                    activeMenu: "OANotice"
                }
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
