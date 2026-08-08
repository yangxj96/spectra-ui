<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, reactive, ref } from "vue";

import { ApplicationApi } from "@/api/oa/application-api.ts";

const loading = ref(false);
const rows = ref<ApplicationTypeVO[]>([]);
const dialog = reactive({
    visible: false,
    id: "",
    code: "",
    name: "",
    form_definition_id: "",
    process_definition_key: "",
    enabled: true,
    sort_order: 0,
    description: ""
});

async function load() {
    loading.value = true;
    try {
        rows.value = (await ApplicationApi.listAllTypes()) || [];
    } finally {
        loading.value = false;
    }
}

function openCreate() {
    Object.assign(dialog, {
        visible: true,
        id: "",
        code: "",
        name: "",
        form_definition_id: "",
        process_definition_key: "",
        enabled: true,
        sort_order: rows.value.length,
        description: ""
    });
}

function openEdit(row: ApplicationTypeVO) {
    Object.assign(dialog, {
        visible: true,
        id: row.id,
        code: row.code,
        name: row.name,
        form_definition_id: row.form_definition_id || "",
        process_definition_key: row.process_definition_key || "",
        enabled: row.enabled,
        sort_order: row.sort_order,
        description: row.description || ""
    });
}

async function save() {
    const payload: ApplicationTypeSaveParams = {
        code: dialog.code.trim(),
        name: dialog.name.trim(),
        form_definition_id: dialog.form_definition_id.trim() || undefined,
        process_definition_key: dialog.process_definition_key.trim() || undefined,
        enabled: dialog.enabled,
        sort_order: dialog.sort_order,
        description: dialog.description.trim() || undefined
    };
    if (!payload.code || !payload.name) {
        ElMessage.warning("请填写申请类型编码和名称");
        return;
    }
    if (dialog.id) await ApplicationApi.updateType(dialog.id, payload);
    else await ApplicationApi.createType(payload);
    dialog.visible = false;
    ElMessage.success("保存成功");
    await load();
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
    <div class="oa-page">
        <el-card shadow="never">
            <div class="toolbar">
                <div>
                    <h3>申请类型配置</h3>
                    <p>维护申请编码与表单、流程定义的映射，供申请中心和工作台快捷入口使用。</p>
                </div>
                <el-button v-owner="'OA_APPLICATION_TYPE:INSERT'" type="primary" @click="openCreate">
                    新建类型
                </el-button>
            </div>
        </el-card>
        <el-card class="oa-body" shadow="never">
            <el-table v-loading="loading" :data="rows" border stripe height="100%">
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
        </el-card>
    </div>

    <el-dialog v-model="dialog.visible" :title="dialog.id ? '编辑申请类型' : '新建申请类型'" width="560px">
        <el-form label-width="120px">
            <el-form-item label="编码" required>
                <el-input v-model="dialog.code" :disabled="Boolean(dialog.id)" placeholder="如 travel" />
            </el-form-item>
            <el-form-item label="名称" required><el-input v-model="dialog.name" /></el-form-item>
            <el-form-item label="表单定义 ID"><el-input v-model="dialog.form_definition_id" /></el-form-item>
            <el-form-item label="流程定义 Key"><el-input v-model="dialog.process_definition_key" /></el-form-item>
            <el-form-item label="排序"><el-input-number v-model="dialog.sort_order" :min="0" /></el-form-item>
            <el-form-item label="启用"><el-switch v-model="dialog.enabled" /></el-form-item>
            <el-form-item label="说明"><el-input v-model="dialog.description" type="textarea" :rows="3" /></el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="dialog.visible = false">取消</el-button>
            <el-button type="primary" @click="save">保存</el-button>
        </template>
    </el-dialog>
</template>

<style scoped lang="scss">
.oa-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    height: 100%;
}
.oa-body {
    flex: 1;
    min-height: 0;
}
.toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
h3 {
    margin: 0;
}
p {
    margin: 8px 0 0;
    color: var(--el-text-color-secondary);
}
</style>
