<script setup lang="ts">
import { ref } from "vue";

const tableData = ref([
    { id: 1, name: "张三", age: 28, address: "北京市朝阳区" },
    { id: 2, name: "李四", age: 32, address: "上海市浦东新区" },
    { id: 3, name: "王五", age: 25, address: "广州市天河区" }
]);
</script>

<template>
    <div class="table-example">
        <el-table :data="tableData" stripe style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="age" label="年龄" width="100" />
            <el-table-column prop="address" label="地址" />
        </el-table>
    </div>
</template>

<style scoped lang="scss">
.table-example {
    padding: 20px;
}
</style>
