"use client";

import { useRef, useState } from "react";
import { LifeBuoy, Loader2, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast-provider";

export function MigrationSupportDialog({
  open,
  onOpenChange,
  defaultFile,
  companyName,
  email,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultFile?: File | null;
  companyName?: string;
  email?: string;
}) {
  const { toast } = useToast();
  const [comment, setComment] = useState("");
  const [contact, setContact] = useState(email ?? "");
  const [file, setFile] = useState<File | null>(defaultFile ?? null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!comment.trim() && !file) {
      toast({ title: "Опишите проблему или приложите файл", variant: "error" });
      return;
    }
    setSending(true);
    try {
      const formData = new FormData();
      formData.set("comment", comment);
      formData.set("email", contact);
      if (companyName) formData.set("companyName", companyName);
      if (file) formData.set("file", file);

      const response = await fetch("/api/migration/support", { method: "POST", body: formData });
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { support?: string } | null;
        if (response.status === 503 && data?.support) {
          window.location.href = `mailto:${data.support}?subject=${encodeURIComponent("Помощь с импортом")}`;
          onOpenChange(false);
          return;
        }
        throw new Error();
      }
      toast({ title: "Запрос отправлен", description: "Команда AutoCore свяжется с вами.", variant: "success" });
      setComment("");
      onOpenChange(false);
    } catch {
      toast({ title: "Не удалось отправить", description: "Попробуйте ещё раз позже.", variant: "error" });
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="size-4 text-emerald-600" />
            Поможем с импортом
          </DialogTitle>
          <DialogDescription>
            Приложите файл и опишите, что не получилось. Мы настроим перенос под вашу таблицу.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="support-comment">Что пошло не так</Label>
            <Textarea
              id="support-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Например: не распознались колонки с ценой и складом"
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="support-email">Email для ответа</Label>
            <Input
              id="support-email"
              type="email"
              value={contact}
              onChange={(event) => setContact(event.target.value)}
              placeholder="you@company.com"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv,.tsv,.zip"
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Paperclip data-icon="inline-start" />
              {file ? "Заменить файл" : "Приложить файл"}
            </Button>
            {file && <span className="truncate text-xs text-muted-foreground">{file.name}</span>}
          </div>
        </div>

        <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Отмена
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            Отправить в поддержку
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
