<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { ref } from "vue";
import { useRouter } from "vue-router";

import { SupplyApi } from "@/api/oa/supply-api.ts";
import useTable from "@/hooks/use-table.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const statusMap: Record<string, [string, "success" | "warning" | "danger" | "info"]> = {
    ACTIVE: ["启用", "success"],
    INACTIVE: ["停用", "info"]
};

const condition = ref<SupplyPageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<SupplyItemVO>(
    SupplyApi.page,
    condition.value
);
const router = useRouter();

function openCreate(): void {
    router.push({ name: "OASupplyCreate" });
}

function statusLabel(status: string): string {
    return statusMap[status]?.[0] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" {
    return statusMap[status]?.[1] ?? "info";
}

async function operate(row: SupplyItemVO, action: "inbound" | "issue" | "returnStock" | "adjust"): Promise<void> {
    const labels = { inbound: "入库数量", issue: "领用数量", returnStock: "退库数量", adjust: "调整后库存" };
    const result = await ElMessageBox.prompt(`请输入${labels[action]}`, "库存操作", {
        inputValue: action === "adjust" ? String(row.current_stock) : "1",
        inputPlaceholder: "请输入数字",
        confirmButtonText: "确认",
        cancelButtonText: "取消",
        inputPattern: /^\d+(\.\d+)?$/,
        inputErrorMessage: "请输入非负数字"
    });
    const value = Number(result.value);
    const params = action === "adjust" ? { target_stock: value, reason: "盘点调整" } : { quantity: value };
    await SupplyApi[action](row.id, params);
    ElMessage.success("库存操作已完成");
    handlerConditionQuery();
}

function toggleLowStock(value: boolean | string | number): void {
    condition.value.low_stock = Boolean(value);
    handlerConditionQuery();
}
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true" :model="condition">
                <el-form-item label="关键字">
                    <el-input v-model="condition.keyword" clearable placeholder="SKU、名称或规格" />
                </el-form-item>
                <el-form-item label="库存预警">
                    <el-switch v-model="condition.low_stock" active-text="仅看低库存" @change="toggleLowStock" />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="openCreate">新建用品</el-button>
                </el-form-item>
            </el-form>
        </template>
        <el-table :data="table_data" stripe>
            <el-table-column type="index" width="55" align="center" />
            <el-table-column label="SKU" prop="sku" width="150" show-overflow-tooltip />
            <el-table-column label="用品名称" prop="name" min-width="180" show-overflow-tooltip />
            <el-table-column label="分类" prop="category" width="120" />
            <el-table-column label="规格" prop="specification" width="150" show-overflow-tooltip />
            <el-table-column label="库存" width="150">
                <template #default="scope">
                    <span :class="{ warning: scope.row.low_stock }">
                        {{ scope.row.current_stock }} {{ scope.row.unit }} / 最低 {{ scope.row.min_stock }}
                    </span>
                </template>
            </el-table-column>
            <el-table-column label="位置" prop="location" width="140" show-overflow-tooltip />
            <el-table-column label="状态" prop="status" width="90">
                <template #default="scope">
                    <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="300">
                <template #default="scope">
                    <el-button link type="primary" @click="operate(scope.row, 'inbound')">入库</el-button>
                    <el-button link type="warning" @click="operate(scope.row, 'issue')">领用</el-button>
                    <el-button link type="success" @click="operate(scope.row, 'returnStock')">退库</el-button>
                    <el-button link type="info" @click="operate(scope.row, 'adjust')">盘点</el-button>
                </template>
            </el-table-column>
        </el-table>
        <el-pagination
            layout="total, sizes, prev, pager, next"
            :page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            style="padding: 0 10px; margin-left: auto"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </OaListPage>
</template>

<style scoped lang="scss">
.warning {
    color: #e6a23c;
    font-weight: 700;
}
</style>
