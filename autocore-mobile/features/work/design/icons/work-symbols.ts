/** SF Symbol names for Work OS domains. */
export const WORK_OS_SYMBOLS = {
  summary: 'heart.text.square.fill',
  browse: 'square.grid.2x2.fill',
  orders: 'wrench.and.screwdriver.fill',
  intake: 'camera.viewfinder',
  parts: 'shippingbox.fill',
  locations: 'mappin.and.ellipse',
  receiving: 'barcode.viewfinder',
  documents: 'doc.text.fill',
  engines: 'engine.combustion.fill',
  finance: 'chart.bar.fill',
  pick: 'checklist',
  bay: 'rectangle.split.3x1.fill',
  claimable: 'hand.raised.fill',
  search: 'magnifyingglass',
  console: 'play.circle.fill',
  timer: 'timer',
  waiting: 'hourglass',
  completed: 'checkmark.seal.fill',
  offline: 'wifi.slash',
  outbox: 'arrow.triangle.2.circlepath',
} as const;

export type WorkOsSymbolKey = keyof typeof WORK_OS_SYMBOLS;
