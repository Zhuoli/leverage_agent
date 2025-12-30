/**
 * Agent Client for Electron App
 *
 * This client communicates with the Python Agent SDK (via CLI)
 * which uses MCP server and Skills for Jira/Confluence access.
 *
 * This replaces the previous chatbot.js, jira-client.js, and confluence-client.js
 * with a simpler architecture that delegates to the Python agent.
 */

const { spawn } = require('child_process');
const path = require('path');

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

        this.config = config;
        this.conversationHistory = [];

        // Path to Python agent
        this.projectRoot = path.join(__dirname, '..', '..', '..');
        this.pythonPath = path.join(this.projectRoot, 'venv', 'bin', 'python');
        this.agentPath = path.join(this.projectRoot, 'src');

        console.log('AgentClient initialized');
        console.log('  - Provider:', provider);
        console.log('  - Project root:', this.projectRoot);
        console.log('  - Python path:', this.pythonPath);
    }

    /**
     * Send a message to the Python Agent SDK
     *
     * @param {string} message - User's message
     * @returns {Promise<string>} - Agent's response
     */
    async sendMessage(message) {
        try {
            // Use Python agent with SDK mode
            const response = await this.callPythonAgent(message);

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
     * Call Python agent via subprocess
     *
     * @param {string} message - User's message
     * @returns {Promise<string>} - Agent's response
     */
    async callPythonAgent(message) {
        return new Promise((resolve, reject) => {
            // Command: python -m src.main chat --message "user message"
            const args = [
                '-m',
                'src.main',
                'chat',
                '--message',
                message
            ];

            console.log('Calling Python agent:', this.pythonPath, args.join(' '));

            const process = spawn(this.pythonPath, args, {
                cwd: this.projectRoot,
                env: {
                    ...process.env,
                    // Pass through configuration from Electron's .env
                    // Model provider settings
                    MODEL_PROVIDER: this.config.MODEL_PROVIDER || 'claude',
                    MODEL_NAME: this.config.MODEL_NAME || '',
                    ANTHROPIC_API_KEY: this.config.ANTHROPIC_API_KEY || '',
                    OPENAI_API_KEY: this.config.OPENAI_API_KEY || '',
                    // Jira settings
                    JIRA_URL: this.config.JIRA_URL,
                    JIRA_USERNAME: this.config.JIRA_USERNAME,
                    JIRA_API_TOKEN: this.config.JIRA_API_TOKEN,
                    // Confluence settings
                    CONFLUENCE_URL: this.config.CONFLUENCE_URL,
                    CONFLUENCE_USERNAME: this.config.CONFLUENCE_USERNAME,
                    CONFLUENCE_API_TOKEN: this.config.CONFLUENCE_API_TOKEN,
                    CONFLUENCE_SPACE_KEY: this.config.CONFLUENCE_SPACE_KEY,
                    // User settings
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
                    console.error('Python agent error:', stderr);
                    reject(new Error(`Agent exited with code ${code}: ${stderr}`));
                } else {
                    // Clean up the output (remove extra whitespace/newlines)
                    const cleanedOutput = stdout.trim();
                    resolve(cleanedOutput);
                }
            });

            process.on('error', (error) => {
                console.error('Failed to start Python agent:', error);
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
