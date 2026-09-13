import { beforeEach, describe, expect, it, vi } from "vitest";

import { ConfiguredApi } from "@/api/system/configured-api.ts";

const { getMock, putMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    putMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({
    get: getMock,
    put: putMock
}));

describe("系统配置表单 API", () => {
    beforeEach(() => {
        getMock.mockReset();
        putMock.mockReset();
        getMock.mockResolvedValue([]);
    });

    it("读取系统配置表单数据", async () => {
        await ConfiguredApi.settings();

        expect(getMock).toHaveBeenCalledWith("/api/configured/settings");
    });

    it("按分类批量保存当前配置表单", async () => {
        const params: ConfiguredSettingsBatchDTO = {
            category: "SYSTEM",
            items: [{ id: "config-1", value: "Spectra", remarks: "站点名称" }]
        };

        await ConfiguredApi.batchModify(params);

        expect(putMock).toHaveBeenCalledWith("/api/configured/batch", params, { noBody: true });
    });
});
