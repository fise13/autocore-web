"use client";

import { useRouter } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSidebarEditMode } from "@/hooks/use-sidebar-edit-mode";
import { userCopy } from "@/lib/user-copy";

export function SidebarSettingsCard() {
  const router = useRouter();
  const { isEditing, enterEditMode, exitEditMode } = useSidebarEditMode();

  function openSidebarEditor() {
    enterEditMode();
    router.push("/home");
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
        <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.12 }}>
          <Button type="button" onClick={openSidebarEditor} disabled={isEditing}>
            {isEditing
              ? userCopy.settings.configureSidebarOpen
              : userCopy.settings.configureSidebar}
          </Button>
        </motion.div>
        {isEditing ? (
          <Button type="button" variant="outline" size="sm" onClick={exitEditMode}>
            {userCopy.settings.configureSidebarClose}
          </Button>
        ) : null}
        {isEditing ? (
          <p className="w-full text-xs text-muted-foreground">
            {userCopy.settings.configureSidebarHint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
