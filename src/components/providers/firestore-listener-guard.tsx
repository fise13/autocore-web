"use client";

import { useEffect } from "react";

function isIgnorableClientRejection(reason: unknown): boolean {
  if (reason instanceof Error) {
    const message = reason.message.toLowerCase();
    if (message.includes("missing or insufficient permissions")) return true;
    if (message.includes("permission-denied")) return true;
  }
  if (!reason || typeof reason !== "object") return false;
  const code = "code" in reason ? String((reason as { code?: unknown }).code ?? "") : "";
  if (code === "permission-denied" || code === "unauthenticated") return true;
  const name = "name" in reason ? String((reason as { name?: unknown }).name ?? "") : "";
  if (name === "FirebaseError") {
    const message = "message" in reason ? String((reason as { message?: unknown }).message ?? "") : "";
    if (message.toLowerCase().includes("missing or insufficient permissions")) return true;
  }
  return false;
}

export function FirestoreListenerGuard() {
  useEffect(() => {
    function handleUnhandledRejection(event: PromiseRejectionEvent) {
      if (!isIgnorableClientRejection(event.reason)) return;
      event.preventDefault();
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    return () => window.removeEventListener("unhandledrejection", handleUnhandledRejection);
  }, []);

  return null;
}
