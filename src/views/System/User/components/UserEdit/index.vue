<script setup lang="ts">
import { type AutocompleteData, type FormInstance, type FormRules } from "element-plus";
import { computed, onMounted, reactive, ref, useTemplateRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { DepartmentApi } from "@/api/user/department-api.ts";
import { UserApi } from "@/api/user/user-api.ts";
import ComponentsIcons from "@/components/ComponentsIcons/index.vue";
import DictSelect from "@/components/DictSelect/index.vue";
import { userConverter } from "@/converter/user-converter.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useDictStore } from "@/plugin/store/modules/use-dict-store.ts";
import { treeDefaultProps } from "@/utils/default-config.ts";
import { MessageUtils } from "@/utils/message-utils.ts";
import { email, mobile } from "@/utils/verify-rules.ts";

import RoleAssignmentEditor from "../RoleAssignmentEditor/index.vue";

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const dictStore = useDictStore();
const userId = computed(() => String(route.params.id ?? ""));
const isEditing = computed(() => Boolean(userId.value));
const activeStep = ref(0);
const form = reactive<UserForm>(
    userConverter.createForm({
        language: appStore.system.default_locale,
        timezone: appStore.system.default_timezone
    })
);
const departmentTree = ref<DepartmentTreeVO[]>([]);
const emailSuffixes = ref<string[]>([]);
const loading = ref(false);
const saving = ref(false);
const formRef = useTemplateRef<FormInstance>("formRef");

const rules: FormRules<UserForm> = {
    username: [{ required: true, message: "请输入用户名", trigger: "blur" }],
    email: [
        { required: true, message: "请输入邮箱", trigger: "blur" },
        { validator: email, trigger: "blur" }
    ],
    phone: [
        { required: true, message: "请输入手机号码", trigger: "blur" },
        { validator: mobile, trigger: "blur" }
    ],
    status: [{ required: true, message: "请选择状态", trigger: "change" }],
    language: [{ required: true, message: "请选择语言", trigger: "change" }],
    timezone: [{ required: true, message: "请选择时区", trigger: "change" }],
    department_id: [{ required: true, message: "请选择所属组织", trigger: "change" }]
};

async function load(): Promise<void> {
    loading.value = true;
    try {
        const [departments, suffixes] = await Promise.all([
            DepartmentApi.tree(),
            dictStore.getDictData("sys_email_suffix")
        ]);
        departmentTree.value = departments ?? [];
        emailSuffixes.value = (suffixes ?? []).map(item => item.value);

        if (isEditing.value) {
            Object.assign(form, userConverter.toForm(await UserApi.detail(userId.value)));
        }
    } catch (error: unknown) {
        MessageUtils.error(error);
        if (isEditing.value) await router.push({ name: "SystemUser" });
    } finally {
        loading.value = false;
    }
}

async function handleBack(): Promise<void> {
    await router.push({ name: "SystemUser" });
}

function handleStepChange(step: number): void {
    if (step === 1 && !form.id) {
        MessageUtils.warning("请先保存用户基本信息");
        return;
    }
    activeStep.value = step;
}

async function handleUserSave(): Promise<void> {
    if (!formRef.value) return;
    saving.value = true;
    try {
        await formRef.value.validate();
        if (isEditing.value) {
            await UserApi.update(userConverter.toDTO(form));
            MessageUtils.success("修改用户成功，继续配置角色授权");
            activeStep.value = 1;
        } else {
            const createdUser = await UserApi.create(userConverter.toDTO(form));
            form.id = createdUser.id;
            await router.replace({ name: "SystemUserEdit", params: { id: createdUser.id } });
            MessageUtils.success("新增用户成功，继续配置角色授权");
            activeStep.value = 1;
        }
    } catch (error: unknown) {
        console.error(error);
        MessageUtils.error(error);
    } finally {
        saving.value = false;
    }
}

function handleEmailSuggestions(query: string, callback: (results: AutocompleteData) => void): void {
    if (!query) {
        callback([]);
        return;
    }

    let name = "";
    let domainPart = "";
    if (query.includes("@")) {
        [name = "", domainPart = ""] = query.split("@");
    } else {
        name = query;
    }

    if (!name) {
        callback([]);
        return;
    }

    callback(
        emailSuffixes.value
            .filter(suffix => !domainPart || suffix.includes(domainPart))
            .map(suffix => ({ value: `${name}@${suffix}` }))
    );
}

onMounted(load);
</script>

<template>
    <div v-loading="loading" class="user-edit-page">
        <el-steps
            class="user-edit-steps"
            :active="activeStep"
            align-center
            finish-status="success"
            process-status="process"
            @change="handleStepChange">
            <el-step title="基本信息" description="填写用户基础资料" />
            <el-step title="角色授权" description="配置角色和数据访问范围" />
        </el-steps>

        <section v-if="activeStep === 0" class="user-edit-section">
            <div class="section-title">
                <div>
                    <span>基本信息</span>
                    <small>用于登录、身份识别和组织归属</small>
                </div>
                <el-text type="info">带 * 的字段为必填项</el-text>
            </div>

            <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" @submit.prevent>
                <el-row :gutter="24">
                    <el-col :span="12">
                        <el-form-item label="名称" prop="username">
                            <el-input v-model="form.username" clearable placeholder="请输入名称" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="真实名称" prop="real_name">
                            <el-input v-model="form.real_name" clearable placeholder="请输入真实名称" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="状态" prop="status">
                            <DictSelect v-model="form.status" dict_code="sys_user_state" placeholder="请选择状态" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="性别" prop="gender">
                            <DictSelect v-model="form.gender" dict_code="sys_user_gender" placeholder="请选择性别" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="生日" prop="birthday">
                            <el-date-picker
                                v-model="form.birthday"
                                type="date"
                                placeholder="请选择生日"
                                value-format="YYYY-MM-DD"
                                style="width: 100%" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="手机号码" prop="phone">
                            <el-input v-model="form.phone" clearable placeholder="请输入手机号码" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="邮箱" prop="email">
                            <el-autocomplete
                                v-model="form.email"
                                :fetch-suggestions="handleEmailSuggestions"
                                clearable
                                placeholder="请输入邮箱">
                                <template #suffix>
                                    <el-tooltip effect="dark" content="同时也作为默认登录账号" placement="right">
                                        <ComponentsIcons
                                            name="icon-hint"
                                            style="margin-left: 10px; width: 1.4em; height: 1.4em" />
                                    </el-tooltip>
                                </template>
                            </el-autocomplete>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="所属组织" prop="department_id">
                            <el-tree-select
                                v-model="form.department_id"
                                :data="departmentTree"
                                node-key="id"
                                clearable
                                check-strictly
                                default-expand-all
                                :props="treeDefaultProps"
                                placeholder="请选择所属组织" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="国家" prop="country">
                            <el-input v-model="form.country" clearable placeholder="请输入国家" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="城市" prop="city">
                            <el-input v-model="form.city" clearable placeholder="请输入城市" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="语言" prop="language">
                            <DictSelect v-model="form.language" dict_code="sys_language" placeholder="请选择语言" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="时区" prop="timezone">
                            <DictSelect v-model="form.timezone" dict_code="sys_timezone" placeholder="请选择时区" />
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
        </section>

        <section v-else-if="form.id" class="user-edit-section authorization-section">
            <RoleAssignmentEditor :user-id="form.id" />
        </section>

        <el-alert
            v-else
            class="authorization-tip"
            title="用户保存后可以继续配置角色授权和数据访问范围。"
            type="info"
            :closable="false"
            show-icon />

        <div class="user-edit-actions">
            <el-button @click="handleBack">取消</el-button>
            <template v-if="activeStep === 0">
                <el-button type="primary" :loading="saving" @click="handleUserSave">保存并继续授权</el-button>
            </template>
            <el-button v-else @click="activeStep = 0">上一步</el-button>
        </div>
    </div>
</template>

<style scoped lang="scss">
.user-edit-page {
    min-height: 100%;
    height: 100%;
    padding: 28px 32px 32px;
    overflow-y: auto;
    background: var(--el-bg-color);
}

.user-edit-section,
.authorization-tip,
.user-edit-actions {
    width: min(1120px, 100%);
    margin-right: auto;
    margin-left: auto;
}

.user-edit-steps {
    width: min(880px, 100%);
    margin: 28px auto 24px;
    padding: 0 24px;
}

.user-edit-section {
    margin-bottom: 18px;
    background: var(--el-bg-color);
}

.authorization-section {
    min-height: 420px;
}

.section-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.section-title > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.section-title span {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.section-title small {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    font-weight: 400;
}

.authorization-tip {
    margin-bottom: 18px;
    border-radius: 10px;
}

.user-edit-actions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding: 16px 0 4px;
    border-top: 1px solid var(--el-border-color-lighter);
}

.user-edit-actions .el-button {
    min-width: 88px;
}

:deep(.el-step__title) {
    font-weight: 500;
}

:deep(.el-step__description) {
    font-size: 12px;
}

:deep(.el-form-item) {
    margin-bottom: 22px;
}

:deep(.el-input),
:deep(.el-select),
:deep(.el-autocomplete),
:deep(.el-tree-select) {
    width: 100%;
}

@media (max-width: 768px) {
    .user-edit-page {
        padding: 20px 16px 24px;
    }

    .user-edit-steps {
        padding: 0;
    }

    .section-title {
        align-items: flex-start;
        flex-direction: column;
    }

    :deep(.el-col) {
        width: 100%;
        max-width: 100%;
        flex: 0 0 100%;
    }
}
</style>
