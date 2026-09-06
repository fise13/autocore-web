import {
  ClipboardList,
  FileText,
  Package,
  Receipt,
  Search,
  Users,
  Cog,
  type LucideIcon,
} from "lucide-react";

import type { AssistantChatSession } from "@/domain/ai/assistant-chats";
import { messageText, sortSessionsByUpdated } from "@/domain/ai/assistant-chats";
import type { CoreSuggestion } from "@/domain/ai/suggestions";
import type { AssistantAreaId, AssistantContext } from "@/lib/ai/assistant-context";
import { userCopy } from "@/lib/user-copy";

export type CoreCommandGroup = "recent" | "suggested" | "actions";

export type CoreCommandItem = {
  id: string;
  group: CoreCommandGroup;
  title: string;
  description?: string;
  shortcut?: string;
  icon: LucideIcon;
  prompt: string;
};

const GROUP_ORDER: CoreCommandGroup[] = ["recent", "suggested", "actions"];

function areaIcon(areaId: AssistantAreaId): LucideIcon {
  switch (areaId) {
    case "engines":
    case "sales":
      return Cog;
    case "warehouse":
    case "specific":
      return Package;
    case "work_orders":
      return ClipboardList;
    case "customers":
      return Users;
    case "documents":
      return FileText;
    case "finance":
    case "earnings":
      return Receipt;
    default:
      return Search;
  }
}

function recentPrompts(sessions: AssistantChatSession[], limit: number): string[] {
  const seen = new Set<string>();
  const prompts: string[] = [];
  for (const session of sortSessionsByUpdated(sessions)) {
    const firstUser = session.messages.find((message) => message.role === "user");
    const text = firstUser ? messageText(firstUser) : session.title.trim();
    const prompt = text.replace(/\s+/g, " ").trim();
    if (!prompt || seen.has(prompt.toLowerCase())) continue;
    seen.add(prompt.toLowerCase());
    prompts.push(prompt);
    if (prompts.length >= limit) break;
  }
  return prompts;
}

function actionItems(areaId: AssistantAreaId): CoreCommandItem[] {
  const copy = userCopy.ai;
  const items: Array<{ title: string; prompt: string; icon: LucideIcon }> = [
    { title: copy.actionFindEngines, prompt: "Which engines are available right now?", icon: Cog },
    { title: copy.actionAnalyzeSales, prompt: "What is our profit over the last 30 days?", icon: Receipt },
    { title: copy.actionCreateOrder, prompt: "Create a work order", icon: ClipboardList },
    { title: copy.actionCheckLowStock, prompt: "Which parts are below their reorder point?", icon: Package },
  ];

  if (areaId === "customers" || areaId === "work_orders") {
    items.splice(2, 0, {
      title: copy.actionSearchCustomers,
      prompt: "Search customers by name or phone",
      icon: Users,
    });
  }
  if (areaId === "documents" || areaId === "work_orders") {
    items.push({
      title: copy.actionCreateWarranty,
      prompt: "Create a warranty document for the latest work order",
      icon: FileText,
    });
  }

  return items.slice(0, 5).map((item, index) => ({
    id: `action-${index}`,
    group: "actions" as const,
    title: item.title,
    prompt: item.prompt,
    icon: item.icon,
  }));
}

export function buildCoreCommands(input: {
  sessions: AssistantChatSession[];
  suggestions: CoreSuggestion[];
  context: AssistantContext;
  query?: string;
}): CoreCommandItem[] {
  const icon = areaIcon(input.context.areaId);
  const recent: CoreCommandItem[] = recentPrompts(input.sessions, 3).map((prompt, index) => ({
    id: `recent-${index}`,
    group: "recent",
    title: prompt,
    icon: Search,
    prompt,
  }));

  const suggested: CoreCommandItem[] = input.suggestions.slice(0, 4).map((item, index) => ({
    id: `suggested-${index}`,
    group: "suggested",
    title: item.label,
    icon,
    prompt: item.prompt,
  }));

  const actions = actionItems(input.context.areaId);
  const seen = new Set<string>();
  const merged: CoreCommandItem[] = [];
  for (const item of [...recent, ...suggested, ...actions]) {
    const key = item.prompt.replace(/\s+/g, " ").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  const needle = input.query?.trim().toLowerCase() ?? "";
  if (!needle) return merged;

  return merged.filter((item) => {
    const haystack = `${item.title} ${item.description ?? ""} ${item.prompt}`.toLowerCase();
    return haystack.includes(needle);
  });
}

export function groupCoreCommands(items: CoreCommandItem[]): Array<{
  group: CoreCommandGroup;
  items: CoreCommandItem[];
}> {
  return GROUP_ORDER.map((group) => ({
    group,
    items: items.filter((item) => item.group === group),
  })).filter((entry) => entry.items.length > 0);
}

export function coreCommandGroupLabel(group: CoreCommandGroup): string {
  const copy = userCopy.ai;
  if (group === "recent") return copy.commandRecent;
  if (group === "suggested") return copy.commandSuggested;
  return copy.commandActions;
}
