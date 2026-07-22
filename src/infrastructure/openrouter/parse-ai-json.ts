/**
 * Best-effort parse of model chat content into JSON.
 * Handles markdown fences, leading prose, and lightly truncated objects/arrays.
 */
export function parseAiJsonContent(content: string): unknown {
  const trimmed = content.trim();
  if (!trimmed) {
    throw new Error("AI вернул некорректный JSON");
  }

  const candidates: string[] = [];

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]?.trim()) {
    candidates.push(fence[1].trim());
  }

  candidates.push(trimmed);

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  } else if (firstBrace >= 0) {
    candidates.push(trimmed.slice(firstBrace));
  }

  const firstBracket = trimmed.indexOf("[");
  const lastBracket = trimmed.lastIndexOf("]");
  if (firstBracket >= 0 && lastBracket > firstBracket) {
    candidates.push(trimmed.slice(firstBracket, lastBracket + 1));
  } else if (firstBracket >= 0 && (firstBrace < 0 || firstBracket < firstBrace)) {
    candidates.push(trimmed.slice(firstBracket));
  }

  const seen = new Set<string>();
  for (const raw of candidates) {
    if (!raw || seen.has(raw)) continue;
    seen.add(raw);
    for (const attempt of [raw, repairTruncatedJson(raw)]) {
      if (!attempt || seen.has(`repaired:${attempt}`)) continue;
      seen.add(`repaired:${attempt}`);
      try {
        return JSON.parse(attempt);
      } catch {
        // try next
      }
    }
  }

  throw new Error("AI вернул некорректный JSON");
}

/** Close dangling quotes / braces / brackets after a truncated model reply. */
export function repairTruncatedJson(input: string): string {
  let s = input.trim();
  if (!s) return s;

  // Drop a trailing incomplete key/value fragment after the last successful comma/brace.
  s = s.replace(/,\s*("[^"]*"?\s*:)?\s*$/, "");
  s = s.replace(/,\s*$/, "");

  // Close an open string.
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') inString = true;
  }
  if (inString) {
    s += '"';
  }

  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}" || ch === "]") {
      const open = stack[stack.length - 1];
      if ((ch === "}" && open === "{") || (ch === "]" && open === "[")) {
        stack.pop();
      }
    }
  }

  while (stack.length > 0) {
    const open = stack.pop();
    s += open === "{" ? "}" : "]";
  }

  return s;
}
