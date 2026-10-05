import { createRouter, createWebHashHistory, type NavigationGuardNext, type RouteLocationNormalized } from "vue-router";

import { fetchClientPrivateKey } from "@/api/system/crypto-api.ts";
import { SystemGuideApi } from "@/api/system/system-guide-api.ts";
import { hideLoading, showLoading } from "@/plugin/element/loading";
import { validateToken } from "@/plugin/request/auth.ts";
import { cancelAllRequests } from "@/plugin/request/request-lifecycle.ts";
import routes from "@/plugin/router/routes";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store.ts";
import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";
import {
    getRouteTitle,
    loadMenu,
    resolvePasswordChangeRedirect,
    resolveRouteAccess,
    shouldBypassAuthenticatedBootstrap
} from "@/utils/route-utils.ts";

/**
 * 路由实例
 * 前置守卫：鉴权、菜单加载、加密初始化、请求取消
 * 后置守卫：页面标题设置、loading 关闭
 */
const router = createRouter({
    history: createWebHashHistory(),
    routes,
    scrollBehavior() {
        return {
            top: 0
        };
    }
});

/** 无需登录即可访问的路径白名单 */
const whiteList = new Set(["/login", "/initialization"]);

async function resolveGuideAccess(
    to: RouteLocationNormalized,
    appStore: ReturnType<typeof useAppStore>,
    next: NavigationGuardNext
): Promise<boolean> {
    const isSystemGuide = to.path === "/system-guide";
    let guideStatus = appStore.system_guide;
    if (!appStore.system_guide_loaded) {
        try {
            guideStatus = await SystemGuideApi.status();
            appStore.setSystemGuideStatus(guideStatus);
        } catch (error) {
            console.error("[守卫] 查询系统设置引导状态失败", error);
            hideLoading();
            if (isSystemGuide) next();
            else next(false);
            return true;
        }
    }
    if (guideStatus.required && !isSystemGuide) {
        next({ path: "/system-guide", query: { redirect: to.fullPath }, replace: true });
        return true;
    }
    if (!guideStatus.required && isSystemGuide) {
        const redirect = typeof to.query.redirect === "string" && to.query.redirect.startsWith("/") ? to.query.redirect : "/";
        next({ path: redirect, replace: true });
        return true;
    }
    if (isSystemGuide) {
        showLoading();
        next();
        return true;
    }
    return false;
}

async function resolveMenuAccess(
    to: RouteLocationNormalized,
    next: NavigationGuardNext,
    appStore: ReturnType<typeof useAppStore>,
    token: ReturnType<typeof useUserStore>["token"],
    tokenValidated: boolean
): Promise<boolean> {
    if (appStore.menusLoaded && !sessionStorage.getItem("reloaded")) return false;
    const valid = tokenValidated || Boolean(token.access_token) || (await validateToken());
    if (!valid) {
        hideLoading();
        next({ path: "/login" });
        return true;
    }
    if (useCryptoStore().enabled && !useCryptoStore().client_private_key) await fetchClientPrivateKey();
    if (!(await loadMenu())) {
        next(false);
        return true;
    }
    next({ ...to, replace: true });
    return true;
}

// 路由前置守卫
router.beforeEach(async (to, _, next) => {
    // 路由切换时取消所有未完成请求
    cancelAllRequests();

    const userStore = useUserStore();
    const appStore = useAppStore();
    const token = userStore.token;
    let tokenValidated = false;

    console.debug(`[路由守卫] 开始 | token: ${!!token.access_token}, 目标: ${to.path}`);

    // 1. 白名单：直接放行
    if (whiteList.has(to.path) && !token.access_token) {
        console.debug("[守卫] 白名单通过");
        showLoading();
        return next();
    }

    // 2. 刷新页面后 Access Token 仅存在内存，先用 HttpOnly Refresh Cookie 恢复一次会话。
    if (!token.access_token) {
        console.debug("[守卫] 无 Access Token，尝试使用 Refresh Cookie 恢复会话");
        const valid = await validateToken();
        if (!valid) {
            console.debug("[守卫] Refresh Cookie 无效，跳转登录页");
            hideLoading();
            return next({ path: "/login" });
        }
        tokenValidated = true;
    }

    // 首次登录或管理员重置后的默认密码会限制为仅修改密码和退出。
    const passwordChangeRequired = userStore.token.password_change_required === true;
    const passwordChangeRedirect = resolvePasswordChangeRedirect(to.path, to.query.tab, passwordChangeRequired);
    if (passwordChangeRedirect) return next(passwordChangeRedirect);
    // This restricted session can only call password APIs; avoid guide/menu requests that would expire it.
    if (shouldBypassAuthenticatedBootstrap(to.path, to.query.tab, passwordChangeRequired)) return next();

    // 3. 有 token 但访问登录页：重定向到主页
    if (to.path === "/login") {
        console.debug("[守卫] 有 token 但访问登录页，重定向到主页");
        return next({ path: "/" });
    }

    // 4. DEV_OPS 首次登录必须完成系统设置引导；其他用户直接视为不需要引导。
    if (await resolveGuideAccess(to, appStore, next)) return;

    // 5. 需要加载菜单（首次进入或刷新）
    if (await resolveMenuAccess(to, next, appStore, token, tokenValidated)) return;

    // 6. 校验静态路由声明的菜单权限
    const accessTarget = resolveRouteAccess(
        typeof to.meta.requiredMenu === "string" ? to.meta.requiredMenu : undefined,
        appStore.authorizedRouteNames,
        {
            requiredPermissions: to.meta.requiredPermissions,
            requiredAnyPermissions: to.meta.requiredAnyPermissions,
            hasPermission: useUserStore().hasPermission
        }
    );
    if (accessTarget) return next({ path: accessTarget, replace: true });

    // 7. 正常放行
    console.debug("[守卫] 正常跳转");
    showLoading();
    next();
});

// 路由后置守卫
router.afterEach(to => {
    const title = getRouteTitle(to.meta.title);
    const systemName = useAppStore().system.name || "Spectra";
    document.title = title ? `${systemName} - ${title}` : systemName;
    hideLoading();
});

export default router;
