import { safeText } from './safe.js';

function slugify(value, fallback) {
  const slug = safeText(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug || fallback;
}

export function normalizePipelineStage(stage, index = 0) {
  if (typeof stage === 'string') {
    const name = stage.trim();
    return name ? { id: name, name, color: null, raw: stage } : null;
  }
  if (!stage || typeof stage !== 'object') return null;

  const name = safeText(stage.name) || safeText(stage.label) || safeText(stage.id) || safeText(stage.key) || safeText(stage.slug);
  if (!name.trim()) return null;

  const id = safeText(stage.id) || safeText(stage.key) || safeText(stage.slug) || slugify(name, `stage-${index + 1}`);
  return {
    id: id.trim(),
    name: name.trim(),
    color: safeText(stage.color) || null,
    raw: stage,
  };
}

export function normalizePipelineStages(stages) {
  if (!Array.isArray(stages)) return [];
  return stages
    .map((stage, index) => normalizePipelineStage(stage, index))
    .filter(Boolean);
}

export function editableStageNames(stages) {
  return normalizePipelineStages(stages).map((stage) => stage.name);
}
