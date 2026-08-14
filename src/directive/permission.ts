import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";

import type { Directive, DirectiveBinding } from "vue";

type PermissionBinding = string | string[];

/**
 * v-permission 指令：只接受 Permission Catalog 中的权限编码。
 * - v-permission="'user:read'"
 * - v-permission="['user:read', 'user:update']" 默认要求全部满足
 * - v-permission.or="['user:read', 'user:update']" 任一满足即可
 */
export const permission: Directive<HTMLElement, PermissionBinding> = {
    mounted(el, binding) {
        checkPermission(el, binding);
    },
    updated(el, binding) {
        checkPermission(el, binding);
    }
};

function checkPermission(el: HTMLElement, binding: DirectiveBinding<PermissionBinding>) {
    const { value, modifiers } = binding;
    let requiredPermissions: string[];
    if (Array.isArray(value)) {
        requiredPermissions = value;
    } else if (value) {
        requiredPermissions = [value];
    } else {
        requiredPermissions = [];
    }
    const userStore = useUserStore();
    const hasAccess = modifiers.or
        ? requiredPermissions.some(permissionCode => userStore.hasPermission(permissionCode))
        : requiredPermissions.length > 0 &&
          requiredPermissions.every(permissionCode => userStore.hasPermission(permissionCode));

    if (!hasAccess) {
        el.remove();
    }
}
