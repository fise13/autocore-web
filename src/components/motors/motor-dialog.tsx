"use client";

import { FormEvent, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MotorEntity, UpsertMotorInput } from "@/domain/motor";

type MotorDialogProps = {
  companyId: string;
  mode: "create" | "edit";
  initialMotor?: MotorEntity;
  onSubmit: (payload: UpsertMotorInput) => Promise<void>;
  triggerLabel?: string;
  disabled?: boolean;
};

export function MotorDialog({
  companyId,
  mode,
  initialMotor,
  onSubmit,
  triggerLabel,
  disabled = false,
}: MotorDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [serialCode, setSerialCode] = useState(initialMotor?.serialCode ?? "");
  const [configuration, setConfiguration] = useState(initialMotor?.configuration ?? "");
  const [notes, setNotes] = useState(initialMotor?.notes ?? "");
  const [quantity, setQuantity] = useState(String(initialMotor?.quantity ?? 1));
  const [transmission, setTransmission] = useState(initialMotor?.transmission ?? "");
  const [brandName, setBrandName] = useState(initialMotor?.brandName ?? "");
  const [engineCode, setEngineCode] = useState(initialMotor?.engineCode ?? "");

  const title = useMemo(
    () => (mode === "create" ? "Новый мотор" : `Редактировать ${initialMotor?.serialCode ?? ""}`),
    [mode, initialMotor],
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedQty = Number(quantity);
    if (!serialCode.trim()) {
      setError("Номер двигателя обязателен");
      return;
    }
    if (!Number.isInteger(parsedQty) || parsedQty <= 0) {
      setError("Количество должно быть больше 0");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        companyId,
        serialCode: serialCode.trim(),
        configuration: configuration.trim(),
        notes: notes.trim(),
        quantity: parsedQty,
        transmission: transmission.trim(),
        brandName: brandName.trim(),
        engineCode: engineCode.trim(),
        arrivalDate: initialMotor?.arrivalDate ?? new Date(),
        soldDate: initialMotor?.soldDate ?? null,
        localId: initialMotor?.localId,
        engineId: initialMotor?.engineId,
      });
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить мотор");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button disabled={disabled}>{triggerLabel ?? "Новый мотор"}</Button>} />
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Создание новой позиции мотора."
              : "Изменения сохраняются в users/{uid}/motors."}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Номер двигателя</Label>
              <Input value={serialCode} onChange={(e) => setSerialCode(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Количество</Label>
              <Input value={quantity} onChange={(e) => setQuantity(e.target.value)} inputMode="numeric" />
            </div>
            <div className="space-y-1">
              <Label>Бренд</Label>
              <Input value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Код двигателя</Label>
              <Input value={engineCode} onChange={(e) => setEngineCode(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Комплектация</Label>
              <Input value={configuration} onChange={(e) => setConfiguration(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Коробка</Label>
              <Input value={transmission} onChange={(e) => setTransmission(e.target.value)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Особые отметки</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <DialogFooter className="px-0 pb-0">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Сохраняем..." : "Сохранить"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
