/**
 * Atlassian AI Assistant - CLI Interface
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, validateConfig, type Config } from '../config/index.js';
import { AtlassianAgentSDK } from '../agent/index.js';
import { startInteractiveChat } from './interactive.js';

// Detect if we're in interactive terminal mode
const isInteractive = process.stdout.isTTY;

// Default model for Claude provider
const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-4-20250514';

// Spinner helper - only loads ora in interactive mode
async function createSpinner(text: string) {
  if (isInteractive) {
    const ora = (await import('ora')).default;
    return ora(text).start();
  }
  // Non-interactive mode: just log to console
  console.log(text);
  return {
    text: '',
    succeed: (msg?: string) => msg && console.log(msg),
    fail: (msg?: string) => msg && console.error(msg),
    stop: () => {},
  };
}

/**
 * Get config with CLI overrides for provider and model
 */
function getConfigWithOverrides(options: { provider?: string; model?: string }): Config {
  // Load base config from environment
  const baseConfig = loadConfig();

  // Apply CLI overrides
  const overrides: Partial<Config> = {};

  if (options.provider) {
    const provider = options.provider.toLowerCase();
    if (!['claude', 'openai', 'oci-openai'].includes(provider)) {
      console.error(chalk.red(`Invalid provider: ${options.provider}`));
      console.error(chalk.gray('Valid providers: claude, openai, oci-openai'));
      process.exit(1);
    }
    overrides.modelProvider = provider as 'claude' | 'openai' | 'oci-openai';
  }

  if (options.model) {
    overrides.modelName = options.model;
  }

  // If using Claude and no custom model specified, use default Claude model
  const finalProvider = overrides.modelProvider || baseConfig.modelProvider;
  if (finalProvider === 'claude' && !overrides.modelName && !baseConfig.modelName) {
    overrides.modelName = DEFAULT_CLAUDE_MODEL;
  }

  // Merge and validate
  const mergedConfig = { ...baseConfig, ...overrides };
  return validateConfig(mergedConfig);
}

const program = new Command();

program
  .name('atlassian-ai')
  .description('AI-powered assistant for Jira and Confluence')
  .version('3.0.0');

// Chat command (main command)
program
  .command('chat')
  .description('Start interactive chat session or send a single message')
  .option('-m, --message <message>', 'Send a single message')
  .option('-h, --history <json>', 'Conversation history as JSON string')
  .option('--provider <name>', 'AI provider (claude, openai, oci-openai). Default: claude')
  .option('--model <name>', 'Model name (e.g., claude-sonnet-4-20250514, gpt-4)')
  .option('--test-only', 'Test connection only (disable MCP and Skills)')
  .option('--mcp <servers>', 'Enable specific MCP servers (comma-separated: atlassian,oci)')
  .option('--no-mcp', 'Disable all MCP servers')
  .option('--list-mcps', 'List available MCP servers and exit')
  .action(async (options) => {
    // Handle --list-mcps
    if (options.listMcps) {
      try {
        const config = getConfigWithOverrides({ provider: options.provider, model: options.model });
        const agent = new AtlassianAgentSDK(config, { enableMCP: false, enableSkills: false });
        const mcpConfigs = agent.getAvailableMCPConfigs();

        console.log(chalk.blue('\n📦 Available MCP Servers:\n'));
        if (mcpConfigs.length === 0) {
          console.log(chalk.yellow('  No MCP servers configured. Check your .env file.'));
        } else {
          for (const mcp of mcpConfigs) {
            const status = mcp.enabled ? chalk.green('enabled') : chalk.gray('disabled');
            console.log(`  ${chalk.cyan(mcp.name)} - ${status}`);
          }
        }
        console.log(chalk.gray('\nUse --mcp <name> to enable specific servers'));
        console.log(chalk.gray('Example: ./chatbot.sh cli --mcp atlassian,oci\n'));
      } catch (error) {
        console.error(chalk.red('Error:'), error instanceof Error ? error.message : error);
        process.exit(1);
      }
      return;
    }

    const spinner = await createSpinner('Initializing agent...');

    try {
      const config = getConfigWithOverrides({ provider: options.provider, model: options.model });

      // Build agent options based on CLI flags
      const agentOptions: Record<string, any> = {};

      if (options.testOnly) {
        agentOptions.enableMCP = false;
        agentOptions.enableSkills = false;
      } else if (options.mcp === false) {
        // --no-mcp flag
        agentOptions.enableMCP = false;
      } else if (typeof options.mcp === 'string') {
        // --mcp <servers> flag
        agentOptions.mcpServers = options.mcp.split(',').map((s: string) => s.trim());
      }

      const agent = new AtlassianAgentSDK(config, agentOptions);

      await agent.initialize();
      spinner.succeed('Agent initialized');

      // Load conversation history if provided
      if (options.history) {
        try {
          const history = JSON.parse(options.history);
          agent.setHistory(history);
        } catch (error) {
          console.error(chalk.red('Failed to parse conversation history:'), error);
          process.exit(1);
        }
      }

      if (options.message) {
        // Single message mode
        console.log(chalk.cyan('\nUser:'), options.message);
        const response = await agent.chat(options.message);
        console.log(chalk.cyan('\nAssistant:'), response);
        console.log();
        await agent.cleanup();
      } else {
        // Interactive mode
        await startInteractiveChat(agent);
      }
    } catch (error) {
      spinner.fail('Failed to initialize agent');
      console.error(chalk.red('\n❌ Error:'), error);
      process.exit(1);
    }
  });

// Jira command (backward compatibility)
program
  .command('jira')
  .description('Get your Jira sprint tasks')
  .option('--all-issues', 'Get all issues (not just sprints)')
  .action(async (options) => {
    const spinner = await createSpinner('Fetching Jira tasks...');

    try {
      const config = getConfigWithOverrides({});
      const agent = new AtlassianAgentSDK(config);

      await agent.initialize();
      spinner.text = 'Getting sprint tasks...';

      const message = options.allIssues
        ? 'Show me all my Jira issues'
        : 'Show me my current sprint tasks';

      const response = await agent.chat(message);
      spinner.succeed('Jira tasks retrieved');

      console.log('\n' + response + '\n');
      await agent.cleanup();
    } catch (error) {
      spinner.fail('Failed to get Jira tasks');
      console.error(chalk.red('\n❌ Error:'), error);
      process.exit(1);
    }
  });

// Confluence command (backward compatibility)
program
  .command('confluence')
  .description('Search Confluence pages')
  .argument('<query>', 'Search query')
  .option('-s, --space <key>', 'Search in specific space')
  .action(async (query, options) => {
    const spinner = await createSpinner('Searching Confluence...');

    try {
      const config = getConfigWithOverrides({});
      const agent = new AtlassianAgentSDK(config);

      await agent.initialize();
      spinner.text = `Searching for "${query}"...`;

      let message = `Search Confluence for: ${query}`;
      if (options.space) {
        message += ` in space ${options.space}`;
      }

      const response = await agent.chat(message);
      spinner.succeed('Search complete');

      console.log('\n' + response + '\n');
      await agent.cleanup();
    } catch (error) {
      spinner.fail('Search failed');
      console.error(chalk.red('\n❌ Error:'), error);
      process.exit(1);
    }
  });

// Default command when no command specified
if (process.argv.length === 2) {
  program.help();
}

program.parse();
