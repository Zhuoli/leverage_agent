/**
 * Message Renderer
 * Renders chat messages (user/assistant) with markdown, timestamps, and save functionality
 */

import { formatCurrentTime, generateFilename } from '../utils/formatters';
import { MarkdownRenderer } from '../markdown/MarkdownRenderer';
import { MermaidRenderer } from '../markdown/MermaidRenderer';
import { IPCService } from '../../services/IPCService';

export class MessageRenderer {
    /**
     * Add a message to the chat container
     */
    static addMessage(
        text: string,
        sender: 'user' | 'assistant',
        container: HTMLElement,
        isError: boolean = false
    ): void {
        // Remove welcome message if it exists
        const welcomeMsg = container.querySelector('.welcome-message');
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

        // Render markdown for content
        textDiv.innerHTML = MarkdownRenderer.render(text);

        if (isError) {
            textDiv.style.color = 'var(--danger-color)';
        }

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = formatCurrentTime();

        content.appendChild(textDiv);
        content.appendChild(time);

        // Add save button for assistant messages
        if (sender === 'assistant' && !isError) {
            const saveButton = this.createSaveButton(text, messageDiv);
            content.appendChild(saveButton);
        }

        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;

        // Render mermaid diagrams after adding to DOM
        MermaidRenderer.renderDiagrams();
    }

    /**
     * Add typing indicator to chat
     */
    static addTypingIndicator(container: HTMLElement): void {
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

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    /**
     * Remove typing indicator from chat
     */
    static removeTypingIndicator(): void {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * Create save button for assistant messages
     */
    private static createSaveButton(text: string, _messageElement: HTMLElement): HTMLButtonElement {
        const saveButton = document.createElement('button');
        saveButton.className = 'message-save-button';
        saveButton.innerHTML = '<span class="save-icon">💾</span><span class="save-text">Save as Markdown</span>';
        saveButton.title = 'Save this response as a Markdown file';

        saveButton.onclick = () => {
            const suggestedFilename = generateFilename(text);
            console.log('[MessageRenderer] Saving message to file, suggested name:', suggestedFilename);

            // Visual feedback
            const originalHTML = saveButton.innerHTML;
            saveButton.innerHTML = '<span class="save-icon">⏳</span><span class="save-text">Saving...</span>';
            saveButton.disabled = true;

            // Send to main process
            IPCService.saveMessageToFile(text, suggestedFilename);

            // Listen for result (one-time)
            const cleanup = IPCService.onSaveMessageResult((result) => {
                cleanup(); // Remove listener

                if (result.success) {
                    saveButton.innerHTML = '<span class="save-icon">✓</span><span class="save-text">Saved!</span>';
                    saveButton.classList.add('saved');

                    setTimeout(() => {
                        saveButton.innerHTML = originalHTML;
                        saveButton.disabled = false;
                        saveButton.classList.remove('saved');
                    }, 2000);
                } else if (result.cancelled) {
                    saveButton.innerHTML = originalHTML;
                    saveButton.disabled = false;
                } else {
                    saveButton.innerHTML = '<span class="save-icon">✗</span><span class="save-text">Failed</span>';
                    alert('Failed to save file: ' + result.error);

                    setTimeout(() => {
                        saveButton.innerHTML = originalHTML;
                        saveButton.disabled = false;
                    }, 2000);
                }
            });
        };

        return saveButton;
    }
}
