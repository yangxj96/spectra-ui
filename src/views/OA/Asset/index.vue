<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

import { AssetApi } from "@/api/oa/asset-api.ts";
import useTable from "@/hooks/use-table.ts";

const statusMap: Record<string, [string, "success" | "warning" | "danger" | "info" | "primary"]> = {
    DRAFT: ["草稿", "info"],
    IN_STOCK: ["库存", "success"],
    IN_USE: ["使用中", "primary"],
    MAINTENANCE: ["维修中", "warning"],
    SCRAPPED: ["已报废", "danger"]
};

const condition = ref<AssetPageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<AssetVO>(
    AssetApi.page,
    condition.value
);
const categories = ref<AssetCategoryVO[]>([]);
const dialogVisible = ref(false);
const form = reactive<AssetSaveParams>(emptyForm());

function emptyForm(): AssetSaveParams {
    return {
        name: "",
        asset_no: "",
        specification: "",
        serial_no: "",
        asset_type: "FIXED",
        quantity: 1,
        acquisition_date: new Date().toISOString().slice(0, 10),
        acquisition_amount: 0,
        currency: "CNY",
        supplier: "",
        location: "",
        remark: ""
    };
}

function statusLabel(status: string): string {
    return statusMap[status]?.[0] ?? status;
}

function statusType(status: string): "success" | "warning" | "danger" | "info" | "primary" {
    return statusMap[status]?.[1] ?? "info";
}

async function loadCategories(): Promise<void> {
    categories.value = await AssetApi.categories();
}

function openCreate(): void {
    Object.assign(form, emptyForm());
    dialogVisible.value = true;
}

async function saveDraft(): Promise<void> {
    if (!form.name.trim()) {
        ElMessage.warning("请输入资产名称");
        return;
    }
    await AssetApi.create({
        ...form,
        quantity: Number(form.quantity),
        acquisition_amount: Number(form.acquisition_amount || 0)
    });
    dialogVisible.value = false;
    ElMessage.success("资产已保存");
    handlerConditionQuery();
}

async function operate(row: AssetVO, action: "assign" | "return" | "transfer" | "maintenance"): Promise<void> {
    const labels = { assign: "领用位置", return: "归还原因", transfer: "调拨位置", maintenance: "维修内容" };
    const result = await ElMessageBox.prompt(`请输入${labels[action]}`, "资产生命周期操作", {
        inputPlaceholder: action === "maintenance" ? "如：更换硬盘" : "可填写位置或原因",
        confirmButtonText: "确认",
        cancelButtonText: "取消"
    });
    const value = result.value?.trim();
    let params: AssetOperationParams;
    if (action === "maintenance") {
        params = { maintenance_content: value, reason: value };
    } else if (action === "return") {
        params = { reason: value };
    } else {
        params = { to_location: value, reason: value };
    }
    await AssetApi[action === "return" ? "returnAsset" : action](row.id, params);
    ElMessage.success("操作已完成");
    handlerConditionQuery();
}

async function scrap(row: AssetVO): Promise<void> {
    await ElMessageBox.confirm(`确认报废资产“${row.name}”吗？`, "请确认", { type: "warning" });
    await AssetApi.scrap(row.id, { reason: "手工报废" });
    ElMessage.success("资产已报废");
    handlerConditionQuery();
}

async function createFromPurchase(): Promise<void> {
    const purchase = await ElMessageBox.prompt("请输入采购申请 ID", "从采购收货生成资产草稿", {
        confirmButtonText: "下一步",
        cancelButtonText: "取消"
    });
    const receipt = await ElMessageBox.prompt("请输入收货单 ID", "从采购收货生成资产草稿", {
        confirmButtonText: "生成",
        cancelButtonText: "取消"
    });
    const result = await AssetApi.fromPurchase({ purchase_id: purchase.value, receipt_id: receipt.value });
    ElMessage.success(`已生成 ${result.length} 条资产草稿`);
    handlerConditionQuery();
}

onMounted(loadCategories);
</script>

<template>
    <el-row class="box__search">
        <el-form :inline="true" :model="condition">
            <el-form-item label="关键字">
                <el-input v-model="condition.keyword" clearable placeholder="资产编号、名称或序列号" />
            </el-form-item>
            <el-form-item label="资产状态">
                <el-select v-model="condition.status" clearable placeholder="全部状态" style="width: 130px">
                    <el-option v-for="(value, key) in statusMap" :key="key" :label="value[0]" :value="key" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                <el-button @click="openCreate">新建资产</el-button>
                <el-button @click="createFromPurchase">采购收货转资产</el-button>
            </el-form-item>
        </el-form>
    </el-row>

    <el-row class="box__body">
        <el-table :data="table_data" height="92%" stripe>
            <el-table-column type="index" width="55" align="center" />
            <el-table-column label="资产编号" prop="asset_no" width="160" show-overflow-tooltip />
            <el-table-column label="资产名称" prop="name" min-width="180" show-overflow-tooltip />
            <el-table-column label="分类" prop="category_name" width="120" />
            <el-table-column label="数量" prop="quantity" width="80" />
            <el-table-column label="位置" prop="location" width="150" show-overflow-tooltip />
            <el-table-column label="状态" prop="status" width="110">
                <template #default="scope">
                    <el-tag :type="statusType(scope.row.status)">{{ statusLabel(scope.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="操作" fixed="right" width="350">
                <template #default="scope">
                    <el-button
                        v-if="scope.row.status !== 'SCRAPPED' && scope.row.status !== 'IN_USE'"
                        link
                        type="primary"
                        @click="operate(scope.row, 'assign')">
                        领用
                    </el-button>
                    <el-button
                        v-if="scope.row.status === 'IN_USE'"
                        link
                        type="success"
                        @click="operate(scope.row, 'return')">
                        归还
                    </el-button>
                    <el-button
                        v-if="scope.row.status !== 'SCRAPPED'"
                        link
                        type="warning"
                        @click="operate(scope.row, 'transfer')">
                        调拨
                    </el-button>
                    <el-button
                        v-if="scope.row.status !== 'SCRAPPED'"
                        link
                        type="info"
                        @click="operate(scope.row, 'maintenance')">
                        维修
                    </el-button>
                    <el-button v-if="scope.row.status !== 'SCRAPPED'" link type="danger" @click="scrap(scope.row)">
                        报废
                    </el-button>
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

    <el-dialog v-model="dialogVisible" title="新建资产" width="720px">
        <el-form label-width="110px">
            <el-form-item label="资产名称" required><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="资产编号"><el-input v-model="form.asset_no" placeholder="可稍后补充" /></el-form-item>
            <el-form-item label="资产分类">
                <el-select v-model="form.category_id" clearable placeholder="选择分类" style="width: 100%">
                    <el-option
                        v-for="category in categories"
                        :key="category.id"
                        :label="category.name"
                        :value="category.id" />
                </el-select>
            </el-form-item>
            <el-form-item label="规格型号"><el-input v-model="form.specification" /></el-form-item>
            <el-form-item label="数量">
                <el-input-number v-model="form.quantity" :min="0.001" :precision="3" />
            </el-form-item>
            <el-form-item label="购置日期">
                <el-date-picker v-model="form.acquisition_date" type="date" value-format="YYYY-MM-DD" />
            </el-form-item>
            <el-form-item label="购置金额">
                <el-input-number v-model="form.acquisition_amount" :min="0" :precision="2" />
            </el-form-item>
            <el-form-item label="供应商"><el-input v-model="form.supplier" /></el-form-item>
            <el-form-item label="存放位置"><el-input v-model="form.location" /></el-form-item>
            <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" /></el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="dialogVisible = false">取消</el-button>
            <el-button type="primary" @click="saveDraft">保存</el-button>
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
</style>
