/**
 * Agent types and interfaces
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface AgentOptions {
  maxHistory?: number;
  enableMCP?: boolean;
  enableSkills?: boolean;
  /** Specific MCP servers to enable (e.g., ['atlassian', 'oci']) */
  mcpServers?: string[];
}

export interface MCPServerInfo {
  name: string;
  available: boolean;
  running: boolean;
  toolCount: number;
  description: string;
}
