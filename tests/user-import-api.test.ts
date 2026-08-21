import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserImportApi } from "@/api/user/user-import-api.ts";

const { getMock, postMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    postMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({
    get: getMock,
    post: postMock
}));

describe("用户批量导入 API", () => {
    beforeEach(() => {
        getMock.mockReset();
        postMock.mockReset();
    });

    it("应使用统一版本头并覆盖 Preview、Apply、详情和错误明细接口", async () => {
        const previewParams: UserImportPreviewFrom = {
            idempotency_key: "idempotency-key",
            file_name: "users.xlsx",
            file_hash: "file-hash",
            skip_existing: true,
            rows: []
        };
        const applyParams: UserImportApplyFrom = { preview_token: "preview-token" };
        const previewTask = { id: "task-1", status: "PREVIEWED" } as UserImportTask;
        const applyingTask = { id: "task-1", status: "APPLYING" } as UserImportTask;
        const errorRows = [{ id: "row-1", row_number: 2, row_key: "zhangsan", state: "ERROR", errors: [] }];
        const options = { headers: { "Api-Version": "1.0.0" } };
        postMock.mockResolvedValueOnce(previewTask).mockResolvedValueOnce(applyingTask);
        getMock.mockResolvedValueOnce(applyingTask).mockResolvedValueOnce(errorRows);

        await expect(UserImportApi.preview(previewParams)).resolves.toBe(previewTask);
        await expect(UserImportApi.apply("task-1", applyParams)).resolves.toBe(applyingTask);
        await expect(UserImportApi.detail("task-1")).resolves.toBe(applyingTask);
        await expect(UserImportApi.errors("task-1")).resolves.toBe(errorRows);

        expect(postMock).toHaveBeenNthCalledWith(1, "/api/user/imports/preview", previewParams, options);
        expect(postMock).toHaveBeenNthCalledWith(2, "/api/user/imports/task-1/apply", applyParams, options);
        expect(getMock).toHaveBeenNthCalledWith(1, "/api/user/imports/task-1", undefined, options);
        expect(getMock).toHaveBeenNthCalledWith(2, "/api/user/imports/task-1/errors", undefined, options);
    });
});
