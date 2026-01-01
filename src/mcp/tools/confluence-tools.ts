import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ConfluenceClient } from '../../api/confluence-client.js';
import type { Config } from '../../config/index.js';
import { CONFLUENCE_TOOLS } from '../atlassian-types.js';

/**
 * Register all Confluence MCP tools with the server
 */
export function registerConfluenceTools(server: Server, config: Config) {
  const confluenceClient = new ConfluenceClient(config);

  // Tool 1: search_confluence_pages
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    if (request.params.name === 'search_confluence_pages') {
      const { query, space_key, max_results = 20 } = request.params.arguments as any;

      if (!query) {
        return {
          content: [{ type: 'text', text: "Error: 'query' parameter is required" }],
        };
      }

      try {
        const pages = await confluenceClient.searchConfluencePages(query, space_key, max_results);
        const formatted = pages.map((page) => confluenceClient.formatPage(page));

        if (formatted.length === 0) {
          return {
            content: [{ type: 'text', text: 'No pages found matching the query.' }],
          };
        }

        let result = `Found ${formatted.length} page(s):\n\n`;
        formatted.forEach((page, i) => {
          result += `${i + 1}. ${page.title}\n`;
          result += `   Space: ${page.space_name} (${page.space_key})\n`;
          if (page.content_preview) {
            result += `   Preview: ${page.content_preview}\n`;
          }
          result += `   URL: ${page.url}\n\n`;
        });

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error searching Confluence pages: ${error}` }],
        };
      }
    }

    // Tool 2: create_confluence_page
    if (request.params.name === 'create_confluence_page') {
      const { title, body, space_key, parent_id } = request.params.arguments as any;

      if (!title || !body) {
        return {
          content: [{ type: 'text', text: "Error: 'title' and 'body' are required" }],
        };
      }

      try {
        const page = await confluenceClient.createConfluencePage(title, body, space_key, parent_id);
        const pageId = page.id || 'Unknown';
        const url = `${config.confluenceUrl}/pages/viewpage.action?pageId=${pageId}`;

        const result =
          `✓ Created Confluence page: ${title}\n` +
          `Space: ${page.space?.key || 'Unknown'}\n` +
          `URL: ${url}\n`;

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error creating Confluence page: ${error}` }],
        };
      }
    }

    // Tool 3: update_confluence_page
    if (request.params.name === 'update_confluence_page') {
      const { page_id, title, body } = request.params.arguments as any;

      if (!page_id) {
        return {
          content: [{ type: 'text', text: "Error: 'page_id' is required" }],
        };
      }

      if (!title && !body) {
        return {
          content: [
            { type: 'text', text: "Error: At least one of 'title' or 'body' must be provided" },
          ],
        };
      }

      try {
        const page = await confluenceClient.updateConfluencePage(page_id, title, body);
        const url = `${config.confluenceUrl}/pages/viewpage.action?pageId=${page_id}`;

        const result =
          `✓ Updated Confluence page: ${page.title}\n` +
          `Space: ${page.space?.key || 'Unknown'}\n` +
          `URL: ${url}\n`;

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error updating Confluence page: ${error}` }],
        };
      }
    }

    // Tool 4: get_confluence_page_content
    if (request.params.name === 'get_confluence_page_content') {
      const { page_id, title, space_key } = request.params.arguments as any;

      if (!page_id && !title) {
        return {
          content: [{ type: 'text', text: "Error: Either 'page_id' or 'title' is required" }],
        };
      }

      try {
        const content = await confluenceClient.getPageContent(page_id, title, space_key);

        const result = `Page Content:\n\n${content}`;

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error getting Confluence page content: ${error}` }],
        };
      }
    }

    // Tool 5: get_recent_confluence_pages
    if (request.params.name === 'get_recent_confluence_pages') {
      const { space_key, max_results = 10 } = request.params.arguments as any;

      try {
        const pages = await confluenceClient.getRecentPages(space_key, max_results);
        const formatted = pages.map((page) => confluenceClient.formatPage(page));

        if (formatted.length === 0) {
          return {
            content: [{ type: 'text', text: 'No recent pages found.' }],
          };
        }

        let result = `Found ${formatted.length} recent page(s):\n\n`;
        formatted.forEach((page, i) => {
          result += `${i + 1}. ${page.title}\n`;
          result += `   Space: ${page.space_name} (${page.space_key})\n`;
          result += `   URL: ${page.url}\n\n`;
        });

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Error getting recent Confluence pages: ${error}` }],
        };
      }
    }

    // Return null if tool not handled
    return { content: [{ type: 'text', text: 'Unknown tool' }] };
  });
}
