import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const loginPage = readFileSync(resolve(process.cwd(), "src/views/Login/index.vue"), "utf8");

describe("登录页 MFA 输入框焦点", () => {
    it("进入 MFA 阶段后应在视图更新完成时自动聚焦验证码输入框", () => {
        expect(loginPage).toContain('const mfaInput = useTemplateRef<InstanceType<typeof ElInput>>("mfaInput");');
        expect(loginPage).toContain("const focusMfaInput = async () => {");
        expect(loginPage).toContain("await focusMfaInput();");
        expect(loginPage).toContain("mfaInput.value?.focus();");
    });

    it("首次绑定和普通 MFA 验证应共用验证码输入框引用", () => {
        expect(loginPage.match(/ref="mfaInput"/g)).toHaveLength(2);
    });
});
