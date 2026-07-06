<script setup lang="ts">
import { nextTick, ref } from "vue";

import testImg from "@/assets/test/测试图片2.png";
import { upload } from "@/plugin/request/api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

// ========== 类型定义 ==========

interface OcrTeamEntry {
    team_id: number;
    members: string[];
}

interface OcrApiResponse {
    teams: OcrTeamEntry[];
    layout: string;
    total_texts: number;
}

// ========== 状态 ==========

const teamCount = ref(7);
const imageUrl = ref<string>("");
const imageLoaded = ref(false);
const imageEl = ref<HTMLImageElement | null>(null);
const rawFile = ref<File | null>(null);

// 图片缩放
const zoomScale = ref(1);

// 图片容器 ref
const imageContainer = ref<HTMLDivElement | null>(null);

// 团队输入框数据：最多10个队伍，每个队伍5个输入框
const teamInputs = ref<string[][]>(
    Array.from({ length: 10 }, () => Array(5).fill(""))
);

// 识别状态
const recognizing = ref(false);

// ========== 方法 ==========

// 加载测试图片
const loadTestImage = async () => {
    const resp = await fetch(testImg);
    const blob = await resp.blob();
    rawFile.value = new File([blob], "测试图片2.png", { type: blob.type });

    imageUrl.value = testImg;
    imageLoaded.value = false;
    teamInputs.value = Array.from({ length: 10 }, () => Array(5).fill(""));
    zoomScale.value = 1;
    nextTick(() => {
        const img = imageContainer.value?.querySelector("img") as HTMLImageElement;
        if (img) {
            imageEl.value = img;
            if (img.complete) {
                imageLoaded.value = true;
            } else {
                img.onload = () => {
                    imageLoaded.value = true;
                };
            }
        }
    });
};

// 上传图片
const handleUploadChange = (file: File) => {
    if (!file) return;
    rawFile.value = file;
    imageUrl.value = URL.createObjectURL(file);
    imageLoaded.value = false;
    teamInputs.value = Array.from({ length: 10 }, () => Array(5).fill(""));
    zoomScale.value = 1;
    nextTick(() => {
        const img = imageContainer.value?.querySelector("img") as HTMLImageElement;
        if (img) {
            imageEl.value = img;
            img.onload = () => {
                imageLoaded.value = true;
            };
        }
    });
};

// 鼠标滚轮缩放
const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    zoomScale.value = Math.max(0.3, Math.min(5, zoomScale.value + delta));
};

// ========== 识别逻辑 ==========

const handleRecognize = async () => {
    if (!imageLoaded.value || !rawFile.value) {
        MessageUtils.warning("请先加载图片");
        return;
    }

    recognizing.value = true;
    try {
        const formData = new FormData();
        formData.append("file", rawFile.value);

        const data = await upload<OcrApiResponse>("/api/ocr/recognize", formData);

        if (!data || !data.teams) {
            MessageUtils.error("识别失败");
            return;
        }

        // 清空并填入结果
        teamInputs.value = Array.from({ length: 10 }, () => Array(5).fill(""));
        for (const team of data.teams) {
            const idx = team.team_id - 1;
            if (idx >= 0 && idx < 10) {
                team.members.slice(0, 5).forEach((m, j) => {
                    teamInputs.value[idx][j] = m;
                });
            }
        }

        MessageUtils.success(`识别完成，共 ${data.teams.length} 支队伍，${data.total_texts} 个文本`);
    } catch (error) {
        console.error("OCR 识别失败:", error);
        MessageUtils.error("识别失败，请检查后端服务");
    } finally {
        recognizing.value = false;
    }
};
</script>

<template>
    <div class="ocr-page">
        <!-- 左侧：图片展示 -->
        <div class="ocr-left">
            <div class="ocr-toolbar">
                <span class="toolbar-label">队伍数量</span>
                <el-input-number v-model="teamCount" :min="1" :max="10" size="small" />
                <el-upload
                    :auto-upload="false"
                    :show-file-list="false"
                    accept="image/*"
                    :on-change="(f: any) => handleUploadChange(f.raw)">
                    <el-button size="small">选择图片</el-button>
                </el-upload>
                <el-button size="small" @click="loadTestImage">加载测试图</el-button>
                <el-button type="primary" size="small" :loading="recognizing" :disabled="!imageLoaded" @click="handleRecognize">
                    {{ recognizing ? "识别中..." : "识别" }}
                </el-button>
                <span class="zoom-label">{{ Math.round(zoomScale * 100) }}%</span>
            </div>

            <div
                ref="imageContainer"
                class="ocr-container"
                @wheel.prevent="onWheel">
                <img v-if="imageUrl" :src="imageUrl" class="ocr-image" :style="{ transform: `scale(${zoomScale})` }" draggable="false" />
                <div v-else class="ocr-empty">请上传图片或加载测试图</div>
            </div>
        </div>

        <!-- 右侧：识别结果输入框 -->
        <div class="ocr-right">
            <div class="ocr-result-title">识别结果</div>
            <div class="result-grid">
                <div v-for="row in 2" :key="row" class="result-row">
                    <div
                        v-for="col in 5"
                        :key="col"
                        class="team-card"
                        :class="{ 'team-card--disabled': (row - 1) * 5 + col > teamCount }">
                        <div class="team-card__header">队伍{{ (row - 1) * 5 + col }}</div>
                        <div class="team-card__body">
                            <el-input
                                v-for="m in 5"
                                :key="m"
                                v-model="teamInputs[(row - 1) * 5 + col - 1][m - 1]"
                                size="small"
                                :disabled="(row - 1) * 5 + col > teamCount"
                                :placeholder="'成员' + m" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.ocr-page {
    display: flex;
    height: 90vh;
    gap: 12px;
    padding: 16px;
}

/* ===== 左侧 ===== */
.ocr-left {
    width: 520px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
}

.ocr-toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
}

.toolbar-label {
    font-size: 14px;
    white-space: nowrap;
}

.zoom-label {
    font-size: 12px;
    color: #999;
    min-width: 40px;
}

.ocr-container {
    position: relative;
    width: 500px;
    height: 500px;
    flex-shrink: 0;
    background: #1a1a2e;
    border-radius: 6px;
    overflow: hidden;
}

.ocr-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
    transform-origin: center center;
}

.ocr-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 16px;
}

/* ===== 右侧 ===== */
.ocr-right {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
}

.ocr-result-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 8px;
    flex-shrink: 0;
}

.result-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.result-row {
    display: flex;
    gap: 8px;
}

.team-card {
    flex: 1;
    min-width: 0;
    border: 1px solid #e4e7ed;
    border-radius: 6px;
    padding: 8px;
    background: #fafafa;

    &--disabled {
        opacity: 0.4;
        pointer-events: none;
    }
}

.team-card__header {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 6px;
    color: #303133;
}

.team-card__body {
    display: flex;
    flex-direction: column;
    gap: 4px;
}
</style>
