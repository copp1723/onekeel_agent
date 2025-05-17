import { WorkflowStep } from '....js';
import { emailIngestAndRunFlow } from '../agents/emailIngestAndRunFlow.js';
import { parseByExtension } from './attachmentParsers.js';
import { generateInsights } from './insightGenerator.js';
import { processCrmData } from './dataProcessors.js';
import { executeCustomStep } from './customStepExecutor.js';
import { makeApiRequest } from './apiHandler.js';
import logger from '../utils/logger.js';
import { formatError } from '../utils/logger.js';
import { EnvVars } from '../types.js';
export interface StepResult {
  success: boolean;
  output: unknown;
  error?: string;
}
export class StepHandlerError extends Error {
  readonly step: WorkflowStep;
  readonly originalError: Error;
  constructor(message: string, step: WorkflowStep, originalError: Error) {
    super(message);
    this.name = 'StepHandlerError';
    this.step = step;
    this.originalError = originalError;
  }
}
export async function executeStep(
  step: WorkflowStep,
  context: Record<string, unknown>,
  envVars: EnvVars
): Promise<StepResult> {
  try {
    switch (step.type) {
      case 'emailIngestion':
        return await handleEmailIngestion(step, context, envVars);
      case 'browserAction':
        return await handleBrowserAction(step, context, envVars);
      case 'insightGeneration':
        return await handleInsightGeneration(step, context, envVars);
      case 'dataProcessing':
        return await handleDataProcessing(step, context, envVars);
      case 'api':
        return await handleApiStep(step, context, envVars);
      case 'custom':
        return await handleCustomStep(step, context, envVars);
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  } catch (error) {
    // Wrap the error with step context
    const wrappedError = new StepHandlerError(
      `Step ${step.name} (${step.type}) failed: ${error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error)) : String(error)) : String(error)) : String(error)}`,
      step,
      error instanceof Error ? error : new Error(String(error))
    );
    logger.error({
      event: 'step_execution_error',
      stepType: step.type,
      stepName: step.name,
      ...formatError(error),
    });
    return {
      success: false,
      output: null,
      error: wrappedError.message,
    };
  }
}
async function handleEmailIngestion(
  step: WorkflowStep,
  context: Record<string, unknown>,
  envVars: EnvVars
): Promise<StepResult> {
  try {
    const result = await emailIngestAndRunFlow({
      ...step.config,
      context,
      envVars,
    });
    return {
      success: true,
      output: result,
    };
  } catch (error) {
    logger.error({
      event: 'step_error',
      stepType: 'emailIngestion',
      stepName: step.name,
      ...formatError(error),
    });
    return {
      success: false,
      output: null,
      error:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    };
  }
}
async function handleBrowserAction(
  step: WorkflowStep,
  context: Record<string, unknown>,
  envVars: EnvVars
): Promise<StepResult> {
  try {
    const result = await parseByExtension(step.config.filePath, {
      ...step.config,
      context,
      envVars,
    });
    return {
      success: true,
      output: result,
    };
  } catch (error) {
    logger.error({
      event: 'step_error',
      stepType: 'browserAction',
      stepName: step.name,
      ...formatError(error),
    });
    return {
      success: false,
      output: null,
      error:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    };
  }
}
async function handleInsightGeneration(
  step: WorkflowStep,
  context: Record<string, unknown>,
  envVars: EnvVars
): Promise<StepResult> {
  try {
    const insights = await generateInsights(step.config.data, {
      ...step.config,
      context,
      envVars,
    });
    return {
      success: true,
      output: insights,
    };
  } catch (error) {
    logger.error({
      event: 'step_error',
      stepType: 'insightGeneration',
      stepName: step.name,
      ...formatError(error),
    });
    return {
      success: false,
      output: null,
      error:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    };
  }
}
async function handleDataProcessing(
  step: WorkflowStep,
  context: Record<string, unknown>,
  envVars: EnvVars
): Promise<StepResult> {
  try {
    const result = await processCrmData(step.config.data, {
      ...step.config,
      context,
      envVars,
    });
    return {
      success: true,
      output: result,
    };
  } catch (error) {
    logger.error({
      event: 'step_error',
      stepType: 'dataProcessing',
      stepName: step.name,
      ...formatError(error),
    });
    return {
      success: false,
      output: null,
      error:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    };
  }
}
async function handleApiStep(
  step: WorkflowStep,
  context: Record<string, unknown>,
  envVars: EnvVars
): Promise<StepResult> {
  try {
    const result = await makeApiRequest({
      ...step.config,
      context,
      envVars,
    });
    return {
      success: true,
      output: result,
    };
  } catch (error) {
    logger.error({
      event: 'step_error',
      stepType: 'api',
      stepName: step.name,
      ...formatError(error),
    });
    return {
      success: false,
      output: null,
      error:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    };
  }
}
async function handleCustomStep(
  step: WorkflowStep,
  context: Record<string, unknown>,
  envVars: EnvVars
): Promise<StepResult> {
  try {
    const result = await executeCustomStep({
      ...step.config,
      context,
      envVars,
    });
    return {
      success: true,
      output: result,
    };
  } catch (error) {
    logger.error({
      event: 'step_error',
      stepType: 'custom',
      stepName: step.name,
      ...formatError(error),
    });
    return {
      success: false,
      output: null,
      error:
        error instanceof Error
          ? error instanceof Error
            ? error instanceof Error
              ? (error instanceof Error ? (error instanceof Error ? error.message : String(error)) : String(error))
              : String(error)
            : String(error)
          : String(error),
    };
  }
}
