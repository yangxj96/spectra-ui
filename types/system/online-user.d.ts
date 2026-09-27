export {};

declare global {
    type OnlineUserPageParams = BasePageParams & {
        username?: string;
        real_name?: string;
        department_id?: string;
    };

    interface OnlineSessionVO {
        session_id: string;
        client_type: string;
        ip?: string | null;
        login_time?: string | null;
    }

    interface OnlineUserPageVO {
        user_id: string;
        username: string;
        real_name?: string | null;
        primary_department_id?: string | null;
        primary_department_name?: string | null;
        associated_departments: UserDepartmentSummaryVO[];
        session_count: number;
        latest_login_time?: string | null;
        sessions: OnlineSessionVO[];
    }
}
