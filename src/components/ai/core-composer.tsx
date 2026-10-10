"use client";

import type { ChatStatus, FileUIPart } from "ai";
import { FileText, Mic, Plus, Square, X } from "lucide-react";
import { nanoid } from "nanoid";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { useAssistant } from "@/components/ai/ai-provider";
import { CoreCommandList } from "@/components/ai/core-command-list";
import { buildCoreCommands, type CoreCommandItem } from "@/components/ai/core-commands";
import { useCoreSuggestions } from "@/components/ai/use-core-suggestions";
import { coreComposerShortcutLabel } from "@/lib/ai/assistant-shortcut";
import { subscribeCoreFocus } from "@/lib/ai/core-focus";
import {
  chatFileAcceptAttr,
  rejectChatFile,
  sniffChatFileType,
  toChatFilePart,
} from "@/lib/ai/prepare-chat-file";
import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

type CoreComposerProps = {
  status: ChatStatus;
  busy: boolean;
  onAsk: (text: string, files?: FileUIPart[]) => void;
  onStop: () => void;
  autoFocus?: boolean;
  listPlacement?: "above" | "below";
  commandsAlways?: boolean;
};

type LocalFile = {
  id: string;
  file: File;
  url: string;
  mediaType: string;
  filename: string;
};

type VoiceRec = {
  lang: string;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

function SpeechCtor(): (new () => VoiceRec) | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  return Ctor ? (Ctor as unknown as new () => VoiceRec) : null;
}

export function CoreComposer({
  busy,
  onAsk,
  onStop,
  autoFocus = false,
  listPlacement = "above",
  commandsAlways = false,
}: CoreComposerProps) {
  const { context, sessions } = useAssistant();
  const { suggestions } = useCoreSuggestions(
    { pathname: context.path },
    context.suggestions,
    true,
  );
  const [text, setText] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [attachError, setAttachError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<VoiceRec | null>(null);
  const canSend = Boolean(text.trim() || files.length) && !busy;
  const shortcut = coreComposerShortcutLabel();

  const commands = useMemo(
    () =>
      buildCoreCommands({
        sessions,
        suggestions,
        context,
        query: text,
      }),
    [context, sessions, suggestions, text],
  );

  const listOpen = (focused || commandsAlways) && !busy && commands.length > 0;
  const clampedIndex = commands.length === 0 ? 0 : Math.min(activeIndex, commands.length - 1);

  useEffect(() => {
    return subscribeCoreFocus(() => {
      inputRef.current?.focus();
      setFocused(true);
    });
  }, []);

  useEffect(() => {
    const field = inputRef.current;
    if (!field) return undefined;
    const onFocus = () => setFocused(true);
    const onBlur = () => {
      window.setTimeout(() => {
        const root = field.closest("[data-core-composer]");
        if (root?.contains(document.activeElement)) return;
        setFocused(false);
      }, 0);
    };
    field.addEventListener("focus", onFocus);
    field.addEventListener("blur", onBlur);
    if (document.activeElement === field) onFocus();
    return () => {
      field.removeEventListener("focus", onFocus);
      field.removeEventListener("blur", onBlur);
    };
  }, []);

  useEffect(() => {
    if (!autoFocus) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(id);
  }, [autoFocus]);

  const resetFieldHeight = () => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
  };

  const send = useCallback(
    async (prompt: string) => {
      if (busy) return;
      if (!prompt.trim() && !files.length) return;
      const outgoing = (
        await Promise.all(files.map((item) => toChatFilePart(item.file)))
      ).filter((part): part is FileUIPart => part !== null);
      if (files.length > 0 && outgoing.length === 0) {
        setAttachError(userCopy.ai.attachErrorSize);
        return;
      }
      onAsk(prompt, outgoing.length ? outgoing : undefined);
      setText("");
      setAttachError(null);
      for (const file of files) URL.revokeObjectURL(file.url);
      setFiles([]);
      resetFieldHeight();
      inputRef.current?.focus();
    },
    [busy, files, onAsk],
  );

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    await send(text);
  };

  const selectCommand = (item: CoreCommandItem) => {
    void send(item.prompt);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      if (listOpen) {
        event.preventDefault();
        event.stopPropagation();
        inputRef.current?.blur();
        return;
      }
      return;
    }

    if (listOpen && commands.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % commands.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + commands.length) % commands.length);
        return;
      }
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        const item = commands[clampedIndex];
        if (item && !text.trim()) {
          event.preventDefault();
          selectCommand(item);
          return;
        }
        if (item && text.trim()) {
          const needle = text.trim().toLowerCase();
          const matches =
            item.title.toLowerCase().includes(needle) || item.prompt.toLowerCase().includes(needle);
          if (matches && item.title.toLowerCase() !== needle && item.prompt.toLowerCase() !== needle) {
            event.preventDefault();
            selectCommand(item);
            return;
          }
        }
      }
    }

    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  const addFiles = useCallback((list: FileList | File[] | null) => {
    if (!list?.length) return;
    const incoming = Array.from(list);
    setFiles((current) => {
      const next = [...current];
      let reason: ReturnType<typeof rejectChatFile> = null;
      for (const file of incoming) {
        reason = rejectChatFile(file, next.length);
        if (reason) break;
        next.push({
          id: nanoid(),
          file,
          url: URL.createObjectURL(file),
          mediaType: sniffChatFileType(file),
          filename: file.name,
        });
      }
      if (reason === "limit") setAttachError(userCopy.ai.attachErrorLimit);
      else if (reason === "size") setAttachError(userCopy.ai.attachErrorSize);
      else if (reason === "type") setAttachError(userCopy.ai.attachErrorType);
      else setAttachError(null);
      return next;
    });
    if (photosRef.current) photosRef.current.value = "";
  }, []);

  const toggleVoice = () => {
    const Ctor = SpeechCtor();
    if (!Ctor) {
      inputRef.current?.focus();
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new Ctor();
    recognition.interimResults = false;
    recognition.lang = document.documentElement.lang || navigator.language || "en-US";
    recognition.onresult = (event) => {
      const said = event.results[0]?.[0]?.transcript?.trim();
      if (said) setText((current) => (current.trim() ? `${current.trim()} ${said}` : said));
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;
    const fromFiles = clipboard.files?.length ? Array.from(clipboard.files) : [];
    const fromItems = Array.from(clipboard.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => file !== null);
    const incoming = fromFiles.length ? fromFiles : fromItems;
    if (!incoming.length) return;
    event.preventDefault();
    addFiles(incoming);
  };

  const onDrop = (event: DragEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDragging(false);
    addFiles(event.dataTransfer.files);
  };

  useEffect(() => {
    return () => {
      for (const file of files) URL.revokeObjectURL(file.url);
    };
    // Revoke leftover object URLs if the composer unmounts mid-draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = listOpen ? (
    <CoreCommandList
      items={commands}
      activeIndex={clampedIndex}
      onActiveIndexChange={setActiveIndex}
      onSelect={selectCommand}
    />
  ) : null;

  return (
    <form
      data-core-composer
      onSubmit={(event) => void submit(event)}
      className="core-composer mx-auto w-full max-w-[40rem]"
      onDragEnter={(event) => {
        event.preventDefault();
        if (event.dataTransfer.types.includes("Files")) setDragging(true);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDragging(false);
      }}
      onDrop={onDrop}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        const root = event.currentTarget;
        const next = event.relatedTarget as Node | null;
        if (next && root.contains(next)) return;
        window.setTimeout(() => {
          if (root.contains(document.activeElement)) return;
          setFocused(false);
        }, 0);
      }}
    >
      <input
        ref={photosRef}
        type="file"
        accept={chatFileAcceptAttr()}
        multiple
        tabIndex={-1}
        data-core-file-input
        aria-label={userCopy.ai.addFiles}
        className="sr-only"
        onChange={(event) => addFiles(event.currentTarget.files)}
      />

      {listPlacement === "above" ? list : null}

      <div
        className={cn(
          "core-composer-dock flex flex-col rounded-xl border border-border bg-card",
          focused && "is-focused",
          listening && "is-listening",
          dragging && "is-dropping",
        )}
      >
        {files.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto px-2.5 pt-2.5">
            {files.map((file) => (
              <div key={file.id} className="relative size-12 shrink-0">
                {file.mediaType.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={file.url}
                    alt={file.filename}
                    className="size-12 rounded-md object-cover"
                  />
                ) : (
                  <span className="core-attach-chip flex size-12 flex-col items-center justify-center gap-0.5 rounded-md border border-border px-1">
                    <FileText className="size-3.5 text-muted-foreground" aria-hidden />
                    <span className="w-full truncate text-center text-micro leading-none text-muted-foreground">
                      {file.filename}
                    </span>
                  </span>
                )}
                <button
                  type="button"
                  aria-label={userCopy.ai.removeAttachment}
                  onClick={() => {
                    URL.revokeObjectURL(file.url);
                    setFiles((current) => current.filter((item) => item.id !== file.id));
                  }}
                  className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-foreground text-background"
                >
                  <X className="size-2.5" strokeWidth={2.4} />
                </button>
              </div>
            ))}
          </div>
        ) : null}
        {attachError ? (
          <p className="px-3 pt-2 text-micro text-destructive">{attachError}</p>
        ) : null}
        <textarea
          ref={inputRef}
          name="message"
          rows={1}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setActiveIndex(0);
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 120)}px`;
          }}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          onFocus={() => setFocused(true)}
          placeholder={listening ? userCopy.ai.voiceListening : userCopy.ai.composerPlaceholder}
          disabled={busy}
          className="core-composer-field min-h-9 w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-snug text-foreground outline-none placeholder:text-muted-foreground"
        />
        <div className="core-composer-toolbar flex items-center gap-0.5 border-t border-border/80 px-1.5 py-1.5">
          <button
            type="button"
            aria-label={userCopy.ai.addFiles}
            onClick={() => photosRef.current?.click()}
            className="core-icon-btn inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            aria-label={userCopy.ai.voiceAria}
            aria-pressed={listening}
            onClick={toggleVoice}
            className={cn(
              "core-icon-btn inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              listening && "text-foreground",
            )}
          >
            <Mic className="size-4" />
          </button>
          <div className="ml-auto flex items-center gap-2">
            <span className="core-composer-hint hidden text-micro text-muted-foreground sm:inline">
              {userCopy.ai.composerHint}
              {" · "}
              {shortcut}
            </span>
            <button
              type={busy ? "button" : "submit"}
              aria-label={busy ? userCopy.ai.stop : userCopy.ai.send}
              disabled={!busy && !canSend}
              onClick={busy ? onStop : undefined}
              className="core-run inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background disabled:opacity-30"
            >
            {busy ? <Square className="size-3 fill-current" /> : null}
            <span>{busy ? userCopy.ai.stop : userCopy.ai.send}</span>
          </button>
          </div>
        </div>
        {listPlacement === "below" ? list : null}
      </div>
    </form>
  );
}
