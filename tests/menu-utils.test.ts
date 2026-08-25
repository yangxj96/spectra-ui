import { describe, expect, it } from "vitest";

import {
    collectMenuIds,
    collectAuthorizedRouteNames,
    filterDirectoryTree,
    filterMenusByRouteNames,
    findFirstRoutableMenu,
    findMenuByRouteName,
    findMenuPath
} from "@/utils/menu-utils.ts";

const leaf = (id: string, routeName: string): Menu => ({
    id,
    pid: "",
    icon: "",
    menuType: "MENU",
    routeName,
    name: routeName,
    sort: 0,
    children: []
});

describe("菜单树工具", () => {
    const target = leaf("menu", "SystemWorkflow");
    const menus: Menu[] = [
        {
            id: "root",
            pid: "",
            icon: "",
            menuType: "DIRECTORY",
            routeName: null,
            name: "系统管理",
            sort: 0,
            children: [
                {
                    id: "group",
                    pid: "root",
                    icon: "",
                    menuType: "DIRECTORY",
                    routeName: null,
                    name: "流程中心",
                    sort: 0,
                    children: [target]
                }
            ]
        }
    ];

    it("应该递归查找四层菜单及其祖先路径", () => {
        expect(findMenuByRouteName(menus, "SystemWorkflow")).toBe(target);
        expect(findMenuPath(menus, "SystemWorkflow").map(menu => menu.id)).toEqual(["root", "group", "menu"]);
    });

    it("应该只收集可点击菜单路由并去重", () => {
        menus.push(leaf("duplicate", "SystemWorkflow"));

        expect([...collectAuthorizedRouteNames(menus)]).toEqual(["SystemWorkflow"]);
    });

    it("应该跳过空目录并返回首个可点击后代", () => {
        const root = {
            ...menus[0]!,
            children: [
                {
                    id: "empty",
                    pid: "root",
                    icon: "",
                    menuType: "DIRECTORY",
                    routeName: null,
                    name: "空目录",
                    sort: 0,
                    children: []
                },
                ...(menus[0]!.children ?? [])
            ]
        };

        expect(findFirstRoutableMenu(root)).toBe(target);
    });

    it("应该只收集角色可关联的菜单节点ID", () => {
        expect(collectMenuIds(menus, ["root", "group", "menu"])).toEqual(["menu"]);
    });

    it("应该从父级候选中排除菜单节点、当前节点和后代", () => {
        expect(filterDirectoryTree(menus, "group").map(menu => menu.id)).toEqual(["root"]);
        expect(filterDirectoryTree(menus, "group")[0]?.children).toEqual([]);
    });

    it("应该递归移除已合并展示的旧菜单", () => {
        const filtered = filterMenusByRouteNames(
            [menus[0]!, leaf("delivery-record", "DevopsNotificationDeliveryRecord")],
            new Set(["DevopsNotificationDeliveryRecord"])
        );

        expect(filtered.map(menu => menu.id)).toEqual(["root"]);
        expect(filtered[0]?.children?.[0]?.children).toEqual([target]);
    });
});
