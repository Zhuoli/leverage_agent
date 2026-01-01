/**
 * Agent Client for Electron App
 *
 * This client uses the TypeScript Agent SDK which provides
 * MCP server and Skills for Jira/Confluence access.
 */

const path = require('path');

// Note: We don't import the TypeScript agent directly to avoid ESM/CommonJS conflicts.
// Instead, we spawn it as a separate Node.js process (see callNodeAgent method).

class AgentClient {
    constructor(config) {
        // Validate API key based on provider
        const provider = config.MODEL_PROVIDER || 'oci-openai';
        if (provider === 'claude' && !config.ANTHROPIC_API_KEY) {
            throw new Error('Anthropic API key is required for Claude provider');
        }
        if (provider === 'openai' && !config.OPENAI_API_KEY) {
            throw new Error('OpenAI API key is required for OpenAI provider');
        }
        if (provider === 'oci-openai' && (!config.OCI_COMPARTMENT_ID || !config.OCI_ENDPOINT)) {
            throw new Error('OCI Compartment ID and Endpoint are required for OCI OpenAI provider');
        }

        this.config = config;
        this.conversationHistory = [];
        this.agent = null;
        this.initialized = false;

        console.log('AgentClient initialized');
        console.log('  - Provider:', provider);
    }

    /**
     * Initialize the TypeScript agent
     *
     * Note: The agent runs as a separate Node.js process via callNodeAgent(),
     * so no direct initialization is needed.
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        // Agent is spawned as a separate process, no direct initialization needed
        console.log('Agent will be initialized on first message via spawned process');
        this.initialized = true;
    }

    /**
     * Send a message to the TypeScript Agent SDK
     *
     * @param {string} message - User's message
     * @returns {Promise<string>} - Agent's response
     */
    async sendMessage(message) {
        try {
            const response = await this.callNodeAgent(message);

            // Track conversation history
            this.conversationHistory.push({
                role: 'user',
                content: message
            });
            this.conversationHistory.push({
                role: 'assistant',
                content: response
            });

            // Keep last 20 messages
            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            return response;
        } catch (error) {
            console.error('Error sending message to agent:', error);
            throw error;
        }
    }

    /**
     * Call Node.js TypeScript agent via CLI
     *
     * @param {string} message - User's message
     * @returns {Promise<string>} - Agent's response
     */
    async callNodeAgent(message) {
        const { spawn, execSync } = require('child_process');
        const path = require('path');
        const { app } = require('electron');
        const fs = require('fs');

        return new Promise((resolve, reject) => {
            // Determine correct paths for packaged vs dev mode
            let projectRoot;
            if (app.isPackaged) {
                // Packaged mode (no ASAR)
                projectRoot = app.getAppPath();
            } else {
                // Dev mode
                projectRoot = path.join(__dirname, '..', '..');
            }
            const cliPath = path.join(projectRoot, 'backend-dist', 'cli', 'index.js');

            // Find Node.js executable (same logic as main.js)
            let nodePath = 'node';

            // Try common macOS locations
            const commonPaths = [
                '/usr/local/bin/node',
                '/opt/homebrew/bin/node',
                '/usr/bin/node'
            ];

            for (const p of commonPaths) {
                if (fs.existsSync(p)) {
                    nodePath = p;
                    break;
                }
            }

            // Try 'which' as fallback
            if (nodePath === 'node') {
                try {
                    nodePath = execSync('which node', { encoding: 'utf8' }).trim();
                } catch (e) {
                    // Use 'node' and hope for the best
                }
            }

            // Command: node dist/cli/index.js chat --message "user message"
            const args = [
                cliPath,
                'chat',
                '--message',
                message
            ];

            console.log('Calling TypeScript agent:', nodePath, args.join(' '));

            const process = spawn(nodePath, args, {
                cwd: projectRoot,
                env: {
                    ...process.env,
                    // Pass through configuration from Electron's .env
                    MODEL_PROVIDER: this.config.MODEL_PROVIDER || 'oci-openai',
                    MODEL_NAME: this.config.MODEL_NAME || '',
                    ANTHROPIC_API_KEY: this.config.ANTHROPIC_API_KEY || '',
                    OPENAI_API_KEY: this.config.OPENAI_API_KEY || '',
                    OCI_COMPARTMENT_ID: this.config.OCI_COMPARTMENT_ID || '',
                    OCI_ENDPOINT: this.config.OCI_ENDPOINT || '',
                    OCI_CONFIG_PATH: this.config.OCI_CONFIG_PATH || '',
                    OCI_PROFILE: this.config.OCI_PROFILE || '',
                    JIRA_URL: this.config.JIRA_URL,
                    JIRA_USERNAME: this.config.JIRA_USERNAME,
                    JIRA_API_TOKEN: this.config.JIRA_API_TOKEN,
                    CONFLUENCE_URL: this.config.CONFLUENCE_URL,
                    CONFLUENCE_USERNAME: this.config.CONFLUENCE_USERNAME,
                    CONFLUENCE_API_TOKEN: this.config.CONFLUENCE_API_TOKEN,
                    CONFLUENCE_SPACE_KEY: this.config.CONFLUENCE_SPACE_KEY,
                    USER_EMAIL: this.config.USER_EMAIL,
                    USER_DISPLAY_NAME: this.config.USER_DISPLAY_NAME,
                    // OCI MCP settings
                    OCI_MCP_ENABLED: this.config.OCI_MCP_ENABLED || 'false',
                    OCI_MCP_REGION: this.config.OCI_MCP_REGION || '',
                    OCI_MCP_COMPARTMENT_ID: this.config.OCI_MCP_COMPARTMENT_ID || '',
                    OCI_MCP_TENANCY_ID: this.config.OCI_MCP_TENANCY_ID || '',
                    OCI_MCP_CONFIG_PATH: this.config.OCI_MCP_CONFIG_PATH || '',
                    OCI_MCP_PROFILE: this.config.OCI_MCP_PROFILE || ''
                }
            });

            let stdout = '';
            let stderr = '';

            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });

            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });

            process.on('close', (code) => {
                if (code !== 0) {
                    console.error('TypeScript agent error:', stderr);
                    reject(new Error(`Agent exited with code ${code}: ${stderr}`));
                } else {
                    // Extract just the assistant response (remove "User:" and "Assistant:" labels)
                    let cleanedOutput = stdout.trim();

                    // Remove CLI formatting if present
                    const assistantMatch = cleanedOutput.match(/Assistant:\s*(.+)/s);
                    if (assistantMatch) {
                        cleanedOutput = assistantMatch[1].trim();
                    }

                    resolve(cleanedOutput);
                }
            });

            process.on('error', (error) => {
                console.error('Failed to start TypeScript agent:', error);
                reject(error);
            });
        });
    }

    /**
     * Quick action: Get my sprint tasks
     *
     * @returns {Promise<string>} - Sprint tasks
     */
    async getMySprintTasks() {
        return this.sendMessage('Show me my current sprint tasks');
    }

    /**
     * Quick action: Search Confluence
     *
     * @param {string} query - Search query
     * @returns {Promise<string>} - Search results
     */
    async searchConfluence(query) {
        return this.sendMessage(`Search Confluence for: ${query}`);
    }

    /**
     * Quick action: Get high priority tasks
     *
     * @returns {Promise<string>} - High priority tasks
     */
    async getHighPriorityTasks() {
        return this.sendMessage('Show me my high priority tasks');
    }

    /**
     * Quick action: Get recent Confluence updates
     *
     * @returns {Promise<string>} - Recent pages
     */
    async getRecentConfluencePages() {
        return this.sendMessage('Show me recent Confluence pages');
    }

    /**
     * Quick action: Analyze workload
     *
     * @returns {Promise<string>} - Workload analysis
     */
    async analyzeWorkload() {
        return this.sendMessage('Analyze my current workload and suggest priorities');
    }

    /**
     * Clear conversation history
     */
    clearHistory() {
        this.conversationHistory = [];
    }

    /**
     * Get conversation history
     *
     * @returns {Array} - Conversation history
     */
    getHistory() {
        return this.conversationHistory;
    }
}

module.exports = AgentClient;
