# Visual Polish System — Design Spec

Pixelpitch is a creative design suite. Its web UI should feel like a confident, crafted tool — not a portfolio shot, and definitely not AI slop. This spec adds a motion and layout polish system in five disciplined phases, anchored on the surfaces users touch every minute.

## Principles

1. **Motion serves confidence, not spectacle.** Every animation answers: "does this help the user understand state or feel in control?" If not, cut it.
2. **Framer Motion only.** No GSAP. CSS for ambient effects. One dependency, one design surface.
3. **No decorative blobs.** No gradient mesh, orbs, bokeh, wave SVG backgrounds. Ambient texture comes from material, light, and depth — not decoration. See `content/craft/anti-ai-slop.md`.
4. **Playful effects are rare and spatial.** Tilt/magnetic hover belongs on browse cards. Never on buttons, inputs, tabs, or productivity controls.
5. **prefers-reduced-motion respected everywhere.** Every Framer variant and CSS animation must degrade gracefully.

## Phase 1: Motion Foundation

**Goal:** Install Framer Motion. Create `src/motion/` with shared primitives that every subsequent phase consumes.

### Deliverables

**`src/motion/springs.ts`** — Named spring configs:
- `snappy`: `{ stiffness: 500, damping: 30, mass: 0.8 }` — buttons, pills, chips
- `gentle`: `{ stiffness: 260, damping: 26, mass: 1 }` — panels, modals, layout shifts
- `bouncy`: `{ stiffness: 400, damping: 18, mass: 0.6 }` — playful entrances (cards, examples)

**`src/motion/variants.ts`** — Reusable Framer variant sets:
- `fadeUp`: enter from `{ opacity: 0, y: 8 }` to `{ opacity: 1, y: 0 }` with `gentle` spring
- `fadeIn`: opacity-only entrance with `duration: 0.16`
- `scaleIn`: `{ opacity: 0, scale: 0.96 }` to `{ opacity: 1, scale: 1 }` for popovers/modals
- `slideIn`: horizontal slide for panels, configurable direction
- `staggerChildren`: parent variant with `staggerChildren: 0.04` for lists

**`src/motion/reduced-motion.ts`** — Utility:
- `useReducedMotion()` hook (Framer provides this, re-export with project defaults)
- `safeTransition(transition)` — returns `{ duration: 0 }` when reduced-motion is active
- `SKIP` constant — variant set that resolves to `{ opacity: 1 }` instantly for reduced-motion users

**`src/motion/index.ts`** — Barrel export.

### CSS additions to `index.css`

None in this phase. The existing CSS keyframes (`fade-in`, `pop-in`, `pulse`) stay. Later phases replace them with Framer equivalents component-by-component.

### Dependency

```bash
# in apps/web/
pnpm add framer-motion
```

Framer Motion is ~35KB gzipped. Tree-shaking covers unused features.

---

## Phase 2: Composer + Chat

**Goal:** The highest-leverage surface. Make the input and conversation feel alive.

### 2a. Composer Polish

**Auto-resizing textarea:**
- Replace static `<textarea>` with a wrapper that measures scrollHeight and animates height changes via `motion.div` with `layout` prop.
- Smooth height transition using `gentle` spring, not instant jump.
- Min height: 1 line. Max height: ~8 lines before scrolling.

**Focus glow:**
- On `:focus-within`, the `.composer-shell` border transitions to `var(--accent)` with a soft `box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 12%, transparent)`.
- CSS transition (not Framer) — this is a continuous state, not a mount animation.
- The glow subtly pulses during AI streaming: a CSS keyframe `@keyframes composer-stream-glow` that oscillates the box-shadow opacity between 8% and 16% on a 2s cycle. Applied via a `.streaming` class on the composer.

**Send → Stop morph:**
- The send button uses `AnimatePresence` + `motion.button` with `key` switching between send and stop states.
- Send icon scales in with `scaleIn` variant; stop icon uses the same. The transition between them is a quick crossfade (`mode="wait"` on `AnimatePresence`).
- No fancy icon morphing — just a clean, confident swap with scale spring.

**Context chip entrance/removal:**
- Attached comment chips and file attachment chips use `AnimatePresence` + `motion.div` with `fadeUp` variant.
- On removal: exit with `{ opacity: 0, scale: 0.95, transition: { duration: 0.12 } }`.
- List uses `layout` prop so remaining chips slide to fill gaps with `snappy` spring.

### 2b. Chat Message Polish

**Message entrance:**
- New messages enter via `motion.div` with `fadeUp` variant and `gentle` spring.
- For a burst of messages (initial load or history), use `staggerChildren: 0.03` on the parent `motion.div` wrapping the message list.
- Existing messages (already in DOM on re-render) skip animation — only new messages animate.

**User message tint:**
- User messages get a subtle background: `background: var(--bg-subtle)` with `border-radius: var(--radius)` and `padding: 10px 14px`.
- Left-aligned, same reading column as assistant messages. No right-alignment.
- Compact vertical padding compared to assistant messages.

**Assistant message breathing room:**
- Assistant messages get slightly more line-height (`1.65` in `.prose`) and generous padding below tool cards.
- Thinking blocks expand/collapse with `AnimatePresence` + height animation.

**Day separator refinement:**
- The existing hairline + centered text pattern is fine. Add: the date text becomes a pill with `background: var(--bg-subtle)` and `border-radius: var(--radius-pill)`, padding `2px 10px`.

**Streaming indicator:**
- While streaming, the last assistant message shows a subtle cursor blink at the end of the text. CSS `@keyframes cursor-blink` — a 1px-wide, 14px-tall bar in `var(--text-muted)` that pulses opacity.
- The existing `status-pulse` keyframe on status indicators stays.

**Grouped message rhythm:**
- Consecutive messages from the same role reduce the inter-message gap from 14px to 6px and hide the role label on the 2nd+ message. This creates visual "turns."

### CSS changes

- `.msg.user` gets background tint, padding, border-radius.
- `.msg.assistant .prose` line-height bumped to 1.65.
- `.chat-day-separator` date becomes a pill.
- New `@keyframes composer-stream-glow` and `@keyframes cursor-blink`.
- Consecutive-role grouping: `.msg.user + .msg.user` and `.msg.assistant + .msg.assistant` get reduced gap and hidden `.role`.

---

## Phase 3: Panel & Layout Depth

**Goal:** The split pane workspace feels layered and spatial, not flat.

### 3a. Chat Pane Resize

- Replace the current pointer-event-based resize with Framer's `useDragControls` on the resizer handle.
- During drag, the chat pane width animates via `motion.div` with `style={{ width }}` and a `snappy` spring.
- The resizer handle reveals a vertical drag indicator on hover (existing `::after` pseudo-element, enhanced with opacity transition).
- Drop the `body.chat-resizing` cursor override in favor of Framer's built-in drag cursor.

### 3b. Panel Elevation

- Chat pane background shifts from `var(--bg-panel)` to `color-mix(in srgb, var(--bg-panel) 97%, var(--bg))` — subtly tinted, slightly recessed.
- File workspace stays at `var(--bg-panel)` with `box-shadow: -1px 0 0 var(--border)` replacing the hard border — a softer edge.
- This creates a left→right depth progression: input (recessed) → output (elevated).

### 3c. Chat Header Tabs → Segment Control

- Replace the underline-tab pattern (`.chat-header-tab`) with the existing `.subtab-pill` segment control pattern.
- Add a sliding indicator behind the active segment using Framer's `layoutId` on a `motion.div` background pill — the highlight slides between tabs with `snappy` spring.
- The header gets `backdrop-filter: blur(8px) saturate(1.2)` and `background: color-mix(in srgb, var(--bg-panel) 85%, transparent)` so content scrolling underneath creates a subtle glass effect.

### 3d. Composer as Distinct Surface

- The composer area gets a slightly warmer background tint: `color-mix(in srgb, var(--bg-panel) 96%, var(--creative-tint))`.
- Border-top becomes a gradient that fades to transparent at both horizontal edges: `border-image: linear-gradient(90deg, transparent 0%, var(--border) 15%, var(--border) 85%, transparent 100%) 1`.
- More generous padding: `14px 16px` instead of `10px`.

---

## Phase 4: Modals & Popovers

**Goal:** Unified overlay language. Spring-based entrances, material surfaces.

### 4a. Backdrop

- All modals and popovers share a common backdrop: `background: rgba(0, 0, 0, 0.3)` with `backdrop-filter: blur(4px)`.
- Backdrop enters via `motion.div` with `fadeIn` variant.
- Dark theme: `background: rgba(0, 0, 0, 0.5)`.

### 4b. Modal Entrance

- Replace `@keyframes pop-in` with Framer `AnimatePresence` + `motion.div`:
  - Enter: `scaleIn` variant with `gentle` spring.
  - Exit: `{ opacity: 0, scale: 0.98, transition: { duration: 0.12 } }`.
- Create a shared `<MotionModal>` wrapper component that handles `AnimatePresence`, backdrop, focus trap wiring, and escape-to-close.

### 4c. Popover Entrance

- Replace `@keyframes ds-pop-in` and similar with a shared Framer entrance:
  - Enter: `{ opacity: 0, y: -4, scale: 0.98 }` → `{ opacity: 1, y: 0, scale: 1 }` with `snappy` spring.
  - Exit: reverse with `duration: 0.1`.
- Popover surfaces get `backdrop-filter: blur(12px) saturate(1.4)` with `background: color-mix(in srgb, var(--bg-panel) 88%, transparent)`.

### 4d. Settings Modal

- No full redesign in this phase. Only: add the shared `<MotionModal>` wrapper and the backdrop/entrance treatment.
- Sidebar nav for settings sections is a separate future scope item.

---

## Phase 5: Entry View Redesign

**Goal:** Transform the dashboard from a sidebar+grid layout into a full-bleed creative home.

### 5a. Layout Restructure

**Current:** `grid-template-columns: 380px 1fr` — narrow sidebar with form, wide content area.

**Proposed:** Full-width vertical layout:
- **Top zone** — brand + new-project composer side by side, wide and generous. `max-width: 1200px`, centered. The composer becomes the hero CTA: a large, inviting input surface with the design system picker and template selector inline.
- **Stats ribbon** — horizontal strip below the hero. One primary stat emphasized (larger type, accent color), three secondary stats at normal weight.
- **Content grid** — full-width tabs + card grid below. Same tab structure (designs, examples, design-systems) but with more horizontal breathing room.

### 5b. Hero Composer

- The new-project form fields (prompt textarea, design system picker, template selector) arrange horizontally in the hero zone instead of vertically stacked in a narrow sidebar.
- The prompt textarea is wider and shorter (2 lines default, auto-expands), visually similar to the chat composer polish from Phase 2.
- Template and design system pickers sit as compact pill selectors to the right of the textarea.

### 5c. Card Stagger Entrance

- Design cards, example cards, and design system cards enter with `staggerChildren` variant on mount and tab switch.
- Each card uses `fadeUp` + `bouncy` spring.
- On tab switch, outgoing cards exit with a quick fade, incoming cards stagger in.

### 5d. Pet Rail

- Pet rail becomes a floating panel with `position: fixed` on the right edge, `backdrop-filter: blur(12px)`, and `border-radius: var(--radius-lg)` with margin from the viewport edge.
- Enters/exits with `slideIn` (horizontal) + `AnimatePresence`.
- Does not push content — overlays it.

---

## What We Don't Change

- **CSS variable system** — stays as-is. Solid architecture.
- **Warm neutral palette** — distinctive, not AI-slop. No palette changes.
- **Component file structure** — we add motion wrappers, not rewrite components.
- **Accessibility** — `prefers-reduced-motion` extended to all new Framer animations. Focus rings, ARIA labels untouched.
- **Icon system** — `Icon.tsx` stays. No emoji icons.
- **Dark theme** — all new CSS additions include `[data-theme="dark"]` overrides.
- **Pet animation system** — the CSS `steps()` sprite system is bespoke and good. Don't touch it.

## What We Add

- `framer-motion` dependency (~35KB gzipped)
- `src/motion/` directory (springs, variants, reduced-motion, barrel export)
- `<MotionModal>` shared component
- ~200–300 lines of new CSS in `index.css` (glow keyframes, user message tint, segment tabs, glass effects, composer surface)
- Framer `motion.div` wrappers in ChatComposer, ChatPane, ProjectView (resize), modals, popovers, EntryView

## What We Remove

- `@keyframes pop-in` (replaced by Framer entrance)
- `@keyframes ds-pop-in` (replaced by shared popover entrance)
- `@keyframes fade-in` (replaced by Framer `fadeIn` variant)
- `@keyframes chat-example-in` (replaced by Framer `fadeUp` + stagger)
- Static underline tab pattern in chat header (replaced by segment control)
- Fixed 380px sidebar layout in entry view (replaced by full-width hero)
