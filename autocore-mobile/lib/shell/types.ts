import type { CompanyModuleKey } from '@/types/company-config';
import type { UserRole } from '@autocore/rbac';

/** Stable shell tabs — never grow with product modules. */
export type ShellTabId = 'home' | 'work' | 'action' | 'finance' | 'profile';

/** Operational domains driven by company configuration. */
export type WorkspaceDomainId =
  | 'inventory'
  | 'warehouse'
  | 'sales'
  | 'operations'
  | 'finance'
  | 'intake';

/** A node in the dynamic Work tree. */
export type WorkNode = {
  id: string;
  domain: WorkspaceDomainId;
  title: string;
  subtitle?: string;
  href: string;
  sf: string;
  /** Company modules that must be enabled (any). */
  modules: CompanyModuleKey[];
  /** Permission keys required (all, checked via session.can). */
  permissions?: string[];
};

/** Context-aware Action (+) item. */
export type ActionItem = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  /** When set, opens immersive scan with this mode hint. */
  scanMode?: 'product' | 'document' | 'relocate';
  sf: string;
  modules?: CompanyModuleKey[];
  permissions?: string[];
  /** Workspace context ids that surface this action first. */
  contexts?: string[];
};

/** Home section ids in render order. */
export type HomeSectionId =
  | 'identity'
  | 'attention'
  | 'continue'
  | 'today'
  | 'movement'
  | 'quickActions'
  | 'aiInsight';

export type HomeSectionSpec = {
  id: HomeSectionId;
  /** Roles that see this section; empty = all. */
  roles?: UserRole[];
  modules?: CompanyModuleKey[];
};

/** Search scope derived from modules. */
export type SearchScopeId =
  | 'all'
  | 'inventory'
  | 'motors'
  | 'clients'
  | 'orders'
  | 'locations'
  | 'documents';

/** AI capability that can be offered in the AI workspace. */
export type AiCapabilityId =
  | 'search'
  | 'inspect'
  | 'navigate'
  | 'analyze'
  | 'triggerWorkflow'
  | 'explain';

export type AiCapability = {
  id: AiCapabilityId;
  title: string;
  example: string;
  modules?: CompanyModuleKey[];
};

/** Resolved shell model for the current company + role. */
export type ShellModel = {
  enabledModules: Record<CompanyModuleKey, boolean>;
  workNodes: WorkNode[];
  workGrouped: Array<{ domain: WorkspaceDomainId; title: string; nodes: WorkNode[] }>;
  actionItems: ActionItem[];
  homeSections: HomeSectionId[];
  searchScopes: SearchScopeId[];
  aiCapabilities: AiCapability[];
  workspaceContext: string | null;
};
