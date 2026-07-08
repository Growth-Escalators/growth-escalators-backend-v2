import { describe, expect, it } from 'vitest';
import { buildPipelineStageColumns, normalizePipelineStages } from '../services/pipelineStages';

describe('pipeline stage normalization', () => {
  it('keeps string-stage Growth pipelines backward compatible', () => {
    const stages = normalizePipelineStages(['New Lead', 'Proposal', 'Won']);

    expect(stages.map((stage) => stage.name)).toEqual(['New Lead', 'Proposal', 'Won']);
    expect(stages.map((stage) => stage.id)).toEqual(['New Lead', 'Proposal', 'Won']);
  });

  it('normalizes Wizmatch object stages into safe ids, labels, and colors', () => {
    const stages = normalizePipelineStages([
      { id: 'submitted', name: 'Submitted', color: '#3B82F6' },
      { id: 'interviewing', name: 'Interviewing', color: '#F59E0B' },
    ]);

    expect(stages).toMatchObject([
      { id: 'submitted', name: 'Submitted', color: '#3B82F6' },
      { id: 'interviewing', name: 'Interviewing', color: '#F59E0B' },
    ]);
  });

  it('groups deals by object-stage id or label without crashing', () => {
    const columns = buildPipelineStageColumns(
      [
        { id: 'submitted', name: 'Submitted', color: '#3B82F6' },
        { id: 'interviewing', name: 'Interviewing', color: '#F59E0B' },
      ],
      [
        { id: 'deal-1', stage: 'submitted', dealValue: 1000 },
        { id: 'deal-2', stage: 'Interviewing', dealValue: '2000' },
      ],
    );

    expect(columns).toHaveLength(2);
    expect(columns[0]).toMatchObject({ stageName: 'submitted', stageLabel: 'Submitted', stageColor: '#3B82F6', totalValue: 1000 });
    expect(columns[0].deals.map((deal) => deal.id)).toEqual(['deal-1']);
    expect(columns[1]).toMatchObject({ stageName: 'interviewing', stageLabel: 'Interviewing', stageColor: '#F59E0B', totalValue: 2000 });
    expect(columns[1].deals.map((deal) => deal.id)).toEqual(['deal-2']);
  });

  it('preserves deals in unknown stages at the end', () => {
    const columns = buildPipelineStageColumns(['New', 'Won'], [
      { id: 'deal-1', stage: 'Archived old stage', dealValue: 'bad-number' },
    ]);

    expect(columns.map((column) => column.stageName)).toEqual(['New', 'Won', 'Archived old stage']);
    expect(columns[2].totalValue).toBe(0);
    expect(columns[2].deals).toHaveLength(1);
  });
});
