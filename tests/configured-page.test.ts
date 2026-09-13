import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus, { ElOption } from "element-plus";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ConfiguredPage from "@/views/Devops/SystemMaintenance/Configured/index.vue";

const { settings, batchModify, getDictData, success, error } = vi.hoisted(() => ({
    settings: vi.fn(),
    batchModify: vi.fn(),
    getDictData: vi.fn(),
    success: vi.fn(),
    error: vi.fn()
}));

vi.mock("@/api/system/configured-api.ts", () => ({
    ConfiguredApi: { settings, batchModify }
}));

vi.mock("@/utils/message-utils.ts", () => ({
    MessageUtils: { notify: { success, error } }
}));

vi.mock("@/plugin/store/modules/use-dict-store.ts", () => ({
    useDictStore: () => ({ getDictData })
}));

const settingsRows: ConfiguredSettingVO[] = [
    {
        id: "system-name",
        key: "system.name",
        value: "Spectra",
        type: "TEXT",
        category: "SYSTEM",
        editable: true,
        dict_code: "",
        remarks: "系统名称",
        configured: false
    },
    {
        id: "system-short-name",
        key: "system.short-name",
        value: "SP",
        type: "TEXT",
        category: "SYSTEM",
        editable: true,
        dict_code: "",
        remarks: "系统简称",
        configured: false
    },
    {
        id: "system-logo",
        key: "system.logo",
        value: "/logo.svg",
        type: "TEXT",
        category: "SYSTEM",
        editable: true,
        dict_code: "",
        remarks: "系统 Logo 地址",
        configured: false
    },
    {
        id: "system-default-locale",
        key: "system.default-locale",
        value: "zh-CN",
        type: "SELECT",
        category: "SYSTEM",
        editable: true,
        dict_code: "sys_language",
        remarks: "系统默认语言",
        configured: false
    },
    {
        id: "system-default-timezone",
        key: "system.default-timezone",
        value: "Asia/Shanghai",
        type: "SELECT",
        category: "SYSTEM",
        editable: true,
        dict_code: "sys_timezone",
        remarks: "系统默认时区",
        configured: false
    },
    {
        id: "copyright-name",
        key: "copyright.name",
        value: "devops00",
        type: "TEXT",
        category: "SYSTEM",
        editable: true,
        dict_code: "",
        remarks: "系统底部版权名称",
        configured: false
    },
    {
        id: "copyright-url",
        key: "copyright.url",
        value: "https://www.devops00.com",
        type: "TEXT",
        category: "SYSTEM",
        editable: true,
        dict_code: "",
        remarks: "系统底部版权点击跳转地址",
        configured: false
    },
    {
        id: "crypto-enabled",
        key: "crypto.enabled",
        value: "true",
        type: "BOOL",
        category: "SECURITY",
        editable: true,
        dict_code: "",
        remarks: "接口加密",
        configured: false
    },
    {
        id: "default-password",
        key: "user.default-password",
        value: null,
        type: "SECRET",
        category: "SECURITY",
        editable: true,
        dict_code: "",
        remarks: "默认密码",
        configured: true
    },
    {
        id: "security-profile",
        key: "security.profile",
        value: "STANDARD",
        type: "SELECT",
        category: "SECURITY",
        editable: true,
        dict_code: "sys_security_profile",
        remarks: "安全策略",
        configured: false
    },
    {
        id: "notification-key",
        key: "notification.address-encryption-key",
        value: null,
        type: "TEXT",
        category: "NOTIFICATION",
        editable: false,
        dict_code: "",
        remarks: "通知地址加密密钥",
        configured: false
    },
    {
        id: "notification-allowed-link-prefixes",
        key: "notification.allowed-link-prefixes",
        value: "/login,/system/",
        type: "TEXTAREA",
        category: "NOTIFICATION",
        editable: true,
        dict_code: "",
        remarks: "允许的站内路由前缀",
        configured: false
    }
];

describe("系统配置表单页", () => {
    beforeEach(() => {
        settings.mockReset().mockImplementation(async () => settingsRows.map(setting => ({ ...setting })));
        batchModify.mockReset().mockResolvedValue(undefined);
        getDictData.mockReset().mockImplementation(async (dictCode: string) => {
            if (dictCode === "sys_language") {
                return [
                    { id: "zh-cn", label: "简体中文", value: "zh-CN" },
                    { id: "en-us", label: "English", value: "en-US" }
                ];
            }
            if (dictCode === "sys_timezone") {
                return [
                    { id: "shanghai", label: "中国标准时间（上海）", value: "Asia/Shanghai" },
                    { id: "utc", label: "协调世界时（UTC）", value: "UTC" }
                ];
            }
            return [
                { id: "standard", label: "标准模式", value: "STANDARD" },
                { id: "strict", label: "严格模式", value: "STRICT" }
            ];
        });
        success.mockReset();
        error.mockReset();
    });

    it("按系统、安全与加密、通知业务分类显示配置表单", async () => {
        const wrapper = mount(ConfiguredPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();

        expect(settings).toHaveBeenCalledOnce();
        expect(wrapper.text()).toContain("系统配置");
        expect(wrapper.text()).toContain("安全与加密");
        expect(wrapper.text()).toContain("通知配置");
        expect(wrapper.text()).toContain("系统名称");
        expect(wrapper.find(".el-table").exists()).toBe(false);

        wrapper.unmount();
    });

    it("只批量保存当前分类，并排除系统自动维护项", async () => {
        const wrapper = mount(ConfiguredPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();

        const securityTab = wrapper
            .findAll(".el-tabs__item")
            .find(tab => tab.find(".configured-tab-label").text().trim().startsWith("安全与加密"));
        expect(securityTab).toBeDefined();
        await securityTab!.trigger("click");
        await flushPromises();

        const passwordInput = wrapper
            .findAll("input")
            .find(input => input.attributes("placeholder") === "留空则保留当前默认密码");
        expect(passwordInput).toBeDefined();
        await passwordInput!.setValue("ValidPassword1!");
        const saveButton = wrapper.findAll("button").find(button => button.text().trim() === "保存当前分类");
        expect(saveButton).toBeDefined();
        await saveButton!.trigger("click");
        await flushPromises();

        expect(batchModify).toHaveBeenCalledWith({
            category: "SECURITY",
            items: [
                { id: "crypto-enabled", value: "true", remarks: "接口加密" },
                { id: "default-password", value: "ValidPassword1!", remarks: "默认密码" },
                { id: "security-profile", value: "STANDARD", remarks: "安全策略" }
            ]
        });
        expect(success).toHaveBeenCalled();
        expect(wrapper.findAll("input").some(input => input.element.value === "ValidPassword1!")).toBe(false);
        wrapper.unmount();
    });

    it("SELECT 配置按配置项的字典编码加载下拉选项", async () => {
        const wrapper = mount(ConfiguredPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();

        const securityTab = wrapper
            .findAll(".el-tabs__item")
            .find(tab => tab.find(".configured-tab-label").text().trim().startsWith("安全与加密"));
        await securityTab!.trigger("click");
        await flushPromises();

        expect(getDictData).toHaveBeenCalledWith("sys_security_profile");
        expect(wrapper.text()).toContain("安全策略");
        expect(wrapper.text()).toContain("标准模式");
        expect(wrapper.findAllComponents(ElOption).map(option => option.props("value"))).toContain("STRICT");
        wrapper.unmount();
    });

    it("TEXT 使用单行输入，TEXTAREA 保留多行输入，语言和时区从字典加载", async () => {
        const wrapper = mount(ConfiguredPage, {
            global: { plugins: [ElementPlus], directives: { permission: () => undefined } }
        });
        await flushPromises();

        expect(wrapper.findAll("input").some(input => input.element.value === "Spectra")).toBe(true);
        expect(wrapper.findAll("input").some(input => input.element.value === "SP")).toBe(true);
        expect(wrapper.findAll("input").some(input => input.element.value === "/logo.svg")).toBe(true);
        expect(wrapper.findAll("input").some(input => input.element.value === "devops00")).toBe(true);
        expect(wrapper.findAll("input").some(input => input.element.value === "https://www.devops00.com")).toBe(true);
        const copyrightUrlLabel = wrapper
            .findAll(".el-form-item__label")
            .find(label => label.text().includes("系统底部版权点击跳转地址"));
        expect(copyrightUrlLabel?.text()).toContain("copyright.url");
        expect(wrapper.findAll("textarea")).toHaveLength(1);
        expect(wrapper.find("textarea").element.value).toBe("/login,/system/");
        expect(getDictData).toHaveBeenCalledWith("sys_language");
        expect(getDictData).toHaveBeenCalledWith("sys_timezone");
        expect(getDictData).toHaveBeenCalledTimes(3);
        expect(wrapper.text()).toContain("简体中文");
        expect(wrapper.text()).toContain("中国标准时间（上海）");

        const notificationTab = wrapper
            .findAll(".el-tabs__item")
            .find(tab => tab.find(".configured-tab-label").text().trim().startsWith("通知配置"));
        await notificationTab!.trigger("click");
        await flushPromises();
        expect(wrapper.findAll("textarea")).toHaveLength(1);

        wrapper.unmount();
    });
});
