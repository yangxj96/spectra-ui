/** 用户批量导入 Excel/CSV 模板字段；工号由后端生成，组织和授权配置在页面上统一选择。 */
export const USER_IMPORT_HEADERS = ["real_name", "phone", "email"] as const;

export type UserImportHeader = (typeof USER_IMPORT_HEADERS)[number];

/** 用户批量导入页面展示字段。 */
export const USER_IMPORT_HEADER_LABELS: Record<UserImportHeader, string> = {
    real_name: "真实姓名",
    phone: "手机号码",
    email: "邮箱"
};

/** 用户批量导入模板对外展示的中文表头。 */
export const USER_IMPORT_TEMPLATE_HEADERS = ["真实姓名", "手机号码", "邮箱"] as const;

const USER_IMPORT_HEADER_ALIASES: Record<string, UserImportHeader> = {
    real_name: "real_name",
    phone: "phone",
    email: "email",
    真实姓名: "real_name",
    手机号码: "phone",
    邮箱: "email"
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

/** 将导入错误中的授权边界术语转换为中文，便于管理员阅读。 */
export function localizeUserImportError(message: string): string {
    return message
        .replaceAll("Permission-specific Access Boundary", "按权限配置的访问边界")
        .replaceAll("Access Boundary", "访问边界")
        .replaceAll("Grant Boundary", "授权边界")
        .replaceAll("Preview", "校验")
        .replaceAll("Apply", "应用");
}

/** 将错误行序列化为可下载的 CSV 明细。 */
export function serializeUserImportErrors(rows: UserImportRowResult[]): string {
    const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
    const headers = ["行号", "行标识", "状态", "错误类型", "错误信息"];
    const records = rows.flatMap(row =>
        (row.errors?.length ? row.errors : ["处理失败，请重新校验"]).map(error => [
            String(row.row_number),
            row.row_key,
            row.state,
            USER_IMPORT_ERROR_CATEGORY_LABELS[classifyUserImportError(error)],
            localizeUserImportError(error)
        ])
    );
    return [headers.join(","), ...records.map(record => record.map(escape).join(","))].join("\n");
}

/** 当前固定文本导入的浏览器端文件大小上限。 */
export const MAX_USER_IMPORT_FILE_SIZE = 5 * 1024 * 1024;

/** 将后台导入任务的完成行数转换为进度百分比。 */
export function calculateUserImportProgress(completedRows: number, totalRows: number): number {
    if (totalRows <= 0) return 0;
    return Math.min(100, Math.round((completedRows / totalRows) * 100));
}

/**
 * 解析固定表头的 CSV 文本。
 * 支持双引号包裹字段、字段内逗号和换行；首行为固定模板表头。
 */
export function parseUserImportCsv(text: string): UserImportRow[] {
    return parseUserImportRecords(parseCsvRecords(text));
}

/** 解析 CSV 或 Excel 文件，Excel 只读取第一个工作表。 */
export async function parseUserImportFile(file: File): Promise<UserImportRow[]> {
    if (/\.(csv|txt)$/i.test(file.name)) return parseUserImportCsv(await file.text());

    const { read, utils } = await import("xlsx");
    const workbook = read(await file.arrayBuffer(), { type: "array", cellText: true, cellDates: false });
    const [sheetName] = workbook.SheetNames;
    if (!sheetName) throw new Error("Excel 文件没有可读取的工作表");

    const values = utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1,
        raw: false,
        defval: ""
    });
    const records = values.map(record => record.map(value => String(value ?? "")));
    return parseUserImportRecords(records);
}

function parseUserImportRecords(records: string[][]): UserImportRow[] {
    if (!records.length) throw new Error("CSV 文件不能为空");

    const headers = records[0].map(value => {
        const header = value.trim();
        return USER_IMPORT_HEADER_ALIASES[header] ?? USER_IMPORT_HEADER_ALIASES[header.toLowerCase()];
    });
    if (
        headers.length !== USER_IMPORT_HEADERS.length ||
        headers.some((value, index) => value !== USER_IMPORT_HEADERS[index])
    ) {
        throw new Error(`表头必须按模板顺序填写：${USER_IMPORT_TEMPLATE_HEADERS.join(",")}`);
    }

    const rows = records.slice(1).flatMap((record, index) => {
        if (!record.some(value => value.trim())) return [];
        if (record.length !== USER_IMPORT_HEADERS.length) {
            throw new Error(`第 ${index + 2} 行字段数量不正确`);
        }
        return [
            Object.fromEntries(
                USER_IMPORT_HEADERS.map((header, index) => {
                    const value = record[index]?.trim() ?? "";
                    return [header, value];
                })
            ) as UserImportRow
        ];
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
