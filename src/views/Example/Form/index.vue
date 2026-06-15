<script setup lang="ts">
import { reactive, useTemplateRef } from "vue";

import useFileUpload from "@/hooks/use-file-upload.ts";

const { files, handleUpload } = useFileUpload();

const formRef = useTemplateRef("formRef");

const form = reactive({
    files: files
});
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

            <el-form-item label="附件">
                <el-upload :file-list="files" :http-request="handleUpload" :limit="1">
                    <el-button type="primary">选择文件</el-button>
                    <template #tip>
                        <div class="el-upload__tip">这是提示.</div>
                    </template>
                </el-upload>
            </el-form-item>

            <el-form-item>
                <el-button type="primary">确定</el-button>
            </el-form-item>
        </el-form>
    </el-row>
    <el-image src="https://127.0.0.1:4004/api/file/preview/019eca6f-16cb-7294-a5d4-030a682bf387" />
</template>
