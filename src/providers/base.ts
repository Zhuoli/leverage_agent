import type { Config } from '../config/index.js';
import type { Message, ChatOptions } from './types.js';

/**
 * Abstract base class for AI providers
 * Defines the interface that all providers (Claude, OpenAI) must implement
 */
export abstract class BaseProvider {
  protected systemPrompt: string;

  constructor(protected config: Config, systemPrompt?: string) {
    this.systemPrompt = systemPrompt || this.getDefaultSystemPrompt();
  }

  /**
   * Send a message to the AI provider and get a response
   */
  abstract chat(messages: Message[], options?: ChatOptions): Promise<string>;

  /**
   * Get the name of this provider
   */
  abstract getProviderName(): string;

  /**
   * Get the default system prompt
   * Can be overridden by subclasses or passed in constructor
   * Note: This is a fallback. The actual system prompt should be
   * dynamically generated based on enabled MCPs and available tools.
   */
  protected getDefaultSystemPrompt(): string {
    return `You are an AI assistant that helps users with various tasks.

Your capabilities depend on which tools and MCP servers are configured.
You may have access to:
- Code repository analysis tools
- Jira workflow management (if Atlassian MCP enabled)
- Confluence documentation (if Atlassian MCP enabled)
- Oracle Cloud Infrastructure management (if OCI MCP enabled)
- Skills containing best practices and templates

**Guidelines:**

1. Be helpful and provide clear, actionable responses
2. Reference Skills for best practices and templates
3. Suggest next actions based on context
4. Format output clearly

Note: The specific tools available to you will be detailed in your full system prompt.`;
  }

  /**
   * Update the system prompt (useful for adding Skills context)
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
  }

  /**
   * Get the current system prompt
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }
}
