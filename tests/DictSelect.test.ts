import { createTestingPinia } from "@pinia/testing";
import { flushPromises, mount } from "@vue/test-utils";
import { ElOption, ElSelect } from "element-plus";
import { describe, expect, it, vi } from "vitest";

import DictSelect from "../src/components/DictSelect/index.vue";

const getDictData = vi.hoisted(() =>
    vi.fn(async () => [
        { id: "1", label: "正常", value: "0" },
        { id: "2", label: "冻结", value: "1" },
        { id: "3", label: "封禁", value: "2" }
    ])
);

vi.mock("../src/plugin/store/modules/use-dict-store.ts", () => ({
    useDictStore: () => ({ getDictData })
}));

describe("DictSelect 组件", () => {
    it("应该正确接收并传递dict_code和model值", async () => {
        const wrapper = mount(DictSelect, {
            props: {
                modelValue: "0",
                dict_code: "sys_common_state",
                "append-to": undefined
            },
            global: {
                plugins: [
                    createTestingPinia({
                        stubActions: false
                    })
                ],
                components: {
                    ElSelect,
                    ElOption
                }
            }
        });

        await flushPromises();

        // 检查props是否正确接收
        expect(wrapper.props("modelValue")).toBe("0");
        expect(wrapper.props("dict_code")).toBe("sys_common_state");
        expect(getDictData).toHaveBeenCalledWith("sys_common_state");
    });
});
