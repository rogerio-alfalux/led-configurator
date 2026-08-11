import { describe, expect, it } from 'vitest';
import { getStoredCustomerTotal } from './quoteTotals';

describe('getStoredCustomerTotal', () => {
  it('uses the persisted customer-paid total without re-adding taxes or dilution', () => {
    expect(getStoredCustomerTotal({ totalAmount: '1000', totalFinal: '1285.42' })).toBe(1285.42);
  });

  it('falls back to the base amount only for legacy records without totalFinal', () => {
    expect(getStoredCustomerTotal({ totalAmount: '1000', totalFinal: '0' })).toBe(1000);
  });
});
