const Anthropic = require('@anthropic-ai/sdk');
const JiraClient = require('./jira-client');
const ConfluenceClient = require('./confluence-client');

class ChatBot {
    constructor(config) {
        if (!config.ANTHROPIC_API_KEY) {
            throw new Error('Anthropic API key is required');
        }

        this.anthropic = new Anthropic({
            apiKey: config.ANTHROPIC_API_KEY
        });

        this.jiraClient = config.JIRA_URL ? new JiraClient(config) : null;
        this.confluenceClient = config.CONFLUENCE_URL ? new ConfluenceClient(config) : null;

        this.conversationHistory = [];
    }

    async processMessage(userMessage) {
        try {
            // Detect intent from user message
            const intent = this.detectIntent(userMessage);

            let context = '';

            // Fetch relevant data based on intent
            if (intent.type === 'jira' && this.jiraClient) {
                context = await this.fetchJiraContext(intent);
            } else if (intent.type === 'confluence' && this.confluenceClient) {
                context = await this.fetchConfluenceContext(intent, userMessage);
            }

            // Generate response using Claude
            const response = await this.generateResponse(userMessage, context, intent);

            return response;
        } catch (error) {
            console.error('ChatBot error:', error);
            throw error;
        }
    }

    detectIntent(message) {
        const lowerMessage = message.toLowerCase();

        // Jira-related keywords
        if (lowerMessage.match(/\b(sprint|task|issue|ticket|jira|work|assigned|priority)\b/)) {
            if (lowerMessage.match(/\b(sprint|current sprint|my sprint)\b/)) {
                return { type: 'jira', subtype: 'sprint' };
            }
            return { type: 'jira', subtype: 'all' };
        }

        // Confluence-related keywords
        if (lowerMessage.match(/\b(confluence|page|document|wiki|search|documentation|doc)\b/)) {
            if (lowerMessage.match(/\b(search|find|look for)\b/)) {
                return { type: 'confluence', subtype: 'search' };
            }
            if (lowerMessage.match(/\b(recent|latest|updated)\b/)) {
                return { type: 'confluence', subtype: 'recent' };
            }
            return { type: 'confluence', subtype: 'search' };
        }

        // Default to general conversation
        return { type: 'general', subtype: null };
    }

    async fetchJiraContext(intent) {
        try {
            let issues;

            if (intent.subtype === 'sprint') {
                issues = await this.jiraClient.getSprintIssues();
            } else {
                issues = await this.jiraClient.getMyIssues();
            }

            return this.jiraClient.formatIssues(issues);
        } catch (error) {
            console.error('Error fetching Jira context:', error);
            return 'Unable to fetch Jira issues at this time.';
        }
    }

    async fetchConfluenceContext(intent, message) {
        try {
            let pages;

            if (intent.subtype === 'recent') {
                pages = await this.confluenceClient.getRecentPages();
            } else {
                // Extract search query from message
                const searchTerms = this.extractSearchTerms(message);
                pages = await this.confluenceClient.searchPages(searchTerms);
            }

            return this.confluenceClient.formatPages(pages);
        } catch (error) {
            console.error('Error fetching Confluence context:', error);
            return 'Unable to fetch Confluence pages at this time.';
        }
    }

    extractSearchTerms(message) {
        // Remove common words and extract meaningful search terms
        const commonWords = ['search', 'find', 'look', 'for', 'confluence', 'page', 'document', 'show', 'me', 'get'];
        const words = message.toLowerCase().split(/\s+/).filter(word =>
            word.length > 2 && !commonWords.includes(word)
        );

        return words.join(' ') || message;
    }

    async generateResponse(userMessage, context, intent) {
        let systemPrompt = `You are an AI assistant helping with Jira and Confluence. You have access to the user's work information and can help them find tasks, documentation, and answer questions about their work.`;

        if (context) {
            systemPrompt += `\n\nHere is the relevant information:\n\n${context}`;
        }

        const messages = [
            ...this.conversationHistory,
            {
                role: 'user',
                content: userMessage
            }
        ];

        const response = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 32768, // Very high limit for comprehensive documents (Claude supports up to 64k)
            system: systemPrompt,
            messages: messages
        });

        // Log response metadata for debugging truncation issues
        console.log('[Claude API] Stop reason:', response.stop_reason);
        console.log('[Claude API] Usage - Input:', response.usage.input_tokens, 'Output:', response.usage.output_tokens);
        if (response.stop_reason === 'max_tokens') {
            console.warn('[Claude API] WARNING: Response was truncated due to max_tokens limit!');
        }

        const assistantMessage = response.content[0].text;

        // Update conversation history (keep last 10 messages)
        this.conversationHistory.push({
            role: 'user',
            content: userMessage
        });
        this.conversationHistory.push({
            role: 'assistant',
            content: assistantMessage
        });

        if (this.conversationHistory.length > 20) {
            this.conversationHistory = this.conversationHistory.slice(-20);
        }

        return assistantMessage;
    }

    clearHistory() {
        this.conversationHistory = [];
    }
}

module.exports = ChatBot;
