/**
 * Feature flags for Persistence Engine rollout.
 * Composer server autosave can be disabled if needed without removing local drafts.
 */
export const persistenceFlags = {
  /** Motors/warehouse/specific grid adapters + lifecycle flush */
  grids: true,
  /** Work-order composer local drafts + debounced server persist when fields valid */
  composerServerWrite: true,
  /** Branding / app config debounced server autosave */
  settingsAutosave: true,
  /** Document import dirty-field autosave */
  documentImportAutosave: true,
} as const;
