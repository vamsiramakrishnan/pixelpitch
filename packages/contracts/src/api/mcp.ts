export type McpTransport = 'stdio' | 'sse' | 'http';

export interface McpServerConfig {
  id: string;
  label?: string;
  templateId?: string;
  transport: McpTransport;
  enabled: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface McpConfig {
  servers: McpServerConfig[];
}

export interface McpTemplateField {
  key: string;
  label?: string;
  required?: boolean;
  placeholder?: string;
  secret?: boolean;
}

export type McpTemplateCategory =
  | 'image-generation'
  | 'image-editing'
  | 'web-capture'
  | 'design-systems'
  | 'ui-components'
  | 'data-viz'
  | 'publishing'
  | 'utilities';

export interface McpTemplate {
  id: string;
  label: string;
  description: string;
  transport: McpTransport;
  category: McpTemplateCategory;
  homepage?: string;
  example?: string;
  command?: string;
  args?: string[];
  envFields?: McpTemplateField[];
  url?: string;
  headerFields?: McpTemplateField[];
}

export interface McpServersResponse {
  servers: McpServerConfig[];
  templates: McpTemplate[];
}

export interface UpdateMcpServersRequest {
  servers: McpServerConfig[];
}

export interface StartMcpOAuthRequest {
  serverId: string;
}

export interface StartMcpOAuthResponse {
  authorizeUrl: string;
  state: string;
  redirectUri: string;
}

export interface McpOAuthStatusResponse {
  connected: boolean;
  expiresAt?: number | null;
  scope?: string | null;
  savedAt?: number;
}

export interface DisconnectMcpOAuthRequest {
  serverId: string;
}

export type McpOAuthPostMessage =
  | { type: 'mcp-oauth'; ok: true; serverId: string | null }
  | { type: 'mcp-oauth'; ok: false; message: string | null };
