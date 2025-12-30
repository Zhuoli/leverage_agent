"""
Base provider interface for agent implementations

This module defines the abstract base class that all agent providers must implement.
"""

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..config import Config


class BaseAgentProvider(ABC):
    """Abstract base class for agent providers (Claude, OpenAI, etc.)"""

    @abstractmethod
    def __init__(self, config: "Config", mcp_server_path: str, skills_dir: str):
        """
        Initialize the agent provider

        Args:
            config: Application configuration
            mcp_server_path: Path to MCP server script
            skills_dir: Path to skills directory
        """
        pass

    @abstractmethod
    def chat(self, message: str) -> str:
        """
        Send a message to the agent and get a response

        Args:
            message: User's message

        Returns:
            Agent's response as a string
        """
        pass

    @abstractmethod
    def get_provider_name(self) -> str:
        """
        Get the name of this provider

        Returns:
            Provider name (e.g., "claude", "openai")
        """
        pass

    def _get_system_prompt(self) -> str:
        """
        Get the system prompt for the agent

        This is shared across providers but can be overridden if needed.

        Returns:
            System prompt string
        """
        return """You are an AI assistant helping users interact with their Jira and Confluence instances.

You have access to:
1. **MCP Tools** for Jira and Confluence operations
2. **Skills** containing best practices for:
   - Jira workflow management
   - Confluence documentation
   - Trading domain context

**Your Capabilities:**

Jira:
- Search tickets using JQL
- Get sprint tasks
- Create and update tickets
- Add comments
- Analyze priorities and blockers

Confluence:
- Search pages
- Read page content
- Create and update pages
- Get recent updates
- Suggest documentation structure

**Guidelines:**

1. **Use MCP Tools** to interact with Jira/Confluence
2. **Reference Skills** for best practices and patterns
3. **Provide context** from the trading domain when relevant
4. **Be proactive**: Suggest improvements based on best practices
5. **Format output** clearly with ticket keys, links, and summaries

When users ask about their work:
- Fetch their current sprint tasks
- Highlight priorities and blockers
- Suggest next actions based on ticket status

When users search documentation:
- Find relevant Confluence pages
- Summarize key information
- Link to related pages

Always be helpful, accurate, and follow industry best practices from the Skills."""
