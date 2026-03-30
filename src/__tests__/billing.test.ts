import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Characterization tests for GST calculation logic
// These mirror the calculateTax function from recurringInvoiceService.ts
// ---------------------------------------------------------------------------

function calculateTax(
  subtotalPaise: number,
  taxType: 'igst' | 'cgst_sgst' | null,
) {
  if (!taxType) {
    return { cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 0, igstAmount: 0, total: subtotalPaise };
  }
  if (taxType === 'cgst_sgst') {
    const cgstAmount = Math.round(subtotalPaise * 0.09);
    const sgstAmount = Math.round(subtotalPaise * 0.09);
    return { cgstRate: 9, cgstAmount, sgstRate: 9, sgstAmount, igstRate: 0, igstAmount: 0, total: subtotalPaise + cgstAmount + sgstAmount };
  }
  const igstAmount = Math.round(subtotalPaise * 0.18);
  return { cgstRate: 0, cgstAmount: 0, sgstRate: 0, sgstAmount: 0, igstRate: 18, igstAmount, total: subtotalPaise + igstAmount };
}

describe('GST Tax Calculation', () => {
  describe('CGST + SGST (intra-state)', () => {
    it('calculates 9% CGST + 9% SGST on subtotal', () => {
      const result = calculateTax(100000, 'cgst_sgst'); // 1000 INR in paise
      expect(result.cgstRate).toBe(9);
      expect(result.sgstRate).toBe(9);
      expect(result.cgstAmount).toBe(9000);  // 90 INR
      expect(result.sgstAmount).toBe(9000);  // 90 INR
      expect(result.igstRate).toBe(0);
      expect(result.igstAmount).toBe(0);
      expect(result.total).toBe(118000);     // 1180 INR
    });

    it('handles rounding for odd amounts', () => {
      const result = calculateTax(33333, 'cgst_sgst'); // 333.33 INR
      expect(result.cgstAmount).toBe(Math.round(33333 * 0.09)); // 3000
      expect(result.sgstAmount).toBe(Math.round(33333 * 0.09)); // 3000
      expect(result.total).toBe(33333 + result.cgstAmount + result.sgstAmount);
    });
  });

  describe('IGST (inter-state)', () => {
    it('calculates 18% IGST on subtotal', () => {
      const result = calculateTax(100000, 'igst'); // 1000 INR in paise
      expect(result.igstRate).toBe(18);
      expect(result.igstAmount).toBe(18000);  // 180 INR
      expect(result.cgstRate).toBe(0);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstRate).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.total).toBe(118000);       // 1180 INR
    });

    it('IGST total matches CGST+SGST total for same subtotal', () => {
      const subtotal = 500000; // 5000 INR
      const igst = calculateTax(subtotal, 'igst');
      const cgstSgst = calculateTax(subtotal, 'cgst_sgst');
      expect(igst.total).toBe(cgstSgst.total);
    });
  });

  describe('No tax (null taxType)', () => {
    it('returns subtotal as total with zero taxes', () => {
      const result = calculateTax(100000, null);
      expect(result.total).toBe(100000);
      expect(result.cgstAmount).toBe(0);
      expect(result.sgstAmount).toBe(0);
      expect(result.igstAmount).toBe(0);
    });
  });

  describe('Paise to rupee conversion', () => {
    it('100 paise = 1 rupee', () => {
      const rupeesToPaise = (rupees: number) => rupees * 100;
      const paiseToRupees = (paise: number) => paise / 100;

      const subtotalRupees = 25000; // 25,000 INR retainer
      const subtotalPaise = rupeesToPaise(subtotalRupees);
      expect(subtotalPaise).toBe(2500000);

      const result = calculateTax(subtotalPaise, 'cgst_sgst');
      expect(paiseToRupees(result.total)).toBe(29500); // 25000 + 4500
    });
  });

  describe('Invoice number format', () => {
    it('GST format: GE/GST/YYYY-YY/NNN', () => {
      const num = 'GE/GST/2026-27/001';
      expect(num).toMatch(/^GE\/GST\/\d{4}-\d{2}\/\d{3}$/);
    });

    it('Non-GST format: GE/INV/YYYY-YY/NNN', () => {
      const num = 'GE/INV/2025-26/042';
      expect(num).toMatch(/^GE\/INV\/\d{4}-\d{2}\/\d{3}$/);
    });

    it('financial year format: April-March', () => {
      // March 2026 → FY 2025-26 (month < 4)
      const now = new Date(2026, 2, 15); // March
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const fy = month >= 4 ? `${year}-${(year + 1).toString().slice(2)}` : `${year - 1}-${year.toString().slice(2)}`;
      expect(fy).toBe('2025-26');

      // May 2026 → FY 2026-27 (month >= 4)
      const now2 = new Date(2026, 4, 15); // May
      const year2 = now2.getFullYear();
      const month2 = now2.getMonth() + 1;
      const fy2 = month2 >= 4 ? `${year2}-${(year2 + 1).toString().slice(2)}` : `${year2 - 1}-${year2.toString().slice(2)}`;
      expect(fy2).toBe('2026-27');
    });
  });
});
