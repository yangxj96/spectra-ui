import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthorizationApi } from "@/api/auth/authorization-api.ts";

const { postMock } = vi.hoisted(() => ({ postMock: vi.fn() }));

vi.mock("@/plugin/request/api.ts", () => ({ post: postMock }));

describe("AuthorizationApi department restructure", () => {
    beforeEach(() => postMock.mockReset());

    const mergePreview: DepartmentMergePreviewRequest = {
        source_department_ids: ["department-1", "department-2"],
        department: { name: "Merged", type: 1, region_id: "region-1" },
        expected_organization_version: 7
    };
    const splitPreview: DepartmentSplitPreviewRequest = {
        source_department_id: "department-1",
        user_ids: ["user-1"],
        department: { name: "Split", type: 1, region_id: "region-1" },
        expected_organization_version: 7
    };

    it.each([
        [
            "merge preview",
            "/api/security/authorization/departments/merge/impact-preview",
            () => AuthorizationApi.previewDepartmentMerge(mergePreview),
            mergePreview
        ],
        [
            "merge apply",
            "/api/security/authorization/departments/merge/impact-apply",
            () => AuthorizationApi.applyDepartmentMerge({ ...mergePreview, preview_token: "preview-token" }),
            { ...mergePreview, preview_token: "preview-token" }
        ],
        [
            "split preview",
            "/api/security/authorization/departments/split/impact-preview",
            () => AuthorizationApi.previewDepartmentSplit(splitPreview),
            splitPreview
        ],
        [
            "split apply",
            "/api/security/authorization/departments/split/impact-apply",
            () => AuthorizationApi.applyDepartmentSplit({ ...splitPreview, preview_token: "preview-token" }),
            { ...splitPreview, preview_token: "preview-token" }
        ]
    ] as const)("routes %s through the v1.0.0 request client", async (_label, url, invoke, body) => {
        await invoke();
        expect(postMock).toHaveBeenCalledWith(url, body, { headers: { "Api-Version": "1.0.0" } });
    });
});
