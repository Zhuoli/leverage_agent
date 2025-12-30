"""
OpenAI Agent Provider

Implements the agent provider interface using OpenAI's Agents SDK with MCP and Skills support.
"""

import asyncio
import os
from typing import TYPE_CHECKING
from .base import BaseAgentProvider

# OpenAI imports - will be available after installing openai-agents
try:
    from agents import Agent, Runner
    from agents.mcp import MCPServerStdio
except ImportError:
    # Graceful fallback if openai-agents not installed yet
    Agent = None
    Runner = None
    MCPServerStdio = None

if TYPE_CHECKING:
    from ..config import Config


class OpenAIAgentProvider(BaseAgentProvider):
    """
    OpenAI implementation of the agent provider

    Uses OpenAI Agents SDK with:
    - MCP servers for Jira/Confluence tools (via stdio transport)
    - Skills for domain knowledge
    - OpenAI models for intelligence
    """

    def __init__(self, config: "Config", mcp_server_path: str, skills_dir: str):
        """
        Initialize OpenAI agent provider

        Args:
            config: Application configuration
            mcp_server_path: Path to MCP server script
            skills_dir: Path to skills directory
        """
        if Agent is None or Runner is None or MCPServerStdio is None:
            raise ImportError(
                "openai-agents package not installed. "
                "Install it with: uv pip install openai-agents"
            )

        self.config = config
        self.mcp_server_path = mcp_server_path
        self.skills_dir = skills_dir

        # Determine model name
        self.model_name = config.model_name if config.model_name else "gpt-4"

        # Set OpenAI API key in environment (required by openai-agents)
        os.environ["OPENAI_API_KEY"] = config.openai_api_key

        # Store system prompt
        self.system_prompt = self._get_system_prompt()

        # MCP server will be initialized per-request (async context manager pattern)
        self.mcp_params = {
            "command": "python",
            "args": [self.mcp_server_path]
        }

    def chat(self, message: str) -> str:
        """
        Send a message to OpenAI and get a response

        Args:
            message: User's message

        Returns:
            OpenAI's response

        Note:
            This wraps the async implementation to provide a synchronous interface
        """
        try:
            # Run the async chat method in a synchronous context
            return asyncio.run(self._async_chat(message))
        except Exception as e:
            return f"Error: {str(e)}"

    async def _async_chat(self, message: str) -> str:
        """
        Async implementation of chat

        Args:
            message: User's message

        Returns:
            OpenAI's response
        """
        # Initialize MCP server with async context manager
        async with MCPServerStdio(params=self.mcp_params) as mcp_server:
            # Create agent with MCP server
            agent = Agent(
                name="Atlassian Assistant",
                instructions=self.system_prompt,
                model=self.model_name,
                mcp_servers=[mcp_server],
                # Note: OpenAI SDK skills loading may differ from Claude
                # We'll load skills via MCP tools for now
            )

            # Run the agent with the user's message
            result = await Runner.run(agent, message)

            # Extract text from result
            # The result structure may vary, adjust as needed
            if hasattr(result, 'text'):
                return result.text
            elif hasattr(result, 'content'):
                return str(result.content)
            else:
                return str(result)

    def get_provider_name(self) -> str:
        """
        Get the provider name

        Returns:
            "openai"
        """
        return "openai"
