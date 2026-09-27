import { describe, expect, it } from "vitest";

import { userConverter } from "@/converter/user-converter.ts";

describe("userConverter department fields", () => {
    it("creates forms with no associated departments by default", () => {
        expect(userConverter.createForm().associated_department_ids).toEqual([]);
    });

    it("maps department summaries to editable IDs", () => {
        const form = userConverter.toForm({
            id: "user-1",
            employee_no: "E-1",
            real_name: "张三",
            username: "zhangsan",
            status: "ACTIVE",
            language: "zh-CN",
            timezone: "Asia/Shanghai",
            primary_department_id: "main",
            primary_department_name: "总部",
            associated_departments: [{ id: "ops", name: "运维部" }],
            roles: [],
            authorization_status: "ACTIVE",
            avatar: "",
            created_at: ""
        });

        expect(form.primary_department_id).toBe("main");
        expect(form.associated_department_ids).toEqual(["ops"]);
    });

    it("serializes the primary and associated department fields", () => {
        const dto = userConverter.toDTO({
            id: "",
            employee_no: "E-1",
            real_name: "张三",
            username: "zhangsan",
            status: "ACTIVE",
            language: "zh-CN",
            timezone: "Asia/Shanghai",
            primary_department_id: "main",
            associated_department_ids: ["ops", "hr"]
        });

        expect(dto).toMatchObject({ primary_department_id: "main", associated_department_ids: ["ops", "hr"] });
    });
});
