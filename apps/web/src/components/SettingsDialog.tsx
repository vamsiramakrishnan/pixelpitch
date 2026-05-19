import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { LOCALE_LABEL, LOCALES, useI18n } from '../i18n';
import type { Locale } from '../i18n';
import { usePopoverLayer } from '../layers';
import { AgentIcon } from './AgentIcon';
import { Icon } from './Icon';
import { MotionModal } from './MotionModal';
import {
  CUSTOM_MODEL_SENTINEL,
  isCustomModel,
  renderModelOptions,
} from './modelOptions';
import { KNOWN_PROVIDERS } from '../state/config';
import {
  MAX_MAX_TOKENS,
  MIN_MAX_TOKENS,
  modelMaxTokensDefault,
} from '../state/maxTokens';
import type { AgentInfo, AppConfig, AppTheme, AppVersionInfo, ExecMode, ProviderModelsResponse } from '../types';
import { MEDIA_PROVIDERS } from '../media/models';
import type { MediaProvider } from '../media/models';
import { PetSettings } from './pet/PetSettings';
import { McpClientSection } from './McpClientSection';
import { MemorySection } from './MemorySection';
import { RoutinesSection } from './RoutinesSection';
import { DEFAULT_NOTIFICATIONS } from '../state/config';
import {
  FAILURE_SOUNDS,
  SUCCESS_SOUNDS,
  notificationPermission,
  playSound,
  requestNotificationPermission,
  showCompletionNotification,
} from '../utils/notifications';
import { fetchProviderModels, testExecutionConfig, type ExecutionTestResult } from '../providers/registry';

export type SettingsSection =
  | 'execution'
  | 'media'
  | 'orbit'
  | 'memory'
  | 'routines'
  | 'mcpClient'
  | 'language'
  | 'appearance'
  | 'notifications'
  | 'pet'
  | 'about';

interface Props {
  open: boolean;
  initial: AppConfig;
  agents: AgentInfo[];
  daemonLive: boolean;
  appVersionInfo: AppVersionInfo | null;
  welcome?: boolean;
  // Optional deep-link target so callers (e.g. the entry-view "adopt a
  // pet" pill) can pop the dialog open straight on a specific section.
  defaultSection?: SettingsSection;
  onSave: (cfg: AppConfig) => void;
  onClose: () => void;
  onRefreshAgents: () => void;
}

const SUGGESTED_MODELS_BY_PROTOCOL = {
  anthropic: [
    'claude-opus-4-5',
    'claude-sonnet-4-5',
    'claude-haiku-4-5',
    'deepseek-chat',
    'deepseek-reasoner',
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'MiniMax-M2.7-highspeed',
    'MiniMax-M2.7',
    'MiniMax-M2.5-highspeed',
    'MiniMax-M2.5',
    'MiniMax-M2.1-highspeed',
    'MiniMax-M2.1',
    'MiniMax-M2',
    'mimo-v2.5-pro',
  ],
  openai: [
    'gpt-4o',
    'gpt-4o-mini',
    'o3',
    'o4-mini',
    'deepseek-chat',
    'deepseek-reasoner',
    'deepseek-v4-flash',
    'deepseek-v4-pro',
    'MiniMax-M2.7-highspeed',
    'MiniMax-M2.7',
    'MiniMax-M2.5-highspeed',
    'MiniMax-M2.5',
    'MiniMax-M2.1-highspeed',
    'MiniMax-M2.1',
    'MiniMax-M2',
    'mimo-v2.5-pro',
  ],
  ollama: [
    'gpt-oss:120b-cloud',
    'qwen3-coder:480b-cloud',
    'deepseek-v3.1:671b-cloud',
    'llama3.3:70b-cloud',
  ],
} as const;

function normalizeAccentColor(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed : null;
}

function applyAccentColor(value: string | undefined): void {
  const accent = normalizeAccentColor(value);
  const root = document.documentElement;
  if (!accent) {
    root.style.removeProperty('--accent');
    root.style.removeProperty('--accent-strong');
    root.style.removeProperty('--accent-hover');
    root.style.removeProperty('--accent-soft');
    root.style.removeProperty('--accent-tint');
    return;
  }
  root.style.setProperty('--accent', accent);
  root.style.setProperty('--accent-strong', `color-mix(in srgb, ${accent} 88%, #000)`);
  root.style.setProperty('--accent-hover', `color-mix(in srgb, ${accent} 86%, #000)`);
  root.style.setProperty('--accent-soft', `color-mix(in srgb, ${accent} 18%, transparent)`);
  root.style.setProperty('--accent-tint', `color-mix(in srgb, ${accent} 8%, transparent)`);
}

export function SettingsDialog({
  open,
  initial,
  agents,
  daemonLive,
  appVersionInfo,
  welcome,
  defaultSection,
  onSave,
  onClose,
  onRefreshAgents,
}: Props) {
  const { t, locale, setLocale } = useI18n();
  const [cfg, setCfg] = useState<AppConfig>(initial);

  // Revert the live theme preview when the dialog closes without saving.
  // On Save, App's useLayoutEffect fires after unmount and applies the new
  // saved theme, so this cleanup is effectively a no-op in that path.
  useLayoutEffect(() => {
    const saved = initial.theme ?? 'system';
    const savedAccent = initial.accentColor;
    return () => {
      if (saved === 'system') {
        document.documentElement.removeAttribute('data-theme');
      } else {
        document.documentElement.setAttribute('data-theme', saved);
      }
      applyAccentColor(savedAccent);
    };
  }, [initial.theme, initial.accentColor]);
  const [showApiKey, setShowApiKey] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [executionTest, setExecutionTest] = useState<ExecutionTestResult | null>(null);
  const [testingExecution, setTestingExecution] = useState(false);
  const [providerModelsResult, setProviderModelsResult] = useState<ProviderModelsResponse | null>(null);
  const [fetchingProviderModels, setFetchingProviderModels] = useState(false);
  const [activeSection, setActiveSection] = useState<SettingsSection>(
    defaultSection ?? 'execution',
  );
  const [languageMenuRect, setLanguageMenuRect] = useState<DOMRect | null>(null);
  const languageRef = useRef<HTMLDivElement | null>(null);

  // If the daemon goes offline mid-edit, force API mode so the UI doesn't
  // pretend Local CLI is selectable.
  useEffect(() => {
    if (!daemonLive && cfg.mode === 'daemon') {
      setCfg((c) => ({ ...c, mode: 'api' }));
    }
  }, [daemonLive, cfg.mode]);

  const langLayer = usePopoverLayer({
    open: languageOpen,
    onDismiss: () => setLanguageOpen(false),
    triggerRef: languageRef as React.RefObject<HTMLElement | null>,
  });

  useEffect(() => {
    if (!languageOpen) return;
    const updateRect = () => {
      const button = languageRef.current?.querySelector('button');
      setLanguageMenuRect(button?.getBoundingClientRect() ?? null);
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);
    return () => {
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [languageOpen]);

  const installedCount = useMemo(
    () => agents.filter((a) => a.available).length,
    [agents],
  );

  const setMode = (mode: ExecMode) => setCfg((c) => ({ ...c, mode }));
  const setApiProtocol = (protocol: AppConfig['apiProtocol']) => {
    if (!protocol) return;
    setCfg((c) => {
      const currentProvider = c.apiProviderBaseUrl
        ? KNOWN_PROVIDERS.find((p) => p.baseUrl === c.apiProviderBaseUrl)
        : undefined;
      const stillOnSelectedProvider = Boolean(currentProvider && c.baseUrl === currentProvider.baseUrl);
      const provider = KNOWN_PROVIDERS.find((p) => p.protocol === protocol);
      return {
        ...c,
        mode: 'api',
        apiProtocol: protocol,
        ...(stillOnSelectedProvider && provider
          ? { baseUrl: provider.baseUrl, model: provider.model, apiProviderBaseUrl: provider.baseUrl }
          : { apiProviderBaseUrl: null }),
      };
    });
  };

  const canSave =
    cfg.mode === 'daemon'
      ? Boolean(cfg.agentId && agents.find((a) => a.id === cfg.agentId)?.available)
      : Boolean(cfg.apiKey.trim() && cfg.model.trim() && cfg.baseUrl.trim());

  const apiProtocol = cfg.apiProtocol ?? 'anthropic';
  const protocolProviders = useMemo(
    () => KNOWN_PROVIDERS.filter((p) => p.protocol === apiProtocol),
    [apiProtocol],
  );
  const selectedProviderIndex = protocolProviders.findIndex((p) => p.baseUrl === cfg.baseUrl);
  const selectedProvider = selectedProviderIndex >= 0 ? protocolProviders[selectedProviderIndex] : undefined;
  useEffect(() => {
    setProviderModelsResult(null);
  }, [apiProtocol, cfg.baseUrl]);
  const apiModelOptions = useMemo(
    () => Array.from(new Set(
      providerModelsResult?.ok && providerModelsResult.models?.length
        ? providerModelsResult.models.map((model) => model.id)
        : selectedProvider?.models?.length
        ? selectedProvider.models
        : SUGGESTED_MODELS_BY_PROTOCOL[apiProtocol],
    )),
    [apiProtocol, providerModelsResult, selectedProvider],
  );
  const apiModelCustom = Boolean(cfg.model) && !apiModelOptions.includes(cfg.model);
  const apiModelSelectValue = apiModelCustom || !cfg.model ? CUSTOM_MODEL_SENTINEL : cfg.model;

  async function runExecutionTest() {
    setTestingExecution(true);
    setExecutionTest(null);
    try {
      setExecutionTest(await testExecutionConfig({
        mode: cfg.mode,
        agentId: cfg.agentId,
        apiProtocol: cfg.apiProtocol,
        apiKey: cfg.apiKey,
        baseUrl: cfg.baseUrl,
        model: cfg.model,
      }));
    } catch (err) {
      setExecutionTest({
        ok: false,
        mode: cfg.mode === 'daemon' ? 'daemon' : 'api',
        message: err instanceof Error ? err.message : 'Connection test failed.',
      });
    } finally {
      setTestingExecution(false);
    }
  }

  async function runProviderModelsFetch() {
    setFetchingProviderModels(true);
    setProviderModelsResult(null);
    try {
      const result = await fetchProviderModels({
        protocol: apiProtocol,
        baseUrl: cfg.baseUrl,
        apiKey: cfg.apiKey,
      });
      setProviderModelsResult(result);
      const firstModel = result.models?.[0]?.id;
      if (result.ok && firstModel && (!cfg.model || !result.models?.some((model) => model.id === cfg.model))) {
        setCfg((current) => ({ ...current, model: firstModel }));
      }
    } catch (err) {
      setProviderModelsResult({
        ok: false,
        kind: 'unknown',
        latencyMs: 0,
        detail: err instanceof Error ? err.message : 'Model fetch failed.',
      });
    } finally {
      setFetchingProviderModels(false);
    }
  }

  return (
    <MotionModal open={open} onClose={onClose} className="modal-settings">
      <div role="dialog" aria-modal="true">
        <header className="modal-head">
          {welcome ? (
            <>
              <span className="kicker">{t('settings.welcomeKicker')}</span>
              <h2>{t('settings.welcomeTitle')}</h2>
              <p className="subtitle">{t('settings.welcomeSubtitle')}</p>
              {/* First-run users see a mini pet teaser inside the welcome
                  modal so adoption is part of the warm intro rather than
                  hidden behind another nav click. The chip nudges them
                  toward Pets without forcing them to leave the rest of
                  the welcome flow. */}
              <button
                type="button"
                className="welcome-pet-teaser"
                onClick={() => setActiveSection('pet')}
              >
                <span className="welcome-pet-glyph" aria-hidden>🐾</span>
                <span className="welcome-pet-copy">
                  <strong>{t('pet.welcomeTeaserTitle')}</strong>
                  <span>{t('pet.welcomeTeaserBody')}</span>
                </span>
                <span className="welcome-pet-cta">
                  {t('pet.welcomeTeaserCta')}
                  <Icon name="chevron-right" size={12} />
                </span>
              </button>
            </>
          ) : (
            <>
              <span className="kicker">{t('settings.kicker')}</span>
              <h2>{t('settings.title')}</h2>
              <p className="subtitle">{t('settings.subtitle')}</p>
            </>
          )}
        </header>

        <div className="modal-body">
          <aside className="settings-sidebar" aria-label="Settings sections">
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'execution' ? ' active' : ''}`}
              onClick={() => setActiveSection('execution')}
            >
              <Icon name="sliders" size={18} />
              <span>
                <strong>{t('settings.envConfigure')}</strong>
                <small>{t('settings.codeAgent')}</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'media' ? ' active' : ''}`}
              onClick={() => setActiveSection('media')}
            >
              <Icon name="image" size={18} />
              <span>
                <strong>{t('settings.mediaProviders')}</strong>
                <small>Image / video / audio</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'orbit' ? ' active' : ''}`}
              onClick={() => setActiveSection('orbit')}
            >
              <Icon name="refresh" size={18} />
              <span>
                <strong>Orbit</strong>
                <small>Daily activity summaries</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'memory' ? ' active' : ''}`}
              onClick={() => setActiveSection('memory')}
            >
              <Icon name="file" size={18} />
              <span>
                <strong>Memory</strong>
                <small>Persistent context</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'routines' ? ' active' : ''}`}
              onClick={() => setActiveSection('routines')}
            >
              <Icon name="history" size={18} />
              <span>
                <strong>Routines</strong>
                <small>Local scheduled runs</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'mcpClient' ? ' active' : ''}`}
              onClick={() => setActiveSection('mcpClient')}
            >
              <Icon name="link" size={18} />
              <span>
                <strong>MCP clients</strong>
                <small>External tool servers</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'language' ? ' active' : ''}`}
              onClick={() => setActiveSection('language')}
            >
              <Icon name="languages" size={18} />
              <span>
                <strong>{t('settings.language')}</strong>
                <small>{t('settings.languageHint')}</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'appearance' ? ' active' : ''}`}
              onClick={() => setActiveSection('appearance')}
            >
              <Icon name="sun-moon" size={18} />
              <span>
                <strong>{t('settings.appearance')}</strong>
                <small>{t('settings.appearanceHint')}</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'notifications' ? ' active' : ''}`}
              onClick={() => setActiveSection('notifications')}
            >
              <Icon name="bell" size={18} />
              <span>
                <strong>{t('settings.notifications')}</strong>
                <small>{t('settings.notificationsHint')}</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'pet' ? ' active' : ''}`}
              onClick={() => setActiveSection('pet')}
            >
              <Icon name="sparkles" size={18} />
              <span>
                <strong>{t('pet.navTitle')}</strong>
                <small>{t('pet.navHint')}</small>
              </span>
            </button>
            <button
              type="button"
              className={`settings-nav-item${activeSection === 'about' ? ' active' : ''}`}
              onClick={() => setActiveSection('about')}
            >
              <Icon name="settings" size={18} />
              <span>
                <strong>{t('settings.about')}</strong>
                <small>{t('settings.aboutHint')}</small>
              </span>
            </button>
          </aside>
          <div className="settings-content">
          {activeSection === 'execution' ? (
            <>
              <div
                className="seg-control"
                role="tablist"
                aria-label={t('settings.modeAria')}
                style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={cfg.mode === 'daemon'}
                  className={'seg-btn' + (cfg.mode === 'daemon' ? ' active' : '')}
                  disabled={!daemonLive}
                  onClick={() => setMode('daemon')}
                  title={
                    daemonLive
                      ? t('settings.modeDaemonHelp')
                      : t('settings.modeDaemonOffline')
                  }
                >
                  <span className="seg-title">{t('settings.modeDaemon')}</span>
                  <span className="seg-meta">
                    {daemonLive
                      ? t('settings.modeDaemonInstalledMeta', { count: installedCount })
                      : t('settings.modeDaemonOfflineMeta')}
                  </span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cfg.mode === 'api' && apiProtocol === 'anthropic'}
                  className={'seg-btn' + (cfg.mode === 'api' && apiProtocol === 'anthropic' ? ' active' : '')}
                  onClick={() => setApiProtocol('anthropic')}
                >
                  <span className="seg-title">Anthropic API</span>
                  <span className="seg-meta">/v1/messages</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cfg.mode === 'api' && apiProtocol === 'openai'}
                  className={'seg-btn' + (cfg.mode === 'api' && apiProtocol === 'openai' ? ' active' : '')}
                  onClick={() => setApiProtocol('openai')}
                >
                  <span className="seg-title">OpenAI API</span>
                  <span className="seg-meta">/v1/chat/completions</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={cfg.mode === 'api' && apiProtocol === 'ollama'}
                  className={'seg-btn' + (cfg.mode === 'api' && apiProtocol === 'ollama' ? ' active' : '')}
                  onClick={() => setApiProtocol('ollama')}
                >
                  <span className="seg-title">Ollama Cloud</span>
                  <span className="seg-meta">/api/chat</span>
                </button>
              </div>
              <div className={`settings-test-card${executionTest ? (executionTest.ok ? ' ok' : ' fail') : ''}`}>
                <div>
                  <strong>Connection test</strong>
                  <span>
                    {executionTest
                      ? executionTest.message
                      : 'Run a real local CLI or API reachability check before saving.'}
                  </span>
                  {executionTest?.details ? <small>{executionTest.details}</small> : null}
                </div>
                <button
                  type="button"
                  className="ghost"
                  onClick={runExecutionTest}
                  disabled={testingExecution || (cfg.mode === 'daemon' && !daemonLive)}
                >
                  {testingExecution ? 'Testing...' : 'Test'}
                </button>
              </div>
              {cfg.mode === 'daemon' ? (
            <section className="settings-section">
              <div className="section-head">
                <div>
                  <h3>{t('settings.codeAgent')}</h3>
                  <p className="hint">{t('settings.codeAgentHint')}</p>
                </div>
                <button
                  type="button"
                  className="ghost icon-btn"
                  onClick={onRefreshAgents}
                  title={t('settings.rescanTitle')}
                >
                  {t('settings.rescan')}
                </button>
              </div>
              {agents.length === 0 ? (
                <div className="empty-card">
                  {t('settings.noAgentsDetected')}
                </div>
              ) : (
                <div className="agent-grid">
                  {agents.map((a) => {
                    const active = cfg.agentId === a.id;
                    return (
                      <button
                        type="button"
                        key={a.id}
                        className={
                          'agent-card' +
                          (active ? ' active' : '') +
                          (a.available ? '' : ' disabled')
                        }
                        onClick={() =>
                          a.available && setCfg((c) => ({ ...c, agentId: a.id }))
                        }
                        disabled={!a.available}
                        aria-pressed={active}
                      >
                        <AgentIcon id={a.id} size={40} />
                        <div className="agent-card-body">
                          <div className="agent-card-name">{a.name}</div>
                          <div className="agent-card-meta">
                            {a.available ? (
                              a.version ? (
                                <span title={a.path ?? ''}>{a.version}</span>
                              ) : (
                                <span title={a.path ?? ''}>
                                  {t('common.installed')}
                                </span>
                              )
                            ) : (
                              <span className="muted">
                                {t('common.notInstalled')}
                              </span>
                            )}
                          </div>
                        </div>
                        {a.available ? (
                          <span
                            className={'status-dot' + (active ? ' active' : '')}
                            aria-hidden="true"
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
              {(() => {
                const selected = agents.find(
                  (a) => a.id === cfg.agentId && a.available,
                );
                if (!selected) return null;
                const hasModels =
                  Array.isArray(selected.models) && selected.models.length > 0;
                const hasReasoning =
                  Array.isArray(selected.reasoningOptions) &&
                  selected.reasoningOptions.length > 0;
                if (!hasModels && !hasReasoning) return null;
                const choice = cfg.agentModels?.[selected.id] ?? {};
                const setChoice = (
                  next: { model?: string; reasoning?: string },
                ) => {
                  setCfg((c) => {
                    const prev = c.agentModels?.[selected.id] ?? {};
                    return {
                      ...c,
                      agentModels: {
                        ...(c.agentModels ?? {}),
                        [selected.id]: { ...prev, ...next },
                      },
                    };
                  });
                };
                const modelValue =
                  choice.model ?? selected.models?.[0]?.id ?? '';
                const reasoningValue =
                  choice.reasoning ??
                  selected.reasoningOptions?.[0]?.id ?? '';
                const customActive =
                  hasModels && isCustomModel(modelValue, selected.models!);
                const selectValue = customActive
                  ? CUSTOM_MODEL_SENTINEL
                  : modelValue;
                return (
                  <div className="agent-model-row">
                    {hasModels ? (
                      <label className="field">
                        <span className="field-label">
                          {t('settings.modelPicker')}
                        </span>
                        <select
                          value={selectValue}
                          onChange={(e) => {
                            if (e.target.value === CUSTOM_MODEL_SENTINEL) {
                              // Switching to "Custom…" should clear the
                              // value so the input below opens empty for
                              // typing — keeping the previous live id
                              // would defeat the point.
                              setChoice({ model: '' });
                            } else {
                              setChoice({ model: e.target.value });
                            }
                          }}
                        >
                          {renderModelOptions(selected.models!)}
                          <option value={CUSTOM_MODEL_SENTINEL}>
                            {t('settings.modelCustom')}
                          </option>
                        </select>
                      </label>
                    ) : null}
                    {customActive ? (
                      <label className="field">
                        <span className="field-label">
                          {t('settings.modelCustomLabel')}
                        </span>
                        <input
                          type="text"
                          value={modelValue}
                          placeholder={t('settings.modelCustomPlaceholder')}
                          onChange={(e) =>
                            setChoice({ model: e.target.value.trim() })
                          }
                        />
                      </label>
                    ) : null}
                    {hasReasoning ? (
                      <label className="field">
                        <span className="field-label">
                          {t('settings.reasoningPicker')}
                        </span>
                        <select
                          value={reasoningValue}
                          onChange={(e) =>
                            setChoice({ reasoning: e.target.value })
                          }
                        >
                          {selected.reasoningOptions!.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                    <p className="hint">{t('settings.modelPickerHint')}</p>
                  </div>
                );
              })()}
            </section>
          ) : (
            <section className="settings-section">
              <div className="section-head">
                <h3>{apiProtocol === 'anthropic' ? 'Anthropic API' : apiProtocol === 'ollama' ? 'Ollama Cloud' : 'OpenAI API'}</h3>
              </div>
              <label className="field">
                <span className="field-label">Quick fill provider</span>
                <select
                  value={selectedProviderIndex >= 0 ? String(selectedProviderIndex) : ''}
                  onChange={(e) => {
                    if (e.target.value === '') {
                      setCfg((c) => ({ ...c, baseUrl: '', model: '', apiProviderBaseUrl: null }));
                      return;
                    }
                    const idx = Number(e.target.value);
                    if (!isNaN(idx) && protocolProviders[idx]) {
                      const p = protocolProviders[idx]!;
                      setCfg((c) => ({
                        ...c,
                        apiProtocol: p.protocol,
                        baseUrl: p.baseUrl,
                        model: p.model,
                        apiProviderBaseUrl: p.baseUrl,
                      }));
                    }
                  }}
                >
                  <option value="">Custom provider</option>
                  {protocolProviders.map((p, i) => (
                    <option key={p.label} value={i}>{p.label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span className="field-label">{t('settings.apiKey')}</span>
                <div className="field-row">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="sk-ant-..."
                    value={cfg.apiKey}
                    onChange={(e) => setCfg({ ...cfg, apiKey: e.target.value })}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="ghost icon-btn"
                    onClick={() => setShowApiKey((v) => !v)}
                    title={
                      showApiKey ? t('settings.hideKey') : t('settings.showKey')
                    }
                  >
                    {showApiKey ? t('settings.hide') : t('settings.show')}
                  </button>
                </div>
              </label>
              <label className="field">
                <span className="field-label">
                  {t('settings.model')}
                  <button
                    type="button"
                    className="ghost"
                    disabled={fetchingProviderModels || !cfg.baseUrl.trim()}
                    onClick={() => void runProviderModelsFetch()}
                    style={{ marginLeft: 8, padding: '2px 8px', fontSize: 11 }}
                  >
                    {fetchingProviderModels ? 'Fetching...' : 'Fetch models'}
                  </button>
                </span>
                <select
                  value={apiModelSelectValue}
                  onChange={(e) => {
                    if (e.target.value === CUSTOM_MODEL_SENTINEL) {
                      setCfg((c) => ({ ...c, model: '' }));
                    } else {
                      setCfg((c) => ({ ...c, model: e.target.value }));
                    }
                  }}
                >
                  {apiModelOptions.map((m) => (
                    <option value={m} key={m}>{m}</option>
                  ))}
                  <option value={CUSTOM_MODEL_SENTINEL}>{t('settings.modelCustom')}</option>
                </select>
              </label>
              {providerModelsResult ? (
                <p className={`hint${providerModelsResult.ok ? '' : ' error'}`}>
                  {providerModelsResult.ok
                    ? `Loaded ${providerModelsResult.models?.length ?? 0} model(s) in ${providerModelsResult.latencyMs}ms.`
                    : providerModelsResult.detail || `Could not fetch models (${providerModelsResult.kind}).`}
                </p>
              ) : null}
              {!selectedProvider ? (
                <p className="hint">These are suggested models for this protocol. Your provider may support different models.</p>
              ) : null}
              {apiModelCustom || apiModelSelectValue === CUSTOM_MODEL_SENTINEL ? (
                <label className="field">
                  <span className="field-label">{t('settings.modelCustomLabel')}</span>
                  <input
                    type="text"
                    value={cfg.model}
                    placeholder={t('settings.modelCustomPlaceholder')}
                    onChange={(e) => setCfg({ ...cfg, model: e.target.value.trim() })}
                  />
                </label>
              ) : null}
              <label className="field">
                <span className="field-label">{t('settings.baseUrl')}</span>
                <input
                  type="text"
                  value={cfg.baseUrl}
                  onChange={(e) => setCfg({ ...cfg, baseUrl: e.target.value, apiProviderBaseUrl: null })}
                />
              </label>
              <p className="hint">{t('settings.apiHint')}</p>
            </section>
          )}
            </>
          ) : null}

          {activeSection === 'media' ? <MediaProvidersSection cfg={cfg} setCfg={setCfg} /> : null}

          {activeSection === 'orbit' ? <OrbitSection cfg={cfg} setCfg={setCfg} /> : null}

          {activeSection === 'memory' ? <MemorySection /> : null}

          {activeSection === 'routines' ? <RoutinesSection /> : null}

          {activeSection === 'mcpClient' ? <McpClientSection /> : null}

          {activeSection === 'language' ? (
          <section className="settings-section">
            <div className="section-head">
              <div>
                <h3>{t('settings.language')}</h3>
                <p className="hint">{t('settings.languageHint')}</p>
              </div>
            </div>
            <div className="settings-language-picker" ref={languageRef}>
              <button
                type="button"
                className="settings-language-button"
                aria-haspopup="menu"
                aria-expanded={languageOpen}
                onClick={() => setLanguageOpen((v) => !v)}
              >
                <span className="settings-language-icon" aria-hidden="true">
                  <Icon name="languages" size={22} strokeWidth={1.8} />
                </span>
                <span className="settings-language-text">
                  <span className="settings-language-title">
                    {LOCALE_LABEL[locale]}
                  </span>
                  <span className="settings-language-code">{locale}</span>
                </span>
                <Icon name="chevron-down" size={16} />
              </button>
              {languageOpen && languageMenuRect ? (() => {
                const spaceBelow = window.innerHeight - languageMenuRect.bottom;
                const spaceAbove = languageMenuRect.top;
                // Prefer downward if at least 200px available (enough for ~5 options)
                const openDownward = spaceBelow >= spaceAbove || spaceBelow >= 200;
                return (
                <div
                  ref={langLayer.contentRef}
                  className="settings-language-menu"
                  role="menu"
                  style={{
                    zIndex: langLayer.zIndex,
                    top: openDownward ? languageMenuRect.bottom + 6 : undefined,
                    bottom: openDownward
                      ? undefined
                      : window.innerHeight - languageMenuRect.top + 6,
                    left: languageMenuRect.left,
                    width: languageMenuRect.width,
                    '--menu-available-h': `${(openDownward ? spaceBelow : spaceAbove) - 6}px`,
                  } as React.CSSProperties}
                >
                  {LOCALES.map((code) => {
                    const active = locale === code;
                    return (
                      <button
                        key={code}
                        type="button"
                        role="menuitemradio"
                        aria-checked={active}
                        className={`settings-language-option${active ? ' active' : ''}`}
                        onClick={() => {
                          setLocale(code as Locale);
                          setLanguageOpen(false);
                        }}
                      >
                        <span>
                          <span className="settings-language-option-title">
                            {LOCALE_LABEL[code]}
                          </span>
                          <span className="settings-language-option-code">
                            {code}
                          </span>
                        </span>
                        {active ? <Icon name="check" size={16} /> : null}
                      </button>
                    );
                  })}
                </div>
                );
              })() : null}
            </div>
          </section>
          ) : null}

          {activeSection === 'appearance' ? (
            <AppearanceSection cfg={cfg} setCfg={setCfg} />
          ) : null}

          {activeSection === 'notifications' ? (
            <NotificationsSection cfg={cfg} setCfg={setCfg} />
          ) : null}

          {activeSection === 'pet' ? (
            <PetSettings cfg={cfg} setCfg={setCfg} />
          ) : null}

          {activeSection === 'about' ? (
            <section className="settings-section">
              <div className="section-head">
                <div>
                  <h3>{t('settings.about')}</h3>
                  <p className="hint">{t('settings.aboutHint')}</p>
                </div>
              </div>
              {appVersionInfo ? (
                <dl className="settings-about-list">
                  <div>
                    <dt>{t('settings.appVersion')}</dt>
                    <dd>{appVersionInfo.version}</dd>
                  </div>
                  <div>
                    <dt>{t('settings.appChannel')}</dt>
                    <dd>{appVersionInfo.channel}</dd>
                  </div>
                  <div>
                    <dt>{t('settings.appRuntime')}</dt>
                    <dd>
                      {appVersionInfo.packaged
                        ? t('settings.runtimePackaged')
                        : t('settings.runtimeDevelopment')}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('settings.appPlatform')}</dt>
                    <dd>{appVersionInfo.platform}</dd>
                  </div>
                  <div>
                    <dt>{t('settings.appArchitecture')}</dt>
                    <dd>{appVersionInfo.arch}</dd>
                  </div>
                </dl>
              ) : (
                <div className="empty-card">{t('settings.versionUnavailable')}</div>
              )}
            </section>
          ) : null}
          </div>
        </div>

        <footer className="modal-foot">
          <button type="button" className="ghost" onClick={onClose}>
            {welcome ? t('settings.skipForNow') : t('common.cancel')}
          </button>
          <button
            type="button"
            className="primary"
            disabled={!canSave}
            onClick={() => onSave(cfg)}
          >
            {welcome ? t('settings.getStarted') : t('common.save')}
          </button>
        </footer>
      </div>
    </MotionModal>
  );
}

function MediaProvidersSection({
  cfg,
  setCfg,
}: {
  cfg: AppConfig;
  setCfg: Dispatch<SetStateAction<AppConfig>>;
}) {
  const { t } = useI18n();
  const providers = MEDIA_PROVIDERS
    .filter((p) => p.settingsVisible !== false)
    .slice()
    .sort((a, b) => {
      const aEntry = cfg.mediaProviders?.[a.id];
      const bEntry = cfg.mediaProviders?.[b.id];
      const aConfigured = Boolean(aEntry?.apiKey.trim() || aEntry?.baseUrl.trim() || aEntry?.model?.trim());
      const bConfigured = Boolean(bEntry?.apiKey.trim() || bEntry?.baseUrl.trim() || bEntry?.model?.trim());
      if (aConfigured !== bConfigured) return aConfigured ? -1 : 1;
      if (a.integrated !== b.integrated) return a.integrated ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  const updateProvider = (
    provider: MediaProvider,
    patch: { apiKey?: string; baseUrl?: string; model?: string },
  ) => {
    setCfg((curr) => {
      const prev = curr.mediaProviders?.[provider.id] ?? { apiKey: '', baseUrl: '', model: '' };
      const next = { ...prev, ...patch };
      const map = { ...(curr.mediaProviders ?? {}) };
      if (!next.apiKey.trim() && !next.baseUrl.trim() && !next.model?.trim()) {
        delete map[provider.id];
      } else {
        map[provider.id] = next;
      }
      return { ...curr, mediaProviders: map };
    });
  };

  return (
    <section className="settings-section">
      <div className="section-head">
        <div>
          <h3>{t('settings.mediaProviders')}</h3>
          <p className="hint">{t('settings.mediaProvidersHint')}</p>
        </div>
      </div>
      <div className="media-provider-list">
        {providers.map((provider) => {
          const entry = cfg.mediaProviders?.[provider.id] ?? { apiKey: '', baseUrl: '', model: '' };
          const configured = Boolean(entry.apiKey.trim() || entry.baseUrl.trim() || entry.model?.trim());
          const disabled = !provider.integrated;
          return (
            <div key={provider.id} className={`media-provider-row${provider.integrated ? '' : ' pending'}`}>
              <div className="media-provider-head">
                <div className="media-provider-meta">
                  <span className="media-provider-name">{provider.label}</span>
                  <span className="media-provider-hint">{provider.hint}</span>
                </div>
                <div className="media-provider-badges">
                  <span className={`media-provider-badge ${provider.integrated ? 'integrated' : 'unsupported'}`}>
                    {provider.integrated ? 'Ready' : 'Not available'}
                  </span>
                  {configured ? (
                    <span className="media-provider-badge on">
                      {t('settings.mediaProviderConfigured')}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="media-provider-body">
                <input
                  type="password"
                  value={entry.apiKey}
                  placeholder={t('settings.mediaProviderPlaceholder')}
                  aria-label={`${provider.label} ${t('settings.mediaProviderApiKey')}`}
                  disabled={disabled}
                  onChange={(e) => updateProvider(provider, { apiKey: e.target.value })}
                />
                <input
                  value={entry.baseUrl}
                  placeholder={provider.defaultBaseUrl || t('settings.mediaProviderBaseUrlPlaceholder')}
                  aria-label={`${provider.label} ${t('settings.mediaProviderBaseUrl')}`}
                  disabled={disabled}
                  onChange={(e) => updateProvider(provider, { baseUrl: e.target.value })}
                />
                {provider.supportsCustomModel ? (
                  <input
                    value={entry.model ?? ''}
                    placeholder="Model ID (optional)"
                    aria-label={`${provider.label} model ID`}
                    disabled={disabled}
                    onChange={(e) => updateProvider(provider, { model: e.target.value })}
                  />
                ) : null}
                <button
                  type="button"
                  className="ghost"
                  disabled={!configured}
                  onClick={() => updateProvider(provider, { apiKey: '', baseUrl: '', model: '' })}
                >
                  {t('settings.mediaProviderClear')}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const THEMES: Array<{ value: AppTheme; labelKey: 'settings.themeSystem' | 'settings.themeLight' | 'settings.themeDark' }> = [
  { value: 'system', labelKey: 'settings.themeSystem' },
  { value: 'light', labelKey: 'settings.themeLight' },
  { value: 'dark', labelKey: 'settings.themeDark' },
];

function AppearanceSection({
  cfg,
  setCfg,
}: {
  cfg: AppConfig;
  setCfg: Dispatch<SetStateAction<AppConfig>>;
}) {
  const { t } = useI18n();
  const current = cfg.theme ?? 'system';
  const accent = normalizeAccentColor(cfg.accentColor) ?? '#ed6f5c';

  // Apply the draft theme immediately so the user sees a live preview
  // before hitting Save. SettingsDialog's cleanup reverts this on cancel.
  useLayoutEffect(() => {
    if (current === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', current);
    }
    applyAccentColor(accent);
  }, [current, accent]);

  return (
    <section className="settings-section">
      <div className="section-head">
        <div>
          <h3>{t('settings.appearance')}</h3>
          <p className="hint">{t('settings.appearanceHint')}</p>
        </div>
      </div>
      <div className="seg-control" role="group" aria-label={t('settings.appearance')} style={{ '--seg-cols': THEMES.length } as React.CSSProperties}>
        {THEMES.map(({ value, labelKey }) => (
          <button
            key={value}
            type="button"
            className={'seg-btn' + (current === value ? ' active' : '')}
            aria-pressed={current === value}
            onClick={() => setCfg((c) => ({ ...c, theme: value }))}
          >
            <span className="seg-title">{t(labelKey)}</span>
          </button>
        ))}
      </div>
      <label className="field accent-field">
        <span className="field-label">Accent color</span>
        <div className="field-row">
          <input
            type="color"
            value={accent}
            aria-label="Accent color"
            onChange={(event) => setCfg((c) => ({ ...c, accentColor: event.target.value }))}
          />
          <input
            value={cfg.accentColor ?? accent}
            placeholder="#ed6f5c"
            onChange={(event) => setCfg((c) => ({ ...c, accentColor: event.target.value }))}
          />
        </div>
      </label>
    </section>
  );
}

function OrbitSection({
  cfg,
  setCfg,
}: {
  cfg: AppConfig;
  setCfg: Dispatch<SetStateAction<AppConfig>>;
}) {
  const orbit = cfg.orbit ?? { enabled: false, time: '08:00', templateSkillId: 'orbit-general' };
  const [status, setStatus] = useState<any | null>(null);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const res = await fetch('/api/orbit/status');
        if (!res.ok) return;
        const data = await res.json();
        if (alive) setStatus(data);
      } catch {
        // Daemon may be offline while editing settings.
      }
    })();
    return () => {
      alive = false;
    };
  }, [running]);

  const updateOrbit = (patch: Partial<NonNullable<AppConfig['orbit']>>) => {
    setCfg((current) => ({
      ...current,
      orbit: {
        enabled: current.orbit?.enabled ?? false,
        time: current.orbit?.time ?? '08:00',
        templateSkillId: current.orbit?.templateSkillId ?? 'orbit-general',
        ...patch,
      },
    }));
  };

  const runNow = async () => {
    setRunning(true);
    setMessage(null);
    try {
      const res = await fetch('/api/orbit/run', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setMessage(data?.projectId ? `Started Orbit project ${data.projectId}.` : 'Orbit run started.');
    } catch {
      setMessage('Could not start Orbit from the local daemon.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="settings-section orbit-section">
      <div className="section-head">
        <div>
          <h3>Orbit</h3>
          <p className="hint">Generate scheduled or manual activity summaries from connected sources.</p>
        </div>
        <button type="button" className="primary" disabled={running} onClick={() => void runNow()}>
          {running ? 'Starting…' : 'Run now'}
        </button>
      </div>
      {message ? <p className="hint">{message}</p> : null}
      <label className="field checkbox-field">
        <input
          type="checkbox"
          checked={orbit.enabled}
          onChange={(e) => updateOrbit({ enabled: e.target.checked })}
        />
        <span>Run daily summary automatically</span>
      </label>
      <label className="field">
        <span className="field-label">Run time</span>
        <input
          type="time"
          value={orbit.time}
          onChange={(e) => updateOrbit({ time: e.target.value || '08:00' })}
        />
      </label>
      <label className="field">
        <span className="field-label">Template skill</span>
        <input
          type="text"
          value={orbit.templateSkillId ?? 'orbit-general'}
          onChange={(e) => updateOrbit({ templateSkillId: e.target.value.trim() || 'orbit-general' })}
        />
      </label>
      <div className="settings-card">
        <strong>Status</strong>
        <p className="hint">
          {status?.running
            ? 'Orbit is currently running.'
            : status?.lastRun?.completedAt
              ? `Last run completed at ${new Date(status.lastRun.completedAt).toLocaleString()}.`
              : 'No completed Orbit run yet.'}
        </p>
        {status?.nextRunAt ? (
          <p className="hint">Next scheduled run: {new Date(status.nextRunAt).toLocaleString()}</p>
        ) : null}
      </div>
    </section>
  );
}

function NotificationsSection({
  cfg,
  setCfg,
}: {
  cfg: AppConfig;
  setCfg: Dispatch<SetStateAction<AppConfig>>;
}) {
  const { t } = useI18n();
  const notif = cfg.notifications ?? DEFAULT_NOTIFICATIONS;
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    () => notificationPermission(),
  );
  const [testStatus, setTestStatus] = useState<ReturnType<typeof testNotificationStatusText> | null>(null);

  const updateNotif = (
    patch: Partial<NonNullable<AppConfig['notifications']>>,
  ) => {
    setCfg((c) => ({
      ...c,
      notifications: { ...DEFAULT_NOTIFICATIONS, ...(c.notifications ?? {}), ...patch },
    }));
  };

  const toggleSound = () => {
    const next = !notif.soundEnabled;
    updateNotif({ soundEnabled: next });
    // Give the user immediate audible feedback when turning the master
    // switch on so they know which sound they're signing up for. Resuming
    // the AudioContext also bakes in their gesture for later auto-plays.
    if (next) playSound(notif.successSoundId);
  };

  const toggleDesktop = async () => {
    if (notif.desktopEnabled) {
      updateNotif({ desktopEnabled: false });
      return;
    }
    const result = await requestNotificationPermission();
    setPermission(result);
    if (result === 'granted') {
      updateNotif({ desktopEnabled: true });
    } else {
      updateNotif({ desktopEnabled: false });
    }
  };

  const sendTestNotification = async () => {
    const result = await showCompletionNotification({
      status: 'succeeded',
      title: t('notify.successTitle'),
      body: t('notify.successBody'),
    });
    setPermission(notificationPermission());
    setTestStatus(testNotificationStatusText(result));
  };

  return (
    <section className="settings-section">
      <div className="section-head">
        <div>
          <h3>{t('settings.notifications')}</h3>
          <p className="hint">{t('settings.notificationsHint')}</p>
        </div>
      </div>

      <div className="settings-subsection">
        <div className="section-head">
          <div>
            <h4>{t('settings.notifyCompletionSound')}</h4>
            <p className="hint">{t('settings.notifyCompletionSoundHint')}</p>
          </div>
        </div>
        <div className="seg-control" role="group" aria-label={t('settings.notifyCompletionSound')} style={{ '--seg-cols': 1 } as React.CSSProperties}>
          <button
            type="button"
            className={'seg-btn' + (notif.soundEnabled ? ' active' : '')}
            aria-pressed={notif.soundEnabled}
            onClick={toggleSound}
          >
            <span className="seg-title">{notif.soundEnabled ? t('common.active') : t('common.offline')}</span>
          </button>
        </div>

        {notif.soundEnabled ? (
          <>
            <div className="settings-field">
              <label>{t('settings.notifySuccessSound')}</label>
              <div className="seg-control" role="group" aria-label={t('settings.notifySuccessSound')} style={{ '--seg-cols': SUCCESS_SOUNDS.length } as React.CSSProperties}>
                {SUCCESS_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    type="button"
                    className={'seg-btn' + (notif.successSoundId === sound.id ? ' active' : '')}
                    aria-pressed={notif.successSoundId === sound.id}
                    onClick={() => {
                      updateNotif({ successSoundId: sound.id });
                      playSound(sound.id);
                    }}
                  >
                    <span className="seg-title">{t(sound.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="settings-field">
              <label>{t('settings.notifyFailureSound')}</label>
              <div className="seg-control" role="group" aria-label={t('settings.notifyFailureSound')} style={{ '--seg-cols': FAILURE_SOUNDS.length } as React.CSSProperties}>
                {FAILURE_SOUNDS.map((sound) => (
                  <button
                    key={sound.id}
                    type="button"
                    className={'seg-btn' + (notif.failureSoundId === sound.id ? ' active' : '')}
                    aria-pressed={notif.failureSoundId === sound.id}
                    onClick={() => {
                      updateNotif({ failureSoundId: sound.id });
                      playSound(sound.id);
                    }}
                  >
                    <span className="seg-title">{t(sound.labelKey)}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </div>

      <div className="settings-subsection">
        <div className="section-head">
          <div>
            <h4>{t('settings.notifyDesktop')}</h4>
            <p className="hint">{t('settings.notifyDesktopHint')}</p>
          </div>
        </div>
        <div className="seg-control" role="group" aria-label={t('settings.notifyDesktop')} style={{ '--seg-cols': 1 } as React.CSSProperties}>
          <button
            type="button"
            className={'seg-btn' + (notif.desktopEnabled ? ' active' : '')}
            aria-pressed={notif.desktopEnabled}
            disabled={permission === 'unsupported'}
            onClick={() => { void toggleDesktop(); }}
          >
            <span className="seg-title">{notif.desktopEnabled ? t('common.active') : t('common.offline')}</span>
          </button>
        </div>
        {permission === 'unsupported' ? (
          <p className="hint">{t('settings.notifyDesktopUnsupported')}</p>
        ) : null}
        {permission === 'denied' ? (
          <p className="hint">{t('settings.notifyDesktopBlocked')}</p>
        ) : null}
        {notif.desktopEnabled && permission === 'granted' ? (
          <>
            <button type="button" className="ghost" onClick={() => { void sendTestNotification(); }}>
              {t('settings.notifyTest')}
            </button>
            {testStatus ? <p className="hint" role="status">{t(testStatus)}</p> : null}
          </>
        ) : null}
      </div>
    </section>
  );
}

function testNotificationStatusText(
  result: Awaited<ReturnType<typeof showCompletionNotification>>,
):
  | 'settings.notifyTestSent'
  | 'settings.notifyDesktopBlocked'
  | 'settings.notifyDesktopUnsupported'
  | 'settings.notifyTestFailed' {
  if (result === 'shown') return 'settings.notifyTestSent';
  if (result === 'permission-denied') return 'settings.notifyDesktopBlocked';
  if (result === 'unsupported') return 'settings.notifyDesktopUnsupported';
  return 'settings.notifyTestFailed';
}
