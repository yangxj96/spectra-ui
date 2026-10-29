import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createFormSync } from "../../../logicflow-plugin-flowable/src/panel/property/form-sync";

describe("插件属性面板表单防抖", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("按发起目标写入，不因目标切换写错对象", () => {
        const write = vi.fn();
        const sync = createFormSync({ isDisposed: () => false, write });

        sync.sync({ name: "旧目标" }, "node-a");
        sync.sync({ name: "新目标" }, "node-b");

        vi.advanceTimersByTime(200);

        expect(write).toHaveBeenCalledTimes(1);
        expect(write).toHaveBeenCalledWith("node-b", { name: "新目标" });
    });

    it("flush 立即写入并取消定时器", () => {
        const write = vi.fn();
        const sync = createFormSync({ isDisposed: () => false, write });

        sync.sync({ name: "最新值" }, "node-a");
        sync.flush();

        expect(write).toHaveBeenCalledWith("node-a", { name: "最新值" });
        vi.advanceTimersByTime(500);
        expect(write).toHaveBeenCalledTimes(1);
    });

    it("dispose 后不再写入", () => {
        const write = vi.fn();
        const sync = createFormSync({ isDisposed: () => false, write });

        sync.sync({ name: "待写入" }, "node-a");
        sync.dispose();
        vi.advanceTimersByTime(500);

        expect(write).not.toHaveBeenCalled();
    });

    it("销毁状态下不安排写入", () => {
        const write = vi.fn();
        const sync = createFormSync({ isDisposed: () => true, write });

        sync.sync({ name: "待写入" }, "node-a");
        vi.advanceTimersByTime(500);

        expect(write).not.toHaveBeenCalled();
    });
});
