export interface DesignDirection {
  /** kebab-case id, also the form-option label after `: ` */
  id: string;
  /** Short user-facing label, shown in the radio. */
  label: string;
  /** One-paragraph mood description shown to the user as `help`. */
  mood: string;
  /** References / exemplars: real magazines, products, designers. */
  references: string[];
  /** Headline display font stack. CSS-ready. */
  displayFont: string;
  /** Body font stack. CSS-ready. */
  bodyFont: string;
  /** Optional mono override; falls back to ui-monospace. */
  monoFont?: string;
  /** Six palette values in OKLch. Direction picker can bind these into `:root`. */
  palette: {
    bg: string;
    surface: string;
    fg: string;
    muted: string;
    border: string;
    accent: string;
  };
  /** Layout posture cues for the agent. Concrete, not vague. */
  posture: string[];
  /** Texture / material cues that should influence backgrounds, surfaces, and depth. */
  materiality?: string[];
  /** Motion and interaction cues for generated prototypes. */
  motion?: string[];
  /** Imagery / art-direction cues. */
  imagery?: string[];
}
