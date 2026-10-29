import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";

import { useTable } from "@/hooks/use-table";

vi.mock("@/plugin/element/loading", () => ({
    showLoading: vi.fn(),
    hideLoading: vi.fn()
}));

function deferred<T>() {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>(resolver => {
        resolve = resolver;
    });
    return { promise, resolve };
}

function page<T>(records: T[]): Page<T> {
    return {
        current: 1,
        optimize_count_sql: false,
        pages: 1,
        records,
        search_count: false,
        size: 15,
        total: records.length
    };
}

describe("useTable 查询生命周期", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("旧查询响应不能覆盖最后一次查询结果", async () => {
        const first = deferred<Page<string>>();
        const second = deferred<Page<string>>();
        const request = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        const condition = ref<BasePageParams>({ page_num: 1, page_size: 15 });

        const table = useTable<string>(request, condition);
        const firstLoad = table.handlerConditionQuery();
        const secondLoad = table.handlerConditionQuery();

        second.resolve(page(["new"]));
        await secondLoad;
        first.resolve(page(["old"]));
        await firstLoad;

        expect(table.table_data.value).toEqual(["new"]);
    });

    it("页面整体替换 condition Ref 后使用最新查询参数", async () => {
        const request = vi.fn().mockResolvedValue(page([]));
        const condition = ref<BasePageParams & { keyword?: string }>({
            page_num: 1,
            page_size: 15,
            keyword: "old"
        });

        const table = useTable(request, condition);
        await table.handlerConditionQuery();
        condition.value = { page_num: 1, page_size: 15, keyword: "new" };
        await table.handlerConditionQuery();

        expect(request).toHaveBeenLastCalledWith(expect.objectContaining({ keyword: "new" }));
    });
});
