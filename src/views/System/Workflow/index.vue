<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { WorkflowApi } from "@/api/workflow/workflow-api.ts";

const router = useRouter();

// 查询条件
const condition = ref({
    name: undefined as string | undefined,
    suspended: undefined as boolean | undefined
});

// 表格数据
const tableData = ref<ProcessDefinitionVO[]>([]);
const loading = ref(false);

// 状态选项
const statusOptions = [
    { label: "激活", value: false },
    { label: "挂起", value: true }
];

// 流程图预览相关
const diagramVisible = ref(false);
const diagramUrl = ref("");
const diagramLoading = ref(false);
const currentDiagramName = ref("");

/**
 * 加载流程定义列表
 */
const loadData = async () => {
    loading.value = true;
    try {
        const data = await WorkflowApi.getProcessDefinitions();
        // 前端过滤
        let filtered = data || [];
        if (condition.value.name) {
            filtered = filtered.filter(item => item.name?.includes(condition.value.name!));
        }
        if (condition.value.suspended !== undefined) {
            filtered = filtered.filter(item => item.suspended === condition.value.suspended);
        }
        tableData.value = filtered;
    } catch (error) {
        console.error("加载流程定义失败:", error);
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
    condition.value.suspended = undefined;
    loadData();
};

/**
 * 新增流程（跳转到流程设计器）
 */
const handleAdd = () => {
    router.push({ path: "/system/flow-edit" });
};

/**
 * 编辑流程（跳转到流程设计器）
 */
const handleEdit = (row: ProcessDefinitionVO) => {
    router.push({ path: "/system/flow-edit", query: { id: row.id, key: row.key } });
};

/**
 * 查看流程图
 */
const handleViewDiagram = async (row: ProcessDefinitionVO) => {
    diagramVisible.value = true;
    currentDiagramName.value = row.name || row.key;
    diagramLoading.value = true;

    try {
        const blob = await WorkflowApi.getProcessDefinitionDiagram(row.id);
        // 释放之前的URL
        if (diagramUrl.value) {
            URL.revokeObjectURL(diagramUrl.value);
        }
        diagramUrl.value = URL.createObjectURL(blob);
    } catch (error) {
        console.error("获取流程图失败:", error);
        ElMessage.error("获取流程图失败");
        diagramVisible.value = false;
    } finally {
        diagramLoading.value = false;
    }
};

/**
 * 关闭流程图预览
 */
const handleDiagramClose = () => {
    if (diagramUrl.value) {
        URL.revokeObjectURL(diagramUrl.value);
        diagramUrl.value = "";
    }
};

/**
 * 切换挂起/激活状态
 */
const handleToggleStatus = async (row: ProcessDefinitionVO) => {
    const action = row.suspended ? "激活" : "挂起";
    try {
        await ElMessageBox.confirm(`确定要${action}流程定义「${row.name}」吗？`, "提示", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
        });

        if (row.suspended) {
            await WorkflowApi.activateProcessDefinition(row.id);
        } else {
            await WorkflowApi.suspendProcessDefinition(row.id);
        }

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
            <el-form-item label="流程名称" prop="name">
                <el-input v-model="condition.name" placeholder="请输入流程名称" clearable style="width: 15vw" />
            </el-form-item>
            <el-form-item label="状态" prop="suspended">
                <el-select v-model="condition.suspended" placeholder="请选择状态" clearable style="width: 12vw">
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
                <el-button type="success" @click="handleAdd">新增流程</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <el-table v-loading="loading" :data="tableData" height="92%" stripe>
            <el-table-column align="center" type="index" width="60" />
            <el-table-column align="center" label="流程名称" prop="name" show-overflow-tooltip min-width="120" />
            <el-table-column align="center" label="流程KEY" prop="key" show-overflow-tooltip width="130" />
            <el-table-column align="center" label="版本" prop="version" width="70" />
            <el-table-column align="center" label="描述" prop="description" show-overflow-tooltip min-width="100" />
            <el-table-column align="center" label="分类" prop="category" show-overflow-tooltip width="100" />
            <el-table-column align="center" label="部署时间" prop="deploymentTime" show-overflow-tooltip width="160" />
            <el-table-column align="center" label="状态" width="80">
                <template #default="scope">
                    <el-tag :type="scope.row.suspended ? 'danger' : 'success'" size="small">
                        {{ scope.row.suspended ? "挂起" : "激活" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" label="操作" width="220" fixed="right">
                <template #default="scope">
                    <el-button link type="primary" size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button link type="info" size="small" @click="handleViewDiagram(scope.row)">流程图</el-button>
                    <el-button
                        link
                        :type="scope.row.suspended ? 'success' : 'warning'"
                        size="small"
                        @click="handleToggleStatus(scope.row)">
                        {{ scope.row.suspended ? "激活" : "挂起" }}
                    </el-button>
                </template>
            </el-table-column>
        </el-table>
    </el-row>

    <!-- 流程图预览对话框 -->
    <el-dialog
        v-model="diagramVisible"
        :title="`流程图 - ${currentDiagramName}`"
        width="70%"
        destroy-on-close
        @close="handleDiagramClose">
        <div
            v-loading="diagramLoading"
            style="min-height: 400px; display: flex; justify-content: center; align-items: center">
            <el-image
                v-if="diagramUrl"
                :src="diagramUrl"
                fit="contain"
                style="max-width: 100%; max-height: 70vh"
                :preview-src-list="[diagramUrl]" />
            <el-empty v-else description="暂无流程图" />
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
