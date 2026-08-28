import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { InventoryItem } from '../../types/inventory';

import {
  filterCatalogItems,
  inventoryToChipOption,
  laborCatalogOptions,
  partCatalogOptions,
} from './catalog';

function item(overrides: Partial<InventoryItem> & Pick<InventoryItem, 'id' | 'type' | 'sku' | 'name'>): InventoryItem {
  return {
    companyId: 'c1',
    barcodes: [],
    unit: 'pcs',
    totalOnHand: 4,
    totalReserved: 0,
    totalAvailable: 4,
    status: 'active',
    sellPrice: 90,
    ...overrides,
  };
}

const catalog: InventoryItem[] = [
  item({
    id: 'svc-1',
    type: 'service',
    sku: 'LAB-ALIGN',
    name: 'Wheel alignment',
    sellPrice: 120,
  }),
  item({
    id: 'inst-1',
    type: 'installation',
    sku: 'LAB-MOUNT',
    name: 'Engine mount install',
    sellPrice: 80,
  }),
  item({
    id: 'part-1',
    type: 'filter',
    sku: 'W712/95',
    name: 'Oil filter Mann',
    sellPrice: 18,
  }),
  item({
    id: 'dead-1',
    type: 'filter',
    sku: 'OLD-1',
    name: 'Archived filter',
    status: 'archived',
  }),
];

describe('filterCatalogItems', () => {
  const rows = [
    { title: 'Oil filter Mann', sku: 'W712/95' },
    { title: 'Brake pads', sku: 'P85020' },
  ];

  it('returns nothing until there is a query', () => {
    assert.deepEqual(
      filterCatalogItems(rows, '', [(row) => row.title, (row) => row.sku]),
      [],
    );
  });

  it('matches a SKU without the title', () => {
    const matched = filterCatalogItems(rows, 'W712', [(row) => row.title, (row) => row.sku]);
    assert.equal(matched.length, 1);
    assert.equal(matched[0]?.sku, 'W712/95');
  });

  it('caps the result so a short query cannot flood the strip', () => {
    const matched = filterCatalogItems(rows, 'a', [(row) => row.title], 1);
    assert.equal(matched.length, 1);
  });
});

describe('laborCatalogOptions', () => {
  it('keeps active labour and installation rows with service chips', () => {
    const options = laborCatalogOptions(catalog);
    assert.deepEqual(
      options.map((option) => option.value),
      ['Wheel alignment', 'Engine mount install'],
    );
    assert.equal(options[0]?.meta?.chipKind, 'service');
    assert.equal(options[0]?.meta?.price, 120);
  });
});

describe('partCatalogOptions', () => {
  it('excludes labour rows and archived stock', () => {
    const options = partCatalogOptions(catalog, 'sku');
    assert.equal(options.length, 1);
    assert.equal(options[0]?.value, 'W712/95');
    assert.equal(options[0]?.meta?.chipKind, 'part');
  });

  it('commits the display name when the name field is focused', () => {
    const options = partCatalogOptions(catalog, 'name');
    assert.equal(options[0]?.value, 'Oil filter Mann');
  });
});

describe('inventoryToChipOption', () => {
  it('uses the name as the commit value for labour', () => {
    const option = inventoryToChipOption(catalog[0]!, 'service');
    assert.equal(option.value, 'Wheel alignment');
    assert.equal(option.meta?.sku, 'LAB-ALIGN');
  });
});
