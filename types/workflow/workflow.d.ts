export {};

declare global {
    // 流程定义VO
    type ProcessDefinitionVO = {
        id: string;
        key: string;
        name: string;
        version: number;
        deploymentId: string;
        resourceName: string;
        suspended: boolean;
        description?: string;
        category?: string;
        deploymentTime?: string;
    };

    // 流程实例VO
    type ProcessInstanceVO = {
        id: string;
        processDefinitionId: string;
        processDefinitionKey: string;
        businessKey: string;
        suspended: boolean;
        ended: boolean;
        startTime: string;
        startUserId: string;
    };

    // 启动流程实例入参
    type ProcessInstanceStartFrom = {
        processDefinitionKey: string;
        businessKey: string;
        variables?: Record<string, unknown>;
    };

    // 任务VO
    type TaskVO = {
        id: string;
        name: string;
        assignee: string;
        process_instance_id: string;
        process_definition_id: string;
        process_definition_key: string;
        business_key: string;
        create_time: string;
        description?: string;
    };

    // 流程定义资源VO（BPMN XML）
    type ProcessDefinitionResourceVO = {
        bpmn_xml: string;
    };

    /** 表单定义保存参数 */
    type FormDefinitionSaveFrom = {
        name: string;
        code?: string;
        description?: string;
        rule_json: string;
        options_json: string;
        form_json: string;
    };

    /** 表单版本保存参数 */
    type FormVersionSaveFrom = {
        rule_json: string;
        options_json: string;
        form_json: string;
    };

    /** 表单定义VO */
    type FormDefinitionVO = {
        id: string;
        name: string;
        code: string;
        current_version: number;
        active: boolean;
        description?: string;
        rule_json?: string;
        options_json?: string;
        form_json?: string;
        created_by?: string;
        created_at?: string;
        updated_at?: string;
    };

    /** 表单版本VO */
    type FormVersionVO = {
        id: string;
        form_definition_id: string;
        form_version: number;
        rule_json?: string;
        options_json?: string;
        form_json?: string;
        created_by?: string;
        created_at?: string;
    };
}
