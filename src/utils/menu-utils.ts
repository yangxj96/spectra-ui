import type { RouteRecordRaw } from "vue-router";

/** 收集授权树中所有可点击菜单的路由名称 */
export function collectAuthorizedRouteNames(menus: Menu[]): Set<string> {
    const result = new Set<string>();
    for (const menu of menus) {
        if (menu.menuType === "MENU" && menu.routeName) {
            result.add(menu.routeName);
        }
        if (menu.children?.length) {
            for (const routeName of collectAuthorizedRouteNames(menu.children)) {
                result.add(routeName);
            }
        }
    }
    return result;
}

/** Keep dashboard shortcuts aligned with the current user's authorized menu routes. */
export function filterAuthorizedShortcuts<T extends { routeName: string }>(
    shortcuts: T[],
    authorizedRouteNames: ReadonlySet<string>
): T[] {
    return shortcuts.filter(shortcut => authorizedRouteNames.has(shortcut.routeName));
}

/** 收集前端实际注册的命名路由，供服务端菜单树与当前页面能力对齐。 */
export function collectRegisteredRouteNames(routes: readonly RouteRecordRaw[]): Set<string> {
    const result = new Set<string>();
    for (const route of routes) {
        if (typeof route.name === "string") result.add(route.name);
        if (route.children?.length) {
            for (const routeName of collectRegisteredRouteNames(route.children)) {
                result.add(routeName);
            }
        }
    }
    return result;
}

/** 仅保留能解析到已注册页面的菜单，并递归清理没有有效页面的目录。 */
export function filterMenusByRegisteredRoutes(menus: Menu[], registeredRouteNames: ReadonlySet<string>): Menu[] {
    return menus.flatMap(menu => {
        if (menu.menuType === "MENU") {
            return menu.routeName && registeredRouteNames.has(menu.routeName) ? [menu] : [];
        }

        const children = filterMenusByRegisteredRoutes(menu.children ?? [], registeredRouteNames);
        return children.length ? [{ ...menu, children }] : [];
    });
}

/** 按路由名称递归查找菜单 */
export function findMenuByRouteName(menus: Menu[], routeName: string): Menu | undefined {
    for (const menu of menus) {
        if (menu.routeName === routeName) return menu;
        const child = findMenuByRouteName(menu.children ?? [], routeName);
        if (child) return child;
    }
    return undefined;
}

/** 查找从根节点到目标菜单的完整路径 */
export function findMenuPath(menus: Menu[], routeName: string): Menu[] {
    for (const menu of menus) {
        if (menu.routeName === routeName) return [menu];
        const childPath = findMenuPath(menu.children ?? [], routeName);
        if (childPath.length) return [menu, ...childPath];
    }
    return [];
}

/** 过滤已合并展示的旧菜单，避免后端菜单数据更新前出现重复入口。 */
export function filterMenusByRouteNames(menus: Menu[], routeNames: ReadonlySet<string>): Menu[] {
    return menus.flatMap(menu => {
        if (menu.routeName && routeNames.has(menu.routeName)) return [];
        const children = menu.children ? filterMenusByRouteNames(menu.children, routeNames) : undefined;
        return [{ ...menu, ...(children ? { children } : {}) }];
    });
}

/** 查找节点下第一个可点击菜单 */
export function findFirstRoutableMenu(menu: Menu): Menu | undefined {
    if (menu.menuType === "MENU" && menu.routeName) return menu;
    for (const child of menu.children ?? []) {
        const target = findFirstRoutableMenu(child);
        if (target) return target;
    }
    return undefined;
}

/** 从树中提取已选中的可点击菜单 ID */
export function collectMenuIds(menus: Menu[], selectedIds: Array<string | number>): string[] {
    const selected = new Set(selectedIds.map(String));
    const result: string[] = [];
    for (const menu of menus) {
        if (menu.menuType === "MENU" && selected.has(menu.id)) result.push(menu.id);
        result.push(...collectMenuIds(menu.children ?? [], selectedIds));
    }
    return result;
}

/** 构建父级候选目录树，并排除当前节点及其后代 */
export function filterDirectoryTree(menus: Menu[], excludedId?: string): Menu[] {
    return menus
        .filter(menu => menu.menuType === "DIRECTORY" && menu.id !== excludedId)
        .map(menu => ({ ...menu, children: filterDirectoryTree(menu.children ?? [], excludedId) }));
}
