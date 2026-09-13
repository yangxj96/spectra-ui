import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { beforeEach, describe, expect, it, vi } from "vitest";

import OnlineUsersPage from "@/views/Devops/Security/Online/index.vue";

const { online, departmentTree, revokeSingleSession, revokeAllSessions, prompt, confirm, success, error } = vi.hoisted(
    () => ({
        online: vi.fn(),
        departmentTree: vi.fn(),
        revokeSingleSession: vi.fn(),
        revokeAllSessions: vi.fn(),
        prompt: vi.fn(),
        confirm: vi.fn(),
        success: vi.fn(),
        error: vi.fn()
    })
);

vi.mock("@/api/user/user-api.ts", () => ({ UserApi: { online } }));
vi.mock("@/api/user/department-api.ts", () => ({ DepartmentApi: { tree: departmentTree } }));
vi.mock("@/api/system/cache-management-api.ts", () => ({
    CacheManagementApi: { revokeSingleSession, revokeAllSessions }
}));
vi.mock("element-plus", async importOriginal => {
    const original = await importOriginal();
    return {
        ...original,
        ElMessageBox: { prompt, confirm },
        ElMessage: { success, error }
    };
});

const session = {
    session_id: "session-handle-1",
    client_type: "WEB",
    ip: "192.0.2.1",
    login_time: "2026-09-13T08:30:00Z"
};
const user = {
    user_id: "user-1",
    username: "alice",
    real_name: "Alice Chen",
    department_id: "dept-1",
    department_name: "Platform",
    session_count: 1,
    latest_login_time: session.login_time,
    sessions: [session]
};

describe("在线用户页面", () => {
    beforeEach(() => {
        online.mockReset().mockResolvedValue({ records: [user], total: 1, current: 1, size: 15, pages: 1 });
        departmentTree.mockReset().mockResolvedValue([{ id: "dept-1", name: "Platform", children: [] }]);
        revokeSingleSession.mockReset().mockResolvedValue({ status: "SUCCEEDED" });
        revokeAllSessions.mockReset().mockResolvedValue({ status: "SUCCEEDED" });
        prompt.mockReset().mockResolvedValue({ value: "security review" });
        confirm.mockReset().mockResolvedValue(true);
        success.mockReset();
        error.mockReset();
    });

    it("应该展示真实分组分页数据、展开会话，并提供手动刷新", async () => {
        const wrapper = mount(OnlineUsersPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();

        expect(online).toHaveBeenCalledWith({ page_num: 1, page_size: 15 });
        expect(wrapper.text()).toContain("alice");
        expect(wrapper.text()).toContain("Alice Chen");
        expect(wrapper.text()).toContain("Platform");
        expect(wrapper.text()).not.toContain("冻结");
        expect(wrapper.text()).not.toContain("登录地点");

        await wrapper.find(".el-table__expand-icon").trigger("click");
        await flushPromises();
        expect(wrapper.text()).toContain("192.0.2.1");
        expect(wrapper.text()).toContain("WEB");
        expect(wrapper.text()).toContain("下线此会话");
        expect(wrapper.text()).toContain("全部下线");
        expect(departmentTree).toHaveBeenCalledTimes(1);
        wrapper.unmount();
    });

    it("查询条件和分页变化应该请求对应的服务端页面", async () => {
        const wrapper = mount(OnlineUsersPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();

        const usernameInput = wrapper.findAll("input").find(input => input.attributes("placeholder") === "请输入账号");
        expect(usernameInput).toBeDefined();
        await usernameInput!.setValue("alice");
        const queryButton = wrapper.findAll("button").find(button => button.text().trim() === "查询");
        await queryButton!.trigger("click");
        await flushPromises();
        expect(online).toHaveBeenLastCalledWith({ page_num: 1, page_size: 15, username: "alice" });

        wrapper.findComponent({ name: "ElPagination" }).vm.$emit("current-change", 2);
        await flushPromises();
        expect(online).toHaveBeenLastCalledWith({ page_num: 2, page_size: 15, username: "alice" });

        wrapper.findComponent({ name: "ElPagination" }).vm.$emit("size-change", 30);
        await flushPromises();
        expect(online).toHaveBeenLastCalledWith({ page_num: 1, page_size: 30, username: "alice" });

        const refreshButton = wrapper.findAll("button").find(button => button.text().trim() === "刷新");
        await refreshButton!.trigger("click");
        await flushPromises();
        expect(online).toHaveBeenCalledTimes(5);
        wrapper.unmount();
    });

    it("当前页在下线后为空时应该回到最后一个有效页", async () => {
        const wrapper = mount(OnlineUsersPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();

        online
            .mockResolvedValueOnce({ records: [], total: 1, current: 2, size: 15, pages: 1 })
            .mockResolvedValueOnce({ records: [user], total: 1, current: 1, size: 15, pages: 1 });
        wrapper.findComponent({ name: "ElPagination" }).vm.$emit("current-change", 2);
        await flushPromises();

        expect(online).toHaveBeenLastCalledWith({ page_num: 1, page_size: 15 });
        expect(wrapper.text()).toContain("alice");
        wrapper.unmount();
    });

    it("应该要求填写原因和二次确认后精准撤销单个会话", async () => {
        const wrapper = mount(OnlineUsersPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();
        await wrapper.find(".el-table__expand-icon").trigger("click");
        await flushPromises();

        const revokeButton = wrapper.findAll("button").find(button => button.text().trim() === "下线此会话");
        expect(revokeButton).toBeDefined();
        await revokeButton!.trigger("click");
        await flushPromises();

        expect(prompt).toHaveBeenCalled();
        expect(confirm).toHaveBeenCalled();
        expect(revokeSingleSession).toHaveBeenCalledWith({
            session_id: "session-handle-1",
            reason: "security review",
            confirmed: true
        });
        expect(online).toHaveBeenCalledTimes(2);
        wrapper.unmount();
    });

    it("全部下线应该提交当前用户和原因，并在成功后刷新列表", async () => {
        const wrapper = mount(OnlineUsersPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();
        const revokeAllButton = wrapper.findAll("button").find(button => button.text().trim() === "全部下线");
        expect(revokeAllButton).toBeDefined();
        await revokeAllButton!.trigger("click");
        await flushPromises();

        expect(prompt).toHaveBeenCalled();
        expect(confirm).toHaveBeenCalled();
        expect(revokeAllSessions).toHaveBeenCalledWith({
            user_id: "user-1",
            reason: "security review",
            confirmed: true
        });
        expect(online).toHaveBeenCalledTimes(2);
        wrapper.unmount();
    });

    it("API 出错时保留当前用户列表", async () => {
        revokeSingleSession.mockRejectedValueOnce(new Error("security Redis unavailable"));
        const wrapper = mount(OnlineUsersPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();
        await wrapper.find(".el-table__expand-icon").trigger("click");
        await flushPromises();
        const revokeButton = wrapper.findAll("button").find(button => button.text().trim() === "下线此会话");
        await revokeButton!.trigger("click");
        await flushPromises();

        expect(wrapper.text()).toContain("alice");
        expect(wrapper.text()).toContain("Alice Chen");
        expect(error).toHaveBeenCalled();
        wrapper.unmount();
    });
});
