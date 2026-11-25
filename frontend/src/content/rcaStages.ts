/**
 * Typed re-export of content/rca_stages.json — RCA tier ids, labels, and mappings.
 */

import raw from '@content/rca_stages.json';

export interface RcaStageProgression {
  subtitle: string;
  description: string;
}

export interface RcaStageIntro {
  subtitle: string;
}

export interface RcaStageDefinition {
  id: string;
  order: number;
  short: string;
  label: string;
  round_label: string;
  deepening_bar_key: string;
  cost_analytics_key: string;
  result_filename: string;
  export_pdf_filename: string;
  progression: RcaStageProgression;
  intro: RcaStageIntro;
}

export interface RcaStagesContent {
  _version: string;
  _description: string;
  stages: RcaStageDefinition[];
  priority_stage_completed_rounds: Record<string, number>;
  analytics: {
    deepening_tier_heading: string;
    file_priority_chart: { priority: string; name: string }[];
    cost_tabs: { total: { short: string; label: string } };
  };
}

const content = raw as RcaStagesContent;

/** Ordered stage definitions (Tier_1 → Tier_2 → Final). */
export const RCA_STAGES = [...content.stages].sort((a, b) => a.order - b.order);

/** API / storage stage identifier (must match content/rca_stages.json). */
export type RcaStageId = 'Tier_1' | 'Tier_2' | 'Final';

export const RCA_STAGE_IDS: readonly RcaStageId[] = RCA_STAGES.map(
  (s) => s.id as RcaStageId,
);

export const STAGE_TAB_DEFS = RCA_STAGES.map((s) => ({
  short: s.short,
  label: s.label,
  round: s.round_label,
  stage: s.id as RcaStageId,
}));

export const STAGE_DEFS_BY_ID: Record<
  string,
  { short: string; label: string }
> = Object.fromEntries(
  RCA_STAGES.map((s) => [s.id, { short: s.short, label: s.label }]),
);

export const DEEPENING_BAR_STEPS = RCA_STAGES.map((s) => ({
  key: s.deepening_bar_key,
  label: s.label,
  short: s.short,
}));

export const TIER_PROGRESSION_STEPS = RCA_STAGES.map((s) => ({
  key: s.id as RcaStageId,
  label: s.label,
  subtitle: s.progression.subtitle,
  description: s.progression.description,
}));

export const TIER_INTRO_STEPS = RCA_STAGES.map((s) => ({
  key: s.id as RcaStageId,
  label: s.label,
  subtitle: s.intro.subtitle,
}));

export const TIER_LABELS: Record<RcaStageId, string> = Object.fromEntries(
  RCA_STAGES.map((s) => [s.id, s.label]),
) as Record<RcaStageId, string>;

export function tierLabel(stageId: RcaStageId): string {
  return TIER_LABELS[stageId] ?? stageId;
}

export function priorityStageCompletedCount(
  priorityStage: string | undefined,
): number {
  const map = content.priority_stage_completed_rounds;
  if (!priorityStage) return map.default ?? 0;
  return map[priorityStage] ?? map.default ?? 0;
}

export const ANALYTICS_PRIORITY_CHART = content.analytics.file_priority_chart;

export const DEEPENING_TIER_HEADING = content.analytics.deepening_tier_heading;

export type CostAnalyticsStageKey = RcaStageDefinition['cost_analytics_key'];
export type CostStageTabKey = 'total' | CostAnalyticsStageKey;

export const COST_ANALYTICS_STAGE_KEYS = RCA_STAGES.map(
  (s) => s.cost_analytics_key,
) as CostAnalyticsStageKey[];

export const COST_STAGE_TAB_DEFS: {
  key: CostStageTabKey;
  short: string;
  label: string;
}[] = [
  { key: 'total', ...content.analytics.cost_tabs.total },
  ...RCA_STAGES.map((s) => ({
    key: s.cost_analytics_key as CostAnalyticsStageKey,
    short: s.short,
    label: s.label,
  })),
];

/** Cost/compression tabs on RCA detail tables (Total + per-stage). */
export type RcaDetailCostTabKey = 'Total' | RcaStageId;

export const RCA_DETAIL_COST_TAB_DEFS: Record<
  RcaDetailCostTabKey,
  { short: string; label: string; sublabel: string }
> = {
  Total: { short: 'Σ', label: 'Total', sublabel: 'All passes' },
  ...Object.fromEntries(
    RCA_STAGES.map((s) => [
      s.id,
      { short: s.short, label: s.label, sublabel: `${s.label} only` },
    ]),
  ) as Record<RcaStageId, { short: string; label: string; sublabel: string }>,
};
