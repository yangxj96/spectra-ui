<script setup lang="ts">
defineProps<{
    preview: DepartmentRestructurePreview;
}>();
</script>

<template>
    <section class="restructure-preview" aria-label="部门重组影响预览">
        <el-descriptions title="新部门" :column="2" border>
            <el-descriptions-item label="名称">{{ preview.new_department_name }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ preview.new_department_type }}</el-descriptions-item>
            <el-descriptions-item label="共同父部门 ID">
                {{ preview.new_department_parent_id || "根部门" }}
            </el-descriptions-item>
            <el-descriptions-item label="行政区划 ID">{{ preview.new_department_region_id }}</el-descriptions-item>
        </el-descriptions>

        <el-descriptions title="组织与成员" :column="2" border>
            <el-descriptions-item label="来源部门">{{ preview.source_department_count }}</el-descriptions-item>
            <el-descriptions-item label="迁入子部门">{{ preview.moved_department_count }}</el-descriptions-item>
            <el-descriptions-item label="受影响用户">{{ preview.affected_user_count }}</el-descriptions-item>
            <el-descriptions-item label="主部门关系">{{ preview.primary_department_count }}</el-descriptions-item>
            <el-descriptions-item label="关联部门关系">{{ preview.associated_department_count }}</el-descriptions-item>
            <el-descriptions-item label="去重关联关系">
                {{ preview.deduplicated_associated_count }}
            </el-descriptions-item>
        </el-descriptions>

        <el-descriptions v-if="preview.operation === 'MERGE'" title="授权引用" :column="2" border>
            <el-descriptions-item label="活动授权实例">{{ preview.affected_assignment_count }}</el-descriptions-item>
            <el-descriptions-item label="未删除授权方案">{{ preview.affected_profile_count }}</el-descriptions-item>
            <el-descriptions-item label="访问部门规则">{{ preview.access_rule_count }}</el-descriptions-item>
            <el-descriptions-item label="授权部门规则">{{ preview.grant_rule_count }}</el-descriptions-item>
            <el-descriptions-item label="方案访问范围">
                {{ preview.profile_access_scope_count }}
            </el-descriptions-item>
            <el-descriptions-item label="方案授权范围">{{ preview.profile_grant_scope_count }}</el-descriptions-item>
        </el-descriptions>
    </section>
</template>

<style scoped lang="scss">
.restructure-preview {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
</style>
