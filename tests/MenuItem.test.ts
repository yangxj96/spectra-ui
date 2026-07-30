import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import MenuItem from "@/layouts/Default/components/Sidebar/MenuItem/index.vue";

const push = vi.fn();
vi.mock("vue-router", () => ({
    useRouter: () => ({ push })
}));

describe("递归侧栏菜单项", () => {
    beforeEach(() => push.mockClear());

    it("应该渲染四级菜单并按命名路由跳转", async () => {
        const target: Menu = {
            id: "target",
            pid: "level3",
            icon: "",
            menuType: "MENU",
            routeName: "SystemWorkflow",
            name: "流程管理",
            sort: 0,
            children: []
        };
        const directory = (id: string, child: Menu): Menu => ({
            id,
            pid: "",
            icon: "",
            menuType: "DIRECTORY",
            routeName: null,
            name: id,
            sort: 0,
            children: [child]
        });
        const wrapper = mount(MenuItem, {
            props: { menu: directory("level1", directory("level2", directory("level3", target))) },
            global: {
                stubs: {
                    ElSubMenu: { template: "<div class='el-sub-menu-stub'><slot name='title' /><slot /></div>" },
                    ElMenuItem: { template: "<button class='el-menu-item-stub'><slot /></button>" }
                }
            }
        });

        expect(wrapper.findAll(".el-sub-menu-stub")).toHaveLength(3);
        await wrapper.get('[data-route-name="SystemWorkflow"]').trigger("click");
        expect(push).toHaveBeenCalledWith({ name: "SystemWorkflow" });
    });
});
