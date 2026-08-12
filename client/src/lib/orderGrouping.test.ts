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

  it('groups profiles with the same technical composition despite legacy text differences', () => {
    const baseProfile: CartItemData = {
      category: 'Perfis',
      sku: 'LLP-6060',
      description: 'BLAZE H Pendente 18W 3000K ON/OFF 220Vac 4805mm',
      power: '18W',
      cct: '3000K',
      corPeca: 'Branco Fosco Micro',
      qty: 1,
      unitPrice: 100,
      totalPrice: 100,
      photoUrl: null,
      moduloLed: 'texto legado na ordem A',
      drivers: 'texto legado de driver A',
      profileSegments: [
        { sku: 'LLP-6060.2IF.48F', qty: 2, lengthMm: 1125, barsPerPiece: 2, driverQtyPerPiece: 1, driverModel: 'DRIVER 19W', driverCode: 'EQ00346' },
        { sku: 'LLP-6060.5ML.48F', qty: 1, lengthMm: 2800, barsPerPiece: 5, driverQtyPerPiece: 1, driverModel: 'DRIVER 44W', driverCode: 'EQ00347' },
      ],
      driverLines: [
        { driverCode: 'EQ00346', driverModel: 'DRIVER 19W', qty: 2, unitPrice: 54 },
        { driverCode: 'EQ00347', driverModel: 'DRIVER 44W', qty: 1, unitPrice: 100 },
      ],
    };

    const sameTechnicalProfile = {
      ...baseProfile,
      description: 'BLAZE H Pendente — composição formatada de outro modo',
      moduloLed: 'texto legado na ordem B',
      drivers: 'texto legado de driver B',
      itemEmPlanta: 'L05',
    };

    const grouped = groupOrderItems([baseProfile, sameTechnicalProfile]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].qty).toBe(2);
  });

  it('does not group profiles with different normalized technical composition', () => {
    const profile: CartItemData = {
      category: 'Perfis', sku: 'LLP-6060', description: 'BLAZE H 18W', power: '18W', cct: '3000K', qty: 1, unitPrice: 100, totalPrice: 100, photoUrl: null,
      profileSegments: [{ sku: 'LLP-6060.2IF.48F', qty: 2, lengthMm: 1125, barsPerPiece: 2, driverQtyPerPiece: 1, driverModel: 'DRIVER 19W', driverCode: 'EQ00346' }],
    };
    const differentComposition = {
      ...profile,
      profileSegments: [{ sku: 'LLP-6060.3IF.48F', qty: 2, lengthMm: 1685, barsPerPiece: 3, driverQtyPerPiece: 1, driverModel: 'DRIVER 44W', driverCode: 'EQ00347' }],
    };

    expect(groupOrderItems([profile, differentComposition])).toHaveLength(2);
  });

  it('groups historical profiles without profileSegments when legacy technical lines are equivalent', () => {
    const legacyProfile: CartItemData = {
      category: 'Perfis', sku: 'LLP-6060', description: 'BLAZE H 18W 4805MM', power: '18W', cct: '3000K', qty: 1, unitPrice: 100, totalPrice: 100, photoUrl: null,
      moduloLed: '2 x STRIPFLEX 562,5\n1 x STRIPFLEX 562,5',
      drivers: '2 x DRIVER 19W\n1 x DRIVER 44W',
    };
    const sameLegacyProfile: CartItemData = {
      ...legacyProfile,
      description: 'BLAZE H 18W — apresentação antiga diferente',
      power: undefined,
      moduloLed: '1 x   STRIPFLEX 562,5\n2 X stripflex 562,5',
      drivers: '1 x driver 44w\n2 X DRIVER 19W',
    };

    const grouped = groupOrderItems([legacyProfile, sameLegacyProfile]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].qty).toBe(2);
  });
});
