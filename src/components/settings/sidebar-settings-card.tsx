"use client";

import { PanelLeft } from "lucide-react";

import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { userCopy } from "@/lib/user-copy";

export function SidebarSettingsCard() {
  const { isEditing, setIsEditing } = useSidebarCustomization();

  function openCustomize() {
    setIsEditing(true);
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <PanelLeft className="size-4 text-primary" />
          <CardTitle className="text-base">{userCopy.settings.interface}</CardTitle>
        </div>
        <CardDescription>{userCopy.settings.subtitleInterface}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={openCustomize} disabled={isEditing}>
          {isEditing ? "Режим настройки открыт" : "Настроить боковую панель"}
        </Button>
        {isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
            Закрыть
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
