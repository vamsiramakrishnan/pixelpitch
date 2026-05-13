import { useEffect, useMemo, useState } from 'react';
import {
  fetchMcpServers,
  saveMcpServers,
  startMcpOAuth,
  suggestMcpServerId,
} from '../state/mcp';
import type { McpServerConfig, McpTemplate } from '../state/mcp';
import { Icon } from './Icon';

interface DraftRow extends McpServerConfig {
  argsText?: string;
  envText?: string;
  headersText?: string;
}

function mapToText(value?: Record<string, string>): string {
  return value ? Object.entries(value).map(([k, v]) => `${k}=${v}`).join('\n') : '';
}

function textToMap(value?: string): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const raw of (value ?? '').split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;
    const key = line.slice(0, index).trim();
    const val = line.slice(index + 1).trim();
    if (key) out[key] = val;
  }
  return Object.keys(out).length ? out : undefined;
}

function toDraft(server: McpServerConfig): DraftRow {
  return {
    ...server,
    argsText: server.args?.join('\n') ?? '',
    envText: mapToText(server.env),
    headersText: mapToText(server.headers),
  };
}

function toServer(row: DraftRow): McpServerConfig {
  const base: McpServerConfig = {
    id: row.id.trim(),
    label: row.label?.trim() || undefined,
    transport: row.transport,
    enabled: row.enabled !== false,
    templateId: row.templateId,
  };
  if (row.transport === 'stdio') {
    return {
      ...base,
      command: row.command?.trim() || undefined,
      args: (row.argsText ?? '').split('\n').map((v) => v.trim()).filter(Boolean),
      env: textToMap(row.envText),
    };
  }
  return {
    ...base,
    url: row.url?.trim() || undefined,
    headers: textToMap(row.headersText),
  };
}

function draftFromTemplate(template: McpTemplate, taken: ReadonlySet<string>): DraftRow {
  return toDraft({
    id: suggestMcpServerId(template.id, taken),
    label: template.label,
    templateId: template.id,
    transport: template.transport,
    enabled: true,
    command: template.command,
    args: template.args,
    url: template.url,
  });
}

export function McpClientSection() {
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [templates, setTemplates] = useState<McpTemplate[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const data = await fetchMcpServers();
      if (!alive) return;
      if (!data) {
        setMessage('Could not load MCP servers from the local daemon.');
      } else {
        setRows(data.servers.map(toDraft));
        setTemplates(data.templates);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const taken = useMemo(() => new Set(rows.map((row) => row.id)), [rows]);

  const updateRow = (index: number, patch: Partial<DraftRow>) => {
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  const addBlank = () => {
    setRows((current) => [
      ...current,
      {
        id: suggestMcpServerId('custom', new Set(current.map((row) => row.id))),
        label: '',
        transport: 'stdio',
        enabled: true,
        command: '',
        argsText: '',
        envText: '',
      },
    ]);
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const payload = rows.map(toServer);
    const saved = await saveMcpServers(payload);
    setSaving(false);
    if (!saved) {
      setMessage('Could not save MCP server config.');
      return;
    }
    setRows(saved.servers.map(toDraft));
    setTemplates(saved.templates);
    setMessage('MCP servers saved.');
  };

  return (
    <section className="settings-section mcp-client-section">
      <div className="section-head">
        <div>
          <h3>External MCP clients</h3>
          <p className="hint">Configure local or remote MCP servers that agents can use during runs.</p>
        </div>
        <button type="button" className="primary" onClick={() => void save()} disabled={saving}>
          {saving ? 'Saving…' : 'Save MCP'}
        </button>
      </div>

      {message ? <p className="hint">{message}</p> : null}
      {loading ? <p className="hint">Loading MCP servers…</p> : null}

      {templates.length ? (
        <div className="mcp-template-row">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              className="ghost"
              onClick={() => setRows((current) => [...current, draftFromTemplate(template, taken)])}
              title={template.description}
            >
              <Icon name="plus" size={13} />
              {template.label}
            </button>
          ))}
        </div>
      ) : null}

      <button type="button" className="ghost" onClick={addBlank}>
        <Icon name="plus" size={13} />
        Add custom server
      </button>

      <div className="mcp-server-list">
        {rows.map((row, index) => (
          <div className="mcp-server-card" key={`${row.id}:${index}`}>
            <div className="field-row">
              <label className="field">
                <span className="field-label">ID</span>
                <input value={row.id} onChange={(e) => updateRow(index, { id: e.target.value })} />
              </label>
              <label className="field">
                <span className="field-label">Label</span>
                <input value={row.label ?? ''} onChange={(e) => updateRow(index, { label: e.target.value })} />
              </label>
            </div>
            <div className="field-row">
              <label className="field">
                <span className="field-label">Transport</span>
                <select
                  value={row.transport}
                  onChange={(e) => updateRow(index, { transport: e.target.value as McpServerConfig['transport'] })}
                >
                  <option value="stdio">stdio</option>
                  <option value="sse">sse</option>
                  <option value="http">http</option>
                </select>
              </label>
              <label className="field checkbox-field">
                <input
                  type="checkbox"
                  checked={row.enabled !== false}
                  onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                />
                <span>Enabled</span>
              </label>
            </div>
            {row.transport === 'stdio' ? (
              <>
                <label className="field">
                  <span className="field-label">Command</span>
                  <input value={row.command ?? ''} onChange={(e) => updateRow(index, { command: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-label">Args, one per line</span>
                  <textarea value={row.argsText ?? ''} onChange={(e) => updateRow(index, { argsText: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-label">Environment, KEY=value</span>
                  <textarea value={row.envText ?? ''} onChange={(e) => updateRow(index, { envText: e.target.value })} />
                </label>
              </>
            ) : (
              <>
                <label className="field">
                  <span className="field-label">URL</span>
                  <input value={row.url ?? ''} onChange={(e) => updateRow(index, { url: e.target.value })} />
                </label>
                <label className="field">
                  <span className="field-label">Headers, KEY=value</span>
                  <textarea value={row.headersText ?? ''} onChange={(e) => updateRow(index, { headersText: e.target.value })} />
                </label>
                <button
                  type="button"
                  className="ghost"
                  onClick={async () => {
                    const result = await startMcpOAuth(row.id);
                    setMessage(result.ok ? 'OAuth started.' : result.message);
                  }}
                >
                  <Icon name="link" size={13} />
                  Connect OAuth
                </button>
              </>
            )}
            <button
              type="button"
              className="ghost danger"
              onClick={() => setRows((current) => current.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
