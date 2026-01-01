# Atlassian AI Assistant

An AI-powered **Electron desktop application** that integrates with **enterprise Jira and Confluence** instances to help you manage work items and access team documentation.

## 🚀 Quick Start

```bash
# 1. Install dependencies
make setup

# 2. Configure credentials
make config
# Edit .env with your Jira/Confluence/OCI credentials

# 3. Build the application
make build

# 4. Test authentication (verify credentials work)
make test-auth

# 5. Run the desktop app
make app
```

**One-line setup:** `make quick-start` (does steps 1-4 automatically)

**Build installers:**
```bash
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

### ☁️ Oracle Cloud Integration
- ✅ **OCI MCP Server**: Manage Oracle Cloud Infrastructure resources
- ✅ **Session Token Auth**: Secure authentication using OCI session tokens
- ✅ **Compute Management**: List and inspect compute instances
- ✅ **OKE Clusters**: Manage Oracle Kubernetes Engine clusters and node pools
- ✅ **Bastion Hosts**: List bastions and active sessions
- ✅ **Compartments**: Browse organizational hierarchy

### 🏢 Enterprise-Ready
- ✅ Works with **self-hosted/on-premise** Atlassian instances
- ✅ Support for **custom domains** (e.g., confluence.companyinternal.com)
- ✅ **SSO compatible** via Personal Access Tokens (PAT)
- ✅ **MCP Architecture**: Modern, extensible design with multiple MCP servers
- ✅ **Fully configurable** - works with any Jira/Confluence deployment

---

## Requirements

- **Node.js 18+** - JavaScript runtime
- **npm 9+** - Package manager
- Enterprise Jira and/or Confluence instance
- Personal Access Token (PAT) for authentication
- **AI Provider** (choose one):
  - Anthropic API key (for Claude)
  - OpenAI API key (for ChatGPT)
  - OCI account with Generative AI service access (for OCI OpenAI)

---

## Architecture

```
┌──────────────────────────────────────────┐
│  Electron Desktop App                    │
│  - Modern UI                             │
│  - IPC Communication                     │
└──────────────┬───────────────────────────┘
               │
               ↓ (Node.js CLI)
┌──────────────────────────────────────────┐
│  TypeScript Agent SDK                    │
│  ├─ Config (Zod validation)              │
│  ├─ MCP Servers:                         │
│  │  • Atlassian MCP (10 tools)           │
│  │  • Oracle Cloud MCP (10 tools)        │
│  ├─ Skills Loader (12 skills)            │
│  ├─ Providers (3 supported):             │
│  │  - Claude (Anthropic)                 │
│  │  - OpenAI (ChatGPT)                   │
│  │  - OCI OpenAI (Oracle)                │
│  └─ API Clients (Axios-based)            │
└──────────────┬───────────────────────────┘
               │
               ↓ (REST APIs / OCI SDK)
┌──────────────────────────────────────────┐
│  Jira  │  Confluence  │  Oracle Cloud    │
└──────────────────────────────────────────┘
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

## Oracle Cloud MCP Server (Optional)

The Oracle Cloud MCP Server provides AI-powered tools for managing OCI resources.

### Prerequisites

1. **OCI CLI installed**: Install from https://docs.oracle.com/en-us/iaas/Content/API/SDKDocs/cliinstall.htm
2. **OCI account** with access to resources
3. **Session Token authentication** (REQUIRED - this is the ONLY supported auth method)

### Setup OCI Session Token

**IMPORTANT**: The OCI MCP server uses ONLY Session Token authentication for security.

```bash
# Create a session token (opens browser for authentication)
oci session authenticate --profile-name DEFAULT --region us-phoenix-1

# Verify session token is created
cat ~/.oci/config
# You should see session_token and related files listed
```

### Configure OCI MCP

**For Electron Desktop App (Recommended):**

1. Launch the Atlassian AI Assistant application
2. Click **⚙️ Settings** in the sidebar
3. Scroll to **🔌 MCP Servers** section
4. Enable **Oracle Cloud MCP** toggle
5. Click **Configure →** button
6. Fill in:
   - OCI Region (e.g., `us-phoenix-1`)
   - OCI Compartment ID (e.g., `ocid1.compartment.oc1..xxx`)
   - OCI Tenancy ID (e.g., `ocid1.tenancy.oc1..xxx`)
7. Click **Save Configuration**

Settings are automatically saved to your user directory and persist across app restarts.

**For CLI/Development (.env):**

```bash
# Enable OCI MCP
OCI_MCP_ENABLED=true

# OCI Region
OCI_MCP_REGION=us-phoenix-1

# OCI Compartment ID (where your resources are located)
OCI_MCP_COMPARTMENT_ID=ocid1.compartment.oc1..aaaaaaaa...

# OCI Tenancy ID
OCI_MCP_TENANCY_ID=ocid1.tenancy.oc1..aaaaaaaa...

# Optional: Custom config path (defaults to ~/.oci/config)
OCI_MCP_CONFIG_PATH=

# Optional: Profile name (defaults to DEFAULT)
OCI_MCP_PROFILE=
```

### Using OCI MCP Server

**Standalone MCP Server:**
```bash
# Start OCI MCP server
npm run mcp:oci

# Or directly
node dist/mcp/oci-server.js
```

**Available OCI Tools (10 tools):**
1. `test_oci_connection` - Test OCI authentication and connectivity
2. `list_oci_compartments` - List all compartments in tenancy
3. `list_oci_instances` - List compute instances
4. `get_oci_instance` - Get instance details
5. `list_oke_clusters` - List OKE (Kubernetes) clusters
6. `get_oke_cluster` - Get OKE cluster details
7. `list_oke_node_pools` - List node pools for a cluster
8. `list_oci_bastions` - List bastion hosts
9. `get_oci_bastion` - Get bastion details
10. `list_bastion_sessions` - List active bastion sessions

**Example Usage (via CLI):**
```bash
# Test OCI connection
"Test my OCI connection"

# List all compute instances
"Show me all compute instances in my compartment"

# List OKE clusters
"What OKE clusters do I have?"

# Get details of a specific cluster
"Show me details of cluster ocid1.cluster.oc1.phx.xxx"
```

### Finding Your OCIDs

```bash
# Get your Tenancy ID
oci iam tenancy get --tenancy-id <tenancy-ocid>

# List compartments
oci iam compartment list --compartment-id-in-subtree true

# Get current user info
oci iam user get --user-id <user-ocid>
```

### Session Token Renewal

Session tokens expire after a period of time. When expired, simply re-authenticate:

```bash
oci session authenticate --profile-name DEFAULT --region us-phoenix-1
```

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
- Configure settings through the **⚙️ Settings** interface

### Configuring the Desktop App

**All configuration is done through the Settings UI - no .env file needed!**

1. Click **⚙️ Settings** in the sidebar
2. **Main Settings Page:**
   - Choose AI Provider (Claude, OpenAI, or OCI OpenAI)
   - Enter provider-specific credentials
   - Test connection
   - Enable/disable MCP servers

3. **Configure MCP Servers:**
   - **Atlassian MCP** (Required) - Click "Configure →" to set up Jira/Confluence
   - **Oracle Cloud MCP** (Optional) - Enable toggle, then click "Configure →"

4. Click **Save Settings**

Settings are automatically saved to:
- **macOS:** `~/Library/Application Support/Atlassian AI Assistant/config.json`
- **Windows:** `%APPDATA%/Atlassian AI Assistant/config.json`
- **Linux:** `~/.config/Atlassian AI Assistant/config.json`

Settings persist across app restarts and updates!

### Building Installers

```bash
# Build macOS ARM64 .dmg installer (Apple Silicon M1/M2/M3/M4)
make package-mac
```

**Output:** Installers in `electron-app/dist/`
- DMG file: `Atlassian AI Assistant-3.0.0-arm64.dmg`
- ZIP file: `Atlassian AI Assistant-3.0.0-arm64-mac.zip`

### Automated Builds & Distribution with GitHub Actions

This repository includes **GitHub Actions workflows** for automated building and releasing:

- **Automatic builds** on every push to `main` branch
- **macOS Apple Silicon (ARM64)** optimized builds
- **Create releases** by pushing version tags (e.g., `git tag v3.0.0 && git push origin v3.0.0`)
- **GitHub Releases** with DMG installers automatically uploaded

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

# 4. GitHub Actions automatically builds ARM64 installer and creates release!
```

**Opening the downloaded app on macOS:**

If you get a security warning when opening the downloaded app, run:
```bash
xattr -c "/Applications/Atlassian AI Assistant.app"
```

Or right-click the app → "Open" → Click "Open" in the dialog.

---

## Configuration Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MODEL_PROVIDER` | No | AI provider (default: claude) | `claude` or `openai` |
| `MODEL_NAME` | No | Custom model name | `claude-3-5-sonnet-20241022` |
| `ANTHROPIC_API_KEY` | Yes* | Anthropic API key | `sk-ant-xxx...` |
| `OPENAI_API_KEY` | Yes* | OpenAI API key | `sk-xxx...` |
| `OCI_MCP_ENABLED` | No | Enable OCI MCP server | `true` or `false` (default: false) |
| `OCI_MCP_REGION` | Yes** | OCI region for resource management | `us-phoenix-1` |
| `OCI_MCP_COMPARTMENT_ID` | Yes** | OCI Compartment ID for MCP | `ocid1.compartment.oc1..xxx` |
| `OCI_MCP_TENANCY_ID` | Yes** | OCI Tenancy ID | `ocid1.tenancy.oc1..xxx` |
| `OCI_MCP_CONFIG_PATH` | No | OCI config file path for MCP | `~/.oci/config` |
| `OCI_MCP_PROFILE` | No | OCI profile name for MCP | `DEFAULT` |
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
**Required only when `OCI_MCP_ENABLED=true`

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
│   ├── api/                 # API clients (Jira/Confluence/OCI)
│   ├── mcp/                 # MCP servers + tools
│   │   ├── atlassian-server.ts  # Atlassian MCP server
│   │   ├── atlassian-types.ts   # Atlassian MCP tool definitions
│   │   ├── oci-server.ts        # Oracle Cloud MCP server
│   │   ├── oci-types.ts         # Oracle Cloud MCP tool definitions
│   │   └── tools/               # Tool implementations
│   ├── skills/              # Skills loader
│   ├── providers/           # AI providers (Claude/OpenAI/OCI)
│   ├── agent/               # Agent orchestrator
│   └── cli/                 # CLI interface
│
├── dist/                            # Compiled JavaScript
│   ├── cli/index.js                # CLI entry point
│   ├── mcp/atlassian-server.js     # Atlassian MCP server
│   └── mcp/oci-server.js           # Oracle Cloud MCP server
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

## Testing MCP Servers

Test MCP servers and authentication without involving an LLM provider.

### Quick Authentication Test

Verify your credentials work before testing MCP servers:

```bash
# Test Atlassian (Jira + Confluence) credentials
npm run test:auth:atlassian

# Test Oracle Cloud credentials
npm run test:auth:oci

# Test all authentication
npm run test:auth all
```

### Test MCP Protocol

Test MCP servers via JSON-RPC protocol (how LLMs communicate):

```bash
# Test Atlassian MCP server
npm run test:mcp:atlassian

# Test Oracle Cloud MCP server
npm run test:mcp:oci
```

### Interactive Testing with MCP Inspector

Launch official Anthropic MCP Inspector tool with GUI:

```bash
# Test Atlassian MCP interactively
npm run inspector:atlassian

# Test Oracle Cloud MCP interactively
npm run inspector:oci
```

The inspector opens in your browser and lets you:
- 📋 Browse all available tools
- 🔧 Call tools with custom arguments
- 📊 View server logs and debug output
- 🔍 Inspect tool schemas

### Comprehensive Testing Guide

For detailed testing instructions, troubleshooting, and advanced testing methods, see:

**📖 [Complete MCP Testing Guide](docs/TESTING_MCP_SERVERS.md)**

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

### Essential Commands
```bash
make help              # Show all available commands
make setup             # Install all dependencies (root + Electron)
make config            # Create .env configuration files
make build             # Build TypeScript to JavaScript
make app               # Launch Electron desktop app
make status            # Show project status
```

### MCP Server Testing
```bash
make test-auth                # Test all authentication (Atlassian + OCI)
make test-auth-atlassian      # Test Jira/Confluence authentication
make test-auth-oci            # Test Oracle Cloud authentication
make test-mcp-atlassian       # Test Atlassian MCP server via JSON-RPC
make test-mcp-oci             # Test OCI MCP server via JSON-RPC
make inspector-atlassian      # Launch MCP Inspector GUI (Atlassian)
make inspector-oci            # Launch MCP Inspector GUI (OCI)
```

### Package & Distribution
```bash
make package           # Build installer for current platform
make package-mac       # Build macOS ARM64 .dmg
make package-win       # Build Windows .exe
make package-linux     # Build Linux .AppImage/.deb
make package-all       # Build for all platforms
```

### Development & Maintenance
```bash
make build-dev         # Build in watch mode
make test              # Run unit tests
make lint              # Lint TypeScript code
make clean             # Clean build artifacts
make clean-all         # Clean everything including node_modules
```

### Quick Workflows
```bash
make quick-start       # Complete setup: install → config → build → test
make verify            # Verify installation and test credentials
```

See `make help` for the complete list with descriptions.

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
chmod +x dist/mcp/atlassian-server.js
chmod +x dist/mcp/oci-server.js
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
