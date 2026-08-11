import { describe, expect, it } from 'vitest';
import { groupOrderItems } from './orderGrouping';
import type { CartItemData } from './cartTypes';

function specialItem(dimensions: string): CartItemData {
  return {
    category: 'Item Especial',
    sku: 'ITEM ESPECIAL',
    description: 'ARANDELA ESPECIAL',
    qty: 1,
    unitPrice: 100,
    totalPrice: 100,
    photoUrl: null,
    isSpecialItem: true,
    specialDescription: 'ARANDELA ESPECIAL',
    specialDimensions: dimensions,
  };
}

describe('groupOrderItems', () => {
  it('does not group special items with different dimensions', () => {
    const grouped = groupOrderItems([specialItem('100x100mm'), specialItem('200x100mm')]);
    expect(grouped).toHaveLength(2);
    expect(grouped.map(item => item.specialDimensions)).toEqual(['100x100mm', '200x100mm']);
  });

  it('keeps equal special items grouped', () => {
    const grouped = groupOrderItems([specialItem('100x100mm'), specialItem('100x100mm')]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].qty).toBe(2);
  });
});
