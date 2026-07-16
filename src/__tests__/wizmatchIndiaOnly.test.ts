import { describe, expect, it } from 'vitest';
import {
  WIZMATCH_INDIA_ONLY,
  isIndiaLocation,
  isConfidentUsLocation,
  passesIndiaOnlyIngestion,
} from '../config/constants';
import { INDIA_XRAY_QUERIES, GLOBAL_XRAY_QUERIES } from '../services/wizmatchXrayScraper';

// India-only sourcing guard: the ATS poller + signals list use these helpers to
// keep India + ambiguous/remote/blank and drop only *confident* US.

describe('India-only region helpers', () => {
  it('detects Indian locations', () => {
    for (const loc of ['Bengaluru', 'Bangalore, India', 'Hyderabad', 'Pune', 'Remote - India', 'Gurgaon']) {
      expect(isIndiaLocation(loc), loc).toBe(true);
    }
    for (const loc of ['New York', 'Austin, TX', '', 'Remote', null as unknown as string]) {
      expect(isIndiaLocation(loc), String(loc)).toBe(false);
    }
  });

  it('flags only confident-US locations, never India/ambiguous/blank', () => {
    for (const loc of ['New York', 'San Francisco', 'Austin', 'Seattle, WA', 'Denver', 'United States']) {
      expect(isConfidentUsLocation(loc), loc).toBe(true);
    }
    // India markers win; blank / remote / unknown are NOT confident-US.
    for (const loc of ['Bengaluru', 'Remote - India', 'Remote', '', 'Somewhere', null as unknown as string]) {
      expect(isConfidentUsLocation(loc), String(loc)).toBe(false);
    }
  });

  it('ingestion keeps India + remote/blank, drops confident-US (flag on by default)', () => {
    expect(WIZMATCH_INDIA_ONLY).toBe(true);
    expect(passesIndiaOnlyIngestion('Bengaluru')).toBe(true);
    expect(passesIndiaOnlyIngestion('Remote')).toBe(true);   // ambiguous kept
    expect(passesIndiaOnlyIngestion('')).toBe(true);          // blank kept
    expect(passesIndiaOnlyIngestion(null)).toBe(true);
    expect(passesIndiaOnlyIngestion('San Francisco, CA')).toBe(false);
    expect(passesIndiaOnlyIngestion('Austin, Texas')).toBe(false);
  });
});

describe('X-Ray seed queries', () => {
  const US_CITY_TOKENS = ['dallas', 'austin', 'seattle', 'denver', 'san francisco'];

  it('the India query set contains no US cities', () => {
    for (const query of INDIA_XRAY_QUERIES) {
      const q = query.q.toLowerCase();
      for (const token of US_CITY_TOKENS) {
        expect(q.includes(token), `${query.label} should not target ${token}`).toBe(false);
      }
    }
    expect(INDIA_XRAY_QUERIES.length).toBeGreaterThan(0);
  });

  it('the legacy global set still carries the US queries (for flag-off)', () => {
    const joined = GLOBAL_XRAY_QUERIES.map((q) => q.q.toLowerCase()).join(' ');
    expect(US_CITY_TOKENS.some((t) => joined.includes(t))).toBe(true);
  });
});
