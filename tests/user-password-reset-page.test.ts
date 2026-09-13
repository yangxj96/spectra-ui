import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { beforeEach, describe, expect, it, vi } from "vitest";

import UserPage from "@/views/System/User/index.vue";

const mocks = vi.hoisted(() => ({
    user: {
        id: "user-1",
        employee_no: "E-001",
        avatar: "",
        status: "ACTIVE",
        authorization_status: "ACTIVE",
        real_name: "张三",
        username: "zhangsan",
        language: "zh-CN",
        timezone: "Asia/Shanghai",
        roles: [],
        department_id: "dept-1",
        department_name: "技术部",
        created_at: "2026-09-13T00:00:00Z"
    },
    reset: vi.fn(),
    refresh: vi.fn(),
    confirm: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    tree: vi.fn(),
    getDictData: vi.fn(),
    getDictItemSync: vi.fn(),
    push: vi.fn()
}));

vi.mock("@/api/user/user-api.ts", () => ({
    UserApi: {
        passwordResetById: mocks.reset
    }
}));

vi.mock("@/api/user/department-api.ts", () => ({
    DepartmentApi: {
        tree: mocks.tree
    }
}));

vi.mock("@/hooks/use-table.ts", async () => {
    const { ref } = await import("vue");
    return {
        default: () => ({
            handleCurrentChange: vi.fn(),
            handleSizeChange: vi.fn(),
            handlerConditionQuery: mocks.refresh,
            pagination: ref({ size: 15, page: 1, page_sizes: [15], default_page_size: 15, total: 1 }),
            table_data: ref([mocks.user])
        })
    };
});

vi.mock("@/plugin/store/modules/use-dict-store.ts", () => ({
    useDictStore: () => ({
        getDictData: mocks.getDictData,
        getDictItemSync: mocks.getDictItemSync
    })
}));

vi.mock("@/utils/message-utils.ts", () => ({
    MessageUtils: {
        box: { confirm: mocks.confirm },
        notify: { success: mocks.success, error: mocks.error },
        success: vi.fn()
    }
}));

vi.mock("vue-router", () => ({
    useRouter: () => ({ push: mocks.push })
}));

describe("管理员重置用户密码页面反馈", () => {
    beforeEach(() => {
        mocks.reset.mockReset().mockResolvedValue(undefined);
        mocks.refresh.mockReset().mockResolvedValue(undefined);
        mocks.confirm.mockReset().mockResolvedValue("confirm");
        mocks.success.mockReset();
        mocks.error.mockReset();
        mocks.tree.mockReset().mockResolvedValue([]);
        mocks.getDictData.mockReset().mockResolvedValue([]);
        mocks.getDictItemSync.mockReset().mockReturnValue(undefined);
    });

    async function clickResetButton() {
        const wrapper = mount(UserPage, { global: { plugins: [ElementPlus] } });
        await flushPromises();
        await wrapper.get(".el-table__body-wrapper button").trigger("click");
        await flushPromises();
        return wrapper;
    }

    it("重置成功并完成列表刷新后显示持久的成功通知", async () => {
        const events: string[] = [];
        mocks.reset.mockImplementation(async () => events.push("reset"));
        mocks.refresh.mockImplementation(async () => events.push("refresh"));
        mocks.success.mockImplementation(() => events.push("success"));

        const wrapper = await clickResetButton();

        expect(events).toEqual(["reset", "refresh", "success"]);
        expect(mocks.success).toHaveBeenCalledWith(
            "密码已重置为系统默认密码，用户下次登录后必须立即修改。",
            "密码重置成功"
        );
        wrapper.unmount();
    });

    it("重置请求失败时显示失败通知", async () => {
        mocks.reset.mockRejectedValue(new Error("网络连接失败"));

        const wrapper = await clickResetButton();

        expect(mocks.error).toHaveBeenCalledWith("网络连接失败", "密码重置失败");
        expect(mocks.refresh).not.toHaveBeenCalled();
        wrapper.unmount();
    });
});
