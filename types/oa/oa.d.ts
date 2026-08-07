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

    type PurchaseItemVO = {
        id: string;
        item_type: string;
        item_name: string;
        specification?: string;
        quantity: number;
        estimated_unit_price: number;
        estimated_amount: number;
        purpose?: string;
        received_quantity: number;
    };

    type PurchaseReceiptItemVO = {
        id: string;
        purchase_item_id: string;
        quantity: number;
        accepted: boolean;
        difference_reason?: string;
    };

    type PurchaseReceiptVO = {
        id: string;
        receipt_no: string;
        received_date: string;
        receiver_id?: string;
        status: string;
        remark?: string;
        items: PurchaseReceiptItemVO[];
    };

    type PurchaseVO = {
        id: string;
        application_id: string;
        application_no: string;
        title: string;
        status: string;
        applicant_id: string;
        department_id?: string;
        purpose: string;
        expected_date: string;
        budget_amount: number;
        currency: string;
        suggested_supplier?: string;
        execution_status: string;
        purchaser_id?: string;
        order_no?: string;
        ordered_at?: string;
        completed_at?: string;
        execution_remark?: string;
        process_instance_id?: string;
        reject_reason?: string;
        items: PurchaseItemVO[];
        receipts: PurchaseReceiptVO[];
        created_at: string;
    };

    type PurchaseItemParams = {
        item_type: string;
        item_name: string;
        specification?: string;
        quantity: number;
        estimated_unit_price: number;
        purpose?: string;
    };

    type PurchaseSaveParams = {
        purpose: string;
        expected_date: string;
        budget_amount: number;
        currency?: string;
        suggested_supplier?: string;
        items: PurchaseItemParams[];
    };

    type PurchasePageParams = BasePageParams & {
        keyword?: string;
        status?: string;
        execution_status?: string;
    };

    type PurchaseSubmitParams = {
        approver_username?: string;
    };

    type PurchaseExecuteParams = {
        purchaser_id?: string;
        order_no?: string;
        execution_status?: string;
        execution_remark?: string;
    };

    type PurchaseReceiptItemParams = {
        purchase_item_id: string;
        quantity: number;
        accepted?: boolean;
        difference_reason?: string;
    };

    type PurchaseReceiptParams = {
        receipt_no?: string;
        received_date: string;
        receiver_id?: string;
        remark?: string;
        items: PurchaseReceiptItemParams[];
    };

    type AssetCategoryVO = {
        id: string;
        pid?: string;
        code: string;
        name: string;
        asset_type: string;
        sort: number;
        enabled: boolean;
        description?: string;
    };

    type AssetOperationVO = {
        id: string;
        operation_type: string;
        from_department_id?: string;
        to_department_id?: string;
        from_user_id?: string;
        to_user_id?: string;
        from_location?: string;
        to_location?: string;
        operation_date: string;
        reason?: string;
        maintenance_content?: string;
        maintenance_cost?: number;
        status: string;
    };

    type AssetVO = {
        id: string;
        category_id?: string;
        category_name?: string;
        asset_no?: string;
        name: string;
        specification?: string;
        serial_no?: string;
        asset_type: string;
        status: string;
        quantity: number;
        acquisition_date?: string;
        acquisition_amount: number;
        currency: string;
        supplier?: string;
        location?: string;
        department_id?: string;
        custodian_id?: string;
        warranty_until?: string;
        source_purchase_id?: string;
        source_receipt_id?: string;
        source_purchase_item_id?: string;
        remark?: string;
        operations: AssetOperationVO[];
        created_at: string;
        updated_at?: string;
    };

    type AssetPageParams = BasePageParams & {
        keyword?: string;
        status?: string;
        category_id?: string;
        department_id?: string;
        custodian_id?: string;
    };

    type AssetSaveParams = {
        category_id?: string;
        asset_no?: string;
        name: string;
        specification?: string;
        serial_no?: string;
        asset_type?: string;
        status?: string;
        quantity: number;
        acquisition_date?: string;
        acquisition_amount?: number;
        currency?: string;
        supplier?: string;
        location?: string;
        department_id?: string;
        custodian_id?: string;
        warranty_until?: string;
        remark?: string;
    };

    type AssetCategorySaveParams = {
        pid?: string;
        code: string;
        name: string;
        asset_type?: string;
        sort?: number;
        enabled?: boolean;
        description?: string;
    };

    type AssetOperationParams = {
        to_department_id?: string;
        to_user_id?: string;
        to_location?: string;
        operation_date?: string;
        reason?: string;
        maintenance_content?: string;
        maintenance_cost?: number;
        status?: string;
    };

    type AssetPurchaseDraftParams = {
        purchase_id: string;
        receipt_id: string;
        category_id?: string;
    };

    type SupplyOperationVO = {
        id: string;
        supply_id: string;
        operation_type: string;
        quantity: number;
        before_stock: number;
        after_stock: number;
        department_id?: string;
        user_id?: string;
        location?: string;
        operation_date: string;
        reason?: string;
        source_purchase_id?: string;
        source_receipt_id?: string;
        source_purchase_item_id?: string;
        status: string;
        created_at?: string;
    };

    type SupplyItemVO = {
        id: string;
        category?: string;
        sku: string;
        name: string;
        specification?: string;
        unit: string;
        current_stock: number;
        min_stock: number;
        low_stock: boolean;
        status: string;
        supplier?: string;
        location?: string;
        department_id?: string;
        remark?: string;
        operations: SupplyOperationVO[];
        created_at: string;
        updated_at?: string;
    };

    type SupplyPageParams = BasePageParams & {
        keyword?: string;
        category?: string;
        status?: string;
        low_stock?: boolean;
    };

    type SupplySaveParams = {
        category?: string;
        sku: string;
        name: string;
        specification?: string;
        unit: string;
        min_stock: number;
        status?: string;
        supplier?: string;
        location?: string;
        department_id?: string;
        remark?: string;
    };

    type SupplyOperationParams = {
        quantity?: number;
        target_stock?: number;
        department_id?: string;
        user_id?: string;
        location?: string;
        operation_date?: string;
        reason?: string;
        source_purchase_id?: string;
        source_receipt_id?: string;
        source_purchase_item_id?: string;
    };

    type DepartmentStatsParams = {
        department_id?: string;
    };

    type DepartmentStatsVO = {
        department_id: string;
        department_name: string;
        asset_count: number;
        asset_quantity: number;
        asset_value: number;
        supply_sku_count: number;
        supply_stock: number;
        supply_min_stock: number;
        reimbursement_count: number;
        reimbursement_amount: number;
        purchase_count: number;
        purchase_budget: number;
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
    type DocumentVersionVO = {
        id: string;
        version_no: number;
        file_id: string;
        file_name?: string;
        file_size?: number;
        content_type?: string;
        version_note?: string;
        current: boolean;
        created_at?: string;
    };

    type DocumentVO = {
        id: string;
        folder_id?: string;
        department_id?: string;
        title: string;
        summary?: string;
        status: "DRAFT" | "PUBLISHED" | string;
        visibility: "PUBLIC" | "DEPARTMENT" | "PRIVATE" | string;
        owner_id?: string;
        published_at?: string;
        created_at?: string;
        updated_at?: string;
        current_version?: DocumentVersionVO;
    };

    type DocumentFolderVO = {
        id: string;
        pid?: string;
        name: string;
        department_id?: string;
        visibility: string;
        sort: number;
    };

    type DocumentPageParams = BasePageParams & { keyword?: string; status?: string; folder_id?: string };
    type DocumentSaveParams = { folder_id?: string; title: string; summary?: string; visibility?: string };
    type DocumentVersionParams = {
        file_id: string;
        file_name?: string;
        file_size?: number;
        content_type?: string;
        version_note?: string;
    };
    type DocumentFolderSaveParams = { pid?: string; name: string; visibility?: string; sort?: number };
}
