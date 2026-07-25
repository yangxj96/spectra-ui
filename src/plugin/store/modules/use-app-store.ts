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
        /** 完整菜单树（后端返回） */
        menus: [],
        /** 当前激活的侧边栏菜单 */
        currentMenus: [],
        /** 当前菜单路由前缀 */
        currentMenusPrefix: "",
        /** 是否正在请求菜单 */
        isFetchingMenus: false,
        /** 侧边栏是否展开 */
        unfold: true,
        /** 是否显示水印 */
        watermark: false
    })
});
