/**
 * Application Entry Point
 * Bootstraps and orchestrates all modules
 */

import { MarkdownRenderer } from './modules/markdown/MarkdownRenderer';
import { ChatManager } from './modules/chat/ChatManager';
import { ConversationManager } from './modules/conversations/ConversationManager';
import { SettingsModal } from './modules/settings/SettingsModal';
import { AIProviderSettings } from './modules/settings/AIProviderSettings';
import { MCPServerManager } from './modules/settings/MCPServerManager';
import { SkillsManager } from './modules/settings/SkillsManager';
import { CodeRepoManager } from './modules/settings/CodeRepoManager';

class Application {
    private chatManager?: ChatManager;
    private conversationManager?: ConversationManager;
    private settingsModal?: SettingsModal;
    private aiProviderSettings?: AIProviderSettings;
    private mcpServerManager?: MCPServerManager;
    private skillsManager?: SkillsManager;
    private codeRepoManager?: CodeRepoManager;

    constructor() {
        // Initialization will happen in initialize()
    }

    /**
     * Initialize the application
     */
    async initialize(): Promise<void> {
        console.log('[App] Initializing...');

        // Initialize markdown rendering
        MarkdownRenderer.initialize();

        // Set up UI modules
        this.setupChat();
        this.setupConversations();
        this.setupSettings();
        this.setupSidebar();

        console.log('[App] Initialized successfully');
    }

    /**
     * Set up chat functionality
     */
    private setupChat(): void {
        const messageInput = document.getElementById('messageInput') as HTMLTextAreaElement;
        const sendButton = document.getElementById('sendButton') as HTMLButtonElement;
        const chatContainer = document.getElementById('chatContainer') as HTMLElement;
        const statusIndicator = document.getElementById('statusIndicator') as HTMLElement;
        const statusText = document.getElementById('statusText') as HTMLElement;

        if (!messageInput || !sendButton || !chatContainer || !statusIndicator || !statusText) {
            console.error('[App] Missing chat elements');
            return;
        }

        this.chatManager = new ChatManager(messageInput, sendButton, chatContainer, statusIndicator, statusText);
        this.chatManager.initialize();

        // Expose to window for HTML onclick
        window.clearChat = () => this.chatManager?.clear();
        window.sendMessage = () => this.chatManager?.sendMessage();
    }

    /**
     * Set up conversation management
     */
    private setupConversations(): void {
        const chatContainer = document.getElementById('chatContainer') as HTMLElement;
        const conversationsContainer = document.getElementById('conversationsContainer') as HTMLElement;

        if (!chatContainer || !conversationsContainer) {
            console.error('[App] Missing conversation elements');
            return;
        }

        this.conversationManager = new ConversationManager(chatContainer, conversationsContainer);
        this.conversationManager.initialize();

        // Expose to window for HTML onclick
        window.startNewConversation = () => this.conversationManager?.startNew();
    }

    /**
     * Set up settings modal
     */
    private setupSettings(): void {
        this.settingsModal = new SettingsModal('settingsModal');

        // Initialize settings modules
        this.aiProviderSettings = new AIProviderSettings();
        this.mcpServerManager = new MCPServerManager();
        this.skillsManager = new SkillsManager();
        this.codeRepoManager = new CodeRepoManager();

        // Initialize when modal is opened (wait for DOM)
        const originalOpen = this.settingsModal.open.bind(this.settingsModal);
        this.settingsModal.open = () => {
            originalOpen();
            // Give DOM time to load
            setTimeout(() => {
                this.aiProviderSettings?.initialize();
                this.mcpServerManager?.initialize();
                this.skillsManager?.initialize();
                this.codeRepoManager?.initialize();
            }, 200);
        };

        // Expose to window for HTML onclick
        window.openSettings = () => this.settingsModal?.open();
        window.closeSettings = () => this.settingsModal?.close();
        window.showSettingsView = (viewId: string) => this.settingsModal?.showView(viewId);
        window.backToMainSettings = () => this.settingsModal?.back();
    }

    /**
     * Set up sidebar functionality
     */
    private setupSidebar(): void {
        const sidebar = document.getElementById('sidebar') as HTMLElement;

        if (!sidebar) {
            console.error('[App] Missing sidebar element');
            return;
        }

        // Restore sidebar state from localStorage
        const savedState = localStorage.getItem('sidebarCollapsed');
        if (savedState === 'true') {
            sidebar.classList.add('collapsed');
            console.log('[App] Restored sidebar state: collapsed');
        }

        // Toggle sidebar function
        const toggleSidebar = () => {
            const isCollapsed = sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', isCollapsed ? 'true' : 'false');
            console.log('[App] Sidebar toggled:', isCollapsed ? 'collapsed' : 'expanded');
        };

        // Expose to window for HTML onclick
        window.toggleSidebar = toggleSidebar;
    }
}

// Declare global window functions
declare global {
    interface Window {
        clearChat: () => void;
        sendMessage: () => void;
        startNewConversation: () => void;
        toggleSidebar: () => void;
        openSettings: () => void;
        closeSettings: () => void;
        showSettingsView: (viewId: string) => void;
        backToMainSettings: () => void;
    }
}

// Bootstrap application when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new Application();
    await app.initialize();
});
