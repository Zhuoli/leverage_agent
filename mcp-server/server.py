#!/usr/bin/env python3
"""
Atlassian MCP Server

This server provides MCP tools for interacting with Jira and Confluence.
It exposes tools that can be used by AI agents through the Model Context Protocol.
"""

import asyncio
import logging
from mcp.server import Server
from mcp.server.stdio import stdio_server

from atlassian_mcp.jira_tools import register_jira_tools, JIRA_TOOLS
from atlassian_mcp.confluence_tools import register_confluence_tools, CONFLUENCE_TOOLS
from atlassian_mcp.config import get_config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def create_server() -> Server:
    """Create and configure the MCP server"""

    # Validate configuration
    try:
        config = get_config()
        logger.info("Configuration validated successfully")
    except Exception as e:
        logger.error(f"Configuration error: {e}")
        raise

    # Create MCP server instance
    server = Server("atlassian-mcp-server")

    # Register all tools
    logger.info("Registering Jira tools...")
    register_jira_tools(server)

    logger.info("Registering Confluence tools...")
    register_confluence_tools(server)

    # List all available tools
    @server.list_tools()
    async def list_tools():
        """List all available MCP tools"""
        all_tools = JIRA_TOOLS + CONFLUENCE_TOOLS
        logger.info(f"Listing {len(all_tools)} available tools")
        return all_tools

    logger.info(f"MCP Server initialized with {len(JIRA_TOOLS)} Jira tools and {len(CONFLUENCE_TOOLS)} Confluence tools")

    return server


async def main():
    """Main entry point for the MCP server"""
    logger.info("Starting Atlassian MCP Server...")

    try:
        server = create_server()

        # Run the server using stdio transport
        async with stdio_server() as (read_stream, write_stream):
            logger.info("Server running on stdio transport")
            await server.run(
                read_stream,
                write_stream,
                server.create_initialization_options()
            )
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}", exc_info=True)
        raise


if __name__ == "__main__":
    asyncio.run(main())
