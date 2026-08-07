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

    type ReimbursementItemVO = {
        id: string;
        expense_date: string;
        category: string;
        description?: string;
        amount: number;
        tax_amount: number;
        invoice_no?: string;
    };

    type ReimbursementAttachmentVO = {
        id: string;
        file_id: string;
        file_name?: string;
        preview_url: string;
    };

    type ReimbursementVO = {
        id: string;
        application_id: string;
        application_no: string;
        title: string;
        status: string;
        applicant_id: string;
        purpose: string;
        expense_start: string;
        expense_end: string;
        total_amount: number;
        currency: string;
        payee_name: string;
        payee_account_masked?: string;
        payment_status: "PENDING" | "PAID";
        payment_at?: string;
        payment_remark?: string;
        process_instance_id?: string;
        reject_reason?: string;
        items: ReimbursementItemVO[];
        attachments: ReimbursementAttachmentVO[];
        created_at: string;
    };

    type ReimbursementItemParams = {
        expense_date: string;
        category: string;
        description?: string;
        amount: number;
        tax_amount?: number;
        invoice_no?: string;
    };

    type ReimbursementAttachmentParams = {
        file_id: string;
        file_name?: string;
    };

    type ReimbursementSaveParams = {
        purpose: string;
        expense_start: string;
        expense_end: string;
        total_amount: number;
        currency?: string;
        payee_name: string;
        payee_account: string;
        items: ReimbursementItemParams[];
        attachments?: ReimbursementAttachmentParams[];
    };

    type ReimbursementPageParams = BasePageParams & {
        keyword?: string;
        status?: string;
        payment_status?: string;
    };

    type ReimbursementSubmitParams = {
        approver_username?: string;
    };

    type ReimbursementPaymentParams = {
        payment_remark?: string;
    };

    type WorkbenchSummary = {
        todo_count: number;
        unread_notification_count: number;
        draft_count: number;
        in_review_count: number;
        approved_count: number;
        rejected_count: number;
        unread_notice_count: number;
        today_calendar_count: number;
        upcoming_meeting_count: number;
        notices: NoticeVO[];
        calendar_items: CalendarVO[];
        meetings: MeetingVO[];
    };

    type NoticeVO = {
        id: string;
        title: string;
        summary?: string;
        content: string;
        status: string;
        target_type: string;
        target_department_id?: string;
        publisher_id?: string;
        publish_at?: string;
        required_read: boolean;
        read: boolean;
        read_at?: string;
        created_at?: string;
    };

    type NoticeCreateParams = {
        title: string;
        summary?: string;
        content: string;
        target_type?: "ALL" | "DEPARTMENT";
        target_department_id?: string;
        required_read?: boolean;
        publish_at?: string;
    };

    type NoticePageParams = BasePageParams & {
        keyword?: string;
        status?: string;
    };

    type CalendarVO = {
        id: string;
        owner_id: string;
        title: string;
        content?: string;
        start_time: string;
        end_time: string;
        all_day: boolean;
        event_type: string;
        visibility: string;
        location?: string;
        participant_ids?: string;
        source_type?: string;
        source_id?: string;
    };

    type CalendarSaveParams = {
        title: string;
        content?: string;
        start_time: string;
        end_time: string;
        all_day?: boolean;
        event_type?: string;
        visibility?: string;
        location?: string;
        participant_ids?: string;
    };

    type CalendarPageParams = BasePageParams & {
        keyword?: string;
        start_time?: string;
        end_time?: string;
    };

    type MeetingCreateParams = {
        title: string;
        start_time: string;
        end_time: string;
        location?: string;
        content?: string;
        participants?: Array<{ user_id: string; role?: string }>;
    };
}
