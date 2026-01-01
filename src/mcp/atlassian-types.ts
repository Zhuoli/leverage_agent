/**
 * MCP Tool types and schema definitions
 */

export interface ToolSchema {
  type: 'object';
  properties: Record<string, any>;
  required?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: ToolSchema;
}

// Jira Tool Schemas
export const JIRA_TOOLS: MCPTool[] = [
  {
    name: 'search_jira_tickets',
    description: 'Search for Jira tickets using JQL query',
    inputSchema: {
      type: 'object',
      properties: {
        jql: {
          type: 'string',
          description: 'JQL query string (e.g., "assignee = currentUser() AND status != Done")',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
          default: 50,
        },
      },
      required: ['jql'],
    },
  },
  {
    name: 'create_jira_ticket',
    description: 'Create a new Jira ticket',
    inputSchema: {
      type: 'object',
      properties: {
        project_key: {
          type: 'string',
          description: 'Project key (e.g., "PROJ")',
        },
        summary: {
          type: 'string',
          description: 'Issue summary/title',
        },
        description: {
          type: 'string',
          description: 'Issue description',
        },
        issue_type: {
          type: 'string',
          description: 'Issue type (Task, Bug, Story, etc.)',
          default: 'Task',
        },
      },
      required: ['project_key', 'summary', 'description'],
    },
  },
  {
    name: 'update_jira_ticket',
    description: 'Update a Jira ticket',
    inputSchema: {
      type: 'object',
      properties: {
        issue_key: {
          type: 'string',
          description: 'Issue key (e.g., "PROJ-123")',
        },
        summary: {
          type: 'string',
          description: 'Optional new summary',
        },
        description: {
          type: 'string',
          description: 'Optional new description',
        },
      },
      required: ['issue_key'],
    },
  },
  {
    name: 'add_jira_comment',
    description: 'Add a comment to a Jira ticket',
    inputSchema: {
      type: 'object',
      properties: {
        issue_key: {
          type: 'string',
          description: 'Issue key (e.g., "PROJ-123")',
        },
        comment: {
          type: 'string',
          description: 'Comment text',
        },
      },
      required: ['issue_key', 'comment'],
    },
  },
  {
    name: 'get_my_sprint_tasks',
    description: 'Get issues assigned to the user in active sprints',
    inputSchema: {
      type: 'object',
      properties: {
        include_future_sprints: {
          type: 'boolean',
          description: 'Include future sprints (default: false)',
          default: false,
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 50)',
          default: 50,
        },
      },
    },
  },
];

// Confluence Tool Schemas
export const CONFLUENCE_TOOLS: MCPTool[] = [
  {
    name: 'search_confluence_pages',
    description: 'Search for Confluence pages using CQL query',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query text',
        },
        space_key: {
          type: 'string',
          description: 'Optional space key to search in',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 20)',
          default: 20,
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'create_confluence_page',
    description: 'Create a new Confluence page',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Page title',
        },
        body: {
          type: 'string',
          description: 'Page content in HTML format',
        },
        space_key: {
          type: 'string',
          description: 'Optional space key (uses default if not provided)',
        },
        parent_id: {
          type: 'string',
          description: 'Optional parent page ID',
        },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'update_confluence_page',
    description: 'Update an existing Confluence page',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Page ID',
        },
        title: {
          type: 'string',
          description: 'Optional new title',
        },
        body: {
          type: 'string',
          description: 'Optional new content in HTML format',
        },
      },
      required: ['page_id'],
    },
  },
  {
    name: 'get_confluence_page_content',
    description: 'Get the content of a Confluence page',
    inputSchema: {
      type: 'object',
      properties: {
        page_id: {
          type: 'string',
          description: 'Page ID',
        },
        title: {
          type: 'string',
          description: 'Page title (alternative to page_id)',
        },
        space_key: {
          type: 'string',
          description: 'Space key (required if using title)',
        },
      },
    },
  },
  {
    name: 'get_recent_confluence_pages',
    description: 'Get recently updated Confluence pages',
    inputSchema: {
      type: 'object',
      properties: {
        space_key: {
          type: 'string',
          description: 'Optional space key to filter by',
        },
        max_results: {
          type: 'number',
          description: 'Maximum number of results (default: 10)',
          default: 10,
        },
      },
    },
  },
];
