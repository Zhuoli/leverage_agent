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
let mermaidCounter = 0;

// Escape HTML for safe rendering
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Copy code to clipboard
function copyCodeToClipboard(button) {
    const codeText = button.getAttribute('data-code');

    // Use Clipboard API
    navigator.clipboard.writeText(codeText).then(() => {
        // Change button text to "Copied!"
        const copyText = button.querySelector('.copy-text');
        const copyIcon = button.querySelector('.copy-icon');
        const originalText = copyText.textContent;
        const originalIcon = copyIcon.textContent;

        copyText.textContent = 'Copied!';
        copyIcon.textContent = '✓';
        button.classList.add('copied');

        // Reset after 2 seconds
        setTimeout(() => {
            copyText.textContent = originalText;
            copyIcon.textContent = originalIcon;
            button.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy code:', err);
        alert('Failed to copy code to clipboard');
    });
}

// Initialize Mermaid for diagrams
function initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({
            startOnLoad: false,
            theme: 'default',
            securityLevel: 'loose',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
        });
    }
}

// Configure Marked with highlight.js for syntax highlighting
function configureMarked() {
    if (typeof marked !== 'undefined' && typeof hljs !== 'undefined') {
        console.log('[Renderer] Configuring marked.js with custom code renderer');
        console.log('[Renderer] marked version:', marked.VERSION || 'unknown');
        console.log('[Renderer] hljs available:', !!hljs);

        // Use marked's extension API for code blocks
        marked.use({
            breaks: true,
            gfm: true,
            renderer: {
                code(code, infostring) {
                    const language = infostring || '';
                    console.log('[Renderer] code() called - language:', language, 'code length:', code.length);

                    const validLanguage = language && hljs.getLanguage(language) ? language : null;
                    let highlighted;

                    if (validLanguage) {
                        try {
                            highlighted = hljs.highlight(code, { language: validLanguage }).value;
                        } catch (e) {
                            console.error('Highlight error:', e);
                            highlighted = escapeHtml(code);
                        }
                    } else {
                        // Auto-detect or plain text
                        try {
                            highlighted = hljs.highlightAuto(code).value;
                        } catch (e) {
                            highlighted = escapeHtml(code);
                        }
                    }

                    const langLabel = validLanguage || 'code';
                    const langClass = validLanguage ? ` class="language-${validLanguage}"` : '';
                    const escapedCode = escapeHtml(code);

                    console.log('[Renderer] Returning code block wrapper with copy button');

                    // Wrap code block with copy button
                    return `<div class="code-block-wrapper">
                        <div class="code-block-header">
                            <span class="code-block-language">${langLabel}</span>
                            <button class="code-copy-button" onclick="copyCodeToClipboard(this)" data-code="${escapedCode.replace(/"/g, '&quot;')}">
                                <span class="copy-icon">📋</span>
                                <span class="copy-text">Copy</span>
                            </button>
                        </div>
                        <pre><code${langClass}>${highlighted}</code></pre>
                    </div>`;
                }
            }
        });

        console.log('[Renderer] marked.js configured successfully');
    } else {
        console.warn('[Renderer] marked or hljs not available');
        if (typeof marked === 'undefined') console.warn('[Renderer] marked is undefined');
        if (typeof hljs === 'undefined') console.warn('[Renderer] hljs is undefined');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeMermaid();
    configureMarked();
    checkConfiguration();
    setupEventListeners();
    loadConversations();
    restoreSidebarState();
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
        removeProgressPanel();
        addMessage(response.message, 'assistant');
        isProcessing = false;
        sendButton.disabled = false;
    });

    ipcRenderer.on('chat-error', (event, error) => {
        removeTypingIndicator();
        removeProgressPanel();
        addMessage('Sorry, I encountered an error: ' + error.message, 'assistant', true);
        isProcessing = false;
        sendButton.disabled = false;
    });

    ipcRenderer.on('chat-progress', (event, progressData) => {
        updateProgressPanel(progressData);
    });

    ipcRenderer.on('config-status', (event, status) => {
        updateConfigStatus(status);
    });

    // Conversation history listeners
    ipcRenderer.on('conversations-list', (event, data) => {
        renderConversationList(data.grouped, data.activeId);
    });

    ipcRenderer.on('conversation-created', (event, data) => {
        clearChatArea();
    });

    ipcRenderer.on('conversation-loaded', (event, data) => {
        loadConversationMessages(data.conversation);
    });

    ipcRenderer.on('conversation-deleted', (event, data) => {
        // List will be updated via conversations-list event
    });

    ipcRenderer.on('conversation-error', (event, data) => {
        console.error('Conversation error:', data.message);
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

    // Add save button for assistant messages
    if (sender === 'assistant' && !isError) {
        const saveButton = document.createElement('button');
        saveButton.className = 'message-save-button';
        saveButton.innerHTML = '<span class="save-icon">💾</span><span class="save-text">Save as Markdown</span>';
        saveButton.title = 'Save this response as a Markdown file';
        saveButton.onclick = () => saveMessageToFile(text, messageDiv);
        content.appendChild(saveButton);
    }

    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);

    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // Render mermaid diagrams after adding to DOM
    renderMermaidDiagrams();
}

function formatMessage(text) {
    console.log('[Renderer] formatMessage called, text length:', text.length);
    console.log('[Renderer] marked available:', typeof marked !== 'undefined');

    // Use marked for full markdown rendering if available
    if (typeof marked !== 'undefined') {
        try {
            // First, extract and preserve mermaid code blocks
            const mermaidBlocks = [];
            let processedText = text.replace(/```mermaid\n([\s\S]*?)```/g, (match, code) => {
                const placeholder = `__MERMAID_PLACEHOLDER_${mermaidBlocks.length}__`;
                mermaidBlocks.push(code.trim());
                return placeholder;
            });

            // Parse markdown
            let html = marked.parse(processedText);

            // Replace mermaid placeholders with actual mermaid containers
            mermaidBlocks.forEach((code, index) => {
                const mermaidId = `mermaid-${mermaidCounter++}`;
                const mermaidHtml = `<div class="mermaid-container"><div class="mermaid" id="${mermaidId}">${escapeHtml(code)}</div></div>`;
                html = html.replace(`__MERMAID_PLACEHOLDER_${index}__`, mermaidHtml);
            });

            return html;
        } catch (e) {
            console.error('Markdown parsing error:', e);
            // Fallback to basic formatting
            return basicFormatMessage(text);
        }
    }

    // Fallback to basic formatting if marked is not available
    return basicFormatMessage(text);
}

// Basic fallback formatting
function basicFormatMessage(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

// Render mermaid diagrams after adding to DOM
async function renderMermaidDiagrams() {
    if (typeof mermaid === 'undefined') return;

    const mermaidElements = document.querySelectorAll('.mermaid:not(.mermaid-rendered)');
    for (const element of mermaidElements) {
        try {
            const id = element.id || `mermaid-${mermaidCounter++}`;
            const graphDefinition = element.textContent;
            const { svg } = await mermaid.render(id + '-svg', graphDefinition);
            element.innerHTML = svg;
            element.classList.add('mermaid-rendered');
        } catch (e) {
            console.error('Mermaid rendering error:', e);
            element.innerHTML = `<div class="mermaid-error">Failed to render diagram: ${e.message}</div>`;
            element.classList.add('mermaid-rendered');
        }
    }
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

function updateProgressPanel(progressData) {
    let panel = document.getElementById('progressPanel');

    // Create panel if it doesn't exist
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'progressPanel';
        panel.className = 'progress-panel';
        chatContainer.appendChild(panel);
    }

    // Handle structured log messages
    if (progressData.type === 'structured_log') {
        const logData = progressData.data;
        const logLine = document.createElement('div');
        logLine.className = `progress-log progress-log-${logData.level.toLowerCase()}`;

        const emoji = getLogEmoji(logData.category, logData.level);
        const categoryBadge = `<span class="log-category">[${logData.category}]</span>`;

        logLine.innerHTML = `${emoji} ${categoryBadge} ${escapeHtml(logData.message)}`;
        panel.appendChild(logLine);

        // Keep only last 10 log lines
        const logs = panel.querySelectorAll('.progress-log');
        if (logs.length > 10) {
            logs[0].remove();
        }
    }

    // Scroll to show latest progress
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function removeProgressPanel() {
    const panel = document.getElementById('progressPanel');
    if (panel) {
        panel.remove();
    }
}

function getLogEmoji(category, level) {
    if (level === 'SUCCESS') return '✓';
    if (level === 'ERROR') return '✗';
    if (level === 'WARNING') return '⚠';
    if (level === 'PROGRESS') return '⏳';

    // Category-specific emojis for INFO level
    switch (category) {
        case 'INIT': return '🚀';
        case 'SKILLS': return '📚';
        case 'MCP': return '🔌';
        case 'TOOLS': return '🛠';
        case 'CHAT': return '💬';
        default: return '•';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Save a message to a file
 */
function saveMessageToFile(text, messageElement) {
    // Generate a suggested filename from the message content
    const suggestedFilename = generateFilename(text);

    console.log('[Save] Saving message to file, suggested name:', suggestedFilename);

    // Add visual feedback
    const saveButton = messageElement.querySelector('.message-save-button');
    const originalText = saveButton.innerHTML;
    saveButton.innerHTML = '<span class="save-icon">⏳</span><span class="save-text">Saving...</span>';
    saveButton.disabled = true;

    // Send to main process to show save dialog
    ipcRenderer.send('save-message-to-file', {
        content: text,
        suggestedFilename: suggestedFilename
    });

    // Listen for response
    ipcRenderer.once('save-message-result', (event, result) => {
        if (result.success) {
            // Show success feedback
            saveButton.innerHTML = '<span class="save-icon">✓</span><span class="save-text">Saved!</span>';
            saveButton.classList.add('saved');

            // Reset after 2 seconds
            setTimeout(() => {
                saveButton.innerHTML = originalText;
                saveButton.disabled = false;
                saveButton.classList.remove('saved');
            }, 2000);
        } else if (result.cancelled) {
            // User cancelled - just reset
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
        } else {
            // Error occurred
            saveButton.innerHTML = '<span class="save-icon">✗</span><span class="save-text">Failed</span>';
            alert('Failed to save file: ' + result.error);

            // Reset after 2 seconds
            setTimeout(() => {
                saveButton.innerHTML = originalText;
                saveButton.disabled = false;
            }, 2000);
        }
    });
}

/**
 * Generate a filename from message content
 */
function generateFilename(text) {
    // Remove markdown formatting for title extraction
    const plainText = text
        .replace(/[#*`_~\[\]()]/g, '') // Remove markdown symbols
        .replace(/\n+/g, ' ')          // Replace newlines with spaces
        .trim();

    // Get first 50 characters or first line, whichever is shorter
    let title = plainText.substring(0, 50);
    const firstLineEnd = title.indexOf('.');
    if (firstLineEnd > 10) {
        title = title.substring(0, firstLineEnd);
    }

    // Clean up for filename
    const filename = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')   // Replace non-alphanumeric with dash
        .replace(/^-+|-+$/g, '')        // Remove leading/trailing dashes
        .substring(0, 50);              // Limit length

    // Add timestamp if filename is too short or generic
    if (filename.length < 10 || filename === 'technical-design' || filename === 'design-document') {
        const timestamp = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        return `${filename}-${timestamp}.md`;
    }

    return `${filename}.md`;
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
    const enabled = document.getElementById('atlassianMcpEnabled').checked;
    if (!enabled) {
        alert('Please enable Atlassian MCP first');
        return;
    }
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
    const modelNameInput = document.getElementById('modelName');

    if (provider === 'claude') {
        anthropicGroup.style.display = 'block';
        openaiGroup.style.display = 'none';
        ociOpenAIGroup.style.display = 'none';
        // Set default Claude model if empty
        if (!modelNameInput.value) {
            modelNameInput.value = 'claude-sonnet-4-5';
        }
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

function onAtlassianMcpToggle() {
    const enabled = document.getElementById('atlassianMcpEnabled').checked;
    const configureBtn = document.getElementById('atlassianMcpConfigureBtn');

    if (configureBtn) {
        configureBtn.disabled = !enabled;
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

// Skills Management
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
                <p>No skills configured yet.</p>
                <p style="font-size: 13px; margin-top: 8px;">Click "+ Add Skill" to create your first skill.</p>
            </div>
        `;
        return;
    }

    skillsList.innerHTML = skills.map(skill => `
        <div class="skill-card">
            <div class="skill-info">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-description">${skill.description}</div>
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
    document.getElementById('editSkillTitle').textContent = '📝 Add Skill';
    document.getElementById('skillName').value = '';
    document.getElementById('skillContent').value = '';

    // Show skill name section for new skills
    document.getElementById('skillNameSection').style.display = 'block';

    showSettingsView('editSkillView');
}

function editSkill(skillName) {
    document.getElementById('editSkillTitle').textContent = `📝 Edit Skill: ${skillName}`;

    // Hide skill name section when editing (can't rename)
    document.getElementById('skillNameSection').style.display = 'none';
    document.getElementById('skillName').value = skillName;

    ipcRenderer.send('get-skill', skillName);
    ipcRenderer.once('skill-loaded', (event, skill) => {
        if (skill) {
            // Load the full content (frontmatter + body)
            document.getElementById('skillContent').value = skill.fullContent || '';

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
    const skillName = document.getElementById('skillName').value.trim();
    const skillContent = document.getElementById('skillContent').value.trim();

    // Validation 1: Check skill name
    if (!skillName) {
        alert('Please provide a skill name');
        return;
    }

    // Validate skill name format (lowercase, hyphens only)
    if (!/^[a-z0-9-]+$/.test(skillName)) {
        alert('Skill name must be lowercase and contain only letters, numbers, and hyphens');
        return;
    }

    // Validation 2: Check skill content exists
    if (!skillContent) {
        alert('Please provide skill content');
        return;
    }

    // Validation 3: Check frontmatter format
    const frontmatterRegex = /^---\n([\s\S]*?)\n---/;
    const frontmatterMatch = skillContent.match(frontmatterRegex);

    if (!frontmatterMatch) {
        alert('❌ Invalid skill format!\n\nSkills must start with frontmatter:\n\n---\ndescription: Your description here\n---\n\nYour content...');
        return;
    }

    // Validation 4: Check for description in frontmatter
    const frontmatter = frontmatterMatch[1];
    const descriptionMatch = frontmatter.match(/description:\s*(.+)/);

    if (!descriptionMatch) {
        alert('❌ Invalid skill format!\n\nFrontmatter must include a "description:" field:\n\n---\ndescription: Your description here\n---');
        return;
    }

    const description = descriptionMatch[1].trim();
    if (!description) {
        alert('❌ Description cannot be empty!\n\nPlease provide a meaningful description in the frontmatter.');
        return;
    }

    // Validation 5: Check there's content after frontmatter
    const contentAfterFrontmatter = skillContent.substring(frontmatterMatch[0].length).trim();
    if (!contentAfterFrontmatter) {
        alert('❌ Skill content is empty!\n\nPlease add content after the frontmatter.');
        return;
    }

    // All validations passed, save the skill
    const skillData = {
        name: skillName,
        content: skillContent
    };

    ipcRenderer.send('save-skill', skillData);

    ipcRenderer.once('skill-saved', (event, result) => {
        if (result.success) {
            backToMainSettings();
            loadSkills(); // Reload skills list
        } else {
            alert(`Failed to save skill: ${result.error}`);
        }
    });
}

// ========================================
// Code Repositories Management
// ========================================

let codeRepositories = [];
let currentEditingRepoId = null;

function loadCodeRepos() {
    ipcRenderer.send('get-code-repos');
}

ipcRenderer.on('code-repos-loaded', (event, repos) => {
    codeRepositories = repos || [];
    renderCodeRepos();
});

function renderCodeRepos() {
    const container = document.getElementById('codeReposList');
    if (!container) return;

    if (codeRepositories.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: #6b7280;">
                <p>No code repositories added yet.</p>
                <p style="font-size: 13px; margin-top: 8px;">Click "+ Add Repository" to add your first repository.</p>
            </div>
        `;
        return;
    }

    const html = codeRepositories.map(repo => `
        <div class="skill-card">
            <div class="skill-info">
                <div class="skill-name" style="font-family: monospace; font-size: 14px;">📂 ${repo.path}</div>
                ${repo.description ? `<div class="skill-description">${repo.description}</div>` : ''}
            </div>
            <div class="skill-actions">
                <button class="btn-icon" onclick="editCodeRepo('${repo.id}')">✏️ Edit</button>
                <button class="btn-icon danger" onclick="deleteCodeRepo('${repo.id}')">🗑️ Delete</button>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function addNewCodeRepo() {
    currentEditingRepoId = null;
    document.getElementById('codeRepoTitle').textContent = '📂 Add Repository';
    document.getElementById('repoPath').value = '';
    document.getElementById('repoDescription').value = '';

    showSettingsView('codeRepoView');
}

function editCodeRepo(repoId) {
    const repo = codeRepositories.find(r => r.id === repoId);
    if (!repo) {
        alert('Repository not found');
        return;
    }

    currentEditingRepoId = repoId;
    document.getElementById('codeRepoTitle').textContent = '📂 Edit Repository';
    document.getElementById('repoPath').value = repo.path || '';
    document.getElementById('repoDescription').value = repo.description || '';

    showSettingsView('codeRepoView');
}

function saveCodeRepo() {
    const path = document.getElementById('repoPath').value.trim();
    const description = document.getElementById('repoDescription').value.trim();

    // Validation
    if (!path) {
        alert('Please provide a repository path');
        return;
    }

    const repo = {
        id: currentEditingRepoId || Date.now().toString(),
        path: path,
        description: description || ''
    };

    ipcRenderer.send('save-code-repo', repo);
    ipcRenderer.once('code-repo-saved', (event, success) => {
        if (success) {
            loadCodeRepos();
            backToMainSettings();
        } else {
            alert('Failed to save repository');
        }
    });
}

function deleteCodeRepo(repoId) {
    const repo = codeRepositories.find(r => r.id === repoId);
    if (!repo) return;

    if (!confirm(`Are you sure you want to remove this repository?\n\n${repo.path}`)) {
        return;
    }

    ipcRenderer.send('delete-code-repo', repoId);
    ipcRenderer.once('code-repo-deleted', (event, success) => {
        if (success) {
            loadCodeRepos();
        } else {
            alert('Failed to delete repository');
        }
    });
}

function browseRepoDirectory() {
    ipcRenderer.send('browse-directory');
    ipcRenderer.once('directory-selected', (event, path) => {
        if (path) {
            document.getElementById('repoPath').value = path;
        }
    });
}

function loadSettings() {
    ipcRenderer.send('get-settings');
    ipcRenderer.once('settings-loaded', (event, settings) => {
        if (settings) {
            // Model provider settings
            const provider = settings.MODEL_PROVIDER || 'oci-openai';
            document.getElementById('modelProvider').value = provider;

            // Set default model name for Claude if empty
            let modelName = settings.MODEL_NAME || '';
            if (provider === 'claude' && !modelName) {
                modelName = 'claude-sonnet-4-5';
            }
            document.getElementById('modelName').value = modelName;
            document.getElementById('anthropicKey').value = settings.ANTHROPIC_API_KEY || '';
            document.getElementById('openaiKey').value = settings.OPENAI_API_KEY || '';

            // OCI OpenAI settings
            document.getElementById('ociCompartmentId').value = settings.OCI_COMPARTMENT_ID || '';
            document.getElementById('ociEndpoint').value = settings.OCI_ENDPOINT || '';
            document.getElementById('ociConfigPath').value = settings.OCI_CONFIG_PATH || '';
            document.getElementById('ociProfile').value = settings.OCI_PROFILE || '';

            // Atlassian MCP settings
            document.getElementById('atlassianMcpEnabled').checked = settings.ATLASSIAN_MCP_ENABLED === 'true' || settings.ATLASSIAN_MCP_ENABLED === true;

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
            onAtlassianMcpToggle();
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

        // Atlassian MCP settings
        ATLASSIAN_MCP_ENABLED: document.getElementById('atlassianMcpEnabled').checked ? 'true' : 'false',

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
            // Update the main status indicator
            statusIndicator.classList.remove('error');
            statusIndicator.classList.add('connected');
            statusText.textContent = 'AI Provider connected';
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

// ========================================
// Custom MCP Server Management
// ========================================

let currentEditingMcpServerId = null;
let customMcpServers = [];

function openAddCustomMcpServer() {
    currentEditingMcpServerId = null;
    document.getElementById('customMcpServerTitle').textContent = '🔌 Add Custom MCP Server';

    // Clear form
    document.getElementById('customMcpName').value = '';
    document.getElementById('customMcpDescription').value = '';
    document.getElementById('customMcpIcon').value = '';
    document.getElementById('customMcpCommand').value = '';
    document.getElementById('customMcpArgs').value = '';
    document.getElementById('customMcpCwd').value = '';
    document.getElementById('customMcpEnv').value = '';

    showSettingsView('customMcpServerView');
}

function editCustomMcpServer(serverId) {
    const server = customMcpServers.find(s => s.id === serverId);
    if (!server) {
        alert('Server not found');
        return;
    }

    currentEditingMcpServerId = serverId;
    document.getElementById('customMcpServerTitle').textContent = '🔌 Edit Custom MCP Server';

    // Populate form
    document.getElementById('customMcpName').value = server.name || '';
    document.getElementById('customMcpDescription').value = server.description || '';
    document.getElementById('customMcpIcon').value = server.icon || '';
    document.getElementById('customMcpCommand').value = server.command || '';
    document.getElementById('customMcpArgs').value = server.args || '';
    document.getElementById('customMcpCwd').value = server.cwd || '';

    // Convert env object to string
    if (server.env) {
        const envString = Object.entries(server.env)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        document.getElementById('customMcpEnv').value = envString;
    } else {
        document.getElementById('customMcpEnv').value = '';
    }

    showSettingsView('customMcpServerView');
}

function saveCustomMcpServer() {
    const name = document.getElementById('customMcpName').value.trim();
    const description = document.getElementById('customMcpDescription').value.trim();
    const icon = document.getElementById('customMcpIcon').value.trim() || '🔧';
    const command = document.getElementById('customMcpCommand').value.trim();
    const args = document.getElementById('customMcpArgs').value.trim();
    const cwd = document.getElementById('customMcpCwd').value.trim();
    const envString = document.getElementById('customMcpEnv').value.trim();

    // Validate required fields
    if (!name) {
        alert('Server name is required');
        return;
    }

    if (!command) {
        alert('Command is required');
        return;
    }

    if (!args) {
        alert('Arguments are required');
        return;
    }

    // Parse environment variables
    const env = {};
    if (envString) {
        const lines = envString.split('\n');
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && trimmed.includes('=')) {
                const [key, ...valueParts] = trimmed.split('=');
                env[key.trim()] = valueParts.join('=').trim();
            }
        }
    }

    const server = {
        id: currentEditingMcpServerId || Date.now().toString(),
        name,
        description,
        icon,
        command,
        args,
        cwd: cwd || undefined,
        env: Object.keys(env).length > 0 ? env : undefined,
        enabled: true
    };

    // Save via IPC
    ipcRenderer.send('save-custom-mcp-server', server);
    ipcRenderer.once('custom-mcp-server-saved', (event, success) => {
        if (success) {
            loadCustomMcpServers();
            backToMainSettings();
        } else {
            alert('Failed to save custom MCP server');
        }
    });
}

function deleteCustomMcpServer(serverId) {
    if (!confirm('Are you sure you want to delete this custom MCP server?')) {
        return;
    }

    ipcRenderer.send('delete-custom-mcp-server', serverId);
    ipcRenderer.once('custom-mcp-server-deleted', (event, success) => {
        if (success) {
            loadCustomMcpServers();
        } else {
            alert('Failed to delete custom MCP server');
        }
    });
}

function toggleCustomMcpServer(serverId, enabled) {
    const server = customMcpServers.find(s => s.id === serverId);
    if (!server) return;

    server.enabled = enabled;

    ipcRenderer.send('save-custom-mcp-server', server);
    ipcRenderer.once('custom-mcp-server-saved', (event, success) => {
        if (success) {
            loadCustomMcpServers();
        }
    });
}

function loadCustomMcpServers() {
    ipcRenderer.send('get-custom-mcp-servers');
    ipcRenderer.once('custom-mcp-servers-loaded', (event, servers) => {
        customMcpServers = servers || [];
        renderCustomMcpServers();
    });
}

function renderCustomMcpServers() {
    const container = document.getElementById('customMcpServersContainer');
    if (!container) return;

    if (customMcpServers.length === 0) {
        container.innerHTML = '';
        return;
    }

    const html = customMcpServers.map(server => `
        <div class="mcp-server-card" style="margin-top: 16px;">
            <div class="mcp-server-header">
                <div class="mcp-server-info">
                    <div class="mcp-server-icon">${server.icon || '🔧'}</div>
                    <div>
                        <h4>${server.name}</h4>
                        <p class="mcp-server-desc">${server.description || 'Custom MCP Server'}</p>
                    </div>
                </div>
                <div class="mcp-server-actions">
                    <label class="toggle-switch">
                        <input type="checkbox" ${server.enabled ? 'checked' : ''} onchange="toggleCustomMcpServer('${server.id}', this.checked)">
                        <span class="toggle-slider"></span>
                    </label>
                    <div class="custom-mcp-actions">
                        <button class="btn-edit-mcp" onclick="editCustomMcpServer('${server.id}')">
                            ✏️ Edit
                        </button>
                        <button class="btn-delete-mcp" onclick="deleteCustomMcpServer('${server.id}')">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            </div>
            <div class="mcp-server-status">
                <span class="status-badge optional">Custom</span>
                <span class="status-text">${server.command} ${server.args}</span>
            </div>
        </div>
    `).join('');

    container.innerHTML = html;
}

function browseCustomMcpCwd() {
    ipcRenderer.send('browse-directory');
    ipcRenderer.once('directory-selected', (event, path) => {
        if (path) {
            document.getElementById('customMcpCwd').value = path;
        }
    });
}

// Load custom MCP servers, skills, and code repos when settings modal opens
const originalOpenSettings = openSettings;
window.openSettings = function() {
    if (originalOpenSettings) {
        originalOpenSettings();
    }
    loadCustomMcpServers();
    loadSkills();
    loadCodeRepos();
};

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === settingsModal) {
        closeSettings();
    }
});

// ==================== Conversation History Functions ====================

/**
 * Load all conversations from backend
 */
function loadConversations() {
    ipcRenderer.send('get-conversations');
}

/**
 * Render the conversation list in the sidebar
 */
function renderConversationList(grouped, activeId) {
    const container = document.getElementById('conversationsContainer');
    container.innerHTML = '';

    // Check if there are any conversations
    const hasConversations = grouped.today.length + grouped.yesterday.length +
                             grouped.lastWeek.length + grouped.older.length > 0;

    if (!hasConversations) {
        container.innerHTML = `
            <div class="conversations-empty">
                <p>💬</p>
                <p>No conversations yet</p>
                <p>Start a new chat to begin!</p>
            </div>
        `;
        return;
    }

    // Render each group
    const groups = [
        { title: 'Today', conversations: grouped.today },
        { title: 'Yesterday', conversations: grouped.yesterday },
        { title: 'Last 7 Days', conversations: grouped.lastWeek },
        { title: 'Older', conversations: grouped.older }
    ];

    for (const group of groups) {
        if (group.conversations.length > 0) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'conversation-group';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'conversation-group-title';
            titleDiv.textContent = group.title;
            groupDiv.appendChild(titleDiv);

            for (const conv of group.conversations) {
                const convItem = document.createElement('div');
                convItem.className = 'conversation-item';
                if (conv.id === activeId) {
                    convItem.classList.add('active');
                }
                convItem.onclick = () => selectConversation(conv.id);

                const titleDiv = document.createElement('div');
                titleDiv.className = 'conversation-title';
                titleDiv.textContent = conv.title;

                const metaDiv = document.createElement('div');
                metaDiv.className = 'conversation-meta';

                const timeDiv = document.createElement('div');
                timeDiv.className = 'conversation-time';
                timeDiv.textContent = formatRelativeTime(conv.updatedAt);

                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'conversation-delete';
                deleteBtn.textContent = '🗑';
                deleteBtn.onclick = (e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                };

                metaDiv.appendChild(timeDiv);
                metaDiv.appendChild(deleteBtn);

                convItem.appendChild(titleDiv);
                convItem.appendChild(metaDiv);
                groupDiv.appendChild(convItem);
            }

            container.appendChild(groupDiv);
        }
    }
}

/**
 * Start a new conversation
 */
/**
 * Toggle conversation sidebar visibility
 */
function toggleConversationSidebar() {
    const sidebar = document.getElementById('conversationSidebar');
    const isCollapsed = sidebar.classList.toggle('collapsed');

    // Save state to localStorage
    localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');

    console.log('[Sidebar] Toggled:', isCollapsed ? 'collapsed' : 'expanded');
}

/**
 * Restore sidebar state from localStorage
 */
function restoreSidebarState() {
    const sidebar = document.getElementById('conversationSidebar');
    const savedState = localStorage.getItem('sidebarCollapsed');

    if (savedState === 'true') {
        sidebar.classList.add('collapsed');
        console.log('[Sidebar] Restored state: collapsed');
    }
}

function startNewConversation() {
    ipcRenderer.send('new-conversation');
}

/**
 * Select and load a conversation
 */
function selectConversation(conversationId) {
    ipcRenderer.send('load-conversation', { id: conversationId });
}

/**
 * Delete a conversation
 */
function deleteConversation(conversationId) {
    if (confirm('Delete this conversation?')) {
        ipcRenderer.send('delete-conversation', { id: conversationId });
    }
}

/**
 * Load conversation messages into the chat area
 */
function loadConversationMessages(conversation) {
    clearChatArea();

    if (!conversation || conversation.messages.length === 0) {
        return;
    }

    // Render each message
    for (const message of conversation.messages) {
        addMessage(message.content, message.role);
    }
}

/**
 * Clear the chat area
 */
function clearChatArea() {
    const chatContainer = document.getElementById('chatContainer');
    chatContainer.innerHTML = '';
}

/**
 * Format timestamp as relative time
 */
function formatRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) {
        return 'Just now';
    } else if (minutes < 60) {
        return `${minutes}m ago`;
    } else if (hours < 24) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days < 7) {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else {
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}
