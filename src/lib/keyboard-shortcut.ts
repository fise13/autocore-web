export function getModKeyLabel(): string {
  if (typeof navigator === "undefined") return "⌘";
  const platform = navigator.platform?.toLowerCase() ?? "";
  const ua = navigator.userAgent?.toLowerCase() ?? "";
  if (platform.includes("mac") || ua.includes("mac")) return "⌘";
  return "Ctrl";
}

export function getSearchShortcutLabel(): string {
  return `${getModKeyLabel()}K`;
}
