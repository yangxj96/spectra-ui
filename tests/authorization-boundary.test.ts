import { describe, expect, it } from "vitest";

import {
    authorizationAssignmentBoundaries,
    authorizationBoundariesFromProfile,
    createAuthorizationScope,
    flattenAuthorityPermissions,
    flattenDepartmentTree,
    toAuthorizationScopeChange
} from "@/utils/authorization-boundary.ts";

describe("授权 Boundary 工具", () => {
    it("应展开权限树叶节点并保留部门树父节点", () => {
        const authorityTree = [
            {
                id: "group",
                pid: undefined,
                name: "用户",
                code: "user",
                children: [{ id: "permission", pid: "group", name: "读取", code: "user:read", children: [] }]
            }
        ] as AuthorityTree[];
        const departmentTree = [
            {
                id: "root",
                code: "ROOT",
                name: "总部",
                children: [{ id: "dept-1", code: "DEV", name: "研发" }]
            }
        ] as DepartmentTreeVO[];

        expect(flattenAuthorityPermissions(authorityTree).map(item => item.code)).toEqual(["user:read"]);
        expect(flattenDepartmentTree(departmentTree).map(item => item.code)).toEqual(["ROOT", "DEV"]);
    });

    it("应将授权方案的部门编码转换为 ID，并保留 Access/Grant 配置", () => {
        const departmentByCode = new Map<string, DepartmentTreeVO>([
            ["DEV", { id: "dept-1", code: "DEV", name: "研发" } as DepartmentTreeVO]
        ]);
        const result = authorizationBoundariesFromProfile(
            {
                role_code: "ROLE_USER",
                role_version: 3,
                boundaries: [
                    {
                        permission: "user:read",
                        access: { mode: "RULES", department_codes: ["DEV"], include_descendants: true },
                        grant: { mode: "SELF", department_codes: [], include_descendants: false }
                    }
                ]
            },
            departmentByCode
        );

        expect(result).toEqual([
            {
                permission: "user:read",
                access: { mode: "RULES", department_ids: ["dept-1"], include_descendants: true },
                grantEnabled: true,
                grant: { mode: "SELF", department_ids: [], include_descendants: false }
            }
        ]);
    });

    it("引用未知部门编码时应拒绝套用方案，并清理非 RULES 的部门范围", () => {
        const unknown = authorizationBoundariesFromProfile(
            {
                role_code: "ROLE_USER",
                role_version: 3,
                boundaries: [
                    {
                        permission: "user:read",
                        access: { mode: "RULES", department_codes: ["MISSING"], include_descendants: true }
                    }
                ]
            },
            new Map()
        );

        expect(unknown).toBeUndefined();
        expect(
            toAuthorizationScopeChange({ mode: "ALL", department_ids: ["dept-1"], include_descendants: true })
        ).toEqual({ mode: "ALL", department_ids: [], include_descendants: false });
        expect(createAuthorizationScope("RULES")).toEqual({
            mode: "RULES",
            department_ids: [],
            include_descendants: false
        });
    });

    it("已有授权实例应按 Permission 合并 Access 和 Grant Boundary", () => {
        const result = authorizationAssignmentBoundaries({
            assignment_id: "assignment-1",
            user_id: "user-1",
            role_id: "role-1",
            role_code: "ROLE_USER",
            role_kind: "BUSINESS",
            role_name: "用户",
            role_system_managed: false,
            role_state: "ACTIVE",
            role_version: 1,
            role_permission_count: 1,
            version: 2,
            state: "ACTIVE",
            access_boundaries: [
                {
                    permission_code: "user:read",
                    scope_mode: "RULES",
                    rules: [{ rule_type: "DEPARTMENT", department_id: "dept-1", include_descendants: true }]
                }
            ],
            grant_boundaries: [
                {
                    permission_code: "user:read",
                    scope_mode: "SELF",
                    rules: []
                }
            ]
        });

        expect(result[0]).toEqual({
            permission: "user:read",
            access: { mode: "RULES", department_ids: ["dept-1"], include_descendants: true },
            grantEnabled: true,
            grant: { mode: "SELF", department_ids: [], include_descendants: false }
        });
    });
});
