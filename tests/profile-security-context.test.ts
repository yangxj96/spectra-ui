import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { flushPromises, mount } from "@vue/test-utils";
import ElementPlus from "element-plus";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { routeLocationKey } from "vue-router";

import ProfilePage from "@/views/Profile/index.vue";

const { getProfile, current } = vi.hoisted(() => ({ getProfile: vi.fn(), current: vi.fn() }));

vi.mock("@/api/user/user-api", () => ({ UserApi: { getProfile } }));
vi.mock("@/api/auth/security-context-api.ts", () => ({ SecurityContextApi: { current } }));

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("个人中心安全上下文", () => {
    beforeEach(() => {
        getProfile.mockReset().mockResolvedValue({
            id: "user-1",
            employee_no: "E001",
            username: "alice",
            real_name: "Alice",
            avatar: "",
            status: "ACTIVE",
            language: "zh-CN",
            timezone: "Asia/Shanghai",
            department_id: "dept-1",
            department_name: "研发部",
            roles: []
        });
        current.mockReset().mockResolvedValue({
            permissions: ["user:profile:read"],
            grantable_permissions: ["user:profile:update"]
        });
    });

    it("个人中心页签应该显示当前用户的授权上下文", async () => {
        const wrapper = mount(ProfilePage, {
            global: {
                plugins: [ElementPlus],
                provide: { [routeLocationKey as symbol]: { query: {} } },
                stubs: {
                    ProfileInfo: true,
                    ProfilePassword: true,
                    ProfileSettings: true,
                    ProfileNotificationSettings: true
                }
            }
        });
        await flushPromises();

        const securityContextTab = wrapper.findAll(".el-tabs__item").find(tab => tab.text().trim() === "安全上下文");
        expect(securityContextTab).toBeDefined();
        await securityContextTab!.trigger("click");
        await flushPromises();

        expect(current).toHaveBeenCalledOnce();
        expect(wrapper.text()).toContain("当前授权上下文");
        expect(wrapper.text()).toContain("user:profile:read");
        expect(wrapper.text()).toContain("user:profile:update");
        wrapper.unmount();
    });

    it("安全上下文不再注册为运维路由或运维菜单", () => {
        expect(source("src/plugin/router/modules/devops.ts")).not.toContain('name: "DevopsSecurityContext"');
        expect(source("../spectra-admin/spectra-config/src/main/resources/db/migration/V1__init_db.sql")).not.toContain(
            "DevopsSecurityContext"
        );
    });
});
