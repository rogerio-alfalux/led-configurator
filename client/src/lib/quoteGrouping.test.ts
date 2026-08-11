import { describe, expect, it } from 'vitest';
import { getDuplicateQuoteGroupSizes, getDuplicateQuoteKey } from '@shared/quoteGrouping';

describe('quote duplicate grouping', () => {
  it('groups only quotes with the same normalized project and final value', () => {
    const groups = getDuplicateQuoteGroupSizes([
      { id: 1, projectName: '  Casa  Aurora ', totalFinal: '1250.00' },
      { id: 2, projectName: 'casa aurora', totalFinal: 1250 },
      { id: 3, projectName: 'Casa Aurora', totalFinal: 1200 },
    ]);
    expect(groups.get(getDuplicateQuoteKey('CASA AURORA', 1250)!)).toBe(2);
    expect(groups.get(getDuplicateQuoteKey('Casa Aurora', 1200)!)).toBe(1);
  });

  it('does not group empty projects or zero totals', () => {
    expect(getDuplicateQuoteKey('', 100)).toBeNull();
    expect(getDuplicateQuoteKey('Casa Aurora', 0)).toBeNull();
  });
});
