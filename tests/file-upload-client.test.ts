import { beforeEach, describe, expect, it, vi } from "vitest";

import { FileUploadClient } from "@/services/file-upload-client";
import { FileUploadStore, type UploadResumeRecord } from "@/services/file-upload-store";

const { createUploadMock } = vi.hoisted(() => ({
    createUploadMock: vi.fn()
}));

vi.mock("@/api/system/file-api", () => ({
    FileApi: {
        createUpload: createUploadMock,
        status: vi.fn(),
        target: vi.fn(),
        confirm: vi.fn(),
        complete: vi.fn(),
        cancel: vi.fn()
    }
}));

vi.mock("@/plugin/request/upload", () => ({
    uploadBinary: vi.fn()
}));

describe("FileUploadClient 恢复任务", () => {
    beforeEach(() => {
        createUploadMock.mockReset();
        createUploadMock.mockResolvedValue({
            upload_id: "upload-1",
            result: "DEDUPLICATED",
            status: "READY",
            file_asset_id: "asset-1",
            uploaded_bytes: 4,
            verification_progress: 100
        });
    });

    it("恢复任务时应使用恢复记录中的文件类型，而不是页面当前选择类型", async () => {
        const file = new File(["data"], "员工名单.xlsx", {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        });
        const contentSha256 = "a".repeat(64);
        const record: UploadResumeRecord = {
            key: FileUploadStore.key(file.size, contentSha256),
            upload_id: "upload-1",
            original_name: file.name,
            size: file.size,
            content_sha256: contentSha256,
            file_type_code: "XLSX",
            updated_at: Date.now()
        };
        const store = {
            remove: vi.fn().mockResolvedValue(undefined),
            put: vi.fn().mockResolvedValue(undefined)
        } as unknown as FileUploadStore;
        const client = new FileUploadClient({
            file_type_code: "PDF",
            get_file_type_code: () => "PDF",
            store
        });
        vi.spyOn(client as never, "analyze" as never).mockResolvedValue(contentSha256);

        await client.resume(file, record);

        expect(createUploadMock).toHaveBeenCalledWith(
            expect.objectContaining({
                file_type_code: "XLSX"
            })
        );
    });
});
