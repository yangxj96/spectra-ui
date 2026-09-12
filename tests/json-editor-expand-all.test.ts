import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";

import JsonEditor from "@/components/JsonEditor/index.vue";

const jsonEditorApi = vi.hoisted(() => ({
    expandAll: vi.fn(),
    setMode: vi.fn(),
    setText: vi.fn()
}));

vi.mock("jsoneditor", () => ({
    default: class {
        expandAll = jsonEditorApi.expandAll;
        setMode = jsonEditorApi.setMode;
        setText = jsonEditorApi.setText;
    }
}));

describe("JsonEditor", () => {
    beforeEach(() => {
        jsonEditorApi.expandAll.mockReset();
        jsonEditorApi.setMode.mockReset();
        jsonEditorApi.setText.mockReset();
    });

    it("只读且启用 expandAll 时应该切到查看模式并展开所有字段", () => {
        const wrapper = mount(JsonEditor, {
            props: {
                modelValue: { nested: { value: true } },
                readOnly: true,
                expandAll: true
            }
        });

        expect(jsonEditorApi.setMode).toHaveBeenCalledWith("view");
        expect(jsonEditorApi.expandAll).toHaveBeenCalledOnce();

        wrapper.unmount();
    });
});
