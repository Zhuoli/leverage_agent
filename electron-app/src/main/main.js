const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const AgentClient = require('../backend/agent-client');
const ConfigManager = require('../backend/config');

let mainWindow;
let agentClient;
let configManager;

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

app.whenReady().then(() => {
    // Initialize configuration manager
    configManager = new ConfigManager();

    // Initialize agent client
    try {
        agentClient = new AgentClient(configManager.getConfig());
    } catch (error) {
        console.error('Failed to initialize agent client:', error);
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

ipcMain.on('save-settings', (event, settings) => {
    try {
        configManager.saveConfig(settings);

        // Reinitialize agent client with new config
        agentClient = new AgentClient(settings);

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

        // Create a temporary test by trying to initialize the provider
        // We'll use the CLI with a test message
        const projectRoot = path.join(__dirname, '..', '..');
        const cliPath = path.join(projectRoot, 'backend-dist', 'cli', 'index.js');

        // For testing, we'll try to create the provider and send a simple message
        const provider = settings.MODEL_PROVIDER || 'claude';

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

        // Test with a simple message
        const args = [
            cliPath,
            'chat',
            '--message',
            'Hello, this is a connection test.'
        ];

        const testProcess = spawn('node', args, {
            cwd: projectRoot,
            env: env,
            timeout: 30000 // 30 second timeout
        });

        let stdout = '';
        let stderr = '';

        testProcess.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        testProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        testProcess.on('close', (code) => {
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

ipcMain.on('chat-message', async (event, data) => {
    const { message } = data;

    try {
        if (!agentClient) {
            throw new Error('Agent client not initialized. Please configure settings first.');
        }

        const response = await agentClient.sendMessage(message);

        event.reply('chat-response', { message: response });
    } catch (error) {
        console.error('Chat error:', error);
        event.reply('chat-error', { message: error.message });
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
