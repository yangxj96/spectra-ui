import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JsonEditor from "@/components/JsonEditor/index.vue";
import AuditLogDetailPage from "@/views/Devops/AuditLog/Detail/index.vue";

const { detail, push, routeQuery } = vi.hoisted(() => ({
    detail: vi.fn(),
    push: vi.fn(),
    routeQuery: {
        event_id: "8f8b3d80-0904-414c-9141-d5078e0c597f",
        occurred_at: "2026-09-13T03:53:16.442Z"
    }
}));

vi.mock("@/api/system/audit-log-api.ts", () => ({
    AuditLogApi: { detail }
}));

vi.mock("vue-router", () => ({
    useRoute: () => ({ query: routeQuery }),
    useRouter: () => ({ push })
}));

const auditDetail: AuditLogVO = {
    event_id: routeQuery.event_id,
    occurred_at: routeQuery.occurred_at,
    category: "OPERATION",
    event_type: "USER_PROFILE_UPDATED",
    operator_id: "user-1",
    operator_name: "张三",
    target_id: "user-2",
    client: "WEB",
    ip: "127.0.0.1",
    user_agent: "test-browser",
    http_method: "PUT",
    request_url: "/api/user/profile",
    http_status: 200,
    duration_ms: 12,
    before: {
        real_name: "旧姓名",
        status: "ACTIVE",
        custom_field: "旧值",
        removed_field: 1,
        profile: { email: "old@example.com" },
        eventId: "event-old",
        requestId: "request-old",
        occurredAt: "2026-09-12T03:00:00Z",
        url: "/old-address",
        method: "GET",
        _audit: "old-audit",
        request: "old-request"
    },
    after: {
        real_name: "新姓名",
        status: "DISABLED",
        custom_field: "新值",
        added_field: 2,
        profile: { email: "new@example.com" },
        eventId: "event-new",
        requestId: "request-new",
        occurredAt: "2026-09-13T03:00:00Z",
        url: "/new-address",
        method: "POST",
        _audit: "new-audit",
        request: "new-request"
    },
    reason: "'修改用户资料'",
    result: "SUCCEEDED",
    correlation_id: "trace-1"
};

function mountPage() {
    return mount(AuditLogDetailPage, {
        global: {
            plugins: [ElementPlus]
        }
    });
}

describe("审计日志详情页", () => {
    beforeEach(() => {
        routeQuery.event_id = auditDetail.event_id;
        routeQuery.occurred_at = auditDetail.occurred_at;
        detail.mockReset().mockResolvedValue(auditDetail);
        push.mockReset();
    });

    it("应该保留操作信息并用两个可独立滚动的只读 JSON 编辑器展示原始快照", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(detail).toHaveBeenCalledWith(auditDetail.event_id, auditDetail.occurred_at);
        const dividers = wrapper.findAll(".el-divider");
        expect(dividers.map(divider => divider.text())).toEqual(["操作信息", "变更前后快照对比"]);
        expect(wrapper.findAll(".el-card")).toHaveLength(0);
        const operationInfo = wrapper.get(".el-descriptions");
        expect(operationInfo.text()).toContain("IP 地址");
        expect(operationInfo.text()).toContain("127.0.0.1");
        expect(operationInfo.text()).toContain("操作结果");
        expect(operationInfo.text()).toContain("成功");

        expect(wrapper.text()).toContain("变更前");
        expect(wrapper.text()).toContain("变更后");
        expect(wrapper.find(".el-table").exists()).toBe(false);

        const editors = wrapper.findAllComponents(JsonEditor);
        expect(editors).toHaveLength(2);
        expect(editors[0]?.props("readOnly")).toBe(true);
        expect(editors[1]?.props("readOnly")).toBe(true);
        expect(editors[0]?.props("expandAll")).toBe(true);
        expect(editors[1]?.props("expandAll")).toBe(true);
        expect(editors[0]?.props("modelValue")).toEqual(auditDetail.before);
        expect(editors[1]?.props("modelValue")).toEqual(auditDetail.after);

        const scrollAreas = wrapper.findAll(".audit-log-detail-page__json-editor .jsoneditor-outer > .jsoneditor-tree");
        expect(scrollAreas).toHaveLength(2);
        Object.defineProperties(scrollAreas[0]!.element, {
            clientHeight: { configurable: true, value: 100 },
            scrollHeight: { configurable: true, value: 1000 }
        });
        Object.defineProperties(scrollAreas[1]!.element, {
            clientHeight: { configurable: true, value: 100 },
            scrollHeight: { configurable: true, value: 500 }
        });
        (scrollAreas[0]!.element as HTMLElement).scrollTop = 450;
        scrollAreas[0]!.element.dispatchEvent(new Event("scroll"));
        expect((scrollAreas[1]!.element as HTMLElement).scrollTop).toBe(0);

        wrapper.unmount();
    });

    it("返回按钮应该回到审计日志列表", async () => {
        const wrapper = mountPage();
        await flushPromises();

        expect(wrapper.find("h2").exists()).toBe(false);
        expect(wrapper.find(".audit-log-detail-page__toolbar").exists()).toBe(false);
        expect(wrapper.get(".audit-log-detail-page__actions").element.closest(".el-card")).toBeNull();
        expect(wrapper.get(".audit-log-detail-page").classes()).toContain("audit-log-detail-page--scrollable");

        await wrapper.get("button").trigger("click");

        expect(push).toHaveBeenCalledWith({ name: "DevopsAuditLog" });
        wrapper.unmount();
    });
});
