<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref } from "vue";

import { ConfiguredApi } from "@/api/system/configured-api.ts";
import { CryptoApi } from "@/api/system/crypto-api.ts";
import DictTag from "@/components/DictTag/index.vue";
import { configuredConverter } from "@/converter/configured-converter.ts";
import useTable from "@/hooks/use-table.ts";
import ConfiguredEdit from "@/views/System/Configured/components/ConfiguredEdit/index.vue";

const edit = ref<{
    show: boolean;
    form: ConfiguredForm;
}>({
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

onMounted(() => {});

// 处理dialog框关闭,如果有其他的dialog也在这里处理关闭
const handleDialogClose = () => {
    if (edit.value.show) {
        edit.value = {
            show: false,
            form: configuredConverter.createForm()
        };
    }
    // 最后重新获取下列表数据
    handlerConditionQuery();
};

const handleConfiguredAdd = () => {
    edit.value.form = configuredConverter.createForm();
    edit.value.show = true;
};

const handleConfiguredEdit = (row: ConfiguredPageVO) => {
    edit.value.form = configuredConverter.toForm(row);
    edit.value.show = true;
};

const handleGenerateKeyPair = async () => {
    try {
        await ElMessageBox.confirm(
            "此操作将重新生成两对 RSA 密钥对（服务端 + 客户端），现有密钥将立即失效。确认继续？",
            "生成 RSA 密钥对",
            { confirmButtonText: "确认生成", cancelButtonText: "取消", type: "warning" }
        );
        await CryptoApi.generateKeyPair();
        ElMessage.success("RSA 密钥对已生成并生效");
        await handlerConditionQuery();
    } catch (e: unknown) {
        if (e !== "cancel") {
            ElMessage.error(e instanceof Error ? e.message : "生成失败");
        }
    }
};
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box__search">
        <el-form :inline="true">
            <el-form-item label="菜单名称" prop="name">
                <el-input placeholder="请输入菜单名称" clearable />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handlerConditionQuery()">查询</el-button>
                <el-button>重置</el-button>
                <el-button type="primary" @click="handleConfiguredAdd()">新增</el-button>
                <el-button v-owner="'ROLE:ROLE_DEV_OPS'" type="danger" plain @click="handleGenerateKeyPair()">
                    生成RSA密钥对
                </el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <el-table :data="table_data" height="95%" stripe default-expand-all row-key="id">
            <el-table-column align="center" type="index" label="序号" width="100" />
            <el-table-column align="center" prop="id" label="主键" />
            <el-table-column align="center" prop="key" label="配置键" />
            <el-table-column align="center" prop="value" label="配置值">
                <template v-slot:default="scope">
                    <!-- 布尔类型 -->
                    <el-tag v-if="scope.row.type === 'BOOL'" :type="scope.row.value === 'true' ? 'success' : 'danger'">
                        {{ scope.row.value === "true" ? "启用" : "禁用" }}
                    </el-tag>
                    <!-- 下拉选择的类型 -->
                    <DictTag
                        v-else-if="scope.row.type === 'SELECT'"
                        v-model="scope.row.value"
                        :dict_code="scope.row.dict_code" />
                    <!-- TEXT保底 -->
                    <el-text v-else>
                        {{ scope.row.value }}
                    </el-text>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="remarks" label="备注" />
            <el-table-column align="center" label="操作">
                <template #default="scope">
                    <el-button
                        v-owner="'ROLE:ROLE_DEV_OPS'"
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
            layout="total, sizes, prev, pager, next"
            :page-size="pagination.size"
            :page-sizes="pagination.page_sizes"
            :total="pagination.total"
            style="padding: 0 10px; margin-left: auto"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange" />
    </el-row>
    <!-- 用户组件区 -->
    <ConfiguredEdit v-if="edit.show" v-bind:show="edit.show" v-bind:form="edit.form" @close="handleDialogClose" />
</template>

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
</style>
