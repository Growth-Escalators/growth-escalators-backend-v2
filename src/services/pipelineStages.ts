export type PipelineStageInput =
  | string
  | {
      id?: unknown;
      key?: unknown;
      slug?: unknown;
      name?: unknown;
      label?: unknown;
      color?: unknown;
    };

export interface NormalizedPipelineStage {
  id: string;
  name: string;
  color: string | null;
  raw: PipelineStageInput;
}

export interface PipelineStageColumn<TDeal extends { stage?: unknown; dealValue?: unknown }> {
  stageId: string;
  stageName: string;
  stageLabel: string;
  stageColor: string | null;
  deals: TDeal[];
  totalValue: number;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function slugify(value: string, fallback: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || fallback;
}

function numeric(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function normalizePipelineStage(stage: PipelineStageInput, index = 0): NormalizedPipelineStage | null {
  if (typeof stage === 'string') {
    const name = cleanString(stage);
    if (!name) return null;
    return { id: name, name, color: null, raw: stage };
  }

  if (!stage || typeof stage !== 'object') return null;

  const name = cleanString(stage.name) || cleanString(stage.label) || cleanString(stage.id) || cleanString(stage.key) || cleanString(stage.slug);
  if (!name) return null;

  const id = cleanString(stage.id) || cleanString(stage.key) || cleanString(stage.slug) || slugify(name, `stage-${index + 1}`);
  return {
    id,
    name,
    color: cleanString(stage.color),
    raw: stage,
  };
}

export function normalizePipelineStages(stages: unknown): NormalizedPipelineStage[] {
  if (!Array.isArray(stages)) return [];
  return stages
    .map((stage, index) => normalizePipelineStage(stage as PipelineStageInput, index))
    .filter((stage): stage is NormalizedPipelineStage => Boolean(stage));
}

export function pipelineStageKey(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function buildPipelineStageColumns<TDeal extends { stage?: unknown; dealValue?: unknown }>(
  stages: unknown,
  deals: TDeal[],
): PipelineStageColumn<TDeal>[] {
  const normalizedStages = normalizePipelineStages(stages);
  const stageMap: Record<string, TDeal[]> = {};
  for (const deal of deals) {
    const stageName = String(deal.stage ?? 'Unknown');
    if (!stageMap[stageName]) stageMap[stageName] = [];
    stageMap[stageName].push(deal);
  }

  const usedStageKeys = new Set<string>();
  const columns = normalizedStages.map((stage) => {
    const stageDeals = Object.entries(stageMap).flatMap(([rawStageName, stageDeals]) => {
      const rawKey = pipelineStageKey(rawStageName);
      const matches = rawKey === pipelineStageKey(stage.id) || rawKey === pipelineStageKey(stage.name);
      if (matches) usedStageKeys.add(rawKey);
      return matches ? stageDeals : [];
    });

    return {
      stageId: stage.id,
      stageName: stage.id,
      stageLabel: stage.name,
      stageColor: stage.color,
      deals: stageDeals,
      totalValue: stageDeals.reduce((sum, deal) => sum + numeric(deal.dealValue), 0),
    };
  });

  for (const [stageName, stageDeals] of Object.entries(stageMap)) {
    if (!usedStageKeys.has(pipelineStageKey(stageName))) {
      columns.push({
        stageId: stageName,
        stageName,
        stageLabel: stageName,
        stageColor: null,
        deals: stageDeals,
        totalValue: stageDeals.reduce((sum, deal) => sum + numeric(deal.dealValue), 0),
      });
    }
  }

  return columns;
}
