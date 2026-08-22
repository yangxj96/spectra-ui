/**
 * 将日期控件产生的本地日期时间转换为带 UTC 偏移的 ISO 8601 字符串。
 * 日期控件的 value-format 不包含时区，不能直接把它当作 UTC 发送。
 */
export function toIsoDateTime(value: string): string {
    if (!value) return value;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

/** 将日期范围转换为覆盖完整结束日的 ISO 8601 时间范围。 */
export function toIsoDateRange(values: readonly string[]): { start: string; end: string } | null {
    if (values.length !== 2 || !values[0] || !values[1]) return null;
    return {
        start: toIsoDateTime(`${values[0]}T00:00:00`),
        end: toIsoDateTime(`${values[1]}T23:59:59.999`)
    };
}

/** 返回浏览器本地日期，避免 UTC 日期在午夜附近发生日期偏移。 */
export function toLocalDateString(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

/** 将接口日期时间统一格式化为 yyyy-MM-dd HH:mm:ss。 */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";

    const text = value.trim();
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(text);
    if (!hasTimezone) {
        const localMatch = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/);
        if (localMatch) return `${localMatch[1]} ${localMatch[2]}`;
    }

    const date = new Date(text.replace(/\.(\d{3})\d+/, ".$1"));
    if (Number.isNaN(date.getTime())) return value;

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
