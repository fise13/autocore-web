export type DocumentSlug =
  | 'work-order'
  | 'service-act'
  | 'engine-warranty'
  | 'service-tag'
  | 'invoice'
  | 'engine-waybill'
  | 'commercial-proposal'
  | 'vehicle-intake-act'
  | 'sales-receipt';

export type DocumentDefinition = {
  slug: DocumentSlug;
  title: string;
  description: string;
};

export const DOCUMENT_DEFINITIONS: DocumentDefinition[] = [
  {
    slug: 'work-order',
    title: 'Work Order',
    description: 'Full breakdown of labor, parts, and engine',
  },
  {
    slug: 'vehicle-intake-act',
    title: 'Vehicle Intake Report',
    description: 'Records vehicle condition at intake',
  },
  {
    slug: 'service-act',
    title: 'Certificate of Completion',
    description: 'Confirms completed work and total amount',
  },
  {
    slug: 'engine-warranty',
    title: 'Engine Warranty Card',
    description: 'Warranty terms and coverage period for the engine',
  },
  {
    slug: 'service-tag',
    title: 'Next Service Tag',
    description: '70x100 mm sticker for the next service reminder',
  },
  {
    slug: 'invoice',
    title: 'Customer Invoice',
    description: 'Invoice for labor and materials',
  },
  {
    slug: 'engine-waybill',
    title: 'Engine Waybill',
    description: 'Engine handover to the customer',
  },
  {
    slug: 'sales-receipt',
    title: 'Sales Receipt',
    description: 'Confirms the sale of parts and assemblies',
  },
];

export const DOCUMENT_BY_SLUG = Object.fromEntries(
  DOCUMENT_DEFINITIONS.map((definition) => [definition.slug, definition]),
) as Record<DocumentSlug, DocumentDefinition>;
