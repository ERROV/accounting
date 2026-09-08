import React, { useState, useEffect } from 'react';
import { X, Check, TrendingDown, AlertCircle } from 'lucide-react';
import { Expense, Language, CurrencyCode, CURRENCIES } from '../types';
import { getTranslation } from '../i18n/translations';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCurrency?: CurrencyCode;
  expenseToEdit?: Expense | null;
  onSave: (data: Partial<Expense>) => Promise<void>;
  language: Language;
}

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultCurrency = 'IQD',
  expenseToEdit,
  onSave,
  language,
}) => {
  const t = getTranslation(language);
  const [personName, setPersonName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('عام');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (expenseToEdit) {
      setPersonName(expenseToEdit.personName);
      setCurrency(expenseToEdit.currency || 'IQD');
      setAmount(expenseToEdit.amount.toString());
      setReason(expenseToEdit.reason);
      setDate(expenseToEdit.date);
      setCategory(expenseToEdit.category || 'عام');
    } else {
      setPersonName('');
      setCurrency(defaultCurrency);
      setAmount('');
      setReason('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('عام');
    }
    setError(null);
  }, [isOpen, expenseToEdit, defaultCurrency]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!personName.trim()) {
      setError('يرجى إدخال اسم الشخص أو المستلم');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }
    if (!reason.trim()) {
      setError('يرجى إدخال سبب المصروف');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        personName: personName.trim(),
        currency,
        amount: numAmount,
        reason: reason.trim(),
        date,
        category: category.trim() || 'عام',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء حفظ المصروف');
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
            <TrendingDown className="w-5 h-5 text-amber-600" />
            <span>{expenseToEdit ? 'تعديل المصروف' : t.addExpense}</span>
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
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500'
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

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.expenseRecipient} *
            </label>
            <input
              type="text"
              required
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
              placeholder="مثال: عقارات المنصور، شركة الشحن، أبو أحمد..."
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

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
              className="w-full px-3.5 py-2 rounded-xl text-base font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t.expenseReason} *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: إيجار المحل، شراء بضاعة، أجور صيانة..."
              className="w-full px-3 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.date} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t.expenseCategory}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              >
                <option value="عام">عام</option>
                <option value="إيجار وفواتير">إيجار وفواتير</option>
                <option value="مشتريات">مشتريات</option>
                <option value="شحن ونقل">شحن ونقل</option>
                <option value="رواتب ومستحقات">رواتب ومستحقات</option>
                <option value="تشغيل">تشغيل</option>
                <option value="صيانة">صيانة</option>
                <option value="أخرى">أخرى</option>
              </select>
            </div>
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
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white transition-colors shadow-xs disabled:opacity-50"
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
