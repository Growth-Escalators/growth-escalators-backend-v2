import { describe, it, expect } from 'vitest';
import { scoreBooking, determineSequence, buildDealTitle } from '../services/qualificationService';

describe('Lead Scoring — scoreBooking', () => {
  describe('tier classification', () => {
    it('score >= 70 = Hot', () => {
      const result = scoreBooking({
        'ad_spend': '1.5L',           // 40 pts
        'decision_maker': 'yes',       // 30 pts
      });
      expect(result.totalScore).toBeGreaterThanOrEqual(70);
      expect(result.tier).toBe('hot');
    });

    it('score 40-69 = Warm', () => {
      const result = scoreBooking({
        'monthly_spend': '50k',        // 25 pts
        'is_decision_maker': 'yes',    // 30 pts
      });
      expect(result.totalScore).toBeGreaterThanOrEqual(40);
      expect(result.totalScore).toBeLessThan(70);
      expect(result.tier).toBe('warm');
    });

    it('score < 40 = Cold', () => {
      const result = scoreBooking({
        'ad_budget': '10k',            // 10 pts
        'decision': 'no',              // 0 pts
      });
      expect(result.totalScore).toBeLessThan(40);
      expect(result.tier).toBe('cold');
    });
  });

  describe('ad spend scoring', () => {
    it('1L+ spend = 40 points', () => {
      const result = scoreBooking({ 'ad_spend': '1.5L' });
      expect(result.breakdown.adSpend).toBe(40);
    });

    it('"above 1" spend = 40 points', () => {
      const result = scoreBooking({ 'monthly_budget': 'above 1 lakh' });
      expect(result.breakdown.adSpend).toBe(40);
    });

    it('50k spend = 25 points', () => {
      const result = scoreBooking({ 'ad_spend': '50k' });
      expect(result.breakdown.adSpend).toBe(25);
    });

    it('25k spend = 15 points', () => {
      const result = scoreBooking({ 'ad_spend': '25k' });
      expect(result.breakdown.adSpend).toBe(15);
    });

    it('10k spend = 10 points', () => {
      const result = scoreBooking({ 'ad_spend': '10k' });
      expect(result.breakdown.adSpend).toBe(10);
    });

    it('unknown spend = 0 points', () => {
      const result = scoreBooking({ 'ad_spend': 'not sure' });
      expect(result.breakdown.adSpend).toBe(0);
    });
  });

  describe('decision maker scoring', () => {
    it('yes = 30 points', () => {
      const result = scoreBooking({ 'decision_maker': 'yes' });
      expect(result.breakdown.decisionMaker).toBe(30);
    });

    it('Yes (case-insensitive via key matching) = 30 points', () => {
      const result = scoreBooking({ 'Are you the decision maker?': 'Yes' });
      expect(result.breakdown.decisionMaker).toBe(30);
    });

    it('no = 0 points', () => {
      const result = scoreBooking({ 'decision_maker': 'no' });
      expect(result.breakdown.decisionMaker).toBe(0);
    });
  });

  describe('revenue scoring', () => {
    it('10L+ revenue = 20 points', () => {
      const result = scoreBooking({ 'monthly_revenue': '10L' });
      expect(result.breakdown.revenue).toBe(20);
    });

    it('5L+ revenue = 15 points', () => {
      const result = scoreBooking({ 'monthly_revenue': '5L' });
      expect(result.breakdown.revenue).toBe(15);
    });

    it('1L+ revenue = 10 points', () => {
      const result = scoreBooking({ 'monthly_revenue': '1L' });
      expect(result.breakdown.revenue).toBe(10);
    });
  });

  describe('platform scoring', () => {
    it('meta ads running = 10 points', () => {
      const result = scoreBooking({ 'running ads on which platform': 'meta' });
      expect(result.breakdown.platform).toBe(10);
    });

    it('facebook = 10 points', () => {
      const result = scoreBooking({ 'platform': 'Facebook' });
      expect(result.breakdown.platform).toBe(10);
    });

    it('instagram = 10 points', () => {
      const result = scoreBooking({ 'platform': 'Instagram' });
      expect(result.breakdown.platform).toBe(10);
    });

    it('google = 0 points', () => {
      const result = scoreBooking({ 'platform': 'Google' });
      expect(result.breakdown.platform).toBe(0);
    });
  });

  describe('combined scoring', () => {
    it('max score = 100 (40+30+20+10)', () => {
      const result = scoreBooking({
        'ad_spend': '2L',              // 40
        'decision_maker': 'yes',       // 30
        'monthly_revenue': '15L',      // 20
        'platform': 'Meta',            // 10
      });
      expect(result.totalScore).toBe(100);
      expect(result.tier).toBe('hot');
    });

    it('min score = 0 (no matching answers)', () => {
      const result = scoreBooking({});
      expect(result.totalScore).toBe(0);
      expect(result.tier).toBe('cold');
    });
  });
});

describe('determineSequence', () => {
  it('returns Healthcare for health-related answers', () => {
    const seq = determineSequence('warm', { 'business': 'clinic' });
    expect(seq).toBe('Healthcare Lead Nurture');
  });

  it('returns D2C for other answers', () => {
    const seq = determineSequence('hot', { 'business': 'ecommerce brand' });
    expect(seq).toBe('D2C Lead Nurture');
  });
});

describe('buildDealTitle', () => {
  it('returns Meta Ads Retainer for meta-related answers', () => {
    const title = buildDealTitle({ 'platform': 'Meta Ads' }, 'Jatin');
    expect(title).toBe('Meta Ads Retainer — Jatin');
  });

  it('returns Full Retainer for non-meta answers', () => {
    const title = buildDealTitle({ 'platform': 'Google Ads' }, 'Jatin');
    expect(title).toBe('Full Retainer — Jatin');
  });
});
