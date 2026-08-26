import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

describe("轻提示统一出口", () => {
    it("除 message-utils.ts 外不应直接导入或调用 ElMessage", () => {
        const files = globSync("src/**/*.{ts,vue}", {
            cwd: process.cwd(),
            exclude: ["src/utils/message-utils.ts"]
        });
        const violations = files.filter(file => {
            const text = readFileSync(resolve(process.cwd(), file), "utf8");
            return (
                /import\s*\{[^}]*\bElMessage\b[^}]*\}\s*from\s*["']element-plus["']/s.test(text) ||
                /(?<![\w.])ElMessage(?:\.(?:success|error|warning|info))?\s*\(/.test(text)
            );
        });

        expect(violations).toEqual([]);
    });
});
