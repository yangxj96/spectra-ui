import { defineStore } from "pinia";

/**
 * 用户状态管理
 * 存储 Token、登录状态，提供基于 Permission Catalog 的权限检查。
 */
export const useUserStore = defineStore("user", {
    state: (): StoreUser => {
        return {
            token: {} as Token,
            isLoggedIn: false
        };
    },
    getters: {
        getPermissions(): string[] {
            return this.token.permissions || [];
        },
        /**
         * 统一权限检查方法
         * 支持精确编码、末级 * 和全局 *；角色名称不参与权限计算。
         */
        hasPermission(): (perm: string) => boolean {
            return (perm: string): boolean => {
                if (!perm) return false;
                const allPermissions = this.getPermissions;
                return allPermissions.some(granted => matchesPermission(granted, perm));
            };
        },
        /**
         * 批量检查权限（用于 v-permission="[...]"）
         */
        hasAllPermissions(): (perms: string[]) => boolean {
            return (perms: string[]): boolean => {
                return perms.every(perm => this.hasPermission(perm));
            };
        }
    },
    // Access Token 仅存在内存；Web Refresh Token 由后端 HttpOnly Cookie 管理。
    persist: false
});

function matchesPermission(granted: string, required: string): boolean {
    if (granted === "*" || granted === required) return true;
    const grantedParts = granted.split(":");
    const requiredParts = required.split(":");
    if (grantedParts.length !== requiredParts.length) return false;
    return grantedParts.every((part, index) => part === "*" || part === requiredParts[index]);
}
