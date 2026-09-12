import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AuditLogPage from "@/views/Devops/AuditLog/index.vue";

const { page, detail, push } = vi.hoisted(() => ({ page: vi.fn(), detail: vi.fn(), push: vi.fn() }));

vi.mock("@/api/system/audit-log-api.ts", () => ({
    AuditLogApi: {
        page,
        detail,
        export: vi.fn()
    }
}));

vi.mock("vue-router", () => ({
    useRouter: () => ({ push })
}));

const operatorId = "e6115b6b-93b4-4d44-8ab3-6c1fd99a7c29";

const auditRow = {
    event_id: "8f8b3d80-0904-414c-9141-d5078e0c597f",
    occurred_at: "2026-09-13T03:53:16.442Z",
    category: "OPERATION",
    event_type: "AUDIT_LOG_PAGE_VIEWED",
    operator_id: operatorId,
    operator_name: "张三",
    target_id: undefined,
    client: "WEB",
    ip: "127.0.0.1",
    user_agent: "test",
    http_method: "GET",
    request_url: "/api/audit/page",
    http_status: 200,
    duration_ms: 5,
    before: {},
    after: {},
    reason: "'分页查询审计日志'",
    result: "SUCCEEDED",
    failure_code: undefined,
    failure_type: undefined,
    failure_reason: undefined,
    correlation_id: undefined
};

describe("统一审计日志页面", () => {
    beforeEach(() => {
        page.mockReset().mockResolvedValue({ records: [auditRow], total: 1, current: 1, size: 15 });
        detail.mockReset().mockResolvedValue(auditRow);
        push.mockReset();
    });

    it("应该显示操作人姓名和 @Audit 描述，并保留操作人 ID", async () => {
        const wrapper = mount(AuditLogPage, {
            global: {
                plugins: [ElementPlus],
                directives: { permission: () => undefined }
            }
        });
        await flushPromises();

        const table = wrapper.get(".el-table");
        expect(table.text()).toContain("张三");
        expect(table.text()).toContain(operatorId);
        expect(table.text()).toContain("分页查询审计日志");
        expect(table.text()).not.toContain("AUDIT_LOG_PAGE_VIEWED");
        expect(table.find(".el-table__header-wrapper").text()).toContain("操作人");
        expect(table.find(".el-table__header-wrapper").text()).toContain("姓名");
        wrapper.unmount();
    });

    it("详情按钮应该携带 event_id 和 occurred_at 跳转到详情页", async () => {
        const wrapper = mount(AuditLogPage, {
            global: {
                plugins: [ElementPlus],
                directives: { permission: () => undefined }
            }
        });
        await flushPromises();

        const detailButton = wrapper.findAll("button").find(button => button.text().trim() === "详情");
        expect(detailButton).toBeDefined();
        await detailButton!.trigger("click");
        await flushPromises();

        expect(push).toHaveBeenCalledWith({
            name: "DevopsAuditLogDetail",
            query: { event_id: auditRow.event_id, occurred_at: auditRow.occurred_at }
        });

        wrapper.unmount();
    });

    it("操作人搜索框应该把输入值作为统一 operator 条件提交", async () => {
        const wrapper = mount(AuditLogPage, {
            global: {
                plugins: [ElementPlus],
                directives: { permission: () => undefined }
            }
        });
        await flushPromises();

        const operatorInput = wrapper
            .findAll("input")
            .find(input => input.attributes("placeholder") === "输入用户 ID 或姓名");
        const eventTypeInput = wrapper
            .findAll("input")
            .find(input => input.attributes("placeholder") === "如 USER_PROFILE_UPDATED 或操作说明");
        expect(operatorInput).toBeDefined();
        expect(eventTypeInput).toBeDefined();
        await operatorInput!.setValue("张三");
        await eventTypeInput!.setValue("分页查询审计日志");
        const queryButton = wrapper.findAll("button").find(button => button.text().trim() === "查询");
        expect(queryButton).toBeDefined();
        await queryButton!.trigger("click");
        await flushPromises();

        expect(page).toHaveBeenLastCalledWith(
            expect.objectContaining({ operator: "张三", event_type: "分页查询审计日志" })
        );
        wrapper.unmount();
    });
});
