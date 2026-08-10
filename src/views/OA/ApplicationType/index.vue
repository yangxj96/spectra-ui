<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { ApplicationApi } from "@/api/oa/application-api.ts";
import OaListPage from "@/views/OA/components/OaListPage/index.vue";

const loading = ref(false);
const rows = ref<ApplicationTypeVO[]>([]);
const router = useRouter();

async function load() {
    loading.value = true;
    try {
        rows.value = (await ApplicationApi.listAllTypes()) || [];
    } finally {
        loading.value = false;
    }
}

function openCreate() {
    router.push({ name: "OAApplicationTypeEdit" });
}

function openEdit(row: ApplicationTypeVO) {
    router.push({ name: "OAApplicationTypeEdit", query: { id: row.id } });
}

async function remove(row: ApplicationTypeVO) {
    await ElMessageBox.confirm(`确认删除申请类型“${row.name}”吗？`, "删除确认", { type: "warning" });
    await ApplicationApi.deleteType(row.id);
    ElMessage.success("删除成功");
    await load();
}

onMounted(load);
</script>

<template>
    <OaListPage>
        <template #search>
            <el-form :inline="true">
                <el-form-item><span class="page-label">申请类型配置</span></el-form-item>
                <el-button v-owner="'OA_APPLICATION_TYPE:INSERT'" type="primary" @click="openCreate">
                    新建类型
                </el-button>
            </el-form>
        </template>
        <el-table v-loading="loading" :data="rows" stripe>
            <el-table-column prop="code" label="编码" min-width="180" />
            <el-table-column prop="name" label="名称" min-width="150" />
            <el-table-column prop="process_definition_key" label="流程 Key" min-width="220" show-overflow-tooltip />
            <el-table-column prop="form_definition_id" label="表单 ID" min-width="220" show-overflow-tooltip />
            <el-table-column prop="sort_order" label="排序" width="80" />
            <el-table-column label="启用" width="90">
                <template #default="scope">
                    <el-tag :type="scope.row.enabled ? 'success' : 'info'">
                        {{ scope.row.enabled ? "是" : "否" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="170" fixed="right">
                <template #default="scope">
                    <el-button v-owner="'OA_APPLICATION_TYPE:UPDATE'" link type="primary" @click="openEdit(scope.row)">
                        编辑
                    </el-button>
                    <el-button v-owner="'OA_APPLICATION_TYPE:DELETE'" link type="danger" @click="remove(scope.row)">
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </OaListPage>
</template>

<style scoped lang="scss">
.page-label {
    color: var(--el-text-color-primary);
    font-weight: 600;
}
</style>
