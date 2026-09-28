import { describe, expect, it, vi } from "vitest";

import { shouldBypassAuthenticatedBootstrap } from "@/utils/route-utils.ts";

vi.mock("@/plugin/router/index", () => ({
    default: {
        currentRoute: { value: { fullPath: "/" } },
        push: vi.fn()
    }
}));

describe("mandatory password change route", () => {
    it("bypasses menu and system-guide bootstrap only on the required password page", () => {
        expect(shouldBypassAuthenticatedBootstrap("/profile", "password", true)).toBe(true);
        expect(shouldBypassAuthenticatedBootstrap("/", undefined, true)).toBe(false);
        expect(shouldBypassAuthenticatedBootstrap("/profile", "password", false)).toBe(false);
    });
});
