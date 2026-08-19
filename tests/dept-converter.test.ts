import { describe, expect, it } from "vitest";

import { deptConverter } from "../src/converter/dept-converter";

describe("deptConverter", () => {
    it("新增部门请求不应携带主键和组织机构编码", () => {
        const form = deptConverter.createForm();
        form.name = "研发部";
        form.code = "USER_PROVIDED_CODE";

        const dto = deptConverter.toCreateDTO(form);

        expect(dto).toEqual({
            pid: "",
            name: "研发部",
            type: undefined,
            region_id: "",
            path: "",
            sort: undefined,
            remark: ""
        });
        expect(dto).not.toHaveProperty("id");
        expect(dto).not.toHaveProperty("code");
    });

    it("组织变更请求应携带版本和可编辑字段，不应携带路径", () => {
        const form = deptConverter.createForm();
        form.pid = "parent-id";
        form.name = "研发部";
        form.type = 1;
        form.region_id = "region-id";
        form.sort = 10;
        form.remark = "负责研发";

        expect(deptConverter.toOrganizationChange(form, 7)).toEqual({
            expected_organization_version: 7,
            new_parent_id: "parent-id",
            name: "研发部",
            type: 1,
            region_id: "region-id",
            sort: 10,
            remark: "负责研发"
        });
    });
});
