export interface DesignSystemTokens {
  version: 1;

  meta: {
    id: string;
    title: string;
    category: string;
    summary: string;
    surface: 'web' | 'image' | 'video' | 'audio';
  };

  colors: {
    paper: string;
    ink: string;
    slate: string;
    signal: string;
    bone: string;
    border: string;
    surface: string;
    extended: Record<string, string>;
    semantic: {
      success?: string;
      warning?: string;
      danger?: string;
      info?: string;
    };
  };

  typography: {
    fontDisplay: string;
    fontBody: string;
    fontMono: string;
    fontUi?: string;
    ramp: Array<{
      role: string;
      fontKey: 'display' | 'body' | 'mono' | 'ui';
      size: string;
      weight: number;
      lineHeight: string;
      letterSpacing: string;
      textTransform?: 'uppercase' | 'none';
      notes?: string;
    }>;
    googleFontsUrl?: string;
  };

  spacing: {
    base: number;
    scale: Record<string, string>;
  };

  radii: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    full: string;
  };

  depth: Array<{
    level: number;
    name: string;
    treatment: string;
  }>;

  components: {
    buttonRadius: string;
    buttonPaddingBlock: string;
    buttonPaddingInline: string;
    cardRadius: string;
    cardBorder: string;
    cardShadow: string;
  };

  motion?: {
    duration: string;
    easing: string;
  };
}
