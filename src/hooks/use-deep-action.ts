"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { DeepAction, isDeepAction } from "@/lib/navigation/deep-actions";

type UseDeepActionOptions = {
  expectedAction?: DeepAction;
  onAction?: (action: DeepAction) => void;
};

export function useDeepAction({ expectedAction, onAction }: UseDeepActionOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const handledRef = useRef<string | null>(null);
  const onActionRef = useRef(onAction);

  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  const rawAction = searchParams.get("action");
  const action = isDeepAction(rawAction) ? rawAction : null;

  const clearActionParam = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("action");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!action) return;
    if (expectedAction && action !== expectedAction) return;

    const key = `${pathname}:${action}:${searchParams.toString()}`;
    if (handledRef.current === key) return;
    handledRef.current = key;

    onActionRef.current?.(action);
    clearActionParam();
  }, [action, clearActionParam, expectedAction, pathname, searchParams]);

  return { action, clearActionParam };
}
