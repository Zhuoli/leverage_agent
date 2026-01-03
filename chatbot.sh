#!/bin/bash
#
# Atlassian AI Assistant Launcher
# Usage: ./chatbot.sh [command] [options]
#

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Check if build exists, if not build first
check_build() {
    if [ ! -f "dist/cli/index.js" ]; then
        echo -e "${YELLOW}Building project first...${NC}"
        npm run build
        echo -e "${GREEN}Build complete!${NC}\n"
    fi
}

# Show main help
show_help() {
    echo -e "${BLUE}Atlassian AI Assistant v3.0.0${NC}"
    echo ""
    echo -e "Usage: ${GREEN}./chatbot.sh${NC} <command> [options]"
    echo ""
    echo -e "${CYAN}Commands:${NC}"
    echo -e "  ${GREEN}ui${NC}              Launch the Electron desktop application"
    echo -e "  ${GREEN}cli${NC}             Launch the terminal chat assistant"
    echo -e "  ${GREEN}build${NC}           Build the project"
    echo -e "  ${GREEN}status${NC}          Show project status"
    echo -e "  ${GREEN}help${NC}            Show this help message"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ./chatbot.sh ui                    # Launch desktop app"
    echo -e "  ./chatbot.sh cli                   # Launch terminal chat"
    echo -e "  ./chatbot.sh cli --help            # Show CLI options"
    echo -e "  ./chatbot.sh cli --mcp atlassian   # Start with specific MCP"
    echo ""
    echo -e "Run ${GREEN}./chatbot.sh cli --help${NC} for CLI-specific options."
    echo ""
}

# Show CLI help
show_cli_help() {
    echo -e "${BLUE}Terminal Chat Assistant${NC}"
    echo ""
    echo -e "Usage: ${GREEN}./chatbot.sh cli${NC} [options]"
    echo ""
    echo -e "${CYAN}Options:${NC}"
    echo -e "  ${GREEN}-m, --message <msg>${NC}     Send a single message and exit"
    echo -e "  ${GREEN}--mcp <servers>${NC}         Enable specific MCP servers (comma-separated)"
    echo -e "  ${GREEN}--no-mcp${NC}                Disable all MCP servers"
    echo -e "  ${GREEN}--list-mcps${NC}             List available MCP servers"
    echo -e "  ${GREEN}--test-only${NC}             Test mode (disable MCP and Skills)"
    echo -e "  ${GREEN}--help${NC}                  Show this help message"
    echo ""
    echo -e "${CYAN}MCP Servers:${NC}"
    echo -e "  ${GREEN}atlassian${NC}               Jira & Confluence integration"
    echo -e "  ${GREEN}oci${NC}                     Oracle Cloud Infrastructure"
    echo ""
    echo -e "${CYAN}Examples:${NC}"
    echo -e "  ./chatbot.sh cli                          # Interactive chat with default MCPs"
    echo -e "  ./chatbot.sh cli --no-mcp                 # Chat without any MCPs"
    echo -e "  ./chatbot.sh cli --mcp atlassian          # Chat with Atlassian MCP only"
    echo -e "  ./chatbot.sh cli --mcp atlassian,oci      # Chat with multiple MCPs"
    echo -e "  ./chatbot.sh cli --list-mcps              # List available MCPs"
    echo -e "  ./chatbot.sh cli -m \"Show my tasks\"       # Single message mode"
    echo ""
    echo -e "${CYAN}Interactive Commands (during chat session):${NC}"
    echo -e "  ${GREEN}help${NC}                    Show help"
    echo -e "  ${GREEN}mcp${NC}                     Show MCP server status"
    echo -e "  ${GREEN}mcp enable <name>${NC}       Start an MCP server"
    echo -e "  ${GREEN}mcp disable <name>${NC}      Stop an MCP server"
    echo -e "  ${GREEN}info${NC}                    Show agent information"
    echo -e "  ${GREEN}clear${NC}                   Clear conversation history"
    echo -e "  ${GREEN}exit${NC}                    Exit the chat"
    echo ""
}

# Launch UI
launch_ui() {
    check_build
    echo -e "${BLUE}Launching Atlassian AI Assistant (Desktop)...${NC}"
    cd electron-app && npm start
}

# Launch CLI
launch_cli() {
    check_build

    # Check if --help is the first argument
    if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
        show_cli_help
        return
    fi

    echo -e "${BLUE}Starting Terminal Chat Assistant...${NC}"
    echo -e "${GREEN}Loading skills and MCP servers...${NC}"
    echo ""

    # Pass all arguments to the CLI
    node dist/cli/index.js chat "$@"
}

# Build project
build_project() {
    echo -e "${BLUE}Building project...${NC}"
    npm run build
    echo -e "${GREEN}Build complete!${NC}"
}

# Show status
show_status() {
    echo -e "${BLUE}Project Status:${NC}"
    echo ""

    # Build status
    echo "Build Status:"
    if [ -d "dist" ]; then
        echo -e "  ${GREEN}✓${NC} dist/ exists (compiled)"
    else
        echo -e "  ${YELLOW}✗${NC} dist/ not found (run './chatbot.sh build')"
    fi

    if [ -f "dist/cli/index.js" ]; then
        echo -e "  ${GREEN}✓${NC} CLI compiled"
    else
        echo -e "  ${YELLOW}✗${NC} CLI not compiled"
    fi

    echo ""

    # Config status
    echo "Configuration:"
    if [ -f ".env" ]; then
        echo -e "  ${GREEN}✓${NC} .env exists"
    else
        echo -e "  ${YELLOW}○${NC} .env missing (run 'cp .env.example .env')"
    fi

    echo ""

    # Skills status
    echo "Skills:"
    if [ -d ".claude/skills" ]; then
        skill_count=$(ls -1 .claude/skills/ 2>/dev/null | wc -l | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} Skills directory exists (${skill_count} skills)"
    else
        echo -e "  ${YELLOW}○${NC} No skills directory"
    fi

    echo ""
}

# Main command handler
case "${1:-}" in
    ui)
        launch_ui
        ;;
    cli)
        shift  # Remove 'cli' from arguments
        launch_cli "$@"
        ;;
    build)
        build_project
        ;;
    status)
        show_status
        ;;
    help|--help|-h|"")
        show_help
        ;;
    *)
        echo -e "${YELLOW}Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
