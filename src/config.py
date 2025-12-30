import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from typing import Optional

load_dotenv()


class Config(BaseModel):
    """Application configuration"""

    # Model Provider Configuration
    model_provider: str = Field(
        default_factory=lambda: os.getenv("MODEL_PROVIDER", "claude")
    )
    model_name: Optional[str] = Field(
        default_factory=lambda: os.getenv("MODEL_NAME", None)
    )

    # Anthropic Configuration
    anthropic_api_key: str = Field(
        default_factory=lambda: os.getenv("ANTHROPIC_API_KEY", "")
    )

    # OpenAI Configuration
    openai_api_key: str = Field(
        default_factory=lambda: os.getenv("OPENAI_API_KEY", "")
    )

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

    # User Configuration (optional - defaults to username if not set)
    user_display_name: str = Field(
        default_factory=lambda: os.getenv("USER_DISPLAY_NAME", "")
    )
    user_email: str = Field(
        default_factory=lambda: os.getenv("USER_EMAIL", "")
    )

    def validate_required_fields(self):
        """Validate that all required fields are set"""
        errors = []

        # Validate provider-specific API key
        provider = self.model_provider.lower()
        if provider == "claude":
            if not self.anthropic_api_key:
                errors.append("ANTHROPIC_API_KEY is required when using Claude provider")
        elif provider == "openai":
            if not self.openai_api_key:
                errors.append("OPENAI_API_KEY is required when using OpenAI provider")
        else:
            errors.append(f"Unknown MODEL_PROVIDER: {provider}. Supported: claude, openai")

        # Validate common fields
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
    """Get application configuration"""
    config = Config()
    config.validate_required_fields()
    return config
