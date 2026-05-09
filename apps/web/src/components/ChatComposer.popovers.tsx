import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { springs } from '../motion';
import type { Dict } from '../i18n/types';
import type { ChatCommentAttachment } from '../types';
import type { SlashCommand } from './ChatComposer.commands';
import {
  contextDetailRows,
  contextHelp,
  groupMentionItems,
  mentionKindLabel,
  type MentionItem,
} from './ChatComposer.mentions';
import { Icon } from './Icon';

type TranslateFn = (key: keyof Dict, vars?: Record<string, string | number>) => string;

export function ContextInspector({
  items,
  commentAttachments,
  inspected,
  onInspect,
  onClearInspect,
  onRemove,
}: {
  items: MentionItem[];
  commentAttachments: ChatCommentAttachment[];
  inspected: MentionItem | null;
  onInspect: (item: MentionItem) => void;
  onClearInspect: () => void;
  onRemove: (item: MentionItem) => void;
}) {
  const ambiguous = items.some((item) => contextDetailRows(item, commentAttachments).length <= 1);
  return (
    <div className="context-inspector" data-testid="context-inspector">
      <div className="context-inspector-row">
        <span className="context-inspector-label">Context</span>
        <AnimatePresence>
          {items.map((item) => (
            <motion.span
              key={`${item.kind}:${item.token}`}
              className={`context-chip ${item.kind}`}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
              exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
            >
              <button
                type="button"
                className="context-chip-main"
                onClick={() => onInspect(item)}
                title={contextHelp(item)}
              >
                <Icon name={item.icon} size={12} />
                <span>{item.title}</span>
              </button>
              <button
                type="button"
                className="context-chip-remove"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${item.title}`}
              >
                <Icon name="close" size={10} />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>
      </div>
      {inspected ? (
        <div className="context-inspector-detail">
          <div className="context-inspector-detail-copy">
            <strong>@{inspected.token}</strong>
            <span>{contextHelp(inspected)}</span>
            <dl>
              {contextDetailRows(inspected, commentAttachments).map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <button type="button" className="ghost" onClick={onClearInspect}>
            Close
          </button>
        </div>
      ) : ambiguous ? (
        <div className="context-inspector-empty">
          Select a context chip to confirm exactly what the agent will receive.
        </div>
      ) : null}
    </div>
  );
}

export function SlashPopover({
  commands,
  activeIndex,
  onPick,
  onHover,
  t,
}: {
  commands: SlashCommand[];
  activeIndex: number;
  onPick: (cmd: SlashCommand) => void;
  onHover: (index: number) => void;
  t: TranslateFn;
}) {
  return (
    <div
      className="slash-popover"
      data-testid="slash-popover"
      role="listbox"
      aria-label={t('pet.slashPopoverAria')}
    >
      <div className="slash-popover-head">
        <span>{t('pet.slashPopoverTitle')}</span>
        <span className="slash-popover-hint">{t('pet.slashPopoverHint')}</span>
      </div>
      {commands.map((cmd, idx) => {
        const active = idx === activeIndex;
        return (
          <button
            key={cmd.id}
            type="button"
            role="option"
            aria-selected={active}
            className={`slash-item${active ? ' active' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
            }}
            onMouseEnter={() => onHover(idx)}
            onClick={() => onPick(cmd)}
          >
            <span className="slash-item-icon" aria-hidden>
              <Icon name={cmd.icon} size={13} />
            </span>
            <span className="slash-item-body">
              <span className="slash-item-row">
                <code className="slash-item-label">{cmd.label}</code>
                {cmd.argHint ? (
                  <span className="slash-item-arg">{cmd.argHint}</span>
                ) : null}
              </span>
              <span className="slash-item-desc">
                {cmd.descKey ? t(cmd.descKey) : cmd.descText}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export function MentionPopover({
  items,
  activeIndex,
  onPick,
}: {
  items: MentionItem[];
  activeIndex: number;
  onPick: (item: MentionItem) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const grouped = groupMentionItems(items);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0;
  }, [items]);
  useEffect(() => {
    if (!ref.current) return;
    const active = ref.current.querySelector<HTMLElement>('.mention-item.active');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);
  return (
    <div
      className="mention-popover"
      data-testid="mention-popover"
      ref={ref}
      role="listbox"
    >
      {grouped.map((group) => (
        <div key={group.kind} className="mention-group">
          <div className="mention-group-label">{mentionKindLabel(group.kind)}</div>
          {group.items.map(({ item, index }) => {
            const active = index === activeIndex;
            return (
              <button
                key={item.id}
                role="option"
                aria-selected={active}
                className={`mention-item ${item.kind}${active ? ' active' : ''}`}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => onPick(item)}
              >
                <span className="mention-item-icon" aria-hidden>
                  <Icon name={item.icon} size={13} />
                </span>
                <span className="mention-item-body">
                  <span className="mention-item-title">{item.title}</span>
                  <span className="mention-item-subtitle">{item.subtitle}</span>
                </span>
                <code>@{item.token}</code>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
