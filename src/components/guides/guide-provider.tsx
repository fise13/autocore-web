"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { useAssistantOptional } from "@/components/ai/ai-provider";
import { GuideDock } from "@/components/guides/guide-dock";
import { GuideSpotlight } from "@/components/guides/guide-spotlight";
import { GuideTooltip } from "@/components/guides/guide-tooltip";
import { useAuth } from "@/components/providers/auth-provider";
import { GUIDE_CATALOG } from "@/lib/guides/catalog";
import { isStepComplete } from "@/lib/guides/conditions";
import { INITIAL_GUIDE_STATE } from "@/lib/guides/types";
import {
  reduceGuideState,
  selectActiveGuide,
  selectActiveStep,
} from "@/lib/guides/controller";
import { clearGuideSignals, subscribeGuideSignals } from "@/lib/guides/signals";
import { isElementVisible, resolveGuideTarget } from "@/lib/guides/targets";
import { userCopy } from "@/lib/user-copy";

type GuideContextValue = {
  enabled: boolean;
  active: boolean;
  start: (guideId: string) => void;
  exit: () => void;
};

const GuideStore = createContext<GuideContextValue | null>(null);

export function useGuide(): GuideContextValue {
  const value = useContext(GuideStore);
  if (!value) throw new Error("useGuide must be used within GuideProvider");
  return value;
}

export function useGuideOptional(): GuideContextValue | null {
  return useContext(GuideStore);
}

export function GuideProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const assistant = useAssistantOptional();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const enabled = Boolean(profile?.companyId);

  const [state, dispatch] = useReducer(
    (current: typeof INITIAL_GUIDE_STATE, event: Parameters<typeof reduceGuideState>[1]) =>
      reduceGuideState(current, event, GUIDE_CATALOG),
    INITIAL_GUIDE_STATE,
  );
  const stepEnteredAtRef = useRef(0);
  const completingStepRef = useRef<string | null>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const stuckEpoch = `${state.guideId ?? ""}:${state.stepIndex}`;
  const [stuckFor, setStuckFor] = useState<string | null>(null);
  const stuck = stuckFor === stuckEpoch;

  const guide = selectActiveGuide(state, GUIDE_CATALOG);
  const step = selectActiveStep(state, GUIDE_CATALOG);
  const active = enabled && (state.status === "active" || state.status === "completed");

  const start = useCallback(
    (guideId: string) => {
      if (!enabled) return;
      clearGuideSignals();
      stepEnteredAtRef.current = Date.now();
      assistant?.closeCompact();
      if (pathname === "/ai" || pathname.startsWith("/ai/")) {
        router.push("/");
      }
      dispatch({ type: "start", guideId });
    },
    [assistant, enabled, pathname, router],
  );

  const exit = useCallback(() => {
    dispatch({ type: "exit" });
    setRect(null);
  }, []);

  useEffect(() => {
    if (!active) {
      document.documentElement.removeAttribute("data-guide-active");
      return;
    }
    document.documentElement.setAttribute("data-guide-active", "");
    return () => document.documentElement.removeAttribute("data-guide-active");
  }, [active]);

  useEffect(() => {
    stepEnteredAtRef.current = Date.now();
    completingStepRef.current = null;
  }, [state.guideId, state.stepIndex]);

  useEffect(() => {
    if (!enabled || state.status !== "active" || !step) return;

    const ctx = () => ({
      pathname,
      searchParams: new URLSearchParams(searchParams.toString()),
      startedAt: stepEnteredAtRef.current,
    });

    const check = () => {
      if (completingStepRef.current === step.id) return;
      if (isStepComplete(step, ctx())) {
        completingStepRef.current = step.id;
        dispatch({ type: "complete-step" });
      }
    };

    check();
    const mo = new MutationObserver(check);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true });
    const unsub = subscribeGuideSignals(check);
    return () => {
      mo.disconnect();
      unsub();
    };
  }, [enabled, pathname, searchParams, state.status, step]);

  useEffect(() => {
    if (!active || state.status !== "active" || !step) {
      return;
    }

    const update = () => {
      const target = resolveGuideTarget(step.target, step.fallbackTarget);
      if (target && isElementVisible(target)) {
        target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
        setRect(target.getBoundingClientRect());
      }
    };

    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const id = window.setInterval(update, 250);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      window.clearInterval(id);
    };
  }, [active, state.status, step, pathname, state.showMe]);

  useEffect(() => {
    if (state.status !== "active") return;
    const id = window.setTimeout(() => setStuckFor(stuckEpoch), 12_000);
    return () => window.clearTimeout(id);
  }, [stuckEpoch, state.status]);

  useEffect(() => {
    if (!state.showMe) return;
    const id = window.setTimeout(() => dispatch({ type: "hide-show-me" }), 2500);
    return () => window.clearTimeout(id);
  }, [state.showMe]);

  useEffect(() => {
    if (state.status !== "active" || !step) return;

    const onPointerDown = (event: PointerEvent) => {
      const node = event.target;
      if (!(node instanceof Element)) return;
      if (node.closest("[data-guide-ui]")) return;
      const target = resolveGuideTarget(step.target, step.fallbackTarget);
      if (target && target.contains(node)) {
        dispatch({ type: "clear-wrong-click" });
        return;
      }
      dispatch({ type: "wrong-click" });
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [state.status, step]);

  const dockOnTop = Boolean(rect && rect.bottom > (typeof window === "undefined" ? 0 : window.innerHeight - 140));

  const value = useMemo<GuideContextValue>(
    () => ({ enabled, active, start, exit }),
    [active, enabled, exit, start],
  );

  return (
    <GuideStore.Provider value={value}>
      {children}
      {active && guide && step ? (
        <div data-guide-ui>
          {state.status === "active" ? (
            <>
              <GuideSpotlight rect={rect} showMe={state.showMe} moveKey={step.id} />
              <GuideTooltip
                rect={rect}
                title={step.title}
                instruction={step.instruction}
                dockOnTop={dockOnTop}
                moveKey={step.id}
              />
            </>
          ) : null}
          <GuideDock
            stepLabel={userCopy.guides.stepOf(state.stepIndex + 1, guide.steps.length)}
            title={step.title}
            instruction={step.hint ? `${step.instruction} ${step.hint}` : step.instruction}
            wrongClick={
              state.wrongClick ? (step.wrongClick ?? userCopy.guides.defaultWrongClick) : null
            }
            stuck={stuck}
            canBack={state.stepIndex > 0 && state.status === "active"}
            completed={state.status === "completed"}
            dockOnTop={dockOnTop}
            onBack={() => dispatch({ type: "back" })}
            onNext={() => dispatch({ type: "next" })}
            onExit={exit}
            onShowMe={() => {
              const target = resolveGuideTarget(step.target, step.fallbackTarget);
              target?.scrollIntoView({ block: "center", behavior: "smooth" });
              dispatch({ type: "show-me" });
            }}
          />
        </div>
      ) : null}
    </GuideStore.Provider>
  );
}
