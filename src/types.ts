export type TransactionType = 'debt' | 'payment';

export type CurrencyCode = 'IQD' | 'USD' | 'TRY';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  nameAr: string;
  nameEn: string;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  IQD: {
    code: 'IQD',
    symbol: 'د.ع',
    nameAr: 'دينار عراقي',
    nameEn: 'Iraqi Dinar (IQD)',
    flag: '🇮🇶',
  },
  USD: {
    code: 'USD',
    symbol: '$',
    nameAr: 'دولار أمريكي',
    nameEn: 'US Dollar (USD)',
    flag: '🇺🇸',
  },
  TRY: {
    code: 'TRY',
    symbol: '₺',
    nameAr: 'ليرة تركية',
    nameEn: 'Turkish Lira (TRY)',
    flag: '🇹🇷',
  },
};

export interface AuthUser {
  id: string;
  username: string;
  email?: string;
  fullName: string;
  role: 'admin' | 'user';
  createdAt?: string;
}

export interface Person {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Transaction {
  id: string;
  personId: string;
  type: TransactionType;
  amount: number;
  currency: CurrencyCode;
  description: string;
  date: string;
  dueDate?: string | null;
  status: 'pending' | 'completed' | 'overdue' | 'partial';
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  personName: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  date: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Income {
  id: string;
  sourcePerson: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  date: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackupSummary {
  peopleCount: number;
  transactionsCount: number;
  expensesCount: number;
  incomeCount: number;
}

export interface BackupRecord {
  id: string;
  backup_type: 'auto' | 'manual';
  summary?: BackupSummary;
  createdAt: string;
}

export interface PersonAccountSummary {
  person: Person;
  balancesByCurrency: Record<CurrencyCode, { totalDebt: number; totalPaid: number; remaining: number }>;
  totalDebt: number;
  totalPaid: number;
  remaining: number;
  overdueCount: number;
  transactions: Transaction[];
  lastActivityDate?: string;
}

export type Language = 'ar' | 'en';
export type ThemeMode = 'light' | 'dark';
export type ActiveTab = 'dashboard' | 'people' | 'expenses' | 'income' | 'reminders';

export function formatAmount(amount: number, currency: CurrencyCode = 'IQD'): string {
  const conf = CURRENCIES[currency] || CURRENCIES.IQD;
  return `${amount.toLocaleString()} ${conf.symbol}`;
}
