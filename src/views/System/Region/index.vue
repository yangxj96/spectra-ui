<script setup lang="ts">
import { reactive, ref } from "vue";

import { RegionApi } from "@/api/system/region-api.ts";
import DictTag from "@/components/DictTag/index.vue";
import useTable from "@/hooks/use-table.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import RegionEdit from "./components/RegionEdit/index.vue";

// 查询条件
const condition = ref<RegionPageParams>({
    page_num: 1,
    page_size: 15,
    name: ""
});

// table分页请求
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<Region>(
    RegionApi.page,
    condition.value
);

// 编辑抽屉状态
const editDrawer = reactive({
    visible: false,
    row: undefined as Region | undefined,
    tableData: [] as Region[]
});

// 加载树形数据供编辑使用
const treeData = ref<Region[]>([]);

const loadTreeData = async () => {
    treeData.value = (await RegionApi.load({ level: 1 })) || [];
};

// 新增
const handleAdd = () => {
    loadTreeData().then(() => {
        editDrawer.row = undefined;
        editDrawer.tableData = treeData.value;
        editDrawer.visible = true;
    });
};

// 编辑
const handleEdit = (row: Region) => {
    loadTreeData().then(() => {
        editDrawer.row = JSON.parse(JSON.stringify(row));
        editDrawer.tableData = treeData.value;
        editDrawer.visible = true;
    });
};

// 删除
const handleDelete = (row: Region) => {
    MessageUtils.box.confirm(`是否要删除[${row.name}]`, "提示").then(async () => {
        await RegionApi.deleteById(row.id);
        MessageUtils.success("删除成功", () => {
            handlerConditionQuery();
        });
    });
};

// 抽屉关闭回调
const handleEditClose = () => {
    editDrawer.visible = false;
    handlerConditionQuery();
};
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box-search">
        <el-form :inline="true">
            <el-form-item label="区域名称" prop="name">
                <el-input v-model="condition.name" placeholder="请输入区域名称" clearable />
            </el-form-item>
            <el-form-item>
                <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                <el-button>重置</el-button>
                <el-button v-owner="'REGION:INSERT'" @click="handleAdd">新增</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box-body">
        <el-table :data="table_data" height="95%" border stripe default-expand-all row-key="id">
            <el-table-column align="center" prop="name" label="名称" />
            <el-table-column align="center" prop="full_name" label="全称" :show-overflow-tooltip="true" />
            <el-table-column align="center" prop="short_name" label="简称" />
            <el-table-column align="center" width="150" prop="code" label="编码" />
            <el-table-column align="center" width="120" prop="level" label="层级">
                <template #default="scope">
                    <DictTag v-model="scope.row.level" dict_code="sys_region_level" />
                </template>
            </el-table-column>
            <el-table-column align="center" width="100" prop="status" label="状态">
                <template #default="scope">
                    <el-tag :type="scope.row.status ? 'success' : 'danger'">
                        {{ scope.row.status ? "启用" : "禁用" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" width="100" prop="sort" label="排序" />
            <el-table-column align="center" width="180" label="操作" fixed="right">
                <template #default="scope">
                    <el-button
                        v-owner="'REGION:UPDATE'"
                        link
                        type="primary"
                        size="small"
                        @click="handleEdit(scope.row)">
                        编辑
                    </el-button>
                    <el-button
                        v-owner="'REGION:DELETE'"
                        link
                        type="primary"
                        size="small"
                        @click="handleDelete(scope.row)">
                        删除
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
    <!-- 新增/编辑抽屉 -->
    <RegionEdit
        v-if="editDrawer.visible"
        :row="editDrawer.row"
        :table-data="editDrawer.tableData"
        @close="handleEditClose" />
</template>

<style scoped lang="scss">
.box-search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 20px;

    .el-form-item {
        margin-bottom: 0;
    }
}

.box-body {
    padding-left: 1vw;
    padding-right: 1vw;
    height: 90%;
}
</style>
