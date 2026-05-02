/**
 * Tier-A primitives — hand-written structural components per CONTRACT-v2 §B.1.
 *
 * The codegen-emitted Tier-B recipes (`components/src/recipes/`) import
 * these by name. Stable export contract: each primitive ships a default
 * React component AND a `<name>ToIR(props, tokens?)` named emitter.
 */

export { default as FrameBento, frameBentoToIR } from './FrameBento';
export type { FrameBentoProps, FrameBentoCell } from './FrameBento';

export { default as FrameSplit, frameSplitToIR } from './FrameSplit';
export type { FrameSplitProps } from './FrameSplit';

export { default as FrameThreeUp, frameThreeUpToIR } from './FrameThreeUp';
export type { FrameThreeUpProps } from './FrameThreeUp';

export { default as FrameLetterbox, frameLetterboxToIR } from './FrameLetterbox';
export type { FrameLetterboxProps } from './FrameLetterbox';

export { default as FrameSection, frameSectionToIR } from './FrameSection';
export type { FrameSectionProps, SectionStripSide } from './FrameSection';

export { default as FrameSafeArea, frameSafeAreaToIR } from './FrameSafeArea';
export type { FrameSafeAreaProps, SafeAreaPadding } from './FrameSafeArea';

export { default as SlotHeading, slotHeadingToIR } from './SlotHeading';
export type { SlotHeadingProps, HeadingScale } from './SlotHeading';

export { default as SlotEyebrow, slotEyebrowToIR } from './SlotEyebrow';
export type { SlotEyebrowProps, EyebrowRulePosition } from './SlotEyebrow';

export { default as SlotCaption, slotCaptionToIR } from './SlotCaption';
export type { SlotCaptionProps, CaptionRegister } from './SlotCaption';

export { default as SlotNumeral, slotNumeralToIR } from './SlotNumeral';
export type { SlotNumeralProps, NumeralScale } from './SlotNumeral';

export { default as SlotQuote, slotQuoteToIR } from './SlotQuote';
export type { SlotQuoteProps } from './SlotQuote';

export { default as SlotList, slotListToIR } from './SlotList';
export type { SlotListProps, ListMarker } from './SlotList';

export { default as SlotCode, slotCodeToIR } from './SlotCode';
export type { SlotCodeProps } from './SlotCode';

export { default as DataSparkline, dataSparklineToIR } from './DataSparkline';
export type { DataSparklineProps } from './DataSparkline';

export { default as DataBar, dataBarToIR } from './DataBar';
export type { DataBarProps, BarOrientation } from './DataBar';

export { default as DataDonut, dataDonutToIR } from './DataDonut';
export type { DataDonutProps, DonutSegment } from './DataDonut';

export { default as DataKpiRow, dataKpiRowToIR } from './DataKpiRow';
export type { DataKpiRowProps, KpiCell } from './DataKpiRow';

export { default as DataTable, dataTableToIR } from './DataTable';
export type { DataTableProps, CellAlign } from './DataTable';

export { default as DiagramConnector, diagramConnectorToIR } from './DiagramConnector';
export type { DiagramConnectorProps, ConnectorKind } from './DiagramConnector';

export { default as DiagramTimeline, diagramTimelineToIR } from './DiagramTimeline';
export type { DiagramTimelineProps, TimelineEvent } from './DiagramTimeline';
