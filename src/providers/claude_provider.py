"""
Claude Agent Provider

Implements the agent provider interface using Claude's Agent SDK with MCP and Skills support.
"""

from claude_agent_sdk import Agent, AgentConfig
from .base import BaseAgentProvider
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..config import Config


class ClaudeAgentProvider(BaseAgentProvider):
    """
    Claude implementation of the agent provider

    Uses Claude Agent SDK with:
    - MCP servers for Jira/Confluence tools
    - Skills for domain knowledge
    - Claude models for intelligence
    """

    def __init__(self, config: "Config", mcp_server_path: str, skills_dir: str):
        """
        Initialize Claude agent provider

        Args:
            config: Application configuration
            mcp_server_path: Path to MCP server script
            skills_dir: Path to skills directory
        """
        self.config = config
        self.mcp_server_path = mcp_server_path
        self.skills_dir = skills_dir

        # Determine model name
        model_name = config.model_name if config.model_name else "claude-3-5-sonnet-20241022"

        # Create agent configuration
        self.agent_config = AgentConfig(
            # Anthropic API key
            api_key=config.anthropic_api_key,

            # Model selection
            model=model_name,

            # MCP server configuration
            mcp_servers=[
                f"stdio://python {self.mcp_server_path}"
            ],

            # Skills directory
            skills_dir=str(self.skills_dir),

            # System prompt
            system_prompt=self._get_system_prompt()
        )

        # Initialize the Claude Agent SDK
        self.agent = Agent(self.agent_config)

    def chat(self, message: str) -> str:
        """
        Send a message to Claude and get a response

        Args:
            message: User's message

        Returns:
            Claude's response
        """
        try:
            response = self.agent.chat(message)
            return response
        except Exception as e:
            return f"Error: {str(e)}"

    def get_provider_name(self) -> str:
        """
        Get the provider name

        Returns:
            "claude"
        """
        return "claude"
