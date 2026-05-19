import { useEffect, useState } from 'react';
import {
  deleteMemoryEntry,
  fetchMemoryEntry,
  fetchMemoryList,
  saveMemoryEntry,
  saveMemoryIndex,
  updateMemoryConfig,
} from '../providers/registry';
import type { MemoryEntry, MemoryListResponse, MemoryType } from '../types';

const MEMORY_TYPES: MemoryType[] = ['user', 'feedback', 'project', 'reference'];

const EMPTY_DRAFT: MemoryEntry = {
  id: '',
  name: '',
  description: '',
  type: 'user',
  updatedAt: 0,
  body: '',
};

export function MemorySection() {
  const [state, setState] = useState<MemoryListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<MemoryEntry>(EMPTY_DRAFT);
  const [indexDraft, setIndexDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    setLoading(true);
    const next = await fetchMemoryList();
    setState(next);
    setIndexDraft(next?.index ?? '');
    setLoading(false);
  }

  useEffect(() => {
    void refresh();
  }, []);

  async function selectEntry(id: string) {
    const entry = await fetchMemoryEntry(id);
    if (entry) setDraft(entry);
  }

  async function saveDraft() {
    if (!draft.name.trim()) {
      setError('Memory name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveMemoryEntry({
        id: draft.id || undefined,
        name: draft.name,
        description: draft.description,
        type: draft.type,
        body: draft.body,
      });
      if (!saved) {
        setError('Could not save memory.');
        return;
      }
      setDraft(saved);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  async function removeDraft() {
    if (!draft.id) return;
    setSaving(true);
    try {
      if (await deleteMemoryEntry(draft.id)) {
        setDraft(EMPTY_DRAFT);
        await refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(enabled: boolean) {
    await updateMemoryConfig(enabled);
    setState((current) => current ? { ...current, enabled } : current);
  }

  async function saveIndex() {
    setSaving(true);
    try {
      await saveMemoryIndex(indexDraft);
      await refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="settings-section memory-section">
      <div className="section-head">
        <div>
          <h3>Memory</h3>
          <p className="hint">
            Durable project and user context injected into future chat runs.
          </p>
        </div>
        <label className="toggle-row compact">
          <input
            type="checkbox"
            checked={state?.enabled ?? true}
            onChange={(event) => void toggleEnabled(event.target.checked)}
          />
          <span>{state?.enabled === false ? 'Off' : 'On'}</span>
        </label>
      </div>

      {loading ? <p className="hint">Loading memory...</p> : null}
      {state ? (
        <p className="hint">Stored in {state.rootDir}</p>
      ) : null}

      <div className="memory-grid">
        <div className="memory-list">
          <button
            type="button"
            className={`memory-entry-row${!draft.id ? ' active' : ''}`}
            onClick={() => setDraft(EMPTY_DRAFT)}
          >
            New memory
          </button>
          {state?.entries.map((entry) => (
            <button
              type="button"
              key={entry.id}
              className={`memory-entry-row${draft.id === entry.id ? ' active' : ''}`}
              onClick={() => void selectEntry(entry.id)}
            >
              <strong>{entry.name}</strong>
              <span>{entry.type} · {entry.description || entry.id}</span>
            </button>
          ))}
        </div>

        <div className="memory-editor">
          <label className="field">
            <span className="field-label">Name</span>
            <input
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              placeholder="User preference"
            />
          </label>
          <label className="field">
            <span className="field-label">Type</span>
            <select
              value={draft.type}
              onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as MemoryType }))}
            >
              {MEMORY_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Description</span>
            <input
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short summary"
            />
          </label>
          <label className="field">
            <span className="field-label">Body</span>
            <textarea
              value={draft.body}
              rows={7}
              onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))}
              placeholder="- Preference: keep responses concise"
            />
          </label>
          {error ? <p className="hint error">{error}</p> : null}
          <div className="settings-row-actions">
            <button type="button" className="primary" disabled={saving} onClick={() => void saveDraft()}>
              {saving ? 'Saving...' : 'Save memory'}
            </button>
            {draft.id ? (
              <button type="button" className="ghost danger" disabled={saving} onClick={() => void removeDraft()}>
                Delete
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <label className="field">
        <span className="field-label">Memory index</span>
        <textarea
          value={indexDraft}
          rows={7}
          onChange={(event) => setIndexDraft(event.target.value)}
        />
      </label>
      <button type="button" className="ghost" disabled={saving} onClick={() => void saveIndex()}>
        Save index
      </button>
    </section>
  );
}
