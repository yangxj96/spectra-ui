<script setup lang="ts">
import { Iphone, Lock, Message, Phone } from "@element-plus/icons-vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { computed, onMounted, ref, type Component } from "vue";

import { AccountApi, type AccountVO } from "@/api/account/account-api";

defineOptions({
    name: "ProfileBinding"
});

// 登录类型映射
const loginTypeMap: Record<string, { label: string; component: Component }> = {
    PASSWORD: { label: "密码登录", component: Lock },
    SMS: { label: "手机登录", component: Phone },
    EMAIL: { label: "邮箱登录", component: Message },
    OTP: { label: "扫码登录", component: Iphone }
};

// 已绑定账号列表
const accountBindings = ref<AccountVO[]>([]);

// 当前登录方式
const currentLoginType = ref("PASSWORD");
const currentLoginName = ref("admin@devops00.com");

// 绑定手机弹窗相关
const phoneDialogVisible = ref(false);
const phoneForm = ref({ phone: "", code: "" });
const phoneLoading = ref(false);
const phoneCountdown = ref(0);
let phoneCountdownTimer: ReturnType<typeof setInterval> | null = null;

// 绑定邮箱弹窗相关
const emailDialogVisible = ref(false);
const emailForm = ref({ email: "", code: "" });
const emailLoading = ref(false);
const emailCountdown = ref(0);
let emailCountdownTimer: ReturnType<typeof setInterval> | null = null;

// 检查是否已绑定手机
const isPhoneBound = computed(() => {
    return accountBindings.value.some(item => item.type === "SMS");
});

// 检查是否已绑定邮箱
const isEmailBound = computed(() => {
    return accountBindings.value.some(item => item.type === "EMAIL");
});

// 加载绑定列表
async function loadBindings() {
    try {
        const list = await AccountApi.list();
        accountBindings.value = list;

        // 找到当前登录方式
        const current = list.find(item => item.current);
        if (current) {
            currentLoginType.value = current.type;
            currentLoginName.value = current.loginName;
        }
    } catch (error) {
        console.error("加载绑定列表失败:", error);
    }
}

function getAccountDisplay(account: AccountVO): string {
    return account.loginName || "";
}

// 发送手机验证码
async function handleSendPhoneCode() {
    if (!phoneForm.value.phone) {
        ElMessage.warning("请输入手机号");
        return;
    }
    if (!/^1[3-9]\d{9}$/.test(phoneForm.value.phone)) {
        ElMessage.warning("手机号格式不正确");
        return;
    }

    try {
        // 调用发送验证码接口（复用现有的 auth/sms 接口）
        // TODO: 需要对接实际的发送验证码 API
        ElMessage.success("验证码已发送");
        startPhoneCountdown();
    } catch {
        ElMessage.error("发送验证码失败");
    }
}

function startPhoneCountdown() {
    phoneCountdown.value = 60;
    if (phoneCountdownTimer) clearInterval(phoneCountdownTimer);
    phoneCountdownTimer = setInterval(() => {
        phoneCountdown.value--;
        if (phoneCountdown.value <= 0) {
            clearInterval(phoneCountdownTimer!);
            phoneCountdownTimer = null;
        }
    }, 1000);
}

// 绑定手机
async function handleBindPhone() {
    if (!phoneForm.value.phone || !phoneForm.value.code) {
        ElMessage.warning("请填写完整信息");
        return;
    }

    phoneLoading.value = true;
    try {
        await AccountApi.bindPhone({
            phone: phoneForm.value.phone,
            code: phoneForm.value.code
        });
        ElMessage.success("绑定成功");
        phoneDialogVisible.value = false;
        phoneForm.value = { phone: "", code: "" };
        loadBindings();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "绑定失败";
        ElMessage.error(message);
    } finally {
        phoneLoading.value = false;
    }
}

// 发送邮箱验证码
async function handleSendEmailCode() {
    if (!emailForm.value.email) {
        ElMessage.warning("请输入邮箱");
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.value.email)) {
        ElMessage.warning("邮箱格式不正确");
        return;
    }

    try {
        // 调用发送验证码接口（复用现有的 auth/email 接口）
        // TODO: 需要对接实际的发送验证码 API
        ElMessage.success("验证码已发送");
        startEmailCountdown();
    } catch {
        ElMessage.error("发送验证码失败");
    }
}

function startEmailCountdown() {
    emailCountdown.value = 60;
    if (emailCountdownTimer) clearInterval(emailCountdownTimer);
    emailCountdownTimer = setInterval(() => {
        emailCountdown.value--;
        if (emailCountdown.value <= 0) {
            clearInterval(emailCountdownTimer!);
            emailCountdownTimer = null;
        }
    }, 1000);
}

// 绑定邮箱
async function handleBindEmail() {
    if (!emailForm.value.email || !emailForm.value.code) {
        ElMessage.warning("请填写完整信息");
        return;
    }

    emailLoading.value = true;
    try {
        await AccountApi.bindEmail({
            email: emailForm.value.email,
            code: emailForm.value.code
        });
        ElMessage.success("绑定成功");
        emailDialogVisible.value = false;
        emailForm.value = { email: "", code: "" };
        loadBindings();
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "绑定失败";
        ElMessage.error(message);
    } finally {
        emailLoading.value = false;
    }
}

// 打开绑定手机弹窗
function handleBindPhoneClick() {
    phoneForm.value = { phone: "", code: "" };
    phoneDialogVisible.value = true;
}

// 打开绑定邮箱弹窗
function handleBindEmailClick() {
    emailForm.value = { email: "", code: "" };
    emailDialogVisible.value = true;
}

// 解绑账号
async function handleUnbind(accountId: string) {
    try {
        await ElMessageBox.confirm("确定要解绑该账号吗？", "提示", {
            confirmButtonText: "确定",
            cancelButtonText: "取消",
            type: "warning"
        });

        await AccountApi.unbind(accountId);
        ElMessage.success("解绑成功");
        loadBindings();
    } catch (err: unknown) {
        if (err !== "cancel") {
            const message = err instanceof Error ? err.message : "解绑失败";
            ElMessage.error(message);
        }
    }
}

onMounted(() => {
    loadBindings();
});
</script>

<template>
    <div class="binding-content">
        <div class="binding-section">
            <div class="current-login">
                <span class="current-login-label">当前登录方式：</span>
                <span class="current-login-tag">
                    <el-icon><Lock /></el-icon>
                    {{ loginTypeMap[currentLoginType]?.label }} ({{ currentLoginName }})
                </span>
            </div>
        </div>

        <el-divider />

        <div class="binding-section">
            <h4 class="section-title">已绑定账号</h4>
            <el-table :data="accountBindings" stripe class="binding-table">
                <el-table-column label="类型" width="120">
                    <template #default="{ row }">
                        <div class="type-cell">
                            <el-icon><component :is="loginTypeMap[row.type]?.component" /></el-icon>
                            <span>{{ loginTypeMap[row.type]?.label }}</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="账号">
                    <template #default="{ row }">
                        <span>{{ getAccountDisplay(row) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                    <template #default="{ row }">
                        <el-tag v-if="row.verified === 1" type="success" size="small">已验证</el-tag>
                        <el-tag v-else type="warning" size="small">未验证</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                    <template #default="{ row }">
                        <el-button
                            v-if="row.type !== 'PASSWORD'"
                            link
                            type="danger"
                            size="small"
                            @click="handleUnbind(row.id)">
                            解绑
                        </el-button>
                        <span v-else class="text-muted">—</span>
                    </template>
                </el-table-column>
            </el-table>
        </div>

        <el-divider />

        <div class="binding-section">
            <h4 class="section-title">绑定新账号</h4>
            <div class="bind-actions">
                <el-button :disabled="isPhoneBound" @click="handleBindPhoneClick">
                    <el-icon><Phone /></el-icon>
                    绑定手机
                </el-button>
                <el-button :disabled="isEmailBound" @click="handleBindEmailClick">
                    <el-icon><Message /></el-icon>
                    绑定邮箱
                </el-button>
                <el-button disabled>
                    <el-icon><Iphone /></el-icon>
                    绑定微信
                </el-button>
            </div>
        </div>
    </div>

    <!-- 绑定手机弹窗 -->
    <el-dialog v-model="phoneDialogVisible" title="绑定手机号" width="400px">
        <el-form :model="phoneForm" label-width="80px">
            <el-form-item label="手机号">
                <el-input v-model="phoneForm.phone" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item label="验证码">
                <div class="code-input">
                    <el-input v-model="phoneForm.code" placeholder="请输入验证码" />
                    <el-button :disabled="phoneCountdown > 0" @click="handleSendPhoneCode">
                        {{ phoneCountdown > 0 ? `${phoneCountdown}s` : "获取验证码" }}
                    </el-button>
                </div>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="phoneDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="phoneLoading" @click="handleBindPhone">确定</el-button>
        </template>
    </el-dialog>

    <!-- 绑定邮箱弹窗 -->
    <el-dialog v-model="emailDialogVisible" title="绑定邮箱" width="400px">
        <el-form :model="emailForm" label-width="80px">
            <el-form-item label="邮箱">
                <el-input v-model="emailForm.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="验证码">
                <div class="code-input">
                    <el-input v-model="emailForm.code" placeholder="请输入验证码" />
                    <el-button :disabled="emailCountdown > 0" @click="handleSendEmailCode">
                        {{ emailCountdown > 0 ? `${emailCountdown}s` : "获取验证码" }}
                    </el-button>
                </div>
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="emailDialogVisible = false">取消</el-button>
            <el-button type="primary" :loading="emailLoading" @click="handleBindEmail">确定</el-button>
        </template>
    </el-dialog>
</template>

<style scoped lang="scss">
.binding-content {
    padding: 8px 0;
}

.binding-section {
    padding: 8px 0;
}

.current-login {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    background-color: var(--el-fill-color-lighter);
    border-radius: 6px;
}

.current-login-label {
    color: var(--el-text-color-secondary);
    font-size: 13px;
    white-space: nowrap;
}

.current-login-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background-color: var(--el-color-success-light-9);
    color: var(--el-color-success);
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
}

.section-title {
    margin: 0 0 12px 0;
    font-size: 15px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.binding-table {
    width: 100%;
}

.type-cell {
    display: flex;
    align-items: center;
    gap: 6px;
}

.bind-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.text-muted {
    color: var(--el-text-color-placeholder);
}

.code-input {
    display: flex;
    gap: 8px;
    width: 100%;

    .el-input {
        flex: 1;
    }
}
</style>
