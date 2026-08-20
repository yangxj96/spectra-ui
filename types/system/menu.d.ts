export {};

declare global {
    // 菜单
    type Menu = BaseEntity & {
        //父级ID
        pid?: string;
        //图标
        icon: string;
        //名称
        name: string;
        //节点类型
        menuType: "DIRECTORY" | "MENU";
        //静态路由名称
        routeName: string | null;
        //排序
        sort: number;
        //子级
        children?: Menu[];
    };

    type MenuSaveForm = {
        id?: string;
        pid?: string | null;
        icon: string;
        menuType: "DIRECTORY" | "MENU";
        routeName: string | null;
        name: string;
        sort: number;
    };
}
