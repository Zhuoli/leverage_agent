/**
 * MCP Server Manager
 * Manages MCP server configurations
 */

import { IPCService } from '../../services/IPCService';

interface MCPServer {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    enabled: boolean;
}

export class MCPServerManager {
    private container: HTMLElement | null;
    private serversList: HTMLElement | null;
    private addButton: HTMLButtonElement | null;
    private servers: MCPServer[];

    constructor() {
        this.container = null;
        this.serversList = null;
        this.addButton = null;
        this.servers = [];
    }

    /**
     * Initialize MCP server manager
     */
    initialize(): void {
        this.container = document.getElementById('mcpView');
        if (!this.container) {
            console.error('[MCPServerManager] Container not found');
            return;
        }

        this.serversList = this.container.querySelector('#mcpServersList') as HTMLElement;
        this.addButton = this.container.querySelector('#addMcpServer') as HTMLButtonElement;

        if (!this.serversList || !this.addButton) {
            console.error('[MCPServerManager] Required elements not found');
            return;
        }

        this.setupEventListeners();
        this.loadServers();
    }

    /**
     * Set up event listeners
     */
    private setupEventListeners(): void {
        if (!this.addButton) return;
        this.addButton.addEventListener('click', () => this.addServer());
    }

    /**
     * Load MCP servers from configuration
     */
    private async loadServers(): Promise<void> {
        try {
            this.servers = await IPCService.getMCPServers();
            this.renderServers();
        } catch (error) {
            console.error('[MCPServerManager] Failed to load servers:', error);
        }
    }

    /**
     * Render servers list
     */
    private renderServers(): void {
        if (!this.serversList) return;

        this.serversList.innerHTML = '';

        if (this.servers.length === 0) {
            this.serversList.innerHTML = '<div class="empty-state">No MCP servers configured</div>';
            return;
        }

        this.servers.forEach((server, index) => {
            const serverItem = this.createServerItem(server, index);
            if (this.serversList) {
                this.serversList.appendChild(serverItem);
            }
        });
    }

    /**
     * Create server item element
     */
    private createServerItem(server: MCPServer, index: number): HTMLElement {
        const div = document.createElement('div');
        div.className = 'mcp-server-item';

        const header = document.createElement('div');
        header.className = 'mcp-server-header';

        const name = document.createElement('span');
        name.className = 'mcp-server-name';
        name.textContent = server.name;

        const toggle = document.createElement('input');
        toggle.type = 'checkbox';
        toggle.checked = server.enabled;
        toggle.addEventListener('change', () => this.toggleServer(index, toggle.checked));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'mcp-server-delete';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', () => this.deleteServer(index));

        header.appendChild(name);
        header.appendChild(toggle);
        header.appendChild(deleteBtn);

        const details = document.createElement('div');
        details.className = 'mcp-server-details';
        details.innerHTML = `
            <div><strong>Command:</strong> ${server.command}</div>
            <div><strong>Args:</strong> ${server.args.join(' ')}</div>
        `;

        div.appendChild(header);
        div.appendChild(details);

        return div;
    }

    /**
     * Add new MCP server
     */
    private addServer(): void {
        const name = prompt('Server name:');
        if (!name) return;

        const command = prompt('Command:');
        if (!command) return;

        const argsStr = prompt('Arguments (space-separated):');
        const args = argsStr ? argsStr.split(' ') : [];

        const newServer: MCPServer = {
            name,
            command,
            args,
            enabled: true
        };

        this.servers.push(newServer);
        this.saveServers();
        this.renderServers();
    }

    /**
     * Toggle server enabled state
     */
    private toggleServer(index: number, enabled: boolean): void {
        if (index >= 0 && index < this.servers.length) {
            this.servers[index].enabled = enabled;
            this.saveServers();
        }
    }

    /**
     * Delete MCP server
     */
    private deleteServer(index: number): void {
        if (confirm('Are you sure you want to delete this server?')) {
            this.servers.splice(index, 1);
            this.saveServers();
            this.renderServers();
        }
    }

    /**
     * Save servers configuration
     */
    private async saveServers(): Promise<void> {
        try {
            await IPCService.saveMCPServers(this.servers);
        } catch (error) {
            console.error('[MCPServerManager] Failed to save servers:', error);
            alert('Failed to save MCP server configuration');
        }
    }
}
