/**
 * StoreKit purchase sheet never appears when OpenIAP awaits unfinished-transaction
 * cleanup (kills the tap gesture) then calls `purchase(confirmIn:)`, which hangs
 * on iOS 18–26. react-native-iap also treats a missing product-type cache as
 * an in-app purchase, so a subscription SKU lookup can stall before the sheet.
 *
 * CocoaPods compiles these files from node_modules / Pods, so this re-applies
 * after install. Idempotent via AUTOCORE_IAP_SHEET markers.
 */
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const hybridPath = join(root, 'node_modules/react-native-iap/ios/HybridRnIap.swift');
const openIapPath = join(
  root,
  'ios/Pods/openiap/packages/apple/Sources/OpenIapModule.swift',
);

function patchHybrid(source) {
  if (source.includes('AUTOCORE_IAP_SHEET: never default')) return source;
  return source.replace(
    `                let cachedType = await MainActor.run { self.productTypeBySku[iosRequest.sku] }
                let resolvedType = RnIapHelper.parseProductQueryType(cachedType)
                let purchaseType: ProductQueryType = resolvedType == .all ? .inApp : resolvedType`,
    `                let cachedType = await MainActor.run { self.productTypeBySku[iosRequest.sku] }
                // AUTOCORE_IAP_SHEET: never default a subscription SKU to in-app.
                let resolvedType = RnIapHelper.parseProductQueryType(cachedType ?? "subs")
                let purchaseType: ProductQueryType = resolvedType == .all ? .subs : resolvedType`,
  );
}

function patchOpenIap(source) {
  let next = source;
  if (!next.includes('AUTOCORE_IAP_SHEET: do not await preflight')) {
    next = next.replace(
      `        if StoreKitTypesBridge.isAutoRenewingSubscriptionProductType(product.type) {
            await preflightInactiveUnfinishedSubscriptions(productId: sku)
        }`,
      `        // AUTOCORE_IAP_SHEET: do not await preflight — StoreKit needs
        // purchase() on the tap's call stack. Unfinished transactions are
        // finished on connect from JS and in a background Task here.
        if StoreKitTypesBridge.isAutoRenewingSubscriptionProductType(product.type) {
            Task { await self.preflightInactiveUnfinishedSubscriptions(productId: sku) }
        }`,
    );
  }
  if (!next.includes('AUTOCORE_IAP_SHEET: confirmIn hangs')) {
    next = next.replace(
      `        return try await product.purchase(confirmIn: scene, options: options)`,
      `        // AUTOCORE_IAP_SHEET: confirmIn hangs on iOS 18+ when any await
        // has already left the tap gesture. purchase(options:) still presents.
        return try await product.purchase(options: options)`,
    );
  }
  if (!next.includes('AUTOCORE_IAP_SHEET: finish any unfinished auto-renewable')) {
    next = next.replace(
      `                guard StoreKitTypesBridge.isAutoRenewingSubscriptionProductType(
                    transaction.productType
                ),
                      transaction.productID == productId,
                      isInactiveSubscriptionTransaction(transaction)
                else {
                    continue
                }`,
      `                // AUTOCORE_IAP_SHEET: finish any unfinished auto-renewable.
                // A leftover yearly transaction blocks the monthly sheet.
                guard StoreKitTypesBridge.isAutoRenewingSubscriptionProductType(
                    transaction.productType
                ) else {
                    continue
                }`,
    );
  }
  return next;
}

function apply(path, transform, marker) {
  if (!existsSync(path)) return;
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (after !== before) {
    try {
      chmodSync(path, 0o644);
    } catch {
      // Pod sources are often 0444; ignore if we cannot chmod and let write throw.
    }
    writeFileSync(path, after);
  }
  const applied = readFileSync(path, 'utf8');
  if (!applied.includes(marker)) {
    throw new Error(`StoreKit purchase patch did not apply: ${path}`);
  }
}

apply(hybridPath, patchHybrid, 'AUTOCORE_IAP_SHEET: never default');
apply(openIapPath, patchOpenIap, 'AUTOCORE_IAP_SHEET: confirmIn hangs');
