"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";

type PanelLifecycleOptions = {
  isActive: boolean;
  rootRef?: React.RefObject<HTMLElement | null>;
};

export function usePanelLifecycle({ isActive, rootRef }: PanelLifecycleOptions): void {
  const wasActiveRef = useRef(isActive);

  useEffect(() => {
    const root = rootRef?.current ?? null;
    if (!root) return;

    if (isActive) {
      root.removeAttribute("data-panel-suspended");
      resumePanelAnimations(root);
    } else {
      root.setAttribute("data-panel-suspended", "");
      suspendPanelAnimations(root);
    }

    wasActiveRef.current = isActive;
  }, [isActive, rootRef]);
}

function getPanelTriggers(root: HTMLElement): ScrollTrigger[] {
  return ScrollTrigger.getAll().filter((trigger) => {
    const triggerEl = trigger.trigger;
    if (!(triggerEl instanceof Element)) return false;
    return root.contains(triggerEl);
  });
}

function suspendPanelAnimations(root: HTMLElement): void {
  getPanelTriggers(root).forEach((trigger) => trigger.disable(false, true));

  const timelines = gsap.globalTimeline.getChildren(false, true, false) as gsap.core.Tween[];
  timelines.forEach((tween) => {
    const targets = tween.targets();
    if (targets.some((target) => target instanceof Element && root.contains(target))) {
      tween.pause();
    }
  });

  root.querySelectorAll<HTMLElement>("[data-lifecycle-pausable]").forEach((node) => {
    node.dispatchEvent(new CustomEvent("panel:suspend", { bubbles: false }));
  });
  document.dispatchEvent(new CustomEvent("panel:suspend"));
}

function resumePanelAnimations(root: HTMLElement): void {
  getPanelTriggers(root).forEach((trigger) => trigger.enable(false, true));

  const timelines = gsap.globalTimeline.getChildren(false, true, false) as gsap.core.Tween[];
  timelines.forEach((tween) => {
    const targets = tween.targets();
    if (targets.some((target) => target instanceof Element && root.contains(target))) {
      tween.play();
    }
  });

  root.querySelectorAll<HTMLElement>("[data-lifecycle-pausable]").forEach((node) => {
    node.dispatchEvent(new CustomEvent("panel:resume", { bubbles: false }));
  });
  document.dispatchEvent(new CustomEvent("panel:resume"));
}
