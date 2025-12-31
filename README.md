# Atlassian AI Assistant

An AI-powered **Electron desktop application** that integrates with **enterprise Jira and Confluence** instances to help you manage work items and access team documentation.

## 🚀 Quick Start

```bash
# 1. Install dependencies
make setup

# 2. Configure credentials
make config
# Edit .env with your Jira/Confluence credentials

# 3. Build the application
make build

# 4. Run the desktop app
make app

# Or build installer for distribution
make package-mac     # macOS .dmg
make package-win     # Windows .exe
make package-linux   # Linux .AppImage
```

**See all commands:** `make help`

---

## ✨ Features

### 🖥️ Electron Desktop Application
- 💻 **Native Desktop App**: Cross-platform (macOS, Windows, Linux)
- 🎨 **Modern UI**: Clean interface built with Electron
- ⚡ **Fast Performance**: Efficient TypeScript implementation
- 📦 **Single Installer**: ~90MB package with everything included

### 🎯 Interactive AI Chat
- 💬 **Natural Language Interface**: Ask questions in plain English
- 🧠 **Context-Aware**: Uses Claude Skills for best practices
- 🔧 **MCP Tools**: Standardized interface to Jira/Confluence
- 📚 **Workflow Knowledge**: Built-in expertise for Jira, Confluence, and trading domain

### 🎫 Jira Integration
- ✅ Fetch work items assigned to you from Jira boards
- ✅ Filter by Sprint (active, future, or all issues)
- ✅ Create, update, and comment on tickets
- ✅ Search using JQL (Jira Query Language)
- ✅ AI-powered analysis and insights

### 📚 Confluence Integration
- ✅ Search team Confluence pages
- ✅ Read and analyze page content
- ✅ Create and update documentation
- ✅ Get recently updated pages
- ✅ AI-powered summarization

### 🏢 Enterprise-Ready
- ✅ Works with **self-hosted/on-premise** Atlassian instances
- ✅ Support for **custom domains** (e.g., confluence.companyinternal.com)
- ✅ **SSO compatible** via Personal Access Tokens (PAT)
- ✅ **MCP Architecture**: Modern, extensible design
- ✅ **Fully configurable** - works with any Jira/Confluence deployment

---

## Requirements

- **Node.js 18+** - JavaScript runtime
- **npm 9+** - Package manager
- Enterprise Jira and/or Confluence instance
- Personal Access Token (PAT) for authentication
- Anthropic API key (for Claude) or OpenAI API key

---

## Architecture

```
┌────────────────────────────────┐
│  Electron Desktop App          │
│  - Modern UI                   │
│  - IPC Communication           │
└────────────┬───────────────────┘
             │
             ↓ (Node.js CLI)
┌────────────────────────────────┐
│  TypeScript Agent SDK          │
│  ├─ Config (Zod validation)    │
│  ├─ MCP Server (10 tools)      │
│  ├─ Skills Loader (12 skills)  │
│  ├─ Providers (Claude/OpenAI)  │
│  └─ API Clients (Axios-based)  │
└────────────┬───────────────────┘
             │
             ↓ (REST APIs)
┌────────────────────────────────┐
│  Jira  │  Confluence           │
└────────────────────────────────┘
```

**Key Technologies:**
- **TypeScript** - Type-safe codebase
- **Electron** - Cross-platform desktop app
- **MCP (Model Context Protocol)** - AI tool integration
- **Claude/OpenAI** - AI providers
- **Axios** - HTTP client for Atlassian APIs
- **Zod** - Schema validation

---

## Installation & Setup

### Automated Setup (Recommended)

```bash
# Clone the repository (if you haven't)
# git clone https://github.com/zhuoli/confluence_assistant

# Run setup
make setup

# Configure
make config
# Then edit .env with your credentials
```

### Manual Setup

1. **Install Node.js dependencies:**
```bash
npm install
cd electron-app && npm install && cd ..
```

2. **Build TypeScript:**
```bash
npm run build
```

3. **Configure environment variables:**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

4. **Edit `.env`** and add your credentials:

```bash
# Get your Anthropic API key from https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-xxx...

# YOUR enterprise Jira URL
JIRA_URL=https://jira.yourcompany.com
JIRA_USERNAME=your.email@company.com
JIRA_API_TOKEN=your_jira_personal_access_token

# YOUR enterprise Confluence URL
CONFLUENCE_URL=https://confluence.yourcompany.com
CONFLUENCE_USERNAME=your.email@company.com
CONFLUENCE_API_TOKEN=your_confluence_personal_access_token
CONFLUENCE_SPACE_KEY=YOURSPACE

# YOUR user information
USER_DISPLAY_NAME=Your Name
USER_EMAIL=your.email@company.com
```

---

## Authentication

This tool uses **Personal Access Tokens (PAT)** which work with enterprise SSO setups.

### Creating a Personal Access Token

**For Jira/Confluence Server/Data Center:**
1. Log into your Atlassian instance
2. Go to Profile → Personal Access Tokens
3. Create a new token with appropriate permissions
4. Copy the token to your `.env` file

**For Atlassian Cloud:**
1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
2. Create API token
3. Use your email as username and the token as password

---

## Usage

### Desktop Application (Primary)

```bash
# Launch the Electron desktop app
make app

# Or directly
cd electron-app && npm start
```

**In the app:**
- Click quick action buttons for common tasks
- Type messages in the chat box
- View formatted responses with links

### Command Line Interface (Optional)

```bash
# Interactive chat
make chat

# Single message
make chat-message MSG="Show me my sprint tasks"

# Get Jira tasks
make jira

# Search Confluence
make confluence-search QUERY="API documentation"
```

### Building Installers

```bash
# Build for current platform
make package

# Build for specific platforms
make package-mac     # macOS .dmg
make package-win     # Windows .exe
make package-linux   # Linux .AppImage and .deb
```

**Output:** Installers in `electron-app/dist/`

### Automated Builds & Distribution with GitHub Actions

This repository includes **GitHub Actions workflows** for automated building and releasing:

- **Automatic builds** on every push to `main` branch
- **Create releases** by pushing version tags (e.g., `git tag v3.0.0 && git push origin v3.0.0`)
- **Multi-platform builds** (macOS, Windows, Linux) run in parallel
- **GitHub Releases** with installers automatically uploaded

**Quick release workflow:**
```bash
# 1. Update version in package.json files
# 2. Commit and push
git add package.json electron-app/package.json
git commit -m "Bump version to 3.0.0"
git push

# 3. Create and push version tag
git tag v3.0.0
git push origin v3.0.0

# 4. GitHub Actions automatically builds and creates release!
```

📖 **For detailed instructions**, see [BUILD_AND_DISTRIBUTION.md](BUILD_AND_DISTRIBUTION.md)

---

## Configuration Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MODEL_PROVIDER` | No | AI provider (default: claude) | `claude` or `openai` |
| `MODEL_NAME` | No | Custom model name | `claude-3-5-sonnet-20241022` |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key | `sk-ant-xxx...` |
| `OPENAI_API_KEY` | Yes* | OpenAI API key | `sk-xxx...` |
| `JIRA_URL` | Yes | Jira instance URL | `https://jira.company.com` |
| `JIRA_USERNAME` | Yes | Jira username/email | `user@company.com` |
| `JIRA_API_TOKEN` | Yes | Jira PAT | `your_token` |
| `CONFLUENCE_URL` | Yes | Confluence instance URL | `https://confluence.company.com` |
| `CONFLUENCE_USERNAME` | Yes | Confluence username/email | `user@company.com` |
| `CONFLUENCE_API_TOKEN` | Yes | Confluence PAT | `your_token` |
| `CONFLUENCE_SPACE_KEY` | No | Default space | `TEAM` |
| `USER_DISPLAY_NAME` | No | Your display name | `Your Name` |
| `USER_EMAIL` | No | Your email | `user@company.com` |

*One of `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` is required depending on `MODEL_PROVIDER`

---

## Project Structure

```
confluence_assistant/
├── Makefile                  # Build commands
├── README.md                 # This file
├── package.json              # Root dependencies
├── tsconfig.json             # TypeScript configuration
│
├── src/                      # TypeScript source code
│   ├── config/              # Configuration (Zod schemas)
│   ├── api/                 # Jira/Confluence REST clients
│   ├── mcp/                 # MCP server + 10 tools
│   ├── skills/              # Skills loader
│   ├── providers/           # AI providers (Claude/OpenAI)
│   ├── agent/               # Agent orchestrator
│   └── cli/                 # CLI interface
│
├── dist/                     # Compiled JavaScript
│   ├── cli/index.js         # CLI entry point
│   └── mcp/server.js        # MCP server
│
├── electron-app/             # Electron desktop application
│   ├── src/                 # Electron source code
│   │   ├── main/           # Main process
│   │   ├── renderer/       # UI renderer
│   │   └── backend/        # Agent client
│   ├── package.json        # Electron dependencies
│   └── dist/               # Built installers (.dmg, .exe, .AppImage)
│
└── .claude/skills/          # 12 Skills (markdown files)
    ├── jira-workflow/
    ├── confluence-workflow/
    ├── trading-context/
    ├── template-*/
    └── repo-*/
```

---

## Development

### Build TypeScript

```bash
# Development mode (watch)
npm run dev

# Production build
npm run build

# Type check
npm run typecheck

# Lint
npm run lint
```

### Run Tests

```bash
npm test
```

### Clean Build Artifacts

```bash
make clean
```

---

## Makefile Commands

```bash
make help              # Show all commands
make setup             # Install all dependencies
make build             # Build TypeScript
make app               # Run Electron app
make chat              # Interactive CLI chat
make package           # Build installer for current platform
make package-mac       # Build macOS .dmg
make package-win       # Build Windows .exe
make package-linux     # Build Linux .AppImage
make clean             # Clean build artifacts
make status            # Show project status
```

See `make help` for the full list.

---

## Troubleshooting

### Electron app won't start
```bash
# Rebuild everything
make clean
make setup
make build
```

### Configuration errors
- Check `.env` file exists and has all required fields
- Verify API keys are correct
- See `.env.example` for reference

### Build fails
```bash
# Clean and reinstall
npm run clean
rm -rf node_modules electron-app/node_modules
npm install
cd electron-app && npm install && cd ..
npm run build
```

### Permission denied errors
```bash
chmod +x dist/cli/index.js
chmod +x dist/mcp/server.js
```

---

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

---

## License

MIT License - See LICENSE file for details

---

## Support

- **Issues**: [GitHub Issues](https://github.com/zhuoli/confluence_assistant/issues)
- **Documentation**: See docs in repository
- **Makefile Guide**: `make help`

---

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- Powered by [Anthropic Claude](https://www.anthropic.com/claude) and [OpenAI](https://openai.com/)
- Uses [Model Context Protocol (MCP)](https://modelcontextprotocol.io/)
- Atlassian APIs for [Jira](https://developer.atlassian.com/cloud/jira/) and [Confluence](https://developer.atlassian.com/cloud/confluence/)
