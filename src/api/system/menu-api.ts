import { del, get, post, put } from "@/plugin/request/api.ts";

type MenuResponse = Omit<Menu, "menuType" | "routeName" | "children"> & {
    menu_type: Menu["menuType"];
    route_name?: string | null;
    children?: MenuResponse[];
};

function normalizeMenu(menu: MenuResponse): Menu {
    const { menu_type, route_name, children, ...rest } = menu;
    return {
        ...rest,
        menuType: menu_type,
        routeName: route_name ?? null,
        children: (children ?? []).map(normalizeMenu)
    };
}

/**
 * 菜单相关接口
 *
 * @author Jack Young
 * @version 1.0
 * @since 2025-11-11 15:00:00
 */
export const MenuApi = {
    /**
     * 获取树形路由
     */
    async tree(): Promise<Menu[]> {
        return (await get<MenuResponse[]>("/api/menu/tree")).map(normalizeMenu);
    },
    /** 获取当前登录用户的授权菜单树 */
    async current(): Promise<Menu[]> {
        return (await get<MenuResponse[]>("/api/menu/current")).map(normalizeMenu);
    },
    /**
     * 新增菜单
     * @param params 菜单入参
     */
    create(params: MenuSaveForm): Promise<void> {
        return post<void>("/api/menu/created", params);
    },
    /**
     * 修改菜单
     * @param params 菜单入参
     */
    update(params: MenuSaveForm): Promise<void> {
        return put<void>("/api/menu/modify", params);
    },
    /**
     * 删除菜单
     * @param id 菜单ID
     */
    deleteById(id: string): Promise<void> {
        return del<void>(`/api/menu/${id}`);
    }
};
