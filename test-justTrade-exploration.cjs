#!/usr/bin/env node

/**
 * Test script to verify anchor file strategy works on JustTrade repository
 * This tests the core functionality without running the full Electron app
 */

const path = require('path');
const fs = require('fs');

// Path to JustTrade repository
const JUST_TRADE_PATH = '/Users/zhuoli/Projects/github/zhuoli/JustTrade';

console.log('🧪 Testing Anchor File Strategy on JustTrade Repository');
console.log('='.repeat(60));
console.log('');

// Test 1: Check if JustTrade exists
console.log('Test 1: Repository exists');
if (fs.existsSync(JUST_TRADE_PATH)) {
  console.log('✅ JustTrade repository found at:', JUST_TRADE_PATH);
} else {
  console.log('❌ JustTrade repository NOT found');
  console.log('   Expected at:', JUST_TRADE_PATH);
  process.exit(1);
}

// Test 2: Check for key anchor files
console.log('\nTest 2: Anchor files present in JustTrade');
const anchorFiles = [
  'README.md',
  'Makefile',
  'package.json',
  'requirements.txt',
  'docker-compose.yml',
];

let foundCount = 0;
anchorFiles.forEach(file => {
  const filePath = path.join(JUST_TRADE_PATH, file);
  if (fs.existsSync(filePath)) {
    console.log(`✅ Found: ${file}`);
    foundCount++;
  } else {
    console.log(`⚠️  Missing: ${file}`);
  }
});

console.log(`\n   → Found ${foundCount}/${anchorFiles.length} common anchor files`);

// Test 3: Check if backend-dist has new code
console.log('\nTest 3: Electron backend compilation');
const backendPath = path.join(__dirname, 'electron-app', 'backend-dist', 'cli', 'index.js');

if (!fs.existsSync(backendPath)) {
  console.log('❌ Backend not compiled');
  console.log('   Run: cd electron-app && npm run prebuild');
  process.exit(1);
}

const backendCode = fs.readFileSync(backendPath, 'utf8');

// Check for new tools
const hasGetProjectOverview = backendCode.includes('get_project_overview');
const hasFindRelevantFiles = backendCode.includes('find_relevant_files');
const hasSmartExploration = backendCode.includes('var SmartExploration');
const hasAnchorStrategy = backendCode.includes('var AnchorFileStrategy');
const hasMakefileAnalyzer = backendCode.includes('var MakefileAnalyzer');

console.log(`   get_project_overview tool: ${hasGetProjectOverview ? '✅' : '❌'}`);
console.log(`   find_relevant_files tool: ${hasFindRelevantFiles ? '✅' : '❌'}`);
console.log(`   SmartExploration class: ${hasSmartExploration ? '✅' : '❌'}`);
console.log(`   AnchorFileStrategy class: ${hasAnchorStrategy ? '✅' : '❌'}`);
console.log(`   MakefileAnalyzer class: ${hasMakefileAnalyzer ? '✅' : '❌'}`);

// Check maxIterations
const maxIterMatch = backendCode.match(/maxIterations \|\| (\d+)/);
const maxIter = maxIterMatch ? parseInt(maxIterMatch[1]) : 0;

console.log(`   maxIterations: ${maxIter === 25 ? '✅ 25' : '❌ ' + maxIter + ' (expected 25)'}`);

// Check for mandatory guidance
const hasMandatoryGuidance = backendCode.includes('MANDATORY FIRST STEP');
console.log(`   Mandatory guidance: ${hasMandatoryGuidance ? '✅' : '❌'}`);

// Test 4: Count tools
console.log('\nTest 4: Tool count');
const toolMatches = backendCode.match(/name: "([^"]+)"/g) || [];
const toolNames = toolMatches.map(m => m.match(/name: "([^"]+)"/)[1]);
const uniqueTools = [...new Set(toolNames)];

// Filter to only filesystem tools (those defined in createFilesystemTools)
const filesystemToolsSection = backendCode.match(/createFilesystemTools\(\) \{[\s\S]*?return \[([\s\S]*?)\];/);
let filesystemToolCount = 0;
if (filesystemToolsSection) {
  const toolsContent = filesystemToolsSection[1];
  filesystemToolCount = (toolsContent.match(/name:/g) || []).length;
}

console.log(`   Filesystem tools: ${filesystemToolCount === 7 ? '✅ 7' : '❌ ' + filesystemToolCount + ' (expected 7)'}`);

// Final summary
console.log('\n' + '='.repeat(60));
console.log('Summary:');

const allChecks = [
  hasGetProjectOverview,
  hasFindRelevantFiles,
  hasSmartExploration,
  hasAnchorStrategy,
  hasMakefileAnalyzer,
  maxIter === 25,
  hasMandatoryGuidance,
  filesystemToolCount === 7,
];

const passedChecks = allChecks.filter(Boolean).length;

if (passedChecks === allChecks.length) {
  console.log('✅ ALL CHECKS PASSED!');
  console.log('');
  console.log('🚀 Ready to use! Start the Electron app:');
  console.log('   cd electron-app && npm start');
  console.log('');
  console.log('Then ask: "Write a technical design document of my code repo JustTrade"');
  console.log('');
  console.log('Expected: Agent should call get_project_overview() first, NOT list_directory()');
} else {
  console.log(`⚠️  ${passedChecks}/${allChecks.length} checks passed`);
  console.log('');
  console.log('Fix issues and rebuild:');
  console.log('   npm run build');
  console.log('   cd electron-app && npm run prebuild');
}

console.log('='.repeat(60));
