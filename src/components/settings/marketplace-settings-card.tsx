"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createMarketplaceSettingsRepository } from "@/infrastructure/firestore/marketplace-settings-repository";
import { userCopy } from "@/lib/user-copy";

const settingsRepository = createMarketplaceSettingsRepository();

function newToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function MarketplaceSettingsCard({
  companyId,
  onStatus,
}: {
  companyId: string;
  onStatus?: (status: string | null) => void;
}) {
  const copy = userCopy.marketplace;
  const [token, setToken] = useState("");
  const [avitoEnabled, setAvitoEnabled] = useState(true);
  const [dromEnabled, setDromEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    void settingsRepository.get(companyId).then((settings) => {
      setToken(settings.feedToken);
      setAvitoEnabled(settings.avitoEnabled);
      setDromEnabled(settings.dromEnabled);
    });
  }, [companyId]);

  const avitoUrl = token
    ? `${origin}/api/marketplace/feeds/avito?companyId=${encodeURIComponent(companyId)}&token=${encodeURIComponent(token)}`
    : "";
  const dromUrl = token
    ? `${origin}/api/marketplace/feeds/drom?companyId=${encodeURIComponent(companyId)}&token=${encodeURIComponent(token)}`
    : "";

  async function save(nextToken = token) {
    setBusy(true);
    try {
      await settingsRepository.save(companyId, {
        companyId,
        feedToken: nextToken,
        avitoEnabled,
        dromEnabled,
      });
      onStatus?.(copy.saved);
    } catch {
      onStatus?.(copy.saveFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Radio className="size-4 text-primary" />
          <CardTitle>{copy.title}</CardTitle>
        </div>
        <CardDescription>{copy.subtitle}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-1.5">
          <Label>{copy.feedToken}</Label>
          <div className="flex gap-2">
            <Input readOnly value={token} />
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                const generated = newToken();
                setToken(generated);
                void save(generated);
              }}
            >
              {copy.generate}
            </Button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={avitoEnabled} onChange={(event) => setAvitoEnabled(event.target.checked)} />
          {copy.avito}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={dromEnabled} onChange={(event) => setDromEnabled(event.target.checked)} />
          {copy.drom}
        </label>
        {avitoUrl ? (
          <div className="grid gap-1.5">
            <Label>{copy.avitoUrl}</Label>
            <Input readOnly value={avitoUrl} />
          </div>
        ) : null}
        {dromUrl ? (
          <div className="grid gap-1.5">
            <Label>{copy.dromUrl}</Label>
            <Input readOnly value={dromUrl} />
          </div>
        ) : null}
        <Button type="button" disabled={busy || !token} onClick={() => void save()}>
          {copy.save}
        </Button>
      </CardContent>
    </Card>
  );
}
