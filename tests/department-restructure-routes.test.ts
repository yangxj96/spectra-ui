import { describe, expect, it } from "vitest";

import systemRoutes from "@/plugin/router/modules/system.ts";

describe("department restructure routes", () => {
    const systemRoute = systemRoutes.find(route => route.path === "/system");
    const children = systemRoute?.children ?? [];

    it("registers the merge workflow under the department menu", () => {
        const route = children.find(child => child.name === "SystemDeptMerge");

        expect(route).toMatchObject({
            path: "dept/merge",
            meta: {
                requiresAuth: true,
                requiredMenu: "SystemDept",
                activeMenu: "SystemDept"
            }
        });
    });

    it("registers the split workflow under the department menu", () => {
        const route = children.find(child => child.name === "SystemDeptSplit");

        expect(route).toMatchObject({
            path: "dept/split",
            meta: {
                requiresAuth: true,
                requiredMenu: "SystemDept",
                activeMenu: "SystemDept"
            }
        });
    });
});
