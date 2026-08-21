import { describe, expect, it } from "vitest";

import { parseUserImportCsv, serializeUserImportRows, sha256Text } from "@/utils/user-import.ts";

describe("用户批量导入工具", () => {
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

    it("应生成稳定的 SHA-256 摘要", async () => {
        expect(await sha256Text("spectra")).toBe("e285cdd85064e369f2a8abef7052b621d9e596b3a29a8aadba8070de08c566c0");
    });
});
