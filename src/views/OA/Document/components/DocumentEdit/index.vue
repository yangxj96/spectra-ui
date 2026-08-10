<script setup lang="ts">
import { ElMessage } from "element-plus";
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { DocumentApi } from "@/api/oa/document-api.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const editingId = computed(() => String(route.query.id ?? ""));
const loading = ref(false);
const folders = ref<DocumentFolderVO[]>([]);
const form = reactive<DocumentSaveParams>({
    title: "",
    summary: "",
    visibility: "DEPARTMENT",
    folder_id: String(route.query.folder_id ?? "") || undefined
});

async function load(): Promise<void> {
    folders.value = (await DocumentApi.folders()) || [];
    if (!editingId.value) return;
    loading.value = true;
    try {
        const row = await DocumentApi.get(editingId.value);
        Object.assign(form, {
            title: row.title,
            summary: row.summary || "",
            visibility: row.visibility,
            folder_id: row.folder_id || undefined
        });
    } finally {
        loading.value = false;
    }
}

async function save(): Promise<void> {
    if (!form.title.trim()) {
        ElMessage.warning("请输入文档标题");
        return;
    }
    const payload: DocumentSaveParams = {
        title: form.title.trim(),
        summary: form.summary?.trim() || undefined,
        visibility: form.visibility,
        folder_id: form.folder_id || undefined
    };
    if (editingId.value) await DocumentApi.update(editingId.value, payload);
    else await DocumentApi.create(payload);
    ElMessage.success("保存成功");
    await router.push({ name: "OADocument" });
}

onMounted(load);
</script>

<template>
    <OaFormPage
        :title="editingId ? '编辑文档' : '新建文档'"
        description="维护文档标题、目录和可见范围，文档版本可在列表中继续上传。"
        back-path="/oa/document">
        <el-form v-loading="loading" label-width="110px">
            <el-form-item label="标题" required>
                <el-input v-model="form.title" maxlength="160" show-word-limit />
            </el-form-item>
            <el-form-item label="目录">
                <el-select v-model="form.folder_id" clearable placeholder="选择目录">
                    <el-option v-for="item in folders" :key="item.id" :label="item.name" :value="item.id" />
                </el-select>
            </el-form-item>
            <el-form-item label="可见范围">
                <el-select v-model="form.visibility">
                    <el-option label="部门" value="DEPARTMENT" />
                    <el-option label="公开" value="PUBLIC" />
                    <el-option label="私有" value="PRIVATE" />
                </el-select>
            </el-form-item>
            <el-form-item label="摘要"><el-input v-model="form.summary" type="textarea" :rows="5" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/document')">取消</el-button>
            <el-button type="primary" :loading="loading" @click="save">保存</el-button>
        </template>
    </OaFormPage>
</template>
