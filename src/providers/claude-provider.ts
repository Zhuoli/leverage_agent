import Anthropic from '@anthropic-ai/sdk';
import { BaseProvider } from './base.js';
import type { Config } from '../config/index.js';
import type { Message, ChatOptions } from './types.js';

/**
 * Claude AI provider using Anthropic SDK
 * Implements direct integration without claude-agent-sdk
 */
export class ClaudeProvider extends BaseProvider {
  private client: Anthropic;
  private model: string;
  private tools: Anthropic.Tool[] = [];
  private toolHandler?: (toolName: string, toolInput: any) => Promise<any>;

  constructor(config: Config, systemPrompt?: string) {
    super(config, systemPrompt);

    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API key is required for Claude provider');
    }

    this.client = new Anthropic({
      apiKey: config.anthropicApiKey,
    });

    // Use custom model name if provided, otherwise use default
    this.model = config.modelName || 'claude-3-5-sonnet-20241022';

    console.error(`Claude provider initialized with model: ${this.model}`);
  }

  /**
   * Register tools that the AI can use
   */
  registerTools(tools: Anthropic.Tool[], handler: (toolName: string, toolInput: any) => Promise<any>): void {
    this.tools = tools;
    this.toolHandler = handler;
    console.error(`Registered ${tools.length} tools`);
  }

  /**
   * Send a message to Claude and get a response (with tool calling support)
   */
  async chat(messages: Message[], options?: ChatOptions): Promise<string> {
    try {
      const conversationMessages: Anthropic.MessageParam[] = messages.map((msg) => ({
        role: msg.role === 'system' ? 'user' : msg.role,
        content: msg.content,
      }));

      // Agentic loop: keep calling until we get a text response (no more tool calls)
      let continueLoop = true;
      const maxIterations = options?.maxIterations || 25; // Increased default from 10 to 25
      let iteration = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 3; // Stop if too many tools fail in a row

      while (continueLoop && iteration < maxIterations) {
        iteration++;

        // Stop if too many consecutive errors
        if (consecutiveErrors >= maxConsecutiveErrors) {
          throw new Error(`Stopped after ${consecutiveErrors} consecutive tool errors`);
        }

        // If approaching max iterations, warn the agent to synthesize
        if (iteration === maxIterations - 2 && this.tools.length > 0) {
          conversationMessages.push({
            role: 'user',
            content: `You are approaching the tool call limit (${iteration}/${maxIterations}). Please synthesize your findings and provide a response based on what you have learned so far. You have 1-2 more tool calls available if absolutely necessary.`,
          });
        }

        const requestParams: Anthropic.MessageCreateParams = {
          model: this.model,
          max_tokens: options?.maxTokens || 32768, // Very high limit for comprehensive documents (Claude supports up to 64k)
          temperature: options?.temperature,
          system: this.systemPrompt,
          messages: conversationMessages,
        };

        // Add tools if registered
        if (this.tools.length > 0) {
          requestParams.tools = this.tools;
        }

        const response = await this.client.messages.create(requestParams);

        // Check if there are tool calls
        const toolUseBlocks = response.content.filter(
          (block) => block.type === 'tool_use'
        );

        if (toolUseBlocks.length > 0 && this.toolHandler) {
          // Process tool calls
          console.error(`Processing ${toolUseBlocks.length} tool calls...`);

          // Add assistant's response to conversation
          conversationMessages.push({
            role: 'assistant',
            content: response.content,
          });

          // Execute tools and collect results
          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          let allToolsFailed = true;

          for (const toolBlock of toolUseBlocks) {
            if (toolBlock.type === 'tool_use') {
              console.error(`Calling tool: ${toolBlock.name}`);

              try {
                const result = await this.toolHandler(toolBlock.name, toolBlock.input);
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolBlock.id,
                  content: typeof result === 'string' ? result : JSON.stringify(result),
                });
                allToolsFailed = false; // At least one tool succeeded
              } catch (error) {
                console.error(`Tool ${toolBlock.name} failed:`, error);
                toolResults.push({
                  type: 'tool_result',
                  tool_use_id: toolBlock.id,
                  content: `Error: ${error}`,
                  is_error: true,
                });
              }
            }
          }

          // Update consecutive errors counter
          if (allToolsFailed) {
            consecutiveErrors++;
          } else {
            consecutiveErrors = 0; // Reset on success
          }

          // Add tool results to conversation
          conversationMessages.push({
            role: 'user',
            content: toolResults,
          });

          // Continue loop to get next response
          continue;
        }

        // No tool calls, extract text response and end loop
        const textContent = response.content
          .filter((block) => block.type === 'text')
          .map((block) => ('text' in block ? block.text : ''))
          .join('\n');

        return textContent;
      }

      // If we hit max iterations, provide helpful error message
      throw new Error(
        `Max tool calling iterations reached (${maxIterations}). The agent made ${iteration} tool calls but did not produce a final response. ` +
        `This usually means the task is too complex or the agent is exploring too broadly. ` +
        `Try: (1) Breaking down the query into smaller parts, (2) Being more specific, or (3) Increasing maxIterations in ChatOptions.`
      );
    } catch (error) {
      console.error('Error calling Claude API:', error);
      throw new Error(`Claude API error: ${error}`);
    }
  }

  /**
   * Get provider name
   */
  getProviderName(): string {
    return 'claude';
  }

  /**
   * Get the model name being used
   */
  getModel(): string {
    return this.model;
  }
}
