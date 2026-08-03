# Firebase integration QA matrix

## Environment

- [ ] Copy `.env.example` to `.env` and fill `EXPO_PUBLIC_FIREBASE_*`
- [ ] `EXPO_PUBLIC_API_BASE_URL` defaults to `https://app.myautocore.com` in release builds (override for local Next.js: `http://localhost:3000`)
- [ ] Google/Apple OAuth client IDs configured for physical device tests

## Auth shell

- [ ] Cold start shows loading, then login when signed out
- [ ] Email login routes through verify-email → profile-name → company → tabs
- [ ] Invite code join links user to company and opens tabs
- [ ] Sign out from profile returns to login

## Realtime data

- [ ] Work orders list updates when web creates/edits an order
- [ ] Inventory search returns Firestore catalog items
- [ ] Overview overview reflects open orders count

## Mobile API

- [ ] Scan resolves barcode via `POST /api/mobile/scan/resolve`
- [ ] Order status transition via `POST /api/mobile/work-orders/:id/transition`
- [ ] 401 responses retry once with refreshed ID token

## Firestore indexes

Ensure composite indexes exist for mobile queries:

- `inventoryItems`: `companyId` ASC, `updatedAt` DESC
- `companies/{id}/clients`: `updatedAt` DESC
- `companies/{id}/vehicles`: `updatedAt` DESC
- `companies/{id}/workOrders`: `updatedAt` DESC
- `barcodeMappings`: `companyId` ASC, `barcode` ASC

## Offline

- [ ] App loads cached Firestore data when network is unavailable
- [ ] Auth errors surface when token expires offline
