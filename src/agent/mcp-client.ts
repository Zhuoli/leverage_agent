/**
 * MCP Client
 *
 * Manages connections to MCP servers (Atlassian, OCI, etc.) and provides
 * a unified interface for tool discovery and execution.
 */

import { spawn, ChildProcess } from 'child_process';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Logger } from '../utils/logger.js';

export interface MCPServerConfig {
  name: string;
  enabled: boolean;
  serverPath: string;
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface MCPServerInstance {
  name: string;
  client: Client;
  transport: StdioClientTransport;
  process: ChildProcess;
  tools: MCPTool[];
}

/**
 * MCP Client Manager
 * Handles lifecycle and communication with multiple MCP servers
 */
export class MCPClientManager {
  private servers: Map<string, MCPServerInstance> = new Map();

  /**
   * Start an MCP server and connect to it
   */
  async startServer(config: MCPServerConfig): Promise<void> {
    if (!config.enabled) {
      console.error(`Skipping disabled MCP server: ${config.name}`);
      return;
    }

    console.error(`Starting MCP server: ${config.name}...`);

    try {
      // Spawn the server process
      const serverProcess = spawn('node', [config.serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...config.env },
      });

      // Log stderr from server for debugging
      serverProcess.stderr?.on('data', (data) => {
        console.error(`[${config.name}] ${data.toString().trim()}`);
      });

      serverProcess.on('error', (error) => {
        console.error(`[${config.name}] Process error:`, error);
      });

      serverProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`[${config.name}] Process exited with code ${code}`);
        }
        this.servers.delete(config.name);
      });

      // Create MCP client and transport
      // Filter out undefined values from process.env and merge with config.env
      const envVars: Record<string, string> = {};
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          envVars[key] = value;
        }
      }
      if (config.env) {
        Object.assign(envVars, config.env);
      }

      const transport = new StdioClientTransport({
        command: 'node',
        args: [config.serverPath],
        env: envVars,
      });

      const client = new Client(
        {
          name: `${config.name}-client`,
          version: '1.0.0',
        },
        {
          capabilities: {},
        }
      );

      // Connect to the server
      await client.connect(transport);

      // List available tools
      const toolsResponse = await client.listTools();
      const tools = toolsResponse.tools as MCPTool[];

      Logger.mcpServerConnected(config.name, tools.length);

      // Store the server instance
      this.servers.set(config.name, {
        name: config.name,
        client,
        transport,
        process: serverProcess,
        tools,
      });
    } catch (error) {
      console.error(`Failed to start ${config.name} MCP server:`, error);
      throw error;
    }
  }

  /**
   * Get all tools from all connected servers
   */
  getAllTools(): MCPTool[] {
    const allTools: MCPTool[] = [];
    for (const server of this.servers.values()) {
      allTools.push(...server.tools);
    }
    return allTools;
  }

  /**
   * Call a tool on the appropriate MCP server
   */
  async callTool(toolName: string, args: Record<string, unknown>): Promise<any> {
    const startTime = Date.now();

    // Find which server has this tool
    for (const server of this.servers.values()) {
      const tool = server.tools.find((t) => t.name === toolName);
      if (tool) {
        Logger.toolCalling(toolName, args);
        try {
          const result = await server.client.callTool({
            name: toolName,
            arguments: args,
          });

          const duration = Date.now() - startTime;
          Logger.toolCallSuccess(toolName, duration);

          // Extract the actual content from the MCP response
          if (result && 'content' in result) {
            const content = result.content;
            if (Array.isArray(content) && content.length > 0) {
              // MCP returns content as an array of text objects
              const textContent = content
                .filter((item: any) => item.type === 'text')
                .map((item: any) => item.text)
                .join('\n');
              return textContent;
            }
          }

          return JSON.stringify(result);
        } catch (error) {
          Logger.toolCallFailed(toolName, String(error));
          throw error;
        }
      }
    }

    throw new Error(`Tool not found: ${toolName}`);
  }

  /**
   * Check if a server is running
   */
  isServerRunning(serverName: string): boolean {
    return this.servers.has(serverName);
  }

  /**
   * Stop a specific MCP server
   */
  async stopServer(serverName: string): Promise<boolean> {
    const server = this.servers.get(serverName);
    if (!server) {
      console.error(`Server not found: ${serverName}`);
      return false;
    }

    try {
      console.error(`Stopping MCP server: ${serverName}...`);
      await server.client.close();
      server.process.kill('SIGTERM');
      this.servers.delete(serverName);
      console.error(`✓ Stopped ${serverName}`);
      return true;
    } catch (error) {
      console.error(`Error stopping ${serverName}:`, error);
      return false;
    }
  }

  /**
   * Get status of all servers
   */
  getServerStatus(): Array<{ name: string; running: boolean; toolCount: number }> {
    const status: Array<{ name: string; running: boolean; toolCount: number }> = [];
    for (const [name, server] of this.servers.entries()) {
      status.push({
        name,
        running: true,
        toolCount: server.tools.length,
      });
    }
    return status;
  }

  /**
   * Shutdown all MCP servers
   */
  async shutdown(): Promise<void> {
    console.error('Shutting down all MCP servers...');

    for (const [name, server] of this.servers.entries()) {
      try {
        await server.client.close();
        server.process.kill('SIGTERM');
        console.error(`✓ Shut down ${name}`);
      } catch (error) {
        console.error(`Error shutting down ${name}:`, error);
      }
    }

    this.servers.clear();
  }

  /**
   * Get the number of connected servers
   */
  getServerCount(): number {
    return this.servers.size;
  }

  /**
   * Get names of all connected servers
   */
  getServerNames(): string[] {
    return Array.from(this.servers.keys());
  }
}
