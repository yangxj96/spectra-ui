const notificationResponseCodeLabels: Record<string, string> = {
    CHANNEL_NOT_CONFIGURED: "通知渠道未配置",
    PROVIDER_ACCEPTED: "渠道服务已接受",
    PROVIDER_CONFIGURATION_INVALID: "渠道服务配置无效",
    PROVIDER_FAILURE: "渠道服务调用失败",
    PROVIDER_HEALTH_CHECK_FAILED: "渠道服务健康检查失败",
    PROVIDER_NOT_CONFIGURED: "尚未配置渠道服务",
    PROVIDER_NOT_REGISTERED: "当前运行环境未注册渠道服务",
    PROVIDER_RATE_LIMITED: "渠道服务限流",
    PROVIDER_REJECTED: "渠道服务拒绝请求",
    PROVIDER_REQUEST_INTERRUPTED: "渠道服务请求被中断",
    PROVIDER_REQUEST_UNAVAILABLE: "渠道服务暂时不可用",
    PROVIDER_SERVER_ERROR: "渠道服务内部错误",
    PROVIDER_UNKNOWN_RESULT: "渠道服务返回未知结果",
    PROVIDER_HTTP_REJECTED: "渠道服务拒绝 HTTP 请求",
    RECIPIENT_ADDRESS_UNAVAILABLE: "收件地址不可用",
    HEALTH_CHECK_REQUIRED: "需要先执行健康检查",
    MODULE_DISABLED: "通知模块已关闭",
    MOCK_ACCEPTED: "模拟渠道已接受"
};

const notificationResponseSummaryKeyLabels: Record<string, string> = {
    summary: "摘要",
    message: "消息",
    code: "编码",
    provider: "供应商",
    status: "状态",
    requestId: "请求编号"
};

function responseValueLabel(value: string): string {
    return notificationResponseCodeLabels[value] ?? value;
}

/** 将供应商响应摘要中的内部编码转换为管理端可读文本。 */
export function notificationResponseSummaryLabel(value: string | null | undefined): string {
    if (!value?.trim()) return "—";

    const text = value.trim();
    const content = text.startsWith("{") && text.endsWith("}") ? text.slice(1, -1).trim() : text;
    if (!content.includes("=")) return responseValueLabel(content);

    const entries = content.split(/,\s*/).filter(Boolean);
    const translatedEntries = entries.map(entry => {
        const separator = entry.indexOf("=");
        if (separator <= 0) return responseValueLabel(entry.trim());

        const key = entry.slice(0, separator).trim();
        const rawValue = entry.slice(separator + 1).trim();
        const translatedValue = responseValueLabel(rawValue);
        if (key === "summary" && entries.length === 1) return translatedValue;
        return `${notificationResponseSummaryKeyLabels[key] ?? key}：${translatedValue}`;
    });

    return translatedEntries.join("；");
}
