"""
Atlassian Agent using Multi-Provider Architecture

This agent uses the Model Context Protocol (MCP) server for Jira/Confluence access
and Skills for workflow knowledge. Supports both Claude and OpenAI models.
"""

import os
from pathlib import Path
from typing import Optional
from .config import Config
from .providers import create_agent_provider


class AtlassianAgentSDK:
    """
    AI Agent for Atlassian (Jira/Confluence) using Multi-Provider Architecture

    This agent:
    - Supports both Claude and OpenAI models
    - Connects to MCP server for Jira/Confluence tools
    - Loads Skills for workflow best practices
    - Uses provider-specific SDKs to orchestrate interactions
    """

    def __init__(self, config: Config, mcp_server_path: Optional[str] = None):
        """
        Initialize the Atlassian Agent with Multi-Provider support

        Args:
            config: Application configuration
            mcp_server_path: Path to MCP server (defaults to ../mcp-server/server.py)
        """
        self.config = config

        # Determine MCP server path
        if not mcp_server_path:
            project_root = Path(__file__).parent.parent
            mcp_server_path = project_root / "mcp-server" / "server.py"

        self.mcp_server_path = str(mcp_server_path)

        # Determine Skills directory
        self.skills_dir = str(Path(__file__).parent.parent / ".claude" / "skills")

        # Create appropriate provider using factory
        self.provider = create_agent_provider(
            config,
            self.mcp_server_path,
            self.skills_dir
        )

        print(f"✓ Atlassian Agent initialized")
        print(f"  - Provider: {self.provider.get_provider_name()}")
        print(f"  - Model: {config.model_name or 'default'}")
        print(f"  - MCP Server: {self.mcp_server_path}")
        print(f"  - Skills: {self.skills_dir}")
        print(f"  - User: {config.user_email}")

    def chat(self, user_message: str) -> str:
        """
        Send a message to the agent and get a response

        Args:
            user_message: User's message

        Returns:
            Agent's response
        """
        return self.provider.chat(user_message)

    def start_interactive_session(self):
        """
        Start an interactive chat session with the agent
        """
        print("\n" + "=" * 60)
        print("ATLASSIAN AI ASSISTANT (Agent SDK)")
        print("=" * 60)
        print("\nCommands:")
        print("  - Type your question or request")
        print("  - 'quit' or 'exit' to end session")
        print("  - 'help' for examples")
        print("\nExamples:")
        print("  - Show me my sprint tasks")
        print("  - Search for API documentation in Confluence")
        print("  - What are my high priority tasks?")
        print("  - Create a ticket for fixing the login bug")
        print("=" * 60 + "\n")

        while True:
            try:
                # Get user input
                user_input = input("\n> ").strip()

                # Check for exit commands
                if user_input.lower() in ['quit', 'exit', 'q']:
                    print("\nGoodbye!")
                    break

                # Check for help
                if user_input.lower() == 'help':
                    self._print_help()
                    continue

                # Skip empty input
                if not user_input:
                    continue

                # Send message to agent
                print("\nThinking...")
                response = self.chat(user_input)

                # Print response
                print("\n" + "-" * 60)
                print(response)
                print("-" * 60)

            except KeyboardInterrupt:
                print("\n\nSession interrupted. Goodbye!")
                break
            except Exception as e:
                print(f"\nError: {e}")

    def _print_help(self):
        """Print help information"""
        help_text = """
Available Commands & Examples:

📋 JIRA QUERIES:
  - "Show me my sprint tasks"
  - "What are my high priority bugs?"
  - "Search for tickets about authentication"
  - "What tickets are blocked?"
  - "Show me recently updated issues"

✏️ JIRA ACTIONS:
  - "Create a task for implementing user API"
  - "Add a comment to PROJ-123 about progress"
  - "Update PROJ-456 with new status"

📚 CONFLUENCE QUERIES:
  - "Search for API documentation"
  - "Find pages about deployment process"
  - "Show me recent updates in our team space"
  - "Read the page titled 'Getting Started Guide'"

📝 CONFLUENCE ACTIONS:
  - "Create a page documenting the new feature"
  - "Update the API guide with new endpoints"

🤖 ANALYSIS:
  - "Analyze my sprint workload"
  - "What should I prioritize this week?"
  - "Summarize the deployment documentation"

Type 'quit' or 'exit' to end the session.
"""
        print(help_text)

    # Convenience methods for common workflows

    def get_my_sprint_tasks(self) -> str:
        """Get sprint tasks assigned to the user"""
        return self.chat("Show me my current sprint tasks")

    def search_confluence_docs(self, query: str) -> str:
        """Search Confluence documentation"""
        return self.chat(f"Search Confluence for: {query}")

    def analyze_workload(self) -> str:
        """Analyze current workload and priorities"""
        return self.chat("Analyze my current workload and suggest priorities")

    def get_high_priority_tasks(self) -> str:
        """Get high priority tasks"""
        return self.chat("Show me my high priority tasks")

    def search_jira_tickets(self, jql: str) -> str:
        """Search Jira using JQL"""
        return self.chat(f"Search Jira with this JQL: {jql}")
