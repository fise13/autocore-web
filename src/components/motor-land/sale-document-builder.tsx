"use client";

import {
  Download,
  FilePlus2,
  Loader2,
  LogOut,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/components/providers/auth-provider";
import { useMotorLandDocuments } from "@/hooks/use-motor-land-documents";
import { DOCX_MIME_TYPE, buildSaleDocx } from "@/lib/motor-land/docx/package";
import {
  computeTotals,
  createEmptyItem,
  createEmptySaleDocument,
  formatDateTime,
  formatMoney,
  saleDocumentFileName,
  type SaleDocumentData,
  type SaleItem,
} from "@/lib/motor-land/sale-document";

import { SaleDocumentSheet, WarrantySheet } from "./sale-document-sheet";

const COUNTER_KEY = "motor-land:last-document-number";

/** `ПР-267` → `ПР-268`; anything unparseable restarts the series. */
function nextDocumentNumber(previous: string | null): string {
  const match = previous?.match(/^(\D*)(\d+)$/);
  if (!match) return "ПР-1";
  const width = match[2]!.length;
  return `${match[1]}${String(Number(match[2]) + 1).padStart(width, "0")}`;
}

/** `<input type="datetime-local">` speaks local time without a zone suffix. */
function toLocalInputValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function parseNumber(value: string): number {
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SaleDocumentBuilder() {
  const { firebaseUser, logout } = useAuth();
  const uid = firebaseUser?.uid ?? null;
  const {
    documents: history,
    isLoading: historyLoading,
    error: historyError,
    save,
    remove,
  } = useMotorLandDocuments(uid);

  const [data, setData] = useState<SaleDocumentData | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The date stamps itself and the number continues the last series printed on
  // this machine, so a sale needs only the engine and its serial to be typed.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(COUNTER_KEY);
    } catch {
      stored = null;
    }
    // Clock, localStorage and randomUUID all differ between server and client,
    // so the first document can only be built after mount — a lazy useState
    // initializer would render different HTML than it hydrates.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(
      createEmptySaleDocument(
        new Date(),
        nextDocumentNumber(stored),
        crypto.randomUUID(),
      ),
    );
  }, []);

  const update = useCallback((patch: Partial<SaleDocumentData>) => {
    setData((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<SaleItem>) => {
    setData((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item) =>
              item.id === id ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
  }, []);

  const fileName = useMemo(
    () => (data ? saleDocumentFileName(data) : ""),
    [data],
  );

  /** Builds the two-page .docx for `source` and hands it to the browser. */
  const downloadDocx = useCallback(async (source: SaleDocumentData) => {
    setBuilding(true);
    setError(null);
    try {
      const response = await fetch("/motor-land/logo.png");
      if (!response.ok)
        throw new Error(`Логотип не загрузился (${response.status})`);
      const logoPng = new Uint8Array(await response.arrayBuffer());

      const bytes = await buildSaleDocx(source, { logoPng });
      const blob = new Blob([bytes as BlobPart], { type: DOCX_MIME_TYPE });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = saleDocumentFileName(source);
      anchor.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Не удалось собрать документ",
      );
      return false;
    } finally {
      setBuilding(false);
    }
  }, []);

  /** Issuing a document is what puts it in the history and moves the counter on. */
  const handleIssue = useCallback(async () => {
    if (!data) return;
    if (!(await downloadDocx(data))) return;

    try {
      await save(data);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? `Файл готов, но запись в историю не сохранилась: ${cause.message}`
          : "Файл готов, но запись в историю не сохранилась",
      );
    }
    try {
      window.localStorage.setItem(COUNTER_KEY, data.documentNumber);
    } catch {
      // Private browsing: the counter simply restarts next time.
    }
  }, [data, downloadDocx, save]);

  const handleNewDocument = useCallback(() => {
    const latest =
      history[0]?.data.documentNumber ?? data?.documentNumber ?? null;
    setData(
      createEmptySaleDocument(
        new Date(),
        nextDocumentNumber(latest),
        crypto.randomUUID(),
      ),
    );
  }, [data?.documentNumber, history]);

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await remove(id);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Не удалось удалить документ",
        );
      }
    },
    [remove],
  );

  if (!data) {
    return (
      <div className="h-[60vh] animate-pulse rounded-xl border border-border bg-card" />
    );
  }

  return (
    <>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            Товарная накладная на двигатель
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Номер и дата подставляются автоматически. Условия гарантии
            печатаются на обороте каждого документа — отдельно включать их не
            нужно. Каждый выданный документ сохраняется в вашем аккаунте.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {firebaseUser?.email}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void logout()}
          >
            <LogOut className="size-3.5" />
            Выйти
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4 print:hidden">
          <Section title="Документ">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Номер документа"
                value={data.documentNumber}
                onChange={(value) => update({ documentNumber: value })}
              />
              <TextField
                label="Дата и время"
                type="datetime-local"
                value={toLocalInputValue(data.issuedAt)}
                onChange={(value) => {
                  const parsed = new Date(value);
                  if (!Number.isNaN(parsed.getTime()))
                    update({ issuedAt: parsed.toISOString() });
                }}
              />
            </div>
          </Section>

          <Section
            title="Двигатели и запчасти"
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  update({
                    items: [
                      ...data.items,
                      createEmptyItem(crypto.randomUUID()),
                    ],
                  })
                }
              >
                <Plus className="size-3.5" />
                Строка
              </Button>
            }
          >
            <div className="flex flex-col gap-4">
              {data.items.map((item, index) => (
                <div
                  key={item.id}
                  className="rounded-lg border border-border/70 bg-background p-3"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      Позиция {index + 1}
                    </span>
                    {data.items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          update({
                            items: data.items.filter(
                              (row) => row.id !== item.id,
                            ),
                          })
                        }
                        aria-label={`Удалить позицию ${index + 1}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <TextField
                        label="Наименование"
                        value={item.title}
                        placeholder="Двигатель EJ253 (Subaru)"
                        onChange={(value) =>
                          updateItem(item.id, { title: value })
                        }
                      />
                    </div>
                    <TextField
                      label="Номер агрегата"
                      value={item.serial}
                      placeholder="928420"
                      onChange={(value) =>
                        updateItem(item.id, { serial: value })
                      }
                    />
                    <TextField
                      label="Количество"
                      type="number"
                      value={String(item.quantity)}
                      onChange={(value) =>
                        updateItem(item.id, { quantity: parseNumber(value) })
                      }
                    />
                    <TextField
                      label="Единица"
                      value={item.unit}
                      onChange={(value) => updateItem(item.id, { unit: value })}
                    />
                    <TextField
                      label="Цена, ₸"
                      type="number"
                      value={String(item.price)}
                      onChange={(value) =>
                        updateItem(item.id, { price: parseNumber(value) })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Стороны">
            <div className="grid gap-3">
              <TextField
                label="Заказчик"
                value={data.customer.orderer}
                placeholder="Приходящий Клиент"
                onChange={(value) =>
                  update({ customer: { ...data.customer, orderer: value } })
                }
              />
              <TextField
                label="Клиент"
                value={data.customer.client}
                placeholder="Иванов И. И., +7 777 000 00 00"
                onChange={(value) =>
                  update({ customer: { ...data.customer, client: value } })
                }
              />
            </div>
          </Section>

          <Section title="НДС">
            <TextField
              label="НДС, % (0 — без НДС)"
              type="number"
              value={String(data.vatRate)}
              onChange={(value) => update({ vatRate: parseNumber(value) })}
            />
          </Section>

          <Section
            title={`История документов${history.length > 0 ? ` (${history.length})` : ""}`}
          >
            {historyError && (
              <p className="mb-2 text-xs text-destructive">
                История недоступна: {historyError}
              </p>
            )}
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {historyLoading
                  ? "Загружаем историю…"
                  : "Каждый выданный документ сохраняется в вашем аккаунте: его можно открыть, перевыпустить или удалить с любого устройства."}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">
                        № {entry.data.documentNumber} ·{" "}
                        {formatMoney(computeTotals(entry.data).total)} ₸
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDateTime(entry.data.issuedAt)}
                        {entry.data.customer.orderer
                          ? ` · ${entry.data.customer.orderer}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setData(entry.data)}
                      >
                        Открыть
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={building}
                        onClick={() => void downloadDocx(entry.data)}
                        aria-label={`Скачать документ ${entry.id}`}
                      >
                        <Download className="size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleDelete(entry.id)}
                        aria-label={`Удалить документ ${entry.id}`}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Button type="button" onClick={handleIssue} disabled={building}>
              {building ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Скачать Word
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.print()}
            >
              <Printer className="size-4" />
              Печать
            </Button>
            <Button type="button" variant="outline" onClick={handleNewDocument}>
              <FilePlus2 className="size-4" />
              Новый документ
            </Button>
            <span className="text-xs text-muted-foreground">{fileName}</span>
          </div>

          {error && (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive print:hidden">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-6 print:gap-0">
            <SaleDocumentSheet data={data} />
            <WarrantySheet data={data} />
          </div>
        </div>
      </div>
    </>
  );
}
