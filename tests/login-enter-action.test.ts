import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const loginPage = readFileSync(resolve(process.cwd(), "src/views/Login/index.vue"), "utf8");

describe("登录页回车主操作", () => {
    it("登录阶段回车应执行与登录按钮相同的主操作", () => {
        expect(loginPage).toContain('<div @keydown.enter.prevent="handleLogin">');
        expect(loginPage).toContain('@click="handleLogin"');
    });

    it("登录按钮使用原生按钮类型避免隐式提交", () => {
        expect(loginPage).toContain('<el-button type="primary" native-type="button" @click="handleLogin">');
    });
});
