"""MCP Tools for Jira operations"""

from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.types import Tool, TextContent
from .jira_client import JiraClient
from .config import get_config

# Initialize Jira client
config = get_config()
jira_client = JiraClient(config)


def register_jira_tools(server: Server):
    """Register all Jira MCP tools with the server"""

    @server.call_tool()
    async def search_jira_tickets(arguments: dict) -> List[TextContent]:
        """
        Search for Jira tickets using JQL query

        Args:
            jql: JQL query string
            max_results: Maximum number of results (default: 50)

        Returns:
            List of matching Jira tickets
        """
        jql = arguments.get("jql", "")
        max_results = arguments.get("max_results", 50)

        if not jql:
            return [TextContent(
                type="text",
                text="Error: 'jql' parameter is required"
            )]

        try:
            issues = jira_client.search_jira_tickets(jql, max_results)
            formatted_issues = [jira_client.format_issue(issue) for issue in issues]

            if not formatted_issues:
                return [TextContent(
                    type="text",
                    text="No issues found matching the query."
                )]

            # Format as readable text
            result = f"Found {len(formatted_issues)} issue(s):\n\n"
            for i, issue in enumerate(formatted_issues, 1):
                result += f"{i}. [{issue['key']}] {issue['summary']}\n"
                result += f"   Status: {issue['status']} | Priority: {issue['priority']}\n"
                result += f"   Type: {issue['issue_type']} | Assignee: {issue['assignee']}\n"
                if issue.get('sprint'):
                    result += f"   Sprint: {issue['sprint']}\n"
                result += f"   URL: {issue['url']}\n\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error searching Jira tickets: {str(e)}"
            )]

    @server.call_tool()
    async def create_jira_ticket(arguments: dict) -> List[TextContent]:
        """
        Create a new Jira ticket

        Args:
            project_key: Project key (e.g., "PROJ")
            summary: Issue summary
            description: Issue description
            issue_type: Issue type (default: "Task")

        Returns:
            Created ticket information
        """
        project_key = arguments.get("project_key", "")
        summary = arguments.get("summary", "")
        description = arguments.get("description", "")
        issue_type = arguments.get("issue_type", "Task")

        if not all([project_key, summary, description]):
            return [TextContent(
                type="text",
                text="Error: 'project_key', 'summary', and 'description' are required"
            )]

        try:
            issue = jira_client.create_jira_ticket(
                project_key=project_key,
                summary=summary,
                description=description,
                issue_type=issue_type
            )

            issue_key = issue.get('key', 'Unknown')
            url = f"{config.jira_url}/browse/{issue_key}"

            result = f"✓ Created Jira ticket: {issue_key}\n"
            result += f"Summary: {summary}\n"
            result += f"Type: {issue_type}\n"
            result += f"URL: {url}\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error creating Jira ticket: {str(e)}"
            )]

    @server.call_tool()
    async def update_jira_ticket(arguments: dict) -> List[TextContent]:
        """
        Update a Jira ticket

        Args:
            issue_key: Issue key (e.g., "PROJ-123")
            summary: Optional new summary
            description: Optional new description
            status: Optional new status
            assignee: Optional new assignee

        Returns:
            Updated ticket information
        """
        issue_key = arguments.get("issue_key", "")

        if not issue_key:
            return [TextContent(
                type="text",
                text="Error: 'issue_key' is required"
            )]

        # Build fields to update
        fields = {}
        if "summary" in arguments:
            fields["summary"] = arguments["summary"]
        if "description" in arguments:
            fields["description"] = arguments["description"]

        if not fields:
            return [TextContent(
                type="text",
                text="Error: At least one field to update must be provided"
            )]

        try:
            updated_issue = jira_client.update_jira_ticket(issue_key, **fields)
            formatted = jira_client.format_issue(updated_issue)

            result = f"✓ Updated Jira ticket: {issue_key}\n"
            result += f"Summary: {formatted['summary']}\n"
            result += f"Status: {formatted['status']}\n"
            result += f"URL: {formatted['url']}\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error updating Jira ticket: {str(e)}"
            )]

    @server.call_tool()
    async def add_jira_comment(arguments: dict) -> List[TextContent]:
        """
        Add a comment to a Jira ticket

        Args:
            issue_key: Issue key (e.g., "PROJ-123")
            comment: Comment text

        Returns:
            Confirmation of comment addition
        """
        issue_key = arguments.get("issue_key", "")
        comment = arguments.get("comment", "")

        if not all([issue_key, comment]):
            return [TextContent(
                type="text",
                text="Error: 'issue_key' and 'comment' are required"
            )]

        try:
            jira_client.add_jira_comment(issue_key, comment)

            result = f"✓ Added comment to Jira ticket: {issue_key}\n"
            result += f"Comment: {comment}\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error adding comment to Jira ticket: {str(e)}"
            )]

    @server.call_tool()
    async def get_my_sprint_tasks(arguments: dict) -> List[TextContent]:
        """
        Get Jira tasks assigned to me in active sprints

        Args:
            include_future_sprints: Include future sprints (default: False)
            max_results: Maximum number of results (default: 50)

        Returns:
            List of sprint tasks
        """
        include_future = arguments.get("include_future_sprints", False)
        max_results = arguments.get("max_results", 50)

        try:
            issues = jira_client.get_sprint_issues(
                include_future_sprints=include_future,
                max_results=max_results
            )
            formatted_issues = [jira_client.format_issue(issue) for issue in issues]

            if not formatted_issues:
                return [TextContent(
                    type="text",
                    text="No sprint tasks found."
                )]

            result = f"Found {len(formatted_issues)} sprint task(s):\n\n"
            for i, issue in enumerate(formatted_issues, 1):
                result += f"{i}. [{issue['key']}] {issue['summary']}\n"
                result += f"   Status: {issue['status']} | Priority: {issue['priority']}\n"
                if issue.get('sprint'):
                    result += f"   Sprint: {issue['sprint']}\n"
                if issue.get('story_points'):
                    result += f"   Story Points: {issue['story_points']}\n"
                result += f"   URL: {issue['url']}\n\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error getting sprint tasks: {str(e)}"
            )]


# Define tool schemas for MCP server
JIRA_TOOLS = [
    Tool(
        name="search_jira_tickets",
        description="Search for Jira tickets using JQL (Jira Query Language). Example: 'assignee=currentUser() AND status!=Done'",
        inputSchema={
            "type": "object",
            "properties": {
                "jql": {
                    "type": "string",
                    "description": "JQL query string"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default: 50)",
                    "default": 50
                }
            },
            "required": ["jql"]
        }
    ),
    Tool(
        name="create_jira_ticket",
        description="Create a new Jira ticket in a project",
        inputSchema={
            "type": "object",
            "properties": {
                "project_key": {
                    "type": "string",
                    "description": "Project key (e.g., 'PROJ')"
                },
                "summary": {
                    "type": "string",
                    "description": "Issue summary/title"
                },
                "description": {
                    "type": "string",
                    "description": "Issue description"
                },
                "issue_type": {
                    "type": "string",
                    "description": "Issue type (Task, Bug, Story, etc.)",
                    "default": "Task"
                }
            },
            "required": ["project_key", "summary", "description"]
        }
    ),
    Tool(
        name="update_jira_ticket",
        description="Update an existing Jira ticket",
        inputSchema={
            "type": "object",
            "properties": {
                "issue_key": {
                    "type": "string",
                    "description": "Issue key (e.g., 'PROJ-123')"
                },
                "summary": {
                    "type": "string",
                    "description": "New summary"
                },
                "description": {
                    "type": "string",
                    "description": "New description"
                }
            },
            "required": ["issue_key"]
        }
    ),
    Tool(
        name="add_jira_comment",
        description="Add a comment to a Jira ticket",
        inputSchema={
            "type": "object",
            "properties": {
                "issue_key": {
                    "type": "string",
                    "description": "Issue key (e.g., 'PROJ-123')"
                },
                "comment": {
                    "type": "string",
                    "description": "Comment text"
                }
            },
            "required": ["issue_key", "comment"]
        }
    ),
    Tool(
        name="get_my_sprint_tasks",
        description="Get Jira tasks assigned to me in active sprints",
        inputSchema={
            "type": "object",
            "properties": {
                "include_future_sprints": {
                    "type": "boolean",
                    "description": "Include future sprints (default: False)",
                    "default": False
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default: 50)",
                    "default": 50
                }
            }
        }
    )
]
