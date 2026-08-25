<script setup lang="ts">
import { reactive, useTemplateRef } from "vue";

const formRef = useTemplateRef("formRef");

const form = reactive({});
</script>

<template>
    <el-row>
        <el-form ref="formRef" :model="form" label-width="auto">
            <el-form-item label="资源">
                <el-radio-group>
                    <el-radio value="Sponsor">Sponsor</el-radio>
                    <el-radio value="Venue">Venue</el-radio>
                </el-radio-group>
            </el-form-item>

            <el-form-item label="文本域">
                <el-input type="textarea" />
            </el-form-item>

            <el-form-item>
                <el-button type="primary">确定</el-button>
            </el-form-item>
        </el-form>
    </el-row>
</template>
