import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv()


class Config(BaseModel):
    """MCP Server configuration"""

    # Jira Configuration
    jira_url: str = Field(
        default_factory=lambda: os.getenv("JIRA_URL", "")
    )
    jira_username: str = Field(
        default_factory=lambda: os.getenv("JIRA_USERNAME", "")
    )
    jira_api_token: str = Field(
        default_factory=lambda: os.getenv("JIRA_API_TOKEN", "")
    )

    # Confluence Configuration
    confluence_url: str = Field(
        default_factory=lambda: os.getenv("CONFLUENCE_URL", "")
    )
    confluence_username: str = Field(
        default_factory=lambda: os.getenv("CONFLUENCE_USERNAME", "")
    )
    confluence_api_token: str = Field(
        default_factory=lambda: os.getenv("CONFLUENCE_API_TOKEN", "")
    )
    confluence_space_key: str = Field(
        default_factory=lambda: os.getenv("CONFLUENCE_SPACE_KEY", "")
    )

    # User Configuration
    user_email: str = Field(
        default_factory=lambda: os.getenv("USER_EMAIL", "")
    )
    user_display_name: str = Field(
        default_factory=lambda: os.getenv("USER_DISPLAY_NAME", "")
    )

    # Server Configuration
    mcp_server_port: int = Field(
        default_factory=lambda: int(os.getenv("MCP_SERVER_PORT", "8000"))
    )

    def validate_required_fields(self):
        """Validate that all required fields are set"""
        errors = []

        if not self.jira_url:
            errors.append("JIRA_URL is required")
        if not self.jira_username:
            errors.append("JIRA_USERNAME is required")
        if not self.jira_api_token:
            errors.append("JIRA_API_TOKEN is required")
        if not self.confluence_url:
            errors.append("CONFLUENCE_URL is required")
        if not self.confluence_username:
            errors.append("CONFLUENCE_USERNAME is required")
        if not self.confluence_api_token:
            errors.append("CONFLUENCE_API_TOKEN is required")

        if errors:
            raise ValueError(f"Configuration errors: {', '.join(errors)}")


def get_config() -> Config:
    """Get MCP server configuration"""
    config = Config()
    config.validate_required_fields()
    return config
