/**
 * Agent Client for Electron App
 *
 * This client uses the TypeScript Agent SDK which provides
 * MCP server and Skills for Jira/Confluence access.
 */

const path = require('path');

// Import the TypeScript agent SDK
// Note: We require the compiled JavaScript from dist/
let AtlassianAgentSDK;
let loadConfig;

try {
    // Load the TypeScript compiled code
    const agentModule = require(path.join(__dirname, '..', '..', '..', 'dist', 'cli', 'index.js'));

    // For ES modules, we need to handle the import differently
    // Since our TypeScript compiles to ESM, we'll use a dynamic import approach
    console.log('Loading TypeScript agent...');
} catch (error) {
    console.error('Error loading TypeScript agent:', error);
}

class AgentClient {
    constructor(config) {
        // Validate API key based on provider
        const provider = config.MODEL_PROVIDER || 'claude';
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
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        try {
            // Dynamic import of ES modules from Node.js CommonJS
            const agentPath = path.join(__dirname, '..', '..', '..', 'src', 'agent', 'agent-sdk.js');
            const configPath = path.join(__dirname, '..', '..', '..', 'src', 'config', 'index.js');

            // Use dynamic import() for ESM modules
            const { AtlassianAgentSDK } = await import('file://' + path.join(__dirname, '..', '..', '..', 'dist', 'cli', 'index.js').replace(/\\/g, '/'));

            // Create config object in the format expected by TypeScript agent
            const agentConfig = {
                modelProvider: this.config.MODEL_PROVIDER || 'claude',
                modelName: this.config.MODEL_NAME || undefined,
                anthropicApiKey: this.config.ANTHROPIC_API_KEY || '',
                openaiApiKey: this.config.OPENAI_API_KEY || '',
                ociCompartmentId: this.config.OCI_COMPARTMENT_ID || '',
                ociEndpoint: this.config.OCI_ENDPOINT || '',
                ociConfigPath: this.config.OCI_CONFIG_PATH || undefined,
                ociProfile: this.config.OCI_PROFILE || undefined,
                jiraUrl: this.config.JIRA_URL,
                jiraUsername: this.config.JIRA_USERNAME,
                jiraApiToken: this.config.JIRA_API_TOKEN,
                confluenceUrl: this.config.CONFLUENCE_URL,
                confluenceUsername: this.config.CONFLUENCE_USERNAME,
                confluenceApiToken: this.config.CONFLUENCE_API_TOKEN,
                confluenceSpaceKey: this.config.CONFLUENCE_SPACE_KEY || '',
                userDisplayName: this.config.USER_DISPLAY_NAME || '',
                userEmail: this.config.USER_EMAIL || '',
            };

            // For now, use a simpler approach: spawn Node.js with the CLI
            // This avoids ESM/CommonJS compatibility issues
            console.log('Agent will be initialized on first message');
            this.initialized = true;
        } catch (error) {
            console.error('Error initializing agent:', error);
            throw error;
        }
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
        const { spawn } = require('child_process');
        const path = require('path');

        return new Promise((resolve, reject) => {
            const projectRoot = path.join(__dirname, '..', '..');
            const cliPath = path.join(projectRoot, 'backend-dist', 'cli', 'index.js');

            // Command: node dist/cli/index.js chat --message "user message"
            const args = [
                cliPath,
                'chat',
                '--message',
                message
            ];

            console.log('Calling TypeScript agent:', 'node', args.join(' '));

            const process = spawn('node', args, {
                cwd: projectRoot,
                env: {
                    ...process.env,
                    // Pass through configuration from Electron's .env
                    MODEL_PROVIDER: this.config.MODEL_PROVIDER || 'claude',
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
                    USER_DISPLAY_NAME: this.config.USER_DISPLAY_NAME
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
