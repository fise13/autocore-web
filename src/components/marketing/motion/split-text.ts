/** Lightweight line/word splitter for GSAP reveal animations (SplitText-compatible API subset). */

export type SplitResult = {
  lines: HTMLElement[];
  words: HTMLElement[];
  revert: () => void;
};

function wrapWords(element: HTMLElement): HTMLElement[] {
  const text = (element.textContent ?? "").replace(/\s+/g, " ").trim();
  element.textContent = "";
  element.setAttribute("aria-label", text);

  const tokens = text.split(" ");
  const words: HTMLElement[] = [];

  tokens.forEach((token, index) => {
    const span = document.createElement("span");
    span.setAttribute("data-word", "");
    span.className = "split-word";
    span.textContent = index < tokens.length - 1 ? `${token}\u00A0` : token;
    element.appendChild(span);
    words.push(span);
  });

  return words;
}

function wrapLinesInElement(element: HTMLElement, words: HTMLElement[]): HTMLElement[] {
  if (words.length <= 1) return [element];

  // Force layout so offsetTop reflects wrapped lines
  const lines: HTMLElement[] = [];
  let currentLine: HTMLElement[] = [];
  let lastTop = words[0]?.offsetTop ?? 0;

  const flush = () => {
    if (!currentLine.length) return;
    const line = document.createElement("div");
    line.setAttribute("data-line", "");
    line.className = "split-line";
    const inner = document.createElement("div");
    inner.setAttribute("data-line-inner", "");
    inner.className = "split-line-inner";
    currentLine.forEach((w) => inner.appendChild(w));
    line.appendChild(inner);
    element.appendChild(line);
    lines.push(line);
    currentLine = [];
  };

  for (const word of words) {
    const top = word.offsetTop;
    if (top > lastTop + 2 && currentLine.length) {
      flush();
      lastTop = top;
    }
    currentLine.push(word);
  }
  flush();

  return lines.length > 1 ? lines : [element];
}

export function splitText(element: HTMLElement, options?: { lines?: boolean; words?: boolean }): SplitResult {
  const wantLines = options?.lines ?? true;
  const wantWords = options?.words ?? true;
  const originalHtml = element.innerHTML;
  const originalAria = element.getAttribute("aria-label");

  if (!wantWords && !wantLines) {
    return { lines: [element], words: [], revert: () => {} };
  }

  const words = wantWords || wantLines ? wrapWords(element) : [];
  const lines = wantLines && words.length ? wrapLinesInElement(element, words) : [element];

  return {
    lines,
    words,
    revert: () => {
      element.innerHTML = originalHtml;
      if (originalAria) element.setAttribute("aria-label", originalAria);
      else element.removeAttribute("aria-label");
    },
  };
}
