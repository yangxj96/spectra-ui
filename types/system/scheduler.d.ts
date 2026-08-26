export {};

declare global {
    type SchedulerJobType = "OPS" | "SYSTEM" | "LOOP";
    type SchedulerRunScope = "PER_INSTANCE" | "SINGLETON";
    type SchedulerScheduleKind = "CRON" | "FIXED_DELAY" | "MANUAL";
    type SchedulerEffectType = "DB_ONLY" | "OUTBOX" | "EXTERNAL_IDEMPOTENT" | "EXTERNAL_UNKNOWN";
    type SchedulerDefinitionStatus = "REGISTERED" | "UNAVAILABLE" | "ARCHIVED";
    type SchedulerDesiredState = "ENABLED" | "DISABLED" | "RUNNING" | "DRAINING" | "STOPPED";
    type SchedulerExecutionStatus =
        | "QUEUED"
        | "RUNNING"
        | "RETRY_WAIT"
        | "SUCCEEDED"
        | "FAILED"
        | "UNKNOWN"
        | "SKIPPED"
        | "CANCELLED";
    type SchedulerTriggerType = "SCHEDULE" | "MANUAL" | "RETRY";
    type SchedulerResolutionStatus = "UNRESOLVED" | "CONFIRMED_SUCCESS" | "CONFIRMED_FAILED" | "RETRIED";
    type SchedulerRuntimeStatus = "STARTING" | "RUNNING" | "DEGRADED" | "DRAINING" | "STOPPED" | "CRASHED" | "UNKNOWN";
    type SchedulerCommandType = "START" | "DRAIN_STOP" | "RESTART" | "FORCE_STOP" | "FORCE_RECLAIM";
    type SchedulerCommandStatus = "REQUESTED" | "APPLYING" | "APPLIED" | "FAILED" | "TIMEOUT";
    type SchedulerLoopErrorStatus = "OPEN" | "RESOLVED";
    type SchedulerOperationType =
        | "CREATE"
        | "UPDATE"
        | "ENABLE"
        | "DISABLE"
        | "ARCHIVE"
        | "REREGISTER"
        | "TRIGGER"
        | "RETRY"
        | "CANCEL"
        | "RESOLVE"
        | "START"
        | "DRAIN_STOP"
        | "RESTART"
        | "FORCE_STOP"
        | "FORCE_RECLAIM";
    type SchedulerOperationStatus = "REQUESTED" | "APPLYING" | "APPLIED" | "SUCCEEDED" | "FAILED" | "TIMEOUT";
    type SchedulerOperationSource = "TASK" | "LOOP_COMMAND";

    interface SchedulerCatalogVO {
        job_key: string;
        handler_key: string;
        name: string;
        module: string;
        job_type: SchedulerJobType;
        run_scope: SchedulerRunScope;
        schedule_kind: SchedulerScheduleKind;
        effect_type: SchedulerEffectType;
        parameter_schema: Record<string, unknown>;
        supported_actions: string[];
        execution_policy: Record<string, unknown>;
    }

    interface SchedulerJobVO {
        id: string;
        job_key: string;
        name: string;
        module: string;
        description: string | null;
        handler_key: string;
        job_type: SchedulerJobType;
        run_scope: SchedulerRunScope;
        definition_status: SchedulerDefinitionStatus;
        desired_state: SchedulerDesiredState;
        schedule_kind: SchedulerScheduleKind;
        cron_expression: string | null;
        fixed_delay_ms: number | null;
        initial_delay_ms: number | null;
        next_fire_at: string | null;
        misfire_policy: string;
        concurrency_policy: string;
        execution_policy: Record<string, unknown>;
        parameters: Record<string, unknown>;
        revision: number;
        version: number;
    }

    interface SchedulerExecutionVO {
        id: string;
        job_id: string;
        fire_key: string;
        trigger_type: SchedulerTriggerType;
        status: SchedulerExecutionStatus;
        job_revision: number;
        handler_version: string;
        schedule_kind_snapshot: SchedulerScheduleKind;
        schedule_expression_snapshot: string | null;
        parameters_snapshot: Record<string, unknown>;
        effect_type: SchedulerEffectType;
        scheduled_at: string;
        queued_at: string;
        started_at: string | null;
        finished_at: string | null;
        next_retry_at: string | null;
        deadline_at: string | null;
        attempt_no: number;
        max_attempts: number;
        locked_by: string | null;
        locked_at: string | null;
        lease_expires_at: string | null;
        last_heartbeat_at: string | null;
        last_error_code: string | null;
        last_error_message: string | null;
        result_summary: Record<string, unknown>;
        original_execution_id: string | null;
        resolution_status: SchedulerResolutionStatus;
        resolution_reason: string | null;
        resolved_by: string | null;
        resolved_at: string | null;
        version: number;
    }

    interface SchedulerLoopRuntimeVO {
        id: string;
        job_id: string;
        session_key: string;
        instance_id: string;
        status: SchedulerRuntimeStatus;
        started_at: string;
        stopped_at: string | null;
        last_heartbeat_at: string | null;
        lease_expires_at: string | null;
        last_cycle_at: string | null;
        last_progress_at: string | null;
        drain_deadline_at: string | null;
        total_cycles: number;
        total_processed: number;
        total_failed: number;
        consecutive_error_count: number;
        last_error_code: string | null;
        last_error_message: string | null;
        state_reason: string | null;
        version: number;
    }

    interface SchedulerLoopErrorVO {
        id: string;
        job_id: string;
        instance_id: string;
        runtime_id: string | null;
        error_fingerprint: string;
        error_code: string;
        error_message: string;
        status: SchedulerLoopErrorStatus;
        first_seen_at: string;
        last_seen_at: string;
        last_logged_at: string | null;
        occurrence_count: number;
        suppressed_count: number;
        last_context: Record<string, unknown>;
        resolved_by: string | null;
        resolved_at: string | null;
        resolution_reason: string | null;
        version: number;
    }

    interface SchedulerControlCommandVO {
        id: string;
        job_id: string;
        target_runtime_id: string | null;
        target_session_key: string | null;
        expected_runtime_version: number | null;
        command_type: SchedulerCommandType;
        status: SchedulerCommandStatus;
        idempotency_key: string;
        reason: string;
        requested_by: string | null;
        requested_at: string;
        deadline_at: string | null;
        applied_at: string | null;
        finished_at: string | null;
        result_code: string | null;
        result_message: string | null;
        version: number;
    }

    interface SchedulerOperationVO {
        id: string;
        job_id: string;
        execution_id: string | null;
        operation_type: SchedulerOperationType;
        source: SchedulerOperationSource;
        status: SchedulerOperationStatus;
        idempotency_key: string;
        reason: string;
        requested_by: string | null;
        requested_at: string;
        finished_at: string | null;
        result_code: string | null;
        result_message: string | null;
    }

    interface SchedulerJobSaveParams {
        job_key: string;
        name: string;
        description?: string | null;
        schedule_kind: SchedulerScheduleKind;
        cron_expression?: string | null;
        fixed_delay_ms?: number | null;
        initial_delay_ms?: number | null;
        misfire_policy: string;
        concurrency_policy: string;
        execution_policy: Record<string, unknown>;
        parameters: Record<string, unknown>;
        version?: number;
        idempotency_key: string;
        reason: string;
    }

    interface SchedulerOperationParams {
        version: number;
        idempotency_key: string;
        reason: string;
    }

    interface SchedulerTriggerParams {
        parameters: Record<string, unknown>;
        idempotency_key: string;
        reason: string;
    }

    interface SchedulerExecutionActionParams extends SchedulerOperationParams {
        resolution_status?: SchedulerResolutionStatus;
    }

    interface SchedulerLoopCommandParams {
        command_type: SchedulerCommandType;
        target_runtime_id?: string;
        target_session_key?: string;
        expected_runtime_version?: number;
        idempotency_key: string;
        reason: string;
        deadline_at?: string;
    }

    interface SchedulerJobQuery extends BasePageParams {
        job_key?: string;
        job_type?: SchedulerJobType;
        definition_status?: SchedulerDefinitionStatus;
        desired_state?: SchedulerDesiredState;
    }

    interface SchedulerExecutionQuery extends BasePageParams {
        job_id?: string;
        status?: SchedulerExecutionStatus;
        fire_key?: string;
    }

    interface SchedulerLoopQuery extends BasePageParams {
        job_id?: string;
        instance_id?: string;
        status?: SchedulerRuntimeStatus;
    }

    interface SchedulerLoopErrorQuery extends BasePageParams {
        job_id: string;
        instance_id?: string;
        status?: SchedulerLoopErrorStatus;
    }
}
