import React, { useState, useMemo } from 'react';
import {
  UserPlus,
  Search,
  Phone,
  Calendar,
  FileText,
  Plus,
  Minus,
  Eye,
  Trash2,
  Edit2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { Person, Transaction, Language, CurrencyCode, CURRENCIES, formatAmount } from '../types';
import { getTranslation } from '../i18n/translations';

interface PeopleManagerProps {
  people: Person[];
  transactions: Transaction[];
  language: Language;
  activeCurrency: CurrencyCode | 'ALL';
  onAddPerson: () => void;
  onEditPerson: (person: Person) => void;
  onDeletePerson: (id: string) => void;
  onOpenAddDebt: (person: Person) => void;
  onOpenAddPayment: (person: Person) => void;
  onSelectPerson: (personId: string) => void;
}

export const PeopleManager: React.FC<PeopleManagerProps> = ({
  people,
  transactions,
  language,
  activeCurrency,
  onAddPerson,
  onEditPerson,
  onDeletePerson,
  onOpenAddDebt,
  onOpenAddPayment,
  onSelectPerson,
}) => {
  const t = getTranslation(language);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'has_debt' | 'settled' | 'overdue'>('all');

  const today = new Date().toISOString().split('T')[0];
  const currenciesList: CurrencyCode[] = ['IQD', 'USD', 'TRY'];

  // Compute calculated values for each person
  const peopleWithStats = useMemo(() => {
    return people.map((person) => {
      const allPTrans = transactions.filter((tr) => tr.personId === person.id);
      
      // Filter transactions by currency if activeCurrency !== 'ALL'
      const pTrans = activeCurrency === 'ALL'
        ? allPTrans
        : allPTrans.filter((tr) => (tr.currency || 'IQD') === activeCurrency);

      // Per-currency breakdown
      const balancesByCurrency = currenciesList.reduce((acc, curr) => {
        const cTrans = allPTrans.filter((tr) => (tr.currency || 'IQD') === curr);
        const debt = cTrans.filter((tr) => tr.type === 'debt').reduce((s, tr) => s + tr.amount, 0);
        const paid = cTrans.filter((tr) => tr.type === 'payment').reduce((s, tr) => s + tr.amount, 0);
        const rem = Math.max(0, debt - paid);
        if (debt > 0 || paid > 0) {
          acc[curr] = { debt, paid, rem };
        }
        return acc;
      }, {} as Record<CurrencyCode, { debt: number; paid: number; rem: number }>);

      const totalDebt = pTrans
        .filter((tr) => tr.type === 'debt')
        .reduce((sum, tr) => sum + tr.amount, 0);
      const totalPaid = pTrans
        .filter((tr) => tr.type === 'payment')
        .reduce((sum, tr) => sum + tr.amount, 0);
      const remaining = Math.max(0, totalDebt - totalPaid);

      // Overdue check
      const hasOverdue = pTrans.some(
        (tr) => tr.type === 'debt' && tr.dueDate && tr.dueDate < today && tr.status !== 'completed' && remaining > 0
      );

      const status: 'settled' | 'has_debt' | 'overdue' = hasOverdue
        ? 'overdue'
        : remaining === 0
        ? 'settled'
        : 'has_debt';

      return {
        ...person,
        totalDebt,
        totalPaid,
        remaining,
        status,
        balancesByCurrency,
        usedCurrencies: Object.keys(balancesByCurrency) as CurrencyCode[],
        transCount: pTrans.length,
      };
    });
  }, [people, transactions, today, activeCurrency]);

  // Filter & Search
  const filteredPeople = useMemo(() => {
    return peopleWithStats.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.phone && p.phone.includes(searchTerm)) ||
        (p.notes && p.notes.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (filterStatus === 'has_debt') return p.status === 'has_debt';
      if (filterStatus === 'settled') return p.status === 'settled';
      if (filterStatus === 'overdue') return p.status === 'overdue';
      return true;
    });
  }, [peopleWithStats, searchTerm, filterStatus]);

  const activeSymbol = activeCurrency === 'ALL' ? '' : CURRENCIES[activeCurrency].symbol;

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {t.accountsAndDebts}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            إدارة حسابات الأشخاص والعملاء، تسجيل الديون والدفعات وحساب المتبقي تلقائياً
          </p>
        </div>

        <button
          onClick={onAddPerson}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition-all shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>{t.addPerson}</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Search input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={t.searchPersonPlaceholder}
            className="w-full pl-3 pr-10 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'all'
                ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {t.all} ({peopleWithStats.length})
          </button>
          <button
            onClick={() => setFilterStatus('has_debt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'has_debt'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {t.statusHasDebt} ({peopleWithStats.filter((p) => p.status === 'has_debt').length})
          </button>
          <button
            onClick={() => setFilterStatus('overdue')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'overdue'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {t.statusOverdue} ({peopleWithStats.filter((p) => p.status === 'overdue').length})
          </button>
          <button
            onClick={() => setFilterStatus('settled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
              filterStatus === 'settled'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            {t.statusSettled} ({peopleWithStats.filter((p) => p.status === 'settled').length})
          </button>
        </div>
      </div>

      {/* People Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPeople.map((person) => {
          return (
            <div
              key={person.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                {/* Person Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      {person.name}
                    </h3>
                    {person.phone && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span dir="ltr">{person.phone}</span>
                      </div>
                    )}
                  </div>

                  {/* Currencies Badges */}
                  <div className="flex items-center gap-1">
                    {person.usedCurrencies.map((c) => (
                      <span
                        key={c}
                        title={CURRENCIES[c].nameAr}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                      >
                        {CURRENCIES[c].flag} {CURRENCIES[c].symbol}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes if any */}
                {person.notes && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-1 bg-slate-50 dark:bg-slate-800/40 px-2 py-1 rounded-md">
                    {person.notes}
                  </p>
                )}

                {/* Financial Summary Box */}
                <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2">
                  {/* If ALL is active, show per-currency balances if multiple */}
                  {activeCurrency === 'ALL' && person.usedCurrencies.length > 0 ? (
                    <div className="space-y-1.5">
                      {person.usedCurrencies.map((c) => {
                        const b = person.balancesByCurrency[c];
                        const conf = CURRENCIES[c];
                        return (
                          <div key={c} className="flex items-center justify-between text-xs pb-1 border-b border-slate-200/60 dark:border-slate-700/40 last:border-0 last:pb-0">
                            <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <span>{conf.flag}</span>
                              <span>{conf.symbol}</span>
                            </span>
                            <div className="text-right">
                              <span className="text-[11px] text-slate-400 ml-1">متبقي:</span>
                              <span
                                className={`font-extrabold ${
                                  b.rem > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600'
                                }`}
                              >
                                {b.rem.toLocaleString()} {conf.symbol}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{t.totalDebtAmount}:</span>
                        <span className="font-bold text-rose-600 dark:text-rose-400">
                          {person.totalDebt.toLocaleString()} {activeSymbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 dark:text-slate-400">{t.paidAmount}:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {person.totalPaid.toLocaleString()} {activeSymbol}
                        </span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {t.remainingAmount}:
                        </span>
                        <span
                          className={`text-sm font-extrabold ${
                            person.remaining > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {person.remaining.toLocaleString()} {activeSymbol}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onOpenAddDebt(person)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:hover:bg-rose-900/80 dark:text-rose-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>تسجيل دين</span>
                  </button>
                  <button
                    onClick={() => onOpenAddPayment(person)}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/80 dark:text-emerald-300 transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>تسجيل دفعة</span>
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => onSelectPerson(person.id)}
                    className="flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-emerald-400 hover:underline"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t.viewStatement} ({person.transCount})</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditPerson(person)}
                      title={t.editPerson}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeletePerson(person.id)}
                      title={t.deletePerson}
                      className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {filteredPeople.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800">
            <UserPlus className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              {t.noPeopleFound}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              قم بإضافة شخص جديد لبدء تسجيل الديون والدفعات وحساب المتبقي تلقائياً
            </p>
            <button
              onClick={onAddPerson}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
            >
              {t.addPerson}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
