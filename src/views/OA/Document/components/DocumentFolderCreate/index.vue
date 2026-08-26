<script setup lang="ts">
import { reactive } from "vue";
import { useRoute, useRouter } from "vue-router";

import { DocumentApi } from "@/api/oa/document-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const form = reactive<DocumentFolderSaveParams>({
    pid: String(route.query.pid ?? "") || undefined,
    name: "",
    visibility: "DEPARTMENT",
    sort: 0
});

async function save(): Promise<void> {
    if (!form.name.trim()) {
        MessageUtils.warning("请输入目录名称");
        return;
    }
    await DocumentApi.createFolder({ ...form, name: form.name.trim() });
    MessageUtils.success("目录已创建");
    await router.push({ name: "OADocument" });
}
</script>

<template>
    <OaFormPage title="新建文档目录" description="创建文档归档目录，保存后返回文档管理列表。" back-path="/oa/document">
        <el-form label-width="110px">
            <el-form-item label="目录名称" required><el-input v-model="form.name" /></el-form-item>
            <el-form-item label="可见范围">
                <el-select v-model="form.visibility">
                    <el-option label="部门" value="DEPARTMENT" />
                    <el-option label="公开" value="PUBLIC" />
                    <el-option label="私有" value="PRIVATE" />
                </el-select>
            </el-form-item>
            <el-form-item label="排序"><el-input-number v-model="form.sort" :min="0" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/document')">取消</el-button>
            <el-button type="primary" @click="save">保存</el-button>
        </template>
    </OaFormPage>
</template>
