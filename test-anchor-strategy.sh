#!/bin/bash

# Test script to verify the anchor file strategy is working

echo "🧪 Testing Anchor File Strategy"
echo "================================"
echo ""

REPO_PATH="/Users/zhuoli/Projects/github/zhuoli/JustTrade"

echo "1. Testing AnchorFileStrategy..."
node -e "
const { AnchorFileStrategy } = require('./dist/cli/index.js');
const strategy = new AnchorFileStrategy();

async function test() {
  try {
    const anchors = await strategy.findAnchorFiles('$REPO_PATH');
    console.log('✅ Found', anchors.length, 'anchor files');
    console.log('Top 5 anchor files:');
    anchors.slice(0, 5).forEach((a, i) => {
      console.log(\`  \${i+1}. [\${a.type}] \${a.path.split('/').pop()} (priority: \${a.priority})\`);
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
" 2>/dev/null || echo "⚠️  Note: This test requires the main project, not electron-app"

echo ""
echo "2. Checking compiled Electron backend..."
cd electron-app/backend-dist

# Count tools
TOOL_COUNT=$(node -e "
const fs = require('fs');
const code = fs.readFileSync('./cli/index.js', 'utf8');
const match = code.match(/createFilesystemTools.*?\[/s);
if (match) {
  const toolsSection = code.slice(code.indexOf(match[0]));
  const toolNames = toolsSection.match(/name: \"[^\"]+\"/g) || [];
  console.log(toolNames.length);
}
" 2>/dev/null)

if [ "$TOOL_COUNT" = "7" ]; then
  echo "✅ Electron backend has $TOOL_COUNT tools (correct!)"
else
  echo "❌ Electron backend has $TOOL_COUNT tools (expected 7)"
  echo "   Run: cd electron-app && npm run prebuild"
fi

# Check maxIterations
MAX_ITER=$(grep -o "maxIterations || [0-9]*" cli/index.js | head -1 | grep -o "[0-9]*$")
if [ "$MAX_ITER" = "25" ]; then
  echo "✅ maxIterations = $MAX_ITER (correct!)"
else
  echo "❌ maxIterations = $MAX_ITER (expected 25)"
fi

echo ""
echo "================================"
echo "Setup verification complete!"
echo ""
echo "To start the Electron app:"
echo "  cd electron-app && npm start"
echo ""
echo "Expected behavior:"
echo "  - Should see 'Registered 7 tools' in console"
echo "  - Agent should call get_project_overview() first"
echo "  - Should handle complex queries without hitting iteration limit"
