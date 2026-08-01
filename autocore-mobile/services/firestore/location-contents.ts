import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  where,
} from 'firebase/firestore';

import { normalizeCompanyId } from '@/lib/company-id';
import { buildLocationEntityLink } from '@/lib/warehouse/location-entity-link';
import { getFirebaseDb } from '@/services/firebase';
import type { LocationContentsResponse } from '@/features/warehouse/location-screen';

/**
 * Direct Firestore read for location detail — works even when Next.js
 * `/api/mobile/inventory/locations/:id` is not deployed yet.
 */
export async function fetchLocationContentsFromFirestore(params: {
  companyId: string;
  locationId: string;
}): Promise<LocationContentsResponse> {
  const companyId = normalizeCompanyId(params.companyId);
  const locationId = params.locationId.trim();
  if (!companyId || !locationId) {
    throw new Error('Location not found');
  }

  const db = getFirebaseDb();
  const locationSnap = await getDoc(doc(db, 'warehouseLocations', locationId));
  if (!locationSnap.exists()) {
    throw new Error('Location not found');
  }

  const locationData = locationSnap.data() as Record<string, unknown>;
  if (normalizeCompanyId(String(locationData.companyId ?? '')) !== companyId) {
    throw new Error('Location not found');
  }

  const path = Array.isArray(locationData.path)
    ? locationData.path.map((part) => String(part))
    : [];
  const code = String(locationData.code ?? '');
  const displayCode =
    typeof locationData.displayCode === 'string' && locationData.displayCode.trim()
      ? locationData.displayCode.trim()
      : path.filter(Boolean).join('-') || code;

  const location = {
    id: locationSnap.id,
    warehouseId: String(locationData.warehouseId ?? ''),
    displayCode,
    code,
    label: typeof locationData.label === 'string' ? locationData.label : undefined,
    type: String(locationData.type ?? 'custom'),
    barcode:
      typeof locationData.barcode === 'string' && locationData.barcode.trim()
        ? locationData.barcode.trim()
        : buildLocationEntityLink(locationSnap.id),
    isSystem: Boolean(locationData.isSystem),
  };

  const items: LocationContentsResponse['items'] = [];
  let totalOnHand = 0;
  let totalAvailable = 0;
  let engineCount = 0;

  const balanceSnap = await getDocs(
    query(
      collection(db, 'inventoryLocationBalances'),
      where('companyId', '==', companyId),
      where('locationId', '==', locationId),
      limit(500),
    ),
  );

  const itemIds = balanceSnap.docs
    .map((entry) => String(entry.data().itemId ?? ''))
    .filter(Boolean);

  const itemSnaps = await Promise.all(
    itemIds.map((itemId) => getDoc(doc(db, 'inventoryItems', itemId))),
  );
  const itemById = new Map(
    itemSnaps
      .filter((snap) => snap.exists())
      .map((snap) => [snap.id, snap.data() as Record<string, unknown>]),
  );

  for (const entry of balanceSnap.docs) {
    const data = entry.data() as Record<string, unknown>;
    const onHand = Number(data.onHand ?? 0);
    const available = Number(data.available ?? onHand);
    if (onHand <= 0 && available <= 0) continue;
    totalOnHand += onHand;
    totalAvailable += available;
    const itemId = String(data.itemId ?? '');
    const item = itemById.get(itemId);
    items.push({
      kind: 'part',
      id: itemId,
      title: String(item?.name ?? itemId),
      subtitle: typeof item?.sku === 'string' ? item.sku : undefined,
      sku: typeof item?.sku === 'string' ? item.sku : undefined,
      quantity: onHand,
      available,
    });
  }

  try {
    const motorSnap = await getDocs(
      query(
        collectionGroup(db, 'motors'),
        where('companyId', '==', companyId),
        where('primaryLocationId', '==', locationId),
        limit(200),
      ),
    );
    for (const entry of motorSnap.docs) {
      const data = entry.data() as Record<string, unknown>;
      if (data.deletedAt || data.soldDate) continue;
      engineCount += 1;
      const brand = typeof data.brandName === 'string' ? data.brandName : '';
      const engine = typeof data.engineCode === 'string' ? data.engineCode : '';
      const serial = String(data.serialCode ?? entry.id);
      items.push({
        kind: 'motor',
        id: String(data.localId ?? entry.id),
        title: [brand, engine].filter(Boolean).join(' ') || serial,
        subtitle: serial,
        serialCode: serial,
        quantity: Number(data.quantity ?? 1) || 1,
      });
    }
  } catch {
    // Index may still be building — parts still show.
  }

  try {
    const specificSnap = await getDocs(
      query(
        collection(db, 'specificRecords'),
        where('companyId', '==', companyId),
        where('primaryLocationId', '==', locationId),
        limit(200),
      ),
    );
    for (const entry of specificSnap.docs) {
      const data = entry.data() as Record<string, unknown>;
      const rowData =
        data.data && typeof data.data === 'object' && !Array.isArray(data.data)
          ? (data.data as Record<string, string>)
          : {};
      const title =
        rowData['Номер двигателя'] ||
        rowData.serialCode ||
        rowData.warehouseLocation ||
        entry.id;
      items.push({
        kind: 'specific',
        id: entry.id,
        title,
        subtitle: rowData['Комплектация'] || rowData.configuration,
        quantity: Number(rowData['Кол-во'] || rowData.quantity || 1) || 1,
      });
    }
  } catch {
    // optional
  }

  return {
    location,
    occupancy: {
      lineCount: items.length,
      totalOnHand,
      totalAvailable,
      engineCount,
    },
    items,
  };
}
