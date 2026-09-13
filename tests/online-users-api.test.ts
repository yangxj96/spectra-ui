import { beforeEach, describe, expect, it, vi } from "vitest";

import { CacheManagementApi } from "@/api/system/cache-management-api.ts";
import { UserApi } from "@/api/user/user-api.ts";

const { get, post } = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));

vi.mock("@/plugin/request/api.ts", () => ({ get, post }));

describe("在线用户 API", () => {
    beforeEach(() => {
        get.mockReset();
        post.mockReset();
    });

    it("应该使用不缓存的用户分组分页接口并传递筛选条件", async () => {
        const page = { records: [], total: 0, current: 1, size: 15 };
        get.mockResolvedValue(page);

        await expect(
            UserApi.online({
                page_num: 1,
                page_size: 15,
                username: "alice",
                real_name: "Alice",
                department_id: "dept-1"
            })
        ).resolves.toBe(page);

        expect(get).toHaveBeenCalledWith(
            "/api/user/online",
            { page_num: 1, page_size: 15, username: "alice", real_name: "Alice", department_id: "dept-1" },
            { cache: false }
        );
    });

    it("应该把稳定会话句柄、理由和确认提交到单会话撤销接口", async () => {
        const result = { operation_type: "SESSION_ONE", status: "SUCCEEDED" };
        post.mockResolvedValue(result);

        await expect(
            CacheManagementApi.revokeSingleSession({
                session_id: "opaque-handle",
                reason: "security review",
                confirmed: true
            })
        ).resolves.toBe(result);

        expect(post).toHaveBeenCalledWith("/api/cache/admin/security/session/revoke-one", {
            session_id: "opaque-handle",
            reason: "security review",
            confirmed: true
        });
    });
});
