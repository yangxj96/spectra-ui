import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("缓存监控与维护页面", () => {
    it("监控页应该并行读取三类状态、关闭请求缓存并清理轮询定时器", () => {
        const text = source("src/views/Devops/Monitor/Cache/index.vue");

        expect(text).toContain("CacheManagementApi.getOverview");
        expect(text).toContain("CacheManagementApi.getRegions");
        expect(text).toContain("CacheManagementApi.getSecurity");
        expect(text).toContain("Promise.all");
        expect(text).toContain("15_000");
        expect(text).toContain("onUnmounted");
        expect(text).toContain("clearInterval");
        expect(text).toContain("UNAVAILABLE");
        expect(text).toContain("PARTIAL");
        expect(text).toContain("region_code");
    });

    it("监控页应该把接口状态和技术字段转换为中文显示", () => {
        const text = source("src/views/Devops/Monitor/Cache/index.vue");

        expect(text).toContain('AVAILABLE: "正常"');
        expect(text).toContain('PARTIAL: "部分可用"');
        expect(text).toContain('UNAVAILABLE: "不可用"');
        expect(text).toContain('UNKNOWN: "未知"');
        expect(text).toContain('UNSUPPORTED: "暂不支持"');
        expect(text).toContain("statusLabel(overview?.status)");
        expect(text).toContain('label="提供方"');
        expect(text).toContain("modeLabel(scope.row.mode)");
        expect(text).not.toContain('label="Provider"');
        expect(text).not.toContain('label="Session / Token"');
        expect(text).not.toContain('label="Refresh 防重放"');
    });

    it("清理页应该先预览再确认，且不提供原始 Key/Token 输入", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain("previewBusinessClear");
        expect(text).toContain("clearBusiness");
        expect(text).toContain("CLEAR-CACHE");
        expect(text).toContain("INVALIDATE-NONCES");
        expect(text).toContain("security:replay:manage");
        expect(text).toContain("invalidateAllNonces");
        expect(text).not.toContain("raw_key");
        expect(text).not.toContain("access_token");
        expect(text).not.toContain("refresh_token");
    });

    it("清理页应该把部分成功和异步状态当作非完成状态展示", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain('"PARTIAL"');
        expect(text).toContain('"ACCEPTED"');
        expect(text).toContain("getOperation");
        expect(text).toContain("onUnmounted");
    });

    it("清理页应该默认激活普通缓存并选中第一个已登记区域", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain('const activeTab = ref<"business" | "security">("business");');
        expect(text).toContain('<el-tabs v-model="activeTab"');
        expect(text).toContain("businessForm.region_codes = [nextRegions[0].code];");
        expect(text).toContain("statusLabel(preview.status)");
        expect(text).toContain("statusLabel(operation.status)");
        expect(text).not.toContain("Session / Token");
        expect(text).not.toContain("Web 加密防重放 nonce");
        expect(text).not.toContain("fail-closed");
        expect(text).not.toContain("LOCKED");
        expect(text).not.toContain("DISABLED");
    });

    it("安全运行态应该通过内层 Tabs 分离四类清理内容", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain(
            'const securityActiveTab = ref<"session" | "verification" | "login-failure" | "nonce">("session");'
        );
        expect(text).toContain('<el-tabs v-model="securityActiveTab" tab-position="left" class="security-tabs">');
        expect(text).toContain('<el-tab-pane label="会话 / 令牌" name="session">');
        expect(text).toContain('<el-tab-pane label="验证码" name="verification">');
        expect(text).toContain('<el-tab-pane label="登录失败锁定" name="login-failure">');
        expect(text).toContain('<el-tab-pane label="防重放随机数" name="nonce">');
        expect(text).not.toContain("security-card-grid");
        expect(text).not.toContain("security-content-scroll");
    });

    it("安全运行态子 Tabs 应该在左侧垂直排列，并直接展示表单", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain('<el-tabs v-model="securityActiveTab" tab-position="left" class="security-tabs">');
        expect(text).not.toContain('class="security-card"');
        expect(text).toContain('<h3 class="security-section-title">会话 / 令牌</h3>');
        expect(text).toContain('<h3 class="security-section-title">验证码</h3>');
        expect(text).toContain('<h3 class="security-section-title">登录失败锁定</h3>');
        expect(text).toContain('<h3 class="security-section-title">网页端加密防重放随机数</h3>');
    });

    it("验证码和登录失败锁定应该拆分为两个独立子 Tab", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain(
            'const securityActiveTab = ref<"session" | "verification" | "login-failure" | "nonce">("session");'
        );
        expect(text).toContain('<el-tab-pane label="验证码" name="verification">');
        expect(text).toContain('<el-tab-pane label="登录失败锁定" name="login-failure">');
        expect(text).not.toContain('<el-tab-pane label="验证码与登录失败锁定" name="verification">');
    });

    it("登录失败锁定应该将确认复选框和清理按钮分成两行", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toMatch(
            /<el-checkbox v-model="loginFailureForm\.confirmed">我确认解除登录失败计数<\/el-checkbox>\s*<\/el-form-item>\s*<el-form-item>\s*<el-button[^>]*@click="clearLoginFailure">清理登录锁定计数<\/el-button>/
        );
    });

    it("防重放定向失效应该将确认复选框和按钮分成两行", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toMatch(
            /<el-checkbox v-model="nonceForm\.confirmed">我确认定向失效该随机数<\/el-checkbox>\s*<\/el-form-item>\s*<el-form-item>\s*<el-button[^>]*@click="invalidateNonce">定向失效<\/el-button>/
        );
    });

    it("安全运行态各操作提交前应该校验必填项", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain("function validateSecurityForm(");
        expect(text).toContain("请输入操作理由");
        expect(text).toContain("请勾选确认项后再提交");
        expect(text).toContain("validateSecurityForm(sessionForm.user_id");
        expect(text).toMatch(/validateSecurityForm\(\s*verificationForm\.target/);
        expect(text).toMatch(/validateSecurityForm\(\s*loginFailureForm\.username/);
        expect(text).toContain("validateSecurityForm(nonceForm.nonce");
        expect(text).toContain("function validateGlobalNonceForm()");
        expect(text).toContain('globalNonceForm.confirmation_phrase !== "INVALIDATE-NONCES"');
    });

    it("表单必填项应该显示必填星号，非必填项不应标记为必填", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain('<el-form-item label="缓存区域" required>');
        expect(text).toContain('<el-form-item label="清理理由" required>');
        expect(text).toContain('<el-form-item label="确认短语" required>');
        expect(text).toContain('<el-form-item label="用户编号" required>');
        expect(text).toContain('<el-form-item label="操作确认" required>');
        expect(text).toContain('<el-form-item label="验证码类型" required>');
        expect(text).toContain('<el-form-item label="账号或会话句柄" required>');
        expect(text).toContain('<el-form-item label="登录账号" required>');
        expect(text).toContain('<el-form-item label="定向随机数" required>');
        expect(text).toContain('<el-form-item label="全局失效理由" required>');
        expect(text).not.toContain('<el-form-item label="实例范围" required>');
    });

    it("三个安全目标应该使用可输入关键字的远程候选下拉，nonce 保持手工输入", () => {
        const text = source("src/views/Devops/SystemMaintenance/CacheClear/index.vue");

        expect(text).toContain("searchSessionCandidates");
        expect(text).toContain("searchVerificationCandidates");
        expect(text).toContain("searchLoginFailureCandidates");
        expect(text).toContain(':remote-method="searchSessionUsers"');
        expect(text).toContain(':remote-method="searchVerificationTargets"');
        expect(text).toContain(':remote-method="searchLoginFailureUsers"');
        expect(text).toContain('v-model="sessionForm.user_id"');
        expect(text).toContain('v-model="verificationForm.target"');
        expect(text).toContain('v-model="loginFailureForm.username"');
        expect(text).toContain('<el-input v-model="nonceForm.nonce"');
        expect(text).toContain("requestSequence");
        expect(text).not.toContain("searchNonceCandidates");
    });
});
