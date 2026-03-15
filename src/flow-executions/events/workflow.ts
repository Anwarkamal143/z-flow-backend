export enum WORKFLOW_EVENT_NAMES {
  WORKFLOW_EXECUTE = "workflows/execute.workflow",
}

export type WorkflowExecuteEvent = {
  name: WORKFLOW_EVENT_NAMES.WORKFLOW_EXECUTE;
  data: {
    workflowId: string;
    initialData?: Record<string, unknown>;
  };
};

export type WorkflowEvents = WorkflowExecuteEvent;
