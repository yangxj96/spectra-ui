<script setup lang="ts">
import { reactive, ref, watch } from "vue";

import { DictApi } from "@/api/system/dict-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import DictTag from "@/components/DictTag/index.vue";
import { MessageUtils } from "@/utils/message-utils.ts";

import DictDataEdit from "./components/DictDataEdit/index.vue";
import DictGroupEdit from "./components/DictGroupEdit/index.vue";

// 树形props配置
const treeProps = { children: "children", label: "name", value: "id" };

// 字典组编辑状态
const dictGroup = reactive({
    visible: false,
    row: undefined as DictGroup | undefined
});

// 字典数据编辑状态
const dictData = reactive({
    visible: false,
    row: undefined as DictItem | undefined
});

// 字典组表单数据
const dictGroupTableData = ref<DictTypeTree[]>([]);

// 字典数据表单数据
const dictDataTableData = ref<DictItem[]>([]);

// 当前选中的字典组
const currentGroup = ref<DictTypeTree>();

// 监听当前字典组的变化
watch(
    () => currentGroup.value,
    newVal => {
        if (newVal) {
            if (newVal.children && newVal.children.length > 0) {
                return;
            }
            handleGetDictData();
        } else {
            // 如果没有选中任何字典组，清空字典数据表格
            dictDataTableData.value = [];
        }
    }
);

// 初始化数据
const initData = async () => {
    dictGroupTableData.value = await DictApi.getTypesGroupTree();
};

const handleGetDictData = async () => {
    // 如果当前字典组有值，获取对应的字典数据
    dictDataTableData.value = await DictApi.getDataByTypeCode(currentGroup.value!.code);
};

// 字典组编辑打开
const handleDictGroupOpen = (row?: DictGroup) => {
    dictGroup.row = row;
    dictGroup.visible = false;
    setTimeout(() => {
        dictGroup.visible = true;
    }, 0);
};

// 字典数据编辑打开
const handleDictDataOpen = (row?: DictItem) => {
    dictData.row = row;
    dictData.visible = false;
    setTimeout(() => {
        dictData.visible = true;
    }, 0);
};

// 字典组编辑关闭
const handleDictGroupClose = () => {
    dictGroup.visible = false;
    initData();
};

// 字典数据编辑关闭
const handleDictDataClose = () => {
    dictData.visible = false;
    initData();
    if (currentGroup.value) {
        handleGetDictData();
    }
};

// 字典数据删除
const handleDictDataDelete = (row: DictItem) => {
    MessageUtils.box.confirm(`是否要删除[${row.label}]`, "提示").then(async () => {
        try {
            await DictApi.deleteDataById(row.id);
            MessageUtils.success("删除成功");
        } finally {
            await handleGetDictData();
        }
    });
};

initData();
</script>

<template>
    <!-- 过滤行 -->
    <el-row class="box__search">
        <el-form :inline="true">
            <el-form-item>
                <el-button v-owner="'DICT:INSERT'" @click="handleDictGroupOpen()">
                    <ComponentsIcons name="icon-edit" />
                    新增字典组
                </el-button>
                <el-button v-owner="'DICT:INSERT'" @click="handleDictDataOpen()">
                    <ComponentsIcons name="icon-edit" />
                    新增字典数据
                </el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据行 -->
    <el-row class="box__body">
        <el-col :span="4">
            <el-tree
                node-key="id"
                :data="dictGroupTableData"
                highlight-current
                default-expand-all
                :props="treeProps"
                @node-click="
                    (node: DictTypeTree) => {
                        currentGroup = node;
                    }
                ">
                <template #default="{ node, data }">
                    <p class="tree-node__label">
                        {{ node.label }}
                        <ComponentsIcons v-if="data.builtin" name="icon-builtin" class-name="icon-sidebar" />
                        <el-button
                            v-if="!data.builtin"
                            v-owner="'DICT:UPDATE'"
                            class="tree-node__label-btn"
                            link
                            type="primary"
                            @click="handleDictGroupOpen(data)">
                            编辑
                        </el-button>
                    </p>
                </template>
            </el-tree>
        </el-col>
        <el-col :span="20">
            <el-row>
                <el-text size="large">编码: {{ currentGroup?.code }}</el-text>
            </el-row>
            <el-table :data="dictDataTableData" row-key="id" stripe height="75vh">
                <template #empty>
                    <p>无字典项</p>
                </template>
                <el-table-column align="center" type="index" />
                <el-table-column align="center" label="标签" prop="label" />
                <el-table-column align="center" label="值" prop="value" />
                <el-table-column align="center" label="排序" prop="sort" />
                <el-table-column align="center" label="状态" prop="state">
                    <template #default="scope">
                        <DictTag v-model="scope.row.state" primary_value="0" dict_code="sys_common_state" />
                    </template>
                </el-table-column>
                <el-table-column align="center" label="默认">
                    <template #default="scope">
                        <el-text v-if="scope.row.default_flag" type="primary">默认</el-text>
                    </template>
                </el-table-column>
                <el-table-column align="center" label="备注" prop="remark" :show-overflow-tooltip="true" />
                <el-table-column
                    v-show="!currentGroup?.builtin"
                    v-owner.or="['DICT:UPDATE', 'DICT:DELETE']"
                    align="center"
                    label="操作">
                    <template #default="scope">
                        <el-button v-owner="'DICT:UPDATE'" link type="primary" @click="handleDictDataOpen(scope.row)">
                            编辑
                        </el-button>
                        <el-button v-owner="'DICT:DELETE'" link type="primary" @click="handleDictDataDelete(scope.row)">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-col>
    </el-row>

    <!-- 字典组编辑弹框 -->
    <DictGroupEdit
        v-if="dictGroup.visible"
        :show="dictGroup.visible"
        :row="dictGroup.row"
        :group="currentGroup"
        @close="handleDictGroupClose" />
    <!-- 字典数据编辑弹框 -->
    <DictDataEdit
        v-if="dictData.visible"
        :show="dictData.visible"
        :row="dictData.row"
        :group="currentGroup"
        @close="handleDictDataClose" />
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    padding-left: 1em;
    padding-right: 1em;

    .el-form-item {
        margin-bottom: 0;
    }
}

.box__body {
    padding-left: 1em;
    padding-right: 1em;
    height: 90%;
}

.icon-sidebar {
    width: 1.3em;
    height: 1.3em;
}

.tree-node__label {
    width: 100%;
}

.tree-node__label-btn {
    float: right;
    margin-right: 1em;
}
</style>
