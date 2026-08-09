import type { EngineIntakeProgress } from '@autocore/engine-intake';

const FACET_LABELS: Record<string, string> = {
  serial: 'Serial',
  overall: 'Overall',
  valve_cover: 'Valve cover',
  oil_pan: 'Oil pan',
  oil_pan_removed: 'Oil pan',
  cylinder_side: 'Cylinder side',
  crankshaft_visible: 'Crankshaft',
  connecting_rods: 'Connecting rods',
  turbo: 'Turbo',
  damage: 'Damage detail',
  endoscope: 'Endoscope',
};

/** Human-readable missing evidence — never “Documentation 67%”. */
export function missingEvidenceLabels(progress: EngineIntakeProgress | null | undefined): string[] {
  if (!progress) return [];
  const facets = progress.missingFacets ?? [];
  if (facets.length > 0) {
    return facets.map((facet) => FACET_LABELS[facet] ?? facet.replace(/_/g, ' '));
  }
  return (progress.missingRequirementIds ?? []).map(
    (id) => FACET_LABELS[id] ?? id.replace(/_/g, ' '),
  );
}

export function evidenceGuidance(progress: EngineIntakeProgress | null | undefined): string | null {
  if (progress?.coverageWhisper?.trim()) {
    // Prefer whisper when it already speaks in human language.
    const whisper = progress.coverageWhisper.trim();
    if (!/%/.test(whisper)) return whisper;
  }
  const missing = missingEvidenceLabels(progress);
  if (missing.length === 0) return null;
  const first = missing[0];
  return `${first} not documented`;
}
