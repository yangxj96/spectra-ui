<script setup lang="ts">
import { onMounted, ref } from "vue";

import { SecurityContextApi, type SecurityContextResponse } from "@/api/auth/security-context-api.ts";

const loading = ref(true);
const context = ref<SecurityContextResponse>({ permissions: [] });

async function loadContext() {
    loading.value = true;
    try {
        context.value = await SecurityContextApi.current();
    } finally {
        loading.value = false;
    }
}

onMounted(() => void loadContext());
</script>

<template>
    <div class="page-container">
        <el-card v-loading="loading" shadow="never">
            <template #header>当前授权上下文</template>
            <el-descriptions :column="1" border>
                <el-descriptions-item label="有效权限">
                    <el-space wrap>
                        <el-tag v-for="permission in context.permissions" :key="permission" type="success">
                            {{ permission }}
                        </el-tag>
                        <el-empty v-if="context.permissions.length === 0" description="当前没有有效权限" />
                    </el-space>
                </el-descriptions-item>
                <el-descriptions-item label="可授予权限">
                    <el-space wrap>
                        <el-tag
                            v-for="permission in context.grantable_permissions ?? context.grantablePermissions ?? []"
                            :key="permission"
                            type="warning">
                            {{ permission }}
                        </el-tag>
                    </el-space>
                </el-descriptions-item>
            </el-descriptions>
        </el-card>
    </div>
</template>
