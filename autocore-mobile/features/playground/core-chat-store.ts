import { create } from 'zustand';

import {
  type CoreAttachment,
  roomForAttachments,
} from './core-attachments';
import {
  playgroundMessageId,
  playgroundReplyFor,
  type PlaygroundMessage,
} from './playground-replies';

export type CoreChat = {
  id: string;
  title: string;
  messages: PlaygroundMessage[];
  updatedAt: number;
};

type CoreChatState = {
  chats: CoreChat[];
  activeId: string | null;
  pending: boolean;
  draft: string;
  attachments: CoreAttachment[];
  setDraft: (value: string) => void;
  addAttachments: (items: CoreAttachment[]) => void;
  removeAttachment: (id: string) => void;
  newChat: () => void;
  selectChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  send: (text?: string) => void;
};

function chatId(): string {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
}

function titleFrom(text: string, files: CoreAttachment[]): string {
  const trimmed = text.trim().replace(/\s+/g, ' ');
  if (trimmed) return trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;
  if (files.length === 1) return files[0].name;
  if (files.length > 1) return `${files.length} files`;
  return 'New chat';
}

export const useCoreChatStore = create<CoreChatState>((set, get) => ({
  chats: [],
  activeId: null,
  pending: false,
  draft: '',
  attachments: [],
  setDraft: (draft) => set({ draft }),
  addAttachments: (items) => {
    if (items.length === 0) return;
    set((state) => ({
      attachments: [
        ...state.attachments,
        ...items.slice(0, roomForAttachments(state.attachments.length)),
      ],
    }));
  },
  removeAttachment: (id) =>
    set((state) => ({
      attachments: state.attachments.filter((item) => item.id !== id),
    })),
  newChat: () => set({ activeId: null, draft: '', pending: false, attachments: [] }),
  selectChat: (id) => set({ activeId: id, draft: '', pending: false, attachments: [] }),
  renameChat: (id, title) => {
    const next = title.trim().replace(/\s+/g, ' ');
    if (!next) return;
    set((state) => ({
      chats: state.chats.map((chat) =>
        chat.id === id ? { ...chat, title: titleFrom(next, []) } : chat,
      ),
    }));
  },
  send: (raw) => {
    const text = (raw ?? get().draft).trim();
    const files = get().attachments;
    if (get().pending || (!text && files.length === 0)) return;

    const user: PlaygroundMessage = {
      id: playgroundMessageId(),
      role: 'user',
      text,
      attachments: files.length > 0 ? files : undefined,
    };

    set((state) => {
      const existing = state.chats.find((chat) => chat.id === state.activeId);
      if (existing) {
        return {
          draft: '',
          attachments: [],
          pending: true,
          chats: state.chats.map((chat) =>
            chat.id === existing.id
              ? { ...chat, messages: [...chat.messages, user], updatedAt: Date.now() }
              : chat,
          ),
        };
      }
      const created: CoreChat = {
        id: chatId(),
        title: titleFrom(text, files),
        messages: [user],
        updatedAt: Date.now(),
      };
      return {
        draft: '',
        attachments: [],
        pending: true,
        activeId: created.id,
        chats: [created, ...state.chats],
      };
    });

    setTimeout(() => {
      const assistant: PlaygroundMessage = {
        id: playgroundMessageId(),
        role: 'assistant',
        text: playgroundReplyFor(text, files.length),
      };
      set((state) => ({
        pending: false,
        chats: state.chats.map((chat) =>
          chat.id === state.activeId
            ? { ...chat, messages: [...chat.messages, assistant], updatedAt: Date.now() }
            : chat,
        ),
      }));
    }, 1400);
  },
}));
