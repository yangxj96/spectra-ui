import zhCn from "element-plus/es/locale/lang/zh-cn";
import { defineStore } from "pinia";

/**
 * 全局应用状态
 * 管理语言、菜单、侧边栏展开、水印等全局 UI 状态
 */
export const useAppStore = defineStore("app", {
    state: (): StoreApp => ({
        /** Element Plus 国际化语言包 */
        lang: zhCn,
        /** 系统公开信息 */
        system: {
            name: "Spectra",
            short_name: "Spectra",
            logo: "",
            default_locale: "zh-CN",
            default_timezone: "Asia/Shanghai",
            copyright_enabled: true,
            copyright_name: "devops00",
            copyright_url: "https://www.devops00.com"
        },
        /** 系统初始化状态 */
        initialization: {
            state: "UNINITIALIZED",
            initialized: false,
            initialization_required: true
        },
        /** 系统设置引导状态 */
        system_guide: {
            state: "PENDING",
            completed: false,
            required: false
        },
        /** 系统设置引导状态是否已加载 */
        system_guide_loaded: false,
        /** 启动配置是否已加载 */
        bootstrap_loaded: false,
        /** 完整菜单树（后端返回） */
        menus: [],
        /** 当前激活的侧边栏菜单 */
        currentMenus: [],
        /** 当前用户可访问的命名路由 */
        authorizedRouteNames: new Set<string>(),
        /** 是否正在请求菜单 */
        isFetchingMenus: false,
        /** 当前用户菜单是否已加载 */
        menusLoaded: false,
        /** 侧边栏是否展开 */
        unfold: true,
        /** 是否显示水印 */
        watermark: false
    }),
    actions: {
        /** 保存启动阶段返回的公开配置。 */
        setBootstrap(payload: SystemBootstrap) {
            this.system = payload.system;
            this.initialization = payload.initialization;
            this.bootstrap_loaded = true;
        },
        /** 更新系统设置引导刚保存的公开版权配置。 */
        setCopyrightConfig(config: Pick<SystemPublicConfig, "copyright_enabled" | "copyright_name" | "copyright_url">) {
            this.system = { ...this.system, ...config };
        },
        /** 更新初始化状态。 */
        setInitializationStatus(status: SystemInitializationStatus) {
            this.initialization = status;
        },
        /** 更新系统设置引导状态。 */
        setSystemGuideStatus(status: SystemGuideStatus) {
            this.system_guide = status;
            this.system_guide_loaded = true;
        },
        /** 标记启动配置请求失败，允许页面执行状态接口回退。 */
        markBootstrapUnavailable() {
            this.bootstrap_loaded = false;
        }
    }
});
