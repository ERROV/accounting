import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Coins,
  AlertTriangle,
  PlusCircle,
  FileSpreadsheet,
  Printer,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  User,
  Layers,
} from 'lucide-react';
import {
  Person,
  Transaction,
  Expense,
  Income,
  Language,
  ActiveTab,
  CurrencyCode,
  CURRENCIES,
  formatAmount,
} from '../types';
import { getTranslation } from '../i18n/translations';
import { exportAllDataToExcel, exportPrintablePDF } from '../utils/exportUtils';

interface DashboardProps {
  people: Person[];
  transactions: Transaction[];
  expenses: Expense[];
  income: Income[];
  language: Language;
  activeCurrency: CurrencyCode | 'ALL';
  onNavigateTab: (tab: ActiveTab) => void;
  onOpenAddPerson: () => void;
  onOpenAddExpense: () => void;
  onOpenAddIncome: () => void;
  onSelectPerson: (personId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  people,
  transactions,
  expenses,
  income,
  language,
  activeCurrency,
  onNavigateTab,
  onOpenAddPerson,
  onOpenAddExpense,
  onOpenAddIncome,
  onSelectPerson,
}) => {
  const t = getTranslation(language);
  const currenciesList: CurrencyCode[] = ['IQD', 'USD', 'TRY'];

  // Filter lists if a specific currency is active
  const filteredIncome = activeCurrency === 'ALL'
    ? income
    : income.filter((i) => (i.currency || 'IQD') === activeCurrency);

  const filteredExpenses = activeCurrency === 'ALL'
    ? expenses
    : expenses.filter((e) => (e.currency || 'IQD') === activeCurrency);

  const filteredTransactions = activeCurrency === 'ALL'
    ? transactions
    : transactions.filter((tr) => (tr.currency || 'IQD') === activeCurrency);

  // Per-currency calculation map for comprehensive breakdown
  const currencyTotals = currenciesList.reduce((acc, curr) => {
    const inc = income.filter((i) => (i.currency || 'IQD') === curr).reduce((s, i) => s + i.amount, 0);
    const exp = expenses.filter((e) => (e.currency || 'IQD') === curr).reduce((s, e) => s + e.amount, 0);
    const debts = transactions.filter((t) => t.type === 'debt' && (t.currency || 'IQD') === curr).reduce((s, t) => s + t.amount, 0);
    const paid = transactions.filter((t) => t.type === 'payment' && (t.currency || 'IQD') === curr).reduce((s, t) => s + t.amount, 0);
    const remaining = Math.max(0, debts - paid);
    acc[curr] = { inc, exp, debts, paid, remaining };
    return acc;
  }, {} as Record<CurrencyCode, { inc: number; exp: number; debts: number; paid: number; remaining: number }>);

  // Current view calculations
  const totalIncome = filteredIncome.reduce((sum, item) => sum + item.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);

  const debts = filteredTransactions.filter((t) => t.type === 'debt');
  const payments = filteredTransactions.filter((t) => t.type === 'payment');

  const totalDebts = debts.reduce((sum, t) => sum + t.amount, 0);
  const totalPaid = payments.reduce((sum, t) => sum + t.amount, 0);
  const totalRemaining = Math.max(0, totalDebts - totalPaid);

  // Overdue items
  const today = new Date().toISOString().split('T')[0];
  const overdueTransactions = filteredTransactions.filter((tr) => {
    if (tr.type !== 'debt') return false;
    if (!tr.dueDate) return false;
    return tr.dueDate < today && tr.status !== 'completed';
  });

  const activeSymbol = activeCurrency === 'ALL' ? '' : CURRENCIES[activeCurrency].symbol;

  const handleExportAllExcel = () => {
    exportAllDataToExcel(people, transactions, expenses, income, {
      totalIncome,
      totalExpenses,
      totalDebts,
      totalRemaining,
    });
  };

  const handleExportAllPDF = () => {
    const htmlContent = `
      <div class="cards-row">
        <div class="card">
          <div class="card-label">إجمالي الدخل (${activeCurrency === 'ALL' ? 'الكل' : activeCurrency})</div>
          <div class="card-val" style="color: #16a34a;">${totalIncome.toLocaleString()} ${activeSymbol}</div>
        </div>
        <div class="card">
          <div class="card-label">إجمالي المصروفات</div>
          <div class="card-val" style="color: #ea580c;">${totalExpenses.toLocaleString()} ${activeSymbol}</div>
        </div>
        <div class="card">
          <div class="card-label">إجمالي الديون المسجلة</div>
          <div class="card-val" style="color: #dc2626;">${totalDebts.toLocaleString()} ${activeSymbol}</div>
        </div>
        <div class="card">
          <div class="card-label">إجمالي المتبقي (المستحقات)</div>
          <div class="card-val" style="color: #2563eb;">${totalRemaining.toLocaleString()} ${activeSymbol}</div>
        </div>
      </div>

      <h3 style="margin-top: 24px; font-size: 16px; color: #0f172a;">حسابات الأشخاص والديون (${people.length})</h3>
      <table>
        <thead>
          <tr>
            <th>اسم الشخص</th>
            <th>رقم الهاتف</th>
            <th>إجمالي الدين</th>
            <th>المدفوع</th>
            <th>المتبقي</th>
          </tr>
        </thead>
        <tbody>
          ${people
            .map((p) => {
              const pTrans = filteredTransactions.filter((t) => t.personId === p.id);
              const pDebts = pTrans.filter((t) => t.type === 'debt').reduce((s, t) => s + t.amount, 0);
              const pPaid = pTrans.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
              const pRem = Math.max(0, pDebts - pPaid);
              return `
                <tr>
                  <td><strong>${p.name}</strong></td>
                  <td>${p.phone || '-'}</td>
                  <td style="color: #dc2626;">${pDebts.toLocaleString()}</td>
                  <td style="color: #16a34a;">${pPaid.toLocaleString()}</td>
                  <td style="font-weight: bold; color: ${pRem > 0 ? '#b91c1c' : '#15803d'}">${pRem.toLocaleString()}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    exportPrintablePDF('التقرير المالي العام - نظام OsiFarma', htmlContent);
  };

  // Recent activity combination
  const recentActivities = [
    ...filteredTransactions.map((tr) => {
      const person = people.find((p) => p.id === tr.personId);
      return {
        id: tr.id,
        title: person ? person.name : 'حساب شخصي',
        subtitle: tr.description || (tr.type === 'debt' ? t.debtType : t.paymentType),
        amount: tr.amount,
        currency: tr.currency || 'IQD',
        type: tr.type,
        date: tr.date,
        personId: tr.personId,
      };
    }),
    ...filteredExpenses.map((ex) => ({
      id: ex.id,
      title: ex.personName,
      subtitle: ex.reason,
      amount: ex.amount,
      currency: ex.currency || 'IQD',
      type: 'expense',
      date: ex.date,
      personId: undefined,
    })),
    ...filteredIncome.map((inc) => ({
      id: inc.id,
      title: inc.sourcePerson || t.income,
      subtitle: inc.reason,
      amount: inc.amount,
      currency: inc.currency || 'IQD',
      type: 'income',
      date: inc.date,
      personId: undefined,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Overdue Alert Banner */}
      {overdueTransactions.length > 0 && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-900/80 text-rose-600 dark:text-rose-300">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900 dark:text-rose-200">
                {t.overdueAlerts} ({overdueTransactions.length})
              </h4>
              <p className="text-xs text-rose-700 dark:text-rose-300/80 mt-0.5">
                {t.overdueNotice}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateTab('reminders')}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs"
          >
            عرض التنبيهات ومتابعتها
          </button>
        </div>
      )}

      {/* Multi-Currency Overview Bar (When ALL is active or for general stats) */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/80">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-bold">ملخص العملات المتعددة (Multi-Currency Summary)</span>
          </div>
          <span className="text-[11px] text-slate-400">
            {activeCurrency === 'ALL' ? 'عرض شامل لكافة العملات' : `عرض مصفى لعملة (${CURRENCIES[activeCurrency].nameAr})`}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          {currenciesList.map((c) => {
            const conf = CURRENCIES[c];
            const data = currencyTotals[c];
            const isCurrActive = activeCurrency === 'ALL' || activeCurrency === c;

            return (
              <div
                key={c}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrActive
                    ? 'bg-slate-800/80 border-slate-700'
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <span>{conf.flag}</span>
                    <span>{conf.nameAr}</span>
                    <span className="text-[10px] text-slate-400">({conf.symbol})</span>
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-700/80 text-emerald-300 font-mono font-bold">
                    {c}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">الدخل:</span>
                    <span className="font-bold text-emerald-400">
                      {data.inc.toLocaleString()} {conf.symbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">المصروفات:</span>
                    <span className="font-bold text-amber-400">
                      {data.exp.toLocaleString()} {conf.symbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">الديون:</span>
                    <span className="font-bold text-rose-400">
                      {data.debts.toLocaleString()} {conf.symbol}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">المتبقي:</span>
                    <span className="font-bold text-blue-400">
                      {data.remaining.toLocaleString()} {conf.symbol}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {t.dashboard}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {activeCurrency === 'ALL'
              ? 'مؤشرات الأداء المالي لكافة الحسابات والعملات'
              : `المؤشرات المالية لعملة (${CURRENCIES[activeCurrency].nameAr} - ${CURRENCIES[activeCurrency].symbol})`}
          </p>
        </div>

        {/* Quick Action Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportAllExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>
          <button
            onClick={handleExportAllPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>{t.exportPDF}</span>
          </button>
        </div>
      </div>

      {/* 4 Core Required KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. إجمالي الدخل (Total Income) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-emerald-300 dark:hover:border-emerald-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.totalIncome}
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
              {totalIncome.toLocaleString()}
            </span>
            {activeSymbol && (
              <span className="text-xs text-slate-400 dark:text-slate-500 mx-1">
                {activeSymbol}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {filteredIncome.length} عمليات دخل
            </span>
            <button
              onClick={() => onNavigateTab('income')}
              className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
            >
              عرض التفاصيل &larr;
            </button>
          </div>
        </div>

        {/* 2. إجمالي المصروفات (Total Expenses) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-amber-300 dark:hover:border-amber-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.totalExpenses}
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">
              {totalExpenses.toLocaleString()}
            </span>
            {activeSymbol && (
              <span className="text-xs text-slate-400 dark:text-slate-500 mx-1">
                {activeSymbol}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              {filteredExpenses.length} مصروفات مسجلة
            </span>
            <button
              onClick={() => onNavigateTab('expenses')}
              className="text-amber-600 dark:text-amber-400 hover:underline font-medium"
            >
              عرض التفاصيل &larr;
            </button>
          </div>
        </div>

        {/* 3. إجمالي الديون (Total Debts) */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-rose-300 dark:hover:border-rose-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {t.totalDebts}
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-rose-600 dark:text-rose-400">
              {totalDebts.toLocaleString()}
            </span>
            {activeSymbol && (
              <span className="text-xs text-slate-400 dark:text-slate-500 mx-1">
                {activeSymbol}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 dark:text-slate-400">
              المدفوع: {totalPaid.toLocaleString()} {activeSymbol}
            </span>
            <button
              onClick={() => onNavigateTab('people')}
              className="text-rose-600 dark:text-rose-400 hover:underline font-medium"
            >
              الأشخاص &larr;
            </button>
          </div>
        </div>

        {/* 4. إجمالي المتبقي (Total Remaining) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-slate-900 border border-indigo-200 dark:border-indigo-900/60 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-900 dark:text-indigo-300">
              {t.totalRemaining}
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold text-indigo-700 dark:text-indigo-300">
              {totalRemaining.toLocaleString()}
            </span>
            {activeSymbol && (
              <span className="text-xs text-indigo-400 dark:text-indigo-500 mx-1">
                {activeSymbol}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between text-xs">
            <span className="text-indigo-700 dark:text-indigo-300 font-medium">
              مستحقات واجبة التحصيل
            </span>
            <span className="text-xs font-bold text-indigo-800 dark:text-indigo-200">
              {people.length} حسابات
            </span>
          </div>
        </div>
      </div>

      {/* Quick Operations Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-200">
          <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>{t.quickActions}:</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onOpenAddPerson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700 transition-colors shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t.addPerson}</span>
          </button>
          <button
            onClick={onOpenAddExpense}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t.addExpense}</span>
          </button>
          <button
            onClick={onOpenAddIncome}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{t.addIncome}</span>
          </button>
        </div>
      </div>

      {/* Financial Health Summary & Recent Operations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Accounts Summary Column */}
        <div className="lg:col-span-1 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>حسابات الأشخاص ({people.length})</span>
              </h3>
              <button
                onClick={() => onNavigateTab('people')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline"
              >
                عرض الكل
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {people.slice(0, 5).map((person) => {
                const pTrans = filteredTransactions.filter((t) => t.personId === person.id);
                const pDebts = pTrans
                  .filter((t) => t.type === 'debt')
                  .reduce((s, t) => s + t.amount, 0);
                const pPaid = pTrans
                  .filter((t) => t.type === 'payment')
                  .reduce((s, t) => s + t.amount, 0);
                const rem = Math.max(0, pDebts - pPaid);

                return (
                  <div
                    key={person.id}
                    onClick={() => onSelectPerson(person.id)}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        {person.name}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {person.phone || 'بدون هاتف'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xs font-extrabold ${
                          rem > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {rem > 0 ? `${rem.toLocaleString()} ${activeSymbol}` : t.statusSettled}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {rem > 0 ? 'متبقي عليه' : 'خالص'}
                      </div>
                    </div>
                  </div>
                );
              })}

              {people.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400">
                  {t.noPeopleFound}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>نسبة التحصيل:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {totalDebts > 0 ? `${Math.round((totalPaid / totalDebts) * 100)}%` : '100%'}
            </span>
          </div>
        </div>

        {/* Recent Activity Stream */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>آخر العمليات والحركات المسجلة</span>
            </h3>
            <span className="text-xs text-slate-400">محدث تلقائياً</span>
          </div>

          <div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivities.map((act) => {
              const isDebt = act.type === 'debt';
              const isExpense = act.type === 'expense';
              const currConf = CURRENCIES[act.currency as CurrencyCode] || CURRENCIES.IQD;

              return (
                <div
                  key={act.id}
                  onClick={() => act.personId && onSelectPerson(act.personId)}
                  className={`py-3 flex items-center justify-between gap-3 ${
                    act.personId ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        isDebt
                          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                          : act.type === 'payment'
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : isExpense
                          ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400'
                          : 'bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400'
                      }`}
                    >
                      {isDebt ? (
                        <ArrowDownLeft className="w-4 h-4" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                        <span>{act.title}</span>
                        <span className="text-[10px] px-1 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-mono">
                          {act.currency}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {act.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`text-xs font-extrabold ${
                        isDebt
                          ? 'text-rose-600 dark:text-rose-400'
                          : act.type === 'payment'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : isExpense
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-teal-600 dark:text-teal-400'
                      }`}
                    >
                      {isDebt ? '-' : '+'}
                      {act.amount.toLocaleString()} {currConf.symbol}
                    </div>
                    <div className="text-[10px] text-slate-400">{act.date}</div>
                  </div>
                </div>
              );
            })}

            {recentActivities.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-400">
                لا توجد عمليات مسجلة حتى الآن
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
