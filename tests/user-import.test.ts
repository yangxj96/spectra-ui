import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";

import {
    calculateUserImportProgress,
    classifyUserImportError,
    parseUserImportCsv,
    parseUserImportFile,
    serializeUserImportErrors,
    serializeUserImportRows,
    sha256Text
} from "@/utils/user-import.ts";

describe("用户批量导入工具", () => {
    it("应将导入完成行数转换为百分比并保护边界", () => {
        expect(calculateUserImportProgress(0, 0)).toBe(0);
        expect(calculateUserImportProgress(3, 4)).toBe(75);
        expect(calculateUserImportProgress(5, 4)).toBe(100);
    });

    it("应解析带引号逗号和换行的 CSV 行", () => {
        const rows = parseUserImportCsv(
            [
                "username,real_name,phone,email,department_code,language,timezone,authorization_profile_code",
                'zhangsan,"张, 三",13800000000,zhangsan@example.com,DEV,zh-CN,Asia/Shanghai,PROFILE_USER'
            ].join("\n")
        );

        expect(rows).toEqual([
            {
                username: "zhangsan",
                real_name: "张, 三",
                phone: "13800000000",
                email: "zhangsan@example.com",
                department_code: "DEV",
                language: "zh-CN",
                timezone: "Asia/Shanghai",
                authorization_profile_code: "PROFILE_USER"
            }
        ]);
    });

    it("应在表头不匹配时拒绝解析", () => {
        expect(() => parseUserImportCsv("username,email\nzhangsan,zhangsan@example.com")).toThrow(
            "表头必须按模板顺序填写"
        );
    });

    it("序列化后的行应能再次解析", () => {
        const rows = [
            {
                username: "zhangsan",
                real_name: "张三",
                phone: "13800000000",
                email: "zhangsan@example.com",
                department_code: "DEV",
                language: "zh-CN",
                timezone: "Asia/Shanghai",
                authorization_profile_code: "PROFILE_USER"
            }
        ];

        expect(parseUserImportCsv(serializeUserImportRows(rows))).toEqual(rows);
    });

    it("应读取 Excel 第一个工作表的固定模板", async () => {
        const workbook = utils.book_new();
        const sheet = utils.aoa_to_sheet([
            [
                "username",
                "real_name",
                "phone",
                "email",
                "department_code",
                "language",
                "timezone",
                "authorization_profile_code"
            ],
            ["zhangsan", "张三", "13800000000", "zhangsan@example.com", "DEV", "zh-CN", "Asia/Shanghai", "PROFILE_USER"]
        ]);
        utils.book_append_sheet(workbook, sheet, "用户");
        const file = new File([write(workbook, { type: "array", bookType: "xlsx" })], "users.xlsx");

        const rows = await parseUserImportFile(file);
        expect(rows[0]?.username).toBe("zhangsan");
        expect(rows[0]?.authorization_profile_code).toBe("PROFILE_USER");
    });

    it("应生成稳定的 SHA-256 摘要", async () => {
        expect(await sha256Text("spectra")).toBe("e285cdd85064e369f2a8abef7052b621d9e596b3a29a8aadba8070de08c566c0");
    });

    it("应按错误类型归类并导出错误明细", () => {
        expect(classifyUserImportError("手机号码不能为空")).toBe("REQUIRED");
        expect(classifyUserImportError("邮箱在导入文件中重复")).toBe("DUPLICATE");
        expect(
            serializeUserImportErrors([
                {
                    id: "row-id",
                    row_number: 2,
                    row_key: "zhangsan",
                    state: "ERROR",
                    errors: ["手机号码不能为空"]
                }
            ])
        ).toContain('"2","zhangsan","ERROR","必填字段","手机号码不能为空"');
    });
});
