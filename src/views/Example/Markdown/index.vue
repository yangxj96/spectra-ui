<script setup lang="ts">
import { PDFViewer, type PDFViewerConfig } from "@embedpdf/vue-pdf-viewer";

const config = {
    src: "https://127.0.0.1:4004/api/file/preview/019eca6e-5950-799b-875f-fda0eb584a8a",
    theme: { preference: "system" },
    i18n: {
        defaultLocale: "zh-CN",
        fallbackLocale: "en"
    }
} satisfies PDFViewerConfig;
</script>

<template>
    <div style="height: 100vh">
        <PDFViewer :config="config" :style="{ width: '100%', height: '100%' }" />
    </div>
</template>
