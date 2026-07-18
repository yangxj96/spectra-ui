<script setup lang="ts">
import { reactive } from "vue";

import { useNotificationStore } from "@/plugin/store/modules/use-notification-store.ts";

defineOptions({
    name: "NotificationSearch"
});

const emit = defineEmits<{
    search: [params: NotificationQueryParams];
    reset: [];
}>();

const notificationStore = useNotificationStore();

const searchForm = reactive({
    keyword: "",
    type: "" as NotificationType | "all",
    is_read: "" as boolean | "",
    dateRange: [] as string[]
});

/** 查询 */
function handleSearch(): void {
    const params: NotificationQueryParams = {
        page_num: 1,
        page_size: 10
    };

    if (searchForm.keyword) {
        params.keyword = searchForm.keyword;
    }
    if (searchForm.type) {
        params.type = searchForm.type;
    }
    if (searchForm.is_read !== "") {
        params.is_read = searchForm.is_read === "true";
    }
    if (searchForm.dateRange && searchForm.dateRange.length === 2) {
        params.start_time = searchForm.dateRange[0];
        params.end_time = searchForm.dateRange[1];
    }

    emit("search", params);
}

/** 重置 */
function handleReset(): void {
    searchForm.keyword = "";
    searchForm.type = "";
    searchForm.is_read = "";
    searchForm.dateRange = [];
    emit("reset");
}
</script>

<template>
    <el-form :model="searchForm" inline label-width="80px">
        <el-form-item label="关键词">
            <el-input v-model="searchForm.keyword" placeholder="搜索标题或内容" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="消息类型">
            <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 140px">
                <el-option label="全部" value="" />
                <el-option
                    v-for="item in notificationStore.typeConfigs"
                    :key="item.type"
                    :label="item.label"
                    :value="item.type" />
            </el-select>
        </el-form-item>
        <el-form-item label="状态">
            <el-select v-model="searchForm.is_read" placeholder="全部" clearable style="width: 120px">
                <el-option label="全部" value="" />
                <el-option label="已读" value="true" />
                <el-option label="未读" value="false" />
            </el-select>
        </el-form-item>
        <el-form-item label="时间范围">
            <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                value-format="YYYY-MM-DD"
                style="width: 260px" />
        </el-form-item>
        <el-form-item>
            <el-button type="primary" @click="handleSearch">查询</el-button>
            <el-button @click="handleReset">重置</el-button>
        </el-form-item>
    </el-form>
</template>
