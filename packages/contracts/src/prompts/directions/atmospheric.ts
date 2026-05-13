import type { DesignDirection } from './types.js';

/**
 * Atmosphere-forward directions live outside the base catalog so we can add
 * opinionated visual systems without making the core picker file unreadable.
 * Keep entries deterministic: CSS-ready tokens first, evocative language second.
 */
export const ATMOSPHERIC_DESIGN_DIRECTIONS: DesignDirection[] = [
  {
    id: 'cinematic-system',
    label: 'Cinematic system — A24 / Arc / Vercel ship',
    mood:
      'A premium launch film translated into interface. Dark room, precise light, luminous product surfaces, restrained copy. Feels expensive without becoming sci-fi.',
    references: ['A24 title cards', 'Arc browser', 'Vercel Ship', 'Apple Vision Pro launch pages'],
    displayFont:
      "'Fraunces', 'Canela', 'Iowan Old Style', Georgia, serif",
    bodyFont:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    monoFont: "'Berkeley Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace",
    palette: {
      bg: 'oklch(13% 0.018 250)',
      surface: 'oklch(18% 0.018 250)',
      fg: 'oklch(94% 0.01 75)',
      muted: 'oklch(68% 0.018 80)',
      border: 'oklch(34% 0.025 245)',
      accent: 'oklch(72% 0.13 45)',
    },
    posture: [
      'large serif headline with a very quiet sans interface layer',
      'full-bleed stage sections; cards appear only as functional controls or repeated records',
      'hero content should feel lit, not decorated: use directional light, film grain, and real product/state imagery',
      'make hierarchy with scale contrast and darkness, not dense borders',
    ],
    materiality: [
      'soft black glass surfaces with 1px warm border highlights',
      'subtle grain overlay at 3–5% opacity; never use floating blobs or orb decoration',
      'one luminous rim-light accent behind the primary product/screen, clipped to the section',
    ],
    motion: [
      'slow parallax on scroll: foreground copy moves 1x, product plane 0.6x, background texture 0.25x',
      'microinteractions should feel damped and physical: 180–260ms, ease-out, tiny y/scale changes',
      'use zoom-in reveals for primary screenshots; avoid bouncing or playful easing',
    ],
    imagery: [
      'use close product crops, dim studio photography, cinematic stills, or generated product mockups',
      'avoid generic gradients; the first viewport needs a tangible thing under light',
    ],
  },
  {
    id: 'institutional-field-lab',
    label: 'Institutional field lab — NASA / GDS / research memo',
    mood:
      'A mission briefing from a serious applied research team. Precise grids, annotated artifacts, archival texture, sober typography, and evidence-led layouts.',
    references: ['NASA Graphics Standards Manual', 'UK Government Digital Service', 'MIT Media Lab reports', 'Bloomberg terminal printouts'],
    displayFont:
      "'IBM Plex Serif', 'Charter', Georgia, serif",
    bodyFont:
      "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    monoFont: "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, Menlo, monospace",
    palette: {
      bg: 'oklch(95% 0.01 90)',
      surface: 'oklch(99% 0.004 90)',
      fg: 'oklch(19% 0.018 95)',
      muted: 'oklch(47% 0.018 95)',
      border: 'oklch(80% 0.018 90)',
      accent: 'oklch(52% 0.17 32)',
    },
    posture: [
      'strict 12-column grid with visible alignment logic in charts, captions, and metadata',
      'section headers behave like report folios: issue number, status, author, date',
      'use annotations, callouts, rulers, and measured dividers instead of decorative cards',
      'tables and diagrams should be compact, legible, and evidence-first',
    ],
    materiality: [
      'paper, micro-grid, scanline, and stamp textures are appropriate at low opacity',
      'borders can be more present than usual but should feel measured, not brutal',
      'surface depth comes from layered documents and pinned artifacts, not drop shadows',
    ],
    motion: [
      'scroll reveals should feel like assembling evidence on a table: clip, slide, and fade in sequence',
      'hover states can reveal coordinates, labels, and measurement overlays',
      'avoid dramatic spring; use crisp 120–180ms transitions',
    ],
    imagery: [
      'prefer annotated screenshots, maps, diagrams, scans, lab photos, and product telemetry',
      'captions are part of the aesthetic; every image should have a source-like label',
    ],
  },
  {
    id: 'luxury-craft-commerce',
    label: 'Luxury craft — Aman / Hermès / high-end commerce',
    mood:
      'Quiet luxury: tactile, spacious, deeply refined. Editorial product imagery, warm neutrals, delicate separators, and a single jewel-tone accent.',
    references: ['Aman', 'Hermès', 'The Row', 'Kinfolk', 'Studio Nicholson'],
    displayFont:
      "'Canela', 'Cormorant Garamond', 'Iowan Old Style', Georgia, serif",
    bodyFont:
      "'Söhne', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    palette: {
      bg: 'oklch(96% 0.014 78)',
      surface: 'oklch(99% 0.006 78)',
      fg: 'oklch(18% 0.016 65)',
      muted: 'oklch(50% 0.014 65)',
      border: 'oklch(86% 0.014 78)',
      accent: 'oklch(43% 0.13 155)',
    },
    posture: [
      'oversized serif display, small caps metadata, restrained body sizes',
      'product or place imagery must dominate the first viewport; UI chrome stays quiet',
      'use long horizontal rules and ample negative space; never crowd premium content',
      'radii are small to medium (4–10px); avoid pill-heavy SaaS language',
    ],
    materiality: [
      'linen, parchment, stone, soft shadow under physical product cards',
      'use subtle inset borders and warm white surfaces; no neon, no glassmorphism',
      'depth comes from photographic layering and editorial scale shifts',
    ],
    motion: [
      'slow image scale on hover (1.02 max), cursor-following light only if it stays nearly invisible',
      'scroll transitions should use fade + translate, not complex rotations',
      'buttons should have quiet tactile press states with border/accent changes',
    ],
    imagery: [
      'macro material shots, real object photography, architectural interiors, refined product stills',
      'avoid generic lifestyle stock; every image should feel art-directed',
    ],
  },
  {
    id: 'playful-lab',
    label: 'Playful lab — Teenage Engineering / Figma Config',
    mood:
      'Inventive, tactile, and optimistic. Functional controls become expressive; color is modular; motion feels like a well-made instrument.',
    references: ['Teenage Engineering', 'Figma Config', 'Miro', 'Nothing OS', 'Playdate'],
    displayFont:
      "'Space Grotesk', 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
    bodyFont:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    monoFont: "'Space Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace",
    palette: {
      bg: 'oklch(98% 0.012 105)',
      surface: 'oklch(100% 0 0)',
      fg: 'oklch(17% 0.025 260)',
      muted: 'oklch(49% 0.025 260)',
      border: 'oklch(84% 0.018 105)',
      accent: 'oklch(67% 0.19 210)',
    },
    posture: [
      'make controls feel designed: toggles, sliders, segmented modes, swatches, and icon buttons',
      'use modular grids and small delightful labels; avoid childish illustration unless the brief asks',
      'rounded corners can be present but must feel like hardware, not soft generic SaaS',
      'use secondary accent sparingly through state, not broad backgrounds',
    ],
    materiality: [
      'matte panels, pixel-grid texture, engraved labels, shallow bevels',
      'component depth can come from layered control surfaces and tiny shadows',
      'no large decorative blobs; color should be attached to useful controls or data',
    ],
    motion: [
      'microinteractions are allowed to be delightful: toggle snaps, knob turns, card lifts, tiny success pulses',
      'keep durations short (120–220ms) so playfulness does not slow workflow',
      'hover should reveal affordance and state, not ornamental animation',
    ],
    imagery: [
      'product UI close-ups, control panels, modular diagrams, hands-on tool surfaces',
      'if using illustration, make it diagrammatic or interface-native',
    ],
  },
];
