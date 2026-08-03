# AutoCore terminology

English is the source language. This glossary is normative for interface copy, translation, documentation templates, notifications, and generated output.

## Rules

- Use the canonical English term in new source copy.
- Use the approved Russian term for the same concept.
- Short variants are allowed only where explicitly listed.
- Do not substitute synonyms for variety.
- Translation keys must preserve domain context when one English word has multiple product meanings.

## Canonical terms

| English | Russian | Rule |
| --- | --- | --- |
| Engine | Двигатель | Customer-facing physical engine. |
| Motor unit | Мотор | Contextual warehouse/internal shorthand for a serialized engine unit only. |
| Engine code | Код двигателя | The code value itself is never translated. |
| Engine serial number | Номер двигателя | Preserve the serial value exactly. |
| Work Order | Заказ-наряд | Formal term. `Наряд` is allowed only in approved compact UI. Never use bare `Заказ` for this entity. |
| Work Order Number | № заказ-наряда | Preserve the generated number exactly. |
| Warehouse | Склад | A storage site or facility. |
| Storage Location | Место хранения | Compact label: `Место`. Preserve location codes exactly. |
| Unassigned Location | Без места | Inventory with no storage location. |
| Inventory | Складской учёт | The product capability, not a single stock item. |
| Inventory Item | Позиция | Use `Запчасть` or `Расходник` only when the item type is known. |
| Stock on Hand | На складе | Do not use `Сток`. |
| Reserved | Резерв | State or quantity. |
| Reservation | Резервирование | Action or process. |
| Available | Доступно | Available inventory quantity. |
| Supplier | Поставщик | Canonical vendor term. |
| Customer | Клиент | CRM and work-order party. |
| Buyer | Покупатель | Retail sale context only. |
| Warranty | Гарантия | Artifact: `Гарантийный талон`. |
| Stock Transfer | Перемещение | Inventory movement. |
| Payment Transfer | Перевод | Financial movement. |
| Invoice | Счёт клиенту | Compact label: `Счёт`. |
| Purchase Price | Закупочная цена | Compact table header: `Закупка`. |
| Commercial Proposal | Коммерческое предложение | Compact label: `КП`. |
| Vehicle | Автомобиль | Compact label: `Авто`. |
| Brand | Бренд | Parts, engines, and suppliers. |
| Vehicle Make | Марка | Vehicle domain only. |
| Model | Модель | Translate the label, not the value. |
| Year | Год | Translate the label, not the value. |
| VIN | VIN | Never translate or alter. |
| SKU | SKU | Never translate or alter. |
| Accounting | Финансы | Product module name. Do not alternate with `Бухгалтерия`. |
| Overview | Overview | Protected product name. Never translate. |
| Stocktake | Инвентаризация | Physical inventory count, not the inventory catalog. |
| Transmission | КПП | Domain abbreviation is accepted in Russian. |
| Transfer Case | Раздатка | Never translate as a generic transfer. |

## Context requirements

### Engine and Motor

`Engine` is the default customer-facing term. `Motor unit` is allowed for a physical serialized unit in internal warehouse and sale workflows. Do not mix both labels in the same screen hierarchy.

Keys must make the distinction explicit:

- `motors.fields.engineCode`
- `motors.fields.serialNumber`
- `warehouse.motorUnit.actions.relocate`
- `documents.engine.title`

### Work Order

Use `Work Order` in English and `Заказ-наряд` in Russian.

The compact Russian form `Наряд` is allowed in:

- narrow mobile navigation;
- compact status rows;
- notification bodies after the formal entity is already clear.

Do not use `Order` or `Заказ` because those words conflict with sales and purchasing.

### Storage Location

Use one generic product concept: `Storage Location` / `Место хранения`.

Zone, rack, shelf, and bin are not exposed as separate interface concepts unless the warehouse model later adds explicit typed levels. Existing location codes remain exact and untranslated.

### Transfer

Always disambiguate in keys:

- `warehouse.transfer` for stock movement;
- `accounting.transfer` for money movement;
- `inventory.categories.transferCase` for the vehicle component.

## Never translate or alter

- VIN;
- SKU;
- engine codes;
- serial numbers;
- database and generated IDs;
- work-order numbers;
- company names;
- brand names;
- customer, employee, and supplier data;
- warehouse location codes;
- file names;
- URLs and deep links;
- imported source headers and values;
- user-entered notes;
- company-authored warranty text, slogans, and document footers.

The surrounding app-owned label may be translated. The value must remain exact.

## Forbidden synonym drift

Do not introduce:

- `Order` for `Work Order`;
- `Заказ` for `Заказ-наряд`;
- `Сток` for stock quantity;
- `Бухгалтерия` as the Finance module name;
- generic `Полка` or `Ячейка` for `Storage Location`;
- `Перевод` for stock movement;
- `Перемещение` for a payment transfer;
- translated variants of `Overview`;
- translated VIN, SKU, codes, identifiers, or user data.

## Translator notes

- Preserve capitalization conventions of the target language instead of mirroring English title case.
- Russian plural branches must cover `one`, `few`, `many`, and `other` where ICU requires them.
- Short labels are separate keys, not runtime truncations of formal terms.
- Document terminology follows the company `documentLocale`.
- Interface terminology follows the user `uiLocale`.
