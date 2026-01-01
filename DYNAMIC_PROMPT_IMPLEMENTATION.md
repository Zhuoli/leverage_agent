# Dynamic System Prompt Implementation ✅

**Date**: 2026-01-01
**Status**: COMPLETE

## Overview

The system prompt is now **dynamically generated** based on which MCP servers the user has enabled in their configuration. The agent will ONLY claim capabilities for tools that are actually available.

---

## What Changed

### Before ❌
```
System Prompt (STATIC):
  ✗ ALWAYS claimed Jira capabilities
  ✗ ALWAYS claimed Confluence capabilities
  ✗ Misleading when MCP servers not enabled
  ✗ Users got errors when asking Jira/Confluence questions
```

### After ✅
```
System Prompt (DYNAMIC):
  ✓ Claims Jira capabilities ONLY if atlassianMcpEnabled = true
  ✓ Claims Confluence capabilities ONLY if atlassianMcpEnabled = true
  ✓ Claims OCI capabilities ONLY if ociMcpEnabled = true
  ✓ Claims Code Repository access ONLY if CODE_REPO_PATHS set
  ✓ Skills ALWAYS included if loaded
```

---

## How It Works

### Configuration Flags

The system prompt checks these config flags at runtime:

| Config Flag | Purpose | When Capabilities Added |
|-------------|---------|------------------------|
| `atlassianMcpEnabled` | Enable Jira/Confluence MCP | When `true` AND valid Jira/Confluence credentials |
| `ociMcpEnabled` | Enable OCI resource management | When `true` AND valid OCI region/compartment |
| `CODE_REPO_PATHS` | Code repository access | When environment variable is set |
| Skills loaded | Best practices & templates | When `.claude/skills/` contains skills |

### Dynamic Sections

The buildSystemPrompt() method now builds sections conditionally:

```typescript
// src/agent/agent-sdk.ts

private buildSystemPrompt(): string {
  let basePrompt = `You are an AI assistant that helps users with various tasks.`;
  const capabilities: string[] = [];

  // Only add Jira/Confluence if enabled
  if (this.config.atlassianMcpEnabled && this.config.jiraUrl && this.config.confluenceUrl) {
    capabilities.push(`
## 🎫 Jira Capabilities
- Search tickets using JQL
- Get sprint tasks
- Create and update tickets
...
`);

    capabilities.push(`
## 📚 Confluence Capabilities
- Search pages
- Create and update pages
...
`);
  }

  // Only add OCI if enabled
  if (this.config.ociMcpEnabled && this.config.ociMcpRegion) {
    capabilities.push(`
## ☁️ Oracle Cloud Infrastructure
- Resource management
- Compute instances
...
`);
  }

  // Only add Code Repository if available
  if (this.filesystemTools && this.filesystemTools.isAvailable()) {
    capabilities.push(`
## 💻 Code Repository Access
- get_project_overview()
- find_relevant_files()
...
`);
  }

  // Assemble prompt
  if (capabilities.length > 0) {
    basePrompt += '\n\n# Your Capabilities\n';
    basePrompt += capabilities.join('');
  } else {
    basePrompt += '\n\nNote: No MCP servers or code repositories are currently configured.';
  }

  // Add Skills if loaded
  if (this.skillsLoader.isLoaded() && this.skillsLoader.getCount() > 0) {
    basePrompt += '\n\n' + this.skillsLoader.getSkillsContext();
  }

  return basePrompt;
}
```

---

## Example Scenarios

### Scenario 1: User Has Only Code Repository Access

**Config:**
```env
# .env
CODE_REPO_PATHS=/Users/zhuoli/Projects/github/zhuoli/JustTrade
ATLASSIAN_MCP_ENABLED=false
OCI_MCP_ENABLED=false
```

**Generated System Prompt:**
```
You are an AI assistant that helps users with various tasks.

# Your Capabilities

## 💻 Code Repository Access

You have access to the following code repositories:
  - /Users/zhuoli/Projects/github/zhuoli/JustTrade

**Available Tools:**
- get_project_overview - Read README, Makefile, package.json
- find_relevant_files - Find files by relevance scoring
- read_file - Read specific files
...

# Guidelines

1. Be helpful and provide clear, actionable responses
2. When analyzing code, read relevant files and provide specific insights
3. Always start code exploration with get_project_overview()
4. Reference Skills for best practices and templates

# Available Skills

## Skill: template-technical-design
...
```

**What User Can Do:**
- ✅ Ask code questions: "Write a technical design document"
- ✅ Analyze codebases: "How does authentication work?"
- ❌ Ask Jira questions: System prompt doesn't claim Jira access
- ❌ Ask Confluence questions: System prompt doesn't claim Confluence access

---

### Scenario 2: User Has Jira/Confluence + Code Repository

**Config:**
```env
# .env
CODE_REPO_PATHS=/Users/zhuoli/Projects/github/zhuoli/JustTrade
ATLASSIAN_MCP_ENABLED=true
JIRA_URL=https://company.atlassian.net
JIRA_USERNAME=user@company.com
JIRA_API_TOKEN=xxx
CONFLUENCE_URL=https://company.atlassian.net/wiki
CONFLUENCE_USERNAME=user@company.com
CONFLUENCE_API_TOKEN=xxx
OCI_MCP_ENABLED=false
```

**Generated System Prompt:**
```
You are an AI assistant that helps users with various tasks.

# Your Capabilities

## 🎫 Jira Capabilities

You have access to Jira MCP tools for:
- Search tickets using JQL
- Get sprint tasks
...

**Available Jira Tools:**
- search_jira_tickets
- get_sprint_tasks
...

## 📚 Confluence Capabilities

You have access to Confluence MCP tools for:
- Search pages
- Create and update pages
...

## 💻 Code Repository Access
...

# Guidelines

1. Be helpful and provide clear, actionable responses
2. Format output with ticket keys and links
3. Highlight priorities and blockers
4. When analyzing code, read relevant files and provide specific insights
5. Always start code exploration with get_project_overview()
6. Reference Skills for best practices and templates

# Available Skills
...
```

**What User Can Do:**
- ✅ Ask Jira questions: "Show me my sprint tasks"
- ✅ Ask Confluence questions: "Search for API documentation"
- ✅ Ask code questions: "Analyze this codebase"
- ❌ Ask OCI questions: System prompt doesn't claim OCI access

---

### Scenario 3: User Has Everything Enabled

**Config:**
```env
ATLASSIAN_MCP_ENABLED=true
OCI_MCP_ENABLED=true
OCI_MCP_REGION=us-phoenix-1
OCI_MCP_COMPARTMENT_ID=ocid1.compartment...
CODE_REPO_PATHS=/path/to/repo
```

**Generated System Prompt:**
```
You are an AI assistant that helps users with various tasks.

# Your Capabilities

## 🎫 Jira Capabilities
...

## 📚 Confluence Capabilities
...

## ☁️ Oracle Cloud Infrastructure (OCI) Capabilities

You have access to OCI MCP tools for:
- Resource Management
- Compute Instances
- Storage
- Networking

**OCI Configuration:**
- Region: us-phoenix-1
- Compartment: ocid1.compartment...

## 💻 Code Repository Access
...

# Guidelines

1. Be helpful and provide clear, actionable responses
2. Format output with ticket keys and links
3. Highlight priorities and blockers
4. When analyzing code, read relevant files and provide specific insights
5. Always start code exploration with get_project_overview()
6. Reference Skills for best practices and templates

# Available Skills
...
```

**What User Can Do:**
- ✅ Ask Jira questions
- ✅ Ask Confluence questions
- ✅ Ask OCI questions
- ✅ Ask code questions

---

## Files Modified

### 1. `src/agent/agent-sdk.ts`
**Changed:** `buildSystemPrompt()` method

**Before:**
- Static prompt claiming Jira/Confluence always

**After:**
- Dynamic sections based on config flags
- Conditional capabilities array
- Guidelines adapt to available tools

### 2. `src/providers/base.ts`
**Changed:** `getDefaultSystemPrompt()` method

**Before:**
- Hardcoded Jira/Confluence claims

**After:**
- Generic fallback stating capabilities depend on configuration
- Used only when no custom system prompt provided

---

## Verification

Run the verification script:
```bash
node test-dynamic-prompt.cjs
```

**Expected Output:**
```
✅ ALL TESTS PASSED!

The system prompt is now DYNAMIC:

📋 What happens now:
  • If atlassianMcpEnabled = false → NO Jira/Confluence claims
  • If atlassianMcpEnabled = true → Jira/Confluence capabilities added
  • If ociMcpEnabled = false → NO OCI claims
  • If ociMcpEnabled = true → OCI capabilities added
  • If CODE_REPO_PATHS set → Code repository capabilities added
  • Skills ALWAYS included if loaded

🎉 Users will only see capabilities for MCPs they have enabled!
```

---

## Benefits

### For Users ✅
1. **Honest capabilities**: System prompt only claims what's actually available
2. **No confusing errors**: Won't try to use tools that don't exist
3. **Clear expectations**: User knows exactly what the agent can do
4. **Flexible configuration**: Enable/disable MCPs as needed

### For Developers ✅
1. **Maintainable**: One source of truth (config flags)
2. **Extensible**: Easy to add new MCP types
3. **Testable**: Can verify prompt generation for each config combination
4. **Clean code**: Removes redundant static claims

---

## Configuration Guide

### Enable Jira/Confluence MCP

In `.env`:
```env
ATLASSIAN_MCP_ENABLED=true
JIRA_URL=https://your-company.atlassian.net
JIRA_USERNAME=your-email@company.com
JIRA_API_TOKEN=your-jira-api-token
CONFLUENCE_URL=https://your-company.atlassian.net/wiki
CONFLUENCE_USERNAME=your-email@company.com
CONFLUENCE_API_TOKEN=your-confluence-api-token
CONFLUENCE_SPACE_KEY=YOUR_SPACE
```

**Result:** System prompt will include Jira and Confluence capabilities

### Enable OCI MCP

In `.env`:
```env
OCI_MCP_ENABLED=true
OCI_MCP_REGION=us-phoenix-1
OCI_MCP_COMPARTMENT_ID=ocid1.compartment.oc1..xxx
OCI_MCP_TENANCY_ID=ocid1.tenancy.oc1..xxx
OCI_MCP_CONFIG_PATH=~/.oci/config  # optional
OCI_MCP_PROFILE=DEFAULT  # optional
```

**Result:** System prompt will include OCI capabilities

### Enable Code Repository Access

In `.env`:
```env
CODE_REPO_PATHS=/path/to/repo1:/path/to/repo2
```

**Result:** System prompt will include code repository capabilities

### Skills (Always Enabled)

Place skills in `.claude/skills/`:
```
.claude/skills/
  ├── template-technical-design/
  │   └── SKILL.md
  ├── jira-workflow/
  │   └── SKILL.md
  └── ...
```

**Result:** Skills always included in system prompt if loaded

---

## Testing the Dynamic Prompt

### Test 1: No MCPs Enabled

**Setup:**
```env
ATLASSIAN_MCP_ENABLED=false
OCI_MCP_ENABLED=false
CODE_REPO_PATHS=
```

**Start app:**
```bash
cd electron-app && npm start
```

**Expected System Prompt:**
- ❌ No Jira capabilities section
- ❌ No Confluence capabilities section
- ❌ No OCI capabilities section
- ❌ No Code Repository section
- ✅ Skills section (if skills exist)
- ✅ Note: "No MCP servers or code repositories are currently configured"

### Test 2: Only Code Repository

**Setup:**
```env
CODE_REPO_PATHS=/Users/zhuoli/Projects/github/zhuoli/JustTrade
```

**Expected:**
- ✅ Code Repository section
- ✅ Skills section
- ❌ No Jira/Confluence sections

**Ask:** "Write a technical design document for JustTrade"
**Result:** Should work perfectly using get_project_overview() + skills

### Test 3: Jira/Confluence Enabled

**Setup:**
```env
ATLASSIAN_MCP_ENABLED=true
# ... with valid Jira/Confluence credentials
```

**Expected:**
- ✅ Jira capabilities section
- ✅ Confluence capabilities section
- ✅ Skills section

**Ask:** "Show me my sprint tasks"
**Result:** Should attempt to use search_jira_tickets (though tool may not be registered yet - see SKILLS_MCP_DIAGNOSTIC.md)

---

## Next Steps

### Phase 1: DONE ✅
- [x] Update buildSystemPrompt() to be dynamic
- [x] Remove static Jira/Confluence claims
- [x] Add conditional sections for each MCP type
- [x] Build and verify implementation

### Phase 2: TODO 🔧
- [ ] Actually register Jira/Confluence tools when atlassianMcpEnabled=true
- [ ] Actually register OCI tools when ociMcpEnabled=true
- [ ] Test end-to-end with real Jira/Confluence queries

See `SKILLS_MCP_DIAGNOSTIC.md` for details on implementing Phase 2.

---

## Summary

✅ **System prompt is now honest and dynamic**

The agent will ONLY claim capabilities for MCPs that are actually enabled:
- Jira/Confluence → Only if `atlassianMcpEnabled=true`
- OCI → Only if `ociMcpEnabled=true`
- Code Repository → Only if `CODE_REPO_PATHS` set
- Skills → Always (if loaded)

This eliminates misleading capability claims and provides users with accurate expectations about what the agent can do.

🎉 **Ready to use! Start the Electron app and test it.**
