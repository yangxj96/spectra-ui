import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ProfilePassword from "@/views/Profile/components/ProfilePassword/index.vue";

const { get, changePassword, logout, cancelAllRequests, exit, success, error } = vi.hoisted(() => ({
    get: vi.fn(),
    changePassword: vi.fn(),
    logout: vi.fn(),
    cancelAllRequests: vi.fn(),
    exit: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({ get }));
vi.mock("@/api/user/user-api.ts", () => ({ UserApi: { changePassword } }));
vi.mock("@/api/auth/auth-api", () => ({ AuthApi: { logout } }));
vi.mock("@/plugin/request/http.ts", () => ({ cancelAllRequests }));
vi.mock("@/utils/global-utils", () => ({ GlobalUtils: { exit } }));
vi.mock("@/utils/message-utils", () => ({ MessageUtils: { success, error } }));

const policy = {
    policy_key: "SYSTEM",
    min_length: 12,
    max_length: 20,
    require_uppercase: true,
    require_lowercase: true,
    require_digit: true,
    require_special: true,
    max_age_days: null,
    version: 0
};

describe("个人中心修改密码策略", () => {
    beforeEach(() => {
        get.mockReset().mockResolvedValue(policy);
        changePassword.mockReset().mockResolvedValue(undefined);
        logout.mockReset();
        cancelAllRequests.mockReset();
        exit.mockReset();
        success.mockReset();
        error.mockReset();
    });

    it("应该按当前后端策略展示规则并拒绝低于动态最小长度的密码", async () => {
        const wrapper = mount(ProfilePassword, { global: { plugins: [ElementPlus] } });
        await flushPromises();

        expect(get).toHaveBeenCalledWith("/api/security/policy/password", undefined, { cache: false });
        expect(wrapper.text()).toContain("密码长度 12-20 位");
        expect(wrapper.text()).toContain("包含大写字母");
        expect(wrapper.text()).toContain("包含小写字母");
        expect(wrapper.text()).toContain("包含数字");
        expect(wrapper.text()).toContain("包含特殊字符");

        const inputs = wrapper.findAll('input[type="password"]');
        await inputs[0].setValue("CurrentPassword1!");
        await inputs[1].setValue("Abcdef1!");
        await inputs[2].setValue("Abcdef1!");
        expect(wrapper.findAll(".rules-list li")[0].classes()).not.toContain("is-met");
        const submitButton = wrapper.findAll("button").find(button => button.text().includes("修改密码"));
        await submitButton!.trigger("click");
        await flushPromises();

        expect(changePassword).not.toHaveBeenCalled();
        wrapper.unmount();
    });

    it("应该允许当前策略接受的 Unicode 字母和未枚举特殊字符", async () => {
        get.mockResolvedValue({ ...policy, min_length: 8 });
        const wrapper = mount(ProfilePassword, { global: { plugins: [ElementPlus] } });
        await flushPromises();
        expect(get).toHaveBeenCalledWith("/api/security/policy/password", undefined, { cache: false });

        const password = "𐐀𐐨abcdefgh1-";
        const inputs = wrapper.findAll('input[type="password"]');
        await inputs[0].setValue("CurrentPassword1!");
        await inputs[1].setValue(password);
        await inputs[2].setValue(password);
        expect(wrapper.findAll(".rules-list li").every(rule => rule.classes().includes("is-met"))).toBe(true);
        const submitButton = wrapper.findAll("button").find(button => button.text().includes("修改密码"));
        await submitButton!.trigger("click");
        await flushPromises();

        expect(changePassword).toHaveBeenCalledWith({
            old_password: "CurrentPassword1!",
            new_password: password,
            verify_password: password
        });
        wrapper.unmount();
    });

    it("应该按配置关闭的字符要求更新清单并接受满足其余规则的密码", async () => {
        get.mockResolvedValue({
            ...policy,
            min_length: 8,
            require_uppercase: false,
            require_lowercase: false,
            require_digit: false,
            require_special: false
        });
        const wrapper = mount(ProfilePassword, { global: { plugins: [ElementPlus] } });
        await flushPromises();

        const password = "longenough";
        const inputs = wrapper.findAll('input[type="password"]');
        await inputs[0].setValue("CurrentPassword1!");
        await inputs[1].setValue(password);
        await inputs[2].setValue(password);

        expect(wrapper.findAll(".rules-list li")).toHaveLength(1);
        expect(wrapper.text()).not.toContain("包含大写字母");
        expect(wrapper.text()).not.toContain("包含小写字母");
        expect(wrapper.text()).not.toContain("包含数字");
        expect(wrapper.text()).not.toContain("包含特殊字符");

        const submitButton = wrapper.findAll("button").find(button => button.text().includes("修改密码"));
        await submitButton!.trigger("click");
        await flushPromises();

        expect(changePassword).toHaveBeenCalledWith({
            old_password: "CurrentPassword1!",
            new_password: password,
            verify_password: password
        });
        wrapper.unmount();
    });
});
