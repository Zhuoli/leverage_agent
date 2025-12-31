import { config as loadEnv } from 'dotenv';
import { ConfigSchema, type Config, validateConfig } from './schema.js';

// Load .env file
loadEnv();

/**
 * Load configuration from environment variables
 */
export function loadConfig(): Config {
  const rawConfig = {
    // Model Provider
    modelProvider: (process.env.MODEL_PROVIDER || 'claude') as
      | 'claude'
      | 'openai'
      | 'oci-openai',
    modelName: process.env.MODEL_NAME || undefined,

    // API Keys
    anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',

    // OCI OpenAI
    ociCompartmentId: process.env.OCI_COMPARTMENT_ID || '',
    ociEndpoint: process.env.OCI_ENDPOINT || '',
    ociConfigPath: process.env.OCI_CONFIG_PATH || undefined,
    ociProfile: process.env.OCI_PROFILE || undefined,

    // Jira
    jiraUrl: process.env.JIRA_URL || '',
    jiraUsername: process.env.JIRA_USERNAME || '',
    jiraApiToken: process.env.JIRA_API_TOKEN || '',

    // Confluence
    confluenceUrl: process.env.CONFLUENCE_URL || '',
    confluenceUsername: process.env.CONFLUENCE_USERNAME || '',
    confluenceApiToken: process.env.CONFLUENCE_API_TOKEN || '',
    confluenceSpaceKey: process.env.CONFLUENCE_SPACE_KEY || '',

    // User
    userDisplayName: process.env.USER_DISPLAY_NAME || '',
    userEmail: process.env.USER_EMAIL || '',
  };

  return validateConfig(rawConfig);
}

/**
 * Get configuration with validation
 * Main entry point for configuration access
 */
export function getConfig(): Config {
  try {
    return loadConfig();
  } catch (error) {
    if (error instanceof Error) {
      console.error('❌ Configuration Error:', error.message);
      console.error('\nPlease check your .env file and ensure all required fields are set.');
      console.error('See .env.example for reference.\n');
    }
    process.exit(1);
  }
}

// Export types
export type { Config } from './schema.js';
export { ConfigSchema, validateConfig } from './schema.js';
