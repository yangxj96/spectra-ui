import { describe, expect, it } from "vitest";

import { parseSafeFormRuleJson } from "@/utils/form-security.ts";

describe("form security", () => {
    it("accepts ordinary form rules", () => {
        const result = parseSafeFormRuleJson<Array<{ type: string }>>('[{"type":"input"}]');

        expect(result).toEqual([{ type: "input" }]);
    });

    it.each(["fcEditor", "fc-editor", "wangeditor"])("rejects disabled component type %s", type => {
        expect(() => parseSafeFormRuleJson(`[{"type":"${type}"}]`)).toThrow("旧富文本组件");
    });

    it("rejects disabled components nested in children", () => {
        expect(() => parseSafeFormRuleJson('[{"type":"group","children":[{"_fc_drag_tag":"fcEditor"}]}]')).toThrow(
            "旧富文本组件"
        );
    });
});
