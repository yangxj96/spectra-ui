import { SecurityContextApi } from "@/api/auth/security-context-api.ts";
import { MenuApi } from "@/api/system/menu-api.ts";
import { hideLoading } from "@/plugin/element/loading.ts";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";
import { collectAuthorizedRouteNames, filterMenusByRouteNames } from "@/utils/menu-utils.ts";
import { MessageUtils } from "@/utils/message-utils.ts";

const hiddenMenuRouteNames = new Set(["DevopsNotificationDeliveryRecord", "DevopsNotificationDeliveryTask"]);

/** 判断命名路由是否具备菜单权限 */
export function resolveRouteAccess(requiredMenu: string | undefined, authorizedRouteNames: Set<string>) {
    if (requiredMenu && !authorizedRouteNames.has(requiredMenu)) return "/401";
    return undefined;
}

/** 加载当前登录用户的授权菜单 */
export async function loadMenu(): Promise<boolean> {
    const appStore = useAppStore();
    if (appStore.isFetchingMenus) return false;

    sessionStorage.removeItem("reloaded");
    appStore.isFetchingMenus = true;
    try {
        const [loadedMenus, context] = await Promise.all([MenuApi.current(), SecurityContextApi.current()]);
        const menus = filterMenusByRouteNames(loadedMenus, hiddenMenuRouteNames);
        useUserStore().token.permissions = context.permissions;
        appStore.menus = menus;
        appStore.authorizedRouteNames = collectAuthorizedRouteNames(menus);
        appStore.menusLoaded = true;
        return true;
    } catch (error) {
        console.error("[守卫] 加载菜单时发生异常", error);
        MessageUtils.error("网络异常，获取菜单失败");
        hideLoading();
        return false;
    } finally {
        appStore.isFetchingMenus = false;
    }
}

/** 安全获取路由标题 */
export function getRouteTitle(title: unknown): string {
    if (typeof title === "string") return title;
    if (typeof title === "function") {
        try {
            const result = title();
            return typeof result === "string" ? result : "";
        } catch (error) {
            console.error("[getRouteTitle] 标题函数执行失败:", error);
        }
    }
    return "";
}
