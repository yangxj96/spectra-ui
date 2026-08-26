<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";

import { MeetingApi } from "@/api/oa/meeting-api.ts";
import { toIsoDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const router = useRouter();
const form = reactive<MeetingCreateParams>({
    title: "",
    start_time: "",
    end_time: "",
    location: "",
    content: ""
});

async function create(): Promise<void> {
    if (!form.title.trim() || !form.start_time || !form.end_time) {
        MessageUtils.warning("请填写会议标题、开始时间和结束时间");
        return;
    }
    await MeetingApi.create({
        ...form,
        title: form.title.trim(),
        start_time: toIsoDateTime(form.start_time),
        end_time: toIsoDateTime(form.end_time)
    });
    MessageUtils.success("会议已创建");
    await router.push({ name: "OAMeeting" });
}
</script>

<template>
    <OaFormPage title="新建会议" description="填写会议安排和议题，保存后返回会议管理列表。" back-path="/oa/meeting">
        <el-form label-width="110px">
            <el-form-item label="标题" required>
                <el-input v-model="form.title" maxlength="100" show-word-limit />
            </el-form-item>
            <el-form-item label="开始时间" required>
                <el-date-picker
                    v-model="form.start_time"
                    type="datetime"
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    placeholder="选择开始时间" />
            </el-form-item>
            <el-form-item label="结束时间" required>
                <el-date-picker
                    v-model="form.end_time"
                    type="datetime"
                    value-format="YYYY-MM-DDTHH:mm:ss"
                    placeholder="选择结束时间" />
            </el-form-item>
            <el-form-item label="地点"><el-input v-model="form.location" /></el-form-item>
            <el-form-item label="议题"><el-input v-model="form.content" type="textarea" :rows="5" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/meeting')">取消</el-button>
            <el-button type="primary" @click="create">创建会议</el-button>
        </template>
    </OaFormPage>
</template>
