/**
 * User-facing widget copy. Lives next to the model so layout functions stay
 * string-free (they cannot import this module — `'widget'` isolation).
 *
 * Swap `EN_WIDGET_COPY` for a locale table later; do not look up i18n inside
 * a widget body.
 */
export type WidgetCopy = {
  brand: string;
  todayEyebrow: string;
  todayUrgentEyebrow: string;
  todayRefresh: string;
  todayClearDetail: string;
  todayFloorClear: string;
  ordersLabel: string;
  placeLabel: string;
  enginesLabel: string;
  enginesInStock: (count: string) => string;
  itemToPlace: (count: number) => string;
  itemsToPlace: (count: number) => string;
  placeDetail: string;
  orderWaiting: (count: number) => string;
  ordersWaiting: (count: number) => string;
  openInTotal: (count: number) => string;
  partLow: (count: number) => string;
  partsLow: (count: number) => string;
  belowReorder: string;
  openOrder: (count: number) => string;
  openOrders: (count: number) => string;
  noOpenOrders: string;
  payoutWaiting: (count: number) => string;
  payoutsWaiting: (count: number) => string;
  jobToClaim: (count: number) => string;
  jobsToClaim: (count: number) => string;
  earningsDetail: string;
  engineAwaiting: (count: number) => string;
  enginesAwaiting: (count: number) => string;
  intakeAwaitingDetail: string;
  intakeEyebrow: string;
  intakeRefresh: string;
  readyForReview: (count: number) => string;
  documenting: (count: number) => string;
  bayClear: string;
  waitingForReview: string;
  readyLabel: string;
  activeLabel: string;
  documentingLabel: string;
  openReadyLabel: string;
  openIntakeLabel: string;
  continueIntakeLabel: string;
  scanEyebrow: string;
  scanTitle: string;
  scanCameraDetail: string;
  scanAction: string;
  scanRefresh: string;
  payEyebrow: string;
  payUnavailable: string;
  payClear: string;
  payRefresh: string;
};

export const EN_WIDGET_COPY: WidgetCopy = {
  brand: 'AutoCore',
  todayEyebrow: 'Floor',
  todayUrgentEyebrow: 'Needs you',
  todayRefresh: 'Open the app to refresh.',
  todayClearDetail: 'The floor is clear.',
  todayFloorClear: 'No open orders',
  ordersLabel: 'Open',
  placeLabel: 'To place',
  enginesLabel: 'Engines',
  enginesInStock: (count) => `${count} engines in stock.`,
  itemToPlace: (count) => `${count} item to place`,
  itemsToPlace: (count) => `${count} items to place`,
  placeDetail: 'Received stock with no location yet.',
  orderWaiting: (count) => `${count} order waiting on parts`,
  ordersWaiting: (count) => `${count} orders waiting on parts`,
  openInTotal: (count) => `${count} open in total.`,
  partLow: (count) => `${count} part low on stock`,
  partsLow: (count) => `${count} parts low on stock`,
  belowReorder: 'Below reorder point.',
  openOrder: (count) => `${count} open order`,
  openOrders: (count) => `${count} open orders`,
  noOpenOrders: 'No open orders',
  payoutWaiting: (count) => `${count} payout waiting`,
  payoutsWaiting: (count) => `${count} payouts waiting`,
  jobToClaim: (count) => `${count} job to claim`,
  jobsToClaim: (count) => `${count} jobs to claim`,
  earningsDetail: 'Pay for completed work.',
  engineAwaiting: (count) => `${count} engine awaiting intake`,
  enginesAwaiting: (count) => `${count} engines awaiting intake`,
  intakeAwaitingDetail: 'Ready to pick up on the floor.',
  intakeEyebrow: 'Intake',
  intakeRefresh: 'Open the app to refresh.',
  readyForReview: (count) =>
    `${count} ${count === 1 ? 'engine' : 'engines'} ready for review`,
  documenting: (count) =>
    `${count} ${count === 1 ? 'engine' : 'engines'} documenting`,
  bayClear: 'Bay is clear',
  waitingForReview: 'Waiting for review',
  readyLabel: 'Ready',
  activeLabel: 'Active',
  documentingLabel: 'documenting',
  openReadyLabel: 'Open Ready',
  openIntakeLabel: 'Open intake',
  continueIntakeLabel: 'Continue',
  scanEyebrow: 'Scan',
  scanTitle: 'Scan in',
  scanCameraDetail: 'Open camera',
  scanAction: 'Scan in',
  scanRefresh: 'Open the app to refresh.',
  payEyebrow: 'Pay',
  payUnavailable: "Pay isn’t on for you",
  payClear: 'Nothing waiting',
  payRefresh: 'Open the app to refresh.',
};
