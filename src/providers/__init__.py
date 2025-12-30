"""
Agent Provider Factory

This module provides a factory function to create the appropriate agent provider
based on the configuration.
"""

from typing import TYPE_CHECKING
from .base import BaseAgentProvider
from .claude_provider import ClaudeAgentProvider
from .openai_provider import OpenAIAgentProvider

if TYPE_CHECKING:
    from ..config import Config


def create_agent_provider(
    config: "Config",
    mcp_server_path: str,
    skills_dir: str
) -> BaseAgentProvider:
    """
    Factory function to create the appropriate agent provider

    Args:
        config: Application configuration
        mcp_server_path: Path to MCP server script
        skills_dir: Path to skills directory

    Returns:
        An instance of BaseAgentProvider (either Claude or OpenAI)

    Raises:
        ValueError: If the configured provider is not supported
    """
    provider = config.model_provider.lower()

    if provider == "claude":
        return ClaudeAgentProvider(config, mcp_server_path, skills_dir)
    elif provider == "openai":
        return OpenAIAgentProvider(config, mcp_server_path, skills_dir)
    else:
        raise ValueError(
            f"Unknown provider: {provider}. Supported providers: claude, openai"
        )


__all__ = [
    "BaseAgentProvider",
    "ClaudeAgentProvider",
    "OpenAIAgentProvider",
    "create_agent_provider",
]
