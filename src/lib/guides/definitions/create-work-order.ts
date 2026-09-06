import type { GuideDefinition } from "@/lib/guides/types";

export const CREATE_WORK_ORDER_GUIDE: GuideDefinition = {
  id: "create-work-order",
  title: "Create a work order",
  summary: "Open Orders, start a new job, pick a customer and an engine, then save.",
  aiExplanation:
    "Create a work order from the Orders section. I can walk you through it on the real workspace.",
  steps: [
    {
      id: "open-orders",
      title: "Open Orders",
      instruction: "Click Orders in the sidebar to open the work-order workspace.",
      target: "nav-work_orders",
      completion: [{ kind: "pathname", prefix: "/work-orders" }],
      wrongClick: "That's not part of this step. We're looking for Orders in the sidebar.",
    },
    {
      id: "start-create",
      title: "Create a new work order",
      instruction: 'Click "New work order" to open the composer.',
      target: "work-order-create",
      completion: [{ kind: "element", target: "work-order-composer" }],
      wrongClick: "That's not part of this step. We're looking for \"New work order\".",
    },
    {
      id: "select-customer",
      title: "Select a customer",
      instruction:
        "Choose an existing customer or type a new name and phone. A VIN or plate is required before you can continue.",
      target: "work-order-client",
      completion: [{ kind: "complete", target: "work-order-client" }],
      hint: "Existing customers appear as you type.",
      wrongClick: "We're filling in the customer on this step.",
    },
    {
      id: "continue-jobs",
      title: "Continue to jobs",
      instruction: "Click Next to add labor, parts, or an engine.",
      target: "work-order-next",
      completion: [{ kind: "signal", name: "work-order-step-advanced" }],
      wrongClick: "Use Next at the bottom of the composer to continue.",
    },
    {
      id: "select-engine",
      title: "Select the engine",
      instruction: "Open the Motors tab, pick an engine from inventory, then click Add.",
      target: "work-order-engine",
      fallbackTarget: "work-order-motors-tab",
      completion: [{ kind: "complete", target: "work-order-engine" }],
      hint: "The engine stays in inventory until you save the order.",
      wrongClick: "We're adding an engine from the Motors tab.",
    },
    {
      id: "save-order",
      title: "Save the work order",
      instruction: "Go to Review if you are not there yet, then save the draft (⌘S / Ctrl+S, or click Save).",
      target: "work-order-save",
      fallbackTarget: "work-order-next",
      completion: [{ kind: "signal", name: "work-order-saved" }],
      wrongClick: "Save the work order to finish this walkthrough.",
    },
  ],
};
