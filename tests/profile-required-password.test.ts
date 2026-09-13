import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";
import Profile from "@/views/Profile/index.vue";

const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));

vi.mock("vue-router", async importOriginal => ({
    ...(await importOriginal<typeof import("vue-router")>()),
    useRoute: () => ({ query: {} })
}));
vi.mock("@/api/user/user-api", () => ({ UserApi: { getProfile } }));

const profileStubs = {
    ProfileInfo: true,
    ProfilePassword: { template: "<div data-testid='password-form'></div>" },
    ProfileSettings: true,
    ProfileSecurityContext: true,
    ProfileNotificationSettings: true
};

describe("必须修改默认密码的个人中心", () => {
    beforeEach(() => {
        getProfile.mockReset().mockResolvedValue({});
    });

    it("不请求用户资料并只显示密码修改内容", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        useUserStore().token = { password_change_required: true } as Token;

        const wrapper = mount(Profile, {
            global: { plugins: [pinia, ElementPlus], stubs: profileStubs }
        });
        await flushPromises();

        expect(getProfile).not.toHaveBeenCalled();
        expect(wrapper.text()).toContain("请先修改初始密码");
        expect(wrapper.find('[data-testid="password-form"]').exists()).toBe(true);
        expect(wrapper.find(".el-tabs").exists()).toBe(false);
        expect(wrapper.text()).not.toContain("基本资料");
        expect(wrapper.text()).not.toContain("安全设置");
        wrapper.unmount();
    });

    it("普通用户仍加载资料并显示个人中心选项卡", async () => {
        const pinia = createPinia();
        setActivePinia(pinia);
        useUserStore().token = { password_change_required: false } as Token;

        const wrapper = mount(Profile, {
            global: { plugins: [pinia, ElementPlus], stubs: profileStubs }
        });
        await flushPromises();

        expect(getProfile).toHaveBeenCalledWith({ loading: false });
        expect(wrapper.find(".el-tabs").exists()).toBe(true);
        expect(wrapper.text()).toContain("基本资料");
        expect(wrapper.text()).toContain("安全设置");
        wrapper.unmount();
    });
});
