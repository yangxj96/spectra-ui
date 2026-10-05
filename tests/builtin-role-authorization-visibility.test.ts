import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";


import routes from "@/plugin/router/routes.ts";
import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";
import {
    collectAuthorizedRouteNames,
    filterMenusByRegisteredRoutes,
    collectRegisteredRouteNames
} from "@/utils/menu-utils.ts";
import { resolveRouteAccess } from "@/utils/route-utils.ts";

vi.mock("@/plugin/router/index", () => ({
    default: {
        currentRoute: { value: { fullPath: "/" } },
        push: vi.fn()
    }
}));

describe("built-in role authorization visibility", () => {
    beforeEach(() => setActivePinia(createPinia()));

    it("shows only menu leaves with registered pages and removes empty directories", () => {
        const registered = collectRegisteredRouteNames(routes);
        const menus = [
            menu("root", "首页", "DIRECTORY", null, [
                menu("dashboard", "首页", "MENU", "Dashboard"),
                menu("stale", "Markdown", "MENU", "ExampleMarkdown")
            ]),
            menu("delivery", "投递记录", "MENU", "DevopsNotificationDeliveryRecord"),
            menu("calendar", "日历管理", "MENU", "OACalendar"),
            menu("empty", "空目录", "DIRECTORY", null, [menu("empty-stale", "无效页面", "MENU", "UnknownPage")])
        ];

        const filtered = filterMenusByRegisteredRoutes(menus, registered);

        expect(collectAuthorizedRouteNames(filtered)).toEqual(new Set(["Dashboard", "OACalendar"]));
        expect(filtered.map(entry => entry.id)).toEqual(["root", "calendar"]);
        expect(filtered[0]?.children?.map(entry => entry.routeName)).toEqual(["Dashboard"]);
    });

    it("applies the effective role permission union while keeping the auditor read-only", () => {
        const user = useUserStore();
        user.token.permissions = [
            "account:read",
            "account:update",
            "notification:read",
            "oa:calendar:read",
            "oa:calendar:update",
            "workflow:instance:create",
            "audit:read",
            "audit:export",
            "user:read",
            "oa:purchase:read"
        ];

        expect(user.hasPermission("audit:read")).toBe(true);
        expect(user.hasPermission("user:read")).toBe(true);
        expect(user.hasPermission("oa:calendar:update")).toBe(true);
        expect(user.hasPermission("oa:purchase:read")).toBe(true);
        expect(user.hasPermission("oa:purchase:update")).toBe(false);
        expect(user.hasPermission("security:config:update")).toBe(false);
    });

    it("uses the Root wildcard and rejects direct entry when a required menu is absent", () => {
        const user = useUserStore();
        user.token.permissions = ["*"];
        expect(user.hasPermission("security:config:update")).toBe(true);

        const userMenus = collectAuthorizedRouteNames([
            menu("dashboard", "首页", "MENU", "Dashboard"),
            menu("calendar", "日历管理", "MENU", "OACalendar")
        ]);
        const auditorMenus = collectAuthorizedRouteNames([
            menu("dashboard", "首页", "MENU", "Dashboard"),
            menu("users", "用户管理", "MENU", "SystemUser")
        ]);
        expect(resolveRouteAccess("OACalendar", userMenus)).toBeUndefined();
        expect(resolveRouteAccess("DevopsNotificationTemplate", userMenus)).toBe("/401");
        expect(
            resolveRouteAccess("SystemUser", auditorMenus, {
                requiredPermissions: ["user:create"],
                hasPermission: () => false
            })
        ).toBe("/401");
        expect(
            resolveRouteAccess("OACalendar", userMenus, {
                requiredPermissions: ["oa:calendar:create"],
                hasPermission: () => true
            })
        ).toBeUndefined();
        expect(
            resolveRouteAccess("SystemUser", auditorMenus, {
                requiredAnyPermissions: ["user:create", "user:update"],
                hasPermission: permission => permission === "user:read"
            })
        ).toBe("/401");
    });
});

function menu(id: string, name: string, menuType: Menu["menuType"], routeName: string | null, children?: Menu[]): Menu {
    return { id, name, icon: "", menuType, routeName, sort: 0, children };
}
