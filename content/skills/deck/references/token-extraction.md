# Token Extraction

Use this procedure to convert DESIGN.md prose and selected theme guidance into `deck/theme.css`.

## Extraction Order

1. Read the primary DESIGN.md if present.
2. Extract palette intent into semantic tokens.
3. Extract typography into display/body/mono families.
4. Extract spacing, radius, border, shadow, and chart style.
5. Apply selected theme mood as layout and surface rhythm.
6. Apply inspiration design systems only as secondary pattern cues.
7. Fill missing tokens with accessible defaults.

## Required Tokens

```css
:root {
  --deck-bg: #fafafa;
  --deck-surface: #ffffff;
  --deck-surface-2: #f2f2f0;
  --deck-fg: #111111;
  --deck-muted: #5f6368;
  --deck-border: rgba(17, 17, 17, 0.14);
  --deck-accent: #2f6feb;
  --deck-success: #17a34a;
  --deck-warn: #b7791f;
  --deck-danger: #c2410c;
  --deck-font-display: Inter, ui-sans-serif, system-ui, sans-serif;
  --deck-font-body: Inter, ui-sans-serif, system-ui, sans-serif;
  --deck-font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  --deck-radius: 12px;
  --deck-shadow: 0 18px 60px rgba(0, 0, 0, 0.12);
  --deck-gap: 32px;
}
```

## Palette Rules

- Name tokens by purpose, not hue.
- Keep neutrals at 70-90% of pixels.
- Use one dominant accent and cap visible accent usage per slide.
- Preserve semantic colors for success, warning, and danger.
- If brand colors are inaccessible, keep the palette but adjust pairings for contrast.

## Typography Rules

- Bind display text to `--deck-font-display`.
- Bind body text to `--deck-font-body`.
- Bind code and terminal content to `--deck-font-mono`.
- Use 6-8 type sizes maximum across the deck.
- Track all-caps labels at `0.06em` to `0.1em`.

## Multi-Design-System Blending

- Primary design system controls color and type.
- Inspiration systems contribute layout gestures, component proportions, chart style, or motion rhythm.
- Never average palettes from multiple systems.
- If inspirations conflict with the primary design system, document the choice in `deck-plan.json.composition.themeId` or speaker notes.

## Fallback Defaults

Use the required tokens above when no design system is selected. Then let the selected theme modify mood, not accessibility.
