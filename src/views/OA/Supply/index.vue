<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { reactive, ref } from "vue";

import { SupplyApi } from "@/api/oa/supply-api.ts";
import useTable from "@/hooks/use-table.ts";

const statusMap: Record<string, [string, "success" | "warning" | "danger" | "info"]> = {
    ACTIVE: ["启用", "success"],
    INACTIVE: ["停用", "info"]
};

const condition = ref<SupplyPageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<SupplyItemVO>(
    SupplyApi.page,
    condition.value
);
const dialogVisible = ref(false);
const form = reactive<SupplySaveParams>(emptyForm());

function emptyForm(): SupplySaveParams {
    return {
        category: "办公耗材",
        sku: "",
        name: "",
        specification: "",
        unit: "件",
        min_stock: 0,
        status: "ACTIVE",
        supplier: "",
        location: "",
        remark: ""
    };
}

function openCreate(): void {
    Object.assign(form, emptyForm());
    dialogVisible.value = true;
}

function statusLabel(status: string): string {
    return statusMap[status]?.[0] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" {
    return statusMap[status]?.[1] ?? "info";
}

async function save(): Promise<void> {
    if (!form.sku.trim() || !form.name.trim() || !form.unit.trim()) {
        ElMessage.warning("请输入 SKU、名称和单位");
        return;
    }
    await SupplyApi.create({ ...form, min_stock: Number(form.min_stock || 0) });
    dialogVisible.value = false;
    ElMessage.success("办公用品已保存");
    handlerConditionQuery();
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
    <el-row class="box__search">
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
    </el-row>

    <el-row class="box__body">
        <el-table :data="table_data" height="92%" stripe>
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
    </el-row>

    <el-dialog v-model="dialogVisible" title="新建办公用品" width="650px">
        <el-form label-width="100px">
            <el-form-item label="SKU" required><el-input v-model="form.sku" /></el-form-item>
            <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="分类"><el-input v-model="form.category" /></el-form-item>
            <el-form-item label="规格"><el-input v-model="form.specification" /></el-form-item>
            <el-form-item label="单位" required><el-input v-model="form.unit" /></el-form-item>
            <el-form-item label="最低库存">
                <el-input-number v-model="form.min_stock" :min="0" :precision="3" />
            </el-form-item>
            <el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item>
            <el-form-item label="存放位置"><el-input v-model="form.location" /></el-form-item>
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="save">保存</el-button>
        </template>
    </el-dialog>
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;
}

.box__search .el-form-item {
    margin-bottom: 0;
}

.box__body {
    height: 90%;
}

.warning {
    color: #e6a23c;
    font-weight: 700;
}
</style>
