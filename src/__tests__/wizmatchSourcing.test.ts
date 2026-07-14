import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractKeywords, pollAshby, pollGreenhouse, pollLever } from '../services/wizmatchAtsPoller';
import { buildTheirStackQuery, previewTheirStackImport } from '../services/wizmatchTheirStackImporter';
import { buildRequirementXraySearch } from '../services/wizmatchXrayScraper';
import {
  getWizmatchSourcingConfig,
  ingestWizmatchSignals,
  isAuditOnlyRequirementTitle,
} from '../services/wizmatchSourcing';

describe('results-first sourcing controls', () => {
  const base = { WIZMATCH_TENANT_ID: 'tenant', DISABLE_BACKGROUND_JOBS: 'false' } as NodeJS.ProcessEnv;

  it('keeps every source independently default-off', () => {
    expect(getWizmatchSourcingConfig(base)).toMatchObject({
      masterEnabled: false,
      theirstackEnabled: false,
      atsEnabled: false,
      xrayEnabled: false,
      pocDiscoveryEnabled: false,
    });
  });

  it('activates only requested and configured providers', () => {
    const config = getWizmatchSourcingConfig({
      ...base,
      WIZMATCH_SOURCE_AUTOMATION_ENABLED: 'true',
      WIZMATCH_THEIRSTACK_IMPORT_ENABLED: 'true',
      THEIRSTACK_API_KEY: 'present',
      WIZMATCH_POC_DISCOVERY_ENABLED: 'true',
    });
    expect(config).toMatchObject({ masterEnabled: true, theirstackEnabled: true, atsEnabled: false, xrayEnabled: false, pocDiscoveryEnabled: true });
  });

  it('caps pilot quotas', () => {
    const config = getWizmatchSourcingConfig({
      ...base,
      WIZMATCH_SOURCE_AUTOMATION_ENABLED: 'true',
      WIZMATCH_THEIRSTACK_LIMIT: '999',
      WIZMATCH_XRAY_DAILY_CAP: '999',
      WIZMATCH_XRAY_MONTHLY_CAP: '999',
    });
    expect(config.theirstackLimit).toBe(25);
    expect(config.xrayDailyCap).toBe(10);
    expect(config.xrayMonthlyCap).toBe(100);
  });

  it('excludes retained audit-only requirements from operating queues', () => {
    expect(isAuditOnlyRequirementTitle('ZZ AUDIT TEST - Backend (DELETE ME)')).toBe(true);
    expect(isAuditOnlyRequirementTitle('SAP ABAP Consultant')).toBe(false);
  });
});

describe('shared signal ingestion', () => {
  it('rejects incomplete rows and counts provider duplicates without inserting again', async () => {
    const calls: string[] = [];
    const db = {
      async query(sql: string) {
        calls.push(sql);
        if (sql.includes('INSERT INTO wizmatch_companies')) return { rows: [{ id: 'company-1' }] };
        if (sql.includes('UPDATE wizmatch_job_signals')) return { rows: [{ id: 'signal-1' }] };
        return { rows: [] };
      },
    };
    const result = await ingestWizmatchSignals('tenant', [
      { job_title: '', source: 'theirstack' },
      { job_title: 'SAP ABAP Consultant', source: 'theirstack', provider_id: 'job-1', company_name: 'Company A', location: 'Pune' },
    ], db);
    expect(result).toEqual({ inserted: 0, updated: 1, duplicates: 1, rejected: 1, errors: 0 });
    expect(calls.some((sql) => sql.includes('INSERT INTO wizmatch_job_signals'))).toBe(false);
  });
});

describe('TheirStack pilot query', () => {
  it('uses the reviewed India specializations and incremental cursor', () => {
    expect(buildTheirStackQuery(15, '2026-07-01T00:00:00.000Z')).toMatchObject({
      limit: 15,
      job_country_code_or: ['IN'],
      discovered_at_gte: '2026-07-01T00:00:00.000Z',
    });
    expect(buildTheirStackQuery(15).job_title_or).toContain('sap abap');
  });

  it('reports configuration without exposing the key', () => {
    const preview = previewTheirStackImport({
      WIZMATCH_TENANT_ID: 'tenant', DISABLE_BACKGROUND_JOBS: 'false', WIZMATCH_SOURCE_AUTOMATION_ENABLED: 'true',
      WIZMATCH_THEIRSTACK_IMPORT_ENABLED: 'true', THEIRSTACK_API_KEY: 'secret',
    } as NodeJS.ProcessEnv);
    expect(preview).toMatchObject({ enabled: true, configured: true, limit: 15 });
    expect(JSON.stringify(preview)).not.toContain('secret');
  });
});

describe('ATS provider contracts', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('normalizes Greenhouse, Lever, and Ashby public fixtures', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobs: [{ id: 1, title: 'SAP ABAP Consultant', absolute_url: 'https://gh/job/1', updated_at: '2026-07-01', location: { name: 'Pune' }, departments: [], metadata: [] }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'lever-1', text: 'Java Backend Developer', hostedUrl: 'https://lever/job/1', createdAt: 1_700_000_000_000, categories: { location: 'Bengaluru', team: 'Engineering', commitment: 'Full-time' } }] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ jobs: [{ id: 'ashby-1', title: 'JavaScript Frontend Developer', location: 'Remote India', jobUrl: 'https://ashby/job/1', postedAt: '2026-07-01', employmentType: 'Full-time' }] }) });
    vi.stubGlobal('fetch', fetchMock);
    expect((await pollGreenhouse('company'))[0]).toMatchObject({ provider_id: '1', source: 'greenhouse', location: 'Pune' });
    expect((await pollLever('company'))[0]).toMatchObject({ provider_id: 'lever-1', source: 'lever', employment_type: 'FTE' });
    expect((await pollAshby('company'))[0]).toMatchObject({ provider_id: 'ashby-1', source: 'ashby' });
  });

  it('surfaces provider status errors and preserves specialization keywords', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 429 }));
    await expect(pollLever('limited')).rejects.toThrow('Lever API 429');
    expect(extractKeywords('SAP FICO Consultant', '')).toContain('sap fico');
    expect(extractKeywords('JavaScript Frontend Developer', '')).toContain('javascript');
  });
});

describe('requirement-first LinkedIn X-Ray', () => {
  it('keeps SAP and Java specializations in the generated public search evidence', () => {
    expect(buildRequirementXraySearch('SAP ABAP', 'Pune').q).toContain('"SAP ABAP developer"');
    expect(buildRequirementXraySearch('Java', 'Bengaluru').q).toContain('"Java developer"');
    expect(buildRequirementXraySearch('JavaScript', 'India').skills).toEqual(['javascript']);
  });
});
