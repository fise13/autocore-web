import type { AiUiBlock } from './ai-ui-blocks';

/**
 * Lightweight on-device intent router for v1.
 * Maps operational phrases to native UI blocks; server AI session can replace this later.
 */
export async function interpretAiPrompt(prompt: string): Promise<AiUiBlock[]> {
  const q = prompt.trim().toLowerCase();

  if (/receive\s+engine|intake/.test(q)) {
    const serialMatch = prompt.match(/\b([A-Z0-9]{5,})\b/i);
    const serial = serialMatch?.[1]?.toUpperCase() ?? null;
    return [
      {
        type: 'confirmation',
        title: serial ? `Receive engine ${serial}` : 'Receive engine',
        body: serial
          ? `Start intake for serial ${serial}. Camera opens after you confirm.`
          : 'Open engine intake to type a serial and begin photography.',
        confirmLabel: 'Start intake',
        href: '/objects/new',
      },
      {
        type: 'action',
        label: 'Receive engine',
        href: '/objects/new',
        primary: true,
      },
    ];
  }

  if (/need(s)?\s+photo|missing\s+photo|oil\s+pan|no\s+oil/.test(q)) {
    return [
      {
        type: 'text',
        body: 'Engines missing evidence — open Incoming to continue photography.',
      },
      {
        type: 'action',
        label: 'Engines needing photos',
        href: '/objects/engines?filter=incoming',
        primary: true,
      },
      {
        type: 'metric',
        label: 'Open incoming engines',
        value: '—',
        delta: 'Check Engines Incoming',
      },
    ];
  }

  if (/received\s+today|what\s+was\s+received|throughput/.test(q)) {
    return [
      {
        type: 'metric',
        label: 'Received today',
        value: '—',
        delta: 'Live counts load from Engines once opened',
      },
      {
        type: 'timeline',
        title: 'Today',
        items: [
          { id: '1', title: 'Open Engines Incoming for today’s activity', meta: 'Field complete → yard' },
        ],
      },
      {
        type: 'action',
        label: 'Open Engines',
        href: '/objects/engines?filter=incoming',
      },
    ];
  }

  if (/ej\d+|warehouse|find\s+engine|search/.test(q)) {
    const encoded = encodeURIComponent(prompt.trim());
    return [
      {
        type: 'text',
        body: `Search Autocore for “${prompt.trim()}”.`,
      },
      {
        type: 'action',
        label: 'Search now',
        href: `/search?q=${encoded}`,
        primary: true,
      },
    ];
  }

  if (/finance|revenue|ledger|accounting/.test(q)) {
    return [
      {
        type: 'action',
        label: 'Open finance',
        href: '/(tabs)/accounting',
        primary: true,
      },
      {
        type: 'text',
        body: 'Finance lives under Work when accounting is enabled for your company.',
      },
    ];
  }

  if (/order|work\s+order/.test(q)) {
    return [
      {
        type: 'action',
        label: 'Open orders',
        href: '/orders',
        primary: true,
      },
      {
        type: 'action',
        label: 'New order',
        href: '/orders/new',
      },
    ];
  }

  return [
    {
      type: 'text',
      body: 'Try: “Receive engine U398539”, “Show engines that still need photos”, or “What was received today?”',
    },
    {
      type: 'action',
      label: 'Search Autocore',
      href: `/search?q=${encodeURIComponent(prompt.trim())}`,
      primary: true,
    },
    {
      type: 'action',
      label: 'Open Work',
      href: '/(tabs)/work',
    },
  ];
}
