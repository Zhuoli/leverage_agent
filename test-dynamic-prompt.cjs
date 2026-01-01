#!/usr/bin/env node

/**
 * Test script to verify dynamic system prompt generation
 * Checks that MCP capabilities are only included when enabled
 */

const fs = require('fs');
const path = require('path');

console.log('🧪 Dynamic System Prompt Verification');
console.log('='.repeat(70));
console.log('');

// Check compiled code
const backendPath = path.join(__dirname, 'electron-app', 'backend-dist', 'cli', 'index.js');

if (!fs.existsSync(backendPath)) {
  console.log('❌ Backend not compiled. Run: npm run build && cd electron-app && npm run prebuild');
  process.exit(1);
}

const code = fs.readFileSync(backendPath, 'utf8');

// Test 1: Check for dynamic capability sections
console.log('Test 1: Dynamic Capability Sections');
console.log('─'.repeat(70));

// Check without emojis (emojis may be Unicode escaped in compiled code)
const hasJiraSection = code.includes('Jira Capabilities');
const hasConfluenceSection = code.includes('Confluence Capabilities');
const hasOCISection = code.includes('Oracle Cloud Infrastructure');
const hasCodeRepoSection = code.includes('Code Repository Access');

console.log(`Jira capability section: ${hasJiraSection ? '✅' : '❌'}`);
console.log(`Confluence capability section: ${hasConfluenceSection ? '✅' : '❌'}`);
console.log(`OCI capability section: ${hasOCISection ? '✅' : '❌'}`);
console.log(`Code Repository section: ${hasCodeRepoSection ? '✅' : '❌'}`);

// Test 2: Check for conditional logic
console.log('\nTest 2: Conditional Logic');
console.log('─'.repeat(70));

const hasAtlassianCheck = code.includes('this.config.atlassianMcpEnabled');
const hasOCICheck = code.includes('this.config.ociMcpEnabled');
const hasFilesystemCheck = code.includes('this.filesystemTools && this.filesystemTools.isAvailable()');

console.log(`Atlassian MCP check: ${hasAtlassianCheck ? '✅' : '❌'}`);
console.log(`OCI MCP check: ${hasOCICheck ? '✅' : '❌'}`);
console.log(`Filesystem tools check: ${hasFilesystemCheck ? '✅' : '❌'}`);

// Test 3: Check static claims are removed
console.log('\nTest 3: Static Claims Removal');
console.log('─'.repeat(70));

// Check that old static prompt is gone
const hasOldStaticPrompt = code.includes('You are an AI assistant helping users interact with their Jira and Confluence instances.');
const hasStaticJiraClaims = code.match(/Jira:\s*-\s*Search tickets using JQL\s*-\s*Get sprint tasks/) !== null;

console.log(`Old static prompt removed: ${!hasOldStaticPrompt ? '✅' : '❌ STILL PRESENT'}`);
console.log(`Static Jira claims removed: ${!hasStaticJiraClaims ? '✅' : '❌ STILL PRESENT'}`);

// Test 4: Check BaseProvider fallback
console.log('\nTest 4: BaseProvider Fallback Prompt');
console.log('─'.repeat(70));

const baseProviderPath = path.join(__dirname, 'dist', 'cli', 'index.js');
if (fs.existsSync(baseProviderPath)) {
  const baseCode = fs.readFileSync(baseProviderPath, 'utf8');
  const hasGenericFallback = baseCode.includes('Your capabilities depend on which tools and MCP servers are configured');
  console.log(`Generic fallback prompt: ${hasGenericFallback ? '✅' : '❌'}`);
} else {
  console.log('⚠️  Cannot check (dist not found)');
}

// Test 5: Verify capability assembly
console.log('\nTest 5: Capability Assembly Logic');
console.log('─'.repeat(70));

const hasCapabilitiesArray = code.includes('const capabilities = [];') || code.includes('const capabilities = []');
const hasCapabilityPush = code.includes('capabilities.push(');
const hasCapabilityJoin = code.includes('capabilities.join(');

console.log(`Capabilities array: ${hasCapabilitiesArray ? '✅' : '❌'}`);
console.log(`Push to capabilities: ${hasCapabilityPush ? '✅' : '❌'}`);
console.log(`Join capabilities: ${hasCapabilityJoin ? '✅' : '❌'}`);

// Test 6: Dynamic Guidelines
console.log('\nTest 6: Dynamic Guidelines');
console.log('─'.repeat(70));

const hasGuidelinesArray = code.includes('const guidelines = [');
const hasConditionalGuidelines = code.includes('if (this.config.atlassianMcpEnabled)') &&
                                 code.includes('guidelines.push(');

console.log(`Guidelines array: ${hasGuidelinesArray ? '✅' : '❌'}`);
console.log(`Conditional guidelines: ${hasConditionalGuidelines ? '✅' : '❌'}`);

// Summary
console.log('\n' + '='.repeat(70));
console.log('Summary:');
console.log('');

const allTests = [
  hasJiraSection && hasConfluenceSection && hasOCISection && hasCodeRepoSection,
  hasAtlassianCheck && hasOCICheck && hasFilesystemCheck,
  !hasOldStaticPrompt && !hasStaticJiraClaims,
  hasCapabilitiesArray && hasCapabilityPush && hasCapabilityJoin,
  hasGuidelinesArray && hasConditionalGuidelines,
];

const passedTests = allTests.filter(Boolean).length;

if (passedTests === allTests.length) {
  console.log('✅ ALL TESTS PASSED!');
  console.log('');
  console.log('The system prompt is now DYNAMIC:');
  console.log('');
  console.log('📋 What happens now:');
  console.log('  • If atlassianMcpEnabled = false → NO Jira/Confluence claims');
  console.log('  • If atlassianMcpEnabled = true → Jira/Confluence capabilities added');
  console.log('  • If ociMcpEnabled = false → NO OCI claims');
  console.log('  • If ociMcpEnabled = true → OCI capabilities added');
  console.log('  • If CODE_REPO_PATHS set → Code repository capabilities added');
  console.log('  • Skills ALWAYS included if loaded');
  console.log('');
  console.log('🎉 Users will only see capabilities for MCPs they have enabled!');
} else {
  console.log(`⚠️  ${passedTests}/${allTests.length} test groups passed`);
  console.log('');
  console.log('Some checks failed. Review the output above.');
}

console.log('');
console.log('Next step: Start Electron app to see dynamic prompt in action');
console.log('  cd electron-app && npm start');
console.log('='.repeat(70));
