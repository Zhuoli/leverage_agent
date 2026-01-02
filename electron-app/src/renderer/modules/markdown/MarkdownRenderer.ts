/**
 * Markdown Renderer
 * Main orchestrator for markdown rendering with code blocks and mermaid diagrams
 */

import { escapeHtml } from '../utils/dom';
import { CodeBlockHandler } from './CodeBlockHandler';
import { MermaidRenderer } from './MermaidRenderer';

declare const marked: any;

export class MarkdownRenderer {
    private static initialized: boolean = false;

    /**
     * Initialize markdown renderer and dependencies
     */
    static initialize(): void {
        if (this.initialized) return;

        // Initialize code block handler
        CodeBlockHandler.configureMarked();

        // Initialize mermaid
        MermaidRenderer.initialize();

        this.initialized = true;
        console.log('[MarkdownRenderer] Initialized');
    }

    /**
     * Render markdown text to HTML
     */
    static render(text: string): string {
        console.log('[MarkdownRenderer] Rendering text, length:', text.length);

        if (typeof marked === 'undefined') {
            console.warn('[MarkdownRenderer] marked not available, using basic formatting');
            return this.basicFormat(text);
        }

        try {
            // Extract and preserve mermaid code blocks
            const mermaidBlocks: string[] = [];
            let processedText = text.replace(/```mermaid\n([\s\S]*?)```/g, (_match, code) => {
                const placeholder = `__MERMAID_PLACEHOLDER_${mermaidBlocks.length}__`;
                mermaidBlocks.push(code.trim());
                return placeholder;
            });

            // Parse markdown
            let html = marked.parse(processedText);

            // Replace mermaid placeholders with actual mermaid containers
            mermaidBlocks.forEach((code, index) => {
                const mermaidId = MermaidRenderer.getNextId();
                const mermaidHtml = `<div class="mermaid-container"><div class="mermaid" id="${mermaidId}">${escapeHtml(code)}</div></div>`;
                html = html.replace(`__MERMAID_PLACEHOLDER_${index}__`, mermaidHtml);
            });

            return html;
        } catch (e) {
            console.error('Markdown parsing error:', e);
            return this.basicFormat(text);
        }
    }

    /**
     * Basic fallback formatting without marked.js
     */
    private static basicFormat(text: string): string {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
    }
}
