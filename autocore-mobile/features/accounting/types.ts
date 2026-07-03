import type { ComponentType } from 'react';

export type CashFlowPeriod = '7d' | '30d' | '90d' | 'year';

export type TrendTone = 'up' | 'down' | 'neutral';

export type AttentionTone = 'warning' | 'danger' | 'neutral';

export type TransactionStatus = 'completed' | 'pending' | 'overdue';

export type InvoiceStatus = 'paid' | 'waiting' | 'overdue';

export type AccountingSnapshot = {
  balance: {
    available: number;
    monthlyRevenue: number;
    monthlyExpenses: number;
    profit: number;
    trend: number[];
    growing: boolean;
  };
  summary: Array<{
    id: string;
    label: string;
    value: number;
    changePct: number;
    tone: TrendTone;
    sparkline: number[];
  }>;
  quickActions: Array<{
    id: string;
    label: string;
    icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
    primary?: boolean;
  }>;
  attention: Array<{
    id: string;
    title: string;
    subtitle: string;
    tone: AttentionTone;
  }>;
  transactions: Array<{
    id: string;
    title: string;
    description: string;
    employee?: string;
    amount: number;
    direction: 'in' | 'out';
    time: string;
    status: TransactionStatus;
    icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  }>;
  cashFlow: Record<
    CashFlowPeriod,
    {
      revenue: number[];
      expenses: number[];
      profit: number[];
      labels: string[];
    }
  >;
  invoices: Array<{
    id: string;
    customer: string;
    amount: number;
    status: InvoiceStatus;
    dueDate: string;
    progress: number;
  }>;
  topCustomers: Array<{
    id: string;
    name: string;
    paid: number;
    outstanding: number;
    invoices: number;
    growthPct: number;
  }>;
  expenses: Array<{
    id: string;
    label: string;
    amount: number;
    pct: number;
    icon: ComponentType<{ size?: 'sm' | 'md' | 'lg'; color?: string; strokeWidth?: number }>;
  }>;
};
