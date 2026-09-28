import { describe, expect, it } from "vitest";

import { filterAuthorizedShortcuts } from "@/utils/menu-utils.ts";

describe("filterAuthorizedShortcuts", () => {
    const shortcuts = [
        { name: "用户管理", path: "/system/user", routeName: "SystemUser" },
        { name: "日历", path: "/oa/calendar", routeName: "OACalendar" },
        { name: "审批中心", path: "/oa/approval", routeName: "OAApproval" }
    ];

    it("only keeps shortcuts whose menu routes are authorized", () => {
        expect(filterAuthorizedShortcuts(shortcuts, new Set(["Dashboard", "OACalendar"])))
            .toEqual([shortcuts[1]]);
    });

    it("returns no shortcuts before the authorization menu is available", () => {
        expect(filterAuthorizedShortcuts(shortcuts, new Set())).toEqual([]);
    });
});
