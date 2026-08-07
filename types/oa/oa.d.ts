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

    type LeaveVO = {
        id: string;
        application_id: string;
        application_no: string;
        title: string;
        status: string;
        applicant_id: string;
        leave_type_code: string;
        start_time: string;
        end_time: string;
        duration_hours: number;
        reason: string;
        contact_address?: string;
        process_instance_id?: string;
        reject_reason?: string;
        created_at: string;
    };

    type LeaveCreateParams = {
        leave_type_code: string;
        start_time: string;
        end_time: string;
        reason: string;
        contact_address?: string;
        calculate_duration: boolean;
    };

    type LeavePageParams = BasePageParams & {
        status?: string;
        leave_type_code?: string;
    };

    type WorkbenchSummary = {
        todo_count: number;
        unread_notification_count: number;
        draft_count: number;
        in_review_count: number;
        approved_count: number;
        rejected_count: number;
    };
}
