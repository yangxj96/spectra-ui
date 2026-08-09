import { defineComponent, h } from "vue";

export default defineComponent({
    name: "DisabledRichText",
    inheritAttrs: false,
    props: {
        modelValue: {
            type: String,
            default: ""
        }
    },
    setup() {
        return () =>
            h(
                "div",
                {
                    role: "alert",
                    style: {
                        color: "var(--el-color-warning)",
                        padding: "12px",
                        border: "1px solid var(--el-color-warning-light-5)",
                        borderRadius: "4px"
                    }
                },
                "旧富文本组件已因安全风险停用，请迁移为普通文本或安全的富文本组件。"
            );
    }
});
