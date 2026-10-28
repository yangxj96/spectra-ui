/**
 * 日期控件的无偏移本地时间由后端按有效用户时区解释。
 * 直接调用 Date 会改用浏览器时区，导致异地编辑者提交错误的时刻。
 */
function isValidCivilTime([year, month, day, hour, minute, second]: readonly [
    number,
    number,
    number,
    number,
    number,
    number
]): boolean {
    const validDay = new Date(0);
    validDay.setUTCFullYear(year, month - 1, day);
    return (
        validDay.getUTCFullYear() === year &&
        validDay.getUTCMonth() + 1 === month &&
        validDay.getUTCDate() === day &&
        hour <= 23 &&
        minute <= 59 &&
        second <= 59
    );
}

function isValidOffset(hours: number, minutes: number): boolean {
    return hours <= 18 && minutes <= 59 && (hours !== 18 || minutes === 0);
}

export function toIsoDateTime(value: string): string {
    if (!value) return value;
    const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?$/;
    const offset = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/;
    if (!local.test(value) && !offset.test(value)) throw new RangeError("时间必须是 ISO 日期时间");
    const datePart = value.slice(0, 10);
    const timePart = value.slice(11, 19);
    const year = Number(datePart.slice(0, 4));
    const month = Number(datePart.slice(5, 7));
    const day = Number(datePart.slice(8, 10));
    const hour = Number(timePart.slice(0, 2));
    const minute = Number(timePart.slice(3, 5));
    const second = Number(timePart.slice(6, 8));
    const offsetMatch = value.match(/([+-])(\d{2}):(\d{2})$/);
    const offsetHours = offsetMatch ? Number(offsetMatch[2]) : 0;
    const offsetMinutes = offsetMatch ? Number(offsetMatch[3]) : 0;
    if (!isValidCivilTime([year, month, day, hour, minute, second]) || !isValidOffset(offsetHours, offsetMinutes)) {
        throw new RangeError("时间不在有效范围内");
    }
    return value;
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

/** 编辑控件保留服务端返回的墙上时间，由用户时区解释提交。 */
export function toLocalDateTimeInput(value: string): string {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})?$/);
    if (!match) throw new RangeError("服务端时间格式无效");
    return `${match[1]}T${match[2]}`;
}

/** 展示服务端已按有效用户时区转换的墙上时间和偏移。 */
export function formatDateTime(value: string | null | undefined): string {
    if (!value) return "—";
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})(?:\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
    return match ? `${match[1]} ${match[2]} ${match[3]}` : value;
}
