<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";

import { NoticeApi } from "@/api/oa/notice-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const router = useRouter();
const form = reactive<NoticeCreateParams>({
    title: "",
    summary: "",
    content: "",
    target_type: "ALL",
    required_read: false
});

async function createAndPublish(): Promise<void> {
    if (!form.title.trim() || !form.content.trim()) {
        MessageUtils.warning("请填写公告标题和内容");
        return;
    }
    const notice = await NoticeApi.create({ ...form, title: form.title.trim(), content: form.content.trim() });
    await NoticeApi.publish(notice.id);
    MessageUtils.success("公告已发布");
    await router.push({ name: "OANotice" });
}
</script>

<template>
    <OaFormPage title="发布公告" description="填写公告内容并选择发布范围，保存后立即发布。" back-path="/oa/notice">
        <el-form label-width="110px">
            <el-form-item label="标题" required>
                <el-input v-model="form.title" maxlength="100" show-word-limit />
            </el-form-item>
            <el-form-item label="摘要">
                <el-input v-model="form.summary" maxlength="200" show-word-limit />
            </el-form-item>
            <el-form-item label="内容" required>
                <el-input v-model="form.content" type="textarea" :rows="12" />
            </el-form-item>
            <el-form-item label="发布范围">
                <el-select v-model="form.target_type">
                    <el-option label="全员" value="ALL" />
                    <el-option label="部门" value="DEPARTMENT" />
                </el-select>
            </el-form-item>
            <el-form-item label="必读"><el-switch v-model="form.required_read" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/notice')">取消</el-button>
            <el-button type="primary" @click="createAndPublish">保存并发布</el-button>
        </template>
    </OaFormPage>
</template>
