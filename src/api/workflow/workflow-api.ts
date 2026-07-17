import { get, post } from "@/plugin/request/api.ts";

/**
 * 工作流相关接口
 *
 * @author yangxj96
 * @version 1.0
 * @since 2026-07-17
 */
export const WorkflowApi = {
    /**
     * 获取流程定义列表
     */
    getProcessDefinitions(): Promise<ProcessDefinitionVO[]> {
        return get<ProcessDefinitionVO[]>("/api/workflow/process-definitions");
    },

    /**
     * 获取流程定义详情
     * @param id 流程定义ID
     */
    getProcessDefinition(id: string): Promise<ProcessDefinitionVO> {
        return get<ProcessDefinitionVO>(`/api/workflow/process-definitions/${id}`);
    },

    /**
     * 获取流程定义图
     * @param id 流程定义ID
     */
    getProcessDefinitionDiagram(id: string): Promise<Blob> {
        return get<Blob>(`/api/workflow/process-definitions/${id}/diagram`);
    },

    /**
     * 挂起流程定义
     * @param id 流程定义ID
     */
    suspendProcessDefinition(id: string): Promise<void> {
        return post<void>(`/api/workflow/process-definitions/${id}/suspend`);
    },

    /**
     * 激活流程定义
     * @param id 流程定义ID
     */
    activateProcessDefinition(id: string): Promise<void> {
        return post<void>(`/api/workflow/process-definitions/${id}/activate`);
    },

    /**
     * 启动流程实例
     * @param params 启动参数
     */
    startProcessInstance(params: ProcessInstanceStartFrom): Promise<string> {
        return post<string>("/api/workflow/process-instances/start", params);
    },

    /**
     * 获取流程实例图
     * @param processInstanceId 流程实例ID
     */
    getProcessInstanceDiagram(processInstanceId: string): Promise<Blob> {
        return get<Blob>(`/api/workflow/process-instances/${processInstanceId}/diagram`);
    }
};
