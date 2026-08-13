import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationApi } from "@/api/notification/notification-api.ts";

const { delMock, getMock, postMock, putMock } = vi.hoisted(() => ({
    delMock: vi.fn(),
    getMock: vi.fn(),
    postMock: vi.fn(),
    putMock: vi.fn()
}));

vi.mock("@/plugin/request/api.ts", () => ({
    del: delMock,
    get: getMock,
    post: postMock,
    put: putMock
}));

describe("通知 API", () => {
    beforeEach(() => {
        delMock.mockReset();
        getMock.mockReset();
        postMock.mockReset();
        putMock.mockReset();
    });

    it("应该使用消息中心 Self API 的路径和参数", async () => {
        const params: NotificationQueryParams = { page_num: 2, page_size: 10, type: "system", is_read: false };
        getMock.mockResolvedValueOnce({ records: [], total: 0 }).mockResolvedValueOnce(0);
        putMock.mockResolvedValue(undefined);
        delMock.mockResolvedValue(undefined);
        postMock.mockResolvedValue(undefined);

        await NotificationApi.list(params);
        await NotificationApi.detail("message-1");
        await NotificationApi.unreadCount();
        await NotificationApi.markAsRead("message-1");
        await NotificationApi.markAllAsRead();
        await NotificationApi.delete("message-1");
        await NotificationApi.batchDelete(["message-1", "message-2"]);
        await NotificationApi.preferences();
        await NotificationApi.savePreference({
            purpose: "SYSTEM_NOTICE",
            channel: "IN_APP",
            enabled: true,
            doNotDisturb: false
        });

        expect(getMock).toHaveBeenNthCalledWith(1, "/api/notification/list", params);
        expect(getMock).toHaveBeenNthCalledWith(2, "/api/notification/message-1");
        expect(getMock).toHaveBeenNthCalledWith(3, "/api/notification/unread-count");
        expect(getMock).toHaveBeenNthCalledWith(4, "/api/notification-center/preferences");
        expect(putMock).toHaveBeenNthCalledWith(1, "/api/notification/message-1/read");
        expect(putMock).toHaveBeenNthCalledWith(2, "/api/notification/read-all");
        expect(putMock).toHaveBeenNthCalledWith(3, "/api/notification-center/preferences", undefined, {
            params: {
                purpose: "SYSTEM_NOTICE",
                channel: "IN_APP",
                enabled: true,
                doNotDisturb: false
            }
        });
        expect(delMock).toHaveBeenCalledWith("/api/notification/message-1");
        expect(postMock).toHaveBeenCalledWith("/api/notification/batch-delete", { ids: ["message-1", "message-2"] });
    });
});
