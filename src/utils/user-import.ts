/** 用户批量导入固定 CSV 模板字段。 */
export const USER_IMPORT_HEADERS = [
    "username",
    "real_name",
    "phone",
    "email",
    "department_code",
    "language",
    "timezone",
    "authorization_profile_code"
] as const;

export type UserImportHeader = (typeof USER_IMPORT_HEADERS)[number];

/** 用户批量导入页面展示字段。 */
export const USER_IMPORT_HEADER_LABELS: Record<UserImportHeader, string> = {
    username: "用户名",
    real_name: "真实姓名",
    phone: "手机号码",
    email: "邮箱",
    department_code: "部门编码",
    language: "语言",
    timezone: "时区",
    authorization_profile_code: "授权方案编码"
};

/** 批量导入错误分类。 */
export type UserImportErrorCategory = "REQUIRED" | "FORMAT" | "DUPLICATE" | "REFERENCE" | "AUTHORIZATION" | "OTHER";

export const USER_IMPORT_ERROR_CATEGORY_LABELS: Record<UserImportErrorCategory, string> = {
    REQUIRED: "必填字段",
    FORMAT: "格式错误",
    DUPLICATE: "重复数据",
    REFERENCE: "组织或字典",
    AUTHORIZATION: "授权配置",
    OTHER: "其他错误"
};

/** 根据后端当前错误文案归类，便于管理员快速筛选。 */
export function classifyUserImportError(message: string): UserImportErrorCategory {
    if (message.includes("不能为空")) return "REQUIRED";
    if (message.includes("格式不正确")) return "FORMAT";
    if (message.includes("重复") || message.includes("已存在")) return "DUPLICATE";
    if (message.includes("部门") || message.includes("语言") || message.includes("时区")) return "REFERENCE";
    if (
        message.includes("授权") ||
        message.includes("Role") ||
        message.includes("Permission") ||
        message.includes("Boundary")
    ) {
        return "AUTHORIZATION";
    }
    return "OTHER";
}

/** 将错误行序列化为可下载的 CSV 明细。 */
export function serializeUserImportErrors(rows: UserImportRowResult[]): string {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const headers = ["row_number", "row_key", "state", "error_type", "error"];
    const records = rows.flatMap(row =>
        (row.errors?.length ? row.errors : ["处理失败，请重新 Preview"]).map(error => [
            String(row.row_number),
            row.row_key,
            row.state,
            USER_IMPORT_ERROR_CATEGORY_LABELS[classifyUserImportError(error)],
            error
        ])
    );
    return [headers.join(","), ...records.map(record => record.map(escape).join(","))].join("\n");
}

/** 当前固定文本导入的浏览器端文件大小上限。 */
export const MAX_USER_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

/**
 * 解析固定表头的 CSV 文本。
 * 支持双引号包裹字段、字段内逗号和换行；首行为固定模板表头。
 */
export function parseUserImportCsv(text: string): UserImportRow[] {
    const records = parseCsvRecords(text);
    if (!records.length) throw new Error("CSV 文件不能为空");

    const headers = records[0].map(value => value.trim().toLowerCase());
    if (
        headers.length !== USER_IMPORT_HEADERS.length ||
        headers.some((value, index) => value !== USER_IMPORT_HEADERS[index])
    ) {
        throw new Error(`表头必须按模板顺序填写：${USER_IMPORT_HEADERS.join(",")}`);
    }

    const rows = records
        .slice(1)
        .filter(record => record.some(value => value.trim()))
        .map(record => {
            if (record.length !== USER_IMPORT_HEADERS.length) {
                throw new Error(`第 ${records.indexOf(record) + 1} 行字段数量不正确`);
            }
            return Object.fromEntries(
                USER_IMPORT_HEADERS.map((header, index) => [header, record[index]?.trim() ?? ""])
            ) as UserImportRow;
        });

    if (!rows.length) throw new Error("CSV 文件至少需要一行用户数据");
    return rows;
}

/** 将当前编辑后的行重新序列化，作为 Preview 的摘要输入。 */
export function serializeUserImportRows(rows: UserImportRow[]): string {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    return [
        USER_IMPORT_HEADERS.join(","),
        ...rows.map(row => USER_IMPORT_HEADERS.map(header => escape(row[header])).join(","))
    ].join("\n");
}

/** 计算文本 UTF-8 字节的 SHA-256 十六进制摘要。 */
export async function sha256Text(text: string): Promise<string> {
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return [...new Uint8Array(buffer)].map(byte => byte.toString(16).padStart(2, "0")).join("");
}

/** 创建一次新的导入幂等键。 */
export function createUserImportIdempotencyKey(): string {
    return crypto.randomUUID();
}

function parseCsvRecords(text: string): string[][] {
    const records: string[][] = [];
    let record: string[] = [];
    let value = "";
    let quoted = false;

    for (let index = 0; index < text.length; index++) {
        const character = text[index];
        const next = text[index + 1];
        if (character === '"') {
            if (quoted && next === '"') {
                value += '"';
                index++;
            } else {
                quoted = !quoted;
            }
        } else if (character === "," && !quoted) {
            record.push(value);
            value = "";
        } else if ((character === "\n" || character === "\r") && !quoted) {
            if (character === "\r" && next === "\n") index++;
            record.push(value);
            records.push(record);
            record = [];
            value = "";
        } else {
            value += character;
        }
    }

    if (quoted) throw new Error("CSV 文件存在未闭合的引号");
    if (value || record.length) {
        record.push(value);
        records.push(record);
    }
    return records;
}
