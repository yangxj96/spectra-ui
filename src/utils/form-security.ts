const DISABLED_COMPONENT_TYPES = new Set(["fceditor", "wangeditor"]);

function containsDisabledComponent(value: unknown, visited: WeakSet<object>): boolean {
    if (value === null || typeof value !== "object") {
        return false;
    }

    if (visited.has(value)) {
        return false;
    }
    visited.add(value);

    if (Array.isArray(value)) {
        return value.some(item => containsDisabledComponent(item, visited));
    }

    const rule = value as Record<string, unknown>;
    const identifiers = [rule.type, rule._fc_drag_tag, rule.name];
    if (
        identifiers.some(
            identifier =>
                typeof identifier === "string" &&
                DISABLED_COMPONENT_TYPES.has(identifier.replaceAll("-", "").toLowerCase())
        )
    ) {
        return true;
    }

    return Object.values(rule).some(item => containsDisabledComponent(item, visited));
}

/**
 * 解析并校验表单规则，阻止旧 wangeditor 组件进入设计器或保存到后端。
 */
export function parseSafeFormRuleJson<T = unknown>(ruleJson: string): T {
    const rule = JSON.parse(ruleJson) as T;
    if (containsDisabledComponent(rule, new WeakSet())) {
        throw new Error("表单包含已停用的旧富文本组件，请移除或迁移后重试");
    }
    return rule;
}
