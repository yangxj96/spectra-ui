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
}
