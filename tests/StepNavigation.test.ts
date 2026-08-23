import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";

import StepNavigation from "@/components/StepNavigation/index.vue";

describe("StepNavigation", () => {
    it("生成补零的一级编号和最多一层的二级编号", async () => {
        const wrapper = mount(StepNavigation, {
            props: {
                items: [
                    { key: "0", title: "基本信息" },
                    { key: "1", title: "授权方案" },
                    {
                        key: "2",
                        title: "角色授权",
                        children: [
                            { key: "role-a", title: "管理员设置" },
                            { key: "role-b", title: "审计员设置" }
                        ]
                    }
                ],
                activeKey: "2",
                activeChildKey: "role-a"
            }
        });

        const buttons = wrapper.findAll("button");
        expect(buttons[0]?.text()).toContain("01");
        expect(buttons[2]?.text()).toContain("03");
        expect(buttons[3]?.text()).toContain("3.1");
        expect(buttons[4]?.text()).toContain("3.2");
        expect(buttons[3]?.classes()).toContain("is-active");

        await buttons[0]?.trigger("click");
        await buttons[4]?.trigger("click");

        expect(wrapper.emitted("select")?.[0]).toEqual(["0"]);
        expect(wrapper.emitted("select-child")?.[0]).toEqual(["role-b"]);
    });
});
