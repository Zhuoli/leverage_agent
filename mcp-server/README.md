# Atlassian MCP Server

Model Context Protocol (MCP) server for Atlassian Jira and Confluence.

## Overview

This MCP server exposes tools for interacting with enterprise Jira and Confluence instances through the Model Context Protocol. It can be used by AI agents (like Claude) to:

- Search, create, update Jira tickets
- Add comments to Jira tickets
- Search Confluence pages
- Create and update Confluence pages
- Get page content
- Access recent updates

## Installation

1. Create a virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your credentials
```

## Configuration

Create a `.env` file with your Atlassian credentials:

```bash
# Jira Configuration
JIRA_URL=https://jira.yourcompany.com
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your_jira_personal_access_token

# Confluence Configuration
CONFLUENCE_URL=https://confluence.yourcompany.com
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your_confluence_personal_access_token
CONFLUENCE_SPACE_KEY=YOURSPACE

# User Configuration
USER_EMAIL=your.email@company.com
USER_DISPLAY_NAME=Your Name
```

## Running the Server

### Standalone Mode (stdio transport)

```bash
python server.py
```

### Using with Claude Desktop

Add to your Claude Desktop MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "atlassian": {
      "command": "/path/to/venv/bin/python",
      "args": ["/path/to/mcp-server/server.py"]
    }
  }
}
```

### Using with Python Agent SDK

```python
from claude_agent_sdk import Agent

agent = Agent(
    mcp_servers=["stdio://path/to/venv/bin/python path/to/server.py"]
)
```

## Available Tools

### Jira Tools

1. **search_jira_tickets**
   - Search for Jira tickets using JQL
   - Parameters: `jql`, `max_results`

2. **create_jira_ticket**
   - Create a new Jira ticket
   - Parameters: `project_key`, `summary`, `description`, `issue_type`

3. **update_jira_ticket**
   - Update an existing Jira ticket
   - Parameters: `issue_key`, `summary`, `description`

4. **add_jira_comment**
   - Add a comment to a Jira ticket
   - Parameters: `issue_key`, `comment`

5. **get_my_sprint_tasks**
   - Get Jira tasks assigned to me in active sprints
   - Parameters: `include_future_sprints`, `max_results`

### Confluence Tools

1. **search_confluence_pages**
   - Search for Confluence pages
   - Parameters: `query`, `space_key`, `max_results`

2. **create_confluence_page**
   - Create a new Confluence page
   - Parameters: `title`, `body`, `space_key`, `parent_id`

3. **update_confluence_page**
   - Update an existing Confluence page
   - Parameters: `page_id`, `title`, `body`

4. **get_confluence_page_content**
   - Get the full content of a page
   - Parameters: `page_id`, `title`, `space_key`

5. **get_recent_confluence_pages**
   - Get recently updated pages
   - Parameters: `space_key`, `max_results`

## Usage Examples

### Using JQL to Search Jira

```python
# Find all open bugs assigned to me
result = await search_jira_tickets(
    jql='assignee=currentUser() AND status!=Done AND type=Bug',
    max_results=20
)

# Find high priority tasks in current sprint
result = await search_jira_tickets(
    jql='sprint in openSprints() AND priority=High',
    max_results=10
)
```

### Working with Confluence

```python
# Search for API documentation
result = await search_confluence_pages(
    query='API documentation',
    space_key='TECH',
    max_results=10
)

# Get page content
content = await get_confluence_page_content(
    title='API Guide',
    space_key='TECH'
)
```

## Architecture

```
mcp-server/
├── server.py                      # MCP server entry point
├── requirements.txt               # Python dependencies
├── .env.example                   # Configuration template
├── atlassian_mcp/
│   ├── __init__.py
│   ├── config.py                  # Configuration management
│   ├── jira_client.py            # Jira API client
│   ├── jira_tools.py             # Jira MCP tools
│   ├── confluence_client.py      # Confluence API client
│   └── confluence_tools.py       # Confluence MCP tools
└── tests/
    └── test_tools.py             # Tool tests
```

## Development

### Running Tests

```bash
pytest tests/
```

### Adding New Tools

1. Add the tool function to the appropriate `*_tools.py` file
2. Register it with the MCP server in the `register_*_tools()` function
3. Add the tool schema to the `*_TOOLS` list
4. Add tests in `tests/test_tools.py`

## Troubleshooting

### Connection Issues

- Verify your `.env` configuration
- Test credentials manually with curl:
  ```bash
  curl -u username:token https://jira.yourcompany.com/rest/api/2/myself
  ```

### MCP Server Not Starting

- Check Python version (3.9+ required)
- Verify all dependencies installed: `pip install -r requirements.txt`
- Check logs for configuration errors

### Tool Errors

- Verify JQL syntax is correct
- Check user permissions in Jira/Confluence
- Ensure space keys and project keys exist

## Security

- Credentials stored in `.env` file (not committed to git)
- Uses Personal Access Tokens (PAT) for SSO compatibility
- HTTPS-only connections to Atlassian instances
- No data stored or cached by the server

## License

See main project LICENSE file.
