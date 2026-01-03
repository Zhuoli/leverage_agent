# Filesystem MCP Server

Model Context Protocol (MCP) Server for secure filesystem access to code repositories.

## Overview

The Filesystem MCP Server provides controlled access to local file systems through the Model Context Protocol. It wraps the official `@modelcontextprotocol/server-filesystem` package and restricts access to only explicitly configured directories.

## Features

- **Secure Directory Access**: Only allows access to configured directories
- **Standard Filesystem Operations**: Read, write, list, move, search files
- **Path Sandboxing**: Prevents access to directories outside allowed paths
- **Official MCP Implementation**: Uses Anthropic's reference filesystem server

## Prerequisites

1. **Node.js** >= 18.0.0
2. **Configured Code Repositories**: At least one directory path must be specified

## Configuration

Set the following environment variable:

```bash
# Colon-separated list of allowed directory paths
CODE_REPO_PATHS=/path/to/repo1:/path/to/repo2:/path/to/repo3
```

### Example Configuration

```bash
# Single repository
CODE_REPO_PATHS=/home/user/projects/my-app

# Multiple repositories
CODE_REPO_PATHS=/home/user/projects/frontend:/home/user/projects/backend:/home/user/projects/shared
```

## Running the Server

```bash
# The filesystem server is typically started automatically
# It wraps @modelcontextprotocol/server-filesystem

# Manual start
node dist/mcp/filesystem-server.js
```

## Available Tools

The Filesystem MCP Server exposes standard filesystem operations:

### 1. `read_file`

Read the contents of a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the file to read |

**Example:**
```json
{
  "tool": "read_file",
  "arguments": {
    "path": "/home/user/projects/my-app/src/index.js"
  }
}
```

### 2. `read_multiple_files`

Read multiple files at once.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `paths` | string[] | Yes | Array of file paths to read |

**Example:**
```json
{
  "tool": "read_multiple_files",
  "arguments": {
    "paths": [
      "/home/user/projects/my-app/src/index.js",
      "/home/user/projects/my-app/package.json"
    ]
  }
}
```

### 3. `write_file`

Write content to a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the file to write |
| `content` | string | Yes | Content to write to the file |

**Example:**
```json
{
  "tool": "write_file",
  "arguments": {
    "path": "/home/user/projects/my-app/src/config.js",
    "content": "export const API_URL = 'https://api.example.com';"
  }
}
```

### 4. `create_directory`

Create a new directory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path of the directory to create |

**Example:**
```json
{
  "tool": "create_directory",
  "arguments": {
    "path": "/home/user/projects/my-app/src/components"
  }
}
```

### 5. `list_directory`

List contents of a directory.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the directory to list |

**Example:**
```json
{
  "tool": "list_directory",
  "arguments": {
    "path": "/home/user/projects/my-app/src"
  }
}
```

### 6. `move_file`

Move or rename a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `source` | string | Yes | Source file path |
| `destination` | string | Yes | Destination file path |

**Example:**
```json
{
  "tool": "move_file",
  "arguments": {
    "source": "/home/user/projects/my-app/src/old-name.js",
    "destination": "/home/user/projects/my-app/src/new-name.js"
  }
}
```

### 7. `search_files`

Search for files matching a pattern.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Directory to search in |
| `pattern` | string | Yes | Search pattern (glob) |

**Example:**
```json
{
  "tool": "search_files",
  "arguments": {
    "path": "/home/user/projects/my-app",
    "pattern": "**/*.ts"
  }
}
```

### 8. `get_file_info`

Get metadata about a file.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `path` | string | Yes | Path to the file |

**Example:**
```json
{
  "tool": "get_file_info",
  "arguments": {
    "path": "/home/user/projects/my-app/package.json"
  }
}
```

### 9. `list_allowed_directories`

List all directories the server has access to.

No parameters required.

**Example:**
```json
{
  "tool": "list_allowed_directories",
  "arguments": {}
}
```

## Claude Desktop Integration

Add the following to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "node",
      "args": ["/path/to/leverage_agent/dist/mcp/filesystem-server.js"],
      "env": {
        "CODE_REPO_PATHS": "/home/user/projects/my-app:/home/user/projects/shared-lib"
      }
    }
  }
}
```

## Security

### Path Sandboxing

The server implements strict path sandboxing:

1. **Only Allowed Directories**: Access is restricted to paths specified in `CODE_REPO_PATHS`
2. **No Path Traversal**: Attempts to access `../` outside allowed directories are blocked
3. **Symlink Resolution**: Symlinks are resolved and checked against allowed paths

### Best Practices

1. **Limit Directory Access**: Only add directories that are needed
2. **Avoid Root Paths**: Don't add `/` or `/home` as allowed directories
3. **Use Absolute Paths**: Always specify absolute paths in configuration
4. **Separate by Environment**: Use different configurations for dev/prod

## Architecture

```
src/mcp/
└── filesystem-server.ts    # Wrapper around official filesystem server

Dependencies:
└── @modelcontextprotocol/server-filesystem  # Official MCP filesystem server
```

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| "No allowed directories" | `CODE_REPO_PATHS` not set | Configure the environment variable |
| "Access denied" | Path outside allowed directories | Check path is within configured directories |
| "File not found" | File doesn't exist | Verify file path is correct |
| "Permission denied" | OS-level permission issue | Check file system permissions |

## Troubleshooting

### Server Exits Immediately

1. Check `CODE_REPO_PATHS` is set
2. Verify paths exist and are accessible
3. Check Node.js version >= 18

### Cannot Access Files

1. Verify file is within allowed directories
2. Check file permissions
3. Use `list_allowed_directories` to confirm access

### Search Not Working

1. Ensure search path is within allowed directories
2. Check glob pattern syntax
3. Verify directory contains matching files

## Comparison with Direct File Access

| Feature | Filesystem MCP | Direct Access |
|---------|----------------|---------------|
| Security | Sandboxed to allowed dirs | Full access |
| Consistency | Standardized API | Varies by tool |
| Audit | Operations logged | No built-in logging |
| Cross-platform | Unified interface | OS-specific |

## License

MIT
