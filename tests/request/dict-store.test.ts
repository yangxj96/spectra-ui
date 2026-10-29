import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DictApi } from "@/api/system/dict-api.ts";
import { DictLoadError, useDictStore } from "@/plugin/store/modules/use-dict-store";

vi.mock("@/api/system/dict-api.ts", () => ({
    DictApi: {
        getDataByTypeCode: vi.fn()
    }
}));

describe("字典 Store 失败可观察", () => {
    beforeEach(() => {
        setActivePinia(createPinia());
        vi.mocked(DictApi.getDataByTypeCode).mockReset();
    });

    it("加载失败抛出可识别错误并记录失败状态，重试成功后清除", async () => {
        const store = useDictStore();
        vi.mocked(DictApi.getDataByTypeCode).mockRejectedValueOnce(new Error("服务暂不可用"));

        await expect(store.getDictData("sys_language")).rejects.toBeInstanceOf(DictLoadError);
        expect(store.getDictError("sys_language")).toBe("服务暂不可用");
        expect(store.dicts.sys_language).toBeUndefined();

        vi.mocked(DictApi.getDataByTypeCode).mockResolvedValueOnce([{ value: "zh-CN", label: "简体中文" } as DictItem]);
        await expect(store.getDictData("sys_language")).resolves.toHaveLength(1);
        expect(store.getDictError("sys_language")).toBeUndefined();
    });

    it("会话切换清空字典缓存和错误", async () => {
        const store = useDictStore();
        vi.mocked(DictApi.getDataByTypeCode).mockResolvedValueOnce([{ value: "zh-CN", label: "简体中文" } as DictItem]);
        await store.getDictData("sys_language");
        expect(store.dicts.sys_language).toHaveLength(1);

        store.resetSessionScope();
        expect(store.dicts).toEqual({});
        expect(store.errors).toEqual({});
    });
});
