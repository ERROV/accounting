import React, { useState } from 'react';
import {
  X,
  Plus,
  Minus,
  FileSpreadsheet,
  Printer,
  Calendar,
  Phone,
  Clock,
  Edit2,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { Person, Transaction, Language, CurrencyCode, CURRENCIES, formatAmount } from '../types';
import { getTranslation } from '../i18n/translations';
import { exportPersonStatementToExcel, exportPrintablePDF } from '../utils/exportUtils';

interface PersonDetailModalProps {
  person: Person;
  transactions: Transaction[];
  language: Language;
  onClose: () => void;
  onOpenAddDebt: (person: Person) => void;
  onOpenAddPayment: (person: Person) => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
}

export const PersonDetailModal: React.FC<PersonDetailModalProps> = ({
  person,
  transactions,
  language,
  onClose,
  onOpenAddDebt,
  onOpenAddPayment,
  onEditTransaction,
  onDeleteTransaction,
}) => {
  const t = getTranslation(language);
  const today = new Date().toISOString().split('T')[0];
  const currenciesList: CurrencyCode[] = ['IQD', 'USD', 'TRY'];

  // Calculate balances per currency
  const balancesByCurrency = currenciesList.reduce((acc, curr) => {
    const curTrans = transactions.filter((t) => (t.currency || 'IQD') === curr);
    const debts = curTrans.filter((t) => t.type === 'debt').reduce((s, t) => s + t.amount, 0);
    const payments = curTrans.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
    const rem = Math.max(0, debts - payments);
    if (debts > 0 || payments > 0) {
      acc[curr] = { debts, payments, remaining: rem, count: curTrans.length };
    }
    return acc;
  }, {} as Record<CurrencyCode, { debts: number; payments: number; remaining: number; count: number }>);

  // If no transactions yet, default IQD row
  const activeCurrenciesInPerson = Object.keys(balancesByCurrency) as CurrencyCode[];

  const handleExportExcel = () => {
    exportPersonStatementToExcel(person, transactions, {
      totalDebt: transactions.filter((t) => t.type === 'debt').reduce((s, t) => s + t.amount, 0),
      totalPaid: transactions.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0),
      remaining: 0,
    });
  };

  const handleExportPDF = () => {
    const htmlContent = `
      <div class="cards-row">
        <div class="card">
          <div class="card-label">اسم الحساب / الشخص</div>
          <div class="card-val">${person.name}</div>
          <div style="font-size: 11px; color: #64748b; margin-top: 4px;">الهاتف: ${person.phone || 'غير مسجل'}</div>
        </div>
      </div>

      <h3 style="margin-top: 16px; font-size: 15px; color: #0f172a;">ملخص الأرصدة حسب العملة</h3>
      <table>
        <thead>
          <tr>
            <th>العملة</th>
            <th>إجمالي الدين</th>
            <th>إجمالي المدفوع</th>
            <th>المتبقي المستحق</th>
          </tr>
        </thead>
        <tbody>
          ${(activeCurrenciesInPerson.length > 0 ? activeCurrenciesInPerson : (['IQD'] as CurrencyCode[]))
            .map((c) => {
              const b = balancesByCurrency[c] || { debts: 0, payments: 0, remaining: 0 };
              const conf = CURRENCIES[c];
              return `
                <tr>
                  <td><strong>${conf.flag} ${conf.nameAr} (${conf.symbol})</strong></td>
                  <td style="color: #dc2626;">${b.debts.toLocaleString()} ${conf.symbol}</td>
                  <td style="color: #16a34a;">${b.payments.toLocaleString()} ${conf.symbol}</td>
                  <td style="font-weight: bold; color: ${b.remaining > 0 ? '#b91c1c' : '#15803d'};">
                    ${b.remaining.toLocaleString()} ${conf.symbol}
                  </td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>

      <h3 style="margin-top: 24px; font-size: 15px; color: #0f172a;">سجل تفصيلي للحركات والعمليات (${transactions.length})</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>التاريخ</th>
            <th>النوع</th>
            <th>العملة</th>
            <th>البيان والتفاصيل</th>
            <th>تاريخ الاستحقاق</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${transactions
            .map((tr, idx) => {
              const conf = CURRENCIES[tr.currency || 'IQD'];
              return `
              <tr>
                <td>${idx + 1}</td>
                <td>${tr.date}</td>
                <td>
                  <span class="badge ${tr.type === 'debt' ? 'badge-debt' : 'badge-payment'}">
                    ${tr.type === 'debt' ? 'دين عليه' : 'دفعة مسددة'}
                  </span>
                </td>
                <td>${conf.flag} ${conf.symbol}</td>
                <td>${tr.description || '-'}</td>
                <td>${tr.dueDate || '-'}</td>
                <td style="font-weight: bold; color: ${tr.type === 'debt' ? '#dc2626' : '#16a34a'};">
                  ${tr.type === 'debt' ? '-' : '+'}${tr.amount.toLocaleString()} ${conf.symbol}
                </td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    exportPrintablePDF(`كشف حساب - ${person.name}`, htmlContent);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {t.viewStatement}: {person.name}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
              {person.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span dir="ltr">{person.phone}</span>
                </div>
              )}
              {person.notes && <div>ملاحظة: {person.notes}</div>}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Balances Summary Cards */}
        <div className="p-4 sm:p-6 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
          <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            ملخص الأرصدة المتبقية المحسوبة تلقائياً:
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(activeCurrenciesInPerson.length > 0 ? activeCurrenciesInPerson : (['IQD'] as CurrencyCode[])).map((c) => {
              const b = balancesByCurrency[c] || { debts: 0, payments: 0, remaining: 0 };
              const conf = CURRENCIES[c];
              return (
                <div
                  key={c}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                      <span>{conf.flag}</span>
                      <span>{conf.nameAr}</span>
                    </span>
                    <span className="text-slate-400 text-[11px]">({conf.symbol})</span>
                  </div>
                  <div className="mt-2 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>إجمالي الدين:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {b.debts.toLocaleString()} {conf.symbol}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                      <span>المدفوع:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {b.payments.toLocaleString()} {conf.symbol}
                      </span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between font-bold">
                      <span className="text-slate-800 dark:text-slate-200">المتبقي:</span>
                      <span
                        className={`text-sm font-extrabold ${
                          b.remaining > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600'
                        }`}
                      >
                        {b.remaining.toLocaleString()} {conf.symbol}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAddDebt(person)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>تسجيل دين</span>
              </button>
              <button
                onClick={() => onOpenAddPayment(person)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
              >
                <Minus className="w-3.5 h-3.5" />
                <span>تسجيل دفعة</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>{t.exportExcel}</span>
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{t.exportPDF}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              سجل العمليات والديون ({transactions.length})
            </h4>
            <span className="text-xs text-slate-400">يمكنك تعديل أو حذف أي حركة</span>
          </div>

          {transactions.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
              <table className="w-full text-xs text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">التاريخ</th>
                    <th className="py-2.5 px-3">النوع</th>
                    <th className="py-2.5 px-3">العملة</th>
                    <th className="py-2.5 px-3">المبلغ</th>
                    <th className="py-2.5 px-3">السبب / التفاصيل</th>
                    <th className="py-2.5 px-3">تاريخ الاستحقاق</th>
                    <th className="py-2.5 px-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {transactions.map((tr) => {
                    const isDebt = tr.type === 'debt';
                    const conf = CURRENCIES[tr.currency || 'IQD'];
                    const isOverdue =
                      isDebt && tr.dueDate && tr.dueDate < today && tr.status !== 'completed';

                    return (
                      <tr
                        key={tr.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                          {tr.date}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              isDebt
                                ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            }`}
                          >
                            {isDebt ? t.debtType : t.paymentType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                            <span>{conf.flag}</span>
                            <span>{tr.currency || 'IQD'}</span>
                          </span>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          <span className={isDebt ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                            {isDebt ? '-' : '+'}
                            {tr.amount.toLocaleString()} {conf.symbol}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate">
                          {tr.description || '-'}
                        </td>
                        <td className="py-3 px-3">
                          {tr.dueDate ? (
                            <span
                              className={`inline-flex items-center gap-1 ${
                                isOverdue
                                  ? 'text-rose-600 dark:text-rose-400 font-bold'
                                  : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              <span>{tr.dueDate}</span>
                              {isOverdue && <span className="text-[10px]">(متأخر)</span>}
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => onEditTransaction(tr)}
                              title={t.edit}
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeleteTransaction(tr.id)}
                              title={t.delete}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-xs">لا توجد عمليات مسجلة لهذا الشخص بعد</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
