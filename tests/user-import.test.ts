import { describe, expect, it } from "vitest";
import { utils, write } from "xlsx";

import {
    calculateUserImportProgress,
    classifyUserImportError,
    localizeUserImportError,
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
            ["real_name,phone,email", '"张, 三",13800000000,zhangsan@example.com'].join("\n")
        );

        expect(rows).toEqual([
            {
                real_name: "张, 三",
                phone: "13800000000",
                email: "zhangsan@example.com"
            }
        ]);
    });

    it("应解析中文模板表头并映射为接口字段", () => {
        const rows = parseUserImportCsv(["真实姓名,手机号码,邮箱", "张三,13800000000,zhangsan@example.com"].join("\n"));

        expect(rows[0]).toEqual({
            real_name: "张三",
            phone: "13800000000",
            email: "zhangsan@example.com"
        });
    });

    it("应在表头不匹配时拒绝解析", () => {
        expect(() => parseUserImportCsv("username,email\nzhangsan,zhangsan@example.com")).toThrow(
            "表头必须按模板顺序填写"
        );
    });

    it("序列化后的行应能再次解析", () => {
        const rows = [
            {
                real_name: "张三",
                phone: "13800000000",
                email: "zhangsan@example.com"
            }
        ];

        expect(parseUserImportCsv(serializeUserImportRows(rows))).toEqual(rows);
    });

    it("应读取 Excel 第一个工作表的固定模板", async () => {
        const workbook = utils.book_new();
        const sheet = utils.aoa_to_sheet([
            ["real_name", "phone", "email"],
            ["张三", "13800000000", "zhangsan@example.com"]
        ]);
        utils.book_append_sheet(workbook, sheet, "用户");
        const file = new File([write(workbook, { type: "array", bookType: "xlsx" })], "users.xlsx");

        const rows = await parseUserImportFile(file);
        expect(rows[0]).toEqual({
            real_name: "张三",
            phone: "13800000000",
            email: "zhangsan@example.com"
        });
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
        ).toContain("行号,行标识,状态,错误类型,错误信息");
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
        expect(localizeUserImportError("Permission-specific Access Boundary 和 Grant Boundary 校验失败")).toBe(
            "按权限配置的访问边界 和 授权边界 校验失败"
        );
    });
});
