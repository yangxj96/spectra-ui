export {};

declare global {
    type QuartzTriggerType = "CRON" | "SIMPLE";
    type QuartzMisfireInstruction = "DO_NOTHING" | "FIRE_ONCE_NOW" | "NEXT_WITH_REMAINING_COUNT";
    type QuartzExecutionHistoryStatus = "RUNNING" | "SUCCEEDED" | "FAILED" | "VETOED" | "ABANDONED";

    interface QuartzParameterFieldVO {
        type: string;
        required: boolean;
        sensitive: boolean;
        description: string | null;
    }

    interface QuartzJobTypeVO {
        type_key: string;
        display_name: string;
        protected_job: boolean;
        job_class_name: string;
        parameter_version: string;
        parameter_fields: Record<string, QuartzParameterFieldVO>;
        allow_unknown_parameters: boolean;
        supported_trigger_types: QuartzTriggerType[];
    }

    interface QuartzTriggerVO {
        trigger_key: string;
        trigger_type: QuartzTriggerType;
        state: string;
        cron_expression: string | null;
        interval_ms: number | null;
        one_shot: boolean;
        time_zone: string | null;
        misfire_instruction: QuartzMisfireInstruction;
        start_at: string | null;
        previous_fire_at: string | null;
        next_fire_at: string | null;
    }

    interface QuartzJobVO {
        job_key: string;
        group: string;
        display_name: string;
        type_key: string;
        protected_job: boolean;
        job_class_name: string;
        parameter_version: string;
        trigger: QuartzTriggerVO | null;
    }

    interface QuartzExecutionHistoryVO {
        id: string;
        fire_instance_id: string;
        job_key: string;
        trigger_key: string;
        job_type: string;
        job_class_name: string;
        trigger_type: string;
        status: QuartzExecutionHistoryStatus;
        scheduled_fire_at: string | null;
        actual_fire_at: string;
        started_at: string;
        finished_at: string | null;
        duration_ms: number | null;
        scheduler_instance: string | null;
        correlation_id: string | null;
        parameter_version: string | null;
        parameter_sha256: string | null;
        result_summary: string | null;
        error_code: string | null;
        error_message: string | null;
    }

    interface QuartzTriggerParams {
        trigger_type: QuartzTriggerType;
        cron_expression?: string | null;
        time_zone?: string | null;
        start_at?: string | null;
        interval_ms?: number | null;
        one_shot?: boolean;
        misfire_instruction?: QuartzMisfireInstruction | null;
    }

    interface QuartzJobCreateParams {
        display_name: string;
        type_key: string;
        parameters_json: string;
        trigger: QuartzTriggerParams;
    }

    interface QuartzJobUpdateParams {
        display_name: string;
        parameters_json: string;
        trigger: QuartzTriggerParams;
    }

    interface QuartzHistoryQuery extends BasePageParams {
        job_key?: string;
        trigger_key?: string;
        status?: QuartzExecutionHistoryStatus;
        from?: string;
        to?: string;
    }
}
