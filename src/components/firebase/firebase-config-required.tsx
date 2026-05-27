"use client";

import { AlertTriangle } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getMissingFirebaseEnvKeys } from "@/infrastructure/firebase/client";

type FirebaseConfigRequiredProps = {
  compact?: boolean;
};

export function FirebaseConfigRequired({ compact = false }: FirebaseConfigRequiredProps) {
  const missingKeys = getMissingFirebaseEnvKeys();

  return (
    <Card className={compact ? undefined : "max-w-3xl"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-destructive" />
          Firebase не настроен
        </CardTitle>
        <CardDescription>
          Создайте файл <code>.env.local</code> из <code>.env.local.example</code> и добавьте web-ключи
          вашего Firebase проекта.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="font-medium">Отсутствуют переменные:</p>
        <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
          {missingKeys.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
        {!compact ? (
          <pre className="mt-3 overflow-auto rounded-md border bg-muted p-3 text-xs">
            {`cp .env.local.example .env.local\nnpm run dev`}
          </pre>
        ) : null}
      </CardContent>
    </Card>
  );
}
