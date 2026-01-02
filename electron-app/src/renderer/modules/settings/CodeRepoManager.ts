/**
 * Code Repository Manager
 * Manages code repository paths for context
 */

import { IPCService } from '../../services/IPCService';

interface CodeRepo {
    id: string;
    name: string;
    path: string;
    enabled: boolean;
}

export class CodeRepoManager {
    private container: HTMLElement | null;
    private reposList: HTMLElement | null;
    private addButton: HTMLButtonElement | null;
    private repos: CodeRepo[];

    constructor() {
        this.container = null;
        this.reposList = null;
        this.addButton = null;
        this.repos = [];
    }

    /**
     * Initialize code repo manager
     */
    initialize(): void {
        this.container = document.getElementById('codeRepoView');
        if (!this.container) {
            console.error('[CodeRepoManager] Container not found');
            return;
        }

        this.reposList = this.container.querySelector('#codeReposList') as HTMLElement;
        this.addButton = this.container.querySelector('#addCodeRepo') as HTMLButtonElement;

        if (!this.reposList || !this.addButton) {
            console.error('[CodeRepoManager] Required elements not found');
            return;
        }

        this.setupEventListeners();
        this.loadRepos();
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        if (!this.addButton) return;
        this.addButton.addEventListener('click', () => this.addRepo());
    }

    /**
     * Load repositories from storage
     */
    private async loadRepos(): Promise<void> {
        try {
            this.repos = await IPCService.getCodeRepos();
            this.renderRepos();
        } catch (error) {
            console.error('[CodeRepoManager] Failed to load repos:', error);
        }
    }

    /**
     * Render repositories list
     */
    private renderRepos(): void {
        if (!this.reposList) return;

        this.reposList.innerHTML = '';

        if (this.repos.length === 0) {
            this.reposList.innerHTML = '<div class="empty-state">No code repositories configured</div>';
            return;
        }

        this.repos.forEach((repo, index) => {
            const repoItem = this.createRepoItem(repo, index);
            if (this.reposList) {
                this.reposList.appendChild(repoItem);
            }
        });
    }

    /**
     * Create repository item element
     */
    private createRepoItem(repo: CodeRepo, index: number): HTMLElement {
        const div = document.createElement('div');
        div.className = 'code-repo-item';

        const header = document.createElement('div');
        header.className = 'code-repo-header';

        const name = document.createElement('span');
        name.className = 'code-repo-name';
        name.textContent = repo.name;

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = repo.enabled;
        toggle.addEventListener('change', () => this.toggleRepo(index, toggle.checked));

        const actions = document.createElement('div');
        actions.className = 'code-repo-actions';

        const openBtn = document.createElement('button');
        openBtn.className = 'code-repo-open';
        openBtn.textContent = 'Open';
        openBtn.addEventListener('click', () => this.openRepo(repo.path));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'code-repo-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.deleteRepo(index));

        actions.appendChild(openBtn);
        actions.appendChild(deleteBtn);

        header.appendChild(name);
        header.appendChild(toggle);
        header.appendChild(actions);

        const path = document.createElement('div');
        path.className = 'code-repo-path';
        path.textContent = repo.path;

        div.appendChild(header);
        div.appendChild(path);

        return div;
    }

    /**
     * Add new repository
     */
    private async addRepo(): Promise<void> {
        try {
            const result = await IPCService.selectDirectory();
            if (!result.cancelled && result.path) {
                const name = prompt('Repository name:', this.getRepoNameFromPath(result.path));
                if (!name) return;

                const newRepo: CodeRepo = {
                    id: `repo-${Date.now()}`,
                    name,
                    path: result.path,
                    enabled: true
                };

                this.repos.push(newRepo);
                this.saveRepos();
                this.renderRepos();
            }
        } catch (error) {
            console.error('[CodeRepoManager] Failed to add repo:', error);
            alert('Failed to add repository');
        }
    }

    /**
     * Extract repository name from path
     */
    private getRepoNameFromPath(path: string): string {
        const parts = path.split(/[/\\]/);
        return parts[parts.length - 1] || 'Repository';
    }

    /**
     * Open repository in file explorer
     */
    private async openRepo(path: string): Promise<void> {
        try {
            await IPCService.openDirectory(path);
        } catch (error) {
            console.error('[CodeRepoManager] Failed to open repo:', error);
            alert('Failed to open directory');
        }
    }

    /**
     * Toggle repository enabled state
     */
    private toggleRepo(index: number, enabled: boolean): void {
        if (index >= 0 && index < this.repos.length) {
            this.repos[index].enabled = enabled;
            this.saveRepos();
        }
    }

    /**
     * Delete repository
     */
    private deleteRepo(index: number): void {
        if (confirm('Are you sure you want to remove this repository?')) {
            this.repos.splice(index, 1);
            this.saveRepos();
            this.renderRepos();
        }
    }

    /**
     * Save repositories to storage
     */
    private async saveRepos(): Promise<void> {
        try {
            await IPCService.saveCodeRepos(this.repos);
        } catch (error) {
            console.error('[CodeRepoManager] Failed to save repos:', error);
            alert('Failed to save repositories');
        }
    }
}
