import { useCallback, useEffect, useMemo, useState } from 'react';
import { useT } from '../i18n';
import {
  fetchDesignSystem,
  fetchDesignSystemPreview,
  fetchDesignSystemPreviewCard,
  fetchDesignSystemShowcase,
} from '../providers/registry';
import type { DesignSystemSummary } from '../types';
import { DesignSpecView } from './DesignSpecView';
import { PreviewModal } from './PreviewModal';

interface Props {
  open?: boolean;
  system: DesignSystemSummary;
  onClose: () => void;
}

const PREVIEW_CARDS = [
  { file: 'color_palette.html', label: 'Colors' },
  { file: 'type_specimen.html', label: 'Typography' },
  { file: 'components.html', label: 'Components' },
  { file: 'spacing_and_rules.html', label: 'Spacing' },
  { file: 'brand_motifs.html', label: 'Motifs' },
] as const;

export function DesignSystemPreviewModal({ open = true, system, onClose }: Props) {
  const t = useT();
  const [showcaseHtml, setShowcaseHtml] = useState<string | null | undefined>(undefined);
  const [tokensHtml, setTokensHtml] = useState<string | null | undefined>(undefined);
  const [specBody, setSpecBody] = useState<string | null | undefined>(undefined);
  const [cardHtmls, setCardHtmls] = useState<Record<string, string | null | undefined>>({});

  const handleView = useCallback(
    (viewId: string) => {
      if (viewId === 'showcase' && showcaseHtml === undefined) {
        setShowcaseHtml(null);
        void fetchDesignSystemShowcase(system.id).then((html) => setShowcaseHtml(html));
      }
      if (viewId === 'tokens' && tokensHtml === undefined) {
        setTokensHtml(null);
        void fetchDesignSystemPreview(system.id).then((html) => setTokensHtml(html));
      }
      const card = PREVIEW_CARDS.find((c) => c.file === viewId);
      if (card && cardHtmls[viewId] === undefined) {
        setCardHtmls((prev) => ({ ...prev, [viewId]: null }));
        void fetchDesignSystemPreviewCard(system.id, card.file).then((html) =>
          setCardHtmls((prev) => ({ ...prev, [viewId]: html })),
        );
      }
    },
    [system.id, showcaseHtml, tokensHtml, cardHtmls],
  );

  const handleSidebarToggle = useCallback(
    (open: boolean) => {
      if (!open || specBody !== undefined) return;
      setSpecBody(null);
      void fetchDesignSystem(system.id).then((detail) =>
        setSpecBody(detail?.body ?? null),
      );
    },
    [system.id, specBody],
  );

  useEffect(() => {
    setShowcaseHtml(undefined);
    setTokensHtml(undefined);
    setSpecBody(undefined);
    setCardHtmls({});
  }, [system.id]);

  const views = useMemo(() => {
    const base = [
      { id: 'showcase', label: t('ds.showcase'), html: showcaseHtml },
      { id: 'tokens', label: t('ds.tokens'), html: tokensHtml },
    ];
    for (const card of PREVIEW_CARDS) {
      base.push({ id: card.file, label: card.label, html: cardHtmls[card.file] });
    }
    return base;
  }, [t, showcaseHtml, tokensHtml, cardHtmls]);

  return (
    <PreviewModal
      open={open}
      title={system.title}
      subtitle={system.summary || system.category}
      views={views}
      initialViewId="showcase"
      onView={handleView}
      exportTitleFor={(viewId) => `${system.title} — ${viewId}`}
      onClose={onClose}
      sidebar={{
        label: t('ds.specToggle'),
        defaultOpen: true,
        onToggle: handleSidebarToggle,
        contentKey: system.id,
        content: (
          <DesignSpecView
            source={specBody}
            loadingLabel={t('ds.specLoading')}
          />
        ),
      }}
    />
  );
}
