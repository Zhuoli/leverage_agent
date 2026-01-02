/**
 * Persistent Agent Wrapper
 *
 * Wraps the TypeScript Agent SDK for use in Electron's main process.
 * Maintains a single agent instance that persists across multiple messages,
 * avoiding the overhead of spawning new processes and reinitializing for each query.
 */

const path = require('path');
const fs = require('fs');
const { app } = require('electron');

class PersistentAgent {
    constructor(config, conversationManager) {
        this.config = config;
        this.conversationManager = conversationManager;
        this.agent = null;
        this.agentSDK = null;
        this.initialized = false;
        this.initializing = false;
    }

    /**
     * Load code repositories configuration
     */
    loadCodeRepositories() {
        try {
            const codeReposPath = path.join(app.getPath('userData'), 'code-repos.json');
            if (fs.existsSync(codeReposPath)) {
                const data = fs.readFileSync(codeReposPath, 'utf8');
                const repos = JSON.parse(data);
                const codeRepoPaths = repos.map(repo => repo.path).join(':');
                console.log('Loaded code repositories:', codeRepoPaths);
                return codeRepoPaths;
            }
        } catch (error) {
            console.error('Error loading code repositories:', error);
        }
        return '';
    }

    /**
     * Initialize the agent SDK (once)
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        if (this.initializing) {
            // Wait for ongoing initialization
            while (this.initializing) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            return;
        }

        this.initializing = true;

        try {
            console.log('Initializing persistent agent...');

            // Load code repositories and set environment variable
            const codeRepoPaths = this.loadCodeRepositories();
            if (codeRepoPaths) {
                process.env.CODE_REPO_PATHS = codeRepoPaths;
            }

            // Determine the backend-dist path
            let backendDistPath;
            if (app.isPackaged) {
                backendDistPath = path.join(app.getAppPath(), 'backend-dist');
            } else {
                backendDistPath = path.join(__dirname, '..', '..', 'backend-dist');
            }

            // Dynamically import the ESM agent SDK
            const agentSDKPath = path.join(backendDistPath, 'agent', 'index.js');
            const agentModule = await import(`file://${agentSDKPath}`);
            this.agentSDK = agentModule.AtlassianAgentSDK;

            // Build config for agent
            const agentConfig = this.buildAgentConfig();

            // Create agent instance
            this.agent = new this.agentSDK(agentConfig);

            // Initialize agent (loads skills, starts MCP servers, etc.)
            await this.agent.initialize();

            this.initialized = true;
            this.initializing = false;
            console.log('Persistent agent initialized successfully');
        } catch (error) {
            this.initializing = false;
            console.error('Failed to initialize persistent agent:', error);
            throw error;
        }
    }

    /**
     * Build agent configuration from Electron config
     */
    buildAgentConfig() {
        const provider = this.config.MODEL_PROVIDER || 'oci-openai';

        return {
            modelProvider: provider,
            modelName: this.config.MODEL_NAME || '',
            anthropicApiKey: this.config.ANTHROPIC_API_KEY || '',
            openaiApiKey: this.config.OPENAI_API_KEY || '',
            ociCompartmentId: this.config.OCI_COMPARTMENT_ID || '',
            ociEndpoint: this.config.OCI_ENDPOINT || '',
            ociConfigPath: this.config.OCI_CONFIG_PATH || '',
            ociProfile: this.config.OCI_PROFILE || '',
            jiraUrl: this.config.JIRA_URL || '',
            jiraUsername: this.config.JIRA_USERNAME || '',
            jiraApiToken: this.config.JIRA_API_TOKEN || '',
            confluenceUrl: this.config.CONFLUENCE_URL || '',
            confluenceUsername: this.config.CONFLUENCE_USERNAME || '',
            confluenceApiToken: this.config.CONFLUENCE_API_TOKEN || '',
            confluenceSpaceKey: this.config.CONFLUENCE_SPACE_KEY || '',
            userEmail: this.config.USER_EMAIL || '',
            userDisplayName: this.config.USER_DISPLAY_NAME || '',
            // MCP configuration
            atlassianMcpEnabled: this.config.ATLASSIAN_MCP_ENABLED === 'true',
            ociMcpEnabled: this.config.OCI_MCP_ENABLED === 'true',
            ociMcpRegion: this.config.OCI_MCP_REGION || '',
            ociMcpCompartmentId: this.config.OCI_MCP_COMPARTMENT_ID || '',
            ociMcpTenancyId: this.config.OCI_MCP_TENANCY_ID || '',
            ociMcpConfigPath: this.config.OCI_MCP_CONFIG_PATH || '',
            ociMcpProfile: this.config.OCI_MCP_PROFILE || ''
        };
    }

    /**
     * Send a message to the agent
     *
     * @param {string} message - User's message
     * @param {Function} onProgress - Optional callback for progress updates
     * @returns {Promise<string>} - Agent's response
     */
    async sendMessage(message, onProgress) {
        // Set up log interceptor
        const originalConsoleError = console.error;
        if (onProgress) {
            console.error = (...args) => {
                const logLine = args.join(' ');

                // Parse structured logs
                if (logLine.includes('[AGENT_LOG]')) {
                    try {
                        const jsonMatch = logLine.match(/\[AGENT_LOG\] (.+)/);
                        if (jsonMatch) {
                            const logData = JSON.parse(jsonMatch[1]);
                            onProgress({
                                type: 'structured_log',
                                data: logData
                            });
                        }
                    } catch (e) {
                        // Not JSON, send as raw log
                        onProgress({
                            type: 'raw_log',
                            message: logLine
                        });
                    }
                } else {
                    // Send raw log
                    onProgress({
                        type: 'raw_log',
                        message: logLine
                    });
                }

                // Still call original console.error for file logging
                originalConsoleError.apply(console, args);
            };
        }

        try {
            // Ensure agent is initialized
            await this.initialize();

            // Get conversation history BEFORE adding new message
            const conversation = this.conversationManager.getActiveConversation();
            const historyMessages = conversation ? conversation.messages : [];

            // Convert history to agent SDK format
            const agentHistory = historyMessages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp)
            }));

            // Load history into agent (clears previous conversation)
            this.agent.setHistory(agentHistory);

            // Send message to agent
            const response = await this.agent.chat(message);

            // Save messages to conversation manager
            await this.conversationManager.addMessage('user', message);
            await this.conversationManager.addMessage('assistant', response);

            return response;
        } catch (error) {
            console.error('Error in persistent agent sendMessage:', error);
            throw error;
        } finally {
            // Restore original console.error
            if (onProgress) {
                console.error = originalConsoleError;
            }
        }
    }

    /**
     * Get current conversation
     */
    getCurrentConversation() {
        const conversation = this.conversationManager.getActiveConversation();
        return conversation ? conversation.messages : [];
    }

    /**
     * Get all conversations
     */
    getAllConversations() {
        return this.conversationManager.getAllConversations();
    }

    /**
     * Create a new conversation
     */
    async createNewConversation() {
        const conversation = await this.conversationManager.createConversation();

        // Clear agent history for new conversation
        if (this.agent) {
            this.agent.clearHistory();
        }

        return conversation;
    }

    /**
     * Load a specific conversation
     */
    async loadConversation(conversationId) {
        await this.conversationManager.setActiveConversation(conversationId);
        const conversation = this.conversationManager.getActiveConversation();

        // Load conversation history into agent
        if (this.agent && conversation) {
            const agentHistory = conversation.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.timestamp)
            }));
            this.agent.setHistory(agentHistory);
        }

        return conversation;
    }

    /**
     * Delete a conversation
     */
    async deleteConversation(conversationId) {
        await this.conversationManager.deleteConversation(conversationId);

        // Clear agent history if we deleted the active conversation
        const activeConversation = this.conversationManager.getActiveConversation();
        if (this.agent && !activeConversation) {
            this.agent.clearHistory();
        }
    }

    /**
     * Cleanup agent resources
     */
    async cleanup() {
        if (this.agent) {
            await this.agent.cleanup();
            this.agent = null;
            this.initialized = false;
        }
    }
}

module.exports = PersistentAgent;
