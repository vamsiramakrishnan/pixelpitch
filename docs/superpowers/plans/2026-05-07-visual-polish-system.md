# Visual Polish System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a disciplined motion and layout polish system to the Pixelpitch web app using Framer Motion, starting from the surfaces users touch every minute (composer, chat, panels) and working outward.

**Architecture:** Single new dependency (framer-motion). Shared motion primitives in `src/motion/`. Existing components gain thin Framer wrappers — no rewrites. CSS ambient effects extend `index.css`. Every Framer animation respects `prefers-reduced-motion`.

**Tech Stack:** Framer Motion 11+, React 18, CSS custom properties, existing `index.css` design token system.

---

## File Map

| Path | Action | Responsibility |
|------|--------|---------------|
| `apps/web/package.json` | Modify | Add `framer-motion` dependency |
| `apps/web/src/motion/springs.ts` | Create | Named spring configs |
| `apps/web/src/motion/variants.ts` | Create | Reusable Framer variant sets |
| `apps/web/src/motion/reduced-motion.ts` | Create | Reduced-motion utility hook + helpers |
| `apps/web/src/motion/index.ts` | Create | Barrel export |
| `apps/web/src/motion/motion.test.ts` | Create | Unit tests for motion utilities |
| `apps/web/src/components/MotionModal.tsx` | Create | Shared animated modal wrapper |
| `apps/web/src/components/ChatComposer.tsx` | Modify | Auto-resize, send/stop morph, chip animations |
| `apps/web/src/components/ChatPane.tsx` | Modify | Message entrance, example stagger, segment tabs |
| `apps/web/src/components/ProjectView.tsx` | Modify | Panel depth, composer surface |
| `apps/web/src/components/PreviewModal.tsx` | Modify | Use MotionModal wrapper |
| `apps/web/src/components/SettingsDialog.tsx` | Modify | Use MotionModal wrapper |
| `apps/web/src/index.css` | Modify | User msg tint, composer glow, streaming cursor, glass header, segment tabs, panel depth |

---

### Task 1: Install Framer Motion

**Files:**
- Modify: `apps/web/package.json`

- [ ] **Step 1: Install framer-motion**

Run from the repo root:
```bash
cd apps/web && pnpm add framer-motion
```

- [ ] **Step 2: Verify installation**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS (no type errors from the new dependency)

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/node_modules/.package-lock.json
git commit -m "feat(web): add framer-motion dependency for motion polish system"
```

Note: The lockfile at the repo root (`pnpm-lock.yaml`) will also need staging.

---

### Task 2: Create Motion Primitives — Springs

**Files:**
- Create: `apps/web/src/motion/springs.ts`
- Create: `apps/web/src/motion/motion.test.ts`

- [ ] **Step 1: Write the test**

Create `apps/web/src/motion/motion.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { springs } from './springs';

describe('springs', () => {
  it('exports snappy, gentle, and bouncy configs', () => {
    expect(springs.snappy).toMatchObject({
      type: 'spring',
      stiffness: expect.any(Number),
      damping: expect.any(Number),
    });
    expect(springs.gentle).toMatchObject({
      type: 'spring',
      stiffness: expect.any(Number),
      damping: expect.any(Number),
    });
    expect(springs.bouncy).toMatchObject({
      type: 'spring',
      stiffness: expect.any(Number),
      damping: expect.any(Number),
    });
  });

  it('snappy is stiffer than gentle', () => {
    expect(springs.snappy.stiffness).toBeGreaterThan(springs.gentle.stiffness);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pixelpitch/web test -- src/motion/motion.test.ts`
Expected: FAIL — module `./springs` not found

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/motion/springs.ts`:

```typescript
import type { Transition } from 'framer-motion';

export const springs = {
  snappy: {
    type: 'spring' as const,
    stiffness: 500,
    damping: 30,
    mass: 0.8,
  },
  gentle: {
    type: 'spring' as const,
    stiffness: 260,
    damping: 26,
    mass: 1,
  },
  bouncy: {
    type: 'spring' as const,
    stiffness: 400,
    damping: 18,
    mass: 0.6,
  },
} satisfies Record<string, Transition>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pixelpitch/web test -- src/motion/motion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/motion/springs.ts apps/web/src/motion/motion.test.ts
git commit -m "feat(web): add motion spring configs (snappy, gentle, bouncy)"
```

---

### Task 3: Create Motion Primitives — Variants

**Files:**
- Create: `apps/web/src/motion/variants.ts`
- Modify: `apps/web/src/motion/motion.test.ts`

- [ ] **Step 1: Write the test**

Append to `apps/web/src/motion/motion.test.ts`:

```typescript
import { variants } from './variants';

describe('variants', () => {
  it('fadeUp has initial and animate states', () => {
    expect(variants.fadeUp.initial).toMatchObject({ opacity: 0, y: expect.any(Number) });
    expect(variants.fadeUp.animate).toMatchObject({ opacity: 1, y: 0 });
  });

  it('fadeIn has initial and animate states', () => {
    expect(variants.fadeIn.initial).toMatchObject({ opacity: 0 });
    expect(variants.fadeIn.animate).toMatchObject({ opacity: 1 });
  });

  it('scaleIn has initial and animate states', () => {
    expect(variants.scaleIn.initial).toMatchObject({ opacity: 0, scale: expect.any(Number) });
    expect(variants.scaleIn.animate).toMatchObject({ opacity: 1, scale: 1 });
  });

  it('staggerParent has staggerChildren in animate.transition', () => {
    const anim = variants.staggerParent.animate as { transition: { staggerChildren: number } };
    expect(anim.transition.staggerChildren).toBeGreaterThan(0);
  });

  it('all variants include exit states', () => {
    expect(variants.fadeUp.exit).toBeDefined();
    expect(variants.fadeIn.exit).toBeDefined();
    expect(variants.scaleIn.exit).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pixelpitch/web test -- src/motion/motion.test.ts`
Expected: FAIL — module `./variants` not found

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/motion/variants.ts`:

```typescript
import type { Variants } from 'framer-motion';
import { springs } from './springs';

export const variants = {
  fadeUp: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: springs.gentle },
    exit: { opacity: 0, y: 4, transition: { duration: 0.12 } },
  },

  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.16 } },
    exit: { opacity: 0, transition: { duration: 0.1 } },
  },

  scaleIn: {
    initial: { opacity: 0, scale: 0.96 },
    animate: { opacity: 1, scale: 1, transition: springs.gentle },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.12 } },
  },

  popoverIn: {
    initial: { opacity: 0, y: -4, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: springs.snappy },
    exit: { opacity: 0, y: -2, scale: 0.98, transition: { duration: 0.1 } },
  },

  staggerParent: {
    initial: {},
    animate: { transition: { staggerChildren: 0.04 } },
    exit: {},
  },

  staggerParentFast: {
    initial: {},
    animate: { transition: { staggerChildren: 0.03 } },
    exit: {},
  },
} satisfies Record<string, Variants>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pixelpitch/web test -- src/motion/motion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/motion/variants.ts apps/web/src/motion/motion.test.ts
git commit -m "feat(web): add motion variant sets (fadeUp, fadeIn, scaleIn, popoverIn, stagger)"
```

---

### Task 4: Create Motion Primitives — Reduced Motion Helpers

**Files:**
- Create: `apps/web/src/motion/reduced-motion.ts`
- Modify: `apps/web/src/motion/motion.test.ts`

- [ ] **Step 1: Write the test**

Append to `apps/web/src/motion/motion.test.ts`:

```typescript
import { instantTransition, safeTransition, skipVariants } from './reduced-motion';

describe('reduced-motion helpers', () => {
  it('instantTransition returns duration 0', () => {
    expect(instantTransition).toMatchObject({ duration: 0 });
  });

  it('safeTransition returns instant when reduced', () => {
    const original = { type: 'spring' as const, stiffness: 500 };
    expect(safeTransition(original, true)).toMatchObject({ duration: 0 });
    expect(safeTransition(original, false)).toMatchObject({ type: 'spring' });
  });

  it('skipVariants resolves to visible, no motion', () => {
    expect(skipVariants.initial).toMatchObject({ opacity: 1 });
    expect(skipVariants.animate).toMatchObject({ opacity: 1 });
    expect(skipVariants.exit).toMatchObject({ opacity: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @pixelpitch/web test -- src/motion/motion.test.ts`
Expected: FAIL — module `./reduced-motion` not found

- [ ] **Step 3: Write the implementation**

Create `apps/web/src/motion/reduced-motion.ts`:

```typescript
import { useReducedMotion } from 'framer-motion';
import type { Variants, Transition } from 'framer-motion';

export { useReducedMotion };

export const instantTransition: Transition = { duration: 0 };

export function safeTransition(
  transition: Transition,
  prefersReduced: boolean,
): Transition {
  return prefersReduced ? instantTransition : transition;
}

export const skipVariants: Variants = {
  initial: { opacity: 1 },
  animate: { opacity: 1, transition: instantTransition },
  exit: { opacity: 0, transition: instantTransition },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @pixelpitch/web test -- src/motion/motion.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/motion/reduced-motion.ts apps/web/src/motion/motion.test.ts
git commit -m "feat(web): add reduced-motion helpers for accessibility"
```

---

### Task 5: Create Motion Barrel Export

**Files:**
- Create: `apps/web/src/motion/index.ts`

- [ ] **Step 1: Create barrel export**

Create `apps/web/src/motion/index.ts`:

```typescript
export { springs } from './springs';
export { variants } from './variants';
export { useReducedMotion, instantTransition, safeTransition, skipVariants } from './reduced-motion';
```

- [ ] **Step 2: Verify typecheck passes**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 3: Run all motion tests**

Run: `pnpm --filter @pixelpitch/web test -- src/motion/motion.test.ts`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/motion/index.ts
git commit -m "feat(web): add motion barrel export"
```

---

### Task 6: CSS — Composer Streaming Glow + Cursor Blink

**Files:**
- Modify: `apps/web/src/index.css` (lines ~872–895 for composer, plus new keyframes)

This task adds the CSS-only ambient effects that don't need Framer Motion. Components will apply the classes in later tasks.

- [ ] **Step 1: Add composer streaming glow keyframe**

In `apps/web/src/index.css`, after the existing `.composer.drag-active .composer-shell` rule (line ~898), add:

```css
.composer.streaming .composer-shell {
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent);
  animation: composer-stream-glow 2s ease-in-out infinite;
}
@keyframes composer-stream-glow {
  0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 8%, transparent); }
  50% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 16%, transparent); }
}
```

- [ ] **Step 2: Add streaming cursor blink keyframe**

After the new composer-stream-glow rules, add:

```css
.streaming-cursor::after {
  content: '';
  display: inline-block;
  width: 1.5px;
  height: 0.9em;
  background: var(--text-muted);
  margin-left: 1px;
  vertical-align: text-bottom;
  animation: cursor-blink 1s steps(2) infinite;
}
@keyframes cursor-blink {
  0% { opacity: 1; }
  50% { opacity: 0; }
}
```

- [ ] **Step 3: Add user message tint styling**

Find `.msg.user .role::before { content: ''; }` (line ~851) and after `.msg.user .user-text`, add:

```css
.msg.user {
  background: var(--bg-subtle);
  border-radius: var(--radius);
  padding: 10px 14px;
}
.msg.user + .msg.user {
  margin-top: -8px;
}
.msg.user + .msg.user .role { display: none; }
```

- [ ] **Step 4: Add assistant message grouped rhythm**

After the user message rules, add:

```css
.msg.assistant + .msg.assistant {
  margin-top: -8px;
}
.msg.assistant + .msg.assistant .role { display: none; }
.msg.assistant .prose {
  line-height: 1.65;
}
```

- [ ] **Step 5: Add day separator pill styling**

Find `.chat-day-separator` (line ~835) and replace the existing styles:

The existing rule stays, but add refinement to the text inside:

```css
.chat-day-separator-text {
  background: var(--bg-subtle);
  border-radius: var(--radius-pill);
  padding: 2px 10px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text-faint);
  white-space: nowrap;
}
```

Note: This requires the ChatPane render to wrap the date text in a `<span className="chat-day-separator-text">`. That change happens in Task 9.

- [ ] **Step 6: Add composer distinct surface CSS**

Find `.composer {` (line ~872). After the existing `.composer` rule, add:

```css
.composer-surface {
  background: color-mix(in srgb, var(--bg-panel) 96%, var(--creative-tint));
  border-top: 1px solid var(--border);
  border-image: linear-gradient(90deg, transparent 0%, var(--border) 15%, var(--border) 85%, transparent 100%) 1;
  padding: 14px 16px;
}
```

- [ ] **Step 7: Add chat header glass effect**

Find `.chat-header {` (line ~758). Add backdrop-filter properties:

```css
.chat-header {
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
  background: color-mix(in srgb, var(--bg-panel) 85%, transparent);
}
```

This replaces the existing `background: var(--bg-panel)` in the `.chat-header` rule.

- [ ] **Step 8: Add segment tab CSS to replace underline tabs**

After the `.chat-header` rules section (line ~798), add:

```css
.chat-header-segment {
  display: inline-flex;
  padding: 3px;
  background: color-mix(in srgb, var(--bg-panel) 58%, var(--bg-subtle));
  border: 1px solid var(--border);
  border-radius: var(--radius-pill);
  gap: 2px;
  position: relative;
}
.chat-header-segment button {
  position: relative;
  z-index: 1;
  background: transparent;
  border: none;
  border-radius: var(--radius-pill);
  padding: 5px 16px;
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
}
.chat-header-segment button:hover:not(.active) {
  color: var(--text);
}
.chat-header-segment button.active {
  color: var(--text-strong);
}
.chat-header-segment-indicator {
  position: absolute;
  top: 3px;
  bottom: 3px;
  border-radius: var(--radius-pill);
  background: var(--bg-panel);
  box-shadow: var(--shadow-xs);
  z-index: 0;
}
```

- [ ] **Step 9: Add panel depth CSS**

Find `.pane {` (line ~715). Add a new class for the chat pane's recessed background:

```css
.pane.pane-recessed {
  background: color-mix(in srgb, var(--bg-panel) 97%, var(--bg));
}
```

After `.chat-pane-resizer:hover::after` (line ~749), add a softer file workspace left edge:

```css
.pane.pane-elevated {
  box-shadow: -1px 0 0 var(--border);
  border-right: none;
}
```

- [ ] **Step 10: Add dark theme overrides for new CSS**

Find the `[data-theme="dark"]` section. Add overrides:

```css
[data-theme="dark"] .composer.streaming .composer-shell {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent);
}
[data-theme="dark"] .chat-header {
  background: color-mix(in srgb, var(--bg-panel) 80%, transparent);
}
[data-theme="dark"] .composer-surface {
  background: color-mix(in srgb, var(--bg-panel) 94%, var(--creative-tint));
}
```

- [ ] **Step 11: Verify no regressions**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS (CSS changes don't affect types, but verify no file corruption)

- [ ] **Step 12: Commit**

```bash
git add apps/web/src/index.css
git commit -m "feat(web): add CSS polish layer — composer glow, user msg tint, glass header, segment tabs, panel depth"
```

---

### Task 7: Composer — Auto-Resize Textarea + Streaming Class

**Files:**
- Modify: `apps/web/src/components/ChatComposer.tsx` (lines ~156, ~698, ~756, ~1005)

- [ ] **Step 1: Add Framer Motion and motion imports**

At the top of `apps/web/src/components/ChatComposer.tsx`, add after the React import (line 1):

```typescript
import { AnimatePresence, motion } from 'framer-motion';
import { springs, variants } from '../motion';
```

- [ ] **Step 2: Add textarea auto-resize effect**

Inside the `ChatComposer` component body (after the existing `useEffect` hooks, around line ~300), add an auto-resize effect:

```typescript
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [draft]);
```

Also ensure the textarea CSS supports this. In `index.css`, find `.composer textarea` (line ~899) and verify it has:
```css
.composer textarea {
  resize: none;
  overflow-y: auto;
  min-height: 36px;
  max-height: 200px;
}
```
If `resize: none` is missing, add it to the existing rule.

- [ ] **Step 3: Add streaming class to composer wrapper**

Find the outermost `<div className="composer"` around line ~698. Change it to include the streaming class:

Replace:
```tsx
      className={`composer${dragActive ? ' drag-active' : ''}`}
```
With:
```tsx
      className={`composer${dragActive ? ' drag-active' : ''}${streaming ? ' streaming' : ''}`}
```

- [ ] **Step 4: Animate send/stop button swap**

Find the send/stop conditional (lines ~1004–1025). Wrap in AnimatePresence and use motion.button:

Replace:
```tsx
            {streaming ? (
              <button
                type="button"
                className="composer-send stop"
                onClick={onStop}
              >
                <Icon name="stop" size={13} />
                <span>{t('chat.stop')}</span>
              </button>
            ) : (
              <button
                type="button"
                className="composer-send"
                data-testid="chat-send"
                onClick={() => void submit()}
                disabled={!draft.trim() && commentAttachments.length === 0}
              >
                <Icon name="send" size={13} />
                <span>{t('chat.send')}</span>
              </button>
            )}
```

With:
```tsx
            <AnimatePresence mode="wait">
              {streaming ? (
                <motion.button
                  key="stop"
                  type="button"
                  className="composer-send stop"
                  onClick={onStop}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                >
                  <Icon name="stop" size={13} />
                  <span>{t('chat.stop')}</span>
                </motion.button>
              ) : (
                <motion.button
                  key="send"
                  type="button"
                  className="composer-send"
                  data-testid="chat-send"
                  onClick={() => void submit()}
                  disabled={!draft.trim() && commentAttachments.length === 0}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
                  exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.1 } }}
                >
                  <Icon name="send" size={13} />
                  <span>{t('chat.send')}</span>
                </motion.button>
              )}
            </AnimatePresence>
```

- [ ] **Step 5: Animate context chip list**

Find the `ContextInspector` component (line ~1035). Inside the return, wrap each chip in `motion.div` with layout animation. In the `.context-inspector-row` div, change the chip mapping to use `AnimatePresence`:

Find the section where chips are rendered inside `ContextInspector`. The row containing chips should use:

```tsx
<AnimatePresence>
  {items.map((item) => (
    <motion.div
      key={item.token}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1, transition: springs.snappy }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
    >
      {/* existing chip content */}
    </motion.div>
  ))}
</AnimatePresence>
```

Read the exact ContextInspector implementation first to find the chip iteration pattern, then wrap each chip.

- [ ] **Step 6: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/ChatComposer.tsx apps/web/src/index.css
git commit -m "feat(web): composer polish — auto-resize, streaming glow, send/stop morph, chip animations"
```

---

### Task 8: Chat Messages — Entrance Animations + Grouped Rhythm

**Files:**
- Modify: `apps/web/src/components/ChatPane.tsx` (lines ~1, ~345–424)

- [ ] **Step 1: Add Framer Motion imports**

At the top of `apps/web/src/components/ChatPane.tsx`, add:

```typescript
import { AnimatePresence, motion } from 'framer-motion';
import { springs, variants } from '../motion';
```

- [ ] **Step 2: Track message count for entrance-only animation**

Inside the `ChatPane` component, add a ref to track which messages have already been seen (so we only animate new ones):

```typescript
const seenIdsRef = useRef<Set<string>>(new Set());
```

And an effect to populate it on mount (so initial load doesn't animate every message):

```typescript
useEffect(() => {
  messages.forEach((m) => seenIdsRef.current.add(m.id));
}, []); // deliberately mount-only
```

- [ ] **Step 3: Animate new messages**

Find the `messages.map` block (line ~389). Wrap each message's Fragment content in a `motion.div` that only animates if the message hasn't been seen:

Replace:
```tsx
              {messages.map((m, i) => {
                const showDaySeparator = shouldShowDaySeparator(messages[i - 1], m);
                const messageStreaming =
                  m.role === 'assistant' &&
                  ((streaming && m.id === lastAssistantId) || isActiveRunStatus(m.runStatus));
                return (
                  <Fragment key={m.id}>
                    {showDaySeparator ? <DaySeparator ts={messageTime(m)} /> : null}
                    {m.role === 'user' ? (
```

With:
```tsx
              {messages.map((m, i) => {
                const showDaySeparator = shouldShowDaySeparator(messages[i - 1], m);
                const messageStreaming =
                  m.role === 'assistant' &&
                  ((streaming && m.id === lastAssistantId) || isActiveRunStatus(m.runStatus));
                const isNew = !seenIdsRef.current.has(m.id);
                if (isNew) seenIdsRef.current.add(m.id);
                return (
                  <Fragment key={m.id}>
                    {showDaySeparator ? <DaySeparator ts={messageTime(m)} /> : null}
                    <motion.div
                      initial={isNew ? { opacity: 0, y: 6 } : false}
                      animate={{ opacity: 1, y: 0 }}
                      transition={springs.gentle}
                    >
                    {m.role === 'user' ? (
```

And close the `motion.div` after the assistant message rendering (before the Fragment close):

```tsx
                    )}
                    </motion.div>
                  </Fragment>
```

- [ ] **Step 4: Animate example prompt cards with Framer stagger**

Find the example prompts section (lines ~355–386). Replace the CSS animation approach with Framer stagger.

Remove `style={{ animationDelay: \`${i * 70}ms\` }}` from the `<button>` and remove the `opacity: 0` + `animation: chat-example-in` from the CSS class.

Wrap the `.chat-examples` div with a `motion.div` using `staggerParent` variant:

```tsx
                  <motion.div
                    className="chat-examples"
                    role="list"
                    variants={variants.staggerParent}
                    initial="initial"
                    animate="animate"
                  >
                    {EXAMPLE_PROMPT_KEYS.map((ex) => {
                      const title = t(ex.titleKey);
                      const tag = t(ex.tagKey);
                      const prompt = t(ex.promptKey);
                      return (
                        <motion.button
                          key={ex.titleKey}
                          type="button"
                          role="listitem"
                          className="chat-example"
                          variants={variants.fadeUp}
                          onClick={() => composerRef.current?.setDraft(prompt)}
                          title={t('chat.fillInputTitle')}
                        >
```

- [ ] **Step 5: Remove CSS animation from .chat-example**

In `apps/web/src/index.css`, find `.chat-example` (line ~5177). Remove these two lines from the rule:

```css
  opacity: 0;
  animation: chat-example-in 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards;
```

The `@keyframes chat-example-in` block (line ~5307) can also be removed since Framer now handles this.

- [ ] **Step 6: Add streaming cursor class to last assistant message**

In the `AssistantMessage` rendering (line ~406), the `streaming` prop is already passed. The `AssistantMessage` component should add `className="streaming-cursor"` to its last text node when `streaming` is true. Check `AssistantMessage.tsx` for where the prose content ends and add the class there.

This is a one-line change in `AssistantMessage.tsx` — find the trailing element of the `.prose` div and conditionally add the `streaming-cursor` class when the `streaming` prop is true.

- [ ] **Step 7: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/components/ChatPane.tsx apps/web/src/components/AssistantMessage.tsx apps/web/src/index.css
git commit -m "feat(web): chat message entrance animations, example stagger, streaming cursor"
```

---

### Task 9: Chat Header — Segment Control with Sliding Indicator

**Files:**
- Modify: `apps/web/src/components/ChatPane.tsx` (lines ~237–257)

- [ ] **Step 1: Replace underline tabs with segment control**

Find the chat-header-tabs section (line ~238). Replace:

```tsx
        <div className="chat-header-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chat'}
            className={`chat-header-tab${tab === 'chat' ? ' active' : ''}`}
            onClick={() => setTab('chat')}
          >
            {t('chat.tabChat')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'comments'}
            className={`chat-header-tab${tab === 'comments' ? ' active' : ''}`}
            onClick={() => setTab('comments')}
          >
            {t('chat.tabComments')}
          </button>
        </div>
```

With:

```tsx
        <div className="chat-header-segment" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'chat'}
            className={tab === 'chat' ? 'active' : ''}
            onClick={() => setTab('chat')}
          >
            {t('chat.tabChat')}
            {tab === 'chat' ? (
              <motion.div
                className="chat-header-segment-indicator"
                layoutId="chat-tab-indicator"
                transition={springs.snappy}
                style={{ position: 'absolute', inset: '3px', borderRadius: 'var(--radius-pill)' }}
              />
            ) : null}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'comments'}
            className={tab === 'comments' ? 'active' : ''}
            onClick={() => setTab('comments')}
          >
            {t('chat.tabComments')}
            {tab === 'comments' ? (
              <motion.div
                className="chat-header-segment-indicator"
                layoutId="chat-tab-indicator"
                transition={springs.snappy}
                style={{ position: 'absolute', inset: '3px', borderRadius: 'var(--radius-pill)' }}
              />
            ) : null}
          </button>
        </div>
```

Note: Each button needs `position: relative` so the absolute indicator positions correctly. Add to `.chat-header-segment button` in the CSS (already added in Task 6).

- [ ] **Step 2: Update DaySeparator to use pill span**

Find the `DaySeparator` component in `ChatPane.tsx`. Wrap the date text in a `<span className="chat-day-separator-text">`:

```tsx
function DaySeparator({ ts }: { ts: number }) {
  return (
    <div className="chat-day-separator" role="separator">
      <span className="chat-day-separator-text">{dayLabel(ts)}</span>
    </div>
  );
}
```

- [ ] **Step 3: Remove old underline tab CSS**

In `apps/web/src/index.css`, the old `.chat-header-tab` rules (lines ~771–785) can be removed since we're using `.chat-header-segment` now. Remove:

```css
.chat-header-tabs { display: inline-flex; gap: 16px; flex: 1; }
.chat-header-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  padding: 8px 0;
  font-size: 13px;
  color: var(--text-muted);
  font-weight: 500;
}
.chat-header-tab:hover { color: var(--text); background: transparent; border-color: transparent; }
.chat-header-tab.active {
  color: var(--text);
  border-bottom-color: var(--text);
}
```

- [ ] **Step 4: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ChatPane.tsx apps/web/src/index.css
git commit -m "feat(web): chat header segment control with Framer layoutId sliding indicator"
```

---

### Task 10: Panel Depth — Recessed Chat + Elevated Workspace

**Files:**
- Modify: `apps/web/src/components/ChatPane.tsx` (line ~236)
- Modify: `apps/web/src/components/ProjectView.tsx` (lines ~1429–1431, ~1472, ~872)

- [ ] **Step 1: Add recessed class to chat pane**

In `ChatPane.tsx`, find `<div className="pane">` (line ~236). Change to:

```tsx
    <div className="pane pane-recessed">
```

- [ ] **Step 2: Add composer-surface class**

In `ChatPane.tsx`, find the `<ChatComposer` rendering and its wrapping structure. The composer is rendered as the last child of the pane. Wrap it (or add the class to the composer's outermost div). 

The simplest approach: In `ChatComposer.tsx`, find the outermost `<div className="composer"` and add the `composer-surface` class to the parent that the ChatPane provides. Since the ChatPane renders `<ChatComposer>` directly, and the composer's own root div already has the `composer` class, change the composer's className to include `composer-surface`:

In `ChatComposer.tsx`, change the outermost div (line ~698):
```tsx
      className={`composer composer-surface${dragActive ? ' drag-active' : ''}${streaming ? ' streaming' : ''}`}
```

- [ ] **Step 3: Add elevated class to file workspace pane**

In `ProjectView.tsx`, the `<FileWorkspace>` component renders its own `.pane` container internally. Check `FileWorkspace.tsx` for its root element and add the `pane-elevated` class there.

Read `FileWorkspace.tsx` to find its root `<div className="pane"` and add `pane-elevated`:

```tsx
    <div className="pane pane-elevated">
```

- [ ] **Step 4: Update chat-header background to glass effect**

In `apps/web/src/index.css`, find `.chat-header {` (line ~758). Replace:
```css
  background: var(--bg-panel);
```
With:
```css
  background: color-mix(in srgb, var(--bg-panel) 85%, transparent);
  backdrop-filter: blur(8px) saturate(1.2);
  -webkit-backdrop-filter: blur(8px) saturate(1.2);
```

(If this was already done in Task 6, verify it's applied — don't duplicate.)

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ChatPane.tsx apps/web/src/components/ChatComposer.tsx apps/web/src/components/FileWorkspace.tsx apps/web/src/components/ProjectView.tsx apps/web/src/index.css
git commit -m "feat(web): panel depth — recessed chat, elevated workspace, glass header"
```

---

### Task 11: Create MotionModal Wrapper

**Files:**
- Create: `apps/web/src/components/MotionModal.tsx`

- [ ] **Step 1: Create the shared MotionModal component**

Create `apps/web/src/components/MotionModal.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { springs, variants } from '../motion';

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
}

export function MotionModal({ open, onClose, children, className }: Props) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={backdropRef}
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.16 } }}
          exit={{ opacity: 0, transition: { duration: 0.1 } }}
          onClick={(e) => {
            if (e.target === backdropRef.current) onClose();
          }}
          style={{ animation: 'none' }}
        >
          <motion.div
            className={className ? `modal ${className}` : 'modal'}
            initial={{ opacity: 0, scale: 0.96, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springs.gentle }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }}
            style={{ animation: 'none' }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```

Note: The `style={{ animation: 'none' }}` overrides the existing CSS `animation: fade-in` and `animation: pop-in` on `.modal-backdrop` and `.modal`, since Framer now controls the entrance. This avoids conflicting CSS and Framer animations.

- [ ] **Step 2: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/MotionModal.tsx
git commit -m "feat(web): add shared MotionModal wrapper with AnimatePresence + spring entrance"
```

---

### Task 12: Integrate MotionModal into SettingsDialog

**Files:**
- Modify: `apps/web/src/components/SettingsDialog.tsx`

- [ ] **Step 1: Read current SettingsDialog structure**

Read `apps/web/src/components/SettingsDialog.tsx` to find how the modal backdrop and modal container are rendered. Look for the `modal-backdrop` and `modal modal-settings` classNames.

- [ ] **Step 2: Replace manual backdrop/modal with MotionModal**

The SettingsDialog currently renders its own `<div className="modal-backdrop">` and `<div className="modal modal-settings">`. Replace the outermost structure:

Add import:
```typescript
import { MotionModal } from './MotionModal';
```

Replace the outer `modal-backdrop` + `modal` divs with:
```tsx
<MotionModal open={true} onClose={onClose} className="modal-settings">
  {/* existing modal-head + modal-body content stays identical */}
</MotionModal>
```

Remove the existing `onClick` backdrop handler since MotionModal handles it.

The parent component that conditionally renders `<SettingsDialog>` (in `App.tsx`, line ~525) should continue using its `settingsOpen` boolean — but now the `AnimatePresence` is inside `MotionModal`, so the parent must always render the component for exit animation to work:

In `App.tsx`, change from:
```tsx
{settingsOpen ? <SettingsDialog ... onClose={() => setSettingsOpen(false)} /> : null}
```
To:
```tsx
<SettingsDialog ... open={settingsOpen} onClose={() => setSettingsOpen(false)} />
```

And update `SettingsDialog` to accept an `open` prop and pass it to `MotionModal`.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/SettingsDialog.tsx apps/web/src/App.tsx
git commit -m "feat(web): integrate MotionModal into SettingsDialog for spring entrance/exit"
```

---

### Task 13: Integrate MotionModal into PreviewModal

**Files:**
- Modify: `apps/web/src/components/PreviewModal.tsx`

- [ ] **Step 1: Read PreviewModal structure**

Read `apps/web/src/components/PreviewModal.tsx` to understand how its backdrop and modal container are rendered.

- [ ] **Step 2: Replace with MotionModal**

Same pattern as Task 12. Add the MotionModal import, replace the outer backdrop/modal divs, and update the parent components (in `EntryView.tsx`) to always render and pass an `open` prop.

The PreviewModal uses a fullscreen overlay (class `modal-backdrop preview-backdrop`). Ensure the `className` prop on MotionModal supports custom classes:

```tsx
<MotionModal open={open} onClose={onClose} className="modal-preview">
  {/* existing preview content */}
</MotionModal>
```

Update parent components that conditionally render preview modals (`DesignSystemPreviewModal`, `PromptTemplatePreviewModal`) to use the `open` prop pattern.

- [ ] **Step 3: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/PreviewModal.tsx apps/web/src/components/DesignSystemPreviewModal.tsx apps/web/src/components/PromptTemplatePreviewModal.tsx apps/web/src/components/EntryView.tsx
git commit -m "feat(web): integrate MotionModal into PreviewModal for spring entrance/exit"
```

---

### Task 14: Popover Entrance Animations

**Files:**
- Modify: `apps/web/src/components/ChatPane.tsx` (conversation history popover)
- Modify: `apps/web/src/components/DesignSystemPicker.tsx` (ds-picker-popover)
- Modify: `apps/web/src/index.css` (remove CSS keyframe animations from popovers)

- [ ] **Step 1: Animate conversation history popover**

In `ChatPane.tsx`, find the conversation history menu (line ~282). The `{showConvList ? <div className="chat-history-menu" ...` conditional renders the popover. Wrap with `AnimatePresence`:

```tsx
<AnimatePresence>
  {showConvList ? (
    <motion.div
      className="chat-history-menu"
      role="menu"
      data-testid="conversation-history-menu"
      variants={variants.popoverIn}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      {/* existing popover content unchanged */}
    </motion.div>
  ) : null}
</AnimatePresence>
```

- [ ] **Step 2: Animate design system picker popover**

In `DesignSystemPicker.tsx`, add Framer imports and wrap the `ds-picker-popover` div with `AnimatePresence` + `motion.div` using `variants.popoverIn`. Remove the existing `animation: ds-pop-in` from the CSS.

Add import:
```typescript
import { AnimatePresence, motion } from 'framer-motion';
import { variants } from '../motion';
```

Wrap the popover:
```tsx
<AnimatePresence>
  {open ? (
    <motion.div
      className="ds-picker-popover"
      variants={variants.popoverIn}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ animation: 'none' }}
    >
      {/* existing content unchanged */}
    </motion.div>
  ) : null}
</AnimatePresence>
```

- [ ] **Step 3: Remove CSS keyframe animations from popovers**

In `apps/web/src/index.css`:

Remove the `animation: ds-pop-in` from `.ds-picker-popover` (line ~2804):
```css
/* Remove this line: */
  animation: ds-pop-in 140ms cubic-bezier(0.2, 0, 0.2, 1);
```

The `@keyframes ds-pop-in` block (line ~2806) can be removed.

- [ ] **Step 4: Add glassmorphic popover surface CSS**

In `apps/web/src/index.css`, find `.ds-picker-popover` (line ~2791). Add backdrop-filter to the existing rule:

```css
.ds-picker-popover {
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  background: color-mix(in srgb, var(--bg-panel) 88%, transparent);
}
```

These properties replace the existing `background: var(--bg-panel)` in that rule.

Also add the same treatment to `.chat-history-menu`:

```css
.chat-history-menu {
  backdrop-filter: blur(12px) saturate(1.4);
  -webkit-backdrop-filter: blur(12px) saturate(1.4);
  background: color-mix(in srgb, var(--bg-panel) 88%, transparent);
}
```

- [ ] **Step 5: Verify typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components/ChatPane.tsx apps/web/src/components/DesignSystemPicker.tsx apps/web/src/index.css
git commit -m "feat(web): popover spring entrances + glassmorphic surfaces"
```

---

### Task 15: Final Verification + Cleanup

**Files:**
- Modify: `apps/web/src/index.css` (cleanup)

- [ ] **Step 1: Remove replaced CSS keyframes**

In `apps/web/src/index.css`, confirm the following CSS-only animations have been replaced by Framer and can be removed:

1. `@keyframes chat-example-in` (line ~5307) — replaced by Framer stagger in Task 8
2. `@keyframes ds-pop-in` (line ~2806) — replaced by Framer popoverIn in Task 14

The following must **stay** because they're used in contexts not yet migrated to Framer:
- `@keyframes fade-in` — still used by `.modal-backdrop` CSS (until all modals use MotionModal)
- `@keyframes pop-in` — still used by `.modal` CSS (until all modals use MotionModal)
- `@keyframes pulse` — used by status indicators, not being replaced
- `@keyframes status-pulse` — used by status dots, not being replaced
- Pet keyframes — untouched

- [ ] **Step 2: Run full typecheck**

Run: `pnpm --filter @pixelpitch/web typecheck`
Expected: PASS

- [ ] **Step 3: Run full test suite**

Run: `pnpm --filter @pixelpitch/web test`
Expected: All tests PASS

- [ ] **Step 4: Run workspace-wide typecheck**

Run: `pnpm -r --if-present run typecheck`
Expected: PASS across all packages

- [ ] **Step 5: Verify reduced-motion behavior**

Manually verify: With `prefers-reduced-motion: reduce` enabled in browser dev tools, all Framer animations should either:
- Use `useReducedMotion()` to skip (if explicitly checked)
- Be handled by Framer's built-in reduced-motion support (layout animations still work, spring animations reduce to instant)

And the global CSS `@media (prefers-reduced-motion: reduce)` block (line ~3744) still catches all CSS animations.

- [ ] **Step 6: Commit cleanup**

```bash
git add apps/web/src/index.css
git commit -m "chore(web): clean up replaced CSS keyframes, verify motion polish system"
```

---

## Summary

| Task | Phase | What it delivers |
|------|-------|-----------------|
| 1 | Foundation | framer-motion installed |
| 2–5 | Foundation | `src/motion/` primitives (springs, variants, reduced-motion, barrel) |
| 6 | CSS Layer | Ambient polish — glow, tint, glass, segment, depth |
| 7 | Composer | Auto-resize, streaming class, send/stop morph, chip animation |
| 8 | Chat | Message entrance, example stagger, streaming cursor |
| 9 | Chat | Segment control with layoutId sliding indicator |
| 10 | Panels | Recessed chat, elevated workspace, glass header |
| 11 | Modals | Shared MotionModal component |
| 12–13 | Modals | MotionModal integrated into Settings + Preview |
| 14 | Popovers | Spring entrance/exit for conversation history + DS picker |
| 15 | Cleanup | Remove replaced CSS, full verification |

Phase 5 (Entry View Redesign) is intentionally excluded from this plan — it's a larger layout restructure that should be its own spec → plan → implementation cycle after this motion system is in place.
