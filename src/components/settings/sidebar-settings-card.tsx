"use client";

import { PanelLeft } from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidebarEditMode } from "@/hooks/use-sidebar-edit-mode";
import { userCopy } from "@/lib/user-copy";

export function SidebarSettingsCard() {
  const { isEditing, enterEditMode, exitEditMode } = useSidebarEditMode();

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
        <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.12 }}>
          <Button type="button" onClick={enterEditMode} disabled={isEditing}>
            {isEditing ? "Режим настройки открыт" : "Настроить боковую панель"}
          </Button>
        </motion.div>
        {isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={exitEditMode}>
            Закрыть
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
