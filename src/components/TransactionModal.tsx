import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Coins, AlertCircle } from 'lucide-react';
import { Person, Transaction, TransactionType, Language, CurrencyCode, CURRENCIES } from '../types';
import { getTranslation } from '../i18n/translations';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  people: Person[];
  selectedPerson?: Person | null;
  defaultType?: TransactionType;
  defaultCurrency?: CurrencyCode;
  transactionToEdit?: Transaction | null;
  onSave: (data: Partial<Transaction>) => Promise<void>;
  language: Language;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  people,
  selectedPerson,
  defaultType = 'debt',
  defaultCurrency = 'IQD',
  transactionToEdit,
  onSave,
  language,
}) => {
  const t = getTranslation(language);
  const [personId, setPersonId] = useState<string>('');
  const [type, setType] = useState<TransactionType>(defaultType);
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (transactionToEdit) {
      setPersonId(transactionToEdit.personId);
      setType(transactionToEdit.type);
      setCurrency(transactionToEdit.currency || 'IQD');
      setAmount(transactionToEdit.amount.toString());
      setDescription(transactionToEdit.description || '');
      setDate(transactionToEdit.date || new Date().toISOString().split('T')[0]);
      setDueDate(transactionToEdit.dueDate || '');
    } else {
      if (selectedPerson) {
        setPersonId(selectedPerson.id);
      } else if (people.length > 0) {
        setPersonId(people[0].id);
      }
      setType(defaultType);
      setCurrency(defaultCurrency);
      setAmount('');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
    }
    setError(null);
  }, [isOpen, selectedPerson, defaultType, defaultCurrency, transactionToEdit, people]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!personId) {
      setError('يرجى اختيار الشخص');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        personId,
        type,
        currency,
        amount: numAmount,
        description: description.trim(),
        date,
        dueDate: type === 'debt' && dueDate ? dueDate : null,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ العملية');
    } finally {
      setLoading(false);
    }
  };

  const currConfig = CURRENCIES[currency];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-5 sm:p-6 animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coins className="w-5 h-5 text-emerald-600" />
            <span>
              {transactionToEdit
                ? t.editOperation
                : type === 'debt'
                ? t.recordDebt
                : t.recordPayment}
            </span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Transaction Type Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType('debt')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'debt'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              {t.debtType}
            </button>
            <button
              type="button"
              onClick={() => setType('payment')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'payment'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              {t.paymentType}
            </button>
          </div>

          {/* Currency Selector (IQD, USD, TRY) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              العملة *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['IQD', 'USD', 'TRY'] as CurrencyCode[]).map((c) => {
                const conf = CURRENCIES[c];
                const isSelected = currency === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{conf.flag}</span>
                    <span>{conf.symbol}</span>
                    <span className="text-[10px] text-slate-400">({c})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Person Select */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.personName} *
            </label>
            <select
              value={personId}
              onChange={(e) => setPersonId(e.target.value)}
              disabled={!!selectedPerson && !transactionToEdit}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.phone ? `(${p.phone})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.amount} ({currConfig.symbol} - {currConfig.nameAr}) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2 rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Reason / Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.reasonOrDescription}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'debt' ? 'مثال: توريد بضاعة، فاتورة رقم...' : 'مثال: حوالة مصرفية، كاش، زين كاش...'}
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Dates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.date} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {type === 'debt' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t.dueDate} (للتنبيهات)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-white transition-colors shadow-xs disabled:opacity-50 ${
                type === 'debt'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{loading ? t.loading : t.save}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
