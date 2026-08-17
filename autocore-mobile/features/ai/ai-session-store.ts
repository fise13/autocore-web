import { create } from 'zustand';

export type AiUserTurn = {
  id: string;
  role: 'user';
  text: string;
};

function turnId(): string {
  return `m_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

type AiSessionState = {
  turns: AiUserTurn[];
  /** True after a send until Core is wired — UI shows a wordless pending slot. */
  awaitingCore: boolean;
  /** Fresh thread from the + composer. */
  handoff: (text: string) => void;
  /** Follow-up from the AI workspace composer. */
  send: (text: string) => void;
  clear: () => void;
};

function asTurn(text: string): AiUserTurn {
  return { id: turnId(), role: 'user', text };
}

export const useAiSessionStore = create<AiSessionState>((set) => ({
  turns: [],
  awaitingCore: false,
  handoff: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    set({ turns: [asTurn(trimmed)], awaitingCore: true });
  },
  send: (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    set((state) => ({
      turns: [...state.turns, asTurn(trimmed)],
      awaitingCore: true,
    }));
  },
  clear: () => set({ turns: [], awaitingCore: false }),
}));
