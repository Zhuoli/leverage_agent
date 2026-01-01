# How to Restart Electron App After Code Changes

## The Problem
After running `npm run prebuild` in the electron-app directory, the Electron app may still be running old code in memory.

## Solution: Full Restart

### Option 1: Kill and Restart (Recommended)
```bash
# 1. Kill all Electron processes
pkill -f Electron

# 2. Navigate to electron-app directory
cd /Users/zhuoli/Projects/github/zhuoli/confluence_assistant/electron-app

# 3. Rebuild backend
npm run prebuild

# 4. Start fresh
npm start
```

### Option 2: Use Makefile (if you're in parent directory)
```bash
cd /Users/zhuoli/Projects/github/zhuoli/confluence_assistant

# Kill existing processes
make stop-app

# Rebuild and start
make app
```

## Verification

After restart, you should see in the logs:
```
Registered 7 tools
```

NOT:
```
Registered 5 tools  ← OLD VERSION
```

## What Changed

### New Tools (2 added):
1. **get_project_overview** - Reads README, Makefile, package.json, etc. in one call
2. **find_relevant_files** - Intelligently finds relevant code files

### Updated Settings:
- maxIterations: 10 → 25 (2.5x increase)
- Graceful degradation warnings when approaching limit
- Better error messages

### New Exploration Strategy:
The agent will now:
1. Call `get_project_overview()` FIRST (reads ~15 anchor files)
2. Use `find_relevant_files()` to narrow down search
3. Read only the most relevant files
4. Synthesize answer

This should prevent "Max tool calling iterations" errors for complex queries like "Write a technical design document".
