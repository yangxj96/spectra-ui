import { describe, expect, it } from "vitest";

import routes from "@/plugin/router/routes";
import { resolvePasswordChangeRedirect, resolveRouteAccess } from "@/utils/route-utils.ts";

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

    it("应该注册文件管理子路由并绑定独立菜单权限", () => {
        const devopsRoute = routes.find(route => route.path === "/devops");
        const uploadRoute = devopsRoute?.children?.find(route => route.path === "file/upload");
        const expectedRoutes = ["file/upload", "file/assets", "file/upload-tasks", "file/references", "file/types"];

        expect(uploadRoute).toMatchObject({
            path: "file/upload",
            name: "DevopsFileUpload",
            meta: {
                title: "文件上传",
                requiresAuth: true,
                requiredMenu: "DevopsFileUpload"
            }
        });
        expect(uploadRoute?.component).toBeTypeOf("function");
        expect(expectedRoutes.every(path => devopsRoute?.children?.some(route => route.path === path))).toBe(true);
    });
});

describe("强制修改密码路由", () => {
    it("首次登录未修改默认密码时应该进入密码修改页", () => {
        expect(resolvePasswordChangeRedirect("/", undefined, true)).toEqual({
            path: "/profile",
            query: { tab: "password" },
            replace: true
        });
    });

    it("密码修改页可以继续访问", () => {
        expect(resolvePasswordChangeRedirect("/profile", "password", true)).toBeUndefined();
    });

    it("不要求强制改密时不改变路由", () => {
        expect(resolvePasswordChangeRedirect("/system/user", undefined, false)).toBeUndefined();
    });
});
