import { beforeEach, describe, expect, it, vi } from "vitest";

import { SecretManagementApi } from "@/api/system/secret-management-api";

const { getMock, postMock, requestMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    postMock: vi.fn(),
    requestMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({ get: getMock, post: postMock }));
vi.mock("@/plugin/request/http.ts", () => ({ request: requestMock }));

describe("密钥管理 API", () => {
    beforeEach(() => {
        getMock.mockReset();
        postMock.mockReset();
        requestMock.mockReset();
    });

    it("查询定义和导出时应使用密钥管理路径并默认导出当前启用版本", async () => {
        await SecretManagementApi.listDefinitions();
        await SecretManagementApi.exportCurrent();

        expect(getMock).toHaveBeenCalledWith("/api/security/secrets/definitions");
        expect(postMock).toHaveBeenCalledWith("/api/security/secrets/export", {});
    });

    it("应该通过密钥管理 API 查询并修改接口加解密开关", async () => {
        await SecretManagementApi.getSettings();
        await SecretManagementApi.setCryptoEnabled(true);

        expect(getMock).toHaveBeenCalledWith("/api/security/secrets/settings");
        expect(postMock).toHaveBeenCalledWith("/api/security/secrets/settings/crypto", { enabled: true });
    });

    it("导入应使用 FormData 预校验和确认流程", async () => {
        const file = new File(["package"], "secrets.bin");
        await SecretManagementApi.previewImport(file, "one-time-passphrase");
        await SecretManagementApi.importPending(file, "one-time-passphrase");

        expect(requestMock).toHaveBeenCalledTimes(2);
        expect(requestMock.mock.calls[0]?.[0]).toBe("/api/security/secrets/import/preview");
        expect(requestMock.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
        expect(requestMock.mock.calls[0]?.[1]?.body.get("passphrase")).toBe("one-time-passphrase");
        expect(requestMock.mock.calls[0]?.[1]?.params).toBeUndefined();
        expect(requestMock.mock.calls[1]?.[0]).toBe("/api/security/secrets/import");
    });
});
