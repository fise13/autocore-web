"use client";

import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { toast as sonnerToast } from "sonner";

import { Toaster } from "@/components/ui/sonner";

export type ToastVariant = "default" | "success" | "error";

export type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  durationMs?: number;
};

type ToastContextValue = {
  toast: (input: ToastInput) => string;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const dismiss = useCallback((id: string) => {
    sonnerToast.dismiss(id);
  }, []);

  const toast = useCallback((input: ToastInput) => {
    const duration = input.durationMs ?? 6000;
    const options = { description: input.description, duration };

    if (input.variant === "success") {
      return String(sonnerToast.success(input.title, options));
    }
    if (input.variant === "error") {
      return String(sonnerToast.error(input.title, options));
    }
    return String(sonnerToast(input.title, options));
  }, []);

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
