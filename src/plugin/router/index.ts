import { createRouter, createWebHashHistory } from "vue-router";

import { fetchClientPrivateKey } from "@/api/system/crypto-api.ts";
import { hideLoading, showLoading } from "@/plugin/element/loading";
import { validateToken } from "@/plugin/request/auth.ts";
import { cancelAllRequests } from "@/plugin/request/http.ts";
import routes from "@/plugin/router/routes";
import { useAppStore } from "@/plugin/store/modules/use-app-store.ts";
import { useCryptoStore } from "@/plugin/store/modules/use-crypto-store.ts";
import { useUserStore } from "@/plugin/store/modules/use-user-store.ts";
import { getRouteTitle, loadMenu, resolveRouteAccess } from "@/utils/route-utils.ts";

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
const whiteList = new Set(["/login"]);

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

    // 3. 有 token 但访问登录页：重定向到主页
    if (to.path === "/login") {
        console.debug("[守卫] 有 token 但访问登录页，重定向到主页");
        return next({ path: "/" });
    }

    // 4. 需要加载菜单（首次进入或刷新）
    if (!appStore.menusLoaded || sessionStorage.getItem("reloaded")) {
        console.debug("[守卫] 需要验证token并加载菜单");
        // 登录刚完成时已有新签发的 Access Token，直接使用它加载菜单。
        // 只有刷新页面、内存中没有 Access Token 时，才需要通过 Refresh Cookie 恢复会话。
        const valid = tokenValidated || Boolean(token.access_token) || (await validateToken());
        if (!valid) {
            console.debug("[守卫] token验证失败，跳转登录页");
            hideLoading();
            return next({ path: "/login" });
        }
        // 获取客户端私钥（用于解密后续响应）
        if (useCryptoStore().enabled && !useCryptoStore().client_private_key) {
            await fetchClientPrivateKey();
        }
        if (!(await loadMenu())) return next(false);
        return next({ ...to, replace: true });
    }

    // 5. 校验静态路由声明的菜单权限
    const accessTarget = resolveRouteAccess(
        typeof to.meta.requiredMenu === "string" ? to.meta.requiredMenu : undefined,
        appStore.authorizedRouteNames
    );
    if (accessTarget) return next({ path: accessTarget, replace: true });

    // 6. 正常放行
    console.debug("[守卫] 正常跳转");
    showLoading();
    next();
});

// 路由后置守卫
router.afterEach(to => {
    const title = getRouteTitle(to.meta.title);
    document.title = title ? `${import.meta.env.VITE_WEB_TITLE} - ${title}` : import.meta.env.VITE_WEB_TITLE;
    hideLoading();
});

export default router;
