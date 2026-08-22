<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";

import { AuthorizationApi } from "@/api/auth/authorization-api.ts";
import { RoleApi } from "@/api/auth/role-api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const router = useRouter();
const profiles = ref<AuthorizationProfile[]>([]);
const roles = ref<RolePageVO[]>([]);
const keyword = ref("");
const state = ref<AuthorizationProfile["state"] | "">("");
const loading = ref(false);

const filteredProfiles = computed(() => {
    const normalizedKeyword = keyword.value.trim().toLowerCase();
    return profiles.value.filter(profile => {
        const matchesState = !state.value || profile.state === state.value;
        if (!matchesState || !normalizedKeyword) return matchesState;
        return [profile.name, profile.code, profile.description ?? ""].some(value =>
            value.toLowerCase().includes(normalizedKeyword)
        );
    });
});

function statusLabel(profileState: AuthorizationProfile["state"]): string {
    return profileState === "ACTIVE" ? "启用" : "停用";
}

function statusType(profileState: AuthorizationProfile["state"]): "success" | "info" {
    return profileState === "ACTIVE" ? "success" : "info";
}

function roleLabel(roleCode: string): string {
    const role = roles.value.find(item => item.code === roleCode);
    return role ? `${role.name}（${role.code}）` : roleCode;
}

async function load(): Promise<void> {
    loading.value = true;
    try {
        const [nextProfiles, nextRoles] = await Promise.all([AuthorizationApi.profiles(), RoleApi.list()]);
        profiles.value = nextProfiles ?? [];
        roles.value = (nextRoles ?? []).filter(role => role.state);
    } catch (error: unknown) {
        MessageUtils.error(error);
    } finally {
        loading.value = false;
    }
}

function resetSearch(): void {
    keyword.value = "";
    state.value = "";
}

function openCreate(): void {
    void router.push({ name: "SystemAuthorizationProfileCreate" });
}

function openEdit(profile: AuthorizationProfile): void {
    void router.push({ name: "SystemAuthorizationProfileEdit", params: { id: profile.id } });
}

async function handleDisable(profile: AuthorizationProfile): Promise<void> {
    if (profile.state !== "ACTIVE") return;
    try {
        await MessageUtils.box.confirm(
            `停用后不能用于新用户和批量导入，已经生成的 RoleAssignment 不受影响。是否停用「${profile.name}」？`,
            "停用授权方案"
        );
        await AuthorizationApi.disableProfile(profile.id);
        MessageUtils.success("授权方案已停用");
        await load();
    } catch (error: unknown) {
        if (error !== "cancel" && error !== "close") MessageUtils.error(error);
    }
}

onMounted(load);
</script>

<template>
    <div v-loading="loading" class="profile-page">
        <el-row class="box__search">
            <el-form :inline="true" @submit.prevent>
                <el-form-item label="方案名称">
                    <el-input
                        v-model="keyword"
                        placeholder="请输入方案名称、编码或说明"
                        clearable
                        style="width: 240px" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="state" placeholder="请选择状态" clearable style="width: 240px">
                        <el-option label="启用" value="ACTIVE" />
                        <el-option label="停用" value="DISABLED" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="load">查询</el-button>
                    <el-button @click="resetSearch">重置</el-button>
                    <el-button type="primary" plain @click="openCreate">新增授权方案</el-button>
                </el-form-item>
            </el-form>
        </el-row>

        <el-row class="box__body">
            <el-alert
                class="profile-tip"
                title="授权方案不是运行时授权实例。套用后仍需根据当前用户完成 Preview/Apply，方案停用不会撤销已生效授权。"
                type="info"
                :closable="false"
                show-icon />

            <el-table :data="filteredProfiles" height="calc(100% - 58px)" stripe>
                <el-table-column align="center" type="index" label="序号" width="70" />
                <el-table-column prop="name" label="方案名称" min-width="180" show-overflow-tooltip />
                <el-table-column prop="code" label="方案编码" min-width="180" show-overflow-tooltip />
                <el-table-column label="包含角色" min-width="240">
                    <template #default="scope">
                        <el-space wrap>
                            <el-tag v-for="assignment in scope.row.assignments" :key="assignment.role_code" type="info">
                                {{ roleLabel(assignment.role_code) }}
                            </el-tag>
                        </el-space>
                    </template>
                </el-table-column>
                <el-table-column prop="version" label="版本" width="90" align="center" />
                <el-table-column label="状态" width="100" align="center">
                    <template #default="scope">
                        <el-tag :type="statusType(scope.row.state)">{{ statusLabel(scope.row.state) }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column prop="description" label="说明" min-width="240" show-overflow-tooltip />
                <el-table-column label="操作" width="180" fixed="right" align="center">
                    <template #default="scope">
                        <el-button link type="primary" @click="openEdit(scope.row)">编辑</el-button>
                        <el-button
                            v-if="scope.row.state === 'ACTIVE'"
                            link
                            type="danger"
                            @click="handleDisable(scope.row)">
                            停用
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-row>
    </div>
</template>

<style scoped lang="scss">
.profile-page {
    height: 100%;
    overflow: hidden;
    background: var(--el-bg-color);
}

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
    display: block;
    padding: 0 1vw;
}

.profile-tip {
    margin-bottom: 10px;
}
</style>
