"""MCP Tools for Confluence operations"""

from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.types import Tool, TextContent
from .confluence_client import ConfluenceClient
from .config import get_config

# Initialize Confluence client
config = get_config()
confluence_client = ConfluenceClient(config)


def register_confluence_tools(server: Server):
    """Register all Confluence MCP tools with the server"""

    @server.call_tool()
    async def search_confluence_pages(arguments: dict) -> List[TextContent]:
        """
        Search for Confluence pages using CQL query

        Args:
            query: Search query text
            space_key: Optional space key to search in
            max_results: Maximum number of results (default: 20)

        Returns:
            List of matching Confluence pages
        """
        query = arguments.get("query", "")
        space_key = arguments.get("space_key")
        max_results = arguments.get("max_results", 20)

        if not query:
            return [TextContent(
                type="text",
                text="Error: 'query' parameter is required"
            )]

        try:
            pages = confluence_client.search_confluence_pages(
                query=query,
                space_key=space_key,
                max_results=max_results
            )
            formatted_pages = [confluence_client.format_page(page) for page in pages]

            if not formatted_pages:
                return [TextContent(
                    type="text",
                    text="No pages found matching the query."
                )]

            result = f"Found {len(formatted_pages)} page(s):\n\n"
            for i, page in enumerate(formatted_pages, 1):
                result += f"{i}. {page['title']}\n"
                result += f"   Space: {page['space']} | Version: {page['version']}\n"
                if page.get('last_modified'):
                    result += f"   Last Modified: {page['last_modified']}\n"
                result += f"   URL: {page['url']}\n\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error searching Confluence pages: {str(e)}"
            )]

    @server.call_tool()
    async def create_confluence_page(arguments: dict) -> List[TextContent]:
        """
        Create a new Confluence page

        Args:
            title: Page title
            body: Page content in HTML format
            space_key: Optional space key (uses default if not provided)
            parent_id: Optional parent page ID

        Returns:
            Created page information
        """
        title = arguments.get("title", "")
        body = arguments.get("body", "")
        space_key = arguments.get("space_key")
        parent_id = arguments.get("parent_id")

        if not all([title, body]):
            return [TextContent(
                type="text",
                text="Error: 'title' and 'body' are required"
            )]

        try:
            page = confluence_client.create_confluence_page(
                title=title,
                body=body,
                space_key=space_key,
                parent_id=parent_id
            )

            page_id = page.get('id', 'Unknown')
            url = f"{config.confluence_url}/pages/viewpage.action?pageId={page_id}"

            result = f"✓ Created Confluence page: {title}\n"
            result += f"Space: {page.get('space', {}).get('key', 'Unknown')}\n"
            result += f"URL: {url}\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error creating Confluence page: {str(e)}"
            )]

    @server.call_tool()
    async def update_confluence_page(arguments: dict) -> List[TextContent]:
        """
        Update an existing Confluence page

        Args:
            page_id: Page ID
            title: Optional new title
            body: Optional new content in HTML format

        Returns:
            Updated page information
        """
        page_id = arguments.get("page_id", "")
        title = arguments.get("title")
        body = arguments.get("body")

        if not page_id:
            return [TextContent(
                type="text",
                text="Error: 'page_id' is required"
            )]

        if not title and not body:
            return [TextContent(
                type="text",
                text="Error: At least one of 'title' or 'body' must be provided"
            )]

        try:
            page = confluence_client.update_confluence_page(
                page_id=page_id,
                title=title,
                body=body
            )

            formatted = confluence_client.format_page(page)

            result = f"✓ Updated Confluence page: {formatted['title']}\n"
            result += f"Space: {formatted['space']} | Version: {formatted['version']}\n"
            result += f"URL: {formatted['url']}\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error updating Confluence page: {str(e)}"
            )]

    @server.call_tool()
    async def get_confluence_page_content(arguments: dict) -> List[TextContent]:
        """
        Get the full content of a Confluence page

        Args:
            page_id: Page ID (required if title not provided)
            title: Page title (required if page_id not provided)
            space_key: Space key (required if using title)

        Returns:
            Page content
        """
        page_id = arguments.get("page_id")
        title = arguments.get("title")
        space_key = arguments.get("space_key")

        if not page_id and not title:
            return [TextContent(
                type="text",
                text="Error: Either 'page_id' or 'title' must be provided"
            )]

        try:
            content = confluence_client.get_page_content(
                page_id=page_id,
                title=title,
                space_key=space_key
            )

            # Also get page metadata
            if page_id:
                page = confluence_client.get_page_by_id(page_id)
            else:
                page = confluence_client.get_page_by_title(title, space_key)

            if page:
                formatted = confluence_client.format_page(page)
                result = f"Page: {formatted['title']}\n"
                result += f"Space: {formatted['space']} | Version: {formatted['version']}\n"
                result += f"URL: {formatted['url']}\n\n"
                result += f"Content:\n{content}\n"
            else:
                result = f"Content:\n{content}\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error getting page content: {str(e)}"
            )]

    @server.call_tool()
    async def get_recent_confluence_pages(arguments: dict) -> List[TextContent]:
        """
        Get recently updated Confluence pages

        Args:
            space_key: Optional space key (uses default if not provided)
            max_results: Maximum number of results (default: 10)

        Returns:
            List of recent pages
        """
        space_key = arguments.get("space_key")
        max_results = arguments.get("max_results", 10)

        try:
            pages = confluence_client.get_recent_pages(
                space_key=space_key,
                max_results=max_results
            )
            formatted_pages = [confluence_client.format_page(page) for page in pages]

            if not formatted_pages:
                return [TextContent(
                    type="text",
                    text="No recent pages found."
                )]

            result = f"Found {len(formatted_pages)} recent page(s):\n\n"
            for i, page in enumerate(formatted_pages, 1):
                result += f"{i}. {page['title']}\n"
                result += f"   Space: {page['space']} | Version: {page['version']}\n"
                if page.get('last_modified'):
                    result += f"   Last Modified: {page['last_modified']}\n"
                result += f"   URL: {page['url']}\n\n"

            return [TextContent(type="text", text=result)]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"Error getting recent pages: {str(e)}"
            )]


# Define tool schemas for MCP server
CONFLUENCE_TOOLS = [
    Tool(
        name="search_confluence_pages",
        description="Search for Confluence pages using text query",
        inputSchema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search query text"
                },
                "space_key": {
                    "type": "string",
                    "description": "Optional space key to search in"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default: 20)",
                    "default": 20
                }
            },
            "required": ["query"]
        }
    ),
    Tool(
        name="create_confluence_page",
        description="Create a new Confluence page in a space",
        inputSchema={
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Page title"
                },
                "body": {
                    "type": "string",
                    "description": "Page content in HTML format"
                },
                "space_key": {
                    "type": "string",
                    "description": "Optional space key (uses default if not provided)"
                },
                "parent_id": {
                    "type": "string",
                    "description": "Optional parent page ID"
                }
            },
            "required": ["title", "body"]
        }
    ),
    Tool(
        name="update_confluence_page",
        description="Update an existing Confluence page",
        inputSchema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "Page ID"
                },
                "title": {
                    "type": "string",
                    "description": "New page title"
                },
                "body": {
                    "type": "string",
                    "description": "New page content in HTML format"
                }
            },
            "required": ["page_id"]
        }
    ),
    Tool(
        name="get_confluence_page_content",
        description="Get the full content of a Confluence page by ID or title",
        inputSchema={
            "type": "object",
            "properties": {
                "page_id": {
                    "type": "string",
                    "description": "Page ID"
                },
                "title": {
                    "type": "string",
                    "description": "Page title"
                },
                "space_key": {
                    "type": "string",
                    "description": "Space key (required if using title)"
                }
            }
        }
    ),
    Tool(
        name="get_recent_confluence_pages",
        description="Get recently updated Confluence pages",
        inputSchema={
            "type": "object",
            "properties": {
                "space_key": {
                    "type": "string",
                    "description": "Optional space key (uses default if not provided)"
                },
                "max_results": {
                    "type": "integer",
                    "description": "Maximum number of results (default: 10)",
                    "default": 10
                }
            }
        }
    )
]
