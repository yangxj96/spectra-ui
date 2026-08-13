import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";

const { notificationApiMock } = vi.hoisted(() => ({
    notificationApiMock: {
        batchDelete: vi.fn(),
        delete: vi.fn(),
        list: vi.fn(),
        markAllAsRead: vi.fn(),
        markAsRead: vi.fn(),
        unreadCount: vi.fn()
    }
}));

vi.mock("@/api/notification/notification-api.ts", () => ({
    NotificationApi: notificationApiMock
}));

describe("通知 Store", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        Object.values(notificationApiMock).forEach(mock => mock.mockReset());
    });

    it("应该转发查询条件并保存分页结果", async () => {
        notificationApiMock.list.mockResolvedValue({
            records: [
                {
                    id: "message-1",
                    title: "系统通知",
                    content: "内容",
                    type: "system",
                    is_read: false,
                    created_at: "2026-08-13T00:00:00Z"
                }
            ],
            total: 1
        });
        const store = useNotificationStore();

        await store.fetchNotifications({ page_num: 2, page_size: 10, type: "system", is_read: false });

        expect(notificationApiMock.list).toHaveBeenCalledWith({
            page_num: 2,
            page_size: 10,
            type: "system",
            is_read: false
        });
        expect(store.notifications).toHaveLength(1);
        expect(store.total).toBe(1);
        expect(store.loading).toBe(false);
    });

    it("应该在已读和批量删除成功后同步未读数与列表", async () => {
        notificationApiMock.markAsRead.mockResolvedValue(undefined);
        notificationApiMock.batchDelete.mockResolvedValue(undefined);
        notificationApiMock.list.mockResolvedValue({
            records: [
                {
                    id: "message-1",
                    title: "一",
                    content: "内容",
                    type: "system",
                    is_read: false,
                    created_at: "2026-08-13T00:00:00Z"
                },
                {
                    id: "message-2",
                    title: "二",
                    content: "内容",
                    type: "oa",
                    is_read: false,
                    created_at: "2026-08-13T00:00:00Z"
                }
            ],
            total: 2
        });
        const store = useNotificationStore();
        await store.fetchNotifications();
        store.unreadCount = 2;

        await store.markAsRead("message-1");
        expect(store.unreadCount).toBe(1);
        expect(store.notifications[0]?.is_read).toBe(true);

        await store.batchDelete(["message-1", "message-2"]);
        expect(store.notifications).toHaveLength(0);
        expect(store.unreadCount).toBe(0);
    });
});
