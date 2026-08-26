import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const loginPage = readFileSync(resolve(process.cwd(), "src/views/Login/index.vue"), "utf8");

describe("登录页回车主操作", () => {
    it("登录阶段回车应执行与登录按钮相同的主操作", () => {
        expect(loginPage).toContain('<div v-if="!mfaVisible" @keydown.enter.prevent="handlePrimaryAction">');
        expect(loginPage).toContain('@click="handlePrimaryAction"');
    });

    it("MFA 阶段回车应执行验证并继续或完成登录", () => {
        expect(loginPage).toContain('<div v-else class="mfa-panel" @keydown.enter.prevent="handlePrimaryAction">');
        expect(loginPage).toContain("const handlePrimaryAction = () => {");
        expect(loginPage).toContain("return mfaVisible.value ? handleMfa() : handleLogin();");
    });

    it("返回登录按钮不得参与回车提交", () => {
        expect(loginPage).toContain('<el-button v-if="mfaVisible" native-type="button" text @click="resetMfa">');
    });
});
