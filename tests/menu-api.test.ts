import { beforeEach, describe, expect, it, vi } from "vitest";

import { MenuApi } from "@/api/system/menu-api.ts";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/plugin/request/api.ts", () => ({
    get: getMock,
    post: vi.fn(),
    put: vi.fn(),
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
});
