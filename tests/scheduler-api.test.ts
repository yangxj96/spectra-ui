import { beforeEach, describe, expect, it, vi } from "vitest";

import { SchedulerAdminApi } from "@/api/system/scheduler-api.ts";

const { getMock, postMock, putMock } = vi.hoisted(() => ({
    getMock: vi.fn(),
    postMock: vi.fn(),
    putMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({ get: getMock, post: postMock, put: putMock }));

describe("调度管理 API", () => {
    beforeEach(() => {
        getMock.mockReset();
        postMock.mockReset();
        putMock.mockReset();
    });

    it("应该使用统一管理端点和版本无关的 REST 路径", async () => {
        const page = { page_num: 1, page_size: 15 };
        const operation: SchedulerOperationParams = { version: 2, idempotency_key: "op-1", reason: "maintenance" };
        getMock.mockResolvedValue({ records: [], total: 0 });
        postMock.mockResolvedValue({});
        putMock.mockResolvedValue({});

        await SchedulerAdminApi.catalog();
        await SchedulerAdminApi.jobs(page);
        await SchedulerAdminApi.createJob({
            job_key: "oa.contract.milestone-reminder",
            name: "提醒",
            schedule_kind: "CRON",
            cron_expression: "0 0 1 * * *",
            misfire_policy: "SKIP",
            concurrency_policy: "FORBID",
            execution_policy: {},
            parameters: {},
            idempotency_key: "create-1",
            reason: "initial setup"
        });
        await SchedulerAdminApi.updateJob("job-1", {
            job_key: "oa.contract.milestone-reminder",
            name: "提醒",
            schedule_kind: "CRON",
            cron_expression: "0 0 1 * * *",
            misfire_policy: "SKIP",
            concurrency_policy: "FORBID",
            execution_policy: {},
            parameters: {},
            version: 2,
            idempotency_key: "update-1",
            reason: "change"
        });
        await SchedulerAdminApi.enableJob("job-1", operation);
        await SchedulerAdminApi.triggerJob("job-1", { parameters: {}, idempotency_key: "trigger-1", reason: "manual" });
        await SchedulerAdminApi.executions(page);
        await SchedulerAdminApi.execution("execution-1");
        await SchedulerAdminApi.loops(page);
        await SchedulerAdminApi.operations("job-1", page);
        await SchedulerAdminApi.errors("job-1", page);

        expect(getMock).toHaveBeenNthCalledWith(1, "/api/scheduler/admin/catalog");
        expect(getMock).toHaveBeenNthCalledWith(2, "/api/scheduler/admin/jobs", page);
        expect(getMock).toHaveBeenCalledWith("/api/scheduler/admin/executions", page);
        expect(getMock).toHaveBeenCalledWith("/api/scheduler/admin/loops", page);
        expect(getMock).toHaveBeenCalledWith("/api/scheduler/admin/jobs/job-1/operations", page);
        expect(postMock).toHaveBeenCalledWith("/api/scheduler/admin/jobs/job-1/enable", operation);
        expect(putMock).toHaveBeenCalledWith(
            "/api/scheduler/admin/jobs/job-1",
            expect.objectContaining({ reason: "change" })
        );
    });
});
