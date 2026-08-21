import { describe, expect, it } from "vitest";

import { userConverter } from "../src/converter/user-converter";

describe("userConverter", () => {
    it("新增用户表单应使用系统默认语言和时区", () => {
        const form = userConverter.createForm({
            language: "en-US",
            timezone: "UTC"
        });

        expect(form.language).toBe("en-US");
        expect(form.timezone).toBe("UTC");
    });

    it("未提供默认值时语言和时区应为空", () => {
        const form = userConverter.createForm();

        expect(form.language).toBe("");
        expect(form.timezone).toBe("");
    });
});
