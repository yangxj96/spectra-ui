import { describe, expect, it } from "vitest";

import {
    parseAssociatedDepartmentCodes,
    parseUserImportRecords,
    serializeUserImportRows
} from "@/utils/user-import.ts";

describe("user import associated department codes", () => {
    it("parses and trims semicolon-separated department codes", () => {
        expect(parseAssociatedDepartmentCodes(" OPS ; HR ")).toEqual({ codes: ["OPS", "HR"], errors: [] });
    });

    it("rejects empty segments, duplicate codes, and the primary department", () => {
        expect(parseAssociatedDepartmentCodes("OPS;;HR").errors).toContain("关联部门编码不能包含空项");
        expect(parseAssociatedDepartmentCodes("OPS;OPS").errors).toContain("关联部门编码不能重复");
        expect(parseAssociatedDepartmentCodes("MAIN", "MAIN").errors).toContain("主部门不能重复作为关联部门");
    });

    it("accepts legacy four-column sheets and current sheets with the optional association column", () => {
        const legacy = parseUserImportRecords([
            ["姓名", "登录用户名", "手机号码", "邮箱"],
            ["张三", "zhangsan", "13800138000", "z@example.test"]
        ]);
        const current = parseUserImportRecords([
            ["姓名", "登录用户名", "手机号码", "邮箱", "关联部门编码"],
            ["李四", "lisi", "13800138001", "l@example.test", "OPS; HR"]
        ]);

        expect(legacy[0]?.associated_department_codes).toBe("");
        expect(current[0]?.associated_department_codes).toBe("OPS; HR");
    });

    it("includes association codes in the serialized preview input", () => {
        expect(
            serializeUserImportRows([
                {
                    real_name: "张三",
                    username: "zhangsan",
                    phone: "13800138000",
                    email: "z@example.test",
                    associated_department_codes: "OPS;HR"
                }
            ])
        ).toContain("OPS;HR");
    });
});
