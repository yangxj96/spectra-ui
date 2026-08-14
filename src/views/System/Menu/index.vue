<script setup lang="ts">
import { ElTable } from "element-plus";
import { onMounted, reactive, ref } from "vue";

import { MenuApi } from "@/api/system/menu-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import { filterMenuModelTree } from "@/utils/menu-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

import MenuEdit from "./components/MenuEdit/index.vue";

const table_data = ref<Menu[]>([]);

// 编辑抽屉状态
const editDrawer = reactive({
    visible: false,
    row: undefined as Menu | undefined,
    tableData: [] as Menu[]
});

onMounted(() => {
    handleCriteriaQuery();
});

// 初始化数据
const handleCriteriaQuery = async () => {
    table_data.value = filterMenuModelTree(await MenuApi.tree());
};

// 表行修改按钮被单击
const handleTableItemModify = (row: Menu) => {
    editDrawer.row = JSON.parse(JSON.stringify(row));
    editDrawer.tableData = table_data.value;
    editDrawer.visible = false;
    setTimeout(() => {
        editDrawer.visible = true;
    }, 0);
};

// 表行删除按钮被单击
const handleTableItemDelete = (row: Menu) => {
    MessageUtils.box.confirm(`是否要删除[${row.name}]`, "提示").then(async () => {
        console.log(`确定删除`);
        await MenuApi.deleteById(row.id);
        MessageUtils.success("删除菜单成功", () => {
            handleCriteriaQuery();
        });
    });
};

// 处理菜单Dialog打开
const handleMenuAddDialog = () => {
    editDrawer.row = undefined;
    editDrawer.tableData = table_data.value;
    editDrawer.visible = false;
    setTimeout(() => {
        editDrawer.visible = true;
    }, 0);
};

// 处理编辑抽屉关闭
const handleEditClose = () => {
    editDrawer.visible = false;
    handleCriteriaQuery();
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
                <el-button type="primary" @click="handleCriteriaQuery">查询</el-button>
                <el-button>重置</el-button>
                <el-button v-permission="'menu:create'" @click="handleMenuAddDialog">新增</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <ElTable
            ref="ref_table"
            v-if="table_data.length > 0"
            :data="table_data"
            height="100%"
            stripe
            row-key="id"
            class="loading-box">
            <el-table-column align="center" type="index" />
            <el-table-column align="left" header-align="center" prop="name" label="名称" />
            <el-table-column align="center" prop="icon" label="图标">
                <template #default="scope">
                    <ComponentsIcons :name="scope.row.icon" />
                </template>
            </el-table-column>
            <el-table-column align="center" prop="menuType" label="类型">
                <template v-slot:default="scope">
                    <el-tag :type="scope.row.menuType === 'MENU' ? 'primary' : 'info'">
                        {{ scope.row.menuType === "MENU" ? "菜单" : "目录" }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column align="center" prop="routeName" label="路由名称" :show-overflow-tooltip="true" />
            <el-table-column align="center" prop="sort" label="排序" />
            <el-table-column align="center" label="操作" v-permission.or="['menu:update', 'menu:disable']">
                <template #default="scope">
                    <el-button
                        v-permission="'menu:update'"
                        link
                        type="primary"
                        size="small"
                        @click="handleTableItemModify(scope.row)">
                        编辑
                    </el-button>
                    <el-button
                        v-permission="'menu:disable'"
                        link
                        type="primary"
                        size="small"
                        @click="handleTableItemDelete(scope.row)">
                        删除
                    </el-button>
                </template>
            </el-table-column>
        </ElTable>
    </el-row>
    <MenuEdit
        v-if="editDrawer.visible"
        :show="editDrawer.visible"
        :row="editDrawer.row"
        :table-data="editDrawer.tableData"
        @close="handleEditClose" />
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
