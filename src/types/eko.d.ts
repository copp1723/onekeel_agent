/**
 * Type definitions for the Eko AI API
 * These types are used to provide proper TypeScript support for the Eko API
 */

// Override the existing module
declare module '@eko-ai/eko' {
  /**
   * Message object for the Eko API
   */
  export interface EkoMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  /**
   * Parameters for the complete method
   */
  export interface CompleteParams {
    messages: EkoMessage[];
    temperature?: number;
    model?: string;
    maxTokens?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    stop?: string[];
  }

  /**
   * Parameters for the generate method
   */
  export interface EkoInvokeParam {
    temperature?: number;
    model?: string;
  }

  /**
   * Workflow type for the Eko API
   */
  export interface Workflow {
    id: string;
    steps: any[];
    [key: string]: any;
  }

  /**
   * Main Eko API client class
   */
  export class Eko {
    constructor(apiKey?: string);

    /**
     * Complete method for generating text completions
     * @param params Parameters for the completion
     * @returns A promise that resolves to the generated text
     */
    complete(params: CompleteParams): Promise<string>;

    /**
     * Generate method for creating workflows
     * @param prompt The prompt to generate a workflow from
     * @param tabs Optional browser tabs
     * @param param Optional parameters
     * @returns A promise that resolves to a workflow
     */
    generate(prompt: string, tabs?: any[], param?: EkoInvokeParam): Promise<Workflow>;
  }
}
