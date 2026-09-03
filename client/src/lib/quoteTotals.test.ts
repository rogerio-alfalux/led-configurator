import { describe, expect, it } from 'vitest';
import { applyItemDiscount, applyQuoteDiscount, calculateQuoteTotalWithDiscountAndTax, getDisplayedCustomerTotal, getStoredCustomerTotal } from './quoteTotals';

describe('getStoredCustomerTotal', () => {
  it('uses the persisted customer-paid total without re-adding taxes or dilution', () => {
    expect(getStoredCustomerTotal({ totalAmount: '1000', totalFinal: '1285.42' })).toBe(1285.42);
  });

  it('falls back to the base amount only for legacy records without totalFinal', () => {
    expect(getStoredCustomerTotal({ totalAmount: '1000', totalFinal: '0' })).toBe(1000);
  });

  it('aplica o desconto antes de frete e DIFAL/FCP sem alterar a base de itens', () => {
    expect(applyQuoteDiscount(1000, 0.1)).toBe(900);
    expect(applyQuoteDiscount(1000, 10)).toBe(10);
    expect(applyQuoteDiscount(1000, -0.2)).toBe(1000);
  });

  it('aplica desconto individual em pontos percentuais de forma cumulativa ao desconto global', () => {
    const afterItemDiscount = applyItemDiscount(1000, 10);
    expect(afterItemDiscount).toBe(900);
    expect(applyQuoteDiscount(afterItemDiscount, 0.1)).toBe(810);
  });

  it('calcula DIFAL/FCP somente depois de reduzir a base pelo desconto', () => {
    const totals = calculateQuoteTotalWithDiscountAndTax({
      productsBeforeDiscount: 1000,
      discountPercent: 0.1,
      freteValue: 100,
      difalEnabled: true,
      combinedTaxRate: 10,
    });
    expect(totals.productsAfterDiscount).toBe(900);
    expect(totals.baseForTax).toBe(1000);
    expect(totals.totalFinal).toBeCloseTo(1111.11, 2);
    expect(totals.taxAmount).toBeCloseTo(111.11, 2);
  });

  it('não inclui frete não cotado na base nem no total com DIFAL/FCP', () => {
    const totals = calculateQuoteTotalWithDiscountAndTax({
      productsBeforeDiscount: 1000,
      freteValue: 0,
      difalEnabled: true,
      combinedTaxRate: 10,
    });

    expect(totals.baseForTax).toBe(1000);
    expect(totals.totalFinal).toBeCloseTo(1111.11, 2);
    expect(totals.taxAmount).toBeCloseTo(111.11, 2);
  });

  it('recompõe no cartão o total de um orçamento legado com desconto não persistido', () => {
    const gross = calculateQuoteTotalWithDiscountAndTax({
      productsBeforeDiscount: 1000,
      freteValue: 100,
      difalEnabled: true,
      combinedTaxRate: 10,
    }).totalFinal;
    const displayed = getDisplayedCustomerTotal({
      totalAmount: 1000,
      totalFinal: gross,
      discountPercent: 0.1,
      freteValue: 100,
      difalEnabled: true,
      destState: 'RJ',
    });
    expect(displayed).toBeLessThan(gross);
  });
});
