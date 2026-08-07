import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenuApi } from "@/api/system/menu-api.ts";

const { getMock, postMock, putMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    postMock: vi.fn(),
    putMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({
    get: getMock,
    post: postMock,
    put: putMock,
    del: vi.fn()
}));

describe("菜单API", () => {
    beforeEach(() => getMock.mockReset());

    it("应该递归归一化后端菜单字段", async () => {
        getMock.mockResolvedValue([
            {
                id: "root",
                menu_type: "DIRECTORY",
                route_name: null,
                children: [{ id: "dashboard", menu_type: "MENU", route_name: "Dashboard", children: [] }]
            }
        ]);

        const menus = await MenuApi.current();

        expect(menus[0]?.menuType).toBe("DIRECTORY");
        expect(menus[0]?.children?.[0]?.routeName).toBe("Dashboard");
    });

    it("创建和更新菜单时应该发送后端要求的 snake_case 字段", async () => {
        postMock.mockResolvedValue(undefined);
        putMock.mockResolvedValue(undefined);

        const params: MenuSaveForm = {
            pid: "root",
            icon: "icon-module",
            menuType: "MENU",
            routeName: "OAReimbursement",
            name: "费用报销",
            sort: 10
        };

        await MenuApi.create(params);
        await MenuApi.update({ ...params, id: "reimbursement" });

        expect(postMock).toHaveBeenCalledWith("/api/menu/created", {
            pid: "root",
            icon: "icon-module",
            menu_type: "MENU",
            route_name: "OAReimbursement",
            name: "费用报销",
            sort: 10
        });
        expect(putMock).toHaveBeenCalledWith("/api/menu/modify", {
            id: "reimbursement",
            pid: "root",
            icon: "icon-module",
            menu_type: "MENU",
            route_name: "OAReimbursement",
            name: "费用报销",
            sort: 10
        });
    });
});
