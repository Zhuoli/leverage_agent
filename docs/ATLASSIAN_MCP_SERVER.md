# Atlassian MCP Server

Model Context Protocol (MCP) Server for Jira and Confluence integration.

## Overview

The Atlassian MCP Server provides tools for interacting with Jira and Confluence through the Model Context Protocol. It enables AI agents to search, create, and update issues and pages in your Atlassian environment.

## Features

- **10 MCP Tools** for Jira and Confluence operations
- **5 Jira Tools**: Search, create, update tickets, add comments, get sprint tasks
- **5 Confluence Tools**: Search, create, update, get content, recent pages
- Support for both **Cloud** and **Server/Data Center** deployments
- **API Token** authentication for secure access

## Prerequisites

1. **Atlassian API Token** (for Cloud) or username/password (for Server)
2. **Node.js** >= 18.0.0
3. Access to Jira and/or Confluence

## Configuration

Set the following environment variables in your `.env` file:

```bash
# Jira Configuration
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your-api-token

# Confluence Configuration
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your-api-token

# Optional
CONFLUENCE_DEFAULT_SPACE=TEAM        # Default space key for new pages
```

### Getting an API Token (Atlassian Cloud)

1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Click "Create API token"
3. Give it a name (e.g., "MCP Server")
4. Copy the token and use it as `JIRA_API_TOKEN` and `CONFLUENCE_API_TOKEN`

## Running the Server

```bash
# Build the server
npm run build:mcp:atlassian

# Run the server
npm run mcp:atlassian

# Debug with MCP Inspector
npm run inspector:atlassian
```

## Available Tools

### Jira Tools (5 tools)

#### 1. `search_jira_tickets`

Search for Jira tickets using JQL (Jira Query Language).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jql` | string | Yes | JQL query string |
| `max_results` | number | No | Maximum results (default: 50) |

**Example:**
```json
{
  "tool": "search_jira_tickets",
  "arguments": {
    "jql": "assignee = currentUser() AND status != Done",
    "max_results": 20
  }
}
```

**Common JQL Queries:**
- `project = PROJ AND status = "In Progress"` - Issues in progress
- `assignee = currentUser()` - My assigned issues
- `sprint in openSprints()` - Issues in active sprints
- `created >= -7d` - Issues created in last 7 days
- `priority = High AND status != Done` - High priority open issues

#### 2. `create_jira_ticket`

Create a new Jira ticket.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `project_key` | string | Yes | Project key (e.g., "PROJ") |
| `summary` | string | Yes | Issue title |
| `description` | string | Yes | Issue description |
| `issue_type` | string | No | Issue type (default: "Task") |

**Example:**
```json
{
  "tool": "create_jira_ticket",
  "arguments": {
    "project_key": "PROJ",
    "summary": "Implement user authentication",
    "description": "Add OAuth2 authentication to the API endpoints",
    "issue_type": "Story"
  }
}
```

**Supported Issue Types:**
- Task
- Bug
- Story
- Epic
- Sub-task

#### 3. `update_jira_ticket`

Update an existing Jira ticket.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_key` | string | Yes | Issue key (e.g., "PROJ-123") |
| `summary` | string | No | New summary |
| `description` | string | No | New description |

**Example:**
```json
{
  "tool": "update_jira_ticket",
  "arguments": {
    "issue_key": "PROJ-123",
    "summary": "Updated: Implement user authentication",
    "description": "Add OAuth2 and SAML authentication"
  }
}
```

#### 4. `add_jira_comment`

Add a comment to a Jira ticket.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `issue_key` | string | Yes | Issue key (e.g., "PROJ-123") |
| `comment` | string | Yes | Comment text |

**Example:**
```json
{
  "tool": "add_jira_comment",
  "arguments": {
    "issue_key": "PROJ-123",
    "comment": "Code review completed. Ready for QA testing."
  }
}
```

#### 5. `get_my_sprint_tasks`

Get issues assigned to the current user in active sprints.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `include_future_sprints` | boolean | No | Include future sprints (default: false) |
| `max_results` | number | No | Maximum results (default: 50) |

**Example:**
```json
{
  "tool": "get_my_sprint_tasks",
  "arguments": {
    "include_future_sprints": false,
    "max_results": 20
  }
}
```

### Confluence Tools (5 tools)

#### 1. `search_confluence_pages`

Search for Confluence pages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `query` | string | Yes | Search query text |
| `space_key` | string | No | Space key to search in |
| `max_results` | number | No | Maximum results (default: 20) |

**Example:**
```json
{
  "tool": "search_confluence_pages",
  "arguments": {
    "query": "API documentation",
    "space_key": "DEV",
    "max_results": 10
  }
}
```

#### 2. `create_confluence_page`

Create a new Confluence page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | string | Yes | Page title |
| `body` | string | Yes | Page content (HTML format) |
| `space_key` | string | No | Space key (uses default if not provided) |
| `parent_id` | string | No | Parent page ID |

**Example:**
```json
{
  "tool": "create_confluence_page",
  "arguments": {
    "title": "API Reference Guide",
    "body": "<h1>Overview</h1><p>This document describes our REST API.</p>",
    "space_key": "DEV"
  }
}
```

#### 3. `update_confluence_page`

Update an existing Confluence page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_id` | string | Yes | Page ID |
| `title` | string | No | New title |
| `body` | string | No | New content (HTML format) |

**Example:**
```json
{
  "tool": "update_confluence_page",
  "arguments": {
    "page_id": "123456",
    "title": "Updated API Reference Guide",
    "body": "<h1>Overview</h1><p>Updated content here.</p>"
  }
}
```

#### 4. `get_confluence_page_content`

Get the content of a Confluence page.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page_id` | string | No | Page ID |
| `title` | string | No | Page title (alternative to page_id) |
| `space_key` | string | No | Space key (required if using title) |

**Example:**
```json
{
  "tool": "get_confluence_page_content",
  "arguments": {
    "page_id": "123456"
  }
}
```

Or by title:
```json
{
  "tool": "get_confluence_page_content",
  "arguments": {
    "title": "API Reference Guide",
    "space_key": "DEV"
  }
}
```

#### 5. `get_recent_confluence_pages`

Get recently updated Confluence pages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `space_key` | string | No | Space key to filter by |
| `max_results` | number | No | Maximum results (default: 10) |

**Example:**
```json
{
  "tool": "get_recent_confluence_pages",
  "arguments": {
    "space_key": "DEV",
    "max_results": 5
  }
}
```

## Claude Desktop Integration

Add the following to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "node",
      "args": ["/path/to/leverage_agent/dist/mcp/atlassian-server.js"],
      "env": {
        "JIRA_URL": "https://your-company.atlassian.net",
        "JIRA_USERNAME": "your.email@company.com",
        "JIRA_API_TOKEN": "your-api-token",
        "CONFLUENCE_URL": "https://your-company.atlassian.net/wiki",
        "CONFLUENCE_USERNAME": "your.email@company.com",
        "CONFLUENCE_API_TOKEN": "your-api-token"
      }
    }
  }
}
```

## Architecture

```
src/mcp/
├── atlassian-server.ts     # MCP server entry point
├── atlassian-types.ts      # Tool schema definitions
└── tools/
    ├── jira-tools.ts       # Jira tool handlers
    └── confluence-tools.ts # Confluence tool handlers

src/api/
├── jira-client.ts          # Jira API client
└── confluence-client.ts    # Confluence API client
```

## Error Handling

All tools return structured responses:

- **Success**: Tool-specific formatted output with checkmarks
- **Error**: `Error <action> <resource>: <error_message>`

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Invalid credentials | Check API token and username |
| 403 Forbidden | Insufficient permissions | Verify user has required access |
| 404 Not Found | Resource doesn't exist | Check issue key or page ID |
| 400 Bad Request | Invalid parameters | Verify JQL syntax or required fields |

## Best Practices

### Jira

1. **Use specific JQL queries** to minimize results
2. **Include project key** in searches for faster results
3. **Use `currentUser()`** function for personal queries
4. **Check issue type** availability before creating tickets

### Confluence

1. **Specify space_key** when possible for faster searches
2. **Use HTML format** for page content
3. **Get page content first** before updating to preserve formatting
4. **Check page permissions** before creating/updating

## Troubleshooting

### Authentication Failed

1. Verify API token is valid
2. Check username format (email for Cloud)
3. Ensure token has required scopes

### JQL Syntax Error

1. Validate JQL in Jira's advanced search first
2. Escape special characters properly
3. Use correct field names

### Page Not Found

1. Verify page ID or title is correct
2. Check space key is valid
3. Ensure user has view permissions

## License

MIT
