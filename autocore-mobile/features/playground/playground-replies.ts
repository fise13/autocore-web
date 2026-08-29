import type { CoreAttachment } from './core-attachments';

export type PlaygroundRole = 'user' | 'assistant';

export type PlaygroundMessage = {
  id: string;
  role: PlaygroundRole;
  text: string;
  attachments?: CoreAttachment[];
};

export function playgroundMessageId(): string {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function playgroundReplyFor(prompt: string, fileCount = 0): string {
  const q = prompt.trim().toLowerCase();
  if (fileCount > 0 && !q) {
    return fileCount === 1
      ? 'Playground only — that file would be read into the thread. No account is connected here.'
      : `Playground only — those ${fileCount} files would be read into the thread. No account is connected here.`;
  }
  if (/ej251|warehouse|find|search/.test(q)) {
    return 'Playground only — in the app this would search warehouse for EJ251 and pin the matching motors.';
  }
  if (/received|today|throughput/.test(q)) {
    return 'Playground only — live intake for today would land here as a count, then a jump into Incoming.';
  }
  if (/photo|image|sticker|oil\s+pan|missing|file|attach/.test(q)) {
    return 'Playground only — engines still missing evidence would list here, with a path into photography.';
  }
  if (/write|edit|order/.test(q)) {
    return 'Playground only — Core would open a draft you can edit, then hand it to orders or notes.';
  }
  return 'Playground only — Autocore would answer from your company data. No account is connected here.';
}
