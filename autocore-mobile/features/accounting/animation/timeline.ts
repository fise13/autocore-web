import { screenMotion } from '@/theme/screen';

const s = screenMotion.stagger;

export const acTimeline = {
  header: 0,
  logo: 0,
  title: s,
  balance: s,
  date: s,
  hero: s * 2,
  summaryTitle: s * 3,
  summaryBase: s * 4,
  summaryStagger: s,
  quickTitle: s * 6,
  quickBase: s * 7,
  quickStagger: s,
  attention: s * 9,
  attentionItem: s * 10,
  transactionsTitle: s * 11,
  transactionBase: s * 12,
  transactionStagger: s,
  cashFlow: s * 14,
  invoices: s * 15,
  customers: s * 16,
  expenses: s * 17,
  counterDuration: 500,
  sparklineDuration: 580,
} as const;
