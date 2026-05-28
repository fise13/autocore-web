# AutoCore: разница между macOS/iOS (натив) и Web

> Сравнение актуально на май 2026.  
> Натив: `/Users/victor/Desktop/AutoCore/AutoCore/` (точка входа — `AutoCoreApp.swift`).  
> Web: `/Users/victor/Documents/autocore-web/`.

---

## 1. Краткий вывод

| Область | macOS (AutoCoreApp) | Web (Next.js) |
|--------|---------------------|---------------|
| Платформа | Desktop-first, SwiftUI + AppKit grid | Browser, React + Firestore realtime |
| Локальные данные | SQLite per user (мотors, specific, accounting) | Нет локальной БД, только Firestore |
| Склад | Простая таблица + legacy Firestore schema | Excel-grid + movement ledger + расширенная schema |
| Undo | Системное меню + `NSUndoManager` + `AppViewModel.undoManager` | `GridCommandBus` + глобальный Cmd+Z в workspace |
| Mission Control | ❌ | ✅ Главная страница `/` |
| Billing / Stripe | ❌ | ✅ Pro-подписка, paywall |
| macOS menu bar shortcuts | ✅ Полный набор в `AutoCoreApp.swift` | ⚠️ Частично (toolbar + window listeners) |

**Главный риск:** склад и inventory на macOS и web **пишут в одну коллекцию `inventoryItems`, но с разной структурой полей**. Данные могут конфликтовать между клиентами.

---

## 2. Точка входа: `AutoCoreApp.swift` (macOS)

Файл целиком обёрнут в `#if os(macOS)` — это **desktop-приложение**, не iOS-shell.

### 2.1. Bootstrap и навигация по состояниям

```
Firebase.configure()
  → AuthViewModel.authState
      .loading / .authenticating → SplashView
      .unauthenticated          → LoginView (+ Google Sign-In URL handler)
      .authenticated
          companyId пустой       → OnboardingView
          !userConfig onboarding → UserConfigOnboardingView
          appViewModel готов     → RootView (основное приложение)
          ошибка БД              → ContentUnavailableView
```

**Web-аналог:**

| macOS | Web |
|-------|-----|
| `SplashView` | Loading в `auth-provider` / skeleton |
| `LoginView` | `/login` |
| `OnboardingView` | `company-gate`, создание компании |
| `UserConfigOnboardingView` | ❌ отдельного шага нет |
| `RootView` | `dashboard-shell` + routes |

### 2.2. Окна (только macOS)

`FixedMainWindowConfigurator` управляет режимами:

- **Login:** фиксированный размер 420×520, без fullscreen, без resize
- **App:** min 900×600, auto-fullscreen при входе

Web: responsive layout, без window chrome.

### 2.3. Системное меню и горячие клавиши (macOS)

Определены в `.commands` блока `AutoCoreApp`:

| Действие | Shortcut | Web-эквивалент |
|----------|----------|----------------|
| Undo | ⌘Z | ⌘Z (глобально через `workspace-context` + grid) |
| Redo | ⌘⇧Z | ⌘⇧Z |
| Новый мотор | ⌘N | ❌ нет глобального |
| Import Excel | ⌘I | Import в toolbar (warehouse/motors) |
| Export Excel | ⌘E | Export в toolbar |
| Command Palette | ⌘K | ⌘K (`command-palette-provider`) |
| Save + sync | ⌘S | ⌘S (`registerSaveHandler`) |
| Mark sold | ⌘⇧S | ❌ нет глобального |
| Duplicate motor | ⌘D | ❌ нет |
| Workspace tab bar toggle | меню View | ❌ |

**Undo на macOS (двухуровневый):**

```swift
// AutoCoreApp.swift — меню «Правка»
if windowUndoManager.canUndo { windowUndoManager.undo() }
else { appViewModel.undoManager.undo() }
```

- Grid (`GridCommandBus`) → `NSUndoManager` окна
- Операции моторов (add/edit/batch) → `AppViewModel.undoManager`

**Web:** один стек `GridCommandBus` на grid + регистрация в workspace; операции уровня приложения (add motor) undo **не покрывают**.

---

## 3. Навигация и модули

### macOS (`NavigationSection` в `AppViewModel`)

| Section | UI |
|---------|-----|
| `.all` | Все моторы + Excel grid (AppKit) |
| `.sold` | Проданные |
| `.specificCategory(id)` | Specific grid + service records |
| `.accounting` | AccountingView |
| `.warehouse` | WarehouseView (SwiftUI table) |

Дополнительно: `SidebarView`, `WorkspaceTabBar`, кастомизация sidebar (`SidebarCustomization`).

### Web (routes в `app-sidebar.tsx`)

| Route | UI |
|-------|-----|
| `/` | **Mission Control** (нет на macOS) |
| `/motors` | Motors Excel grid (React) |
| `/sold` | Sold motors grid |
| `/specific/[categoryId]` | Specific Excel grid |
| `/accounting` | Accounting workspace |
| `/warehouse` | Warehouse Excel grid |
| `/employees` | Сотрудники (**web-only page**) |
| `/roles` | Роли (**web-only page**) |
| `/settings` | Настройки + billing |

---

## 4. Excel Grid — архитектура

Оба проекта используют **общую концепцию** (viewport, selection, fill handle, paste, command bus), но реализация разная.

| Компонент | macOS | Web |
|-----------|-------|-----|
| Рендер | AppKit `ExcelGridView`, `CellReusePool`, `NSView` | React virtualized div grid |
| Data store | `GridDataStore` (Swift) | `warehouse-grid-data-store`, `grid-data-store`, `specific-grid-data-store` |
| Layout | `GridLayoutEngine` | `warehouse-grid-layout-engine`, `motor-grid-layout` |
| Undo | `GridCommandBus` → `NSUndoManager` | `GridCommandBus` (JS class) + `handleGridUndo` |
| Motors grid | AppKit (production) | `motors-excel-grid.tsx` |
| Specific grid | AppKit / SwiftUI hybrid | `specific-excel-grid.tsx` |
| Warehouse grid | ❌ **нет Excel grid** | `warehouse-excel-grid.tsx` |

### Колонки моторов

- **macOS:** `MotorSheetColumn` — номер двигателя, комплектация, notes, qty, КПП, дата прихода…
- **Web:** те же поля, pattern скопирован из macOS grid UX

### Undo/redo в grid

| Поведение | macOS | Web |
|-----------|-------|-----|
| Edit cell | NSUndoManager | GridCommandBus commit |
| Paste / Fill / Clear | Batch undo step | Batch undo step |
| Cmd+Z в overlay editor | NSUndoManager textarea | Сброс к `initialValue`, затем grid undo |
| Cmd+Z вне grid focus | Меню macOS | Window capture listener |
| Undo add motor | AppViewModel.undoManager | ❌ |

---

## 5. Склад (Warehouse) — **критическое расхождение**

### macOS (`WarehouseView` + `WarehouseViewModel`)

**UI:** SwiftUI `Table` / list, не Excel.

**Модель (`InventoryItemEntity`):**

```
id, companyId, name, partNumber, category (string),
quantity, buyPrice, sellPrice, createdAt, updatedAt
```

**Firestore write (`FirestoreInventoryRepository`):**

```json
{
  "name", "partNumber", "category",
  "quantity", "buyPrice", "sellPrice"
}
```

**Движения (`FirestoreInventoryMovementRepository`):**

```json
{
  "itemId", "type", "quantityDelta", "comment"
}
```

Операции: create item, income (`AddInventoryUseCase`), expense (`RemoveInventoryUseCase`), import/export XLSX (`WarehouseExcelService` — 6 колонок).

### Web (`warehouse-workspace` + movement engine)

**UI:** Full Excel grid (15+ колонок), dialogs (receipt, adjust, sale, transfer, barcode, import preview).

**Модель (`InventoryItem`):**

```
sku, name, categoryPath[], brandName, supplierName, barcodes[],
unit, totalOnHand, totalReserved, totalAvailable,
purchasePrice, sellPrice, warehouseLocation, lowStockThreshold,
status, stockValue, type (consumable/oil/filter/…)
```

**Остатки:** не пишутся напрямую — только через `recordMovementUseCase` (receipt, issue, consumption, adjustment, transfer…).

**Коллекции (дополнительно на web):**

- `inventoryStockLevels`
- `inventoryMovements` (полная audit schema)
- `warehouses`, `suppliers`, `barcodeMappings`, `inventoryImports`

### Таблица совместимости полей

| macOS field | Web field | Совместимость |
|-------------|-----------|---------------|
| `partNumber` | `sku` | ❌ разные имена |
| `category` | `categoryPath[]` | ❌ string vs array |
| `quantity` | `totalOnHand` | ❌ прямая запись vs aggregate |
| `buyPrice` | `purchasePrice` | ⚠️ разные имена |
| `sellPrice` | `sellPrice` | ✅ |
| — | `totalReserved`, `supplierName`, `barcode`… | ❌ macOS не знает |

**Вывод:** web-рефакторинг склада под **расходники/сервисный inventory** не отражён в macOS. Нужна миграция native client или разделение collection.

---

## 6. Моторы и синхронизация

| | macOS | Web |
|---|-------|-----|
| Primary store | SQLite (`DatabaseService`) | Firestore |
| Cloud path | `users/{uid}/motors` + dirty queue (`MotorFirestoreDirtyTracker`) | `users/{uid}/motors` + `collectionGroup("motors")` |
| Save model | Local first → flush on Cmd+S | Realtime listeners + cloud push |
| Offline | ✅ SQLite | ❌ требует сеть |
| Batch sell/duplicate | ✅ notifications + undo | Partial (context menu) |
| Import AI (OpenRouter) | ✅ `ImportOpenRouterMappingService` | Import engines exist, AI pipeline partial |

---

## 7. Specific + Service Records

| | macOS | Web |
|---|-------|-----|
| Specific categories | SQLite + sidebar | Firestore `specificCategories` |
| Specific grid | AppKit Excel grid | `specific-excel-grid.tsx` |
| Service records view | ✅ `ServiceRecordsView` внутри specific category | ❌ отдельного UI нет |
| Service records search | `serviceRecordsSearchText` | — |

---

## 8. Бухгалтерия

| | macOS | Web |
|---|-------|-----|
| UI | `AccountingView` + analysis (`AccountingAnalysisView`) | `accounting-workspace` |
| iOS companion | `AutoCoreAccounting` (отдельный target) | — |
| Excel analysis import | ✅ `ExcelAccountingAnalysisService` | ❌ |
| Financial sync | `FirestoreFinancialSyncService` + SQLite | `financial-operation-repository` Firestore-only |
| Warehouse-linked ops | Basic | `relatedInventoryItemId`, `relatedMovementId` |

---

## 9. Команда, RBAC, billing

| Функция | macOS | Web |
|---------|-------|-----|
| Employees UI | `MacCompanyMembersView` (settings sheet) | `/employees` full workspace |
| Invites | `MacInviteManagementView` | employees workspace |
| Roles | `MacRolesManagementView` | `/roles` |
| Activity log | Firestore `companies/{id}/activityLogs` | ✅ Mission Control timeline |
| Stripe / Pro | ❌ | ✅ `billing-gate-provider`, paywall on import/export |
| Mission Control metrics | ❌ | ✅ overview modules |

---

## 10. Настройки

### macOS (`SettingsViewModel.SettingsSection`)

Общие · Аккаунт · Внешний вид · Возможности · Бухгалтерия · Резервные копии · Импорт/экспорт · Поведение · Дополнительно

### Web (`settings-shell`)

account · company · accounting · sync · dataCleanup · macOnly

| | macOS | Web |
|---|-------|-----|
| Local backup (iOS) | ✅ | ❌ |
| Data cleanup panel | Tester/debug | ✅ `data-cleanup-panel` (warehouse wipe) |
| Cloud sync policy UI | `CloudSyncBanner` | sync settings section |
| Feature flags | ✅ `FeatureFlagService` | ❌ |

---

## 11. Только macOS

- AppKit Excel grid (AppKit performance, cell reuse pool)
- Auto-fullscreen workspace
- Google Sign-In native SDK
- `UpdateService` (in-app updates)
- `UserConfigOnboardingView`
- `WorkspaceTabBar` toggle
- DEBUG Tester panel (⌘⇧T)
- Widget data writer (iOS target)
- Recovery mode / read-only SQLite
- `MotorSaleNotificationService`
- Invoice models (`InvoiceModels.swift`)
- Native XLSX generation (ZIPFoundation) для warehouse export

---

## 12. Только Web

- Mission Control dashboard (`/`)
- Warehouse Excel grid + movement workflows
- Work order consumption use case (`consume-for-work-order.ts`) — schema ready, UI pending
- Multi-warehouse, transfers, barcode scan panel
- Inventory import preview/apply pipeline
- Stripe subscription + Pro gating
- Employees/Roles dedicated pages
- Firestore listener guard / snapshot error UX
- Responsive sidebar resize
- AGENTS.md Next.js conventions

---

## 13. Firebase / Firestore

Общий проект Firebase (`AutoCore/firebase/`):

- Rules расширены на web для `inventoryItems`, `inventoryMovements`, `inventoryStockLevels`, `warehouses`…
- macOS warehouse repository использует **упрощённые поля** — rules могут пропускать write, но **семантика данных расходится**

### Индексы

Web добавил composite indexes для `inventoryItems`, `inventoryMovements`. macOS warehouse queries проще и могут не требовать те же indexes.

---

## 14. Рекомендации по выравниванию

### P0 — Склад

1. Обновить macOS `InventoryItemEntity` + repositories под web schema (`sku`, movement aggregates, service categories).
2. Заменить `WarehouseView` table на Excel grid **или** явно пометить macOS warehouse as deprecated.
3. Миграция Firestore: `partNumber` → `sku`, `quantity` → rebuild from movements.

### P1 — UX parity

1. Перенести macOS menu shortcuts (⌘N, ⌘D, ⌘⇧S) в web toolbar hints.
2. Добавить web undo для app-level actions (add/delete motor) — по аналогии с `AppViewModel.undoManager`.
3. Service records UI на web для specific categories.

### P2 — Platform

1. `UserConfigOnboarding` на web (если нужен parity).
2. Mission Control виджет/ summary на macOS sidebar.
3. Единый документ keyboard shortcuts (`docs/KEYBOARD.md`).

---

## 15. Файлы для cross-reference

| Тема | macOS | Web |
|------|-------|-----|
| App entry | `AutoCore/AutoCoreApp.swift` | `src/app/layout.tsx` |
| Main shell | `Views/RootView.swift` | `components/layout/dashboard-shell.tsx` |
| Grid core | `Views/GridCore/*` | `src/lib/grid/*`, `src/components/*-excel-grid.tsx` |
| Warehouse | `Views/WarehouseView.swift` | `components/warehouse/*` |
| Inventory domain | `Domain/Entities/InventoryItemEntity.swift` | `src/domain/inventory.ts` |
| Undo | `GridCommandBus.swift`, `AppViewModel.undoManager` | `grid-command-bus.ts`, `grid-undo-redo.ts`, `workspace-context.tsx` |
| Permissions | Employee docs + rules | `src/lib/auth/permissions.ts`, `firestore.rules` |

---

*Документ сгенерирован для синхронизации продуктовых и инженерных решений между native и web командами.*
