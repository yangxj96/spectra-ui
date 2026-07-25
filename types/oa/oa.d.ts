export {};

declare global {
    // 会议列表VO
    type MeetingVO = {
        id: string;
        title: string;
        initiator_id: string;
        start_time: string;
        end_time: string;
        location: string;
        content: string;
        status: string;
        approval_status: string;
        process_instance_id: string;
        created_at: string;
    };

    // 会议分页请求参数
    type MeetingPageParams = BasePageParams & {
        title?: string;
        status?: string;
    };
}
