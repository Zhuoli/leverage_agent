import type { Config } from '../config/index.js';
import { BaseProvider } from './base.js';
import { ClaudeProvider } from './claude-provider.js';
import { OpenAIProvider } from './openai-provider.js';
import { OCIOpenAIProvider } from './oci-openai-provider.js';

/**
 * Factory function to create the appropriate AI provider
 * based on configuration
 */
export function createProvider(config: Config, systemPrompt?: string): BaseProvider {
  const provider = config.modelProvider.toLowerCase();

  switch (provider) {
    case 'claude':
      return new ClaudeProvider(config, systemPrompt);

    case 'openai':
      return new OpenAIProvider(config, systemPrompt);

    case 'oci-openai':
      return new OCIOpenAIProvider(config, systemPrompt);

    default:
      throw new Error(
        `Unknown provider: ${provider}. Supported providers: claude, openai, oci-openai`
      );
  }
}
