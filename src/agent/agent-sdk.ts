import type { ChildProcess } from 'child_process';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Config } from '../config/index.js';
import { SkillsLoader } from '../skills/loader.js';
import { createProvider, type BaseProvider } from '../providers/index.js';
import type { Message } from '../providers/types.js';
import type { ConversationMessage, AgentOptions, MCPServerInfo } from './types.js';
import { FilesystemTools } from './filesystem-tools.js';
import { SmartExploration } from './smart-exploration.js';
import { MCPClientManager, type MCPServerConfig } from './mcp-client.js';
import { Logger, LogCategory } from '../utils/logger.js';
import type { Tool } from '@anthropic-ai/sdk/resources/messages.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Atlassian Agent SDK
 * Main orchestrator that integrates MCP server, Skills, and AI providers
 */
export class AtlassianAgentSDK {
  private skillsLoader: SkillsLoader;
  private provider: BaseProvider;
  private filesystemTools?: FilesystemTools;
  private smartExploration?: SmartExploration;
  private mcpProcess?: ChildProcess;
  private mcpClientManager: MCPClientManager;
  private conversationHistory: ConversationMessage[] = [];
  private maxHistory: number;
  private initialized: boolean = false;

  constructor(private config: Config, private options: AgentOptions = {}) {
    this.maxHistory = options.maxHistory || 20;

    // Determine skills directory (relative to project root)
    const projectRoot = resolve(__dirname, '..', '..');
    const skillsDir = join(projectRoot, '.claude', 'skills');

    this.skillsLoader = new SkillsLoader(skillsDir);
    this.mcpClientManager = new MCPClientManager();

    // Initialize filesystem tools if code repo paths are configured
    const codeRepoPaths = this.getCodeRepoPaths();
    if (codeRepoPaths.length > 0) {
      this.filesystemTools = new FilesystemTools(codeRepoPaths);
      this.smartExploration = new SmartExploration(this.filesystemTools);
    }

    // Provider will be initialized in initialize() after skills are loaded
    this.provider = null as any; // Temporary - will be set in initialize()
  }

  /**
   * Get code repository paths from environment
   */
  private getCodeRepoPaths(): string[] {
    const pathsEnv = process.env.CODE_REPO_PATHS || '';
    return pathsEnv
      .split(':')
      .filter(path => path.trim().length > 0)
      .map(path => path.trim());
  }

  /**
   * Initialize the agent (load skills, start MCP, create provider)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    Logger.initStart();

    try {
      // Load Skills
      if (this.options.enableSkills !== false) {
        Logger.skillsLoading();
        await this.skillsLoader.load();

        const skillCount = this.skillsLoader.getCount();
        const skillNames = this.skillsLoader.getSkillNames();
        Logger.skillsLoaded(skillCount, skillNames);
      }

      // Start MCP servers based on config
      if (this.options.enableMCP !== false) {
        await this.startMCPServers();
      }

      // Build system prompt with Skills context
      Logger.progress(LogCategory.INIT, 'Building system prompt...');
      const systemPrompt = this.buildSystemPrompt();

      // Initialize AI provider
      Logger.progress(LogCategory.INIT, `Initializing ${this.config.modelProvider} provider...`);
      this.provider = createProvider(this.config, systemPrompt);

      // Register tools if available (Claude provider only for now)
      if ('registerTools' in this.provider) {
        const allTools: Tool[] = [];

        // Add filesystem tools if available
        if (this.filesystemTools && this.filesystemTools.isAvailable()) {
          const fsTools = this.createFilesystemTools();
          allTools.push(...fsTools);
          Logger.success(LogCategory.TOOLS, `Added ${fsTools.length} filesystem tools`);
        }

        // Add MCP tools from all connected servers
        const mcpTools = this.getMCPTools();
        if (mcpTools.length > 0) {
          allTools.push(...mcpTools);
          Logger.success(LogCategory.TOOLS, `Added ${mcpTools.length} MCP tools from ${this.mcpClientManager.getServerCount()} servers`);
        }

        // Register all tools with a unified handler
        if (allTools.length > 0) {
          const handler = this.createToolHandler();
          (this.provider as any).registerTools(allTools, handler);
          Logger.toolsRegistered(allTools.length);
        }
      }

      this.initialized = true;
      Logger.initComplete();
    } catch (error) {
      Logger.error(LogCategory.INIT, `Failed to initialize: ${error}`);
      throw error;
    }
  }

  /**
   * Create filesystem tool definitions for Claude
   */
  private createFilesystemTools(): Tool[] {
    return [
      {
        name: 'read_file',
        description: 'Read the contents of a file from the code repository. Only files within configured code repositories can be accessed.',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The absolute path to the file to read',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'list_directory',
        description: 'List the contents of a directory in the code repository',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The absolute path to the directory to list',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'search_files',
        description: 'Search for files matching a glob pattern in the code repositories',
        input_schema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Glob pattern to match files (e.g., "**/*.ts", "src/**/*.js")',
            },
            base_dir: {
              type: 'string',
              description: 'Optional base directory to search in (must be within allowed repos)',
            },
          },
          required: ['pattern'],
        },
      },
      {
        name: 'get_file_info',
        description: 'Get metadata about a file (size, modification time, etc.)',
        input_schema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'The absolute path to the file',
            },
          },
          required: ['path'],
        },
      },
      {
        name: 'list_code_repositories',
        description: 'List all configured code repositories that are accessible',
        input_schema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_project_overview',
        description: 'Get a comprehensive overview of a codebase by reading anchor files (README, Makefile, package.json, etc.). ALWAYS call this FIRST when exploring a new codebase. This provides essential context about project structure, entry points, and architecture.',
        input_schema: {
          type: 'object',
          properties: {
            repo_path: {
              type: 'string',
              description: 'Path to the repository to analyze',
            },
            max_files: {
              type: 'number',
              description: 'Maximum number of anchor files to read (default: 15)',
            },
          },
          required: ['repo_path'],
        },
      },
      {
        name: 'find_relevant_files',
        description: 'Find files relevant to a specific query using keyword matching and intelligent scoring. Use this to narrow down which files to read based on the user\'s question.',
        input_schema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The query or keywords to search for',
            },
            repo_path: {
              type: 'string',
              description: 'Path to the repository',
            },
            max_results: {
              type: 'number',
              description: 'Maximum number of results to return (default: 10)',
            },
          },
          required: ['query', 'repo_path'],
        },
      },
    ];
  }

  /**
   * Create tool handler function
   */
  private createToolHandler(): (toolName: string, toolInput: any) => Promise<any> {
    return async (toolName: string, toolInput: any) => {
      const startTime = Date.now();

      // Handle filesystem tools
      if (this.filesystemTools) {
        switch (toolName) {
          case 'read_file':
            Logger.toolCalling(toolName, { path: toolInput.path });
            const fileContent = await this.filesystemTools.readFile(toolInput.path);
            Logger.toolCallSuccess(toolName, Date.now() - startTime);
            return fileContent;

          case 'list_directory':
            Logger.toolCalling(toolName, { path: toolInput.path });
            const dirListing = await this.filesystemTools.listDirectory(toolInput.path);
            Logger.toolCallSuccess(toolName, Date.now() - startTime);
            return dirListing;

          case 'search_files':
            Logger.toolCalling(toolName, { pattern: toolInput.pattern });
            const searchResults = await this.filesystemTools.searchFiles(
              toolInput.pattern,
              toolInput.base_dir
            );
            Logger.toolCallSuccess(toolName, Date.now() - startTime);
            return searchResults;

          case 'get_file_info':
            Logger.toolCalling(toolName, { path: toolInput.path });
            const fileInfo = await this.filesystemTools.getFileInfo(toolInput.path);
            Logger.toolCallSuccess(toolName, Date.now() - startTime);
            return fileInfo;

          case 'list_code_repositories':
            Logger.toolCalling(toolName);
            const repos = await this.filesystemTools.getAllowedDirectoriesSummary();
            Logger.toolCallSuccess(toolName, Date.now() - startTime);
            return repos;

          case 'get_project_overview':
            if (!this.smartExploration) {
              throw new Error('Smart exploration not available');
            }
            Logger.toolCalling(toolName, { repo: toolInput.repo_path });
            const context = await this.smartExploration.getProjectOverview(
              toolInput.repo_path,
              { maxAnchorFiles: toolInput.max_files }
            );
            Logger.toolCallSuccess(toolName, Date.now() - startTime);
            return JSON.stringify(context, null, 2);

          case 'find_relevant_files':
            if (!this.smartExploration) {
              throw new Error('Smart exploration not available');
            }
            Logger.toolCalling(toolName, { query: toolInput.query });
            // First get project overview as context
            const overviewContext = await this.smartExploration.getProjectOverview(toolInput.repo_path);
            const relevantFiles = await this.smartExploration.findRelevantFiles(
              toolInput.query,
              toolInput.repo_path,
              overviewContext,
              toolInput.max_results || 10
            );
            Logger.toolCallSuccess(toolName, Date.now() - startTime);
            return JSON.stringify(relevantFiles, null, 2);
        }
      }

      // If not a filesystem tool, try MCP tools
      try {
        return await this.mcpClientManager.callTool(toolName, toolInput);
      } catch (error) {
        Logger.toolCallFailed(toolName, String(error));
        throw new Error(`Unknown tool or tool error: ${toolName} - ${error}`);
      }
    };
  }

  /**
   * Get all available MCP server configurations
   */
  getAvailableMCPConfigs(): MCPServerConfig[] {
    const projectRoot = resolve(__dirname, '..', '..');
    const configs: MCPServerConfig[] = [];

    // Atlassian MCP server config
    if (this.config.jiraUrl && this.config.confluenceUrl) {
      configs.push({
        name: 'atlassian',
        enabled: this.config.atlassianMcpEnabled ?? false,
        serverPath: join(projectRoot, 'dist', 'mcp', 'atlassian-server.js'),
        env: {
          ATLASSIAN_MCP_ENABLED: 'true',
          JIRA_URL: this.config.jiraUrl,
          JIRA_USERNAME: this.config.jiraUsername || '',
          JIRA_API_TOKEN: this.config.jiraApiToken || '',
          CONFLUENCE_URL: this.config.confluenceUrl,
          CONFLUENCE_USERNAME: this.config.confluenceUsername || '',
          CONFLUENCE_API_TOKEN: this.config.confluenceApiToken || '',
          CONFLUENCE_SPACE_KEY: this.config.confluenceSpaceKey || '',
        },
      });
    }

    // OCI MCP server config
    if (this.config.ociMcpRegion) {
      configs.push({
        name: 'oci',
        enabled: this.config.ociMcpEnabled ?? false,
        serverPath: join(projectRoot, 'dist', 'mcp', 'oci-server.js'),
        env: {
          OCI_MCP_ENABLED: 'true',
          OCI_MCP_REGION: this.config.ociMcpRegion,
          OCI_MCP_COMPARTMENT_ID: this.config.ociMcpCompartmentId || '',
          OCI_MCP_TENANCY_ID: this.config.ociMcpTenancyId || '',
          OCI_MCP_CONFIG_PATH: this.config.ociMcpConfigPath || '',
          OCI_MCP_PROFILE: this.config.ociMcpProfile || 'DEFAULT',
        },
      });
    }

    return configs;
  }

  /**
   * Start individual MCP servers based on config flags
   */
  private async startMCPServers(): Promise<void> {
    Logger.mcpStarting();

    const allConfigs = this.getAvailableMCPConfigs();
    const servers: MCPServerConfig[] = [];

    // Filter servers based on options.mcpServers if specified
    const requestedServers = this.options.mcpServers;

    for (const config of allConfigs) {
      // If mcpServers option is specified, only start those servers
      if (requestedServers && requestedServers.length > 0) {
        if (requestedServers.includes(config.name)) {
          servers.push({ ...config, enabled: true });
        }
      } else if (config.enabled) {
        // Otherwise, use the default enabled status from environment
        servers.push(config);
      }
    }

    // Start all configured servers
    for (const serverConfig of servers) {
      try {
        Logger.mcpServerStarting(serverConfig.name);
        await this.mcpClientManager.startServer(serverConfig);
      } catch (error) {
        Logger.mcpServerFailed(serverConfig.name, String(error));
        // Continue with other servers even if one fails
      }
    }

    if (servers.length === 0) {
      Logger.info(LogCategory.MCP, 'No MCP servers configured');
    } else {
      const totalTools = this.mcpClientManager.getAllTools().length;
      Logger.mcpServersReady(this.mcpClientManager.getServerCount(), totalTools);
    }
  }

  /**
   * Convert MCP tools to Claude Tool format
   */
  private getMCPTools(): Tool[] {
    const mcpTools = this.mcpClientManager.getAllTools();
    return mcpTools.map((mcpTool) => ({
      name: mcpTool.name,
      description: mcpTool.description,
      input_schema: mcpTool.inputSchema,
    }));
  }

  /**
   * Build system prompt dynamically based on enabled MCPs and Skills
   */
  private buildSystemPrompt(): string {
    // Base introduction
    let basePrompt = `You are an AI assistant that helps users with various tasks.`;

    const capabilities: string[] = [];

    // Add Atlassian (Jira/Confluence) capabilities if MCP is enabled
    if (this.config.atlassianMcpEnabled && this.config.jiraUrl && this.config.confluenceUrl) {
      capabilities.push(`\n\n## 🎫 Jira Capabilities

You have access to Jira MCP tools for:
- **Search tickets**: Use JQL queries to find tickets
- **Get sprint tasks**: View current sprint work
- **Create tickets**: Create new Jira issues
- **Update tickets**: Modify existing tickets (status, assignee, etc.)
- **Add comments**: Comment on tickets
- **Analyze priorities**: Identify blockers and high-priority items

**Available Jira Tools:**
- \`search_jira_tickets\` - Search using JQL
- \`get_sprint_tasks\` - Get current sprint
- \`create_jira_ticket\` - Create new ticket
- \`update_jira_ticket\` - Update ticket
- \`add_jira_comment\` - Add comment

**Jira Best Practices:**
- Always format ticket keys as links (e.g., [PROJ-123])
- Highlight priorities (High, Critical) and blockers
- Suggest next actions based on ticket status`);

      capabilities.push(`\n\n## 📚 Confluence Capabilities

You have access to Confluence MCP tools for:
- **Search pages**: Find documentation across spaces
- **Read pages**: Get page content in HTML/storage format
- **Create pages**: Create new documentation pages
- **Update pages**: Modify existing pages
- **Get recent updates**: Track recent changes
- **Suggest structure**: Recommend documentation organization

**Available Confluence Tools:**
- \`search_confluence\` - Search pages by keywords
- \`get_confluence_page\` - Read page content
- \`create_confluence_page\` - Create new page
- \`update_confluence_page\` - Update existing page

**Confluence Best Practices:**
- Format output with proper HTML structure
- Link related pages and documents
- Follow documentation standards from Skills`);
    }

    // Add OCI capabilities if MCP is enabled
    if (this.config.ociMcpEnabled && this.config.ociMcpRegion) {
      capabilities.push(`\n\n## ☁️ Oracle Cloud Infrastructure (OCI) Capabilities

You have access to OCI MCP tools for:
- **Resource Management**: List, create, and manage OCI resources
- **Compute Instances**: Manage VM instances
- **Storage**: Manage block and object storage
- **Networking**: Configure VCNs, subnets, security lists
- **Identity**: Manage users, groups, policies

**OCI Configuration:**
- Region: ${this.config.ociMcpRegion}
- Compartment: ${this.config.ociMcpCompartmentId}

**OCI Best Practices:**
- Always verify compartment before creating resources
- Follow naming conventions for resources
- Check quotas before provisioning`);
    }

    // Add code repository access information if available
    if (this.filesystemTools && this.filesystemTools.isAvailable()) {
      const repos = this.filesystemTools.getAllowedDirectories();
      capabilities.push(`\n\n## 💻 Code Repository Access

You have access to the following code repositories:
${repos.map(repo => `  - ${repo}`).join('\n')}

**CRITICAL: Code Exploration Rules**

⚠️ MANDATORY FIRST STEP for any codebase query:
  → MUST call \`get_project_overview(repo_path)\` BEFORE any other file operations
  → DO NOT use \`list_directory\` or \`read_file\` until you have the overview
  → This single call reads README, Makefile, package.json, and 10+ key files efficiently

**Available Tools:**

Priority 1 - Smart Exploration (REQUIRED):
- \`get_project_overview\`: **CALL THIS FIRST** - Reads README, Makefile, package.json, etc.
  → Provides: project structure, entry points, architecture, dependencies
  → Replaces 15+ manual file reads with 1 efficient call
- \`find_relevant_files\`: Find files relevant to a query using intelligent scoring
  → Use after getting overview to narrow down which files to read

Priority 2 - Basic File Operations (use AFTER overview):
- \`list_code_repositories\`: See all available repositories
- \`read_file\`: Read specific file contents (use sparingly, after overview)
- \`list_directory\`: List files in a directory (rarely needed, overview provides structure)
- \`search_files\`: Search using glob patterns (prefer find_relevant_files instead)
- \`get_file_info\`: Get file metadata

**Exploration Strategy (FOLLOW THIS ORDER):**

When exploring a codebase, you MUST follow this systematic approach:

1. **MANDATORY: Start with Overview** (1 tool call):
   - FIRST CALL: \`get_project_overview(repo_path)\`
   - This automatically reads: README, Makefile, package.json, docker-compose, entry points, etc.
   - Provides 80% of context needed to answer most questions

2. **Identify Entry Points**:
   - Check the overview for main entry points (from Makefile targets, package.json main field)
   - Entry points reveal how the application starts and its architecture

3. **Targeted Exploration** (5-10 tool calls max):
   - Use \`find_relevant_files\` to locate files matching the user's query
   - Read only the most relevant files (top 5-10)
   - For large files (>500 lines), focus on key sections

4. **Synthesize Answer**:
   - Based on overview and targeted reading, provide comprehensive answer
   - Reference specific files and line numbers when relevant

**Important Guidelines:**
- README.md: Always contains project overview and architecture
- Makefile: Shows build targets, entry points, and workflows
- package.json: JavaScript/TypeScript dependencies and scripts
- Don't read test files unless specifically asked
- Prioritize files mentioned in documentation
- Keep total file reads under 20 per query`);
    }

    // Assemble the full prompt with all enabled capabilities
    if (capabilities.length > 0) {
      basePrompt += '\n\n# Your Capabilities\n';
      basePrompt += capabilities.join('');
    } else {
      // No MCPs or filesystem tools enabled
      basePrompt += `\n\nNote: No MCP servers or code repositories are currently configured. You can provide general assistance and reference Skills if available.`;
    }

    // Add general guidelines
    const guidelines: string[] = ['Be helpful and provide clear, actionable responses'];

    if (this.config.atlassianMcpEnabled) {
      guidelines.push('Format output with ticket keys and links');
      guidelines.push('Highlight priorities and blockers');
    }

    if (this.filesystemTools && this.filesystemTools.isAvailable()) {
      guidelines.push('When analyzing code, read relevant files and provide specific insights');
      guidelines.push('Always start code exploration with get_project_overview()');
    }

    guidelines.push('Suggest next actions based on context');
    guidelines.push('Reference Skills for best practices and templates');

    basePrompt += `\n\n# Guidelines\n\n${guidelines.map((g, i) => `${i + 1}. ${g}`).join('\n')}`;

    // Add Skills context if available
    if (this.skillsLoader.isLoaded() && this.skillsLoader.getCount() > 0) {
      const skillsContext = this.skillsLoader.getSkillsContext();
      basePrompt += '\n\n' + skillsContext;
    }

    return basePrompt;
  }

  /**
   * Send a message and get a response
   */
  async chat(message: string): Promise<string> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Prepare messages for provider (last N messages)
    const recentHistory = this.conversationHistory.slice(-this.maxHistory);
    const messages: Message[] = recentHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      // Get response from provider
      const response = await this.provider.chat(messages);

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      });

      return response;
    } catch (error) {
      console.error('Error in chat:', error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  getHistory(): ConversationMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Set conversation history (useful for restoring previous conversations)
   */
  setHistory(history: ConversationMessage[]): void {
    // Convert timestamps to Date objects if they're strings or numbers
    this.conversationHistory = history.map((msg) => ({
      ...msg,
      timestamp: msg.timestamp instanceof Date ? msg.timestamp : new Date(msg.timestamp),
    }));
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    // Shutdown all MCP servers
    await this.mcpClientManager.shutdown();

    // Legacy cleanup for old mcpProcess if it exists
    if (this.mcpProcess) {
      console.error('Shutting down legacy MCP process...');
      this.mcpProcess.kill();
      this.mcpProcess = undefined;
    }
  }

  /**
   * Get provider info
   */
  getProviderInfo(): { name: string; model?: string } {
    return {
      name: this.provider.getProviderName(),
      model:
        'getModel' in this.provider
          ? (this.provider as any).getModel()
          : undefined,
    };
  }

  /**
   * Get loaded skills info
   */
  getSkillsInfo(): { count: number; names: string[] } {
    return {
      count: this.skillsLoader.getCount(),
      names: this.skillsLoader.getSkillNames(),
    };
  }

  /**
   * Get MCP server information (available, running, tool counts)
   */
  getMCPInfo(): MCPServerInfo[] {
    const availableConfigs = this.getAvailableMCPConfigs();
    const runningStatus = this.mcpClientManager.getServerStatus();

    const mcpDescriptions: Record<string, string> = {
      'atlassian': 'Jira & Confluence integration (search, create, update tickets and pages)',
      'oci': 'Oracle Cloud Infrastructure management (compute, storage, networking)',
    };

    return availableConfigs.map(config => {
      const running = runningStatus.find(s => s.name === config.name);
      return {
        name: config.name,
        available: true,
        running: !!running,
        toolCount: running?.toolCount || 0,
        description: mcpDescriptions[config.name] || 'MCP server',
      };
    });
  }

  /**
   * Enable/start an MCP server by name
   */
  async enableMCP(serverName: string): Promise<{ success: boolean; message: string }> {
    // Check if already running
    if (this.mcpClientManager.isServerRunning(serverName)) {
      return { success: false, message: `MCP server '${serverName}' is already running` };
    }

    // Find the config
    const configs = this.getAvailableMCPConfigs();
    const config = configs.find(c => c.name === serverName);

    if (!config) {
      const available = configs.map(c => c.name).join(', ');
      return {
        success: false,
        message: `MCP server '${serverName}' not found. Available: ${available || 'none'}`
      };
    }

    try {
      await this.mcpClientManager.startServer({ ...config, enabled: true });
      const toolCount = this.mcpClientManager.getServerStatus()
        .find(s => s.name === serverName)?.toolCount || 0;
      return {
        success: true,
        message: `Started MCP server '${serverName}' with ${toolCount} tools`
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to start '${serverName}': ${error}`
      };
    }
  }

  /**
   * Disable/stop an MCP server by name
   */
  async disableMCP(serverName: string): Promise<{ success: boolean; message: string }> {
    // Check if running
    if (!this.mcpClientManager.isServerRunning(serverName)) {
      return { success: false, message: `MCP server '${serverName}' is not running` };
    }

    const stopped = await this.mcpClientManager.stopServer(serverName);
    if (stopped) {
      return { success: true, message: `Stopped MCP server '${serverName}'` };
    } else {
      return { success: false, message: `Failed to stop MCP server '${serverName}'` };
    }
  }

  /**
   * Convenience method: Get my sprint tasks
   */
  async getMySprintTasks(): Promise<string> {
    return this.chat('Show me my current sprint tasks');
  }

  /**
   * Convenience method: Search Confluence
   */
  async searchConfluence(query: string): Promise<string> {
    return this.chat(`Search Confluence for: ${query}`);
  }

  /**
   * Convenience method: Get high priority tasks
   */
  async getHighPriorityTasks(): Promise<string> {
    return this.chat('Show me my high priority tasks');
  }
}
