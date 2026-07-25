import { defineStore } from "pinia";

/**
 * 全局弹窗控制状态
 * 控制个人资料、修改密码等全局弹窗的显示/隐藏
 */
export const usePropsStore = defineStore("props", {
    state: (): StoreProps => ({
        /** 个人资料弹窗是否显示 */
        personal_details: false,
        /** 修改密码弹窗是否显示 */
        change_password: false
    })
});
