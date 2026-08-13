import type { CompanyModuleKey } from '@/types/company-config';
import type { UserEntity, UserRole } from '@autocore/rbac';
import { getDataScope, hasPermission, type Permission } from '@autocore/rbac';

import type {
  ActionItem,
  AiCapability,
  HomeSectionId,
  SearchScopeId,
  ShellModel,
  WorkNode,
  WorkspaceDomainId,
} from './types';

export type ModuleFlags = Record<CompanyModuleKey, boolean>;

const DOMAIN_TITLES: Record<WorkspaceDomainId, string> = {
  inventory: 'Inventory',
  warehouse: 'Warehouse',
  sales: 'Sales',
  operations: 'Operations',
  finance: 'Finance',
  intake: 'Intake',
};

/**
 * Default Work section order. Sections only render when a module + permission
 * actually exposes a node inside them.
 */
const DEFAULT_DOMAIN_ORDER: WorkspaceDomainId[] = [
  'intake',
  'inventory',
  'warehouse',
  'sales',
  'operations',
  'finance',
];

/**
 * Work is not the same screen for every seat. The catalog is identical; what
 * changes is which domain the role reaches for first.
 *
 * - Floor roles start at the bay (intake) and their order queue.
 * - Managers start at orders, then the bay.
 * - Owners/admins/accountants start at the commercial picture.
 */
const ROLE_DOMAIN_ORDER: Partial<Record<UserRole, WorkspaceDomainId[]>> = {
  mechanic: ['intake', 'sales', 'inventory', 'warehouse', 'operations', 'finance'],
  diagnostician: ['intake', 'sales', 'inventory', 'warehouse', 'operations', 'finance'],
  employee: ['intake', 'sales', 'warehouse', 'inventory', 'operations', 'finance'],
  manager: ['sales', 'intake', 'inventory', 'warehouse', 'operations', 'finance'],
  owner: ['sales', 'inventory', 'warehouse', 'intake', 'operations', 'finance'],
  admin: ['sales', 'inventory', 'warehouse', 'intake', 'operations', 'finance'],
  accountant: ['sales', 'inventory', 'warehouse', 'intake', 'operations', 'finance'],
};

export function workDomainOrder(role: UserRole | null | undefined): WorkspaceDomainId[] {
  return (role && ROLE_DOMAIN_ORDER[role]) || DEFAULT_DOMAIN_ORDER;
}

/**
 * `Operations` only earns a section header once it holds more than one module.
 * A single utility reads as a tool, not as a domain.
 */
export function workDomainTitle(domain: WorkspaceDomainId, nodeCount: number): string {
  if (domain === 'operations' && nodeCount <= 1) return 'Tools';
  return DOMAIN_TITLES[domain];
}

/** Canonical Work tree catalog — filtered by modules + permissions at resolve time. */
export const WORK_NODE_CATALOG: WorkNode[] = [
  {
    id: 'intake',
    domain: 'intake',
    title: 'Engine intake',
    subtitle: 'Receive and photograph engines',
    href: '/intake',
    sf: 'camera.viewfinder',
    modules: ['motors', 'warehouse'],
    permissions: ['engine_intake_view'],
  },
  {
    id: 'engines',
    domain: 'inventory',
    title: 'Engines',
    subtitle: 'Serialized motors',
    href: '/objects/engines',
    sf: 'engine.combustion',
    modules: ['motors'],
    permissions: ['inventory_view'],
  },
  {
    id: 'parts',
    domain: 'inventory',
    title: 'Parts',
    subtitle: 'Inventory items',
    href: '/warehouse',
    sf: 'shippingbox',
    modules: ['warehouse', 'specifics'],
    permissions: ['inventory_view'],
  },
  // Receiving before Locations: receiving is physical work, locations are structure.
  {
    id: 'receiving',
    domain: 'warehouse',
    title: 'Receiving',
    subtitle: 'Scan and place stock',
    href: '/(tabs)/scan',
    sf: 'barcode.viewfinder',
    modules: ['warehouse'],
    permissions: ['inventory_view'],
  },
  {
    id: 'locations',
    domain: 'warehouse',
    title: 'Locations',
    subtitle: 'Bins and racks',
    href: '/warehouse/locations',
    sf: 'square.grid.3x3',
    modules: ['warehouse'],
    permissions: ['inventory_view'],
  },
  {
    id: 'orders',
    domain: 'sales',
    title: 'Orders',
    subtitle: 'Work orders',
    href: '/(tabs)/orders',
    sf: 'wrench.and.screwdriver',
    modules: ['workOrders'],
    permissions: ['work_orders_view'],
  },
  // Finance is a top-level surface of its own — it is deliberately not a Work node.
  {
    id: 'documents',
    domain: 'operations',
    title: 'Document import',
    subtitle: 'Capture and extract',
    href: '/import',
    sf: 'doc.viewfinder',
    modules: ['warehouse', 'workOrders'],
  },
];

const ACTION_CATALOG: ActionItem[] = [
  {
    id: 'scan',
    title: 'Scan',
    subtitle: 'Barcode, VIN, or serial',
    href: '/(tabs)/scan',
    sf: 'barcode.viewfinder',
    modules: ['warehouse'],
    permissions: ['inventory_view'],
  },
  {
    id: 'receive-engine',
    title: 'Receive engine',
    subtitle: 'Start intake with a serial',
    href: '/intake',
    sf: 'plus.viewfinder',
    modules: ['motors'],
    permissions: ['engine_intake_execute'],
    contexts: ['intake', 'engines', 'warehouse'],
  },
  {
    id: 'photograph',
    title: 'Photograph engine',
    subtitle: 'Continue an open intake',
    href: '/intake',
    sf: 'camera',
    modules: ['motors'],
    permissions: ['engine_intake_execute'],
    contexts: ['intake', 'engines'],
  },
  {
    id: 'new-order',
    title: 'New order',
    subtitle: 'Create a work order',
    href: '/(tabs)/orders/new',
    sf: 'plus.square',
    modules: ['workOrders'],
    permissions: ['work_orders_edit'],
    contexts: ['orders', 'sales'],
  },
  {
    id: 'add-item',
    title: 'Add inventory item',
    subtitle: 'Create a part record',
    href: '/(tabs)/orders/create-item',
    sf: 'shippingbox.and.arrow.backward',
    modules: ['warehouse'],
    permissions: ['inventory_edit'],
    contexts: ['parts', 'locations', 'warehouse'],
  },
  {
    id: 'new-transaction',
    title: 'New transaction',
    subtitle: 'Record a ledger entry',
    href: '/(tabs)/accounting/new',
    sf: 'plus.forwardslash.minus',
    modules: ['accounting'],
    permissions: ['accounting_edit'],
    contexts: ['finance'],
  },
  {
    id: 'import-document',
    title: 'Import document',
    subtitle: 'Photograph a document',
    href: '/import',
    sf: 'doc.badge.plus',
    modules: ['warehouse', 'workOrders'],
  },
  {
    id: 'search',
    title: 'Search',
    subtitle: 'Find anything in Autocore',
    href: '/search',
    sf: 'magnifyingglass',
  },
];

const AI_CAPABILITIES: AiCapability[] = [
  {
    id: 'search',
    title: 'Search',
    example: 'Find EJ251 engines in warehouse',
    modules: ['motors', 'warehouse'],
  },
  {
    id: 'inspect',
    title: 'Inspect',
    example: 'Show engines that still need photos',
    modules: ['motors'],
  },
  {
    id: 'triggerWorkflow',
    title: 'Trigger workflow',
    example: 'Receive engine U398539',
    modules: ['motors'],
  },
  {
    id: 'analyze',
    title: 'Analyze',
    example: 'What was received today?',
    modules: ['warehouse', 'motors'],
  },
  {
    id: 'explain',
    title: 'Explain',
    example: 'Which engines have no oil pan photo?',
    modules: ['motors'],
  },
  {
    id: 'navigate',
    title: 'Navigate',
    example: 'Open finance for this week',
    modules: ['accounting'],
  },
];

const WORKER_ROLES: UserRole[] = ['mechanic', 'diagnostician'];
const FINANCE_ROLES: UserRole[] = ['accountant'];

function moduleEnabled(modules: ModuleFlags, keys: CompanyModuleKey[] | undefined): boolean {
  if (!keys || keys.length === 0) return true;
  return keys.some((key) => modules[key] !== false);
}

function canPermission(user: UserEntity | null | undefined, permissions?: string[]): boolean {
  if (!permissions || permissions.length === 0) return true;
  if (!user) return false;
  return permissions.every((p) => hasPermission(user, p as Permission));
}

function canWorkNode(user: UserEntity | null | undefined, node: WorkNode): boolean {
  if (!canPermission(user, node.permissions)) return false;
  if (node.id === 'orders') return getDataScope(user, 'work_orders') !== 'none';
  if (node.id === 'engines' || node.id === 'parts' || node.id === 'locations' || node.id === 'receiving') {
    return getDataScope(user, 'inventory') !== 'none';
  }
  return true;
}

export function resolveWorkNodes(
  modules: ModuleFlags,
  user: UserEntity | null | undefined,
): WorkNode[] {
  return WORK_NODE_CATALOG.filter(
    (node) => moduleEnabled(modules, node.modules) && canWorkNode(user, node),
  );
}

export function groupWorkNodes(
  nodes: WorkNode[],
  role?: UserRole | null,
): ShellModel['workGrouped'] {
  const map = new Map<WorkspaceDomainId, WorkNode[]>();
  for (const node of nodes) {
    const list = map.get(node.domain) ?? [];
    list.push(node);
    map.set(node.domain, list);
  }
  return workDomainOrder(role)
    .filter((domain) => (map.get(domain)?.length ?? 0) > 0)
    .map((domain) => {
      const domainNodes = map.get(domain) ?? [];
      return {
        domain,
        title: workDomainTitle(domain, domainNodes.length),
        nodes: domainNodes,
      };
    });
}

export function resolveActionItems(
  modules: ModuleFlags,
  user: UserEntity | null | undefined,
  workspaceContext: string | null,
): ActionItem[] {
  const filtered = ACTION_CATALOG.filter(
    (item) => moduleEnabled(modules, item.modules) && canPermission(user, item.permissions),
  );

  if (!workspaceContext) return filtered;

  return [...filtered].sort((a, b) => {
    const aHit = a.contexts?.includes(workspaceContext) ? 0 : 1;
    const bHit = b.contexts?.includes(workspaceContext) ? 0 : 1;
    return aHit - bHit;
  });
}

export function resolveHomeSections(
  modules: ModuleFlags,
  user: UserEntity | null | undefined,
): HomeSectionId[] {
  const role = user?.role;
  const sections: HomeSectionId[] = ['identity', 'attention', 'continue'];

  if (role && FINANCE_ROLES.includes(role)) {
    sections.push('today', 'movement', 'quickActions');
    return sections;
  }

  if (role && WORKER_ROLES.includes(role)) {
    sections.push('today', 'quickActions', 'movement');
    if (modules.motors !== false) sections.push('aiInsight');
    return sections;
  }

  // Managers / owners / admins
  sections.push('today', 'movement', 'quickActions');
  if (modules.motors !== false || modules.warehouse !== false) {
    sections.push('aiInsight');
  }
  return sections;
}

export function resolveSearchScopes(modules: ModuleFlags): SearchScopeId[] {
  const scopes: SearchScopeId[] = ['all'];
  if (modules.warehouse !== false || modules.specifics !== false) scopes.push('inventory');
  if (modules.motors !== false) scopes.push('motors');
  scopes.push('clients');
  if (modules.workOrders !== false) scopes.push('orders');
  if (modules.warehouse !== false) scopes.push('locations');
  scopes.push('documents');
  return scopes;
}

export function resolveAiCapabilities(
  modules: ModuleFlags,
  user: UserEntity | null | undefined,
): AiCapability[] {
  if (!user) return [];
  return AI_CAPABILITIES.filter((cap) => moduleEnabled(modules, cap.modules));
}

export function defaultModuleFlags(
  partial?: Partial<Record<CompanyModuleKey, boolean>> | null,
): ModuleFlags {
  return {
    motors: partial?.motors !== false,
    workOrders: partial?.workOrders !== false,
    accounting: partial?.accounting !== false,
    warehouse: partial?.warehouse !== false,
    specifics: partial?.specifics !== false,
  };
}

export function resolveShellModel(params: {
  modules?: Partial<Record<CompanyModuleKey, boolean>> | null;
  user: UserEntity | null | undefined;
  workspaceContext?: string | null;
}): ShellModel {
  const enabledModules = defaultModuleFlags(params.modules);
  const workNodes = resolveWorkNodes(enabledModules, params.user);
  const workspaceContext = params.workspaceContext ?? null;

  return {
    enabledModules,
    workNodes,
    workGrouped: groupWorkNodes(workNodes, params.user?.role),
    actionItems: resolveActionItems(enabledModules, params.user, workspaceContext),
    homeSections: resolveHomeSections(enabledModules, params.user),
    searchScopes: resolveSearchScopes(enabledModules),
    aiCapabilities: resolveAiCapabilities(enabledModules, params.user),
    workspaceContext,
  };
}
