"use client";

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileSpreadsheet, FileText, FolderArchive, UploadCloud } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ACCEPT = ".xlsx,.xls,.csv,.tsv,.zip";

const FORMATS = [
  { icon: FileSpreadsheet, label: "Excel" },
  { icon: FileText, label: "CSV" },
  { icon: FolderArchive, label: "ZIP с фото" },
];

export function MigrationDropzone({ onFiles }: { onFiles: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      onFiles(Array.from(list));
    },
    [onFiles],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
          Перенесём ваш бизнес в AutoCore
        </h1>
        <p className="max-w-md text-balance text-muted-foreground">
          Загрузите выгрузку из Excel, 1С или таблицу поставщика. AutoCore сам разберёт структуру,
          определит двигатели, запчасти и расходники и покажет, что понял.
        </p>
      </div>

      <motion.button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          handleFiles(event.dataTransfer.files);
        }}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
        className={cn(
          "group relative flex min-h-[260px] w-full cursor-pointer flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed bg-card p-10 text-center transition-colors",
          dragging
            ? "border-emerald-500 bg-emerald-500/5"
            : "border-border hover:border-emerald-500/60 hover:bg-muted/40",
        )}
      >
        <span
          className={cn(
            "flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 transition-transform",
            dragging && "scale-110",
          )}
        >
          <UploadCloud className="size-7" />
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-base font-medium">
            {dragging ? "Отпустите файл — начнём анализ" : "Перетащите файл сюда"}
          </span>
          <span className="text-sm text-muted-foreground">
            или нажмите, чтобы выбрать. Анализ начнётся сразу.
          </span>
        </div>

        <div className="mt-2 flex items-center gap-4">
          {FORMATS.map(({ icon: Icon, label }) => (
            <span key={label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Icon className="size-3.5" />
              {label}
            </span>
          ))}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </motion.button>

      <p className="text-xs text-muted-foreground">
        Данные не публикуются. Перед сохранением вы увидите всё, что AutoCore распознал, и сможете
        исправить.
      </p>
    </div>
  );
}
