import { describe, expect, it } from "vitest";

import { formatDateTime } from "@/utils/date-utils.ts";

describe("日期时间工具", () => {
    it("应将 LocalDateTime 格式化为标准日期时间", () => {
        expect(formatDateTime("2026-08-22 22:55:16.545342100")).toBe("2026-08-22 22:55:16");
        expect(formatDateTime("2026-08-22T22:55:16")).toBe("2026-08-22 22:55:16");
    });

    it("空值应显示占位符，无法解析的值保留原文", () => {
        expect(formatDateTime(null)).toBe("—");
        expect(formatDateTime("invalid-date")).toBe("invalid-date");
    });
});
