export {};

declare global {
    // useAppStore()的state
    type StoreApp = {
        // 全局i18n语言
        lang: object;
        // 系统公开信息
        system: SystemPublicConfig;
        // 系统初始化状态
        initialization: SystemInitializationStatus;
        // 系统设置引导状态
        system_guide: SystemGuideStatus;
        // 系统设置引导状态是否已加载
        system_guide_loaded: boolean;
        // 启动配置是否已加载
        bootstrap_loaded: boolean;
        // 菜单列表
        menus: Menu[];
        // 当前菜单子级.
        currentMenus: Menu[];
        // 当前用户可访问的命名路由
        authorizedRouteNames: Set<string>;
        // 是否展开菜单
        unfold: boolean;
        // 防止重复请求
        isFetchingMenus: boolean;
        // 当前用户菜单是否已加载
        menusLoaded: boolean;
        // 水印
        watermark: boolean;
    };

    // usePropsStore()的state
    type StoreProps = {
        // 用户详情
        personal_details: boolean;
        // 修改密码
        change_password: boolean;
    };

    // useUserStore()的state
    type StoreUser = {
        // 用户登录的token
        token: Token;
        // 是否登录
        isLoggedIn: boolean;
    };

    // useDictStore()的state
    type StoreDict = {
        // 字典缓存数组
        dicts: Record<string, DictItem[]>;
    };
}
