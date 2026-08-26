import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

function source(path: string): string {
    return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("全局轻提示配置", () => {
    it("Element Plus 和 MessageUtils 的消息停留时间都应为 1 秒", () => {
        const messageUtils = source("src/utils/message-utils.ts");
        const defaultOptionsStart = messageUtils.indexOf("const DEFAULT_OPTIONS");
        const defaultOptionsEnd = messageUtils.indexOf("};", defaultOptionsStart) + 2;

        expect(source("src/App.vue")).toContain("duration: MESSAGE_DURATION");
        expect(messageUtils).toContain("export const MESSAGE_DURATION = 1000");
        expect(messageUtils.slice(defaultOptionsStart, defaultOptionsEnd)).toContain("duration: MESSAGE_DURATION");
        expect(source("src/App.vue")).not.toContain("duration: 5000");
        expect(messageUtils.slice(defaultOptionsStart, defaultOptionsEnd)).not.toContain("duration: 5000");
    });
});
