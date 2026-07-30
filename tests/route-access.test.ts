import { describe, expect, it } from "vitest";

import { resolveRouteAccess } from "@/utils/route-utils.ts";

describe("静态路由菜单权限", () => {
    const authorized = new Set(["SystemWorkflow"]);

    it("应该允许可见菜单页及其详情页使用继承权限", () => {
        expect(resolveRouteAccess("SystemWorkflow", authorized)).toBeUndefined();
    });

    it("应该将未授权菜单页导向401", () => {
        expect(resolveRouteAccess("SystemUser", authorized)).toBe("/401");
    });

    it("应该允许不要求菜单权限的已认证页面", () => {
        expect(resolveRouteAccess(undefined, authorized)).toBeUndefined();
    });
});
