import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("密钥管理页面", () => {
    it("应该注册密钥管理路由并使用中文三分类标签", () => {
        const route = source("src/plugin/router/modules/devops.ts");
        const page = source("src/views/Devops/SystemMaintenance/SecretManagement/index.vue");

        expect(route).toContain('name: "DevopsSecretManagement"');
        expect(route).toContain('requiredMenu: "DevopsSecretManagement"');
        expect(page).toContain("应用加密密钥");
        expect(page).toContain("业务服务凭据");
        expect(page).toContain("安全签名密钥");
    });

    it("不应渲染接口返回的密钥值，并应包含必填校验和导入预校验", () => {
        const page = source("src/views/Devops/SystemMaintenance/SecretManagement/index.vue");

        expect(page).toContain("密钥值");
        expect(page).toContain("required-mark");
        expect(page).toContain("previewImport");
        expect(page).toContain("确认导入为待启用");
        expect(page).not.toContain("active_secret.value");
        expect(page).not.toContain("plaintext");
        expect(page).not.toContain("ciphertext");
    });

    it("应该在密钥管理页面提供接口加解密开关", () => {
        const page = source("src/views/Devops/SystemMaintenance/SecretManagement/index.vue");

        expect(page).toContain("接口加解密");
        expect(page).toContain("toggleCrypto");
        expect(page).toContain("cryptoEnabled");
    });

    it("切换接口加解密后应该重新读取运行态并同步页面状态", () => {
        const page = source("src/views/Devops/SystemMaintenance/SecretManagement/index.vue");

        expect(page).toMatch(/await initCrypto\(\);\s*await loadSettings\(\);/);
    });

    it("接口加解密关闭时仍应允许点击开启并交给后端校验密钥", () => {
        const page = source("src/views/Devops/SystemMaintenance/SecretManagement/index.vue");

        expect(page).toContain(':disabled="cryptoSubmitting"');
        expect(page).not.toContain(':disabled="cryptoSubmitting || (!cryptoEnabled && !cryptoReady)"');
    });
});
