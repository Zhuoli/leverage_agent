# Atlassian AI Assistant - Makefile
# All commands for building, packaging, and running the Electron desktop app

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
	@echo "$(BLUE)Atlassian AI Assistant v3.0.0$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make $(GREEN)<target>$(NC)\n\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-25s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

check-deps: ## Check if required dependencies are installed
	@echo "$(BLUE)Checking dependencies...$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)Node.js is required but not installed$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)npm is required but not installed$(NC)"; exit 1; }
	@echo "$(GREEN)✓ All dependencies are installed$(NC)"
	@echo "  Node.js: $$(node --version)"
	@echo "  npm: $$(npm --version)"

##@ Setup & Installation

setup: check-deps setup-root setup-electron ## Setup everything (root + Electron app)
	@echo "$(GREEN)✓ Complete setup finished!$(NC)"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Configure: make config"
	@echo "  2. Build:     make build"
	@echo "  3. Run:       make app"
	@echo "  4. Package:   make package"

setup-root: check-deps ## Install root TypeScript dependencies
	@echo "$(BLUE)Installing root dependencies...$(NC)"
	@npm install
	@echo "$(GREEN)✓ Root dependencies installed$(NC)"

setup-electron: check-deps ## Install Electron app dependencies
	@echo "$(BLUE)Installing Electron dependencies...$(NC)"
	@cd electron-app && npm install
	@echo "$(GREEN)✓ Electron dependencies installed$(NC)"

config: ## Configure credentials (creates .env files)
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo "$(YELLOW)Created .env for root$(NC)"; \
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

##@ Build Commands

build: ## Build TypeScript to JavaScript
	@echo "$(BLUE)Building TypeScript...$(NC)"
	@npm run build
	@echo "$(GREEN)✓ TypeScript compiled successfully$(NC)"
	@echo "  CLI:               dist/cli/index.js"
	@echo "  Atlassian MCP:     dist/mcp/atlassian-server.js"
	@echo "  Oracle Cloud MCP:  dist/mcp/oci-server.js"

build-dev: ## Build in development mode (watch)
	@echo "$(BLUE)Building TypeScript in watch mode...$(NC)"
	@npm run dev

typecheck: ## Type check without building
	@echo "$(BLUE)Type checking...$(NC)"
	@npm run typecheck

lint: ## Lint TypeScript code
	@echo "$(BLUE)Linting code...$(NC)"
	@npm run lint

lint-fix: ## Lint and fix TypeScript code
	@echo "$(BLUE)Linting and fixing code...$(NC)"
	@npm run lint:fix

format: ## Format code with Prettier
	@echo "$(BLUE)Formatting code...$(NC)"
	@npm run format

##@ Run Commands

app: build ## Launch the Electron desktop app
	@echo "$(BLUE)Launching Atlassian AI Assistant...$(NC)"
	@cd electron-app && npm start

app-dev: build ## Launch the Electron app with DevTools
	@echo "$(BLUE)Launching in development mode...$(NC)"
	@cd electron-app && npm run dev

chat: build ## Start interactive chat session (CLI)
	@echo "$(BLUE)Starting interactive chat...$(NC)"
	@node dist/cli/index.js chat

chat-message: build ## Send a single message (usage: make chat-message MSG="your message")
	@echo "$(BLUE)Sending message to agent...$(NC)"
	@node dist/cli/index.js chat --message "$(MSG)"

jira: build ## Get your Jira sprint tasks (CLI)
	@echo "$(BLUE)Fetching Jira sprint tasks...$(NC)"
	@node dist/cli/index.js jira

jira-all: build ## Get all your Jira issues (CLI)
	@echo "$(BLUE)Fetching all Jira issues...$(NC)"
	@node dist/cli/index.js jira --all-issues

confluence-search: build ## Search Confluence (usage: make confluence-search QUERY="your search")
	@echo "$(BLUE)Searching Confluence...$(NC)"
	@node dist/cli/index.js confluence "$(QUERY)"

##@ Package Commands (Build Installers)

package: build ## Build installer for current platform
	@echo "$(BLUE)Building installer for current platform...$(NC)"
	@cd electron-app && npm run build
	@echo "$(GREEN)✓ Build complete!$(NC)"
	@echo "$(GREEN)Installers are in: electron-app/dist/$(NC)"

package-mac: build ## Build macOS ARM64 installer (.dmg) for Apple Silicon
	@echo "$(BLUE)Building macOS ARM64 installer for Apple Silicon...$(NC)"
	@cd electron-app && npm run build:mac
	@echo "$(GREEN)✓ macOS ARM64 build complete: electron-app/dist/*-arm64.dmg$(NC)"

package-win: build ## Build Windows installer (.exe)
	@echo "$(BLUE)Building Windows installer...$(NC)"
	@cd electron-app && npm run build:win
	@echo "$(GREEN)✓ Windows build complete: electron-app/dist/*.exe$(NC)"

package-linux: build ## Build Linux installers (.AppImage, .deb)
	@echo "$(BLUE)Building Linux installers...$(NC)"
	@cd electron-app && npm run build:linux
	@echo "$(GREEN)✓ Linux builds complete: electron-app/dist/$(NC)"

package-all: build ## Build installers for all platforms
	@echo "$(BLUE)Building installers for all platforms...$(NC)"
	@cd electron-app && npm run build:mac && npm run build:win && npm run build:linux
	@echo "$(GREEN)✓ All builds complete!$(NC)"
	@echo "Built files are in electron-app/dist/"

##@ Testing & Validation

test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	@npm test

test-watch: ## Run tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	@npm run test:watch

test-coverage: ## Run tests with coverage
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@npm run test:coverage

test-config: ## Test configuration validity
	@echo "$(BLUE)Testing configuration...$(NC)"
	@node -e "require('./dist/cli/index.js')" && echo "$(GREEN)✓ Configuration valid$(NC)" || echo "$(RED)✗ Configuration invalid$(NC)"

##@ Maintenance

clean: ## Clean build artifacts and cache
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	@rm -rf dist
	@rm -rf electron-app/dist
	@rm -rf electron-app/backend-dist
	@rm -rf electron-app/.claude-skills
	@rm -rf electron-app/node_modules/.cache
	@echo "$(GREEN)✓ Cleaned$(NC)"

clean-all: clean ## Clean everything including dependencies
	@echo "$(BLUE)Cleaning all dependencies...$(NC)"
	@rm -rf node_modules
	@rm -rf electron-app/node_modules
	@echo "$(GREEN)✓ All cleaned - run 'make setup' to reinstall$(NC)"

reset-config: ## Reset configuration files
	@echo "$(YELLOW)Resetting configuration...$(NC)"
	@rm -f .env electron-app/.env
	@echo "$(GREEN)✓ Configuration reset - run 'make config' to recreate$(NC)"

##@ Information

version: ## Show version information
	@echo "$(BLUE)Atlassian AI Assistant v3.0.0$(NC)"
	@echo ""
	@echo "Runtime:           Node.js"
	@echo "CLI:               ./dist/cli/index.js"
	@echo "Atlassian MCP:     ./dist/mcp/atlassian-server.js"
	@echo "Oracle Cloud MCP:  ./dist/mcp/oci-server.js"
	@echo "Electron App:      ./electron-app/"
	@echo ""
	@echo "Dependencies:"
	@node --version 2>/dev/null || echo "  Node.js: Not installed"
	@npm --version 2>/dev/null || echo "  npm: Not installed"

status: ## Show project status
	@echo "$(BLUE)Project Status:$(NC)"
	@echo ""
	@echo "TypeScript Build:"
	@test -d dist && echo "  $(GREEN)✓ dist/ exists (compiled)$(NC)" || echo "  $(RED)✗ dist/ not found (run 'make build')$(NC)"
	@test -f dist/cli/index.js && echo "  $(GREEN)✓ CLI compiled$(NC)" || echo "  $(RED)✗ CLI not compiled$(NC)"
	@test -f dist/mcp/atlassian-server.js && echo "  $(GREEN)✓ Atlassian MCP compiled$(NC)" || echo "  $(RED)✗ Atlassian MCP not compiled$(NC)"
	@test -f dist/mcp/oci-server.js && echo "  $(GREEN)✓ Oracle Cloud MCP compiled$(NC)" || echo "  $(RED)✗ Oracle Cloud MCP not compiled$(NC)"
	@echo ""
	@echo "Configuration:"
	@test -f .env && echo "  $(GREEN)✓ .env configured$(NC)" || echo "  $(YELLOW)○ .env not configured (run 'make config')$(NC)"
	@test -f electron-app/.env && echo "  $(GREEN)✓ electron-app/.env configured$(NC)" || echo "  $(YELLOW)○ electron-app/.env not configured$(NC)"
	@echo ""
	@echo "Dependencies:"
	@test -d node_modules && echo "  $(GREEN)✓ Root dependencies installed$(NC)" || echo "  $(RED)✗ Root dependencies not installed$(NC)"
	@test -d electron-app/node_modules && echo "  $(GREEN)✓ Electron dependencies installed$(NC)" || echo "  $(RED)✗ Electron dependencies not installed$(NC)"
	@echo ""
	@echo "Skills:"
	@test -d .claude/skills && echo "  $(GREEN)✓ Skills directory exists$(NC)" || echo "  $(RED)✗ Skills not found$(NC)"
	@echo ""
	@echo "Installers:"
	@test -d electron-app/dist && echo "  $(GREEN)✓ Builds exist in electron-app/dist/$(NC)" || echo "  $(YELLOW)○ No builds yet (run 'make package')$(NC)"

list-skills: ## List available Claude Skills
	@echo "$(BLUE)Available Claude Skills:$(NC)"
	@ls -1 .claude/skills/ | grep -v "\.md$$" || echo "  No skills found"

tree: ## Show project structure
	@echo "$(BLUE)Project Structure:$(NC)"
	@tree -L 3 -I 'node_modules|__pycache__|*.pyc|.git' --dirsfirst || \
		find . -type d \( -name node_modules -o -name __pycache__ -o -name .git \) -prune -o -print | head -50

##@ Documentation

docs: ## Show documentation files
	@echo "$(BLUE)Documentation files:$(NC)"
	@echo "  README.md                  - Main documentation"
	@echo "  MAKEFILE_GUIDE.md          - Makefile documentation"
	@echo "  CONFIGURATION_GUIDE.md     - Configuration details"
	@echo "  TROUBLESHOOTING.md         - Common issues"

show-config: ## Show current configuration (without sensitive data)
	@echo "$(BLUE)Current Configuration:$(NC)"
	@if [ -f .env ]; then \
		echo "\nRoot (.env):"; \
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

quick-start: setup config build ## Complete quick start setup and build
	@echo ""
	@echo "$(GREEN)✓ Setup complete!$(NC)"
	@echo ""
	@echo "$(BLUE)Try these commands:$(NC)"
	@echo "  $(GREEN)make app$(NC)                                   - Launch desktop app"
	@echo "  $(GREEN)make chat$(NC)                                  - Interactive chat (CLI)"
	@echo "  $(GREEN)make jira$(NC)                                  - Get your Jira tasks"
	@echo "  $(GREEN)make package-mac$(NC)                           - Build macOS installer"
	@echo "  $(GREEN)make package-win$(NC)                           - Build Windows installer"
	@echo "  $(GREEN)make package-linux$(NC)                         - Build Linux installer"
	@echo ""

demo: build ## Quick demo of the application
	@echo "$(BLUE)Atlassian AI Assistant Demo$(NC)"
	@echo "\n$(GREEN)1. CLI Chat Demo:$(NC)"
	@echo "   Run: make chat"
	@echo "\n$(GREEN)2. Desktop App Demo:$(NC)"
	@echo "   Run: make app"
	@echo "\n$(GREEN)3. Build Installer Demo:$(NC)"
	@echo "   Run: make package"
