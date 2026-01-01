import { spawn, ChildProcess } from 'child_process';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Config } from '../config/index.js';
import { SkillsLoader } from '../skills/loader.js';
import { createProvider, type BaseProvider } from '../providers/index.js';
import type { Message } from '../providers/types.js';
import type { ConversationMessage, AgentOptions } from './types.js';
import { FilesystemTools } from './filesystem-tools.js';
import { SmartExploration } from './smart-exploration.js';
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
  private conversationHistory: ConversationMessage[] = [];
  private maxHistory: number;
  private initialized: boolean = false;

  constructor(private config: Config, private options: AgentOptions = {}) {
    this.maxHistory = options.maxHistory || 20;

    // Determine skills directory (relative to project root)
    const projectRoot = resolve(__dirname, '..', '..');
    const skillsDir = join(projectRoot, '.claude', 'skills');

    this.skillsLoader = new SkillsLoader(skillsDir);

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

    console.error('Initializing Atlassian Agent SDK...');

    try {
      // Load Skills
      if (this.options.enableSkills !== false) {
        console.error('Loading Skills...');
        await this.skillsLoader.load();
        console.error(`✓ Loaded ${this.skillsLoader.getCount()} skills`);
      }

      // Start MCP server (optional)
      // NOTE: MCP server startup is currently disabled as tools are integrated directly
      // TODO: Implement individual MCP server startup (atlassian-server, oci-server) based on config
      // if (this.options.enableMCP !== false) {
      //   await this.startMCPServer();
      // }

      // Build system prompt with Skills context
      const systemPrompt = this.buildSystemPrompt();

      // Initialize AI provider
      console.error(`Initializing ${this.config.modelProvider} provider...`);
      this.provider = createProvider(this.config, systemPrompt);

      // Register filesystem tools if available (Claude provider only for now)
      if (this.filesystemTools && this.filesystemTools.isAvailable()) {
        if ('registerTools' in this.provider) {
          const tools = this.createFilesystemTools();
          const handler = this.createToolHandler();
          (this.provider as any).registerTools(tools, handler);
          console.error('✓ Filesystem tools registered');
        }
      }

      this.initialized = true;
      console.error('✓ Agent initialized successfully');
    } catch (error) {
      console.error('Failed to initialize agent:', error);
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
      if (!this.filesystemTools) {
        throw new Error('Filesystem tools not available');
      }

      switch (toolName) {
        case 'read_file':
          return await this.filesystemTools.readFile(toolInput.path);

        case 'list_directory':
          return await this.filesystemTools.listDirectory(toolInput.path);

        case 'search_files':
          return await this.filesystemTools.searchFiles(
            toolInput.pattern,
            toolInput.base_dir
          );

        case 'get_file_info':
          return await this.filesystemTools.getFileInfo(toolInput.path);

        case 'list_code_repositories':
          return await this.filesystemTools.getAllowedDirectoriesSummary();

        case 'get_project_overview':
          if (!this.smartExploration) {
            throw new Error('Smart exploration not available');
          }
          const context = await this.smartExploration.getProjectOverview(
            toolInput.repo_path,
            { maxAnchorFiles: toolInput.max_files }
          );
          return JSON.stringify(context, null, 2);

        case 'find_relevant_files':
          if (!this.smartExploration) {
            throw new Error('Smart exploration not available');
          }
          // First get project overview as context
          const overviewContext = await this.smartExploration.getProjectOverview(toolInput.repo_path);
          const relevantFiles = await this.smartExploration.findRelevantFiles(
            toolInput.query,
            toolInput.repo_path,
            overviewContext,
            toolInput.max_results || 10
          );
          return JSON.stringify(relevantFiles, null, 2);

        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    };
  }

  /**
   * Start the MCP server as a subprocess
   */
  private async startMCPServer(): Promise<void> {
    console.error('Starting MCP server...');

    try {
      const projectRoot = resolve(__dirname, '..', '..');
      const mcpServerPath = join(projectRoot, 'dist', 'mcp', 'server.js');

      // Spawn MCP server process
      this.mcpProcess = spawn('node', [mcpServerPath], {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: process.env,
      });

      // Handle process errors
      this.mcpProcess.on('error', (error) => {
        console.error('MCP server process error:', error);
      });

      this.mcpProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`MCP server exited with code ${code}`);
        }
      });

      console.error('✓ MCP server started');
    } catch (error) {
      console.error('Failed to start MCP server:', error);
      throw error;
    }
  }

  /**
   * Build system prompt with Skills context
   */
  private buildSystemPrompt(): string {
    let basePrompt = `You are an AI assistant helping users interact with their Jira and Confluence instances.

You have access to MCP tools for Jira and Confluence operations.

**Your Capabilities:**

Jira:
- Search tickets using JQL
- Get sprint tasks
- Create and update tickets
- Add comments
- Analyze priorities and blockers

Confluence:
- Search pages
- Read page content
- Create and update pages
- Get recent updates`;

    // Add code repository access information if available
    if (this.filesystemTools && this.filesystemTools.isAvailable()) {
      const repos = this.filesystemTools.getAllowedDirectories();
      basePrompt += `\n\n**Code Repository Access:**

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
- Keep total file reads under 20 per query`;
    }

    basePrompt += `\n\n**Guidelines:**
1. Be helpful and provide clear, actionable responses
2. Format output with ticket keys and links
3. Highlight priorities and blockers
4. Suggest next actions based on context
5. When analyzing code, read relevant files and provide specific insights`;

    // Add Skills context if available
    if (this.skillsLoader.isLoaded() && this.skillsLoader.getCount() > 0) {
      const skillsContext = this.skillsLoader.getSkillsContext();
      return basePrompt + '\n\n' + skillsContext;
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
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.mcpProcess) {
      console.error('Shutting down MCP server...');
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
