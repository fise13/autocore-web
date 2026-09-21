"use client";

import { Download, FilePlus2, Loader2, Plus, Printer, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DOCX_MIME_TYPE, buildSaleDocx } from "@/lib/motor-land/docx/package";
import { entryTotal, parseHistory, searchHistory, type HistoryEntry } from "@/lib/motor-land/history";
import {
  computeTotals,
  createEmptyItem,
  createEmptySaleDocument,
  formatDateTime,
  formatMoney,
  formatQuantity,
  itemAmount,
  saleDocumentFileName,
  type SaleDocumentData,
  type SaleItem,
} from "@/lib/motor-land/sale-document";
import { cn } from "@/lib/utils";

import { SaleDocumentSheet } from "./sale-document-sheet";

const API = "/api/motor-land/documents";

/** Shared server history. An unreachable server leaves the form fully usable. */
async function fetchHistory(): Promise<HistoryEntry[]> {
  const response = await fetch(API, { cache: "no-store" });
  if (!response.ok) throw new Error(`История недоступна (${response.status})`);
  return parseHistory(await response.json());
}

/**
 * `ПР-267` → `ПР-268`. The last issued document sets the series, so the number
 * is already filled in before the operator touches anything, and never repeats.
 */
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

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ViewTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function HistoryPanel({
  history,
  building,
  onOpen,
  onDownload,
}: {
  history: HistoryEntry[];
  building: boolean;
  onOpen: (entry: HistoryEntry) => void;
  onDownload: (entry: HistoryEntry) => void;
}) {
  const [search, setSearch] = useState("");
  const found = useMemo(() => searchHistory(history, search), [history, search]);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-xs print:hidden">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Номер, заказчик, клиент, двигатель или номер агрегата"
          className="h-10 pl-8"
          aria-label="Поиск по выданным документам"
        />
      </div>

      {history.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Здесь появятся выданные документы. Каждый сохраняется автоматически при скачивании — его
          можно найти, открыть и перевыпустить.
        </p>
      ) : found.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          По запросу «{search}» ничего не найдено.
        </p>
      ) : (
        <>
          <p className="mt-3 mb-2 text-xs text-muted-foreground">
            {search
              ? `Найдено: ${found.length} из ${history.length}`
              : `Всего документов: ${history.length}`}
          </p>
          <ul className="flex flex-col gap-2">
            {found.map((entry) => (
              <li
                key={entry.id}
                className="rounded-lg border border-border/70 bg-background px-3 py-2.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="text-sm font-semibold text-foreground">
                        № {entry.data.documentNumber}
                      </span>
                      <span className="text-sm font-medium text-foreground">
                        {formatMoney(entryTotal(entry))} ₸
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(entry.data.issuedAt)}
                      </span>
                      {entry.data.vatRate > 0 && (
                        <span className="text-xs text-muted-foreground">
                          НДС {formatQuantity(entry.data.vatRate)}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Менеджер: {entry.data.customer.manager || "—"} · Клиент:{" "}
                      {entry.data.customer.client || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => onOpen(entry)}>
                      Открыть
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={building}
                      onClick={() => onDownload(entry)}
                      aria-label={`Скачать документ ${entry.data.documentNumber}`}
                    >
                      <Download className="size-3.5" />
                    </Button>
                  </div>
                </div>

                <table className="mt-2 w-full border-separate border-spacing-0 text-xs">
                  <tbody>
                    {entry.data.items.map((item, index) => (
                      <tr key={item.id} className="text-muted-foreground">
                        <td className="w-5 py-0.5 align-top">{index + 1}.</td>
                        <td className="py-0.5 align-top text-foreground">
                          {item.title || "Без наименования"}
                          {item.serial ? ` · № ${item.serial}` : ""}
                        </td>
                        <td className="w-24 py-0.5 text-right align-top whitespace-nowrap">
                          {formatQuantity(item.quantity)} {item.unit} ×{" "}
                          {formatMoney(item.price)}
                        </td>
                        <td className="w-24 py-0.5 text-right align-top whitespace-nowrap text-foreground">
                          {formatMoney(itemAmount(item))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

export function SaleDocumentBuilder() {
  const [data, setData] = useState<SaleDocumentData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [view, setView] = useState<"document" | "history">("document");
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The date stamps itself and the number continues the last issued document,
  // so a sale needs only the engine and its serial to be typed.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let stored: HistoryEntry[] = [];
      try {
        stored = await fetchHistory();
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "История недоступна");
      }
      if (cancelled) return;
      setHistory(stored);
      setData(
        createEmptySaleDocument(
          new Date(),
          nextDocumentNumber(stored[0]?.data.documentNumber ?? null),
          crypto.randomUUID(),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const update = useCallback((patch: Partial<SaleDocumentData>) => {
    setData((current) => (current ? { ...current, ...patch } : current));
  }, []);

  const updateItem = useCallback((id: string, patch: Partial<SaleItem>) => {
    setData((current) =>
      current
        ? { ...current, items: current.items.map((item) => (item.id === id ? { ...item, ...patch } : item)) }
        : current,
    );
  }, []);

  const fileName = useMemo(() => (data ? saleDocumentFileName(data) : ""), [data]);

  /** Builds the two-page .docx for `source` and hands it to the browser. */
  const downloadDocx = useCallback(async (source: SaleDocumentData) => {
    setBuilding(true);
    setError(null);
    try {
      const response = await fetch("/motor-land/logo.png");
      if (!response.ok) throw new Error(`Логотип не загрузился (${response.status})`);
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
      setError(cause instanceof Error ? cause.message : "Не удалось собрать документ");
      return false;
    } finally {
      setBuilding(false);
    }
  }, []);

  /** Issuing a document is what puts it in the shared history. */
  const handleIssue = useCallback(async () => {
    if (!data) return;
    if (!(await downloadDocx(data))) return;

    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data }),
      });
      if (!response.ok) throw new Error(`Сервер ответил ${response.status}`);
      setHistory(await fetchHistory());
    } catch (cause) {
      setError(
        `Файл готов, но в историю не записался: ${cause instanceof Error ? cause.message : "сервер недоступен"}`,
      );
    }
  }, [data, downloadDocx]);

  const handleNewDocument = useCallback(() => {
    const latest = history[0]?.data.documentNumber ?? data?.documentNumber ?? null;
    setData(createEmptySaleDocument(new Date(), nextDocumentNumber(latest), crypto.randomUUID()));
    setView("document");
  }, [data?.documentNumber, history]);

  const handleOpen = useCallback((entry: HistoryEntry) => {
    setData(entry.data);
    setView("document");
  }, []);

  if (!data) {
    return <div className="h-[70vh] animate-pulse rounded-xl border border-border bg-card" />;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,400px)_minmax(0,1fr)] xl:items-start">
      <div className="flex flex-col gap-4 print:hidden">
        <Card title="Документ">
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
                if (!Number.isNaN(parsed.getTime())) update({ issuedAt: parsed.toISOString() });
              }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Номер продолжает предыдущий документ, дата — текущая. Можно исправить вручную.
          </p>
        </Card>

        <Card
          title="Двигатели и запчасти"
          action={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => update({ items: [...data.items, createEmptyItem(crypto.randomUUID())] })}
            >
              <Plus className="size-3.5" />
              Строка
            </Button>
          }
        >
          <div className="flex flex-col gap-4">
            {data.items.map((item, index) => (
              <div key={item.id} className="rounded-lg border border-border/70 bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Позиция {index + 1}</span>
                  {data.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => update({ items: data.items.filter((row) => row.id !== item.id) })}
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
                      onChange={(value) => updateItem(item.id, { title: value })}
                    />
                  </div>
                  <TextField
                    label="Номер агрегата"
                    value={item.serial}
                    placeholder="928420"
                    onChange={(value) => updateItem(item.id, { serial: value })}
                  />
                  <TextField
                    label="Количество"
                    type="number"
                    value={String(item.quantity)}
                    onChange={(value) => updateItem(item.id, { quantity: parseNumber(value) })}
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
                    onChange={(value) => updateItem(item.id, { price: parseNumber(value) })}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Стороны">
          <div className="grid gap-3">
            <TextField
              label="Менеджер"
              value={data.customer.manager}
              placeholder="Мамонтов Д. А."
              onChange={(value) => update({ customer: { ...data.customer, manager: value } })}
            />
            <TextField
              label="Клиент"
              value={data.customer.client}
              placeholder="Иванов И. И., +7 777 000 00 00"
              onChange={(value) => update({ customer: { ...data.customer, client: value } })}
            />
          </div>
        </Card>

        <Card title="НДС">
          <TextField
            label="НДС, % (0 — без НДС)"
            type="number"
            value={String(data.vatRate)}
            onChange={(value) => update({ vatRate: parseNumber(value) })}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Сумма документа:{" "}
            <span className="font-medium text-foreground">{formatMoney(computeTotals(data).total)} ₸</span>
          </p>
        </Card>
      </div>

      <div className="flex flex-col gap-4">
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-xs backdrop-blur print:hidden">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
            <ViewTab active={view === "document"} onClick={() => setView("document")}>
              Документ
            </ViewTab>
            <ViewTab active={view === "history"} onClick={() => setView("history")}>
              История{history.length > 0 ? ` · ${history.length}` : ""}
            </ViewTab>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button type="button" onClick={() => void handleIssue()} disabled={building}>
              {building ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              Скачать Word
            </Button>
            <Button type="button" variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              Печать
            </Button>
            <Button type="button" variant="outline" onClick={handleNewDocument}>
              <FilePlus2 className="size-4" />
              Новый
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive print:hidden">
            {error}
          </p>
        )}

        {view === "history" && (
          <HistoryPanel
            history={history}
            building={building}
            onOpen={handleOpen}
            onDownload={(entry) => void downloadDocx(entry.data)}
          />
        )}

        {/* Always in the DOM: printing has to work from the history view too. */}
        <div className={cn("flex flex-col gap-6 print:gap-0", view !== "document" && "hidden print:flex")}>
          <p className="text-xs text-muted-foreground print:hidden">{fileName}</p>
          <SaleDocumentSheet data={data} />
        </div>
      </div>
    </div>
  );
}
