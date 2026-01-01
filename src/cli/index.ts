/**
 * Atlassian AI Assistant - CLI Interface
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { getConfig } from '../config/index.js';
import { AtlassianAgentSDK } from '../agent/index.js';
import { startInteractiveChat } from './interactive.js';

// Detect if we're in interactive terminal mode
const isInteractive = process.stdout.isTTY;

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
  .option('--test-only', 'Test connection only (disable MCP and Skills)')
  .action(async (options) => {
    const spinner = await createSpinner('Initializing agent...');

    try {
      const config = getConfig();

      // Agent options - disable MCP and Skills for test-only mode
      const agentOptions = options.testOnly ? {
        enableMCP: false,
        enableSkills: false,
      } : {};

      const agent = new AtlassianAgentSDK(config, agentOptions);

      await agent.initialize();
      spinner.succeed('Agent initialized');

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
      const config = getConfig();
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
      const config = getConfig();
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
