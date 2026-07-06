<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";

import testImg from "@/assets/test/测试图片2.png";
import { upload } from "@/plugin/request/api.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

// ========== 类型定义 ==========

interface RecognitionBox {
    id: number;
    x: number;
    y: number;
    width: number;
    height: number;
    teamId: number;
}

interface TeamResult {
    teamId: number;
    members: string[];
}

// ========== 状态 ==========

const teamCount = ref(7);
const imageUrl = ref<string>("");
const imageLoaded = ref(false);
const imageEl = ref<HTMLImageElement | null>(null);
const rawFile = ref<File | null>(null);

// 识别框（每个框独立尺寸）
const boxes = ref<RecognitionBox[]>([]);

// 拖动/缩放状态
const isDragging = ref(false);
const isResizing = ref(false);
const activeBoxId = ref<number | null>(null);

// 拖动偏移
const dragOffset = ref({ x: 0, y: 0 });

// 缩放
const resizeDir = ref("");
const resizeStart = ref({ x: 0, y: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });

// 图片容器 ref
const imageContainer = ref<HTMLDivElement | null>(null);

// 识别结果
const results = ref<TeamResult[]>([]);

// ========== 计算属性 ==========

const columns = computed(() => (teamCount.value <= 5 ? teamCount.value : 5));
const rows = computed(() => (teamCount.value <= 5 ? 1 : 2));

// ========== 方法 ==========

// 加载测试图片
const loadTestImage = async () => {
    const resp = await fetch(testImg);
    const blob = await resp.blob();
    rawFile.value = new File([blob], "测试图片2.png", { type: blob.type });

    imageUrl.value = testImg;
    imageLoaded.value = false;
    results.value = [];
    nextTick(() => {
        const img = imageContainer.value?.querySelector("img") as HTMLImageElement;
        if (img) {
            imageEl.value = img;
            if (img.complete) {
                imageLoaded.value = true;
                distributeBoxes();
            } else {
                img.onload = () => {
                    imageLoaded.value = true;
                    distributeBoxes();
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
    results.value = [];
    nextTick(() => {
        const img = imageContainer.value?.querySelector("img") as HTMLImageElement;
        if (img) {
            imageEl.value = img;
            img.onload = () => {
                imageLoaded.value = true;
                distributeBoxes();
            };
        }
    });
};

// 均匀分布识别框
const distributeBoxes = () => {
    const container = imageContainer.value;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const cols = columns.value;
    const rowsCount = rows.value;
    const count = teamCount.value;

    const padding = 12;
    const w = (cw - padding * (cols + 1)) / cols;
    const h = (ch - padding * (rowsCount + 1)) / rowsCount;

    const newBoxes: RecognitionBox[] = [];
    let idx = 0;

    for (let r = 0; r < rowsCount; r++) {
        const colsInRow = r === 0 ? Math.min(count, 5) : Math.min(count - 5, 5);
        const rowPadding = (cw - colsInRow * w) / (colsInRow + 1);

        for (let c = 0; c < colsInRow; c++) {
            idx++;
            newBoxes.push({
                id: idx,
                x: rowPadding + c * (w + rowPadding),
                y: padding + r * (h + padding),
                width: w,
                height: h,
                teamId: idx
            });
        }
    }

    boxes.value = newBoxes;
};

// 队伍数量变化重新分布
watch(teamCount, (val) => {
    if (val < 1) teamCount.value = 1;
    if (val > 10) teamCount.value = 10;
    if (imageLoaded.value) {
        distributeBoxes();
    }
    results.value = [];
});

// ========== 拖动逻辑 ==========

const onBoxPointerDown = (e: PointerEvent, box: RecognitionBox) => {
    if (isResizing.value) return;
    e.preventDefault();
    e.stopPropagation();

    const container = imageContainer.value;
    if (!container) return;

    isDragging.value = true;
    activeBoxId.value = box.id;

    const rect = container.getBoundingClientRect();
    dragOffset.value = {
        x: e.clientX - rect.left - box.x,
        y: e.clientY - rect.top - box.y
    };
};

const onContainerPointerMove = (e: PointerEvent) => {
    if (isDragging.value && activeBoxId.value !== null) {
        const container = imageContainer.value;
        if (!container) return;

        const rect = container.getBoundingClientRect();
        const newX = e.clientX - rect.left - dragOffset.value.x;
        const newY = e.clientY - rect.top - dragOffset.value.y;

        const box = boxes.value.find(b => b.id === activeBoxId.value);
        if (!box) return;

        box.x = Math.max(0, Math.min(newX, rect.width - box.width));
        box.y = Math.max(0, Math.min(newY, rect.height - box.height));
    } else if (isResizing.value && activeBoxId.value !== null) {
        const container = imageContainer.value;
        if (!container) return;
        const maxW = container.clientWidth;
        const maxH = container.clientHeight;
        const minSize = 30;

        const box = boxes.value.find(b => b.id === activeBoxId.value);
        if (!box) return;

        const dx = e.clientX - resizeStart.value.x;
        const dy = e.clientY - resizeStart.value.y;
        const dir = resizeDir.value;

        let newX = resizeStart.value.boxX;
        let newY = resizeStart.value.boxY;
        let newW = resizeStart.value.boxW;
        let newH = resizeStart.value.boxH;

        if (dir.includes("e")) newW = Math.max(minSize, Math.min(resizeStart.value.boxW + dx, maxW - newX));
        if (dir.includes("w")) {
            const clampedDx = Math.min(dx, resizeStart.value.boxW - minSize);
            newX = resizeStart.value.boxX + clampedDx;
            newW = resizeStart.value.boxW - clampedDx;
        }
        if (dir.includes("s")) newH = Math.max(minSize, Math.min(resizeStart.value.boxH + dy, maxH - newY));
        if (dir.includes("n")) {
            const clampedDy = Math.min(dy, resizeStart.value.boxH - minSize);
            newY = resizeStart.value.boxY + clampedDy;
            newH = resizeStart.value.boxH - clampedDy;
        }

        box.x = Math.max(0, newX);
        box.y = Math.max(0, newY);
        box.width = Math.max(minSize, newW);
        box.height = Math.max(minSize, newH);
    }
};

const onContainerPointerUp = () => {
    isDragging.value = false;
    isResizing.value = false;
    activeBoxId.value = null;
    resizeDir.value = "";
};

// ========== 缩放逻辑 ==========

const onHandlePointerDown = (e: PointerEvent, box: RecognitionBox, dir: string) => {
    e.preventDefault();
    e.stopPropagation();

    isResizing.value = true;
    activeBoxId.value = box.id;
    resizeDir.value = dir;
    resizeStart.value = {
        x: e.clientX,
        y: e.clientY,
        boxX: box.x,
        boxY: box.y,
        boxW: box.width,
        boxH: box.height
    };
};

// ========== 识别逻辑 ==========

const recognizing = ref(false);

interface OcrTeamEntry {
    teamId: number;
    members: string[];
}

interface OcrApiResponse {
    teams: OcrTeamEntry[];
    layout: string;
    totalTexts: number;
}

const handleRecognize = async () => {
    if (!imageLoaded.value || !rawFile.value) {
        MessageUtils.warning("请先加载图片");
        return;
    }

    recognizing.value = true;
    try {
        const container = imageContainer.value;
        const img = imageEl.value;
        if (!container || !img) return;

        // 计算图片在容器中的显示区域（object-fit: contain）
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const containerAspect = cw / ch;
        let displayW: number, displayH: number, offsetX = 0, offsetY = 0;

        if (imgAspect > containerAspect) {
            displayW = cw;
            displayH = cw / imgAspect;
            offsetY = (ch - displayH) / 2;
        } else {
            displayH = ch;
            displayW = ch * imgAspect;
            offsetX = (cw - displayW) / 2;
        }

        const scaleX = img.naturalWidth / displayW;
        const scaleY = img.naturalHeight / displayH;

        // 将框坐标从容器坐标转换为图片坐标
        const regions = boxes.value.map(box => ({
            teamId: box.teamId,
            x: (box.x - offsetX) * scaleX,
            y: (box.y - offsetY) * scaleY,
            width: box.width * scaleX,
            height: box.height * scaleY
        }));

        const formData = new FormData();
        formData.append("file", rawFile.value);
        formData.append("regions", new Blob([JSON.stringify(regions)], { type: "application/json" }));

        const data = await upload<OcrApiResponse>("/api/ocr/recognize", formData);

        if (!data || !data.teams) {
            MessageUtils.error("识别失败");
            return;
        }

        // 设置队伍数量
        teamCount.value = data.teams.length;

        // 填充结果
        results.value = data.teams.map(t => ({
            teamId: t.teamId,
            members: t.members
        }));

        MessageUtils.success(`识别完成，共 ${data.teams.length} 支队伍，${data.totalTexts} 个文本`);
    } catch (error) {
        console.error("OCR 识别失败:", error);
        MessageUtils.error("识别失败，请检查后端服务");
    } finally {
        recognizing.value = false;
    }
};

// 手柄样式映射
const handleCursors: Record<string, string> = {
    n: "n-resize",
    s: "s-resize",
    e: "e-resize",
    w: "w-resize",
    ne: "ne-resize",
    nw: "nw-resize",
    se: "se-resize",
    sw: "sw-resize"
};
</script>

<template>
    <div class="ocr-page">
        <!-- 左侧：图片 + 识别框 -->
        <div class="ocr-left">
            <!-- 工具栏 -->
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
            </div>

            <!-- 图片容器 -->
            <div
                ref="imageContainer"
                class="ocr-container"
                @pointermove="onContainerPointerMove"
                @pointerup="onContainerPointerUp">
                <img v-if="imageUrl" :src="imageUrl" class="ocr-image" draggable="false" />
                <div v-else class="ocr-empty">请上传图片或加载测试图</div>

                <!-- 识别框 -->
                <div
                    v-for="box in boxes"
                    :key="box.id"
                    class="ocr-box"
                    :class="{ 'ocr-box--active': activeBoxId === box.id }"
                    :style="{
                        left: box.x + 'px',
                        top: box.y + 'px',
                        width: box.width + 'px',
                        height: box.height + 'px'
                    }"
                    @pointerdown="onBoxPointerDown($event, box)">
                    <div class="ocr-box__label">{{ box.teamId }}</div>

                    <!-- 8 个缩放手柄 -->
                    <div
                        v-for="dir in ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw']"
                        :key="dir"
                        class="ocr-handle"
                        :class="'ocr-handle--' + dir"
                        :style="{ cursor: handleCursors[dir] }"
                        @pointerdown.stop="onHandlePointerDown($event, box, dir)" />
                </div>
            </div>

            <!-- 操作按钮 -->
            <div class="ocr-actions">
                <el-button type="primary" :loading="recognizing" :disabled="!imageLoaded" @click="handleRecognize">
                    {{ recognizing ? "识别中..." : "识别" }}
                </el-button>
            </div>
        </div>

        <!-- 右侧：识别结果 -->
        <div class="ocr-right">
            <div class="ocr-result-title">识别结果</div>
            <el-table :data="results" border stripe size="small" empty-text="暂无结果" max-height="100%">
                <el-table-column label="队伍" width="70" align="center">
                    <template #default="scope">
                        <el-tag size="small">{{ scope.row.teamId }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="成员">
                    <template #default="scope">
                        <div v-for="(m, i) in scope.row.members" :key="i" class="member-item">
                            {{ m }}
                        </div>
                        <div v-if="scope.row.members.length === 0" class="member-empty">-</div>
                    </template>
                </el-table-column>
            </el-table>
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
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.ocr-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    flex-shrink: 0;
}

.toolbar-label {
    font-size: 14px;
    white-space: nowrap;
}

.ocr-container {
    position: relative;
    flex: 1;
    min-height: 0;
    background: #1a1a2e;
    border-radius: 6px;
    overflow: hidden;
    user-select: none;
    touch-action: none;
}

.ocr-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    pointer-events: none;
}

.ocr-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: #666;
    font-size: 16px;
}

.ocr-actions {
    margin-top: 12px;
    flex-shrink: 0;
}

/* ===== 识别框 ===== */
.ocr-box {
    position: absolute;
    border: 2px solid rgba(64, 158, 255, 0.8);
    background: rgba(64, 158, 255, 0.08);
    cursor: move;
    touch-action: none;
    transition: background 0.15s;

    &--active {
        border-color: #409eff;
        background: rgba(64, 158, 255, 0.18);
        z-index: 10;
    }

    &:hover {
        border-color: #409eff;
        background: rgba(64, 158, 255, 0.12);
    }
}

.ocr-box__label {
    position: absolute;
    top: 4px;
    left: 6px;
    font-size: 12px;
    font-weight: 600;
    color: #409eff;
    pointer-events: none;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

/* ===== 缩放手柄 ===== */
.ocr-handle {
    position: absolute;
    width: 10px;
    height: 10px;
    background: #409eff;
    border: 1px solid #fff;
    border-radius: 2px;
    z-index: 5;

    &--n {
        top: -5px;
        left: 50%;
        transform: translateX(-50%);
    }
    &--s {
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
    }
    &--e {
        right: -5px;
        top: 50%;
        transform: translateY(-50%);
    }
    &--w {
        left: -5px;
        top: 50%;
        transform: translateY(-50%);
    }
    &--ne {
        top: -5px;
        right: -5px;
    }
    &--nw {
        top: -5px;
        left: -5px;
    }
    &--se {
        bottom: -5px;
        right: -5px;
    }
    &--sw {
        bottom: -5px;
        left: -5px;
    }
}

/* ===== 右侧 ===== */
.ocr-right {
    width: 280px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
}

.ocr-result-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 12px;
    flex-shrink: 0;
}

.member-item {
    padding: 2px 0;
    font-size: 13px;
    line-height: 1.4;
}

.member-empty {
    color: #ccc;
    font-size: 13px;
}
</style>
