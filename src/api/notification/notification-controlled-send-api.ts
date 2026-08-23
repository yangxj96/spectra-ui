import { post } from "@/plugin/request/api.ts";

const SEND_API = "/api/notification/admin/send";

/**
 * 通知中心受控发送接口。
 */
export const NotificationControlledSendApi = {
    preview(params: NotificationControlledSendParams): Promise<NotificationControlledSendPreviewVO> {
        return post<NotificationControlledSendPreviewVO>(`${SEND_API}/preview`, params);
    },

    apply(params: NotificationControlledSendApplyParams): Promise<NotificationControlledSendApplyVO> {
        return post<NotificationControlledSendApplyVO>(`${SEND_API}/apply`, params);
    }
};
