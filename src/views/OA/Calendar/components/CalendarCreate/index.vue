<script setup lang="ts">
import { reactive } from "vue";
import { useRouter } from "vue-router";

import { CalendarApi } from "@/api/oa/calendar-api.ts";
import { toIsoDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const router = useRouter();
const form = reactive<CalendarSaveParams>({
    title: "",
    content: "",
    start_time: "",
    end_time: "",
    all_day: false,
    visibility: "PRIVATE",
    location: ""
});

async function create(): Promise<void> {
    if (!form.title.trim() || !form.start_time || !form.end_time) {
        MessageUtils.warning("请填写日程标题、开始时间和结束时间");
        return;
    }
    await CalendarApi.create({
        ...form,
        title: form.title.trim(),
        start_time: toIsoDateTime(form.start_time),
        end_time: toIsoDateTime(form.end_time)
    });
    MessageUtils.success("日程已创建");
    await router.push({ name: "OACalendar" });
}
</script>

<template>
    <OaFormPage title="新建日程" description="安排个人或部门日程，保存后返回日历管理列表。" back-path="/oa/calendar">
        <el-form label-width="110px">
            <el-form-item label="标题" required>
                <el-input v-model="form.title" maxlength="100" show-word-limit />
            </el-form-item>
            <el-form-item label="开始时间" required>
                <el-date-picker v-model="form.start_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
            <el-form-item label="结束时间" required>
                <el-date-picker v-model="form.end_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
            <el-form-item label="共享范围">
                <el-select v-model="form.visibility">
                    <el-option label="私有" value="PRIVATE" />
                    <el-option label="部门" value="DEPARTMENT" />
                    <el-option label="全员" value="ALL" />
                </el-select>
            </el-form-item>
            <el-form-item label="地点"><el-input v-model="form.location" /></el-form-item>
            <el-form-item label="备注"><el-input v-model="form.content" type="textarea" :rows="5" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/calendar')">取消</el-button>
            <el-button type="primary" @click="create">创建日程</el-button>
        </template>
    </OaFormPage>
</template>
