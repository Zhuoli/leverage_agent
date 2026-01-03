# Atlassian AI Assistant - Makefile
# Commands for building, testing, and running the application

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
	@echo "  3. Test:      make test-auth"
	@echo "  4. Run:       make app"

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
		echo "$(YELLOW)Created .env from template$(NC)"; \
		echo "$(YELLOW)⚠️  Please edit .env with your credentials:$(NC)"; \
		echo "  - Atlassian (Jira/Confluence) API tokens"; \
		echo "  - OCI credentials (if using Oracle Cloud MCP)"; \
		echo "  - AI provider API keys (Claude/OpenAI)"; \
	else \
		echo "$(GREEN).env already exists$(NC)"; \
	fi
	@if [ ! -f electron-app/.env ]; then \
		cp electron-app/.env.example electron-app/.env; \
		echo "$(YELLOW)Created electron-app/.env from template$(NC)"; \
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

##@ Run Application

app: build ## Launch the Electron desktop app (or use: ./chatbot.sh ui)
	@echo "$(BLUE)Launching Atlassian AI Assistant...$(NC)"
	@cd electron-app && npm start

app-dev: build ## Launch the Electron app with DevTools
	@echo "$(BLUE)Launching in development mode with DevTools...$(NC)"
	@cd electron-app && npm run dev

cli: build ## Launch the terminal chat assistant (or use: ./chatbot.sh cli)
	@echo "$(BLUE)Starting Terminal Chat Assistant...$(NC)"
	@echo "$(GREEN)Tip: Use ./chatbot.sh cli for more options (--help, --mcp, etc.)$(NC)"
	@node dist/cli/index.js chat

##@ MCP Server Testing

test-auth: build ## Test authentication for all services (Atlassian + OCI)
	@echo "$(BLUE)Testing authentication for all services...$(NC)"
	@node scripts/test-auth.js all

test-auth-atlassian: build ## Test Atlassian (Jira/Confluence) authentication
	@echo "$(BLUE)Testing Atlassian authentication...$(NC)"
	@node scripts/test-auth.js atlassian

test-auth-oci: build ## Test Oracle Cloud Infrastructure authentication
	@echo "$(BLUE)Testing OCI authentication...$(NC)"
	@node scripts/test-auth.js oci

test-mcp-atlassian: build ## Test Atlassian MCP server via JSON-RPC
	@echo "$(BLUE)Testing Atlassian MCP server...$(NC)"
	@node scripts/test-mcp.js atlassian

test-mcp-oci: build ## Test Oracle Cloud MCP server via JSON-RPC
	@echo "$(BLUE)Testing Oracle Cloud MCP server...$(NC)"
	@node scripts/test-mcp.js oci

inspector-atlassian: build ## Launch MCP Inspector for Atlassian MCP (opens browser)
	@echo "$(BLUE)Launching MCP Inspector for Atlassian MCP...$(NC)"
	@echo "$(YELLOW)Opening in browser: http://localhost:5173$(NC)"
	@npx @modelcontextprotocol/inspector node dist/mcp/atlassian-server.js

inspector-oci: build ## Launch MCP Inspector for Oracle Cloud MCP (opens browser)
	@echo "$(BLUE)Launching MCP Inspector for Oracle Cloud MCP...$(NC)"
	@echo "$(YELLOW)Opening in browser: http://localhost:5173$(NC)"
	@npx @modelcontextprotocol/inspector node dist/mcp/oci-server.js

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

package-all: build ## Build installers for all platforms (Mac/Win/Linux)
	@echo "$(BLUE)Building installers for all platforms...$(NC)"
	@cd electron-app && npm run build:mac && npm run build:win && npm run build:linux
	@echo "$(GREEN)✓ All builds complete!$(NC)"
	@echo "Built files are in electron-app/dist/"

##@ Testing & Validation

test: ## Run unit tests
	@echo "$(BLUE)Running unit tests...$(NC)"
	@npm test

test-watch: ## Run unit tests in watch mode
	@echo "$(BLUE)Running tests in watch mode...$(NC)"
	@npm run test:watch

test-coverage: ## Run tests with coverage report
	@echo "$(BLUE)Running tests with coverage...$(NC)"
	@npm run test:coverage

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

reset-config: ## Reset configuration files (delete .env files)
	@echo "$(YELLOW)⚠️  Resetting configuration - this will delete .env files!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		rm -f .env electron-app/.env; \
		echo "$(GREEN)✓ Configuration reset - run 'make config' to recreate$(NC)"; \
	else \
		echo "$(YELLOW)Reset cancelled$(NC)"; \
	fi

##@ Information & Status

version: ## Show version and component information
	@echo "$(BLUE)Atlassian AI Assistant v3.0.0$(NC)"
	@echo ""
	@echo "Components:"
	@echo "  CLI:               ./dist/cli/index.js"
	@echo "  Atlassian MCP:     ./dist/mcp/atlassian-server.js"
	@echo "  Oracle Cloud MCP:  ./dist/mcp/oci-server.js"
	@echo "  Electron App:      ./electron-app/"
	@echo ""
	@echo "Runtime:"
	@node --version 2>/dev/null || echo "  Node.js: Not installed"
	@npm --version 2>/dev/null || echo "  npm: Not installed"

status: ## Show project status (build, config, dependencies)
	@echo "$(BLUE)Project Status:$(NC)"
	@echo ""
	@echo "Build Status:"
	@test -d dist && echo "  $(GREEN)✓ dist/ exists (compiled)$(NC)" || echo "  $(RED)✗ dist/ not found (run 'make build')$(NC)"
	@test -f dist/cli/index.js && echo "  $(GREEN)✓ CLI compiled$(NC)" || echo "  $(RED)✗ CLI not compiled$(NC)"
	@test -f dist/mcp/atlassian-server.js && echo "  $(GREEN)✓ Atlassian MCP compiled$(NC)" || echo "  $(RED)✗ Atlassian MCP not compiled$(NC)"
	@test -f dist/mcp/oci-server.js && echo "  $(GREEN)✓ Oracle Cloud MCP compiled$(NC)" || echo "  $(RED)✗ Oracle Cloud MCP not compiled$(NC)"
	@echo ""
	@echo "Configuration:"
	@test -f .env && echo "  $(GREEN)✓ .env exists$(NC)" || echo "  $(YELLOW)○ .env missing (run 'make config')$(NC)"
	@test -f electron-app/.env && echo "  $(GREEN)✓ electron-app/.env exists$(NC)" || echo "  $(YELLOW)○ electron-app/.env missing$(NC)"
	@echo ""
	@echo "Dependencies:"
	@test -d node_modules && echo "  $(GREEN)✓ Root dependencies installed$(NC)" || echo "  $(RED)✗ Root dependencies missing (run 'make setup-root')$(NC)"
	@test -d electron-app/node_modules && echo "  $(GREEN)✓ Electron dependencies installed$(NC)" || echo "  $(RED)✗ Electron dependencies missing (run 'make setup-electron')$(NC)"
	@echo ""
	@echo "Skills:"
	@test -d .claude/skills && echo "  $(GREEN)✓ Skills directory exists ($$(ls -1 .claude/skills/ | wc -l | tr -d ' ') skills)$(NC)" || echo "  $(YELLOW)○ No skills directory$(NC)"
	@echo ""
	@echo "Installers:"
	@test -d electron-app/dist && echo "  $(GREEN)✓ Builds exist in electron-app/dist/$(NC)" || echo "  $(YELLOW)○ No installers built (run 'make package')$(NC)"

show-config: ## Show current configuration (hides sensitive data)
	@echo "$(BLUE)Current Configuration:$(NC)"
	@if [ -f .env ]; then \
		echo "\nRoot .env:"; \
		grep -v "TOKEN\|KEY\|PASSWORD" .env | grep "=" || echo "  (all variables are sensitive)"; \
	else \
		echo "\n$(YELLOW)No .env file found - run 'make config'$(NC)"; \
	fi
	@if [ -f electron-app/.env ]; then \
		echo "\nElectron .env:"; \
		grep -v "TOKEN\|KEY\|PASSWORD" electron-app/.env | grep "=" || echo "  (all variables are sensitive)"; \
	else \
		echo "\n$(YELLOW)No electron-app/.env file found$(NC)"; \
	fi

list-skills: ## List available Claude Skills
	@echo "$(BLUE)Available Claude Skills:$(NC)"
	@if [ -d .claude/skills ]; then \
		for skill in .claude/skills/*/; do \
			skillname=$$(basename "$$skill"); \
			if [ -f "$$skill/SKILL.md" ]; then \
				desc=$$(grep "^description:" "$$skill/SKILL.md" | head -1 | sed 's/description: *//'); \
				echo "  $(GREEN)$$skillname$(NC) - $$desc"; \
			else \
				echo "  $(GREEN)$$skillname$(NC)"; \
			fi; \
		done; \
	else \
		echo "  $(YELLOW)No skills directory found$(NC)"; \
	fi

tree: ## Show project structure
	@echo "$(BLUE)Project Structure:$(NC)"
	@tree -L 3 -I 'node_modules|dist|__pycache__|*.pyc|.git' --dirsfirst 2>/dev/null || \
		find . -type d \( -name node_modules -o -name dist -o -name __pycache__ -o -name .git \) -prune -o -print | head -50

##@ Documentation

docs: ## List available documentation
	@echo "$(BLUE)Documentation:$(NC)"
	@echo "  $(GREEN)README.md$(NC)                      - Main documentation"
	@echo "  $(GREEN)docs/TESTING_MCP_SERVERS.md$(NC)    - MCP testing guide"
	@echo "  $(GREEN).env.example$(NC)                   - Configuration template"
	@echo ""
	@echo "Online:"
	@echo "  - Makefile Commands: make help"
	@echo "  - Project Status:    make status"

##@ Quick Start Workflows

quick-start: setup config build test-auth ## Complete setup: install → config → build → test
	@echo ""
	@echo "$(GREEN)✓ Quick start complete!$(NC)"
	@echo ""
	@echo "$(BLUE)Next steps:$(NC)"
	@echo "  $(GREEN)make app$(NC)                  - Launch desktop app"
	@echo "  $(GREEN)make test-mcp-atlassian$(NC)   - Test Atlassian MCP server"
	@echo "  $(GREEN)make inspector-atlassian$(NC)  - Interactive MCP testing"
	@echo "  $(GREEN)make package$(NC)              - Build installer for this platform"

verify: build test-auth ## Verify installation and credentials
	@echo ""
	@echo "$(GREEN)✓ Verification complete!$(NC)"
	@echo ""
	@echo "If authentication tests passed, you're ready to:"
	@echo "  $(GREEN)make app$(NC)  - Launch the desktop application"
