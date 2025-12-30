# Atlassian AI Assistant - Makefile
# Self-explanatory commands for both Python CLI and Electron Desktop App

.PHONY: help
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

##@ General

help: ## Show this help message
	@echo "$(BLUE)Atlassian AI Assistant - Available Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

check-deps: ## Check if required dependencies are installed
	@echo "$(BLUE)Checking dependencies...$(NC)"
	@command -v python3 >/dev/null 2>&1 || { echo "$(RED)Python 3 is required but not installed$(NC)"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Node.js is required but not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is required but not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✓ All dependencies are installed$(NC)"
	@echo "  Python: $$(python3 --version)"
	@echo "  Node.js: $$(node --version)"
	@echo "  npm: $$(npm --version)"

##@ Setup & Installation

setup: setup-python setup-electron setup-mcp ## Setup everything (Python CLI, Electron app, MCP server)
	@echo "$(GREEN)✓ Complete setup finished!$(NC)"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Configure: make config"
	@echo "  2. Run CLI:   make cli-jira"
	@echo "  3. Run Chat:  make chat"
	@echo "  4. Run App:   make app"

setup-python: check-deps ## Setup Python CLI environment
	@echo "$(BLUE)Setting up Python environment...$(NC)"
	@test -d venv || python3 -m venv venv
	@. venv/bin/activate && pip install --upgrade pip
	@. venv/bin/activate && pip install -r requirements.txt
	@echo "$(GREEN)✓ Python environment ready$(NC)"

setup-electron: check-deps ## Setup Electron desktop app
	@echo "$(BLUE)Setting up Electron app...$(NC)"
	@cd electron-app && npm install
	@echo "$(GREEN)✓ Electron app ready$(NC)"

setup-mcp: check-deps ## Setup MCP server
	@echo "$(BLUE)Setting up MCP server...$(NC)"
	@test -d venv || python3 -m venv venv
	@. venv/bin/activate && pip install -r mcp-server/requirements.txt
	@echo "$(GREEN)✓ MCP server ready$(NC)"

config: ## Configure credentials (creates .env files)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)Created .env for Python CLI$(NC)"; \
		echo "$(YELLOW)Please edit .env with your credentials$(NC)"; \
	else \
		echo "$(GREEN).env already exists$(NC)"; \
	fi
	@if [ ! -f electron-app/.env ]; then \
		cp electron-app/.env.example electron-app/.env; \
		echo "$(YELLOW)Created .env for Electron app$(NC)"; \
		echo "$(YELLOW)Please edit electron-app/.env with your credentials$(NC)"; \
	else \
		echo "$(GREEN)electron-app/.env already exists$(NC)"; \
	fi
	@if [ ! -f mcp-server/.env ]; then \
		cp mcp-server/.env.example mcp-server/.env; \
		echo "$(YELLOW)Created .env for MCP server$(NC)"; \
		echo "$(YELLOW)Please edit mcp-server/.env with your credentials$(NC)"; \
	else \
		echo "$(GREEN)mcp-server/.env already exists$(NC)"; \
	fi

##@ Python CLI Commands

cli-jira: ## Get your Jira sprint tasks (Python CLI)
	@echo "$(BLUE)Fetching Jira sprint tasks...$(NC)"
	@. venv/bin/activate && python -m src.main jira

cli-jira-all: ## Get all your Jira issues (Python CLI)
	@echo "$(BLUE)Fetching all Jira issues...$(NC)"
	@. venv/bin/activate && python -m src.main jira --all-issues

cli-confluence-search: ## Search Confluence (usage: make cli-confluence-search QUERY="your search")
	@echo "$(BLUE)Searching Confluence...$(NC)"
	@. venv/bin/activate && python -m src.main confluence search "$(QUERY)"

cli-confluence-recent: ## Get recent Confluence pages (Python CLI)
	@echo "$(BLUE)Fetching recent Confluence pages...$(NC)"
	@. venv/bin/activate && python -m src.main confluence recent

cli-help: ## Show Python CLI help
	@. venv/bin/activate && python -m src.main --help

##@ Agent SDK & MCP Commands

chat: ## Start interactive chat session with Agent SDK (MCP + Skills)
	@echo "$(BLUE)Starting interactive chat session...$(NC)"
	@. venv/bin/activate && python -m src.main chat

chat-message: ## Send a single message to Agent SDK (usage: make chat-message MSG="your message")
	@echo "$(BLUE)Sending message to agent...$(NC)"
	@. venv/bin/activate && python -m src.main chat --message "$(MSG)"

run-mcp-server: ## Run MCP server standalone (for testing)
	@echo "$(BLUE)Starting MCP server...$(NC)"
	@cd mcp-server && . ../venv/bin/activate && python server.py

test-mcp-tools: ## Test MCP tools (requires MCP server running)
	@echo "$(BLUE)Testing MCP tools...$(NC)"
	@echo "Note: This requires the MCP server to be running"
	@. venv/bin/activate && python -m mcp_server.tests.test_tools

list-skills: ## List available Claude Skills
	@echo "$(BLUE)Available Claude Skills:$(NC)"
	@ls -1 .claude/skills/
	@echo ""
	@echo "To view a skill:"
	@echo "  cat .claude/skills/jira-workflow/SKILL.md"
	@echo "  cat .claude/skills/confluence-workflow/SKILL.md"
	@echo "  cat .claude/skills/trading-context/SKILL.md"

##@ Electron Desktop App Commands

app: ## Launch the Electron desktop app
	@echo "$(BLUE)Launching Atlassian AI Assistant...$(NC)"
	@cd electron-app && npm start

app-dev: ## Launch the Electron app with DevTools
	@echo "$(BLUE)Launching in development mode...$(NC)"
	@cd electron-app && npm run dev

##@ Building & Distribution

build-all: build-app-mac build-app-win build-app-linux ## Build desktop app for all platforms
	@echo "$(GREEN)✓ All builds complete!$(NC)"
	@echo "Built files are in electron-app/dist/"

build-app: build-app-mac ## Build desktop app for current platform (default: macOS)

build-app-mac: ## Build macOS desktop app (.dmg)
	@echo "$(BLUE)Building macOS app...$(NC)"
	@cd electron-app && npm run build:mac
	@echo "$(GREEN)✓ macOS build complete: electron-app/dist/*.dmg$(NC)"

build-app-win: ## Build Windows desktop app (.exe)
	@echo "$(BLUE)Building Windows app...$(NC)"
	@cd electron-app && npm run build:win
	@echo "$(GREEN)✓ Windows build complete: electron-app/dist/*.exe$(NC)"

build-app-linux: ## Build Linux desktop app (.AppImage, .deb)
	@echo "$(BLUE)Building Linux app...$(NC)"
	@cd electron-app && npm run build:linux
	@echo "$(GREEN)✓ Linux build complete: electron-app/dist/$(NC)"

##@ Testing & Validation

test-config: ## Test configuration validity
	@echo "$(BLUE)Testing configuration...$(NC)"
	@. venv/bin/activate && python -c "from src.config import get_config; config = get_config(); print('$(GREEN)✓ Configuration valid$(NC)')" || echo "$(RED)✗ Configuration invalid$(NC)"

test-jira: ## Test Jira connection
	@echo "$(BLUE)Testing Jira connection...$(NC)"
	@. venv/bin/activate && python -m src.main jira --no-analyze --max-results 1

test-confluence: ## Test Confluence connection
	@echo "$(BLUE)Testing Confluence connection...$(NC)"
	@. venv/bin/activate && python -m src.main confluence recent --space $(SPACE)

##@ Maintenance

clean: ## Clean build artifacts and cache
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@rm -rf electron-app/dist electron-app/build electron-app/out
	@rm -rf electron-app/node_modules/.cache
	@echo "$(GREEN)✓ Cleaned$(NC)"

clean-all: clean ## Clean everything including dependencies
	@echo "$(BLUE)Cleaning all dependencies...$(NC)"
	@rm -rf venv
	@rm -rf electron-app/node_modules
	@echo "$(GREEN)✓ All cleaned - run 'make setup' to reinstall$(NC)"

reset-config: ## Reset configuration files
	@echo "$(YELLOW)Resetting configuration...$(NC)"
	@rm -f .env electron-app/.env mcp-server/.env
	@echo "$(GREEN)✓ Configuration reset - run 'make config' to recreate$(NC)"

##@ Development

dev-python: ## Run Python CLI in development mode
	@echo "$(BLUE)Python CLI ready$(NC)"
	@echo "Usage examples:"
	@echo "  make cli-jira"
	@echo "  make cli-confluence-search QUERY='api docs'"
	@. venv/bin/activate && bash

dev-electron: app-dev ## Alias for app-dev

install-git-hooks: ## Install git hooks for development
	@echo "$(BLUE)Installing git hooks...$(NC)"
	@cp -n .git-hooks/pre-commit .git/hooks/pre-commit 2>/dev/null || true
	@chmod +x .git/hooks/pre-commit 2>/dev/null || true
	@echo "$(GREEN)✓ Git hooks installed$(NC)"

##@ Documentation

docs: ## Open documentation
	@echo "$(BLUE)Documentation files:$(NC)"
	@echo "  README.md                - Main documentation"
	@echo "  GETTING_STARTED.md       - Quick start guide"
	@echo "  CONFIGURATION_GUIDE.md   - Configuration details"
	@echo "  TROUBLESHOOTING.md       - Common issues"
	@echo "  electron-app/README.md   - Desktop app docs"
	@echo "  DESKTOP_APP_SUMMARY.md   - Desktop app summary"

show-config: ## Show current configuration (without sensitive data)
	@echo "$(BLUE)Current Configuration:$(NC)"
	@if [ -f .env ]; then \
		echo "\nPython CLI (.env):"; \
		grep -v "TOKEN\|KEY\|PASSWORD" .env | grep "=" || echo "  (no non-sensitive vars)"; \
	else \
		echo "\n$(YELLOW)No .env file found$(NC)"; \
	fi
	@if [ -f electron-app/.env ]; then \
		echo "\nElectron App (electron-app/.env):"; \
		grep -v "TOKEN\|KEY\|PASSWORD" electron-app/.env | grep "=" || echo "  (no non-sensitive vars)"; \
	else \
		echo "\n$(YELLOW)No electron-app/.env file found$(NC)"; \
	fi

##@ Quick Start Examples

quick-start: setup config ## Complete quick start setup
	@echo ""
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo ""
	@echo "$(BLUE)Try these commands:$(NC)"
	@echo "  $(GREEN)make chat$(NC)                                  - Interactive chat with AI agent"
	@echo "  $(GREEN)make cli-jira$(NC)                              - Get your Jira tasks"
	@echo "  $(GREEN)make app$(NC)                                   - Launch desktop app"
	@echo "  $(GREEN)make cli-confluence-search QUERY='docs'$(NC)    - Search Confluence"
	@echo ""
	@echo "$(BLUE)New MCP + Skills Architecture:$(NC)"
	@echo "  $(GREEN)make list-skills$(NC)                           - View available skills"
	@echo "  $(GREEN)make run-mcp-server$(NC)                        - Run MCP server standalone"
	@echo ""

demo-python: ## Demo Python CLI features
	@echo "$(BLUE)Python CLI Demo$(NC)"
	@echo "\n1. Getting Jira sprint tasks..."
	@. venv/bin/activate && python -m src.main jira --no-analyze || true
	@echo "\n2. Getting recent Confluence pages..."
	@. venv/bin/activate && python -m src.main confluence recent || true

##@ Information

version: ## Show version information
	@echo "$(BLUE)Atlassian AI Assistant$(NC)"
	@echo "Version: 1.0.0"
	@echo ""
	@echo "Python CLI:        ./src/"
	@echo "Electron App:      ./electron-app/"
	@echo ""
	@echo "Dependencies:"
	@. venv/bin/activate && python --version 2>/dev/null || echo "  Python: Not installed"
	@node --version 2>/dev/null || echo "  Node.js: Not installed"
	@npm --version 2>/dev/null || echo "  npm: Not installed"

status: ## Show project status
	@echo "$(BLUE)Project Status:$(NC)"
	@echo ""
	@echo "Python Environment:"
	@test -d venv && echo "  $(GREEN)✓ Virtual environment exists$(NC)" || echo "  $(RED)✗ No virtual environment$(NC)"
	@test -f .env && echo "  $(GREEN)✓ .env configured$(NC)" || echo "  $(YELLOW)○ .env not configured$(NC)"
	@echo ""
	@echo "MCP Server:"
	@test -f mcp-server/server.py && echo "  $(GREEN)✓ MCP server exists$(NC)" || echo "  $(RED)✗ MCP server not found$(NC)"
	@test -f mcp-server/.env && echo "  $(GREEN)✓ MCP .env configured$(NC)" || echo "  $(YELLOW)○ MCP .env not configured$(NC)"
	@test -d .claude/skills && echo "  $(GREEN)✓ Skills directory exists$(NC)" || echo "  $(RED)✗ Skills not found$(NC)"
	@echo ""
	@echo "Electron App:"
	@test -d electron-app/node_modules && echo "  $(GREEN)✓ Dependencies installed$(NC)" || echo "  $(RED)✗ Dependencies not installed$(NC)"
	@test -f electron-app/.env && echo "  $(GREEN)✓ .env configured$(NC)" || echo "  $(YELLOW)○ .env not configured$(NC)"
	@echo ""
	@echo "Build Artifacts:"
	@test -d electron-app/dist && echo "  $(GREEN)✓ Builds exist in electron-app/dist/$(NC)" || echo "  $(YELLOW)○ No builds yet$(NC)"

tree: ## Show project structure
	@echo "$(BLUE)Project Structure:$(NC)"
	@tree -L 3 -I 'node_modules|venv|__pycache__|*.pyc|dist|build|.git' --dirsfirst || \
		find . -type d \( -name node_modules -o -name venv -o -name __pycache__ -o -name dist -o -name .git \) -prune -o -print | head -50
