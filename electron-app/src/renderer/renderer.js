// Renderer process - handles UI interactions

const { ipcRenderer } = require('electron');

// DOM Elements
const chatContainer = document.getElementById('chatContainer');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const settingsModal = document.getElementById('settingsModal');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');

// State
let isProcessing = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkConfiguration();
    setupEventListeners();
});

function setupEventListeners() {
    // Send message on Enter (without Shift)
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', () => {
        messageInput.style.height = 'auto';
        messageInput.style.height = messageInput.scrollHeight + 'px';
    });

    // Listen for responses from main process
    ipcRenderer.on('chat-response', (event, response) => {
        removeTypingIndicator();
        addMessage(response.message, 'assistant');
        isProcessing = false;
        sendButton.disabled = false;
    });

    ipcRenderer.on('chat-error', (event, error) => {
        removeTypingIndicator();
        addMessage('Sorry, I encountered an error: ' + error.message, 'assistant', true);
        isProcessing = false;
        sendButton.disabled = false;
    });

    ipcRenderer.on('config-status', (event, status) => {
        updateConfigStatus(status);
    });
}

async function checkConfiguration() {
    ipcRenderer.send('check-config');
}

function updateConfigStatus(status) {
    if (status.configured) {
        statusIndicator.classList.add('connected');
        statusText.textContent = 'Connected';
    } else {
        statusIndicator.classList.add('error');
        statusText.textContent = 'Configuration needed';
    }
}

function sendMessage() {
    const message = messageInput.value.trim();

    if (!message || isProcessing) return;

    // Add user message to chat
    addMessage(message, 'user');

    // Clear input
    messageInput.value = '';
    messageInput.style.height = 'auto';

    // Show typing indicator
    addTypingIndicator();

    // Disable send button
    isProcessing = true;
    sendButton.disabled = true;

    // Send to main process
    ipcRenderer.send('chat-message', { message });
}

function addMessage(text, sender, isError = false) {
    // Remove welcome message if it exists
    const welcomeMsg = chatContainer.querySelector('.welcome-message');
    if (welcomeMsg) {
        welcomeMsg.remove();
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';

    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';

    // Support markdown-style formatting
    textDiv.innerHTML = formatMessage(text);

    if (isError) {
        textDiv.style.color = 'var(--danger-color)';
    }

    const time = document.createElement('div');
    time.className = 'message-time';
    time.textContent = new Date().toLocaleTimeString();

    content.appendChild(textDiv);
    content.appendChild(time);

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function formatMessage(text) {
    // Basic markdown-style formatting
    let formatted = text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');

    return formatted;
}

function addTypingIndicator() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message assistant typing';
    messageDiv.id = 'typingIndicator';

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = '🤖';

    const content = document.createElement('div');
    content.className = 'message-content';

    const typing = document.createElement('div');
    typing.className = 'typing-indicator';
    typing.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';

    content.appendChild(typing);
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typingIndicator');
    if (indicator) {
        indicator.remove();
    }
}

function quickAction(action) {
    const actions = {
        'sprint': 'Show me my current sprint tasks',
        'today': 'What should I focus on today?',
        'search': 'Search Confluence for ',
        'recent': 'Show me recent Confluence pages'
    };

    if (actions[action]) {
        messageInput.value = actions[action];
        if (action === 'search') {
            messageInput.focus();
        } else {
            sendMessage();
        }
    }
}

function clearChat() {
    if (confirm('Are you sure you want to clear the chat history?')) {
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>👋 Welcome!</h2>
                <p>I can help you with:</p>
                <ul>
                    <li>📋 Viewing and analyzing your Jira tasks</li>
                    <li>🔍 Searching Confluence pages</li>
                    <li>📖 Reading and summarizing documentation</li>
                    <li>💡 Answering questions about your work</li>
                </ul>
                <p class="hint">Try asking: "What are my sprint tasks?" or "Search for API documentation"</p>
            </div>
        `;
    }
}

function openSettings() {
    settingsModal.classList.add('show');
    loadSettings();
}

function closeSettings() {
    settingsModal.classList.remove('show');
}

function onProviderChange() {
    const provider = document.getElementById('modelProvider').value;
    const anthropicGroup = document.getElementById('anthropicKeyGroup');
    const openaiGroup = document.getElementById('openaiKeyGroup');

    if (provider === 'claude') {
        anthropicGroup.style.display = 'block';
        openaiGroup.style.display = 'none';
    } else {
        anthropicGroup.style.display = 'none';
        openaiGroup.style.display = 'block';
    }
}

function loadSettings() {
    ipcRenderer.send('get-settings');
    ipcRenderer.once('settings-loaded', (event, settings) => {
        if (settings) {
            // Model provider settings
            document.getElementById('modelProvider').value = settings.MODEL_PROVIDER || 'claude';
            document.getElementById('modelName').value = settings.MODEL_NAME || '';
            document.getElementById('anthropicKey').value = settings.ANTHROPIC_API_KEY || '';
            document.getElementById('openaiKey').value = settings.OPENAI_API_KEY || '';

            // Jira settings
            document.getElementById('jiraUrl').value = settings.JIRA_URL || '';
            document.getElementById('jiraUsername').value = settings.JIRA_USERNAME || '';
            document.getElementById('jiraToken').value = settings.JIRA_API_TOKEN || '';

            // Confluence settings
            document.getElementById('confluenceUrl').value = settings.CONFLUENCE_URL || '';
            document.getElementById('confluenceUsername').value = settings.CONFLUENCE_USERNAME || '';
            document.getElementById('confluenceToken').value = settings.CONFLUENCE_API_TOKEN || '';
            document.getElementById('confluenceSpace').value = settings.CONFLUENCE_SPACE_KEY || '';

            // Update UI based on provider
            onProviderChange();
        }
    });
}

function saveSettings() {
    const settings = {
        // Model provider settings
        MODEL_PROVIDER: document.getElementById('modelProvider').value,
        MODEL_NAME: document.getElementById('modelName').value,
        ANTHROPIC_API_KEY: document.getElementById('anthropicKey').value,
        OPENAI_API_KEY: document.getElementById('openaiKey').value,

        // Jira settings
        JIRA_URL: document.getElementById('jiraUrl').value,
        JIRA_USERNAME: document.getElementById('jiraUsername').value,
        JIRA_API_TOKEN: document.getElementById('jiraToken').value,

        // Confluence settings
        CONFLUENCE_URL: document.getElementById('confluenceUrl').value,
        CONFLUENCE_USERNAME: document.getElementById('confluenceUsername').value,
        CONFLUENCE_API_TOKEN: document.getElementById('confluenceToken').value,
        CONFLUENCE_SPACE_KEY: document.getElementById('confluenceSpace').value,

        // User settings
        USER_EMAIL: document.getElementById('jiraUsername').value
    };

    ipcRenderer.send('save-settings', settings);
    ipcRenderer.once('settings-saved', (event, success) => {
        if (success) {
            alert('Settings saved successfully!');
            closeSettings();
            checkConfiguration();
        } else {
            alert('Failed to save settings. Please try again.');
        }
    });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        closeSettings();
    }
});
