import type { InventoryCollectionId } from "@/lib/navigation/inventory-collections";
import { userCopy } from "@/lib/user-copy";

/**
 * The slice of the application the assistant is answering inside.
 *
 * Resolved from the route the user opened the AI from, so the user never has
 * to explain where they are. Pure and React-free so it stays testable.
 */
export type AssistantAreaId =
  | "dashboard"
  | "engines"
  | "engine_intake"
  | "sales"
  | "work_orders"
  | "documents"
  | "finance"
  | "earnings"
  | "warehouse"
  | "specific"
  | "imports"
  | "quotes"
  | "team"
  | "settings"
  | "workspace";

export type AssistantContext = {
  areaId: AssistantAreaId;
  /** Human label shown on the workspace context chip. */
  areaLabel: string;
  /** Route the AI was opened from — passed to the model verbatim. */
  path: string;
  /** Extra focus the user already has on screen (collection, brand, selection). */
  focus: string[];
  /** Contextual prompt suggestions for this area. */
  suggestions: string[];
};

type ResolveAssistantContextInput = {
  pathname: string;
  collection?: InventoryCollectionId;
  brandName?: string | null;
  selectionLabel?: string | null;
};

const collectionLabels: Record<InventoryCollectionId, string> = {
  engines: "Engines",
  transmissions: "Transmissions",
  parts: "Parts",
  consumables: "Consumables",
};

/**
 * UI copy is English-locked on web (`UI_LOCALE_LOCK`); area labels still come
 * from the shared nav copy so the chip never drifts from the sidebar.
 */
function areaDefinition(pathname: string): { areaId: AssistantAreaId; areaLabel: string } {
  const nav = userCopy.nav.sidebarNav;

  if (pathname === "/" || pathname === "/home") return { areaId: "dashboard", areaLabel: nav.home };
  if (pathname === "/motors") return { areaId: "engines", areaLabel: nav.motors };
  if (pathname === "/sold") return { areaId: "sales", areaLabel: nav.sold };
  if (pathname.startsWith("/engine-intake")) {
    return { areaId: "engine_intake", areaLabel: nav.engine_intake };
  }
  if (pathname.startsWith("/work-orders")) {
    return { areaId: "work_orders", areaLabel: nav.work_orders };
  }
  if (pathname.startsWith("/accounting")) return { areaId: "finance", areaLabel: nav.accounting };
  if (pathname.startsWith("/my-earnings")) {
    return { areaId: "earnings", areaLabel: nav.my_earnings };
  }
  if (pathname.startsWith("/warehouse")) return { areaId: "warehouse", areaLabel: nav.warehouse };
  if (pathname.startsWith("/documents")) return { areaId: "documents", areaLabel: "Documents" };
  if (pathname.startsWith("/specific")) return { areaId: "specific", areaLabel: "Specific sheets" };
  if (pathname.startsWith("/imports")) return { areaId: "imports", areaLabel: "Imports" };
  if (pathname.startsWith("/quotes")) return { areaId: "quotes", areaLabel: "Quotes" };
  if (
    pathname.startsWith("/team") ||
    pathname.startsWith("/employees") ||
    pathname.startsWith("/roles")
  ) {
    return { areaId: "team", areaLabel: "Team" };
  }
  if (pathname.startsWith("/settings")) return { areaId: "settings", areaLabel: "Settings" };

  return { areaId: "workspace", areaLabel: "Workspace" };
}

/**
 * Static fallback chips, used until the live `/api/assistant/suggestions`
 * response lands (and when a user's role leaves nothing to read).
 *
 * Every prompt here must map to something Core can actually do. Earlier copy
 * offered "Show unpaid invoices" and "Create a work order" — the app has no
 * invoices screen and Core has no write tools, so both dead-ended.
 */
const areaSuggestions: Record<AssistantAreaId, string[]> = {
  dashboard: [
    "What is our profit over the last 30 days?",
    "Which parts are below their reorder point?",
    "What work orders are open?",
  ],
  engines: [
    "Which engines are available right now?",
    "Find BMW N54 engines in stock",
    "Where is engine stored?",
  ],
  engine_intake: [
    "Which engines are still in intake?",
    "Which engines are available right now?",
    "What work orders are open?",
  ],
  sales: [
    "What is our profit over the last 30 days?",
    "Which engines are available right now?",
    "Show income and expense for the last 7 days",
  ],
  work_orders: [
    "What work orders are open?",
    "Which work orders are in progress?",
    "Show the parts on the newest work order",
  ],
  documents: [
    "What work orders are open?",
    "What is our profit over the last 30 days?",
    "Open documents",
  ],
  finance: [
    "What is our profit over the last 30 days?",
    "Show income and expense for the last 7 days",
    "How did revenue trend this month?",
  ],
  earnings: [
    "What work orders are assigned to me?",
    "Which work orders are in progress?",
    "Open my earnings",
  ],
  warehouse: [
    "Which parts are below their reorder point?",
    "Where is this SKU stored?",
    "What is in location A-1?",
  ],
  specific: [
    "Which parts are below their reorder point?",
    "Which engines are available right now?",
    "Open specific sheets",
  ],
  imports: [
    "Open imports",
    "Which parts are below their reorder point?",
    "Which engines are available right now?",
  ],
  quotes: ["Open quotes", "Which engines are available right now?", "What work orders are open?"],
  team: ["Open the team page", "What work orders are open?", "Open roles and permissions"],
  settings: ["Open company settings", "Open roles and permissions", "Open billing"],
  workspace: [
    "Which engines are available right now?",
    "Which parts are below their reorder point?",
    "What work orders are open?",
    "What is our profit over the last 30 days?",
  ],
};

export function resolveAssistantContext({
  pathname,
  collection,
  brandName,
  selectionLabel,
}: ResolveAssistantContextInput): AssistantContext {
  const { areaId, areaLabel } = areaDefinition(pathname);

  const focus: string[] = [];
  if (collection && (areaId === "engines" || areaId === "sales" || areaId === "warehouse")) {
    focus.push(collectionLabels[collection]);
  }
  if (brandName?.trim()) focus.push(brandName.trim());
  if (selectionLabel?.trim()) focus.push(selectionLabel.trim());

  return {
    areaId,
    areaLabel,
    path: pathname,
    focus,
    suggestions: areaSuggestions[areaId],
  };
}

/** Compact, model-facing description of where the question was asked from. */
export function describeAssistantContext(context: AssistantContext): string {
  const focus = context.focus.length ? ` · focus: ${context.focus.join(", ")}` : "";
  return `${context.areaLabel} (${context.path})${focus}`;
}
