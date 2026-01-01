#!/usr/bin/env node

/**
 * Quick verification script for Skills and MCP integration
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Skills and MCP Integration Verification');
console.log('='.repeat(60));
console.log('');

// Check 1: Skills directory
console.log('1. Skills Directory');
const skillsDir = path.join(__dirname, '.claude', 'skills');

if (fs.existsSync(skillsDir)) {
  const skills = fs.readdirSync(skillsDir)
    .filter(f => fs.statSync(path.join(skillsDir, f)).isDirectory());

  console.log(`✅ Found ${skills.length} skills:`);
  skills.forEach(skill => console.log(`   - ${skill}`));
} else {
  console.log('❌ Skills directory not found');
}

// Check 2: Skills loading in code
console.log('\n2. Skills Loading Code');
const agentSdkPath = path.join(__dirname, 'src', 'agent', 'agent-sdk.ts');

if (fs.existsSync(agentSdkPath)) {
  const code = fs.readFileSync(agentSdkPath, 'utf8');

  const loadSkills = code.includes('await this.skillsLoader.load()');
  const addToPrompt = code.includes('this.skillsLoader.getSkillsContext()');

  console.log(`   Skills loading: ${loadSkills ? '✅' : '❌'}`);
  console.log(`   Added to prompt: ${addToPrompt ? '✅' : '❌'}`);
} else {
  console.log('❌ agent-sdk.ts not found');
}

// Check 3: MCP servers
console.log('\n3. MCP Servers');
const mcpDir = path.join(__dirname, 'src', 'mcp');

if (fs.existsSync(mcpDir)) {
  const servers = fs.readdirSync(mcpDir)
    .filter(f => f.endsWith('-server.ts'));

  console.log(`✅ Found ${servers.length} MCP server definitions:`);
  servers.forEach(server => console.log(`   - ${server}`));
} else {
  console.log('❌ MCP directory not found');
}

// Check 4: MCP server startup
console.log('\n4. MCP Server Initialization');
if (fs.existsSync(agentSdkPath)) {
  const code = fs.readFileSync(agentSdkPath, 'utf8');

  // Check if MCP startup is commented out
  const mcpCommented = code.includes('// if (this.options.enableMCP !== false)');
  const mcpStartup = code.includes('await this.startMCPServer()') && !mcpCommented;

  if (mcpCommented) {
    console.log('❌ MCP server startup is COMMENTED OUT');
    console.log('   Location: src/agent/agent-sdk.ts lines 79-84');
    console.log('   Note: This means Jira/Confluence tools are NOT available');
  } else if (mcpStartup) {
    console.log('✅ MCP server startup is ENABLED');
  } else {
    console.log('⚠️  MCP server startup code not found');
  }
} else {
  console.log('❌ Cannot verify (agent-sdk.ts not found)');
}

// Check 5: System prompt claims
console.log('\n5. System Prompt Capabilities');
const baseProviderPath = path.join(__dirname, 'src', 'providers', 'base.ts');

if (fs.existsSync(baseProviderPath)) {
  const code = fs.readFileSync(baseProviderPath, 'utf8');

  const claimsJira = code.includes('Search tickets using JQL');
  const claimsConfluence = code.includes('Search pages');
  const mentionsMCP = code.includes('Use MCP Tools');

  console.log(`   Claims Jira capabilities: ${claimsJira ? '✅ (WARNING: tools may not be available!)' : '❌'}`);
  console.log(`   Claims Confluence capabilities: ${claimsConfluence ? '✅ (WARNING: tools may not be available!)' : '❌'}`);
  console.log(`   Mentions MCP Tools: ${mentionsMCP ? '✅ (WARNING: MCP may not be enabled!)' : '❌'}`);
}

// Check 6: Registered tools in compiled code
console.log('\n6. Actually Registered Tools (Electron Backend)');
const backendPath = path.join(__dirname, 'electron-app', 'backend-dist', 'cli', 'index.js');

if (fs.existsSync(backendPath)) {
  const code = fs.readFileSync(backendPath, 'utf8');

  // Count filesystem tools
  const filesystemMatch = code.match(/createFilesystemTools\(\) \{[\s\S]*?return \[([\s\S]*?)\];/);
  let filesystemCount = 0;
  if (filesystemMatch) {
    filesystemCount = (filesystemMatch[1].match(/name:/g) || []).length;
  }

  console.log(`   Filesystem tools: ${filesystemCount} tools`);
  console.log(`     (read_file, list_directory, search_files, get_file_info,`);
  console.log(`      list_code_repositories, get_project_overview, find_relevant_files)`);

  // Check for Jira/Confluence tools
  const hasJiraTools = code.includes('search_jira_tickets') || code.includes('get_sprint_tasks');
  const hasConfluenceTools = code.includes('search_confluence') || code.includes('get_confluence_page');

  console.log(`   Jira tools: ${hasJiraTools ? '✅ registered' : '❌ NOT registered'}`);
  console.log(`   Confluence tools: ${hasConfluenceTools ? '✅ registered' : '❌ NOT registered'}`);
} else {
  console.log('❌ Backend not compiled (run: cd electron-app && npm run prebuild)');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Summary:');
console.log('');

const skillsOk = fs.existsSync(skillsDir);
const agentSdkCode = fs.existsSync(agentSdkPath) ? fs.readFileSync(agentSdkPath, 'utf8') : '';
const skillsLoaded = agentSdkCode.includes('await this.skillsLoader.load()');
const mcpDisabled = agentSdkCode.includes('// if (this.options.enableMCP !== false)');

if (skillsOk && skillsLoaded) {
  console.log('✅ SKILLS: Properly loaded and available to agent');
} else {
  console.log('❌ SKILLS: Issue detected');
}

if (mcpDisabled) {
  console.log('❌ MCP SERVERS: Disabled (Jira/Confluence tools NOT available)');
  console.log('');
  console.log('⚠️  WARNING: System prompt CLAIMS Jira/Confluence capabilities,');
  console.log('   but the tools are NOT actually registered!');
  console.log('');
  console.log('   This means users asking Jira/Confluence questions will get');
  console.log('   errors or generic responses.');
} else {
  console.log('✅ MCP SERVERS: Enabled');
}

console.log('');
console.log('For detailed analysis and recommendations, see:');
console.log('  SKILLS_MCP_DIAGNOSTIC.md');
console.log('='.repeat(60));
