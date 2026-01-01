#!/usr/bin/env node

/**
 * Atlassian MCP Server
 *
 * This server provides MCP tools for interacting with Jira and Confluence.
 * It exposes tools that can be used by AI agents through the Model Context Protocol.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from '../config/index.js';
import { registerJiraTools } from './tools/jira-tools.js';
import { registerConfluenceTools } from './tools/confluence-tools.js';
import { JIRA_TOOLS, CONFLUENCE_TOOLS } from './atlassian-types.js';

async function main() {
  console.error('Starting Atlassian MCP Server (TypeScript)...');

  try {
    // Load and validate configuration
    const config = loadConfig();
    console.error('Configuration validated successfully');

    // Create MCP server instance
    const server = new Server(
      {
        name: 'atlassian-mcp-server',
        version: '3.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    console.error('Registering Jira tools...');
    registerJiraTools(server, config);

    console.error('Registering Confluence tools...');
    registerConfluenceTools(server, config);

    // Register list_tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      const allTools = [...JIRA_TOOLS, ...CONFLUENCE_TOOLS];
      console.error(`Listing ${allTools.length} available tools`);
      return {
        tools: allTools,
      };
    });

    console.error(
      `MCP Server initialized with ${JIRA_TOOLS.length} Jira tools and ${CONFLUENCE_TOOLS.length} Confluence tools`
    );

    // Start server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);

    console.error('Server running on stdio transport');

    // Keep the process running
    process.on('SIGINT', async () => {
      console.error('Shutting down MCP server...');
      await server.close();
      process.exit(0);
    });
  } catch (error) {
    console.error('Server error:', error);
    process.exit(1);
  }
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
