export interface WorkflowStep {
  id: string;
  name: string;
  type: string;
  handler: (context: Record<string, any>) => Promise<any>;
  config?: Record<string, any>;
}
export interface Workflow {
  id: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'pending' | 'paused' | 'completed' | 'error';
  error?: string;
  createdAt: string;
  updatedAt: string;
}
export interface WorkflowConfig {
  steps: WorkflowStep[];
  [key: string]: any;
}
export interface StepExecutionResult {
  success: boolean;
  error?: string;
  [key: string]: any;
}
export interface WorkflowExecutionResult {
  success: boolean;
  error?: string;
  completedSteps?: number;
  context?: Record<string, any>;
}
