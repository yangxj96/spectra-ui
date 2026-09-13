import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfiguredApi } from "@/api/system/configured-api.ts";

const { getMock } = vi.hoisted(() => ({
    getMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({
    get: getMock,
    put: vi.fn()
}));

describe("系统配置分页 API", () => {
    beforeEach(() => {
        getMock.mockReset();
        getMock.mockResolvedValue({ records: [], total: 0 });
    });

    it("提交页码、每页条数和配置键筛选条件", async () => {
        const params = {
            page_num: 2,
            page_size: 15,
            key: "user.default-password"
        } satisfies ConfiguredPageParams;

        await ConfiguredApi.page(params);

        expect(getMock).toHaveBeenCalledWith("/api/configured/page", params);
    });
});
