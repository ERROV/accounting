/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ActiveTab,
  Language,
  ThemeMode,
  Person,
  Transaction,
  Expense,
  Income,
  TransactionType,
  CurrencyCode,
} from './types';
import { api } from './services/api';
import { useAuth } from './context/AuthContext';
import { AuthScreen } from './components/AuthScreen';
import { Header } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { PeopleManager } from './components/PeopleManager';
import { ExpensesManager } from './components/ExpensesManager';
import { IncomeManager } from './components/IncomeManager';
import { RemindersView } from './components/RemindersView';
import { PersonDetailModal } from './components/PersonDetailModal';
import { PersonModal } from './components/PersonModal';
import { TransactionModal } from './components/TransactionModal';
import { ExpenseModal } from './components/ExpenseModal';
import { IncomeModal } from './components/IncomeModal';
import { BackupModal } from './components/BackupModal';

export default function App() {
  const { user, loading: authLoading, logout, setUser } = useAuth();

  // Appearance & Localization
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app_lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<ThemeMode>(() => {
    return (localStorage.getItem('app_theme') as ThemeMode) || 'light';
  });

  // Active Tab & Active Currency Filter
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeCurrency, setActiveCurrency] = useState<CurrencyCode | 'ALL'>('ALL');

  // Application Data
  const [people, setPeople] = useState<Person[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);

  // Connectivity & Sync Status
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Modals
  const [isPersonModalOpen, setIsPersonModalOpen] = useState<boolean>(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);

  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState<boolean>(false);
  const [selectedPersonForTrans, setSelectedPersonForTrans] = useState<Person | null>(null);
  const [defaultTransType, setDefaultTransType] = useState<TransactionType>('debt');
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState<boolean>(false);
  const [incomeToEdit, setIncomeToEdit] = useState<Income | null>(null);

  const [activePersonDetailId, setActivePersonDetailId] = useState<string | null>(null);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);

  // Synchronize HTML attributes for language & theme
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('app_lang', language);
  }, [language]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Fetch full data from server/cloud database
  const fetchData = useCallback(async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const cached = api.getCachedData();
      if (cached && people.length === 0) {
        setPeople(cached.people || []);
        setTransactions(cached.transactions || []);
        setExpenses(cached.expenses || []);
        setIncome(cached.income || []);
      }

      const res = await api.getAllData();
      setPeople(res.people);
      setTransactions(res.transactions);
      setExpenses(res.expenses);
      setIncome(res.income);
      setIsDbConnected(true);
    } catch (err) {
      console.warn('Network or API sync warning, using local cache:', err);
      setIsDbConnected(false);
      const cached = api.getCachedData();
      if (cached) {
        setPeople(cached.people || []);
        setTransactions(cached.transactions || []);
        setExpenses(cached.expenses || []);
        setIncome(cached.income || []);
      }
    } finally {
      setIsSyncing(false);
      setInitialLoading(false);
    }
  }, [people.length, user]);

  useEffect(() => {
    if (user) {
      fetchData();
    } else {
      setInitialLoading(false);
    }
  }, [fetchData, user]);

  // People operations
  const handleSavePerson = async (data: Partial<Person>) => {
    if (personToEdit) {
      const updated = await api.updatePerson(personToEdit.id, data);
      setPeople((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      const created = await api.createPerson(data as Omit<Person, 'id' | 'createdAt'>);
      setPeople((prev) => [created, ...prev]);
    }
    setIsPersonModalOpen(false);
    setPersonToEdit(null);
  };

  const handleDeletePerson = async (id: string) => {
    const confirmMsg =
      language === 'ar'
        ? 'هل أنت متأكد من حذف هذا الشخص؟ سيتم أيضاً حذف كافة عملياته وحساباته المرتبطة!'
        : 'Are you sure you want to delete this person and all their associated transactions?';

    if (window.confirm(confirmMsg)) {
      await api.deletePerson(id);
      setPeople((prev) => prev.filter((p) => p.id !== id));
      setTransactions((prev) => prev.filter((tr) => tr.personId !== id));
      if (activePersonDetailId === id) {
        setActivePersonDetailId(null);
      }
    }
  };

  // Transaction operations
  const handleSaveTransaction = async (data: Partial<Transaction>) => {
    if (transactionToEdit) {
      const updated = await api.updateTransaction(transactionToEdit.id, data);
      setTransactions((prev) => prev.map((tr) => (tr.id === updated.id ? updated : tr)));
    } else {
      const created = await api.createTransaction(data as Omit<Transaction, 'id' | 'createdAt'>);
      setTransactions((prev) => [created, ...prev]);
    }
    setIsTransactionModalOpen(false);
    setTransactionToEdit(null);
    setSelectedPersonForTrans(null);
  };

  const handleDeleteTransaction = async (id: string) => {
    const confirmMsg =
      language === 'ar'
        ? 'هل أنت متأكد من حذف هذه العملية؟'
        : 'Are you sure you want to delete this transaction?';

    if (window.confirm(confirmMsg)) {
      await api.deleteTransaction(id);
      setTransactions((prev) => prev.filter((tr) => tr.id !== id));
    }
  };

  // Expense operations
  const handleSaveExpense = async (data: Partial<Expense>) => {
    if (expenseToEdit) {
      const updated = await api.updateExpense(expenseToEdit.id, data);
      setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } else {
      const created = await api.createExpense(data as Omit<Expense, 'id' | 'createdAt'>);
      setExpenses((prev) => [created, ...prev]);
    }
    setIsExpenseModalOpen(false);
    setExpenseToEdit(null);
  };

  const handleDeleteExpense = async (id: string) => {
    const confirmMsg =
      language === 'ar' ? 'هل أنت متأكد من حذف هذا المصروف؟' : 'Are you sure you want to delete this expense?';

    if (window.confirm(confirmMsg)) {
      await api.deleteExpense(id);
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    }
  };

  // Income operations
  const handleSaveIncome = async (data: Partial<Income>) => {
    if (incomeToEdit) {
      const updated = await api.updateIncome(incomeToEdit.id, data);
      setIncome((prev) => prev.map((inc) => (inc.id === updated.id ? updated : inc)));
    } else {
      const created = await api.createIncome(data as Omit<Income, 'id' | 'createdAt'>);
      setIncome((prev) => [created, ...prev]);
    }
    setIsIncomeModalOpen(false);
    setIncomeToEdit(null);
  };

  const handleDeleteIncome = async (id: string) => {
    const confirmMsg =
      language === 'ar'
        ? 'هل أنت متأكد من حذف عملية الدخل هذه؟'
        : 'Are you sure you want to delete this income entry?';

    if (window.confirm(confirmMsg)) {
      await api.deleteIncome(id);
      setIncome((prev) => prev.filter((inc) => inc.id !== id));
    }
  };

  // Active Person for Detail Modal
  const activePerson = useMemo(() => {
    return people.find((p) => p.id === activePersonDetailId) || null;
  }, [people, activePersonDetailId]);

  const activePersonTransactions = useMemo(() => {
    if (!activePerson) return [];
    return transactions.filter((tr) => tr.personId === activePerson.id);
  }, [transactions, activePerson]);

  // Overdue count
  const overdueCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return transactions.filter(
      (tr) => tr.type === 'debt' && tr.dueDate && tr.dueDate < today && tr.status !== 'completed'
    ).length;
  }, [transactions]);

  // Quick Open Modal Helpers
  const openAddDebtForPerson = (person: Person) => {
    setSelectedPersonForTrans(person);
    setDefaultTransType('debt');
    setTransactionToEdit(null);
    setIsTransactionModalOpen(true);
  };

  const openAddPaymentForPerson = (person: Person) => {
    setSelectedPersonForTrans(person);
    setDefaultTransType('payment');
    setTransactionToEdit(null);
    setIsTransactionModalOpen(true);
  };

  // If session is being verified on startup
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-xs font-semibold text-slate-400">جاري التحقق من الجلسة والصلاحيات...</p>
      </div>
    );
  }

  // If not logged in, display the Authentication Screen
  if (!user) {
    return (
      <AuthScreen
        onLoginSuccess={setUser}
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'ar' ? 'en' : 'ar'))}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* App Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        setLanguage={setLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        isDbConnected={isDbConnected}
        isSyncing={isSyncing}
        onRefreshSync={fetchData}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        overdueCount={overdueCount}
        activeCurrency={activeCurrency}
        setActiveCurrency={setActiveCurrency}
        currentUser={user}
        onLogout={logout}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {initialLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-xs font-semibold text-slate-500">جاري الاتصال بالسحابة وتحميل البيانات...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <Dashboard
                people={people}
                transactions={transactions}
                expenses={expenses}
                income={income}
                language={language}
                activeCurrency={activeCurrency}
                onNavigateTab={setActiveTab}
                onOpenAddPerson={() => {
                  setPersonToEdit(null);
                  setIsPersonModalOpen(true);
                }}
                onOpenAddExpense={() => {
                  setExpenseToEdit(null);
                  setIsExpenseModalOpen(true);
                }}
                onOpenAddIncome={() => {
                  setIncomeToEdit(null);
                  setIsIncomeModalOpen(true);
                }}
                onSelectPerson={(id) => setActivePersonDetailId(id)}
              />
            )}

            {activeTab === 'people' && (
              <PeopleManager
                people={people}
                transactions={transactions}
                language={language}
                activeCurrency={activeCurrency}
                onAddPerson={() => {
                  setPersonToEdit(null);
                  setIsPersonModalOpen(true);
                }}
                onEditPerson={(p) => {
                  setPersonToEdit(p);
                  setIsPersonModalOpen(true);
                }}
                onDeletePerson={handleDeletePerson}
                onOpenAddDebt={openAddDebtForPerson}
                onOpenAddPayment={openAddPaymentForPerson}
                onSelectPerson={(id) => setActivePersonDetailId(id)}
              />
            )}

            {activeTab === 'expenses' && (
              <ExpensesManager
                expenses={expenses}
                language={language}
                activeCurrency={activeCurrency}
                onAddExpense={() => {
                  setExpenseToEdit(null);
                  setIsExpenseModalOpen(true);
                }}
                onEditExpense={(exp) => {
                  setExpenseToEdit(exp);
                  setIsExpenseModalOpen(true);
                }}
                onDeleteExpense={handleDeleteExpense}
              />
            )}

            {activeTab === 'income' && (
              <IncomeManager
                income={income}
                language={language}
                activeCurrency={activeCurrency}
                onAddIncome={() => {
                  setIncomeToEdit(null);
                  setIsIncomeModalOpen(true);
                }}
                onEditIncome={(inc) => {
                  setIncomeToEdit(inc);
                  setIsIncomeModalOpen(true);
                }}
                onDeleteIncome={handleDeleteIncome}
              />
            )}

            {activeTab === 'reminders' && (
              <RemindersView
                people={people}
                transactions={transactions}
                language={language}
                activeCurrency={activeCurrency}
                onOpenAddPayment={openAddPaymentForPerson}
                onSelectPerson={(id) => setActivePersonDetailId(id)}
              />
            )}
          </>
        )}
      </main>

      {/* Person Detail & Account Statement Modal */}
      {activePerson && (
        <PersonDetailModal
          person={activePerson}
          transactions={activePersonTransactions}
          language={language}
          onClose={() => setActivePersonDetailId(null)}
          onOpenAddDebt={openAddDebtForPerson}
          onOpenAddPayment={openAddPaymentForPerson}
          onEditTransaction={(tr) => {
            setTransactionToEdit(tr);
            setSelectedPersonForTrans(activePerson);
            setDefaultTransType(tr.type);
            setIsTransactionModalOpen(true);
          }}
          onDeleteTransaction={handleDeleteTransaction}
        />
      )}

      {/* Person Create/Edit Modal */}
      <PersonModal
        isOpen={isPersonModalOpen}
        onClose={() => {
          setIsPersonModalOpen(false);
          setPersonToEdit(null);
        }}
        personToEdit={personToEdit}
        onSave={handleSavePerson}
        language={language}
      />

      {/* Transaction (Debt / Payment) Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => {
          setIsTransactionModalOpen(false);
          setTransactionToEdit(null);
          setSelectedPersonForTrans(null);
        }}
        people={people}
        selectedPerson={selectedPersonForTrans}
        defaultType={defaultTransType}
        transactionToEdit={transactionToEdit}
        onSave={handleSaveTransaction}
        language={language}
      />

      {/* Expense Create/Edit Modal */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setExpenseToEdit(null);
        }}
        expenseToEdit={expenseToEdit}
        onSave={handleSaveExpense}
        language={language}
      />

      {/* Income Create/Edit Modal */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => {
          setIsIncomeModalOpen(false);
          setIncomeToEdit(null);
        }}
        incomeToEdit={incomeToEdit}
        onSave={handleSaveIncome}
        language={language}
      />

      {/* Cloud & Database Backup Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        language={language}
        onDataRestored={fetchData}
      />
    </div>
  );
}
