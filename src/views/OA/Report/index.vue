<script setup lang="ts">
import { ElMessage } from "element-plus";
import { onMounted, ref } from "vue";

import { ReportApi } from "@/api/oa/report-api.ts";

const loading = ref(false);
const rows = ref<DepartmentStatsVO[]>([]);

async function loadStats(): Promise<void> {
    loading.value = true;
    try {
        rows.value = await ReportApi.departmentStats();
    } finally {
        loading.value = false;
    }
}

async function exportStats(): Promise<void> {
    await ReportApi.exportDepartmentStats();
    ElMessage.success("部门统计已导出");
}

onMounted(loadStats);
</script>

<template>
    <div class="oa-page">
        <el-card>
            <div class="oa-header">
                <span class="oa-title">部门统计</span>
                <span class="oa-description">汇总资产、办公用品、报销和采购数据</span>
                <el-button class="oa-action" type="primary" :loading="loading" @click="exportStats">
                    导出 Excel
                </el-button>
            </div>
        </el-card>
        <el-card class="oa-body">
            <el-table v-loading="loading" :data="rows" height="100%" stripe>
                <el-table-column type="index" width="55" align="center" />
                <el-table-column label="部门" prop="department_name" min-width="180" show-overflow-tooltip />
                <el-table-column label="资产条目数" prop="asset_count" width="110" align="right" />
                <el-table-column label="资产数量" prop="asset_quantity" width="110" align="right" />
                <el-table-column label="资产金额" prop="asset_value" width="130" align="right">
                    <template #default="scope">{{ scope.row.asset_value.toFixed(2) }}</template>
                </el-table-column>
                <el-table-column label="办公用品 SKU" prop="supply_sku_count" width="125" align="right" />
                <el-table-column label="当前库存" prop="supply_stock" width="110" align="right" />
                <el-table-column label="最低库存" prop="supply_min_stock" width="110" align="right" />
                <el-table-column label="报销单数" prop="reimbursement_count" width="105" align="right" />
                <el-table-column label="报销金额" prop="reimbursement_amount" width="125" align="right">
                    <template #default="scope">{{ scope.row.reimbursement_amount.toFixed(2) }}</template>
                </el-table-column>
                <el-table-column label="采购申请数" prop="purchase_count" width="115" align="right" />
                <el-table-column label="采购预算" prop="purchase_budget" width="125" align="right">
                    <template #default="scope">{{ scope.row.purchase_budget.toFixed(2) }}</template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<style scoped lang="scss">
.oa-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    height: 100%;
}

.oa-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.oa-title {
    font-size: 16px;
    font-weight: 600;
}

.oa-description {
    color: var(--el-text-color-secondary);
    font-size: 13px;
}

.oa-action {
    margin-left: auto;
}

.oa-body {
    flex: 1;
    min-height: 0;
}
</style>
