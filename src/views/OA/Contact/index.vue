<script setup lang="ts">
import { Search } from "@element-plus/icons-vue";
import { ref } from "vue";

import { ContactApi } from "@/api/oa/contact-api.ts";
import useTable from "@/hooks/use-table.ts";

const condition = ref<ContactPageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<ContactVO>(
    ContactApi.page,
    condition.value
);
</script>

<template>
    <el-row class="box__search">
        <el-form :inline="true" :model="condition" @submit.prevent="handlerConditionQuery">
            <el-form-item label="关键词">
                <el-input
                    v-model="condition.keyword"
                    :prefix-icon="Search"
                    clearable
                    placeholder="姓名、账号、电话或邮箱"
                    style="width: 280px" />
            </el-form-item>
            <el-form-item><el-button type="primary" @click="handlerConditionQuery">查询</el-button></el-form-item>
        </el-form>
    </el-row>

    <el-row class="box__body">
        <el-table :data="table_data" height="92%" stripe>
            <el-table-column type="index" width="60" align="center" />
            <el-table-column label="姓名" min-width="130">
                <template #default="scope">{{ scope.row.real_name || scope.row.username }}</template>
            </el-table-column>
            <el-table-column label="账号" prop="username" min-width="140" />
            <el-table-column label="部门" prop="department_name" min-width="220" show-overflow-tooltip />
            <el-table-column label="手机号" prop="phone" min-width="140" />
            <el-table-column label="邮箱" prop="email" min-width="220" show-overflow-tooltip />
        </el-table>
        <el-pagination
            layout="total, sizes, prev, pager, next"
            :page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            style="padding: 0 10px; margin-left: auto"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;
}
.box__search .el-form-item {
    margin-bottom: 0;
}
.box__body {
    height: 90%;
}
</style>
