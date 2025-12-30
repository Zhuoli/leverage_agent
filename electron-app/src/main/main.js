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
