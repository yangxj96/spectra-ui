<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";

import { LeaveApi } from "@/api/oa/leave-api.ts";
import { toIsoDateTime } from "@/utils/date-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import OaFormPage from "@/views/OA/components/OaFormPage/index.vue";

const route = useRoute();
const router = useRouter();
const editingId = computed(() => String(route.query.id ?? ""));
const loading = ref(false);
const form = reactive<LeaveCreateParams>({
    leave_type_code: "annual",
    start_time: "",
    end_time: "",
    reason: "",
    contact_address: "",
    calculate_duration: true
});

function reset(): void {
    Object.assign(form, {
        leave_type_code: "annual",
        start_time: "",
        end_time: "",
        reason: "",
        contact_address: "",
        calculate_duration: true
    });
}

async function load(): Promise<void> {
    reset();
    if (!editingId.value) return;
    loading.value = true;
    try {
        const row = await LeaveApi.get(editingId.value);
        Object.assign(form, {
            leave_type_code: row.leave_type_code,
            start_time: row.start_time,
            end_time: row.end_time,
            reason: row.reason,
            contact_address: row.contact_address || "",
            calculate_duration: true
        });
    } finally {
        loading.value = false;
    }
}

async function saveDraft(): Promise<void> {
    if (!form.start_time || !form.end_time || !form.reason.trim()) {
        MessageUtils.warning("请填写时间和请假事由");
        return;
    }
    const params = {
        ...form,
        reason: form.reason.trim(),
        start_time: toIsoDateTime(form.start_time),
        end_time: toIsoDateTime(form.end_time)
    };
    if (editingId.value) await LeaveApi.update(editingId.value, params);
    else await LeaveApi.create(params);
    MessageUtils.success(editingId.value ? "请假申请已更新" : "已保存为草稿");
    await router.push({ name: "OALeave" });
}

onMounted(load);
</script>

<template>
    <OaFormPage
        :title="editingId ? '编辑请假申请' : '新建请假申请'"
        description="填写请假信息，保存后可在列表中提交审批。"
        back-path="/oa/leave">
        <el-form v-loading="loading" label-width="110px">
            <el-form-item label="请假类型" required>
                <el-select v-model="form.leave_type_code">
                    <el-option label="年假" value="annual" />
                    <el-option label="病假" value="sick" />
                    <el-option label="事假" value="personal" />
                </el-select>
            </el-form-item>
            <el-form-item label="开始时间" required>
                <el-date-picker v-model="form.start_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
            <el-form-item label="结束时间" required>
                <el-date-picker v-model="form.end_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
            </el-form-item>
            <el-form-item label="请假事由" required>
                <el-input v-model="form.reason" type="textarea" :rows="5" />
            </el-form-item>
            <el-form-item label="联系地址"><el-input v-model="form.contact_address" /></el-form-item>
        </el-form>

        <template #actions>
            <el-button @click="router.push('/oa/leave')">取消</el-button>
            <el-button type="primary" :loading="loading" @click="saveDraft">保存草稿</el-button>
        </template>
    </OaFormPage>
</template>
