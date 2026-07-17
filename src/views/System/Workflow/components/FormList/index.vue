<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { FormApi } from "@/api/workflow/form-api.ts";

const router = useRouter();

// 查询条件
const condition = ref({
    name: undefined as string | undefined,
    active: undefined as boolean | undefined
});

// 表格数据
const tableData = ref<FormDefinitionVO[]>([]);
const loading = ref(false);

// 状态选项
const statusOptions = [
    { label: "启用", value: true },
    { label: "禁用", value: false }
];

// 版本历史相关
const versionVisible = ref(false);
const versionLoading = ref(false);
const versionData = ref<FormVersionVO[]>([]);
const currentFormName = ref("");

/**
 * 加载表单列表
 */
const loadData = async () => {
    loading.value = true;
    try {
        const params: Record<string, unknown> = {};
        if (condition.value.name) {
            params.name = condition.value.name;
        }
        if (condition.value.active !== undefined) {
            params.active = condition.value.active;
        }
        const result = await FormApi.page(params);
        tableData.value = result?.records || [];
    } catch (error) {
        console.error("加载表单列表失败:", error);
    } finally {
        loading.value = false;
    }
};

/**
 * 查询
 */
const handleQuery = () => {
    loadData();
};

/**
 * 重置
 */
const handleReset = () => {
    condition.value.name = undefined;
    condition.value.active = undefined;
    loadData();
};

/**
 * 新增表单（跳转到表单设计器）
 */
const handleAdd = () => {
    router.push({ path: "/system/form-edit" });
};

/**
 * 编辑表单（跳转到表单设计器）
 */
const handleEdit = (row: FormDefinitionVO) => {
    router.push({ path: "/system/form-edit", query: { id: row.id } });
};

/**
 * 查看版本历史
 */
const handleViewVersions = async (row: FormDefinitionVO) => {
    versionVisible.value = true;
    currentFormName.value = row.name;
    versionLoading.value = true;

    try {
        versionData.value = await FormApi.getVersions(row.id);
    } catch (error) {
        console.error("获取版本历史失败:", error);
        ElMessage.error("获取版本历史失败");
        versionVisible.value = false;
    } finally {
        versionLoading.value = false;
    }
};

/**
 * 查看指定版本
 */
const handleViewVersion = (row: FormVersionVO) => {
    router.push({
        path: "/system/form-preview",
        query: { id: row.form_definition_id, version: String(row.form_version) }
    });
};

/**
 * 删除表单
 */
const handleDelete = async (row: FormDefinitionVO) => {
    try {
        await ElMessageBox.confirm(`确定要删除表单「${row.name}」吗？删除后不可恢复。`, "提示", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
        });

        await FormApi.delete(row.id);
        ElMessage.success("删除成功");
        loadData();
    } catch (error) {
        if (error !== "cancel") {
            console.error("删除失败:", error);
        }
    }
};

/**
 * 切换启用/禁用状态
 */
const handleToggleActive = async (row: FormDefinitionVO) => {
    const action = row.active ? "禁用" : "启用";
    try {
        await ElMessageBox.confirm(`确定要${action}表单「${row.name}」吗？`, "提示", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
        });

        await FormApi.update(row.id, {
            name: row.name,
            code: row.code,
            description: row.description
        });

        ElMessage.success(`${action}成功`);
        loadData();
    } catch (error) {
        if (error !== "cancel") {
            console.error(`${action}失败:`, error);
        }
    }
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box__search">
        <el-form :inline="true" :model="condition">
            <el-form-item label="表单名称" prop="name">
                <el-input v-model="condition.name" placeholder="请输入表单名称" clearable style="width: 15vw" />
            </el-form-item>
            <el-form-item label="状态" prop="active">
                <el-select v-model="condition.active" placeholder="请选择状态" clearable style="width: 12vw">
                    <el-option
                        v-for="item in statusOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value" />
                </el-select>
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handleQuery">查询</el-button>
                <el-button @click="handleReset">重置</el-button>
                <el-button type="success" @click="handleAdd">新增表单</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <el-table v-loading="loading" :data="tableData" height="92%" stripe>
            <el-table-column align="center" type="index" width="60" />
            <el-table-column align="center" label="表单名称" prop="name" show-overflow-tooltip min-width="120" />
            <el-table-column align="center" label="表单编码" prop="code" show-overflow-tooltip width="130" />
            <el-table-column align="center" label="当前版本" prop="current_version" width="80" />
            <el-table-column align="center" label="描述" prop="description" show-overflow-tooltip min-width="100" />
            <el-table-column align="center" label="状态" width="80">
                <template #default="scope">
                    <el-tag :type="scope.row.active ? 'success' : 'danger'" size="small">
                        {{ scope.row.active ? "启用" : "禁用" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" label="创建时间" prop="created_at" show-overflow-tooltip width="160" />
            <el-table-column align="center" label="操作" width="250" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button link type="info" size="small" @click="handleViewVersions(scope.row)">版本历史</el-button>
                    <el-button
                        link
                        :type="scope.row.active ? 'warning' : 'success'"
                        size="small"
                        @click="handleToggleActive(scope.row)">
                        {{ scope.row.active ? "禁用" : "启用" }}
                    </el-button>
                    <el-button link type="danger" size="small" @click="handleDelete(scope.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-row>

    <!-- 版本历史对话框 -->
    <el-dialog v-model="versionVisible" :title="`版本历史 - ${currentFormName}`" width="60%" destroy-on-close>
        <div v-loading="versionLoading" style="min-height: 200px">
            <el-table :data="versionData" stripe>
                <el-table-column align="center" label="版本号" prop="form_version" width="80" />
                <el-table-column align="center" label="创建人" prop="created_by" />
                <el-table-column align="center" label="创建时间" prop="created_at" />
                <el-table-column align="center" label="操作" width="100">
                    <template #default="scope">
                        <el-button link type="primary" size="small" @click="handleViewVersion(scope.row)">
                            查看
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-empty v-if="!versionLoading && versionData.length === 0" description="暂无版本记录" />
        </div>
    </el-dialog>
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;

    .el-form-item {
        margin-bottom: 0;
    }
}

.box__body {
    height: 90%;
}
</style>
