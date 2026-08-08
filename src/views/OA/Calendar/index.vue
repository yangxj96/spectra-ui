<script setup lang="ts">
import { ElMessage, ElMessageBox } from "element-plus";
import { reactive, ref } from "vue";

import { CalendarApi } from "@/api/oa/calendar-api.ts";
import useTable from "@/hooks/use-table.ts";
import { toIsoDateTime } from "@/utils/date-utils.ts";

const condition = ref<CalendarPageParams>({ page_num: 1, page_size: 15 });
const { handleCurrentChange, handleSizeChange, handlerConditionQuery, pagination, table_data } = useTable<CalendarVO>(
    CalendarApi.page,
    condition.value
);
const dialogVisible = ref(false);
const form = reactive<CalendarSaveParams>({
    title: "",
    start_time: "",
    end_time: "",
    all_day: false,
    visibility: "PRIVATE"
});

const openCreate = () => {
    Object.assign(form, {
        title: "",
        content: "",
        start_time: "",
        end_time: "",
        all_day: false,
        visibility: "PRIVATE"
    });
    dialogVisible.value = true;
};

const create = async () => {
    await CalendarApi.create({
        ...form,
        start_time: toIsoDateTime(form.start_time),
        end_time: toIsoDateTime(form.end_time)
    });
    ElMessage.success("日程已创建");
    dialogVisible.value = false;
    handlerConditionQuery();
};

const remove = async (row: CalendarVO) => {
    await ElMessageBox.confirm(`确认删除日程“${row.title}”吗？`, "提示", { type: "warning" });
    await CalendarApi.delete(row.id);
    ElMessage.success("日程已删除");
    handlerConditionQuery();
};
</script>

<template>
    <div class="oa-page">
        <el-card class="oa-toolbar">
            <el-form :inline="true" :model="condition">
                <el-form-item label="关键词">
                    <el-input v-model="condition.keyword" placeholder="日程标题" clearable />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handlerConditionQuery">查询</el-button>
                    <el-button @click="openCreate">新建日程</el-button>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card class="oa-body">
            <el-table :data="table_data" height="100%" stripe>
                <el-table-column prop="title" label="日程" min-width="220" />
                <el-table-column prop="start_time" label="开始" width="190" />
                <el-table-column prop="end_time" label="结束" width="190" />
                <el-table-column prop="visibility" label="共享范围" width="120" />
                <el-table-column prop="location" label="地点" width="160" />
                <el-table-column label="操作" width="90" fixed="right">
                    <template #default="scope">
                        <el-button link type="danger" @click="remove(scope.row)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :page-size="pagination.size"
                :page-sizes="pagination.page_sizes"
                :total="pagination.total"
                @size-change="handleSizeChange"
                @current-change="handleCurrentChange" />
        </el-card>
        <el-dialog v-model="dialogVisible" title="新建日程" width="560px">
            <el-form label-width="90px">
                <el-form-item label="标题" required><el-input v-model="form.title" /></el-form-item>
                <el-form-item label="开始" required>
                    <el-date-picker v-model="form.start_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
                </el-form-item>
                <el-form-item label="结束" required>
                    <el-date-picker v-model="form.end_time" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
                </el-form-item>
                <el-form-item label="共享">
                    <el-select v-model="form.visibility">
                        <el-option label="私有" value="PRIVATE" />
                        <el-option label="部门" value="DEPARTMENT" />
                        <el-option label="全员" value="ALL" />
                    </el-select>
                </el-form-item>
                <el-form-item label="地点"><el-input v-model="form.location" /></el-form-item>
                <el-form-item label="备注"><el-input v-model="form.content" type="textarea" /></el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="create">创建</el-button>
            </template>
        </el-dialog>
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
.oa-toolbar {
    flex: none;
}
.oa-body {
    flex: 1;
    min-height: 0;
}
.el-pagination {
    justify-content: flex-end;
    margin-top: 12px;
}
</style>
