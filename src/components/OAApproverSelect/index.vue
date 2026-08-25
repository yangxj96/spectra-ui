<script setup lang="ts">
import { onMounted, ref } from "vue";

import { ContactApi } from "@/api/oa/contact-api.ts";

defineOptions({ name: "OAApproverSelect" });

const model = defineModel<string>();
const loading = ref(false);
const options = ref<ContactVO[]>([]);

async function load(keyword?: string): Promise<void> {
    loading.value = true;
    try {
        options.value = (
            await ContactApi.page({ page_num: 1, page_size: 100, keyword: keyword?.trim() || undefined })
        ).records;
    } finally {
        loading.value = false;
    }
}

onMounted(() => load());
</script>

<template>
    <el-select
        v-model="model"
        filterable
        remote
        clearable
        reserve-keyword
        placeholder="选择审批人"
        :loading="loading"
        :remote-method="load"
        style="width: 200px">
        <el-option
            v-for="item in options"
            :key="item.id"
            :label="`${item.real_name}（${item.employee_no || item.username}）`"
            :value="item.username">
            <span>{{ item.real_name }}</span>
            <span class="employee-no">{{ item.employee_no || item.username }}</span>
            <span class="department">{{ item.department_name }}</span>
        </el-option>
    </el-select>
</template>

<style scoped>
.department {
    float: right;
    margin-left: 16px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.employee-no {
    margin-left: 8px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
}
</style>
