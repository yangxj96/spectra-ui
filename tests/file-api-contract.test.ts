import { describe, expect, it, vi } from "vitest";

import { FileApi } from "@/api/system/file-api";

const { getMock, postMock, putMock, delMock, downloadMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    postMock: vi.fn(),
    putMock: vi.fn(),
    delMock: vi.fn(),
    downloadMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({
    get: getMock,
    post: postMock,
    put: putMock,
    del: delMock,
    download: downloadMock
}));

describe("文件 API 协议", () => {
    it("只使用统一 uploads/assets/references 路径", () => {
        FileApi.createUpload({
            original_name: "a.pdf",
            content_type: "application/pdf",
            size: 1,
            content_sha256: "a".repeat(64),
            file_type_code: "PDF"
        });
        FileApi.status("upload");
        FileApi.target("upload", 1, { part_size: 1, part_sha256: "b".repeat(64) });
        FileApi.confirm("upload", 1, { part_size: 1, part_sha256: "b".repeat(64), attempt: 1 });
        FileApi.complete("upload");
        FileApi.cancel("upload");
        FileApi.assetsPage();
        FileApi.preview("asset", "OA_DOCUMENT_VERSION", "reference");
        FileApi.download("asset", "OA_DOCUMENT_VERSION", "reference");
        FileApi.deleteAsset("asset");
        FileApi.registerReference({
            file_asset_id: "asset",
            reference_type: "OA_DOCUMENT_VERSION",
            reference_id: "reference",
            purpose: "CONTENT"
        });
        FileApi.deleteReference("reference");

        const mocks = [getMock, postMock, delMock, downloadMock];
        const paths = mocks.flatMap(mock => mock.mock.calls.map((call: unknown[]) => call[0]));
        expect(
            paths.every((path: unknown) => typeof path === "string" && (path as string).includes("/api/file/"))
        ).toBe(true);
        expect(
            paths.some(
                (path: unknown) =>
                    /\/api\/file\/upload(?:\/|$)/.test(String(path)) || String(path).includes("/api/file/info")
            )
        ).toBe(false);
    });

    it("应该公开非 OA 文件管理入口的统一管理端点", async () => {
        const page = { page_num: 1, page_size: 15 };
        const operation = { idempotency_key: "cancel-1", reason: "清理卡住任务" };
        getMock.mockResolvedValue({ records: [], total: 0 });
        postMock.mockResolvedValue({});
        putMock.mockResolvedValue({});
        const policy: FileTypePolicySaveParams = {
            code: "PDF",
            display_name: "PDF 文档",
            allowed_extensions: ["pdf"],
            allowed_content_types: ["application/pdf"],
            magic_rules: [{ bytes: "25504446", offset: 0 }],
            max_size: 1024,
            preview_enabled: true,
            download_enabled: true,
            upload_enabled: true,
            dangerous: false,
            enabled: true
        };

        await FileApi.uploadTasksPage(page);
        await FileApi.uploadTaskDetail("upload-1");
        await FileApi.adminCancelUpload("upload-1", operation);
        await FileApi.referencesPage(page);
        await FileApi.fileTypesPage(page);
        await FileApi.fileType("type-1");
        await FileApi.createFileType(policy);
        await FileApi.updateFileType("type-1", policy);
        await FileApi.enableFileType("type-1");
        await FileApi.disableFileType("type-1");

        expect(getMock).toHaveBeenCalledWith("/api/file/uploads/page", page);
        expect(getMock).toHaveBeenCalledWith("/api/file/uploads/upload-1/admin-detail");
        expect(postMock).toHaveBeenCalledWith("/api/file/uploads/upload-1/admin-cancel", operation, { noBody: true });
        expect(getMock).toHaveBeenCalledWith("/api/file/references/page", page);
        expect(getMock).toHaveBeenCalledWith("/api/file/types/page", page);
        expect(getMock).toHaveBeenCalledWith("/api/file/types/type-1");
        expect(postMock).toHaveBeenCalledWith("/api/file/types/type-1/enable");
        expect(postMock).toHaveBeenCalledWith("/api/file/types/type-1/disable");
        expect(putMock).toHaveBeenCalledWith("/api/file/types/type-1", policy);
    });
});
