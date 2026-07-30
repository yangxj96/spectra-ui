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

/** 过滤尚未迁移到新模型的兼容期节点 */
export function filterMenuModelTree(menus: Menu[]): Menu[] {
    return menus
        .filter(menu => menu.menuType !== null)
        .map(menu => ({ ...menu, children: filterMenuModelTree(menu.children ?? []) }));
}
