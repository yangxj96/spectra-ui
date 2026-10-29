import { describe, expect, it } from "vitest";

import {
    createPickerRequestGuard,
    getPropertyTargetKey
} from "../../../logicflow-plugin-flowable/src/panel/property/picker-request";

const createGuard = (current = "node:a", disposed = false) => {
    const context = { current, disposed };
    const guard = createPickerRequestGuard({
        isDisposed: () => context.disposed,
        currentTargetKey: () => context.current
    });
    return { context, guard };
};

describe("插件 Picker 请求守卫", () => {
    it("目标一致时请求有效", () => {
        const { guard } = createGuard();
        const token = guard.begin(getPropertyTargetKey("node", "a"));

        expect(token.isActive()).toBe(true);
    });

    it("切换目标后旧请求失效", () => {
        const { context, guard } = createGuard();
        const token = guard.begin(getPropertyTargetKey("node", "a"));

        context.current = "node:b";

        expect(token.isActive()).toBe(false);
    });

    it("同一目标只接受最新请求", () => {
        const { guard } = createGuard();
        const first = guard.begin(getPropertyTargetKey("node", "a"));
        const second = guard.begin(getPropertyTargetKey("node", "a"));

        expect(first.isActive()).toBe(false);
        expect(second.isActive()).toBe(true);
    });

    it("取消请求后失效", () => {
        const { guard } = createGuard();
        const token = guard.begin(getPropertyTargetKey("node", "a"));

        token.cancel();

        expect(token.isActive()).toBe(false);
    });

    it("面板销毁后失效", () => {
        const { context, guard } = createGuard();
        const token = guard.begin(getPropertyTargetKey("node", "a"));

        context.disposed = true;

        expect(token.isActive()).toBe(false);
    });

    it("invalidateAll 使全部请求失效", () => {
        const { guard } = createGuard();
        const token = guard.begin(getPropertyTargetKey("node", "a"));

        guard.invalidateAll();

        expect(token.isActive()).toBe(false);
    });

    it("节点与连线目标键相互隔离", () => {
        expect(getPropertyTargetKey("node", "a").key).toBe("node:a");
        expect(getPropertyTargetKey("edge", undefined, "a").key).toBe("edge:a");
        expect(getPropertyTargetKey("process").key).toBe("process");
    });
});
