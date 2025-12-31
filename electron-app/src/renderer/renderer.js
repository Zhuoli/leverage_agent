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
    // Wait for settings HTML to load
    const checkModal = setInterval(() => {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            clearInterval(checkModal);
            modal.classList.add('show');
            showSettingsView('mainSettingsView');
            loadSettings();
        }
    }, 100);
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function showSettingsView(viewId) {
    // Hide all views
    const views = document.querySelectorAll('.settings-view');
    views.forEach(view => view.classList.remove('active'));

    // Show selected view
    const selectedView = document.getElementById(viewId);
    if (selectedView) {
        selectedView.classList.add('active');
    }
}

function backToMainSettings() {
    showSettingsView('mainSettingsView');
}

function openAtlassianMcpSettings() {
    showSettingsView('atlassianMcpView');
}

function openOciMcpSettings() {
    const enabled = document.getElementById('ociMcpEnabled').checked;
    if (!enabled) {
        alert('Please enable Oracle Cloud MCP first');
        return;
    }
    showSettingsView('ociMcpView');
}

function onProviderChange() {
    const provider = document.getElementById('modelProvider').value;
    const anthropicGroup = document.getElementById('anthropicKeyGroup');
    const openaiGroup = document.getElementById('openaiKeyGroup');
    const ociOpenAIGroup = document.getElementById('ociOpenAIGroup');

    if (provider === 'claude') {
        anthropicGroup.style.display = 'block';
        openaiGroup.style.display = 'none';
        ociOpenAIGroup.style.display = 'none';
    } else if (provider === 'openai') {
        anthropicGroup.style.display = 'none';
        openaiGroup.style.display = 'block';
        ociOpenAIGroup.style.display = 'none';
    } else if (provider === 'oci-openai') {
        anthropicGroup.style.display = 'none';
        openaiGroup.style.display = 'none';
        ociOpenAIGroup.style.display = 'block';
    }
}

function onOciMcpToggle() {
    const enabled = document.getElementById('ociMcpEnabled').checked;
    const configureBtn = document.getElementById('ociMcpConfigureBtn');

    if (configureBtn) {
        configureBtn.disabled = !enabled;
    }
}

function saveAtlassianMcpSettings() {
    // Save and return to main view
    saveSettings();
}

function saveOciMcpSettings() {
    // Save and return to main view
    saveSettings();
}

// Code Repository MCP / Skills Management
function openCodeRepoSettings() {
    showSettingsView('codeRepoView');
    loadSkills();
}

function backToCodeRepoSettings() {
    showSettingsView('codeRepoView');
    loadSkills();
}

function loadSkills() {
    const skillsList = document.getElementById('skillsList');
    skillsList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #6b7280;"><p>Loading skills...</p></div>';

    ipcRenderer.send('list-skills');
}

ipcRenderer.on('skills-loaded', (event, skills) => {
    const skillsList = document.getElementById('skillsList');

    if (!skills || skills.length === 0) {
        skillsList.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <p>No repository skills configured yet.</p>
                <p style="font-size: 13px; margin-top: 8px;">Click "+ Add Repository" to create your first skill.</p>
            </div>
        `;
        return;
    }

    skillsList.innerHTML = skills.map(skill => `
        <div class="skill-card">
            <div class="skill-info">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-description">${skill.description}</div>
                ${skill.path ? `<div class="skill-path">${skill.path}</div>` : ''}
            </div>
            <div class="skill-actions">
                <button class="btn-icon" onclick="editSkill('${skill.name}')">✏️ Edit</button>
                <button class="btn-icon danger" onclick="deleteSkill('${skill.name}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
});

function addNewSkill() {
    // Clear the form
    document.getElementById('editSkillTitle').textContent = '📝 Add Repository Skill';
    document.getElementById('skillName').value = '';
    document.getElementById('skillName').disabled = false;
    document.getElementById('skillDescription').value = '';
    document.getElementById('skillRepoPath').value = '';
    document.getElementById('skillArchitecture').value = '';
    document.getElementById('skillTechnologies').value = '';
    document.getElementById('skillDevSetup').value = '';
    document.getElementById('skillNotes').value = '';

    showSettingsView('editSkillView');
}

function editSkill(skillName) {
    document.getElementById('editSkillTitle').textContent = '📝 Edit Repository Skill';

    ipcRenderer.send('get-skill', skillName);
    ipcRenderer.once('skill-loaded', (event, skill) => {
        if (skill) {
            document.getElementById('skillName').value = skill.name;
            document.getElementById('skillName').disabled = true; // Don't allow renaming
            document.getElementById('skillDescription').value = skill.description || '';
            document.getElementById('skillRepoPath').value = skill.path || '';
            document.getElementById('skillArchitecture').value = skill.architecture || '';
            document.getElementById('skillTechnologies').value = skill.technologies || '';
            document.getElementById('skillDevSetup').value = skill.devSetup || '';
            document.getElementById('skillNotes').value = skill.notes || '';

            showSettingsView('editSkillView');
        }
    });
}

function deleteSkill(skillName) {
    if (confirm(`Are you sure you want to delete the skill "${skillName}"?\n\nThis will remove the skill file from .claude/skills/ directory.`)) {
        ipcRenderer.send('delete-skill', skillName);

        ipcRenderer.once('skill-deleted', (event, result) => {
            if (result.success) {
                loadSkills(); // Reload the skills list
            } else {
                alert(`Failed to delete skill: ${result.error}`);
            }
        });
    }
}

function saveSkill() {
    const skillData = {
        name: document.getElementById('skillName').value.trim(),
        description: document.getElementById('skillDescription').value.trim(),
        path: document.getElementById('skillRepoPath').value.trim(),
        architecture: document.getElementById('skillArchitecture').value.trim(),
        technologies: document.getElementById('skillTechnologies').value.trim(),
        devSetup: document.getElementById('skillDevSetup').value.trim(),
        notes: document.getElementById('skillNotes').value.trim()
    };

    // Validation
    if (!skillData.name) {
        alert('Please provide a skill name');
        return;
    }

    if (!skillData.description) {
        alert('Please provide a description');
        return;
    }

    if (!skillData.path) {
        alert('Please provide a repository path');
        return;
    }

    // Validate skill name format (lowercase, hyphens only)
    if (!/^[a-z0-9-]+$/.test(skillData.name)) {
        alert('Skill name must be lowercase and contain only letters, numbers, and hyphens');
        return;
    }

    ipcRenderer.send('save-skill', skillData);

    ipcRenderer.once('skill-saved', (event, result) => {
        if (result.success) {
            backToCodeRepoSettings();
        } else {
            alert(`Failed to save skill: ${result.error}`);
        }
    });
}

function browseForDirectory() {
    ipcRenderer.send('browse-directory');

    ipcRenderer.once('directory-selected', (event, directoryPath) => {
        if (directoryPath) {
            document.getElementById('skillRepoPath').value = directoryPath;
        }
    });
}

function loadSettings() {
    ipcRenderer.send('get-settings');
    ipcRenderer.once('settings-loaded', (event, settings) => {
        if (settings) {
            // Model provider settings
            document.getElementById('modelProvider').value = settings.MODEL_PROVIDER || 'oci-openai';
            document.getElementById('modelName').value = settings.MODEL_NAME || '';
            document.getElementById('anthropicKey').value = settings.ANTHROPIC_API_KEY || '';
            document.getElementById('openaiKey').value = settings.OPENAI_API_KEY || '';

            // OCI OpenAI settings
            document.getElementById('ociCompartmentId').value = settings.OCI_COMPARTMENT_ID || '';
            document.getElementById('ociEndpoint').value = settings.OCI_ENDPOINT || '';
            document.getElementById('ociConfigPath').value = settings.OCI_CONFIG_PATH || '';
            document.getElementById('ociProfile').value = settings.OCI_PROFILE || '';

            // OCI MCP settings
            document.getElementById('ociMcpEnabled').checked = settings.OCI_MCP_ENABLED === 'true' || settings.OCI_MCP_ENABLED === true;
            document.getElementById('ociMcpRegion').value = settings.OCI_MCP_REGION || '';
            document.getElementById('ociMcpCompartmentId').value = settings.OCI_MCP_COMPARTMENT_ID || '';
            document.getElementById('ociMcpTenancyId').value = settings.OCI_MCP_TENANCY_ID || '';
            document.getElementById('ociMcpConfigPath').value = settings.OCI_MCP_CONFIG_PATH || '';
            document.getElementById('ociMcpProfile').value = settings.OCI_MCP_PROFILE || '';

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
            onOciMcpToggle();
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

        // OCI OpenAI settings
        OCI_COMPARTMENT_ID: document.getElementById('ociCompartmentId').value,
        OCI_ENDPOINT: document.getElementById('ociEndpoint').value,
        OCI_CONFIG_PATH: document.getElementById('ociConfigPath').value,
        OCI_PROFILE: document.getElementById('ociProfile').value,

        // OCI MCP settings
        OCI_MCP_ENABLED: document.getElementById('ociMcpEnabled').checked ? 'true' : 'false',
        OCI_MCP_REGION: document.getElementById('ociMcpRegion').value,
        OCI_MCP_COMPARTMENT_ID: document.getElementById('ociMcpCompartmentId').value,
        OCI_MCP_TENANCY_ID: document.getElementById('ociMcpTenancyId').value,
        OCI_MCP_CONFIG_PATH: document.getElementById('ociMcpConfigPath').value,
        OCI_MCP_PROFILE: document.getElementById('ociMcpProfile').value,

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
            // Show success message
            const currentView = document.querySelector('.settings-view.active');
            if (currentView && currentView.id !== 'mainSettingsView') {
                // Return to main view if saving from sub-view
                showSettingsView('mainSettingsView');
                setTimeout(() => {
                    alert('Configuration saved successfully!');
                }, 300);
            } else {
                alert('Settings saved successfully!');
                closeSettings();
            }
            checkConfiguration();
        } else {
            alert('Failed to save settings. Please try again.');
        }
    });
}

function testConnection() {
    const resultDiv = document.getElementById('testConnectionResult');
    resultDiv.innerHTML = '<span style="color: #0969da;">⏳ Testing connection...</span>';

    const settings = {
        MODEL_PROVIDER: document.getElementById('modelProvider').value,
        MODEL_NAME: document.getElementById('modelName').value,
        ANTHROPIC_API_KEY: document.getElementById('anthropicKey').value,
        OPENAI_API_KEY: document.getElementById('openaiKey').value,
        OCI_COMPARTMENT_ID: document.getElementById('ociCompartmentId').value,
        OCI_ENDPOINT: document.getElementById('ociEndpoint').value,
        OCI_CONFIG_PATH: document.getElementById('ociConfigPath').value,
        OCI_PROFILE: document.getElementById('ociProfile').value,
    };

    ipcRenderer.send('test-connection', settings);
    ipcRenderer.once('connection-test-result', (event, result) => {
        if (result.success) {
            resultDiv.innerHTML = '<span style="color: #1a7f37;">✅ Connection successful!</span>';
        } else {
            resultDiv.innerHTML = `<span style="color: #cf222e;">❌ Connection failed: ${result.error}</span>`;
        }
    });
}

function testAtlassianMcpConnection() {
    const resultDiv = document.getElementById('atlassianMcpTestResult');
    resultDiv.innerHTML = '<span style="color: #0969da;">⏳ Testing Atlassian connection...</span>';

    const settings = {
        JIRA_URL: document.getElementById('jiraUrl').value,
        JIRA_USERNAME: document.getElementById('jiraUsername').value,
        JIRA_API_TOKEN: document.getElementById('jiraToken').value,
        CONFLUENCE_URL: document.getElementById('confluenceUrl').value,
        CONFLUENCE_USERNAME: document.getElementById('confluenceUsername').value,
        CONFLUENCE_API_TOKEN: document.getElementById('confluenceToken').value,
    };

    // Validate required fields
    if (!settings.JIRA_URL || !settings.JIRA_USERNAME || !settings.JIRA_API_TOKEN) {
        resultDiv.innerHTML = '<span style="color: #cf222e;">❌ Please fill in all required Jira fields</span>';
        return;
    }

    if (!settings.CONFLUENCE_URL || !settings.CONFLUENCE_USERNAME || !settings.CONFLUENCE_API_TOKEN) {
        resultDiv.innerHTML = '<span style="color: #cf222e;">❌ Please fill in all required Confluence fields</span>';
        return;
    }

    ipcRenderer.send('test-atlassian-mcp-connection', settings);
    ipcRenderer.once('atlassian-mcp-test-result', (event, result) => {
        if (result.success) {
            resultDiv.innerHTML = `<span style="color: #1a7f37;">✅ Connection successful!<br>${result.message || ''}</span>`;
        } else {
            resultDiv.innerHTML = `<span style="color: #cf222e;">❌ Connection failed: ${result.error}</span>`;
        }
    });
}

function testOciMcpConnection() {
    const resultDiv = document.getElementById('ociMcpTestResult');
    resultDiv.innerHTML = '<span style="color: #0969da;">⏳ Testing OCI connection...</span>';

    const settings = {
        OCI_MCP_REGION: document.getElementById('ociMcpRegion').value,
        OCI_MCP_COMPARTMENT_ID: document.getElementById('ociMcpCompartmentId').value,
        OCI_MCP_TENANCY_ID: document.getElementById('ociMcpTenancyId').value,
        OCI_MCP_CONFIG_PATH: document.getElementById('ociMcpConfigPath').value,
        OCI_MCP_PROFILE: document.getElementById('ociMcpProfile').value,
    };

    // Validate required fields
    if (!settings.OCI_MCP_REGION || !settings.OCI_MCP_COMPARTMENT_ID || !settings.OCI_MCP_TENANCY_ID) {
        resultDiv.innerHTML = '<span style="color: #cf222e;">❌ Please fill in Region, Compartment ID, and Tenancy ID</span>';
        return;
    }

    ipcRenderer.send('test-oci-mcp-connection', settings);
    ipcRenderer.once('oci-mcp-test-result', (event, result) => {
        if (result.success) {
            resultDiv.innerHTML = `<span style="color: #1a7f37;">✅ Connection successful!<br>${result.message || ''}</span>`;
        } else {
            resultDiv.innerHTML = `<span style="color: #cf222e;">❌ Connection failed: ${result.error}</span>`;
        }
    });
}

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        closeSettings();
    }
});
