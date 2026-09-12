<script setup lang="ts">
const tableData = [] as unknown[];

for (let i = 0; i < 25; i++) {
    tableData.push({
        account: "yangxj96@gmail.com",
        name: "平台管理员",
        organization_name: "Tom",
        ac: [
            {
                device_type: "PC",
                create_time: "2025-10-15 00:00:00",
                ip: "255.255.255.255",
                address: "内网地址"
            }
        ]
    });
}
</script>

<template>
    <!-- 搜索区 -->
    <el-row class="box__search">
        <el-form :inline="true">
            <el-form-item label="账号">
                <el-input class="search-field" placeholder="请输入账号" clearable />
            </el-form-item>
            <el-form-item label="姓名">
                <el-input class="search-field" placeholder="请输入姓名" clearable />
            </el-form-item>
            <el-form-item label="部门">
                <el-input class="search-field" placeholder="请选择部门" clearable />
            </el-form-item>
            <el-form-item>
                <el-button type="primary">查询</el-button>
                <el-button>重置</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <!-- 数据区 -->
    <el-row class="box__body">
        <el-col :span="24">
            <el-table :data="tableData" stripe height="92%">
                <el-table-column type="expand" align="center">
                    <template #default="props">
                        <el-row style="width: 100%; padding-left: 1vw; padding-right: 1vw">
                            <el-table :data="props.row.ac" stripe style="width: 100%">
                                <el-table-column align="center" width="060" type="index" label="序号" />
                                <el-table-column align="center" width="100" prop="device_type" label="设备类型" />
                                <el-table-column align="center" width="200" prop="ip" label="登录IP" />
                                <el-table-column align="center" prop="address" label="登录地点" />
                                <el-table-column align="center" width="200" prop="create_time" label="登录时间" />
                                <el-table-column align="center" label="操作">
                                    <template #default>
                                        <el-button link type="primary">踢出此设备</el-button>
                                    </template>
                                </el-table-column>
                            </el-table>
                        </el-row>
                    </template>
                </el-table-column>
                <el-table-column align="center" prop="account" label="登录账号" />
                <el-table-column align="center" prop="name" label="姓名" />
                <el-table-column
                    align="center"
                    width="200"
                    prop="organization_name"
                    label="部门"
                    show-overflow-tooltip />
                <el-table-column align="center" label="操作">
                    <template #default>
                        <el-button link type="primary">冻结</el-button>
                        <el-button link type="primary">踢出</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <!-- 分页 -->
            <el-pagination
                layout="total, sizes, prev, pager, next"
                :page-size="15"
                :page-sizes="[15, 50, 100, 150, 300]"
                :total="1000" />
        </el-col>
    </el-row>
</template>

<style scoped lang="scss">
.box__search {
    height: 10%;
    display: flex;
    align-items: center;
    overflow-x: auto;
    padding: 0 20px;
}

.box__search :deep(.el-form--inline) {
    display: flex;
    flex-wrap: nowrap;
    flex: 0 0 max-content;
    width: max-content;
    min-width: max-content;
    align-items: center;
}

.box__search :deep(.el-form-item) {
    flex: 0 0 auto;
    margin-right: 12px;
    margin-bottom: 0;
}

.box__search :deep(.search-field) {
    flex: 0 0 150px;
    width: 150px;
    min-width: 150px;
    max-width: 150px;
}

.box__body {
    display: block;
    height: 90%;
    padding: 0 20px;
}

.box__body :deep(.el-col) {
    height: 100%;
}

.box__body :deep(.el-pagination) {
    justify-content: flex-end;
    margin-top: 4px;
}
</style>
