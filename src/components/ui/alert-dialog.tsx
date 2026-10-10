"use client"

import * as React from "react"
import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog"

import { Button } from "@/components/ui/button"
import { userCopy } from "@/lib/user-copy"
import { cn } from "@/lib/utils"

/**
 * Confirmation for destructive or irreversible actions (delete, rollback,
 * clear data). No close icon: Escape and Cancel are the only ways out, and
 * Cancel receives initial focus so Enter never confirms by accident.
 */
function AlertDialog({ ...props }: AlertDialogPrimitive.Root.Props) {
  return <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
}

function AlertDialogTrigger({ ...props }: AlertDialogPrimitive.Trigger.Props) {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />
}

function AlertDialogContent({
  className,
  children,
  ...props
}: AlertDialogPrimitive.Popup.Props) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Backdrop
        data-slot="alert-dialog-overlay"
        className="pointer-events-none fixed inset-0 isolate z-50 bg-overlay duration-200 data-open:pointer-events-auto data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 motion-reduce:duration-0"
      />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        className={cn(
          "pointer-events-none fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl bg-popover p-4 text-sm text-popover-foreground shadow-dialog ring-1 ring-foreground/10 duration-200 outline-none sm:max-w-md sm:p-6 data-open:pointer-events-auto data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 motion-reduce:duration-0",
          className
        )}
        {...props}
      >
        {children}
      </AlertDialogPrimitive.Popup>
    </AlertDialogPrimitive.Portal>
  )
}

function AlertDialogTitle({ className, ...props }: AlertDialogPrimitive.Title.Props) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn("text-base leading-6 font-semibold", className)}
      {...props}
    />
  )
}

function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function AlertDialogFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)}
      {...props}
    />
  )
}

type ConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  /** Verb + object, e.g. «Откатить импорт». Never "OK". */
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void | Promise<void>
  /** Destructive actions use the solid danger button. */
  destructive?: boolean
  busy?: boolean
}

/** Ready-made confirmation with the AutoCore anatomy. Replaces window.confirm(). */
function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  destructive = true,
  busy = false,
}: ConfirmDialogProps) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)

  return (
    <AlertDialog open={open} onOpenChange={(next) => (busy ? undefined : onOpenChange(next))}>
      <AlertDialogContent initialFocus={cancelRef}>
        <div className="grid gap-2">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description ? <AlertDialogDescription>{description}</AlertDialogDescription> : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogPrimitive.Close
            render={<Button ref={cancelRef} variant="outline" size="lg" disabled={busy} />}
          >
            {cancelLabel ?? userCopy.commonUi.cancel}
          </AlertDialogPrimitive.Close>
          <Button
            variant={destructive ? "destructive-solid" : "default"}
            size="lg"
            disabled={busy}
            aria-busy={busy || undefined}
            onClick={() => void onConfirm()}
          >
            {confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
  ConfirmDialog,
}
