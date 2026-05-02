/**
 * Atom id (e.g. `bg.aurora-band`) → `*ToIR` callable.
 *
 * Hand-rolled so it stays auditable: the test crew explicitly imports each
 * Tier-B recipe's IR helper. If M3.5 / future codegen adds atoms, this map
 * must be extended.
 *
 * Why hand-roll: the recipes barrel uses PascalCase + `*Version` re-exports;
 * we need a programmatic id→callable map for `describe.each` iteration.
 */

import type { GroupNodeT } from '../../ir/schema';
import type { TokensApi } from '../../tokens';

import * as R from '../../recipes';

export type IrHelper = (
  props: Record<string, unknown>,
  tokens: TokensApi,
) => GroupNodeT;

/** Atom id → IR helper. Tier-B recipes only (Tier-A primitives are tested separately). */
export const RECIPE_IR_HELPERS: Record<string, IrHelper> = {
  // anno.*
  'anno.brace-labeled':       R.annoBraceLabeledToIR as unknown as IrHelper,
  'anno.callout-bubble':      R.annoCalloutBubbleToIR as unknown as IrHelper,
  'anno.highlighter-mark':    R.annoHighlighterMarkToIR as unknown as IrHelper,
  'anno.numbered-hotspot':    R.annoNumberedHotspotToIR as unknown as IrHelper,
  'anno.redaction-bar':       R.annoRedactionBarToIR as unknown as IrHelper,
  'anno.stamp-draft':         R.annoStampDraftToIR as unknown as IrHelper,
  'anno.stamp-internal':      R.annoStampInternalToIR as unknown as IrHelper,
  'anno.stamp-new':           R.annoStampNewToIR as unknown as IrHelper,
  'anno.sticker':             R.annoStickerToIR as unknown as IrHelper,
  'anno.tooltip':             R.annoTooltipToIR as unknown as IrHelper,

  // bg.*
  'bg.aurora-corners':        R.bgAuroraCornersToIR as unknown as IrHelper,
  'bg.crosshatch':            R.bgCrosshatchToIR as unknown as IrHelper,
  'bg.diagonal':              R.bgDiagonalToIR as unknown as IrHelper,
  'bg.dot-lattice-coarse':    R.bgDotLatticeCoarseToIR as unknown as IrHelper,
  'bg.dot-lattice-fine':      R.bgDotLatticeFineToIR as unknown as IrHelper,
  'bg.line-grid':             R.bgLineGridToIR as unknown as IrHelper,
  'bg.scrim-bottom':          R.bgScrimBottomToIR as unknown as IrHelper,
  'bg.scrim-top':             R.bgScrimTopToIR as unknown as IrHelper,
  'bg.spotlight-soft':        R.bgSpotlightSoftToIR as unknown as IrHelper,
  'bg.spotlight-tight':       R.bgSpotlightTightToIR as unknown as IrHelper,

  // comp.*
  'comp.agenda-2col':         R.compAgenda2colToIR as unknown as IrHelper,
  'comp.agenda-toc':          R.compAgendaTocToIR as unknown as IrHelper,
  'comp.annotated-screenshot':R.compAnnotatedScreenshotToIR as unknown as IrHelper,
  'comp.bento-mixed':         R.compBentoMixedToIR as unknown as IrHelper,
  'comp.big-stat-hero':       R.compBigStatHeroToIR as unknown as IrHelper,
  'comp.closing-cta':         R.compClosingCtaToIR as unknown as IrHelper,
  'comp.data-overview':       R.compDataOverviewToIR as unknown as IrHelper,
  'comp.hero-investor':       R.compHeroInvestorToIR as unknown as IrHelper,
  'comp.hero-product':        R.compHeroProductToIR as unknown as IrHelper,
  'comp.quote-editorial':     R.compQuoteEditorialToIR as unknown as IrHelper,
  'comp.roadmap-quarterly':   R.compRoadmapQuarterlyToIR as unknown as IrHelper,
  'comp.section-divider-mesh':R.compSectionDividerMeshToIR as unknown as IrHelper,
  'comp.team-grid':           R.compTeamGridToIR as unknown as IrHelper,
  'comp.three-up-stats':      R.compThreeUpStatsToIR as unknown as IrHelper,

  // data.*
  'data.bar-set-h':           R.dataBarSetHToIR as unknown as IrHelper,
  'data.bar-set-v':           R.dataBarSetVToIR as unknown as IrHelper,
  'data.bullet-bar':          R.dataBulletBarToIR as unknown as IrHelper,
  'data.connector':           R.dataConnectorToIR as unknown as IrHelper,
  'data.data-table':          R.dataDataTableToIR as unknown as IrHelper,
  'data.delta-badge':         R.dataDeltaBadgeToIR as unknown as IrHelper,
  'data.donut':               R.dataDonutToIR as unknown as IrHelper,
  'data.donut-multi-segment': R.dataDonutMultiSegmentToIR as unknown as IrHelper,
  'data.kpi-row':             R.dataKpiRowToIR as unknown as IrHelper,
  'data.mini-heatmap':        R.dataMiniHeatmapToIR as unknown as IrHelper,

  // dec.*
  'dec.arrow-down':           R.decArrowDownToIR as unknown as IrHelper,
  'dec.arrow-left':           R.decArrowLeftToIR as unknown as IrHelper,
  'dec.arrow-right':          R.decArrowRightToIR as unknown as IrHelper,
  'dec.arrow-up':             R.decArrowUpToIR as unknown as IrHelper,
  'dec.brace-bottom':         R.decBraceBottomToIR as unknown as IrHelper,
  'dec.brace-left':           R.decBraceLeftToIR as unknown as IrHelper,
  'dec.brace-right':          R.decBraceRightToIR as unknown as IrHelper,
  'dec.brace-top':            R.decBraceTopToIR as unknown as IrHelper,
  'dec.bullet-dot':           R.decBulletDotToIR as unknown as IrHelper,
  'dec.corner-crop':          R.decCornerCropToIR as unknown as IrHelper,
  'dec.dotted-rule':          R.decDottedRuleToIR as unknown as IrHelper,
  'dec.hairline-rule':        R.decHairlineRuleToIR as unknown as IrHelper,
  'dec.numeral-chapter':      R.decNumeralChapterToIR as unknown as IrHelper,
  'dec.plus':                 R.decPlusToIR as unknown as IrHelper,
  'dec.section-divider':      R.decSectionDividerToIR as unknown as IrHelper,
  'dec.star-5':               R.decStar5ToIR as unknown as IrHelper,
  'dec.star-6':               R.decStar6ToIR as unknown as IrHelper,

  // mask.*
  'mask.callout':             R.maskCalloutToIR as unknown as IrHelper,
  'mask.gradient-fade-edge':  R.maskGradientFadeEdgeToIR as unknown as IrHelper,
  'mask.octagon':             R.maskOctagonToIR as unknown as IrHelper,
  'mask.rounded-rect-clip':   R.maskRoundedRectClipToIR as unknown as IrHelper,

  // surf.*
  'surf.bento-cell':          R.surfBentoCellToIR as unknown as IrHelper,
  'surf.card-bordered':       R.surfCardBorderedToIR as unknown as IrHelper,
  'surf.card-depth':          R.surfCardDepthToIR as unknown as IrHelper,
  'surf.card-flat':           R.surfCardFlatToIR as unknown as IrHelper,
  'surf.card-floating':       R.surfCardFloatingToIR as unknown as IrHelper,
  'surf.card-paper':          R.surfCardPaperToIR as unknown as IrHelper,
  'surf.card-raised':         R.surfCardRaisedToIR as unknown as IrHelper,
  'surf.frame-letterbox':     R.surfFrameLetterboxToIR as unknown as IrHelper,
  'surf.section-band':        R.surfSectionBandToIR as unknown as IrHelper,
  'surf.tape-band':           R.surfTapeBandToIR as unknown as IrHelper,

  // type.*
  'type.big-number':          R.typeBigNumberToIR as unknown as IrHelper,
  'type.big-number-gradient': R.typeBigNumberGradientToIR as unknown as IrHelper,
  'type.big-number-xl':       R.typeBigNumberXlToIR as unknown as IrHelper,
  'type.eyebrow-ruled':       R.typeEyebrowRuledToIR as unknown as IrHelper,
  'type.eyebrow-tape':        R.typeEyebrowTapeToIR as unknown as IrHelper,
  'type.numerals-tabular':    R.typeNumeralsTabularToIR as unknown as IrHelper,
  'type.pullquote-brutalist': R.typePullquoteBrutalistToIR as unknown as IrHelper,
  'type.pullquote-serif':     R.typePullquoteSerifToIR as unknown as IrHelper,

  // ui.*
  'ui.browser-mac':           R.uiBrowserMacToIR as unknown as IrHelper,
  'ui.browser-minimal':       R.uiBrowserMinimalToIR as unknown as IrHelper,
  'ui.browser-win':           R.uiBrowserWinToIR as unknown as IrHelper,
  'ui.checklist':             R.uiChecklistToIR as unknown as IrHelper,
  'ui.code-block':            R.uiCodeBlockToIR as unknown as IrHelper,
  'ui.code-block-syntax':     R.uiCodeBlockSyntaxToIR as unknown as IrHelper,
  'ui.device-laptop':         R.uiDeviceLaptopToIR as unknown as IrHelper,
  'ui.device-phone':          R.uiDevicePhoneToIR as unknown as IrHelper,
  'ui.progress-bar':          R.uiProgressBarToIR as unknown as IrHelper,
  'ui.status-dot':             R.uiStatusDotToIR as unknown as IrHelper,
  'ui.stepper':               R.uiStepperToIR as unknown as IrHelper,
  'ui.terminal-window':       R.uiTerminalWindowToIR as unknown as IrHelper,
};
