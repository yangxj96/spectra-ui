<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";

import { ContactApi } from "@/api/oa/contact-api.ts";

defineOptions({ name: "OAApproverSelect" });

const model = defineModel<string>();
const loading = ref(false);
const options = ref<ContactVO[]>([]);

let requestSequence = 0;
let disposed = false;

async function load(keyword?: string): Promise<void> {
    const sequence = ++requestSequence;
    loading.value = true;
    try {
        const result = await ContactApi.page({
            page_num: 1,
            page_size: 100,
            keyword: keyword?.trim() || undefined
        });
        // 迟到的远程查询不能覆盖最新关键字的结果。
        if (sequence === requestSequence && !disposed) options.value = result.records;
    } catch {
        // 请求层已统一提示错误；保留当前选项供用户继续操作。
    } finally {
        if (sequence === requestSequence && !disposed) loading.value = false;
    }
}

onMounted(() => load());

onUnmounted(() => {
    disposed = true;
    requestSequence++;
});
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
            <span class="department">
                {{
                    [
                        item.primary_department_name,
                        ...(item.associated_departments?.map(department => department.name) ?? [])
                    ]
                        .filter(Boolean)
                        .join("、")
                }}
            </span>
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
