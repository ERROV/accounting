import { Person, Transaction, Expense, Income, BackupRecord, AuthUser } from '../types';

export interface AppDataResponse {
  people: Person[];
  transactions: Transaction[];
  expenses: Expense[];
  income: Income[];
  backups: BackupRecord[];
}

export interface StatusResponse {
  status: string;
  databaseConnected: boolean;
  error?: string | null;
  cloudProvider?: string;
  serverTime?: string;
  stats?: { peopleCount: number; transCount: number };
}

export interface AuthResponse {
  success: boolean;
  token: string;
  user: AuthUser;
}

const AUTH_TOKEN_KEY = 'df_auth_token';
const AUTH_USER_KEY = 'df_auth_user';

function getHeaders(customHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const api = {
  // Auth helpers
  getSavedToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  },

  getSavedUser(): AuthUser | null {
    try {
      const u = localStorage.getItem(AUTH_USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  saveAuth(token: string, user: AuthUser) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  },

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
  },

  async login(username: string, password: string): Promise<AuthResponse> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل تسجيل الدخول');
    }
    this.saveAuth(data.token, data.user);
    return data;
  },

  async register(
    username: string,
    email: string,
    password: string,
    fullName: string
  ): Promise<AuthResponse> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, fullName }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل إنشاء الحساب');
    }
    this.saveAuth(data.token, data.user);
    return data;
  },

  async getMe(): Promise<AuthUser | null> {
    const token = this.getSavedToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: getHeaders(),
      });
      if (!res.ok) {
        this.logout();
        return null;
      }
      const data = await res.json();
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(data.user));
      return data.user;
    } catch {
      return this.getSavedUser();
    }
  },

  async seedRealData(): Promise<any> {
    const res = await fetch('/api/seed', {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to seed real data');
    return res.json();
  },

  // Status
  async getStatus(): Promise<StatusResponse> {
    const res = await fetch('/api/status', {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Status check failed');
    return res.json();
  },

  // Unified Data
  async getAllData(): Promise<AppDataResponse> {
    const res = await fetch('/api/data', {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();
    try {
      localStorage.setItem('cached_app_data', JSON.stringify(data));
      localStorage.setItem('cached_app_timestamp', new Date().toISOString());
    } catch (e) {
      console.warn('Local storage cache limit exceeded', e);
    }
    return data;
  },

  getCachedData(): AppDataResponse | null {
    try {
      const cached = localStorage.getItem('cached_app_data');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.warn('Error reading local cache', e);
    }
    return null;
  },

  // People
  async createPerson(person: Partial<Person>): Promise<Person> {
    const res = await fetch('/api/people', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(person),
    });
    if (!res.ok) throw new Error('Failed to create person');
    return res.json();
  },

  async updatePerson(id: string, person: Partial<Person>): Promise<Person> {
    const res = await fetch(`/api/people/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(person),
    });
    if (!res.ok) throw new Error('Failed to update person');
    return res.json();
  },

  async deletePerson(id: string): Promise<void> {
    const res = await fetch(`/api/people/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete person');
  },

  // Transactions
  async createTransaction(transaction: Partial<Transaction>): Promise<Transaction> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(transaction),
    });
    if (!res.ok) throw new Error('Failed to create transaction');
    return res.json();
  },

  async updateTransaction(id: string, transaction: Partial<Transaction>): Promise<Transaction> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(transaction),
    });
    if (!res.ok) throw new Error('Failed to update transaction');
    return res.json();
  },

  async deleteTransaction(id: string): Promise<void> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete transaction');
  },

  // Expenses
  async createExpense(expense: Partial<Expense>): Promise<Expense> {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    if (!res.ok) throw new Error('Failed to create expense');
    return res.json();
  },

  async updateExpense(id: string, expense: Partial<Expense>): Promise<Expense> {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(expense),
    });
    if (!res.ok) throw new Error('Failed to update expense');
    return res.json();
  },

  async deleteExpense(id: string): Promise<void> {
    const res = await fetch(`/api/expenses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete expense');
  },

  // Income
  async createIncome(income: Partial<Income>): Promise<Income> {
    const res = await fetch('/api/income', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(income),
    });
    if (!res.ok) throw new Error('Failed to create income');
    return res.json();
  },

  async updateIncome(id: string, income: Partial<Income>): Promise<Income> {
    const res = await fetch(`/api/income/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(income),
    });
    if (!res.ok) throw new Error('Failed to update income');
    return res.json();
  },

  async deleteIncome(id: string): Promise<void> {
    const res = await fetch(`/api/income/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to delete income');
  },

  // Backups
  async createBackup(type: 'manual' | 'auto' = 'manual'): Promise<any> {
    const res = await fetch('/api/backup', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ type }),
    });
    if (!res.ok) throw new Error('Failed to create backup');
    return res.json();
  },

  async getBackups(): Promise<BackupRecord[]> {
    const res = await fetch('/api/backups', {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Failed to fetch backups');
    return res.json();
  },

  async restoreBackup(backupId?: string, directData?: any): Promise<any> {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ backupId, directData }),
    });
    if (!res.ok) throw new Error('Failed to restore backup');
    return res.json();
  },
};
