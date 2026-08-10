<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { ApplicationApi } from "@/api/oa/application-api.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const editingId = computed(() => String(route.query.id ?? ""));
const loading = ref(false);
const form = reactive<ApplicationTypeSaveParams>({
    code: "",
    name: "",
    form_definition_id: "",
    process_definition_key: "",
    enabled: true,
    sort_order: 0,
    description: ""
});

async function load(): Promise<void> {
    if (!editingId.value) return;
    loading.value = true;
    try {
        const row = (await ApplicationApi.listAllTypes()).find(item => item.id === editingId.value);
        if (!row) return;
        Object.assign(form, {
            code: row.code,
            name: row.name,
            form_definition_id: row.form_definition_id || "",
            process_definition_key: row.process_definition_key || "",
            enabled: row.enabled,
            sort_order: row.sort_order,
            description: row.description || ""
        });
    } finally {
        loading.value = false;
    }
}

async function save(): Promise<void> {
    const payload: ApplicationTypeSaveParams = {
        code: form.code.trim(),
        name: form.name.trim(),
        form_definition_id: form.form_definition_id?.trim() || undefined,
        process_definition_key: form.process_definition_key?.trim() || undefined,
        enabled: form.enabled,
        sort_order: form.sort_order,
        description: form.description?.trim() || undefined
    };
    if (!payload.code || !payload.name) {
        ElMessage.warning("请填写申请类型编码和名称");
        return;
    }
    if (editingId.value) await ApplicationApi.updateType(editingId.value, payload);
    else await ApplicationApi.createType(payload);
    ElMessage.success("保存成功");
    await router.push({ name: "OAApplicationTypes" });
}

onMounted(load);
</script>

<template>
    <OaFormPage
        :title="editingId ? '编辑申请类型' : '新建申请类型'"
        description="维护申请编码与表单、流程定义的映射。"
        back-path="/oa/application-types">
        <el-form v-loading="loading" label-width="110px">
            <el-form-item label="编码" required>
                <el-input v-model="form.code" :disabled="Boolean(editingId)" placeholder="如 travel" />
            </el-form-item>
            <el-form-item label="名称" required><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="表单定义 ID"><el-input v-model="form.form_definition_id" /></el-form-item>
            <el-form-item label="流程定义 Key"><el-input v-model="form.process_definition_key" /></el-form-item>
            <el-form-item label="排序"><el-input-number v-model="form.sort_order" :min="0" /></el-form-item>
            <el-form-item label="启用"><el-switch v-model="form.enabled" /></el-form-item>
            <el-form-item label="说明"><el-input v-model="form.description" type="textarea" :rows="4" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/application-types')">取消</el-button>
            <el-button type="primary" :loading="loading" @click="save">保存</el-button>
        </template>
    </OaFormPage>
</template>
