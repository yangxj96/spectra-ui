import { beforeEach, describe, expect, it, vi } from "vitest";

import { UserApi } from "@/api/user/user-api.ts";

const { postMock, putMock } = vi.hoisted(() => ({
    postMock: vi.fn(),
    putMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({
    get: vi.fn(),
    post: postMock,
    put: putMock
}));

describe("用户开通 API", () => {
    beforeEach(() => {
        postMock.mockReset();
        putMock.mockReset();
    });

    it("新增和编辑都应使用用户开通的一次性提交接口", async () => {
        const params = {} as UserOnboardingDTO;
        postMock.mockResolvedValue({ id: "user-1", username: "新用户" });
        putMock.mockResolvedValue({ id: "user-1", username: "编辑用户" });

        await UserApi.submitCreate(params);
        await UserApi.submitUpdate(params);

        expect(postMock).toHaveBeenCalledWith("/api/user/onboarding", params);
        expect(putMock).toHaveBeenCalledWith("/api/user/onboarding", params);
    });
});
