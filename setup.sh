#!/bin/bash

echo "====================================="
echo "Atlassian AI Assistant Setup"
echo "====================================="
echo ""

echo "Checking prerequisites..."

if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed. Please install Python 3.9 or higher."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "Found Python $PYTHON_VERSION"

echo ""
echo "Checking for uv..."
if ! command -v uv &> /dev/null; then
    echo "uv is not installed. Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

UV_VERSION=$(uv --version)
echo "Found $UV_VERSION"

echo ""
echo "Creating Python virtual environment with uv..."
uv venv

echo "Installing Python dependencies with uv..."
uv sync

echo ""
echo "Setting up environment configuration..."
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo ""
    echo "IMPORTANT: Please edit .env and configure:"
    echo "  - ANTHROPIC_API_KEY"
    echo "  - JIRA_URL, JIRA_USERNAME, JIRA_API_TOKEN"
    echo "  - CONFLUENCE_URL, CONFLUENCE_USERNAME, CONFLUENCE_API_TOKEN"
    echo ""
else
    echo ".env file already exists, skipping..."
fi

echo ""
echo "====================================="
echo "Setup Complete!"
echo "====================================="
echo ""
echo "Next steps:"
echo "1. Edit .env file with your credentials:"
echo "   - Get Anthropic API key from https://console.anthropic.com/"
echo "   - Create Personal Access Tokens in your Atlassian instance"
echo "   - See README.md for detailed authentication instructions"
echo ""
echo "2. Run the agent (uv will handle the virtual environment automatically):"
echo "   uv run python -m src.main jira                    # Get Jira issues"
echo "   uv run python -m src.main confluence search \"query\"  # Search Confluence"
echo ""
echo "3. Or use the Makefile for convenience:"
echo "   make chat                # Start interactive chat"
echo "   make cli-jira            # Get Jira sprint tasks"
echo "   make help                # See all available commands"
echo ""
echo "4. Get help:"
echo "   uv run python -m src.main --help"
echo ""
