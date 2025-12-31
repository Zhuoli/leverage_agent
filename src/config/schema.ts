import { z } from 'zod';

/**
 * Configuration schema using Zod validation
 */
export const ConfigSchema = z
  .object({
    // Model Provider Configuration
    modelProvider: z
      .enum(['claude', 'openai', 'oci-openai'])
      .default('claude')
      .describe('AI model provider (claude, openai, or oci-openai)'),

    modelName: z
      .string()
      .optional()
      .describe('Optional custom model name'),

    // Anthropic Configuration
    anthropicApiKey: z
      .string()
      .default('')
      .describe('Anthropic API key for Claude'),

    // OpenAI Configuration
    openaiApiKey: z
      .string()
      .default('')
      .describe('OpenAI API key'),

    // OCI OpenAI Configuration
    ociCompartmentId: z
      .string()
      .default('')
      .describe('OCI Compartment ID for OCI OpenAI'),

    ociEndpoint: z
      .string()
      .default('')
      .describe('OCI Generative AI endpoint URL'),

    ociConfigPath: z
      .string()
      .optional()
      .describe('Path to OCI config file (defaults to ~/.oci/config)'),

    ociProfile: z
      .string()
      .optional()
      .describe('OCI profile name (defaults to DEFAULT)'),

    // Jira Configuration
    jiraUrl: z
      .string()
      .url()
      .describe('Jira instance URL (e.g., https://jira.company.com)'),

    jiraUsername: z
      .string()
      .min(1)
      .describe('Jira username (usually email)'),

    jiraApiToken: z
      .string()
      .min(1)
      .describe('Jira API token (Personal Access Token)'),

    // Confluence Configuration
    confluenceUrl: z
      .string()
      .url()
      .describe('Confluence instance URL (e.g., https://confluence.company.com)'),

    confluenceUsername: z
      .string()
      .min(1)
      .describe('Confluence username (usually email)'),

    confluenceApiToken: z
      .string()
      .min(1)
      .describe('Confluence API token (Personal Access Token)'),

    confluenceSpaceKey: z
      .string()
      .default('')
      .describe('Default Confluence space key'),

    // User Configuration
    userDisplayName: z
      .string()
      .default('')
      .describe('User display name'),

    userEmail: z
      .string()
      .email()
      .optional()
      .or(z.literal(''))
      .describe('User email address'),
  })
  .refine(
    (data) => {
      // Validate provider-specific API keys
      if (data.modelProvider === 'claude') {
        return data.anthropicApiKey.length > 0;
      } else if (data.modelProvider === 'openai') {
        return data.openaiApiKey.length > 0;
      } else if (data.modelProvider === 'oci-openai') {
        return data.ociCompartmentId.length > 0 && data.ociEndpoint.length > 0;
      }
      return false;
    },
    {
      message: 'API key or credentials required for selected provider',
      path: ['anthropicApiKey', 'openaiApiKey', 'ociCompartmentId', 'ociEndpoint'],
    }
  );

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Validates configuration and provides detailed error messages
 */
export function validateConfig(config: Partial<Config>): Config {
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
      throw new Error(`Configuration errors:\n  - ${errors.join('\n  - ')}`);
    }
    throw error;
  }
}
