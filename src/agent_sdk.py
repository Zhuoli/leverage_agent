"""
Refactored Atlassian Agent using Claude Agent SDK

This agent uses the Model Context Protocol (MCP) server for Jira/Confluence access
and Claude Skills for workflow knowledge.
"""

import os
from pathlib import Path
from typing import Optional
from claude_agent_sdk import Agent, AgentConfig
from .config import Config


class AtlassianAgentSDK:
    """
    AI Agent for Atlassian (Jira/Confluence) using Claude Agent SDK

    This agent:
    - Connects to MCP server for Jira/Confluence tools
    - Loads Skills for workflow best practices
    - Uses Claude to orchestrate interactions
    """

    def __init__(self, config: Config, mcp_server_path: Optional[str] = None):
        """
        Initialize the Atlassian Agent with SDK

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
        self.skills_dir = Path(__file__).parent.parent / ".claude" / "skills"

        # Create agent configuration
        self.agent_config = AgentConfig(
            # Anthropic API key
            api_key=config.anthropic_api_key,

            # Model selection
            model="claude-3-5-sonnet-20241022",

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

        print(f"✓ Atlassian Agent initialized")
        print(f"  - MCP Server: {self.mcp_server_path}")
        print(f"  - Skills: {self.skills_dir}")
        print(f"  - User: {config.user_email}")

    def _get_system_prompt(self) -> str:
        """Get the system prompt for the agent"""
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

    def chat(self, user_message: str) -> str:
        """
        Send a message to the agent and get a response

        Args:
            user_message: User's message

        Returns:
            Agent's response
        """
        try:
            response = self.agent.chat(user_message)
            return response
        except Exception as e:
            return f"Error: {str(e)}"

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
