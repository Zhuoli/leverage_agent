import * as readline from 'readline';
import chalk from 'chalk';
import type { AtlassianAgentSDK } from '../agent/index.js';

/**
 * Start an interactive chat session with the agent
 */
export async function startInteractiveChat(agent: AtlassianAgentSDK): Promise<void> {
  console.log(chalk.blue('\n🤖 Atlassian AI Assistant - Interactive Chat'));
  console.log(chalk.gray('Type your message and press Enter. Type "exit" or "quit" to end.\n'));

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.green('You: '),
  });

  rl.prompt();

  rl.on('line', async (input) => {
    const message = input.trim();

    if (!message) {
      rl.prompt();
      return;
    }

    // Handle exit commands
    if (message.toLowerCase() === 'exit' || message.toLowerCase() === 'quit') {
      console.log(chalk.blue('\n👋 Goodbye!\n'));
      rl.close();
      await agent.cleanup();
      process.exit(0);
    }

    // Handle special commands
    if (message.toLowerCase() === 'help') {
      showHelp();
      rl.prompt();
      return;
    }

    if (message.toLowerCase() === 'clear') {
      agent.clearHistory();
      console.log(chalk.gray('Conversation history cleared.\n'));
      rl.prompt();
      return;
    }

    if (message.toLowerCase() === 'info') {
      showInfo(agent);
      rl.prompt();
      return;
    }

    // MCP commands
    if (message.toLowerCase() === 'mcp' || message.toLowerCase() === 'mcp list') {
      showMCPStatus(agent);
      rl.prompt();
      return;
    }

    if (message.toLowerCase().startsWith('mcp enable ')) {
      const serverName = message.slice(11).trim();
      await handleMCPEnable(agent, serverName);
      rl.prompt();
      return;
    }

    if (message.toLowerCase().startsWith('mcp disable ')) {
      const serverName = message.slice(12).trim();
      await handleMCPDisable(agent, serverName);
      rl.prompt();
      return;
    }

    try {
      // Send message to agent
      const response = await agent.chat(message);

      // Display response
      console.log(chalk.cyan('\nAssistant:'), response);
      console.log();
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error);
      console.log();
    }

    rl.prompt();
  });

  rl.on('close', async () => {
    console.log(chalk.blue('\n👋 Goodbye!\n'));
    await agent.cleanup();
    process.exit(0);
  });
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log(chalk.blue('\n📚 Available Commands:'));
  console.log(chalk.gray('  help             - Show this help message'));
  console.log(chalk.gray('  clear            - Clear conversation history'));
  console.log(chalk.gray('  info             - Show agent information'));
  console.log(chalk.gray('  exit / quit      - Exit the chat'));
  console.log();
  console.log(chalk.blue('📦 MCP Commands:'));
  console.log(chalk.gray('  mcp              - Show MCP server status'));
  console.log(chalk.gray('  mcp list         - Show MCP server status'));
  console.log(chalk.gray('  mcp enable <name>  - Start an MCP server'));
  console.log(chalk.gray('  mcp disable <name> - Stop an MCP server'));
  console.log();
  console.log(chalk.blue('💬 Example queries:'));
  console.log(chalk.gray('  "Show me my sprint tasks"'));
  console.log(chalk.gray('  "Search for API documentation in Confluence"'));
  console.log(chalk.gray('  "What are my high priority bugs?"'));
  console.log();
}

/**
 * Show agent information
 */
function showInfo(agent: AtlassianAgentSDK): void {
  const providerInfo = agent.getProviderInfo();
  const skillsInfo = agent.getSkillsInfo();

  console.log(chalk.blue('\n📊 Agent Information:'));
  console.log(chalk.gray(`  Provider: ${providerInfo.name}`));
  if (providerInfo.model) {
    console.log(chalk.gray(`  Model: ${providerInfo.model}`));
  }
  console.log(chalk.gray(`  Skills loaded: ${skillsInfo.count}`));
  if (skillsInfo.count > 0) {
    console.log(chalk.gray(`  Skills: ${skillsInfo.names.join(', ')}`));
  }
  console.log();
}

/**
 * Show MCP server status
 */
function showMCPStatus(agent: AtlassianAgentSDK): void {
  const mcpInfo = agent.getMCPInfo();

  console.log(chalk.blue('\n📦 MCP Server Status:\n'));

  if (mcpInfo.length === 0) {
    console.log(chalk.yellow('  No MCP servers available. Check your .env configuration.'));
    console.log();
    return;
  }

  for (const mcp of mcpInfo) {
    const statusIcon = mcp.running ? chalk.green('●') : chalk.gray('○');
    const statusText = mcp.running
      ? chalk.green(`running (${mcp.toolCount} tools)`)
      : chalk.gray('stopped');

    console.log(`  ${statusIcon} ${chalk.cyan(mcp.name)} - ${statusText}`);
    console.log(chalk.gray(`      ${mcp.description}`));
  }

  console.log();
  console.log(chalk.gray('  Use "mcp enable <name>" or "mcp disable <name>" to manage servers'));
  console.log();
}

/**
 * Handle MCP enable command
 */
async function handleMCPEnable(agent: AtlassianAgentSDK, serverName: string): Promise<void> {
  if (!serverName) {
    console.log(chalk.yellow('\n  Usage: mcp enable <server-name>\n'));
    return;
  }

  console.log(chalk.blue(`\n  Starting MCP server '${serverName}'...`));
  const result = await agent.enableMCP(serverName);

  if (result.success) {
    console.log(chalk.green(`  ✓ ${result.message}`));
  } else {
    console.log(chalk.red(`  ✗ ${result.message}`));
  }
  console.log();
}

/**
 * Handle MCP disable command
 */
async function handleMCPDisable(agent: AtlassianAgentSDK, serverName: string): Promise<void> {
  if (!serverName) {
    console.log(chalk.yellow('\n  Usage: mcp disable <server-name>\n'));
    return;
  }

  console.log(chalk.blue(`\n  Stopping MCP server '${serverName}'...`));
  const result = await agent.disableMCP(serverName);

  if (result.success) {
    console.log(chalk.green(`  ✓ ${result.message}`));
  } else {
    console.log(chalk.red(`  ✗ ${result.message}`));
  }
  console.log();
}
