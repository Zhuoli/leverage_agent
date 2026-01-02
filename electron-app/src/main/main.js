const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const PersistentAgent = require('../backend/persistent-agent');
const ConfigManager = require('../backend/config');
const ConversationManager = require('../backend/conversation-manager');

let mainWindow;
let agentClient;
let configManager;
let conversationManager;
let logStream;

// Find Node.js executable in common macOS locations
function findNodeExecutable() {
    const { execSync } = require('child_process');
    const fs = require('fs');

    // Common Node.js locations on macOS
    const commonPaths = [
        '/usr/local/bin/node',           // Homebrew Intel
        '/opt/homebrew/bin/node',        // Homebrew Apple Silicon
        '/usr/bin/node',                 // System node (rare on macOS)
        process.env.HOME + '/.nvm/versions/node/*/bin/node',  // NVM
        '/Users/' + process.env.USER + '/.nvm/versions/node/*/bin/node'
    ];

    // Try to use 'which' command first (works if we have any PATH)
    try {
        const whichResult = execSync('which node', { encoding: 'utf8' }).trim();
        if (whichResult && fs.existsSync(whichResult)) {
            console.log('Found node via which:', whichResult);
            return whichResult;
        }
    } catch (e) {
        console.log('which node failed, trying common paths...');
    }

    // Check common paths
    for (const nodePath of commonPaths) {
        if (nodePath.includes('*')) {
            // Handle glob patterns for NVM
            const baseDir = nodePath.split('*')[0];
            try {
                if (fs.existsSync(baseDir)) {
                    const glob = require('glob');
                    const matches = glob.sync(nodePath);
                    if (matches.length > 0) {
                        // Use the latest version
                        const latest = matches.sort().reverse()[0];
                        console.log('Found node via glob:', latest);
                        return latest;
                    }
                }
            } catch (e) {
                // glob might not be available, skip
            }
        } else {
            if (fs.existsSync(nodePath)) {
                console.log('Found node at:', nodePath);
                return nodePath;
            }
        }
    }

    // Last resort: try 'node' and hope it's in PATH
    console.log('WARNING: Could not find node in common locations, trying "node" (may fail)');
    return 'node';
}

// Set up production logging
function setupLogging() {
    const logDir = path.join(app.getPath('userData'), 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `app-${new Date().toISOString().split('T')[0]}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });

    // Override console methods to write to file
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
        const message = `[${new Date().toISOString()}] LOG: ${args.join(' ')}\n`;
        logStream.write(message);
        originalLog.apply(console, args);
    };

    console.error = (...args) => {
        const message = `[${new Date().toISOString()}] ERROR: ${args.join(' ')}\n`;
        logStream.write(message);
        originalError.apply(console, args);
    };

    console.log('Logging initialized. Log file:', logFile);
    console.log('App version:', app.getVersion());
    console.log('Electron version:', process.versions.electron);
    console.log('Node version:', process.versions.node);
    console.log('Platform:', process.platform);
    console.log('App path:', app.getAppPath());
    console.log('User data:', app.getPath('userData'));
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        titleBarStyle: 'default',
        show: false
    });

    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // Set up logging for production
    setupLogging();

    // Initialize configuration manager
    configManager = new ConfigManager();

    // Initialize conversation manager
    const conversationsPath = path.join(app.getPath('userData'), 'conversations.json');
    conversationManager = new ConversationManager(conversationsPath);
    await conversationManager.load();

    // Initialize persistent agent
    try {
        agentClient = new PersistentAgent(configManager.getConfig(), conversationManager);
        // Agent will initialize lazily on first message
    } catch (error) {
        console.error('Failed to initialize persistent agent:', error);
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('quit', () => {
    if (logStream) {
        logStream.end();
    }
});

// IPC Handlers

ipcMain.on('check-config', (event) => {
    const config = configManager.getConfig();
    const configured = configManager.isConfigured();

    event.reply('config-status', { configured });
});

ipcMain.on('get-settings', (event) => {
    const config = configManager.getConfig();
    event.reply('settings-loaded', config);
});

ipcMain.on('save-settings', async (event, settings) => {
    try {
        configManager.saveConfig(settings);

        // Reinitialize persistent agent with new config
        // First cleanup old agent
        if (agentClient) {
            await agentClient.cleanup();
        }
        agentClient = new PersistentAgent(settings, conversationManager);

        event.reply('settings-saved', true);
    } catch (error) {
        console.error('Failed to save settings:', error);
        event.reply('settings-saved', false);
    }
});

ipcMain.on('test-connection', async (event, settings) => {
    try {
        const { spawn } = require('child_process');
        const path = require('path');
        const fs = require('fs');

        // Determine the correct paths based on whether we're in dev or packaged mode
        // In dev mode: __dirname is electron-app/src/main
        // In packaged mode: __dirname is inside the .app bundle
        let projectRoot;
        let cliPath;

        // Determine paths based on dev vs packaged mode
        console.log('Test connection - environment info:');
        console.log('  __dirname:', __dirname);
        console.log('  app.isPackaged:', app.isPackaged);
        console.log('  app.getAppPath():', app.getAppPath());
        console.log('  process.resourcesPath:', process.resourcesPath);

        if (app.isPackaged) {
            // Packaged mode (no ASAR)
            // Files are directly in app.getAppPath()
            projectRoot = app.getAppPath();
            cliPath = path.join(projectRoot, 'backend-dist', 'cli', 'index.js');
            console.log('  Mode: Packaged (no ASAR)');
        } else {
            // Dev mode
            projectRoot = path.join(__dirname, '..', '..');
            cliPath = path.join(projectRoot, 'backend-dist', 'cli', 'index.js');
            console.log('  Mode: Development');
        }

        console.log('  projectRoot:', projectRoot);
        console.log('  cliPath:', cliPath);

        // Verify paths exist
        if (!fs.existsSync(projectRoot)) {
            throw new Error(`Project root does not exist: ${projectRoot}`);
        }
        if (!fs.existsSync(cliPath)) {
            throw new Error(`CLI file does not exist: ${cliPath}. Run 'npm run prebuild' first.`);
        }

        // Verify projectRoot is a directory
        const stats = fs.statSync(projectRoot);
        if (!stats.isDirectory()) {
            throw new Error(`Project root is not a directory: ${projectRoot}`);
        }

        // For testing, we'll try to create the provider and send a simple message
        const provider = settings.MODEL_PROVIDER || 'oci-openai';

        // Build environment variables
        const env = {
            ...process.env,
            MODEL_PROVIDER: provider,
            MODEL_NAME: settings.MODEL_NAME || '',
        };

        if (provider === 'claude') {
            if (!settings.ANTHROPIC_API_KEY) {
                throw new Error('Anthropic API key is required');
            }
            env.ANTHROPIC_API_KEY = settings.ANTHROPIC_API_KEY;
        } else if (provider === 'openai') {
            if (!settings.OPENAI_API_KEY) {
                throw new Error('OpenAI API key is required');
            }
            env.OPENAI_API_KEY = settings.OPENAI_API_KEY;
        } else if (provider === 'oci-openai') {
            if (!settings.OCI_COMPARTMENT_ID || !settings.OCI_ENDPOINT) {
                throw new Error('OCI Compartment ID and Endpoint are required');
            }
            env.OCI_COMPARTMENT_ID = settings.OCI_COMPARTMENT_ID;
            env.OCI_ENDPOINT = settings.OCI_ENDPOINT;
            env.OCI_CONFIG_PATH = settings.OCI_CONFIG_PATH || '';
            env.OCI_PROFILE = settings.OCI_PROFILE || '';
        }

        // Use dummy Jira/Confluence settings for connection test
        env.JIRA_URL = 'https://test.atlassian.net';
        env.JIRA_USERNAME = 'test@example.com';
        env.JIRA_API_TOKEN = 'test-token';
        env.CONFLUENCE_URL = 'https://test.atlassian.net/wiki';
        env.CONFLUENCE_USERNAME = 'test@example.com';
        env.CONFLUENCE_API_TOKEN = 'test-token';

        // Test with a simple message (disable MCP and Skills for faster testing)
        const args = [
            cliPath,
            'chat',
            '--test-only',
            '--message',
            'Hello, this is a connection test.'
        ];

        // Find Node.js executable
        // In packaged apps, PATH is minimal, so we need to find node explicitly
        const nodePath = findNodeExecutable();

        console.log('Spawning Node.js process...');
        console.log('  Node path:', nodePath);
        console.log('  Command:', nodePath, args.join(' '));
        console.log('  Working directory:', projectRoot);

        const testProcess = spawn(nodePath, args, {
            cwd: projectRoot,
            env: env,
            timeout: 30000 // 30 second timeout
        });

        let stdout = '';
        let stderr = '';

        testProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            console.log('Test stdout:', data.toString());
        });

        testProcess.stderr.on('data', (data) => {
            stderr += data.toString();
            console.error('Test stderr:', data.toString());
        });

        testProcess.on('close', (code) => {
            console.log('Test process exited with code:', code);
            console.log('Full stdout:', stdout);
            console.log('Full stderr:', stderr);

            if (code === 0) {
                event.reply('connection-test-result', {
                    success: true
                });
            } else {
                // Extract meaningful error from stderr
                const errorMsg = stderr.includes('Error')
                    ? stderr.split('\n').find(line => line.includes('Error')) || stderr
                    : 'Connection failed. Please check your credentials.';
                event.reply('connection-test-result', {
                    success: false,
                    error: errorMsg.substring(0, 200) // Limit error message length
                });
            }
        });

        testProcess.on('error', (error) => {
            event.reply('connection-test-result', {
                success: false,
                error: error.message
            });
        });

        // Set a timeout
        setTimeout(() => {
            if (!testProcess.killed) {
                testProcess.kill();
                event.reply('connection-test-result', {
                    success: false,
                    error: 'Connection test timed out after 30 seconds'
                });
            }
        }, 30000);

    } catch (error) {
        console.error('Connection test error:', error);
        event.reply('connection-test-result', {
            success: false,
            error: error.message
        });
    }
});

// Test Atlassian MCP connection
ipcMain.on('test-atlassian-mcp-connection', async (event, settings) => {
    try {
        const axios = require('axios');

        // Test Jira connection
        console.log('Testing Jira connection to:', settings.JIRA_URL);
        const jiraResponse = await axios.get(`${settings.JIRA_URL}/rest/api/3/myself`, {
            auth: {
                username: settings.JIRA_USERNAME,
                password: settings.JIRA_API_TOKEN
            },
            timeout: 10000
        });

        console.log('Jira connection successful. User:', jiraResponse.data.displayName);

        // Test Confluence connection
        console.log('Testing Confluence connection to:', settings.CONFLUENCE_URL);
        const confluenceResponse = await axios.get(`${settings.CONFLUENCE_URL}/rest/api/user/current`, {
            auth: {
                username: settings.CONFLUENCE_USERNAME,
                password: settings.CONFLUENCE_API_TOKEN
            },
            timeout: 10000
        });

        console.log('Confluence connection successful. User:', confluenceResponse.data.displayName);

        event.reply('atlassian-mcp-test-result', {
            success: true,
            message: `Jira: ${jiraResponse.data.displayName}, Confluence: ${confluenceResponse.data.displayName}`
        });
    } catch (error) {
        console.error('Atlassian MCP test error:', error);
        let errorMessage = error.message;

        if (error.response) {
            if (error.response.status === 401) {
                errorMessage = 'Authentication failed. Please check your credentials.';
            } else if (error.response.status === 404) {
                errorMessage = 'URL not found. Please check your Jira/Confluence URLs.';
            } else {
                errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
            }
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = 'Cannot reach server. Please check your URLs.';
        } else if (error.code === 'ETIMEDOUT') {
            errorMessage = 'Connection timed out. Please check your network.';
        }

        event.reply('atlassian-mcp-test-result', {
            success: false,
            error: errorMessage
        });
    }
});

// Test OCI MCP connection
ipcMain.on('test-oci-mcp-connection', async (event, settings) => {
    try {
        const common = require('oci-common');
        const identity = require('oci-identity');
        const os = require('os');
        const path = require('path');

        // Validate required settings
        if (!settings.OCI_MCP_REGION || !settings.OCI_MCP_COMPARTMENT_ID || !settings.OCI_MCP_TENANCY_ID) {
            throw new Error('Missing required OCI configuration');
        }

        // Determine config file path
        const configPath = settings.OCI_MCP_CONFIG_PATH || path.join(os.homedir(), '.oci', 'config');
        const profile = settings.OCI_MCP_PROFILE || 'DEFAULT';

        console.log('Testing OCI connection with:');
        console.log('  Config:', configPath);
        console.log('  Profile:', profile);
        console.log('  Region:', settings.OCI_MCP_REGION);

        // Initialize OCI authentication provider
        const provider = new common.ConfigFileAuthenticationDetailsProvider(configPath, profile);

        // Create identity client
        const identityClient = new identity.IdentityClient({
            authenticationDetailsProvider: provider
        });
        identityClient.region = settings.OCI_MCP_REGION;

        // Test by getting compartment details
        console.log('Fetching compartment details...');
        const response = await identityClient.getCompartment({
            compartmentId: settings.OCI_MCP_COMPARTMENT_ID
        });

        const compartmentName = response.compartment.name;
        console.log('OCI connection successful. Compartment:', compartmentName);

        event.reply('oci-mcp-test-result', {
            success: true,
            message: `Compartment: ${compartmentName}`
        });
    } catch (error) {
        console.error('OCI MCP test error:', error);
        let errorMessage = error.message;

        if (error.message.includes('ENOENT')) {
            errorMessage = `Config file not found. Please run: oci session authenticate --profile-name ${settings.OCI_MCP_PROFILE || 'DEFAULT'} --region ${settings.OCI_MCP_REGION}`;
        } else if (error.message.includes('NotAuthenticated') || error.message.includes('401')) {
            errorMessage = `Session token expired. Please run: oci session authenticate --profile-name ${settings.OCI_MCP_PROFILE || 'DEFAULT'} --region ${settings.OCI_MCP_REGION}`;
        } else if (error.message.includes('404') || error.message.includes('NotAuthorizedOrNotFound')) {
            errorMessage = 'Compartment not found or not accessible. Please check your Compartment ID and permissions.';
        }

        event.reply('oci-mcp-test-result', {
            success: false,
            error: errorMessage
        });
    }
});

// Skills Management IPC Handlers
ipcMain.on('list-skills', async (event) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');

        const skillsDir = path.join(__dirname, '../../../.claude/skills');

        // Check if skills directory exists
        try {
            await fs.access(skillsDir);
        } catch {
            // Directory doesn't exist, return empty array
            event.reply('skills-loaded', []);
            return;
        }

        // Read all directories in skills folder
        const items = await fs.readdir(skillsDir, { withFileTypes: true });
        const skillDirs = items.filter(item => item.isDirectory());

        const skills = [];

        for (const dir of skillDirs) {
            const skillPath = path.join(skillsDir, dir.name, 'SKILL.md');

            try {
                const content = await fs.readFile(skillPath, 'utf8');

                // Parse frontmatter
                const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
                let description = '';

                if (frontmatterMatch) {
                    const frontmatter = frontmatterMatch[1];
                    const descMatch = frontmatter.match(/description:\s*(.+)/);
                    if (descMatch) description = descMatch[1].trim();
                }

                skills.push({
                    name: dir.name,
                    description: description
                });
            } catch (error) {
                console.warn(`Failed to read skill ${dir.name}:`, error.message);
            }
        }

        event.reply('skills-loaded', skills);
    } catch (error) {
        console.error('Failed to list skills:', error);
        event.reply('skills-loaded', []);
    }
});

ipcMain.on('get-skill', async (event, skillName) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');

        const skillPath = path.join(__dirname, '../../../.claude/skills', skillName, 'SKILL.md');
        const content = await fs.readFile(skillPath, 'utf8');

        // Return the full content as-is
        const skill = {
            name: skillName,
            fullContent: content
        };

        event.reply('skill-loaded', skill);
    } catch (error) {
        console.error('Failed to get skill:', error);
        event.reply('skill-loaded', null);
    }
});

ipcMain.on('save-skill', async (event, skillData) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');

        const skillDir = path.join(__dirname, '../../../.claude/skills', skillData.name);
        const skillPath = path.join(skillDir, 'SKILL.md');

        // Create directory if it doesn't exist
        await fs.mkdir(skillDir, { recursive: true });

        // Write the content directly (validation already done in frontend)
        await fs.writeFile(skillPath, skillData.content, 'utf8');

        console.log(`Skill saved: ${skillData.name}`);
        event.reply('skill-saved', { success: true });
    } catch (error) {
        console.error('Failed to save skill:', error);
        event.reply('skill-saved', { success: false, error: error.message });
    }
});

ipcMain.on('delete-skill', async (event, skillName) => {
    try {
        const fs = require('fs').promises;
        const path = require('path');

        const skillDir = path.join(__dirname, '../../../.claude/skills', skillName);

        // Remove the entire skill directory
        await fs.rm(skillDir, { recursive: true, force: true });

        console.log(`Skill deleted: ${skillName}`);
        event.reply('skill-deleted', { success: true });
    } catch (error) {
        console.error('Failed to delete skill:', error);
        event.reply('skill-deleted', { success: false, error: error.message });
    }
});

ipcMain.on('browse-directory', async (event) => {
    try {
        const { dialog } = require('electron');

        const result = await dialog.showOpenDialog({
            properties: ['openDirectory'],
            title: 'Select Repository Directory'
        });

        if (!result.canceled && result.filePaths.length > 0) {
            event.reply('directory-selected', result.filePaths[0]);
        } else {
            event.reply('directory-selected', null);
        }
    } catch (error) {
        console.error('Failed to browse directory:', error);
        event.reply('directory-selected', null);
    }
});

// ========================================
// Custom MCP Server Management
// ========================================

ipcMain.on('get-custom-mcp-servers', async (event) => {
    try {
        const customMcpServersPath = path.join(app.getPath('userData'), 'custom-mcp-servers.json');

        if (fs.existsSync(customMcpServersPath)) {
            const data = fs.readFileSync(customMcpServersPath, 'utf8');
            const servers = JSON.parse(data);
            event.reply('custom-mcp-servers-loaded', servers);
        } else {
            event.reply('custom-mcp-servers-loaded', []);
        }
    } catch (error) {
        console.error('Failed to load custom MCP servers:', error);
        event.reply('custom-mcp-servers-loaded', []);
    }
});

ipcMain.on('save-custom-mcp-server', async (event, server) => {
    try {
        const customMcpServersPath = path.join(app.getPath('userData'), 'custom-mcp-servers.json');

        // Load existing servers
        let servers = [];
        if (fs.existsSync(customMcpServersPath)) {
            const data = fs.readFileSync(customMcpServersPath, 'utf8');
            servers = JSON.parse(data);
        }

        // Find and update existing server or add new one
        const existingIndex = servers.findIndex(s => s.id === server.id);
        if (existingIndex >= 0) {
            servers[existingIndex] = server;
        } else {
            servers.push(server);
        }

        // Save to file
        fs.writeFileSync(customMcpServersPath, JSON.stringify(servers, null, 2));

        event.reply('custom-mcp-server-saved', true);
    } catch (error) {
        console.error('Failed to save custom MCP server:', error);
        event.reply('custom-mcp-server-saved', false);
    }
});

ipcMain.on('delete-custom-mcp-server', async (event, serverId) => {
    try {
        const customMcpServersPath = path.join(app.getPath('userData'), 'custom-mcp-servers.json');

        // Load existing servers
        let servers = [];
        if (fs.existsSync(customMcpServersPath)) {
            const data = fs.readFileSync(customMcpServersPath, 'utf8');
            servers = JSON.parse(data);
        }

        // Filter out the server to delete
        servers = servers.filter(s => s.id !== serverId);

        // Save to file
        fs.writeFileSync(customMcpServersPath, JSON.stringify(servers, null, 2));

        event.reply('custom-mcp-server-deleted', true);
    } catch (error) {
        console.error('Failed to delete custom MCP server:', error);
        event.reply('custom-mcp-server-deleted', false);
    }
});

// Code Repositories Management IPC Handlers
ipcMain.on('get-code-repos', async (event) => {
    try {
        const codeReposPath = path.join(app.getPath('userData'), 'code-repos.json');

        if (fs.existsSync(codeReposPath)) {
            const data = fs.readFileSync(codeReposPath, 'utf8');
            const repos = JSON.parse(data);
            event.reply('code-repos-loaded', repos);
        } else {
            event.reply('code-repos-loaded', []);
        }
    } catch (error) {
        console.error('Failed to load code repositories:', error);
        event.reply('code-repos-loaded', []);
    }
});

ipcMain.on('save-code-repo', async (event, repo) => {
    try {
        const codeReposPath = path.join(app.getPath('userData'), 'code-repos.json');

        // Load existing repos
        let repos = [];
        if (fs.existsSync(codeReposPath)) {
            const data = fs.readFileSync(codeReposPath, 'utf8');
            repos = JSON.parse(data);
        }

        // Find and update existing repo or add new one
        const existingIndex = repos.findIndex(r => r.id === repo.id);
        if (existingIndex >= 0) {
            repos[existingIndex] = repo;
        } else {
            repos.push(repo);
        }

        // Save to file
        fs.writeFileSync(codeReposPath, JSON.stringify(repos, null, 2));

        event.reply('code-repo-saved', true);
    } catch (error) {
        console.error('Failed to save code repository:', error);
        event.reply('code-repo-saved', false);
    }
});

ipcMain.on('delete-code-repo', async (event, repoId) => {
    try {
        const codeReposPath = path.join(app.getPath('userData'), 'code-repos.json');

        // Load existing repos
        let repos = [];
        if (fs.existsSync(codeReposPath)) {
            const data = fs.readFileSync(codeReposPath, 'utf8');
            repos = JSON.parse(data);
        }

        // Filter out the repo to delete
        repos = repos.filter(r => r.id !== repoId);

        // Save to file
        fs.writeFileSync(codeReposPath, JSON.stringify(repos, null, 2));

        event.reply('code-repo-deleted', true);
    } catch (error) {
        console.error('Failed to delete code repository:', error);
        event.reply('code-repo-deleted', false);
    }
});

ipcMain.on('chat-message', async (event, data) => {
    const { message } = data;

    try {
        if (!agentClient) {
            throw new Error('Agent client not initialized. Please configure settings first.');
        }

        // Create progress callback to stream logs to UI
        const onProgress = (progressData) => {
            event.reply('chat-progress', progressData);
        };

        const response = await agentClient.sendMessage(message, onProgress);

        event.reply('chat-response', { message: response });
    } catch (error) {
        console.error('Chat error:', error);
        event.reply('chat-error', { message: error.message });
    }
});

// Save message to file handler
ipcMain.on('save-message-to-file', async (event, data) => {
    const { content, suggestedFilename } = data;
    const { dialog } = require('electron');
    const fs = require('fs');
    const path = require('path');

    try {
        // Show save dialog
        const result = await dialog.showSaveDialog(mainWindow, {
            title: 'Save Message as Markdown',
            defaultPath: path.join(app.getPath('documents'), suggestedFilename),
            filters: [
                { name: 'Markdown Files', extensions: ['md'] },
                { name: 'Text Files', extensions: ['txt'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['createDirectory', 'showOverwriteConfirmation']
        });

        if (result.canceled) {
            event.reply('save-message-result', { cancelled: true });
            return;
        }

        // Write file
        fs.writeFileSync(result.filePath, content, 'utf8');

        console.log('Message saved to:', result.filePath);
        event.reply('save-message-result', {
            success: true,
            filePath: result.filePath
        });
    } catch (error) {
        console.error('Failed to save message:', error);
        event.reply('save-message-result', {
            success: false,
            error: error.message
        });
    }
});

// Conversation management handlers
ipcMain.on('get-conversations', (event) => {
    try {
        const conversations = agentClient.getAllConversations();
        const activeConversation = conversationManager.getActiveConversation();
        const grouped = conversationManager.groupByTime(conversations);

        event.reply('conversations-list', {
            conversations,
            grouped,
            activeId: activeConversation ? activeConversation.id : null
        });
    } catch (error) {
        console.error('Error getting conversations:', error);
        event.reply('conversations-error', { message: error.message });
    }
});

ipcMain.on('new-conversation', async (event) => {
    try {
        const conversation = await agentClient.createNewConversation();
        event.reply('conversation-created', { conversation });

        // Also send updated conversations list
        const conversations = agentClient.getAllConversations();
        const grouped = conversationManager.groupByTime(conversations);
        event.reply('conversations-list', {
            conversations,
            grouped,
            activeId: conversation.id
        });
    } catch (error) {
        console.error('Error creating conversation:', error);
        event.reply('conversation-error', { message: error.message });
    }
});

ipcMain.on('load-conversation', async (event, data) => {
    const { id } = data;

    try {
        const conversation = await agentClient.loadConversation(id);
        event.reply('conversation-loaded', { conversation });
    } catch (error) {
        console.error('Error loading conversation:', error);
        event.reply('conversation-error', { message: error.message });
    }
});

ipcMain.on('delete-conversation', async (event, data) => {
    const { id } = data;

    try {
        await agentClient.deleteConversation(id);
        event.reply('conversation-deleted', { id });

        // Send updated conversations list
        const conversations = agentClient.getAllConversations();
        const activeConversation = conversationManager.getActiveConversation();
        const grouped = conversationManager.groupByTime(conversations);
        event.reply('conversations-list', {
            conversations,
            grouped,
            activeId: activeConversation ? activeConversation.id : null
        });
    } catch (error) {
        console.error('Error deleting conversation:', error);
        event.reply('conversation-error', { message: error.message });
    }
});

// Quick action handlers
ipcMain.on('quick-action', async (event, data) => {
    const { action } = data;

    try {
        if (!agentClient) {
            throw new Error('Agent client not initialized. Please configure settings first.');
        }

        let response;
        switch (action) {
            case 'sprint-tasks':
                response = await agentClient.getMySprintTasks();
                break;
            case 'high-priority':
                response = await agentClient.getHighPriorityTasks();
                break;
            case 'recent-docs':
                response = await agentClient.getRecentConfluencePages();
                break;
            case 'analyze-workload':
                response = await agentClient.analyzeWorkload();
                break;
            default:
                throw new Error(`Unknown quick action: ${action}`);
        }

        event.reply('chat-response', { message: response });
    } catch (error) {
        console.error('Quick action error:', error);
        event.reply('chat-error', { message: error.message });
    }
});
