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
import { userCopy } from "@/lib/user-copy";

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
  const copy = userCopy.migration.support;
  const [comment, setComment] = useState("");
  const [contact, setContact] = useState(email ?? "");
  const [file, setFile] = useState<File | null>(defaultFile ?? null);
  const [sending, setSending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!comment.trim() && !file) {
      toast({ title: copy.needComment, variant: "error" });
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
          window.location.href = `mailto:${data.support}?subject=${encodeURIComponent(copy.mailSubject)}`;
          onOpenChange(false);
          return;
        }
        throw new Error();
      }
      toast({ title: copy.sentTitle, description: copy.sentDescription, variant: "success" });
      setComment("");
      onOpenChange(false);
    } catch {
      toast({ title: copy.failedTitle, description: copy.failedDescription, variant: "error" });
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
            {copy.title}
          </DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="support-comment">{copy.commentLabel}</Label>
            <Textarea
              id="support-comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={copy.commentPlaceholder}
              rows={4}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="support-email">{copy.emailLabel}</Label>
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
              {file ? copy.replaceFile : copy.attachFile}
            </Button>
            {file && <span className="truncate text-xs text-muted-foreground">{file.name}</span>}
          </div>
        </div>

        <div className="-mx-4 -mb-4 flex justify-end gap-2 rounded-b-xl border-t bg-muted/50 p-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            {copy.cancel}
          </Button>
          <Button onClick={submit} disabled={sending}>
            {sending && <Loader2 className="animate-spin" data-icon="inline-start" />}
            {copy.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
