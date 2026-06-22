"use client";

import { useCallback } from "react";

import { useSidebarCustomization } from "@/components/providers/sidebar-customization-provider";
import {
  SIDEBAR_EDIT_MIN_WIDTH,
  useSidebarLayout,
} from "@/hooks/use-sidebar-layout";

export function useSidebarEditMode() {
  const { isEditing, setIsEditing } = useSidebarCustomization();
  const { collapsed, setCollapsed, width, setWidth } = useSidebarLayout();

  const prepareSidebarForEdit = useCallback(() => {
    if (collapsed) setCollapsed(false);
    if (width < SIDEBAR_EDIT_MIN_WIDTH) setWidth(SIDEBAR_EDIT_MIN_WIDTH);
  }, [collapsed, setCollapsed, setWidth, width]);

  const enterEditMode = useCallback(() => {
    prepareSidebarForEdit();
    setIsEditing(true);
  }, [prepareSidebarForEdit, setIsEditing]);

  const exitEditMode = useCallback(() => {
    setIsEditing(false);
  }, [setIsEditing]);

  return {
    isEditing,
    enterEditMode,
    exitEditMode,
    prepareSidebarForEdit,
    setIsEditing,
  };
}
