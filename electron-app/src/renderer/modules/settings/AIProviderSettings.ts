/**
 * AI Provider Settings
 * Manages API key configuration for AI providers
 */

import { IPCService } from '../../services/IPCService';

export class AIProviderSettings {
    private container: HTMLElement | null;
    private apiKeyInput: HTMLInputElement | null;
    private saveButton: HTMLButtonElement | null;
    private testButton: HTMLButtonElement | null;

    constructor() {
        this.container = null;
        this.apiKeyInput = null;
        this.saveButton = null;
        this.testButton = null;
    }

    /**
     * Initialize AI provider settings UI
     */
    initialize(): void {
        this.container = document.getElementById('aiProviderView');
        if (!this.container) {
            console.error('[AIProviderSettings] Container not found');
            return;
        }

        this.apiKeyInput = this.container.querySelector('#apiKeyInput') as HTMLInputElement;
        this.saveButton = this.container.querySelector('#saveApiKey') as HTMLButtonElement;
        this.testButton = this.container.querySelector('#testApiKey') as HTMLButtonElement;

        if (!this.apiKeyInput || !this.saveButton || !this.testButton) {
            console.error('[AIProviderSettings] Required elements not found');
            return;
        }

        this.setupEventListeners();
        this.loadApiKey();
    }

    /**
     * Set up event listeners for settings controls
     */
    private setupEventListeners(): void {
        if (!this.saveButton || !this.testButton) return;

        this.saveButton.addEventListener('click', () => this.saveApiKey());
        this.testButton.addEventListener('click', () => this.testApiKey());
    }

    /**
     * Load API key from storage
     */
    private async loadApiKey(): Promise<void> {
        if (!this.apiKeyInput) return;

        try {
            const apiKey = await IPCService.getApiKey();
            if (apiKey) {
                this.apiKeyInput.value = apiKey;
            }
        } catch (error) {
            console.error('[AIProviderSettings] Failed to load API key:', error);
        }
    }

    /**
     * Save API key to storage
     */
    private async saveApiKey(): Promise<void> {
        if (!this.apiKeyInput || !this.saveButton) return;

        const apiKey = this.apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter an API key');
            return;
        }

        const originalText = this.saveButton.textContent;
        this.saveButton.textContent = 'Saving...';
        this.saveButton.disabled = true;

        try {
            await IPCService.saveApiKey(apiKey);
            this.saveButton.textContent = 'Saved!';
            setTimeout(() => {
                if (this.saveButton) {
                    this.saveButton.textContent = originalText;
                    this.saveButton.disabled = false;
                }
            }, 2000);
        } catch (error) {
            console.error('[AIProviderSettings] Failed to save API key:', error);
            alert('Failed to save API key');
            this.saveButton.textContent = originalText;
            this.saveButton.disabled = false;
        }
    }

    /**
     * Test API key connection
     */
    private async testApiKey(): Promise<void> {
        if (!this.apiKeyInput || !this.testButton) return;

        const apiKey = this.apiKeyInput.value.trim();
        if (!apiKey) {
            alert('Please enter an API key first');
            return;
        }

        const originalText = this.testButton.textContent;
        this.testButton.textContent = 'Testing...';
        this.testButton.disabled = true;

        try {
            const result = await IPCService.testApiKey(apiKey);
            if (result.success) {
                alert('API key is valid!');
            } else {
                alert('API key test failed: ' + result.error);
            }
        } catch (error) {
            console.error('[AIProviderSettings] Failed to test API key:', error);
            alert('Failed to test API key');
        } finally {
            this.testButton.textContent = originalText;
            this.testButton.disabled = false;
        }
    }
}
