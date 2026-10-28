<script setup lang="ts">
import { type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { useRouter } from "vue-router";

import { MenuApi } from "@/api/system/menu-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import IconPicker from "@/components/IconPicker/index.vue";
import { HttpRequestError } from "@/plugin/request/error.ts";
import { filterDirectoryTree } from "@/utils/menu-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const dialog = defineModel<boolean>("show", { required: true, default: false });

const row = defineModel<Menu>("row");

const tableData = defineModel<Menu[]>("table-data", { required: true });

const emits = defineEmits<{
    /** 关闭事件 */
    close: [];
}>();

const menuForm = useTemplateRef<FormInstance>("ruleFormRef");
const conflictMenu = ref<Menu>();
const router = useRouter();

// 编辑标识,是否为编辑数据
const has_edit = computed(() => !!row.value?.id && row.value.id !== "");

// 定义菜单编辑对话框的状态和表单数据
const edit = reactive({
    title: computed(() => (has_edit.value ? "编辑" : "新增") + "菜单"),
    rules: {
        name: [{ required: true, message: "请输入菜单名称", trigger: "blur" }],
        icon: [{ required: true, message: "请选择菜单图标", trigger: "blur" }],
        menuType: [{ required: true, message: "请选择菜单类型", trigger: "change" }],
        sort: [{ required: true, message: "请输入排序", trigger: "blur" }]
    } as FormRules,
    form: {
        icon: "",
        menuType: "DIRECTORY",
        routeName: null,
        name: "",
        sort: 0
    } as MenuSaveForm
});

const parentOptions = computed(() => filterDirectoryTree(tableData.value, row.value?.id));
const routeOptions = router
    .getRoutes()
    .filter(route => typeof route.name === "string" && route.meta.requiredMenu === route.name)
    .map(route => ({ label: String(route.meta.title ?? route.name), value: String(route.name) }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-CN"));

onMounted(() => {
    if (has_edit.value && row.value) {
        edit.form = {
            id: row.value.id,
            version: row.value.version,
            pid: row.value.pid,
            icon: row.value.icon,
            menuType: row.value.menuType,
            routeName: row.value.routeName,
            name: row.value.name,
            sort: row.value.sort
        };
    }
});

watch(
    () => edit.form.menuType,
    menuType => {
        if (menuType === "DIRECTORY") edit.form.routeName = null;
    }
);

// 处理关闭
const handleClose = () => {
    emits("close");
    dialog.value = false;
};

// 保存菜单
function findMenu(items: Menu[], id: string): Menu | undefined {
    for (const item of items) {
        if (item.id === id) return item;
        const child = findMenu(item.children ?? [], id);
        if (child) return child;
    }
    return undefined;
}

function useLatestMenuVersion(): void {
    if (!conflictMenu.value) return;
    edit.form.version = conflictMenu.value.version;
    conflictMenu.value = undefined;
}

const handleMenuSave = async () => {
    if (!menuForm.value) return;
    try {
        await menuForm.value.validate();
        if (has_edit.value) {
            await MenuApi.update(edit.form);
        } else {
            await MenuApi.create(edit.form);
        }
        MessageUtils.success(has_edit.value ? "修改菜单成功" : "新增菜单成功", handleClose);
    } catch (error) {
        if (has_edit.value && edit.form.id && error instanceof HttpRequestError && error.status === 409) {
            try {
                conflictMenu.value = findMenu(await MenuApi.tree(), edit.form.id);
            } catch (refreshError) {
                MessageUtils.error(refreshError);
            }
        }
        if (error instanceof HttpRequestError) MessageUtils.error(error);
    }
};
</script>

<template>
    <el-drawer v-model="dialog" class="loading-box" :modal="true" @close="handleClose">
        <template #header>
            <div>
                <ComponentsIcons name="icon-edit" />
                {{ edit.title }}
            </div>
        </template>
        <template #default>
            <el-alert
                v-if="conflictMenu"
                type="warning"
                :closable="false"
                show-icon
                :title="`菜单已更新，当前版本 ${conflictMenu.version}；你的编辑内容仍保留。最新名称：${conflictMenu.name}。`">
                <el-button type="warning" plain @click="useLatestMenuVersion">核对后采用新版本</el-button>
            </el-alert>
            <el-form
                ref="ruleFormRef"
                :rules="edit.rules"
                :model="edit.form"
                label-width="auto"
                style="padding: 20px"
                @submit.prevent>
                <el-form-item v-if="has_edit" label="数据ID" prop="id">
                    <el-input v-model="edit.form.id" disabled clearable placeholder="请输入菜单名称" />
                </el-form-item>
                <el-form-item label="上级菜单" prop="pid">
                    <el-tree-select
                        v-model="edit.form.pid"
                        :data="parentOptions"
                        placeholder="请选择菜单父级"
                        check-strictly
                        default-expand-all
                        node-key="id"
                        :props="{ label: 'name' }"
                        :render-after-expand="false" />
                </el-form-item>
                <el-form-item label="名称" prop="name">
                    <el-input v-model="edit.form.name" clearable placeholder="请输入菜单名称" />
                </el-form-item>
                <el-form-item label="图标" prop="icon">
                    <IconPicker v-model="edit.form.icon" />
                </el-form-item>
                <el-form-item label="类型" prop="menuType">
                    <el-select v-model="edit.form.menuType" placeholder="请选择菜单类型">
                        <el-option label="目录" value="DIRECTORY" />
                        <el-option label="菜单" value="MENU" />
                    </el-select>
                </el-form-item>
                <el-form-item
                    v-if="edit.form.menuType === 'MENU'"
                    label="路由名称"
                    prop="routeName"
                    :rules="[{ required: true, message: '请选择路由名称', trigger: 'change' }]">
                    <el-select v-model="edit.form.routeName" filterable placeholder="请选择静态路由">
                        <el-option
                            v-for="option in routeOptions"
                            :key="option.value"
                            :label="`${option.label} (${option.value})`"
                            :value="option.value" />
                    </el-select>
                </el-form-item>
                <el-form-item label="排序" prop="sort">
                    <el-input-number
                        v-model="edit.form.sort"
                        :min="0"
                        :max="999"
                        placeholder="请输入排序"
                        style="width: 100%" />
                </el-form-item>
            </el-form>
        </template>
        <template #footer>
            <el-button @click="handleClose">取消</el-button>
            <el-button type="primary" @click="handleMenuSave">确定</el-button>
        </template>
    </el-drawer>
</template>
