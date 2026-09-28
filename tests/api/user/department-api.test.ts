import { beforeEach, describe, expect, it, vi } from "vitest";

import { DepartmentApi } from "@/api/user/department-api.ts";

const { getMock } = vi.hoisted(() => ({ getMock: vi.fn() }));

vi.mock("@/plugin/request/api.ts", () => ({ get: getMock }));

describe("DepartmentApi", () => {
    beforeEach(() => getMock.mockReset());

    it("queries direct department members with the versioned paging contract", async () => {
        const params = { departmentId: "department-1", keyword: "lee", pageNum: 2, pageSize: 25 };
        await DepartmentApi.departmentMembers(params);

        expect(getMock).toHaveBeenCalledWith("/api/user/department-members", params, {
            headers: { "Api-Version": "1.0.0" }
        });
    });
});
