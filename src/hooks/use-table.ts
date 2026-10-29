import { nextTick, onMounted, onUnmounted, ref, unref, type Ref } from "vue";

import { hideLoading, showLoading } from "@/plugin/element/loading";

type TableParameters = BasePageParams | Ref<BasePageParams>;

/**
 * 分页表格组合式函数
 * 封装分页状态、数据请求、翻页/切换每页数量逻辑
 * @param request 分页请求函数，接收分页参数返回分页数据
 * @param parameters 初始分页参数，或页面持续复用的 Ref
 * @returns table_data 表格数据、pagination 分页状态、loading 和查询方法
 */
export function useTable<T>(request: (parameters?: BasePageParams) => Promise<Page<T>>, parameters: TableParameters) {
    // 分页实体
    const pagination = ref<Pagination>({
        size: 10,
        page: 1,
        page_sizes: [10, 15, 50, 100, 150, 300],
        default_page_size: 10,
        total: 0
    });

    // 表数据
    const table_data = ref<T[]>([]);
    // 当前列表请求的局部 loading；全局遮罩只用于本次列表加载。
    const loading = ref(false);

    let requestSequence = 0;
    let disposed = false;

    /** 每次请求前解析最新参数，支持页面整体替换 condition Ref 后继续使用新对象。 */
    function resolveParameters(): BasePageParams {
        return unref(parameters) as BasePageParams;
    }

    onMounted(() => {
        const current = resolveParameters();
        pagination.value.page = current.page_num;
        pagination.value.size = current.page_size;
        pagination.value.default_page_size = current.page_size;
        void handleCurrentChange(pagination.value.page);
    });

    onUnmounted(() => {
        disposed = true;
        requestSequence++;
    });

    /**
     * 处理页码改变
     * @param value 页码
     */
    async function handleCurrentChange(value: number) {
        pagination.value.page = value;
        const current = resolveParameters();
        current.page_num = value;
        current.page_size = pagination.value.size;
        await loadPage();
    }

    /**
     * 处理每页数量改变
     * @param value 每页数量
     */
    async function handleSizeChange(value: number) {
        pagination.value.page = 1;
        pagination.value.size = value;
        const current = resolveParameters();
        current.page_num = 1;
        current.page_size = value;
        await loadPage();
    }

    /**
     * 进行一次请求
     */
    async function handlerConditionQuery() {
        const current = resolveParameters();
        current.page_num = pagination.value.page;
        current.page_size = pagination.value.size;
        await loadPage();
    }

    /**
     * 请求并渲染表格数据
     */
    async function loadPage() {
        // 请求层本身也会维护一份引用，这里额外保留到表格完成 DOM 更新，始终只显示一个全局遮罩。
        const sequence = ++requestSequence;
        const parametersSnapshot = { ...resolveParameters() };
        loading.value = true;
        showLoading();
        try {
            const result = await request(parametersSnapshot);
            // 旧查询或已卸载页面不能覆盖当前数据。
            if (sequence !== requestSequence || disposed) return;
            handleRequestResult(result);
            await nextTick();
        } finally {
            if (sequence === requestSequence && !disposed) loading.value = false;
            hideLoading();
        }
    }

    /**
     * 处理请求结果
     * @param response 响应内容
     */
    function handleRequestResult(response: Page<T>) {
        table_data.value = response.records ?? [];
        pagination.value.total = response.total ?? 0;
        pagination.value.size = response.size ?? 10;
        pagination.value.page = response.current ?? 1;
    }

    return {
        table_data,
        pagination,
        loading,
        handleCurrentChange,
        handleSizeChange,
        handlerConditionQuery
    };
}

export default useTable;
