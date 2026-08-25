import { describe, expect, it } from "vitest";

import { notificationResponseSummaryLabel } from "@/utils/notification-labels.ts";

describe("通知响应摘要文本", () => {
    it("应将单值摘要中的内部错误码转换为中文", () => {
        expect(notificationResponseSummaryLabel("{summary=PROVIDER_FAILURE}")).toBe("渠道服务调用失败");
    });

    it("应保留多字段摘要并翻译字段和值", () => {
        expect(notificationResponseSummaryLabel("{status=PROVIDER_REJECTED, provider=SMTP}")).toBe(
            "状态：渠道服务拒绝请求；供应商：SMTP"
        );
    });

    it("空摘要应显示占位符，未知值保留原文", () => {
        expect(notificationResponseSummaryLabel(null)).toBe("—");
        expect(notificationResponseSummaryLabel("CUSTOM_SUMMARY")).toBe("CUSTOM_SUMMARY");
    });
});
