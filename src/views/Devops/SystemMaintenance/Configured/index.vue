<script setup lang="ts">
import { reactive, ref } from "vue";

import { ConfiguredApi } from "@/api/system/configured-api.ts";
import DictTag from "@/components/DictTag/index.vue";
import { configuredConverter } from "@/converter/configured-converter.ts";
import useTable from "@/hooks/use-table.ts";
import ConfiguredEdit from "@/views/Devops/SystemMaintenance/Configured/components/ConfiguredEdit/index.vue";

const edit = reactive({
    show: false,
    form: configuredConverter.createForm()
});

// 查询条件
const condition = ref<ConfiguredPageParams>({
    page_num: 1,
    page_size: 15
});

// table分页请求
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } =
    useTable<ConfiguredPageVO>(ConfiguredApi.page, condition.value);

const handleSearch = () => {
    condition.value.key = condition.value.key?.trim();
    condition.value.page_num = 1;
    pagination.value.page = 1;
    handlerConditionQuery();
};

const handleReset = () => {
    condition.value.key = undefined;
    condition.value.page_num = 1;
    pagination.value.page = 1;
    handlerConditionQuery();
};

const handleDefaultPasswordSearch = () => {
    condition.value.key = "user.default-password";
    condition.value.page_num = 1;
    pagination.value.page = 1;
    handlerConditionQuery();
};

// 处理dialog框关闭,如果有其他的dialog也在这里处理关闭
const handleDialogClose = () => {
    if (edit.show) {
        edit.show = false;
        edit.form = configuredConverter.createForm();
    }
    // 最后重新获取下列表数据
    handlerConditionQuery();
};

const handleConfiguredEdit = (row: ConfiguredPageVO) => {
    edit.form = configuredConverter.toForm(row);
    edit.show = false;
    setTimeout(() => {
        edit.show = true;
    }, 0);
};
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box__search">
        <el-form :inline="true" @submit.prevent>
            <el-form-item label="配置键" prop="key">
                <el-input
                    v-model="condition.key"
                    placeholder="输入配置键，例如 user.default-password"
                    clearable
                    @keyup.enter="handleSearch" />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handleSearch">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
                <el-button @click="handleDefaultPasswordSearch">默认密码设置</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <el-table :data="table_data" height="95%" stripe default-expand-all row-key="id">
            <el-table-column align="center" type="index" label="序号" width="100" />
            <el-table-column align="center" prop="id" label="主键" />
            <el-table-column align="center" prop="key" label="配置键">
                <template #default="scope">
                    <div>{{ scope.row.key }}</div>
                    <el-tag v-if="scope.row.key === 'user.default-password'" type="info" effect="plain" size="small">
                        新用户默认密码
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="value" label="配置值">
                <template v-slot:default="scope">
                    <!-- 布尔类型 -->
                    <el-tag v-if="scope.row.type === 'BOOL'" :type="scope.row.value === 'true' ? 'success' : 'danger'">
                        {{ scope.row.value === "true" ? "启用" : "禁用" }}
                    </el-tag>
                    <el-tag
                        v-else-if="scope.row.type === 'SECRET'"
                        :type="scope.row.configured ? 'success' : 'warning'">
                        {{ scope.row.configured ? "已设置" : "未设置" }}
                    </el-tag>
                    <!-- 下拉选择的类型 -->
                    <DictTag
                        v-else-if="scope.row.type === 'SELECT'"
                        v-model="scope.row.value"
                        :dict_code="scope.row.dict_code" />
                    <!-- TEXT保底 -->
                    <el-tooltip
                        v-else
                        :content="String(scope.row.value ?? '')"
                        placement="top"
                        :disabled="!scope.row.value || String(scope.row.value).length <= 50"
                        :popper-options="{ strategy: 'fixed' }"
                        popper-class="configured-value-tooltip">
                        <span class="configured-value-text">{{ scope.row.value }}</span>
                    </el-tooltip>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="remarks" label="备注" />
            <el-table-column align="center" label="操作">
                <template #default="scope">
                    <el-button
                        v-permission="'security:config:update'"
                        link
                        type="primary"
                        size="small"
                        @click="handleConfiguredEdit(scope.row)">
                        编辑
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
        <!-- 分页 -->
        <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            layout="total, sizes, prev, pager, next"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            style="padding: 0 10px; margin-left: auto"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
    <!-- 用户组件区 -->
    <ConfiguredEdit v-if="edit.show" :show="edit.show" :form="edit.form" @close="handleDialogClose" />
</template>

<style lang="scss">
.configured-value-tooltip {
    max-width: 400px;
    max-height: 300px;
    overflow-y: auto;
    word-break: break-all;
}
</style>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;
}

.box__body {
    height: 90%;
}

.configured-value-text {
    display: inline-block;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    vertical-align: middle;
}
</style>
