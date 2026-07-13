# AutoCore internationalization architecture

Status: approved foundation  
Source language: English (US)  
Initial locales: English (`en`) and Russian (`ru`)

## Goals

- English is the source of truth for all product-owned interface copy.
- Every released UI flow is complete in every advertised locale.
- Web, desktop, iOS, future Android, APIs, notifications, email, exports, and documents use the same locale contracts.
- User-entered and business data is never translated.
- Adding a locale requires catalogs, metadata, tests, and native resources, not architectural changes.

## Current state

AutoCore is currently Russian-first and has no i18n runtime. The web root uses a hardcoded `lang="ru"`, mobile exposes a Russian-only language screen, and user-facing strings exist in components, copy objects, API errors, notifications, email, PDF templates, import/export flows, and AI output contracts.

Firebase is the system of record. AutoCore does not use Supabase.

The main systems are:

- Next.js 16 App Router and React 19 for web and Tauri desktop.
- Expo 56, Expo Router, and React Native 0.85 for mobile.
- Firebase Authentication, Cloud Firestore, Firebase Storage, and Firebase Functions.
- Resend for transactional email.
- Puppeteer for generated PDF documents.
- OpenRouter for import extraction and document-label assistance.
- Expo Push for mobile notifications.

## Approved product decisions

- Use `Engine` in customer-facing UI and `Motor` only for contextual warehouse/internal serialized-unit language.
- Keep `Mission Control` untranslated as a product name.
- Use `Storage Location` as the generic interface concept while preserving location codes exactly.
- Use a company-level document language and freeze it on every generated artifact.
- Preserve Russian for existing users and companies during migration.
- New users use browser or device detection, then English fallback.

## Architecture

### Shared core

Create `@autocore/i18n` under `packages/i18n`.

The package owns:

- supported locale identifiers;
- locale metadata, including direction and native name;
- namespace identifiers;
- English and translated message catalogs;
- fallback rules;
- pure locale normalization and negotiation;
- generated translation-key types;
- server-safe translation contracts;
- catalog validation.

It must not own:

- Next.js request APIs;
- React context tied to one platform;
- MMKV, cookies, Firestore, or Expo APIs;
- feature-specific routing.

### Web adapter

The web adapter belongs in `src/i18n`.

Responsibilities:

- resolve request locale for Server Components and metadata;
- expose required messages to client component boundaries;
- mirror the canonical user preference in a server-readable cookie;
- update the interface optimistically and refresh Server Components without a full browser reload;
- load only the namespaces needed by the current route;
- set dynamic `html.lang` and `html.dir`.

The dashboard keeps stable, locale-neutral URLs. Locale prefixes do not add value to authenticated application routes and would complicate existing host routing, deep links, and Tauri.

Public marketing routes should use locale-prefixed URLs when migrated so metadata, `hreflang`, sitemaps, and static generation remain deterministic.

### Mobile adapter

The mobile adapter belongs in `autocore-mobile/i18n`.

Responsibilities:

- read the device locale on first run;
- render immediately from an MMKV locale mirror;
- synchronize the canonical Firestore preference in realtime;
- expose a stable translator and formatter API;
- load feature namespaces on route entry;
- set direction metadata and prepare an explicit restart path if a future locale changes layout direction.

Native iOS permission prompts are not JavaScript messages. A config plugin must generate localized `InfoPlist.strings` resources for every supported native locale.

## Locale dimensions

Do not use one locale field for unrelated concerns.

### `uiLocale`

Stored per user. It controls:

- application interface;
- validation and presentation errors;
- accessibility labels;
- user-targeted email;
- recipient notifications;
- dates, numbers, relative time, and collation where no separate business rule applies.

### `formatLocale`

Derived from UI locale and formatting preferences. Currency remains independent because AutoCore already supports KZT, RUB, and USD preferences. UI language must not silently change currency.

### `documentLocale`

Stored per company and copied to every generated customer artifact. It controls:

- PDF template boilerplate;
- warranty and invoice labels;
- document dates and number formatting;
- export headers when the export is company-facing;
- AI-polished labels that AutoCore owns.

Changing a company setting must not mutate historical artifacts.

## Locale resolution

Authenticated resolution priority:

1. Firestore user preference.
2. Browser `Accept-Language` or mobile device locales when no explicit preference exists.
3. English.

The web cookie and mobile MMKV value are local mirrors for fast startup. They never outrank Firestore. Realtime synchronization replaces stale mirrors on every device.

Existing users are backfilled to Russian. Existing companies are backfilled to Russian document language. New users follow browser/device detection and then English fallback.

## Catalog organization

Catalogs are modular and have identical namespace structure in every locale.

```text
packages/i18n/src/messages/
  en/
    common.json
    navigation.json
    authentication.json
    onboarding.json
    organization.json
    employees.json
    inventory.json
    motors.json
    warehouse.json
    orders.json
    customers.json
    accounting.json
    billing.json
    settings.json
    notifications.json
    activity.json
    documents.json
    warranty.json
    imports.json
    exports.json
    scan.json
    search.json
    command-palette.json
    validation.json
    errors.json
    a11y.json
    emails.json
    metadata.json
    marketing.json
  ru/
    ...same files and keys...
```

English files define the schema. A translation cannot introduce keys that do not exist in English.

Keys describe intent and domain:

- `inventory.actions.addEngine`
- `warehouse.locations.unassigned`
- `orders.status.waitingForParts`
- `authentication.errors.invalidCredentials`

Avoid vague terminal keys such as `title`, `button`, `label`, `text`, or `message` without an intent-bearing parent path.

## Message semantics

- Use ICU messages for interpolation, plurals, and selects.
- Never concatenate translated fragments.
- Keep variables semantic: `{workOrderNumber}`, `{count}`, `{employeeName}`.
- Key names and variables remain English.
- Translator notes must explain ambiguous domain context.
- Dates, numbers, and currencies are values, not preformatted message fragments.

## Loading and caching

- Server Components dynamically import only the active locale and route namespaces.
- Client providers receive only namespaces required by the rendered route.
- Mobile loads the shell catalog first and feature catalogs on route entry.
- Server workers load only notification, email, or document namespaces required by a job.
- Cache catalogs by application build, locale, and namespace.
- Persist locale choice, not full catalogs, in browser or mobile storage.

## Frozen outputs

### Notifications

Resolve recipient locale before rendering title and body. Persist:

- rendered title and body;
- locale;
- event type;
- interpolation payload.

Historical notifications retain their creation language. Push delivery forwards the frozen copy.

### Email

Resolve recipient locale at send time and persist locale in delivery metadata where available.

### Documents

Pass `documentLocale` through document context, render model, jobs, and storage metadata. Include locale in the PDF cache hash. A locale change creates a new artifact instead of returning a stale cached PDF.

### AI output

Extraction preserves source document language and values. Only app-owned warnings, summaries, and document-label polish are localized. Document polish follows `documentLocale`, not the current operator's `uiLocale`.

## Never translate

- VIN and SKU values;
- engine codes;
- IDs and generated identifiers;
- company and brand names;
- customer and employee data;
- warehouse location codes;
- file names and URLs;
- imported cell values and source headers;
- user-authored notes, warranty copy, slogans, and document footers.

Only surrounding labels and system-owned boilerplate are translated.

## No mixed-language rollout

A route and namespace coverage manifest gates language availability.

A feature is considered complete only when all reachable:

- visible labels;
- validation and error states;
- loading and empty states;
- accessibility labels;
- dialogs and notifications;
- API presentation errors;
- generated or exported output

exist in English and Russian.

The selector remains unavailable for incomplete route groups. Each feature migration is a vertical slice across web, mobile, server, and tests.

## Quality gates

Every pull request that adds or changes UI copy must:

- add or update the English source key first;
- include Russian translation before enabling the feature for Russian;
- preserve ICU variable and plural parity;
- introduce no raw user-facing literal outside locale catalogs;
- pass terminology validation;
- pass long-copy and pseudo-locale checks;
- verify accessibility names;
- verify that user-entered data is unchanged.

CI will enforce:

- locale and namespace parity;
- no translation-only keys;
- ICU variable parity;
- generated translation key types;
- no new hardcoded user-facing text;
- no banned terminology;
- no unused keys after migration stabilizes.

## Migration milestones

1. Baseline and governance.
2. Shared contracts and catalog schema.
3. Foundation package and CI validation.
4. User preference, detection, and persistence.
5. Web shell, authentication, navigation, and settings.
6. Mobile shell, authentication, navigation, and settings.
7. Vertical feature slices.
8. Notifications, email, exports, PDFs, and AI-owned output.
9. Marketing routes and SEO.
10. Native iOS localization.
11. Global layout, accessibility, RTL, and performance hardening.
12. Enforcement cutover and legacy copy-hub removal.

Each milestone must preserve existing production behavior until its explicit release gate is satisfied.
