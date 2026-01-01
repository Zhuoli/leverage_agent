# Skills and MCP Integration Diagnostic Report

**Date**: 2026-01-01
**Status**: ⚠️ CRITICAL ISSUES FOUND

## Executive Summary

The chatbot **DOES load Skills** but **DOES NOT load MCP servers**. This means:
- ✅ Skills (technical design templates, Jira workflows, etc.) ARE available
- ❌ Jira tools (search tickets, create tickets) are NOT available
- ❌ Confluence tools (search pages, create pages) are NOT available
- ❌ OCI tools are NOT available

**Impact**: The agent THINKS it has Jira/Confluence capabilities (system prompt says so) but CANNOT actually use them (tools not registered).

---

## Detailed Findings

### ✅ Skills: WORKING

**Evidence:**
```typescript
// src/agent/agent-sdk.ts lines 73-77
if (this.options.enableSkills !== false) {
  console.error('Loading Skills...');
  await this.skillsLoader.load();
  console.error(`✓ Loaded ${this.skillsLoader.getCount()} skills`);
}

// lines 412-414
if (this.skillsLoader.isLoaded() && this.skillsLoader.getCount() > 0) {
  const skillsContext = this.skillsLoader.getSkillsContext();
  return basePrompt + '\n\n' + skillsContext;  // Skills added to prompt!
}
```

**Available Skills** (from `.claude/skills/`):
1. ✅ **confluence-workflow** - Confluence best practices
2. ✅ **jira-workflow** - Jira workflow management
3. ✅ **repo-runbooks-ops** - Operational runbooks
4. ✅ **repo-shepherd-releases** - Release management
5. ✅ **template-runbook** - Runbook template
6. ✅ **template-technical-design** - Technical design document template (ECAR format)

**Verification:**
```bash
$ cd electron-app && npm start
# Console shows:
✓ Loaded 6 skills from .../electron-app/.claude/skills
```

**System Prompt Includes:**
```
# Available Skills

## Skill: template-technical-design
**Description**: Template for Technical Design Documents following ECAR format

# Technical Design Document Template (ECAR Format)
...
```

### ❌ MCP Servers: NOT WORKING

**Evidence:**
```typescript
// src/agent/agent-sdk.ts lines 79-84
// Start MCP server (optional)
// NOTE: MCP server startup is currently disabled as tools are integrated directly
// TODO: Implement individual MCP server startup (atlassian-server, oci-server) based on config
// if (this.options.enableMCP !== false) {
//   await this.startMCPServer();
// }
```

**MCP servers are COMMENTED OUT!** They are not being started.

**Available MCP Servers** (NOT being used):
1. ❌ **atlassian-server.ts** - Jira & Confluence tools
2. ❌ **oci-server.ts** - Oracle Cloud Infrastructure tools
3. ❌ **filesystem-server.ts** - File system access (redundant with direct filesystem tools)

**Tools Currently Registered:**
Only **7 filesystem tools** are registered:
1. `read_file`
2. `list_directory`
3. `search_files`
4. `get_file_info`
5. `list_code_repositories`
6. `get_project_overview` (new)
7. `find_relevant_files` (new)

**Missing Tools** (should be available from MCP servers):

From `atlassian-server.ts`:
- ❌ `search_jira_tickets` - Search Jira using JQL
- ❌ `get_sprint_tasks` - Get current sprint tasks
- ❌ `create_jira_ticket` - Create new tickets
- ❌ `update_jira_ticket` - Update existing tickets
- ❌ `add_jira_comment` - Add comments
- ❌ `search_confluence` - Search Confluence pages
- ❌ `get_confluence_page` - Read page content
- ❌ `create_confluence_page` - Create new pages
- ❌ `update_confluence_page` - Update pages

From `oci-server.ts`:
- ❌ OCI-specific tools (if configured)

### ⚠️ Misleading System Prompt

**The Problem:**
```typescript
// src/providers/base.ts lines 30-73
**Your Capabilities:**

Jira:
- Search tickets using JQL              ← CLAIMS this works
- Get sprint tasks                      ← CLAIMS this works
- Create and update tickets             ← CLAIMS this works
...

**Guidelines:**
1. **Use MCP Tools** to interact with Jira/Confluence  ← SAYS to use MCP tools
```

But MCP tools are NOT registered! The agent will try to use them and fail.

---

## Root Cause Analysis

### Why MCP Servers Are Disabled

Looking at the TODO comment in `agent-sdk.ts`:
```
NOTE: MCP server startup is currently disabled as tools are integrated directly
TODO: Implement individual MCP server startup (atlassian-server, oci-server) based on config
```

**Interpretation:**
- Original plan: Integrate MCP tools directly (not as separate processes)
- Current status: **Incomplete** - tools NOT integrated directly AND servers not started
- Result: **No Jira/Confluence tools available at all**

### Architecture Mismatch

**MCP Servers Are Designed As:**
Standalone processes communicating via stdio:
```typescript
// src/mcp/atlassian-server.ts
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Agent SDK Expects:**
Direct tool registration:
```typescript
// Only filesystem tools are registered directly
if ('registerTools' in this.provider) {
  const tools = this.createFilesystemTools();
  const handler = this.createToolHandler();
  (this.provider as any).registerTools(tools, handler);
}
```

**Gap:** No code to:
1. Start MCP servers as child processes
2. Connect to them via stdio
3. Proxy tool calls from agent to MCP servers
4. Return results back to agent

---

## Impact Assessment

### For Users Asking Code Questions ✅
**Status**: WORKING

Users can ask:
- "Write a technical design document for JustTrade"
- "Analyze this codebase"
- "Find files related to authentication"

**Why it works:**
- Filesystem tools ARE available (7 tools)
- Skills ARE loaded (technical design template, etc.)
- Anchor file strategy works

### For Users Asking Jira/Confluence Questions ❌
**Status**: BROKEN

Users asking:
- "Show me my sprint tasks"
- "Create a Jira ticket"
- "Search Confluence for API documentation"

**What happens:**
1. Agent sees system prompt claiming it has Jira/Confluence capabilities
2. Agent tries to use MCP tools (e.g., `search_jira_tickets`)
3. **Tool not found error** (tool not registered)
4. Agent fails or gives generic response

---

## Recommendations

### Option 1: Enable MCP Servers (Recommended for Full Functionality)

**Implement the TODO** by adding MCP server startup logic:

```typescript
// src/agent/agent-sdk.ts

private mcpServers: Map<string, ChildProcess> = new Map();

async startMCPServers() {
  const { spawn } = await import('child_process');
  const projectRoot = resolve(__dirname, '..', '..');

  // Start Atlassian MCP server if configured
  if (this.config.jiraUrl && this.config.confluenceUrl) {
    const atlassianServerPath = join(projectRoot, 'dist', 'mcp', 'atlassian-server.js');
    const atlassianProcess = spawn('node', [atlassianServerPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: process.env,
    });

    this.mcpServers.set('atlassian', atlassianProcess);
    console.error('✓ Atlassian MCP server started');
  }

  // Start OCI MCP server if configured
  if (this.config.ociConfigPath) {
    const ociServerPath = join(projectRoot, 'dist', 'mcp', 'oci-server.js');
    const ociProcess = spawn('node', [ociServerPath], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: process.env,
    });

    this.mcpServers.set('oci', ociProcess);
    console.error('✓ OCI MCP server started');
  }
}

// In initialize():
if (this.options.enableMCP !== false) {
  await this.startMCPServers();
}
```

**Then:** Connect to MCP servers via stdio and proxy tool calls.

**Complexity:** HIGH (requires implementing MCP client protocol)

### Option 2: Direct Tool Integration (Simpler, Partial Solution)

Register Jira/Confluence tools directly in the provider (like filesystem tools):

```typescript
// src/agent/agent-sdk.ts

private createAtlassianTools(): Tool[] {
  return [
    {
      name: 'search_jira_tickets',
      description: 'Search Jira tickets using JQL',
      input_schema: {
        type: 'object',
        properties: {
          jql: { type: 'string', description: 'JQL query string' },
        },
        required: ['jql'],
      },
    },
    // ... more Jira/Confluence tools
  ];
}

private createAtlassianToolHandler() {
  const jiraClient = new JiraClient(this.config);
  const confluenceClient = new ConfluenceClient(this.config);

  return async (toolName: string, toolInput: any) => {
    switch (toolName) {
      case 'search_jira_tickets':
        return await jiraClient.searchTickets(toolInput.jql);
      // ... more handlers
    }
  };
}

// In initialize():
if (this.config.jiraUrl || this.config.confluenceUrl) {
  const atlassianTools = this.createAtlassianTools();
  const atlassianHandler = this.createAtlassianToolHandler();

  // Merge with filesystem tools
  const allTools = [...this.createFilesystemTools(), ...atlassianTools];
  const combinedHandler = /* ... */;

  (this.provider as any).registerTools(allTools, combinedHandler);
}
```

**Complexity:** MEDIUM (reuse existing client code, skip MCP protocol)

### Option 3: Update System Prompt (Quick Fix, Degrades UX)

Remove misleading Jira/Confluence claims from system prompt if MCP not enabled:

```typescript
// src/agent/agent-sdk.ts

private buildSystemPrompt(): string {
  let basePrompt = `You are an AI assistant...`;

  // Only mention Jira/Confluence if MCP servers are actually running
  if (this.mcpServers.size > 0) {
    basePrompt += `\n\n**Your Capabilities:**\n\nJira:\n- Search tickets...`;
  } else {
    basePrompt += `\n\n**Note**: Jira and Confluence tools are not currently enabled.`;
  }

  // Always add code repository capabilities
  if (this.filesystemTools && this.filesystemTools.isAvailable()) {
    basePrompt += `\n\n**Code Repository Access:**...`;
  }

  return basePrompt;
}
```

**Complexity:** LOW (honest about capabilities)

---

## Recommended Action Plan

### Phase 1: Immediate (Today) ✅
**Fix the misleading system prompt**

1. Update `buildSystemPrompt()` to only claim Jira/Confluence capabilities if MCP servers are enabled
2. This prevents user confusion when asking Jira/Confluence questions

### Phase 2: Short-term (This Week) 🔧
**Implement Option 2: Direct Tool Integration**

1. Create `createAtlassianTools()` and `createAtlassianToolHandler()`
2. Register Jira/Confluence tools directly (skip MCP protocol)
3. Test with real Jira/Confluence queries

### Phase 3: Long-term (Next Sprint) 🚀
**Implement Option 1: Full MCP Server Support**

1. Implement MCP client protocol
2. Start MCP servers as child processes
3. Proxy tool calls via stdio
4. Enable hot-reload of MCP servers

---

## Testing Checklist

### Skills Integration ✅
- [x] Skills are loaded from `.claude/skills/`
- [x] Skills context is added to system prompt
- [x] Technical design template is available
- [x] Agent can reference Skills when answering

**Verification:**
```bash
cd electron-app && npm start
# Look for: ✓ Loaded 6 skills
```

### MCP Tools Integration ❌
- [ ] MCP servers are started
- [ ] Jira tools are registered
- [ ] Confluence tools are registered
- [ ] Agent can search Jira tickets
- [ ] Agent can create Confluence pages

**Verification:**
```bash
# Ask the agent: "Show me my current sprint tasks"
# Expected: Should return actual Jira data
# Actual: Tool not found error or generic response
```

### System Prompt Accuracy ⚠️
- [ ] System prompt only claims capabilities that are available
- [ ] No mention of MCP tools if servers not started
- [ ] Clear about what the agent CAN and CANNOT do

---

## Current State Summary

| Feature | Status | Evidence |
|---------|--------|----------|
| **Skills Loading** | ✅ WORKING | Console shows "✓ Loaded 6 skills" |
| **Skills in Prompt** | ✅ WORKING | System prompt includes skill content |
| **MCP Server Startup** | ❌ DISABLED | Code commented out in agent-sdk.ts |
| **Jira Tools** | ❌ NOT AVAILABLE | No tool registration |
| **Confluence Tools** | ❌ NOT AVAILABLE | No tool registration |
| **Filesystem Tools** | ✅ WORKING | 7 tools registered |
| **System Prompt Claims** | ⚠️ MISLEADING | Claims Jira/Confluence access but tools missing |

---

## Files to Modify

### Immediate Fix (Option 3):
- [ ] `src/agent/agent-sdk.ts` - Update `buildSystemPrompt()`
- [ ] `src/providers/base.ts` - Update `getDefaultSystemPrompt()`

### Short-term (Option 2):
- [ ] `src/agent/agent-sdk.ts` - Add direct tool integration
- [ ] Reuse `src/api/jira-client.ts` and `src/api/confluence-client.ts`

### Long-term (Option 1):
- [ ] `src/agent/agent-sdk.ts` - Implement MCP client protocol
- [ ] `src/agent/mcp-client.ts` - New file for MCP communication
- [ ] `src/mcp/atlassian-server.ts` - Already exists, ready to use
- [ ] `src/mcp/oci-server.ts` - Already exists, ready to use

---

**Next Step**: Would you like me to implement Option 3 (update system prompt) immediately, then work on Option 2 (direct tool integration)?
