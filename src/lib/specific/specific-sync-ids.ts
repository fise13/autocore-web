export function scopedCategoryDocumentId(companyId: string, localId: number): string {
  return `company_${companyId}_cat_${localId}`;
}

export function scopedRecordDocumentId(
  companyId: string,
  categoryLocalId: number,
  rowIndex: number,
): string {
  return `company_${companyId}_rec_${categoryLocalId}_${rowIndex}`;
}

export function isScopedCategoryDocumentId(companyId: string, documentId: string): boolean {
  return documentId.startsWith(`company_${companyId}_cat_`);
}

export function readScopedCategoryLocalId(companyId: string, documentId: string): number | null {
  const prefix = `company_${companyId}_cat_`;
  if (!documentId.startsWith(prefix)) return null;
  const parsed = Number(documentId.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : null;
}
