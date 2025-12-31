# Test Connection Feature for MCP Servers

## Overview

Added "Test Connection" buttons to each MCP server configuration page to verify credentials and connectivity before saving settings. This ensures all components are properly configured before starting the chat.

## Features Added

### 1. **Atlassian MCP Test Connection**
**Location:** Settings → Atlassian MCP → Configure → Test Connection

**Tests:**
- Jira API authentication and connectivity
- Confluence API authentication and connectivity

**Validation:**
- Makes real API calls to both Jira and Confluence
- Calls `/rest/api/3/myself` endpoint for Jira
- Calls `/rest/api/user/current` endpoint for Confluence
- Verifies credentials and returns user display names

**Success Message:**
```
✅ Connection successful!
Jira: John Doe, Confluence: John Doe
```

**Error Handling:**
- 401: "Authentication failed. Please check your credentials."
- 404: "URL not found. Please check your Jira/Confluence URLs."
- Network errors: "Cannot reach server" or "Connection timed out"

### 2. **Oracle Cloud MCP Test Connection**
**Location:** Settings → Oracle Cloud MCP → Configure → Test Connection

**Tests:**
- OCI session token validity
- Compartment accessibility
- Authentication provider configuration

**Validation:**
- Validates session token from `~/.oci/config`
- Creates OCI Identity client
- Fetches compartment details to verify access
- Returns compartment name on success

**Success Message:**
```
✅ Connection successful!
Compartment: Production
```

**Error Handling:**
- Missing config: "Config file not found. Please run: oci session authenticate..."
- Expired token: "Session token expired. Please run: oci session authenticate..."
- Invalid compartment: "Compartment not found or not accessible..."
- Includes exact command to fix the issue

## Implementation Details

### Frontend (renderer.js)

```javascript
// Atlassian MCP Test
function testAtlassianMcpConnection() {
    - Validates all required fields
    - Sends IPC message to main process
    - Displays loading state
    - Shows success/error message
}

// OCI MCP Test
function testOciMcpConnection() {
    - Validates required fields (Region, Compartment, Tenancy)
    - Sends IPC message to main process
    - Displays loading state
    - Shows success/error message
}
```

### Backend (main.js)

```javascript
// Atlassian MCP Handler
ipcMain.on('test-atlassian-mcp-connection', async (event, settings) => {
    - Uses axios to make HTTP requests
    - Tests both Jira and Confluence APIs
    - Returns user display names
    - Provides detailed error messages
}

// OCI MCP Handler
ipcMain.on('test-oci-mcp-connection', async (event, settings) => {
    - Uses OCI SDK (oci-common, oci-identity)
    - Creates ConfigFileAuthenticationDetailsProvider
    - Fetches compartment details
    - Provides session token renewal instructions
}
```

## User Flow

### Atlassian MCP

1. User opens Settings
2. Clicks "Configure →" on Atlassian MCP card
3. Fills in Jira and Confluence credentials
4. Clicks "🔌 Test Atlassian Connection"
5. Sees loading state: "⏳ Testing Atlassian connection..."
6. Gets immediate feedback on success/failure
7. If successful, clicks "Save Configuration"

### Oracle Cloud MCP

1. User enables Oracle Cloud MCP toggle
2. Clicks "Configure →"
3. Fills in Region, Compartment ID, Tenancy ID
4. Clicks "🔌 Test OCI Connection"
5. Sees loading state: "⏳ Testing OCI connection..."
6. If session token missing/expired, gets exact command to run
7. After creating session token, test again
8. If successful, clicks "Save Configuration"

## Benefits

✅ **Proactive Validation** - Catch configuration errors before starting chat
✅ **Clear Feedback** - Users know exactly what's wrong
✅ **Helpful Errors** - Include exact commands to fix issues
✅ **User Confidence** - Verify setup works before saving
✅ **Time Saving** - No need to troubleshoot during chat
✅ **Better UX** - Immediate feedback reduces frustration

## Testing Checklist

### Atlassian MCP
- [ ] Test with valid Jira/Confluence credentials
- [ ] Test with invalid username/password (401 error)
- [ ] Test with wrong URLs (404 error)
- [ ] Test with network disconnected (timeout error)
- [ ] Verify user display names shown on success

### Oracle Cloud MCP
- [ ] Test with valid session token
- [ ] Test without session token (config not found)
- [ ] Test with expired session token (401 error)
- [ ] Test with invalid compartment ID (404 error)
- [ ] Verify compartment name shown on success
- [ ] Verify session token renewal command is correct

## Future Enhancements

- Add connection test to main Settings page (before MCP configuration)
- Add automatic retry logic for transient failures
- Add caching of successful test results
- Show connection status indicator on MCP server cards
- Add "Test All" button to test all MCP servers at once
