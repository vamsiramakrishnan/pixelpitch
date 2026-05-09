'use client';

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from 'framer-motion';
import type { KeyboardEvent, MouseEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import './landing.css';

const EASE = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: EASE },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const childFade = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: EASE },
  },
};

const METHOD_STAGES = [
  {
    numeral: 'I.',
    name: 'Taste',
    desc: 'Choose a design system and skill that match your vision. 138 curated systems, 59 artifact shapes — each one opinionated, not random.',
    href: '/app?tab=design-systems',
  },
  {
    numeral: 'II.',
    name: 'Craft',
    desc: 'Write your brief and watch the artifact stream to life. Your agent composes HTML with real typography, color governance, and layout rules.',
    href: '/app?create=prototype',
  },
  {
    numeral: 'III.',
    name: 'Polish',
    desc: 'Tweak colors, type scales, spacing, and motion in real time. Sub-50ms token patching — the design responds as you think.',
    href: '/app?tab=examples',
  },
  {
    numeral: 'IV.',
    name: 'Ship',
    desc: 'Export to native, fully-editable PPTX via Slidify. Every text frame, shape, and line stays editable — no flattened images.',
    href: '/app?create=deck',
  },
];

const GALLERY_ITEMS = [
  { title: 'Pitch Deck', meta: 'html-ppt-pitch-deck', className: 'wide', bg: '#1a1a2e', image: '/landing/deck-plate.png', href: '/app?create=deck' },
  { title: 'Inspect Mode', meta: 'deterministic-css-editor', className: '', bg: '#2d2b3a', image: '/landing/inspect-plate.png', href: '/app?tab=designs' },
  { title: 'Critique Theater', meta: 'multi-agent-review', className: '', bg: '#1e2d3a', image: '/landing/critique-plate.png', href: '/app?tab=examples' },
  { title: 'Prototype System', meta: 'responsive-ui-artifact', className: 'wide', bg: '#2a1f2e', image: '/landing/prototype-plate.png', href: '/app?create=prototype' },
  { title: 'SaaS Landing', meta: 'saas-landing', className: '', bg: '#3a2d1e', image: '/landing/hero-plate.png', href: '/app?tab=examples' },
  { title: 'Design Tokens', meta: 'palette-and-type-system', className: '', bg: '#1e3a2d', image: '/landing/detail-strip.png', href: '/app?tab=design-systems' },
  { title: 'Product Launch', meta: 'html-ppt-product-launch', className: 'wide', bg: '#2e1e1a', image: '/landing/deck-plate.png', href: '/app?create=deck' },
  { title: 'Motion Frames', meta: 'hyperframes-preview', className: '', bg: '#1a2e2e', image: '/landing/prototype-plate.png', href: '/app?create=video' },
];

type SkillCategory = 'Decks' | 'Prototypes' | 'Media' | 'Utility';

const SKILLS: Record<SkillCategory, { name: string; desc: string }[]> = {
  Decks: [
    { name: 'Pitch Deck', desc: 'Investor-ready 10-slide fundraising deck with traction charts' },
    { name: 'Tech Sharing', desc: 'GitHub-dark terminal aesthetic for engineering talks' },
    { name: 'Product Launch', desc: 'Dark hero + light content keynote with feature cards' },
    { name: 'Weekly Report', desc: 'KPI grid, shipped list, 8-week bar chart, status update' },
    { name: 'Course Module', desc: 'Warm paper + serif, sidebar learning objectives, MCQ checks' },
    { name: 'Replit Slides', desc: 'Eight visual themes from the Replit Slides gallery' },
    { name: 'Simple Deck', desc: 'Horizontal-swipe HTML deck from proven 5-rule scaffold' },
    { name: 'Presenter Mode', desc: 'Speaker notes popup with current/next/script/timer panels' },
  ],
  Prototypes: [
    { name: 'Web Prototype', desc: 'General-purpose desktop web page from section layouts' },
    { name: 'Mobile App', desc: 'Pixel-accurate iPhone 15 Pro frame with screen archetypes' },
    { name: 'Dashboard', desc: 'Fixed sidebar, KPI cards, charts — admin analytics layout' },
    { name: 'SaaS Landing', desc: 'Hero, features, social proof, pricing, and CTA sections' },
    { name: 'Pricing Page', desc: 'Plan tiers, feature comparison table, and FAQ section' },
    { name: 'Docs Page', desc: 'Left nav, scrollable article body, right-rail ToC' },
    { name: 'Wireframe Sketch', desc: 'Graph-paper background, marker tone, sticky-note annotations' },
    { name: 'Waitlist Page', desc: 'Minimal pre-launch landing with email capture' },
  ],
  Media: [
    { name: 'HyperFrames', desc: 'Video compositions, animations, scene transitions in HTML' },
    { name: 'Motion Frames', desc: 'Looping CSS animations — rotating type ring, animated globe' },
    { name: 'Sprite Animation', desc: 'Pixel-art animated explainer with kinetic Japanese type' },
    { name: 'Image Poster', desc: 'Single-image generation for posters, key art, illustrations' },
    { name: 'Video Shortform', desc: '3-10 second clips for product reveals and motion teasers' },
    { name: 'Audio Jingle', desc: 'Jingles, beds, voiceover, and sound effects generation' },
    { name: 'Social Carousel', desc: 'Three cinematic 1080x1080 panels with display headlines' },
    { name: 'Email Marketing', desc: 'Product-launch email with hero, CTA, and specs grid' },
  ],
  Utility: [
    { name: 'Design Brief', desc: 'Parse structured I-Lang protocol into concrete design spec' },
    { name: 'Critique', desc: '5-dimension expert design review with radar chart and scores' },
    { name: 'PM Spec', desc: 'Problem, metrics, scope, user stories, rollout plan' },
    { name: 'Meeting Notes', desc: 'Attendees, agenda, decisions, action items with owners' },
    { name: 'Team OKRs', desc: 'Quarter banner, three objectives with key result progress bars' },
    { name: 'Invoice', desc: 'Printable invoice with line items, tax, and payment instructions' },
    { name: 'HR Onboarding', desc: 'First week schedule, buddy intro, equipment checklist' },
    { name: 'Eng Runbook', desc: 'Alerts table, dashboards, procedures, on-call rotation' },
  ],
};

const STATS = [
  { value: '59', label: 'Skills' },
  { value: '138', label: 'Design Systems' },
  { value: '13', label: 'Agents' },
  { value: '93', label: 'Templates' },
];

const FIELD_CITIES = [
  '52.52°N Berlin',
  '35.68°N Tokyo',
  '31.23°N Shanghai',
  '51.51°N London',
  '40.71°N New York',
  '37.77°N San Francisco',
  '1.35°N Singapore',
  '33.87°S Sydney',
];

const PLATE_STRIPS = [
  { label: '01 Detect', tone: 'warm' },
  { label: '02 Discover', tone: 'paper' },
  { label: '03 Direct', tone: 'ink' },
  { label: '04 Deliver', tone: 'signal' },
];

const STUDIO_ROUTES = [
  {
    label: 'Create',
    title: 'Prototype canvas',
    desc: 'Open the studio with the prototype brief panel already in focus.',
    href: '/app?create=prototype',
    image: '/landing/prototype-plate.png',
    tone: 'coral',
  },
  {
    label: 'Library',
    title: 'Example wall',
    desc: 'Browse finished skills, inspect preview cards, and reuse a prompt.',
    href: '/app?tab=examples',
    image: '/landing/hero-plate.png',
    tone: 'blue',
  },
  {
    label: 'Taste',
    title: 'Design systems',
    desc: 'Jump to the curated systems before committing to a visual direction.',
    href: '/app?tab=design-systems',
    image: '/landing/detail-strip.png',
    tone: 'signal',
  },
  {
    label: 'Ship',
    title: 'Deck studio',
    desc: 'Start directly from the deck workflow with export-ready defaults.',
    href: '/app?create=deck',
    image: '/landing/deck-plate.png',
    tone: 'ink',
  },
];

type LandingCommand = {
  id: string;
  title: string;
  detail: string;
  group: string;
  href?: string;
  anchor?: string;
};

const LANDING_COMMANDS: LandingCommand[] = [
  { id: 'studio', title: 'Open Studio', detail: 'Land on the project wall', group: 'Studio', href: '/app?tab=designs' },
  { id: 'prototype', title: 'New Prototype', detail: 'Start inside the prototype creation flow', group: 'Create', href: '/app?create=prototype' },
  { id: 'deck', title: 'New Deck', detail: 'Jump straight to deck creation', group: 'Create', href: '/app?create=deck' },
  { id: 'systems', title: 'Design Systems', detail: 'Browse taste, tokens, and visual systems', group: 'Studio', href: '/app?tab=design-systems' },
  { id: 'examples', title: 'Examples', detail: 'Explore artifact shapes and prompts', group: 'Studio', href: '/app?tab=examples' },
  { id: 'routes', title: 'Studio Links', detail: 'See every deep link into the workspace', group: 'Page', anchor: 'studio-routes' },
  { id: 'gallery', title: 'Artifact Gallery', detail: 'Scroll to the editorial plate gallery', group: 'Page', anchor: 'gallery' },
  { id: 'method', title: 'Method', detail: 'Read how the studio workflow is structured', group: 'Page', anchor: 'method' },
];

function isStudioHref(href: string) {
  return href.startsWith('/app');
}

const FOOTER_LINKS: Record<string, { label: string; href: string }[]> = {
  Studio: [
    { label: 'Open Studio', href: '/app?tab=designs' },
    { label: 'New Prototype', href: '/app?create=prototype' },
    { label: 'New Deck', href: '/app?create=deck' },
    { label: 'Media Studio', href: '/app?create=image' },
  ],
  Library: [
    { label: 'Examples', href: '/app?tab=examples' },
    { label: 'Design Systems', href: '/app?tab=design-systems' },
    { label: 'Image Templates', href: '/app?tab=image-templates' },
    { label: 'Video Templates', href: '/app?tab=video-templates' },
  ],
  Connect: [
    { label: 'GitHub', href: 'https://github.com' },
    { label: 'Issues', href: 'https://github.com' },
    { label: 'Discussions', href: 'https://github.com' },
    { label: 'Contributing', href: 'https://github.com' },
  ],
  Docs: [
    { label: 'Architecture', href: '/app?tab=examples' },
    { label: 'Spec', href: '/app?tab=examples' },
    { label: 'Agent Adapters', href: '/app?tab=examples' },
    { label: 'Slidify Guide', href: '/app?create=deck' },
  ],
};

const SKILL_CATEGORY_LINKS: Record<SkillCategory, string> = {
  Decks: '/app?create=deck',
  Prototypes: '/app?create=prototype',
  Media: '/app?create=image',
  Utility: '/app?create=other',
};

function Section({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? 'visible' : 'hidden'}
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={fadeUp}
      custom={delay}
    >
      {children}
    </motion.div>
  );
}

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<SkillCategory>('Decks');
  const [transitionHref, setTransitionHref] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeCommand, setActiveCommand] = useState(0);
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();
  const heroRef = useRef<HTMLDivElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const plateYRaw = useTransform(scrollYProgress, [0, 1], [0, -62]);
  const plateScaleRaw = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const titleYRaw = useTransform(scrollYProgress, [0, 1], [0, 28]);
  const fadeRaw = useTransform(scrollYProgress, [0, 0.84], [1, 0.72]);
  const plateY = useSpring(plateYRaw, { stiffness: 90, damping: 24, mass: 0.35 });
  const plateScale = useSpring(plateScaleRaw, { stiffness: 90, damping: 26, mass: 0.35 });
  const titleY = useSpring(titleYRaw, { stiffness: 80, damping: 22, mass: 0.4 });
  const heroOpacity = useSpring(fadeRaw, { stiffness: 90, damping: 24, mass: 0.35 });

  function handleStudioLink(event: MouseEvent<HTMLAnchorElement>, href: string) {
    if (!isStudioHref(href)) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    setTransitionHref(href);
    window.setTimeout(() => {
      window.location.href = href;
    }, reduced ? 0 : 520);
  }

  const studioLinkProps = (href: string) => ({
    href,
    onClick: (event: MouseEvent<HTMLAnchorElement>) => handleStudioLink(event, href),
  });

  const filteredCommands = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LANDING_COMMANDS;
    const parts = q.split(/\s+/);
    return LANDING_COMMANDS.filter((command) => {
      const haystack = `${command.title} ${command.detail} ${command.group}`.toLowerCase();
      return parts.every((part) => haystack.includes(part));
    });
  }, [query]);

  useEffect(() => {
    setReady(true);
    function onKey(event: globalThis.KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!paletteOpen) return;
    setQuery('');
    setActiveCommand(0);
    window.setTimeout(() => commandInputRef.current?.focus(), 0);
  }, [paletteOpen]);

  useEffect(() => {
    setActiveCommand(0);
  }, [query]);

  function runLandingCommand(command: LandingCommand) {
    setPaletteOpen(false);
    if (command.href) {
      setTransitionHref(command.href);
      window.setTimeout(() => {
        window.location.href = command.href!;
      }, reduced ? 0 : 520);
      return;
    }
    if (command.anchor) {
      document.getElementById(command.anchor)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    }
  }

  function onCommandKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setPaletteOpen(false);
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveCommand((index) => Math.min(filteredCommands.length - 1, index + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveCommand((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === 'Enter' && filteredCommands[activeCommand]) {
      event.preventDefault();
      runLandingCommand(filteredCommands[activeCommand]);
    }
  }

  return (
    <div className={`landing${ready ? ' landing-ready' : ''}`}>
      {transitionHref ? (
        <motion.div
          className="studio-transition"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: EASE }}
          aria-hidden
        >
          <motion.div
            className="studio-transition-plate"
            initial={reduced ? false : { scale: 0.74, y: 34, rotateX: 8 }}
            animate={{ scale: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.52, ease: EASE }}
          >
            <span>Opening studio</span>
            <strong>{transitionHref.includes('create=deck') ? 'Deck canvas' : transitionHref.includes('design-systems') ? 'Design systems' : transitionHref.includes('examples') ? 'Example wall' : 'Creation surface'}</strong>
            <i />
          </motion.div>
        </motion.div>
      ) : null}
      {paletteOpen ? (
        <div className="landing-command-backdrop" role="presentation" onMouseDown={() => setPaletteOpen(false)}>
          <div
            className="landing-command"
            role="dialog"
            aria-modal="true"
            aria-label="Landing command palette"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="landing-command-input">
              <span aria-hidden>⌁</span>
              <input
                ref={commandInputRef}
                value={query}
                placeholder="Open a route, create, or jump down the page..."
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={onCommandKeyDown}
              />
              <kbd>Esc</kbd>
            </div>
            <div className="landing-command-list" role="listbox" aria-label="Landing commands">
              {filteredCommands.length > 0 ? (
                filteredCommands.map((command, index) => (
                  <button
                    key={command.id}
                    type="button"
                    className={`landing-command-item${index === activeCommand ? ' active' : ''}`}
                    role="option"
                    aria-selected={index === activeCommand}
                    onMouseEnter={() => setActiveCommand(index)}
                    onClick={() => runLandingCommand(command)}
                  >
                    <span>{command.group}</span>
                    <strong>{command.title}</strong>
                    <em>{command.detail}</em>
                  </button>
                ))
              ) : (
                <div className="landing-command-empty">No matching command</div>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <header className="landing-masthead" aria-label="Pixelpitch issue masthead">
        <div className="masthead-kicker">PP / 2026 · Vol. 01 / Issue Nº 08</div>
        <a {...studioLinkProps('/app?tab=designs')} className="masthead-brand">Ø Pixelpitch Studio Nº 01</a>
        <nav className="masthead-nav" aria-label="Landing navigation">
          <a {...studioLinkProps('/app?tab=examples')}>Examples</a>
          <a {...studioLinkProps('/app?tab=design-systems')}>Systems</a>
          <a {...studioLinkProps('/app?create=deck')}>Decks</a>
          <a {...studioLinkProps('/app?create=image')}>Media</a>
          <button type="button" className="masthead-command" onClick={() => setPaletteOpen(true)}>
            <span>Command</span>
            <kbd>{typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}K</kbd>
          </button>
        </nav>
      </header>

      {/* ---- I. Hero ---- */}
      <div className="hero-wrapper" ref={heroRef}>
        <div className="hero">
          <motion.div
            className="hero-content"
            initial={reduced ? undefined : { opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            style={reduced ? undefined : { y: titleY, opacity: heroOpacity }}
            transition={{ duration: 1, ease: EASE }}
          >
            <div className="hero-eyebrow">
              <span>Open-source design studio</span>
              <i>Nº 01</i>
            </div>
            <h1 className="hero-title">
              <span>Designing</span> interfaces
              <br />
              with agents, taste,
              <br />
              and <em>code</em>
            </h1>
            <p className="hero-subtitle">
              Pixelpitch turns your local coding agent into a visual studio:
              deterministic edits, critique loops, deck export, and artifact
              systems that feel composed instead of generated.
            </p>
            <div className="hero-ctas">
              <a {...studioLinkProps('/app?create=prototype')} className="cta-primary">
                Open Studio
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </a>
              <a {...studioLinkProps('/app?tab=examples')} className="cta-secondary">
                Explore examples
              </a>
            </div>
            <div className="hero-route-pills" aria-label="Studio deep links">
              <a {...studioLinkProps('/app?tab=design-systems')}>Systems</a>
              <a {...studioLinkProps('/app?create=deck')}>Deck</a>
              <a {...studioLinkProps('/app?tab=image-templates')}>Image prompts</a>
              <a {...studioLinkProps('/app?tab=video-templates')}>Video prompts</a>
            </div>
            <div className="hero-metrics" aria-label="Pixelpitch catalog metrics">
              {STATS.slice(0, 3).map((stat) => (
                <span key={stat.label}>
                  <strong>{stat.value}</strong>
                  {stat.label}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            className="hero-plate"
            initial={reduced ? undefined : { opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            style={reduced ? undefined : { y: plateY, scale: plateScale }}
            transition={{ duration: 1, delay: 0.2, ease: EASE }}
          >
            <div className="plate-caption">
              <span>FIG. 01 / PP-08</span>
              <span>Plate Nº 12 · Composed in Pixelpitch</span>
            </div>
            <div className="plate-art" aria-hidden="true">
              <img src="/landing/hero-plate.png" alt="" draggable={false} />
              <div className="plate-orbit" />
              <div className="plate-window plate-window-a">
                <span>Agent</span>
                <strong>Inspect</strong>
              </div>
              <div className="plate-window plate-window-b">
                <span>CSS</span>
                <strong>Patch</strong>
              </div>
              <div className="plate-stack">
                <i />
                <i />
                <i />
              </div>
              <div className="plate-terminal">
                <span>pnpm tools-dev</span>
                <span>critique.panel: 5 voices</span>
                <span>slidify: editable pptx</span>
              </div>
            </div>
            <div className="plate-strip">
              {PLATE_STRIPS.map((item) => (
                <div key={item.label} className={`plate-step ${item.tone}`}>
                  {item.label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
        <div className="field-strip" aria-label="Pixelpitch field locations">
          <div>
            {FIELD_CITIES.concat(FIELD_CITIES).map((city, index) => (
              <span key={`${city}-${index}`}>{city}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="studio-routes-wrapper" id="studio-routes">
        <div className="studio-routes">
          <Section className="studio-routes-copy">
            <div className="section-label">Studio Links</div>
            <h2 className="section-heading">Land inside the work, not before it.</h2>
            <p className="section-subhead">
              Every doorway opens a real studio state: the right tab, the right
              creation mode, and a matching arrival motion in the app shell.
            </p>
          </Section>
          <motion.div
            className="studio-route-grid"
            initial={reduced ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {STUDIO_ROUTES.map((route) => (
              <motion.a
                key={route.title}
                {...studioLinkProps(route.href)}
                className={`studio-route-card ${route.tone}`}
                variants={childFade}
                whileHover={reduced ? undefined : { y: -8, scale: 1.015, rotateX: 2, rotateY: route.tone === 'blue' || route.tone === 'ink' ? -3 : 3 }}
                whileTap={reduced ? undefined : { scale: 0.99 }}
              >
                <span className="studio-route-label">{route.label}</span>
                <span className="studio-route-media" aria-hidden>
                  <img src={route.image} alt="" draggable={false} />
                </span>
                <strong>{route.title}</strong>
                <span>{route.desc}</span>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </div>

      <div className="studio-preview-wrapper">
        <div className="studio-preview">
          <Section className="studio-preview-copy">
            <div className="section-label">Live Surface</div>
            <h2 className="section-heading">The landing page now points at the room behind the door.</h2>
          </Section>
          <motion.div
            className="studio-preview-stage"
            initial={reduced ? undefined : { opacity: 0, y: 42, scale: 0.985 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, ease: EASE }}
          >
            <div className="preview-sidebar">
              <div className="preview-brand">Pixelpitch</div>
              {['Prototype', 'Deck', 'Image', 'Video'].map((item, index) => (
                <a
                  key={item}
                  {...studioLinkProps(index === 1 ? '/app?create=deck' : index === 2 ? '/app?create=image' : index === 3 ? '/app?create=video' : '/app?create=prototype')}
                  className={index === 0 ? 'active' : ''}
                >
                  <span />
                  {item}
                </a>
              ))}
            </div>
            <div className="preview-workspace">
              <div className="preview-tabs">
                <a {...studioLinkProps('/app?tab=designs')} className="active">Designs</a>
                <a {...studioLinkProps('/app?tab=examples')}>Examples</a>
                <a {...studioLinkProps('/app?tab=design-systems')}>Systems</a>
              </div>
              <div className="preview-canvas">
                <img src="/landing/hero-plate.png" alt="" draggable={false} />
                <div className="preview-cursor" />
                <div className="preview-floating-card">
                  <span>Artifact stream</span>
                  <strong>Composing interface...</strong>
                </div>
              </div>
            </div>
            <div className="preview-rail">
              <span>Brief</span>
              <span>Files</span>
              <span>Preview</span>
              <span>Ship</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* ---- II. The Method ---- */}
      <div className="method-wrapper" id="method">
        <div className="method">
          <Section>
            <div className="section-label">II.</div>
            <h2 className="section-heading">The Method</h2>
            <p className="section-subhead">
              Four stages. One loop. From taste to shipped artifact — every step is
              intentional.
            </p>
          </Section>

          <motion.div
            className="method-grid"
            initial={reduced ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {METHOD_STAGES.map((stage) => (
              <motion.a
                key={stage.name}
                className="method-card"
                {...studioLinkProps(stage.href)}
                variants={childFade}
              >
                <div className="method-numeral">{stage.numeral}</div>
                <div className="method-name">{stage.name}</div>
                <div className="method-desc">{stage.desc}</div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ---- III. Gallery ---- */}
      <div className="gallery-wrapper" id="gallery">
        <div className="gallery">
          <Section>
            <div className="section-label">III.</div>
            <h2 className="section-heading">Made with PixelPitch</h2>
            <p className="section-subhead">
              Every tile below was generated by a skill — not hand-coded. The output
              is the proof.
            </p>
          </Section>

          <motion.div
            className="gallery-grid"
            initial={reduced ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            variants={stagger}
          >
            {GALLERY_ITEMS.map((item) => (
              <motion.a
                key={item.title}
                className={`gallery-item ${item.className}`}
                {...studioLinkProps(item.href)}
                style={{ '--plate-bg': item.bg } as React.CSSProperties}
                variants={childFade}
              >
                <img src={item.image} alt="" draggable={false} />
                <div className="gallery-item-swatch">
                  <span />
                  <span />
                  <span />
                </div>
                <div className="gallery-item-inner">
                  <div className="gallery-item-index">PP/{String(GALLERY_ITEMS.indexOf(item) + 1).padStart(2, '0')}</div>
                  <div className="gallery-item-title">{item.title}</div>
                  <div className="gallery-item-meta">{item.meta}</div>
                </div>
              </motion.a>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ---- IV. Skills Browser ---- */}
      <div className="skills-wrapper" id="skills">
        <div className="skills landing-section">
          <div className="detail-strip" aria-hidden="true">
            <img src="/landing/detail-strip.png" alt="" draggable={false} />
          </div>
          <Section>
            <div className="section-label">IV.</div>
            <h2 className="section-heading">59 ways to create</h2>
            <p className="section-subhead">
              Decks, prototypes, media, utilities — each skill is a curated recipe
              with taste built in.
            </p>
          </Section>

          <div className="skills-tabs">
            {(Object.keys(SKILLS) as SkillCategory[]).map((cat) => (
              <button
                key={cat}
                className={`skills-tab ${activeTab === cat ? 'active' : ''}`}
                onClick={() => setActiveTab(cat)}
                type="button"
              >
                {cat}
              </button>
            ))}
          </div>

          <motion.div
            className="skills-grid"
            key={activeTab}
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            {SKILLS[activeTab].map((skill) => (
              <a key={skill.name} className="skill-card" {...studioLinkProps(SKILL_CATEGORY_LINKS[activeTab])}>
                <div className="skill-card-name">{skill.name}</div>
                <div className="skill-card-desc">{skill.desc}</div>
              </a>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ---- V. The Craft ---- */}
      <div className="craft-wrapper" id="craft">
        <div className="craft">
          <Section>
            <div className="section-label">V.</div>
            <h2 className="section-heading">
              Design intelligence,
              <br />
              not AI slop
            </h2>
          </Section>

          <motion.div
            className="craft-principles"
            initial={reduced ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            <motion.div className="craft-plate" variants={childFade}>
              <img src="/landing/inspect-plate.png" alt="" draggable={false} />
            </motion.div>
            <motion.div className="craft-principle" variants={childFade}>
              <div className="craft-principle-title">
                Taste is
                <br />
                opinionated
              </div>
              <p className="craft-principle-body">
                138 curated design systems — not random generation. Every color
                palette, type scale, and spacing rhythm is intentional. You choose
                the aesthetic; the system enforces it.
              </p>
            </motion.div>

            <motion.div className="craft-principle" variants={childFade}>
              <div className="craft-principle-title">
                Craft has
                <br />
                rules
              </div>
              <p className="craft-principle-body">
                Color governance: max 2 accent uses per viewport. Type scales: 6–8
                sizes, strict weight discipline. Motion: springs only, no spectacle.
                Constraints are what make design feel designed.
              </p>
            </motion.div>

            <motion.div className="craft-principle" variants={childFade}>
              <div className="craft-principle-title">
                Output is
                <br />
                editable
              </div>
              <p className="craft-principle-body">
                Slidify converts to native PPTX with real text frames, shapes, and
                lines — not flattened screenshots. Every element stays editable in
                PowerPoint, Keynote, or Google Slides.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* ---- VI. Numbers ---- */}
      <div className="numbers-wrapper">
        <div className="numbers">
          <motion.div
            className="numbers-grid"
            initial={reduced ? 'visible' : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, margin: '-60px' }}
            variants={stagger}
          >
            {STATS.map((stat) => (
              <motion.div key={stat.label} variants={childFade}>
                <div className="number-block-value">{stat.value}</div>
                <div className="number-block-label">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* ---- VII. Footer ---- */}
      <div className="footer-wrapper">
        <footer className="footer">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-name">PixelPitch</div>
              <p className="footer-brand-desc">
                The design studio that thinks. Local-first, agent-powered, taste-aware
                artifact generation.
              </p>
            </div>
            {(Object.entries(FOOTER_LINKS) as [string, { label: string; href: string }[]][]).map(
              ([title, links]) => (
                <div key={title}>
                  <div className="footer-col-title">{title}</div>
                  <ul className="footer-links">
                    {links.map((link) => (
                      <li key={link.label}>
                        <a {...studioLinkProps(link.href)}>{link.label}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )}
          </div>

          <div className="footer-colophon">
            <span className="colophon-meta">
              Vol. 01 · Designed with PixelPitch · {new Date().getFullYear()}
            </span>
            <div className="colophon-actions">
              <a {...studioLinkProps('/app?tab=designs')} className="cta-primary" style={{ padding: '8px 20px', fontSize: '13px' }}>
                Open Studio
              </a>
              <a
                {...studioLinkProps('/app?tab=design-systems')}
                className="cta-secondary"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Browse systems
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
