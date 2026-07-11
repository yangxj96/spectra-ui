<script setup lang="ts"></script>

<template>
    <div class="oa-page">
        <el-card>
            <div class="oa-header">
                <span class="oa-title">日历管理</span>
            </div>
        </el-card>
        <el-card class="oa-body">
            <el-empty description="日历管理功能开发中" />
        </el-card>
    </div>
</template>

<style scoped lang="scss">
.oa-page {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 20px;
    height: 100%;
}

.oa-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.oa-title {
    font-size: 16px;
    font-weight: 600;
}

.oa-body {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}
</style>
