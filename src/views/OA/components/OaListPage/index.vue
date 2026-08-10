<script setup lang="ts">
defineOptions({
    name: "OaListPage"
});
</script>

<template>
    <div class="oa-list-page">
        <div class="oa-list-search">
            <slot name="search" />
        </div>
        <div class="oa-list-body">
            <slot />
        </div>
    </div>
</template>

<style scoped lang="scss">
.oa-list-page {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.oa-list-search {
    display: flex;
    align-items: center;
    min-height: 64px;
    padding: 0 20px;
}

.oa-list-search :deep(.el-form) {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.oa-list-search :deep(.el-form-item) {
    margin: 0;
}

.oa-list-search :deep(.el-select) {
    width: 160px;
}

.oa-list-body {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    padding: 0 20px 16px;
    overflow: hidden;
}

.oa-list-body :deep(.el-table) {
    flex: 1;
    min-height: 0;
    height: auto !important;
}

.oa-list-body :deep(.el-pagination) {
    flex-shrink: 0;
    justify-content: flex-end;
    padding: 12px 0 0;
}
</style>
