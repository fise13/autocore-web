"use client";

import type { ChatStatus, FileUIPart } from "ai";
import { ArrowUp, Camera, ImageIcon, Mic, Plus, Square, X } from "lucide-react";
import { nanoid } from "nanoid";
import {
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { userCopy } from "@/lib/user-copy";
import { cn } from "@/lib/utils";

const MAX_ATTACHMENTS = 4;
const MAX_ATTACHMENT_BYTES = 1_500_000;

type CoreComposerProps = {
  status: ChatStatus;
  busy: boolean;
  onAsk: (text: string, files?: FileUIPart[]) => void;
  onStop: () => void;
};

type LocalFile = FileUIPart & { id: string };

async function blobUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    if (blob.size > MAX_ATTACHMENT_BYTES) return null;
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

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

export function CoreComposer({ status, busy, onAsk, onStop }: CoreComposerProps) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [attachOpen, setAttachOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const photosRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<VoiceRec | null>(null);
  const canSend = Boolean(text.trim() || files.length) && !busy;
  const streaming = status === "streaming" || status === "submitted";

  const resetFieldHeight = () => {
    const field = inputRef.current;
    if (!field) return;
    field.style.height = "auto";
  };

  const clearFiles = () => {
    for (const file of files) {
      if (file.url.startsWith("blob:")) URL.revokeObjectURL(file.url);
    }
    setFiles([]);
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!canSend) return;
    const outgoing = await Promise.all(
      files.map(async ({ id: _id, ...file }) => {
        if (!file.url.startsWith("blob:")) return file;
        const dataUrl = await blobUrlToDataUrl(file.url);
        return dataUrl ? { ...file, url: dataUrl } : null;
      }),
    );
    onAsk(
      text,
      outgoing.filter((file): file is FileUIPart => file !== null),
    );
    setText("");
    clearFiles();
    setAttachOpen(false);
    resetFieldHeight();
    inputRef.current?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    void submit();
  };

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return;
    const room = MAX_ATTACHMENTS - files.length;
    const next = Array.from(list)
      .filter((file) => file.type.startsWith("image/") && file.size <= MAX_ATTACHMENT_BYTES)
      .slice(0, room)
      .map((file) => ({
        id: nanoid(),
        type: "file" as const,
        url: URL.createObjectURL(file),
        mediaType: file.type,
        filename: file.name,
      }));
    if (next.length) setFiles((current) => [...current, ...next]);
    setAttachOpen(false);
    if (photosRef.current) photosRef.current.value = "";
    if (cameraRef.current) cameraRef.current.value = "";
  };

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

  return (
    <form onSubmit={(event) => void submit(event)} className="mx-auto w-full max-w-[40rem]">
      <input
        ref={photosRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => addFiles(event.currentTarget.files)}
      />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => addFiles(event.currentTarget.files)}
      />

      {attachOpen ? (
        <div className="mb-2 overflow-hidden rounded-2xl bg-secondary">
          <button
            type="button"
            onClick={() => photosRef.current?.click()}
            className="flex h-12 w-full items-center gap-3 px-4 text-[15px] transition-opacity hover:opacity-80"
          >
            <ImageIcon className="size-5" />
            {userCopy.ai.photos}
          </button>
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex h-12 w-full items-center gap-3 px-4 text-[15px] transition-opacity hover:opacity-80"
          >
            <Camera className="size-5" />
            {userCopy.ai.camera}
          </button>
        </div>
      ) : null}

      {files.length > 0 ? (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {files.map((file) => (
            <div key={file.id} className="relative size-14 shrink-0">
              <img
                src={file.url}
                alt={file.filename ?? userCopy.ai.attachedFiles}
                className="size-14 rounded-xl object-cover"
              />
              <button
                type="button"
                aria-label={userCopy.ai.removeAttachment}
                onClick={() => {
                  if (file.url.startsWith("blob:")) URL.revokeObjectURL(file.url);
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

      <div className="core-composer-pill flex items-end pl-1.5 pr-1.5">
        <button
          type="button"
          aria-label={attachOpen ? userCopy.ai.close : userCopy.ai.addFiles}
          onClick={() => setAttachOpen((open) => !open)}
          className="mb-1.5 flex size-10 shrink-0 items-center justify-center rounded-full text-foreground transition-opacity hover:opacity-70"
        >
          {attachOpen ? <X className="size-5" /> : <Plus className="size-5" strokeWidth={1.8} />}
        </button>
        <textarea
          ref={inputRef}
          name="message"
          rows={1}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            event.currentTarget.style.height = "auto";
            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 128)}px`;
          }}
          onKeyDown={onKeyDown}
          placeholder={userCopy.ai.composerPlaceholder}
          disabled={busy}
          className={cn(
            "max-h-32 min-h-11 flex-1 resize-none bg-transparent py-3 text-[17px] leading-[22px]",
            "text-foreground placeholder:text-muted-foreground outline-none",
          )}
        />
        {canSend || streaming ? (
          <button
            type={busy ? "button" : "submit"}
            aria-label={busy ? userCopy.ai.stopped : userCopy.ai.send}
            onClick={busy ? onStop : undefined}
            className="mb-2 flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
          >
            {busy ? <Square className="size-3 fill-current" /> : <ArrowUp className="size-4" strokeWidth={2.6} />}
          </button>
        ) : (
          <button
            type="button"
            aria-label={userCopy.ai.voiceAria}
            aria-pressed={listening}
            onClick={toggleVoice}
            className={cn(
              "mb-1.5 flex size-10 shrink-0 items-center justify-center rounded-full",
              listening ? "text-ai" : "text-foreground",
            )}
          >
            <Mic className="size-5" strokeWidth={1.8} />
          </button>
        )}
      </div>
    </form>
  );
}
