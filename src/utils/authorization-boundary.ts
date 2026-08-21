export type AuthorizationScopeForm = AuthorizationScopeChange;

export type AuthorizationBoundaryForm = {
    permission: string;
    access: AuthorizationScopeForm;
    grantEnabled: boolean;
    grant: AuthorizationScopeForm;
};

export function flattenAuthorityPermissions(nodes: AuthorityTree[]): AuthorityTree[] {
    return nodes.flatMap(node => (node.children?.length ? flattenAuthorityPermissions(node.children) : [node]));
}

export function flattenDepartmentTree(nodes: DepartmentTreeVO[]): DepartmentTreeVO[] {
    return nodes.flatMap(node => (node.children?.length ? [node, ...flattenDepartmentTree(node.children)] : [node]));
}

export function createAuthorizationScope(mode: AuthorizationScopeForm["mode"] = "NONE"): AuthorizationScopeForm {
    return {
        mode,
        department_ids: [],
        include_descendants: false
    };
}

export function authorizationScopeFromBoundary(boundary: AuthorizationBoundary): AuthorizationScopeForm {
    return {
        mode: boundary.scope_mode,
        department_ids: (boundary.rules ?? [])
            .map(rule => rule.department_id)
            .filter((id): id is string => Boolean(id)),
        include_descendants: (boundary.rules ?? []).some(rule => rule.include_descendants)
    };
}

export function authorizationAssignmentBoundaries(assignment: AuthorizationAssignment): AuthorizationBoundaryForm[] {
    const grants = new Map(assignment.grant_boundaries.map(boundary => [boundary.permission_code, boundary]));
    return assignment.access_boundaries.map(access => {
        const grant = grants.get(access.permission_code);
        return {
            permission: access.permission_code,
            access: authorizationScopeFromBoundary(access),
            grantEnabled: Boolean(grant),
            grant: grant ? authorizationScopeFromBoundary(grant) : createAuthorizationScope()
        };
    });
}

export function authorizationScopeFromProfile(
    scope: AuthorizationProfileScope,
    departmentByCode: ReadonlyMap<string, DepartmentTreeVO>
): AuthorizationScopeForm | undefined {
    const departmentIds = (scope.department_codes ?? [])
        .map(code => departmentByCode.get(code)?.id)
        .filter((id): id is string => Boolean(id));
    if (departmentIds.length !== (scope.department_codes ?? []).length) return undefined;
    return {
        mode: scope.mode,
        department_ids: departmentIds,
        include_descendants: scope.include_descendants
    };
}

export function authorizationBoundariesFromProfile(
    assignment: AuthorizationProfileAssignment,
    departmentByCode: ReadonlyMap<string, DepartmentTreeVO>
): AuthorizationBoundaryForm[] | undefined {
    const result: AuthorizationBoundaryForm[] = [];
    for (const boundary of assignment.boundaries) {
        const access = authorizationScopeFromProfile(boundary.access, departmentByCode);
        const grant = boundary.grant ? authorizationScopeFromProfile(boundary.grant, departmentByCode) : undefined;
        if (!access || (boundary.grant && !grant)) return undefined;
        result.push({
            permission: boundary.permission,
            access,
            grantEnabled: Boolean(grant),
            grant: grant ?? createAuthorizationScope()
        });
    }
    return result;
}

export function toAuthorizationScopeChange(scope: AuthorizationScopeForm): AuthorizationScopeChange {
    return {
        mode: scope.mode,
        department_ids: scope.mode === "RULES" ? scope.department_ids : [],
        include_descendants: scope.mode === "RULES" && scope.include_descendants
    };
}
