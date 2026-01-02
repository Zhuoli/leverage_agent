/**
 * Centralized IPC Service for communication with main process
 * Provides type-safe wrappers around ipcRenderer
 */

import { ipcRenderer, IpcRendererEvent } from 'electron';

export interface ChatMessage {
    message: string;
}

export interface ChatResponse {
    message: string;
}

export interface ChatError {
    message: string;
}

export interface ProgressData {
    type: 'structured_log' | 'raw_log';
    data?: any;
    message?: string;
}

export interface ConfigStatus {
    configured: boolean;
}

export interface Conversation {
    id: string;
    title: string;
    messages: Array<{ role: string; content: string; timestamp: number }>;
    createdAt: number;
    updatedAt: number;
}

export interface ConversationsData {
    conversations: Conversation[];
    grouped: {
        today: Conversation[];
        yesterday: Conversation[];
        lastWeek: Conversation[];
        older: Conversation[];
    };
    activeId: string | null;
}

export class IPCService {
    /**
     * Send a chat message to the agent
     */
    static sendChatMessage(message: string): void {
        ipcRenderer.send('chat-message', { message });
    }

    /**
     * Listen for chat responses
     */
    static onChatResponse(callback: (response: ChatResponse) => void): () => void {
        const listener = (_event: IpcRendererEvent, response: ChatResponse) => callback(response);
        ipcRenderer.on('chat-response', listener);
        return () => ipcRenderer.removeListener('chat-response', listener);
    }

    /**
     * Listen for chat errors
     */
    static onChatError(callback: (error: ChatError) => void): () => void {
        const listener = (_event: IpcRendererEvent, error: ChatError) => callback(error);
        ipcRenderer.on('chat-error', listener);
        return () => ipcRenderer.removeListener('chat-error', listener);
    }

    /**
     * Listen for chat progress updates
     */
    static onChatProgress(callback: (data: ProgressData) => void): () => void {
        const listener = (_event: IpcRendererEvent, data: ProgressData) => callback(data);
        ipcRenderer.on('chat-progress', listener);
        return () => ipcRenderer.removeListener('chat-progress', listener);
    }

    /**
     * Check configuration status
     */
    static checkConfig(): void {
        ipcRenderer.send('check-config');
    }

    /**
     * Listen for config status updates
     */
    static onConfigStatus(callback: (status: ConfigStatus) => void): () => void {
        const listener = (_event: IpcRendererEvent, status: ConfigStatus) => callback(status);
        ipcRenderer.on('config-status', listener);
        return () => ipcRenderer.removeListener('config-status', listener);
    }

    /**
     * Get all conversations
     */
    static getConversations(): void {
        ipcRenderer.send('get-conversations');
    }

    /**
     * Listen for conversations list
     */
    static onConversationsList(callback: (data: ConversationsData) => void): () => void {
        const listener = (_event: IpcRendererEvent, data: ConversationsData) => callback(data);
        ipcRenderer.on('conversations-list', listener);
        return () => ipcRenderer.removeListener('conversations-list', listener);
    }

    /**
     * Create a new conversation
     */
    static createConversation(): void {
        ipcRenderer.send('new-conversation');
    }

    /**
     * Load a specific conversation
     */
    static loadConversation(id: string): void {
        ipcRenderer.send('load-conversation', { id });
    }

    /**
     * Listen for conversation loaded event
     */
    static onConversationLoaded(callback: (data: { conversation: Conversation }) => void): () => void {
        const listener = (_event: IpcRendererEvent, data: { conversation: Conversation }) => callback(data);
        ipcRenderer.on('conversation-loaded', listener);
        return () => ipcRenderer.removeListener('conversation-loaded', listener);
    }

    /**
     * Delete a conversation
     */
    static deleteConversation(id: string): void {
        ipcRenderer.send('delete-conversation', { id });
    }

    /**
     * Save message to file
     */
    static saveMessageToFile(content: string, suggestedFilename: string): void {
        ipcRenderer.send('save-message-to-file', { content, suggestedFilename });
    }

    /**
     * Listen for save message result
     */
    static onSaveMessageResult(callback: (result: { success?: boolean; cancelled?: boolean; error?: string }) => void): () => void {
        const listener = (_event: IpcRendererEvent, result: any) => callback(result);
        ipcRenderer.on('save-message-result', listener);
        return () => ipcRenderer.removeListener('save-message-result', listener);
    }

    /**
     * Get settings
     */
    static getSettings(): void {
        ipcRenderer.send('get-settings');
    }

    /**
     * Save settings
     */
    static saveSettings(settings: any): void {
        ipcRenderer.send('save-settings', settings);
    }

    /**
     * Listen for settings loaded
     */
    static onSettingsLoaded(callback: (settings: any) => void): () => void {
        const listener = (_event: IpcRendererEvent, settings: any) => callback(settings);
        ipcRenderer.on('settings-loaded', listener);
        return () => ipcRenderer.removeListener('settings-loaded', listener);
    }

    /**
     * Get API key
     */
    static async getApiKey(): Promise<string> {
        return ipcRenderer.invoke('get-api-key');
    }

    /**
     * Save API key
     */
    static async saveApiKey(apiKey: string): Promise<void> {
        return ipcRenderer.invoke('save-api-key', apiKey);
    }

    /**
     * Test API key
     */
    static async testApiKey(apiKey: string): Promise<{ success: boolean; error?: string }> {
        return ipcRenderer.invoke('test-api-key', apiKey);
    }

    /**
     * Get MCP servers
     */
    static async getMCPServers(): Promise<any[]> {
        return ipcRenderer.invoke('get-mcp-servers');
    }

    /**
     * Save MCP servers
     */
    static async saveMCPServers(servers: any[]): Promise<void> {
        return ipcRenderer.invoke('save-mcp-servers', servers);
    }

    /**
     * Get skills
     */
    static async getSkills(): Promise<any[]> {
        return ipcRenderer.invoke('get-skills');
    }

    /**
     * Save skills
     */
    static async saveSkills(skills: any[]): Promise<void> {
        return ipcRenderer.invoke('save-skills', skills);
    }

    /**
     * Get code repositories
     */
    static async getCodeRepos(): Promise<any[]> {
        return ipcRenderer.invoke('get-code-repos');
    }

    /**
     * Save code repositories
     */
    static async saveCodeRepos(repos: any[]): Promise<void> {
        return ipcRenderer.invoke('save-code-repos', repos);
    }

    /**
     * Select directory
     */
    static async selectDirectory(): Promise<{ cancelled: boolean; path?: string }> {
        return ipcRenderer.invoke('select-directory');
    }

    /**
     * Open directory in file explorer
     */
    static async openDirectory(path: string): Promise<void> {
        return ipcRenderer.invoke('open-directory', path);
    }

    /**
     * Generic event listener registration
     */
    static on(channel: string, callback: (...args: any[]) => void): () => void {
        ipcRenderer.on(channel, callback);
        return () => ipcRenderer.removeListener(channel, callback);
    }

    /**
     * One-time event listener
     */
    static once(channel: string, callback: (...args: any[]) => void): void {
        ipcRenderer.once(channel, callback);
    }

    /**
     * Send generic message
     */
    static send(channel: string, ...args: any[]): void {
        ipcRenderer.send(channel, ...args);
    }
}
