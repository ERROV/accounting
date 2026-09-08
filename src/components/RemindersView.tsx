import React from 'react';
import {
  Bell,
  AlertTriangle,
  Calendar,
  Clock,
  Phone,
  MessageSquare,
  CheckCircle2,
  Plus,
  Coins,
  Send,
} from 'lucide-react';
import { Person, Transaction, Language, CurrencyCode, CURRENCIES } from '../types';
import { getTranslation } from '../i18n/translations';

interface RemindersViewProps {
  people: Person[];
  transactions: Transaction[];
  language: Language;
  activeCurrency: CurrencyCode | 'ALL';
  onOpenAddPayment: (person: Person) => void;
  onSelectPerson: (personId: string) => void;
}

export const RemindersView: React.FC<RemindersViewProps> = ({
  people,
  transactions,
  language,
  activeCurrency,
  onOpenAddPayment,
  onSelectPerson,
}) => {
  const t = getTranslation(language);
  const today = new Date().toISOString().split('T')[0];

  // Filter transactions for currency if active
  const filteredTransactions = activeCurrency === 'ALL'
    ? transactions
    : transactions.filter((tr) => (tr.currency || 'IQD') === activeCurrency);

  // Calculate overdue debts
  const overdueList = filteredTransactions
    .filter((tr) => {
      if (tr.type !== 'debt') return false;
      if (!tr.dueDate) return false;
      return tr.dueDate < today && tr.status !== 'completed';
    })
    .map((tr) => {
      const person = people.find((p) => p.id === tr.personId);
      // Calculate person remaining for this specific transaction's currency
      const trCurrency = tr.currency || 'IQD';
      const pTrans = transactions.filter((t) => t.personId === tr.personId && (t.currency || 'IQD') === trCurrency);
      const pDebts = pTrans.filter((t) => t.type === 'debt').reduce((s, t) => s + t.amount, 0);
      const pPaid = pTrans.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
      const remaining = Math.max(0, pDebts - pPaid);

      const daysOverdue = Math.max(
        1,
        Math.floor(
          (new Date(today).getTime() - new Date(tr.dueDate!).getTime()) / (1000 * 60 * 60 * 24)
        )
      );

      return {
        transaction: tr,
        person,
        remaining,
        daysOverdue,
        currencyConf: CURRENCIES[trCurrency],
      };
    })
    .filter((item) => item.person && item.remaining > 0)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const handleSendWhatsApp = (person: Person, tr: Transaction, days: number) => {
    if (!person.phone) {
      alert('رقم هاتف هذا الشخص غير مسجل!');
      return;
    }

    const conf = CURRENCIES[tr.currency || 'IQD'];
    const cleanPhone = person.phone.replace(/[^0-9]/g, '');
    const message = encodeURIComponent(
      `السلام عليكم ورحمة الله أخي ${person.name}،\nنود تذكيركم بلطف بمبلغ مستحق قدره ${tr.amount.toLocaleString()} ${conf.symbol} (${conf.nameAr}) بخصوص: ${tr.description || 'مستحقات'}.\nتاريخ الاستحقاق: ${tr.dueDate} (متأخر منذ ${days} يوم).\nنظام DF المالي.`
    );

    window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Bell className="w-6 h-6 text-rose-600 dark:text-rose-400" />
          <span>{t.overdueAlerts}</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          متابعة المبالغ والديون المتأخرة عن موعد سدادها وإرسال تذكيرات دورية عبر واتساب
        </p>
      </div>

      {/* KPI Overdue Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">حالات التأخير النشطة</span>
          <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
            {overdueList.length} ديون متأخرة
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">العملات المعنية بالتأخير</span>
          <div className="flex items-center gap-2 mt-2">
            {(['IQD', 'USD', 'TRY'] as CurrencyCode[]).map((c) => {
              const count = overdueList.filter((item) => (item.transaction.currency || 'IQD') === c).length;
              if (count === 0) return null;
              const conf = CURRENCIES[c];
              return (
                <span
                  key={c}
                  className="px-2 py-1 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
                >
                  {conf.flag} {count} في {conf.nameAr}
                </span>
              );
            })}
            {overdueList.length === 0 && <span className="text-xs text-slate-400">لا يوجد</span>}
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-xs text-slate-500 dark:text-slate-400">أعلى مدة تأخير</span>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 mt-1">
            {overdueList.length > 0 ? `${overdueList[0].daysOverdue} يوم` : '0 يوم'}
          </div>
        </div>
      </div>

      {/* Overdue Items List */}
      <div className="space-y-3">
        {overdueList.map(({ transaction, person, remaining, daysOverdue, currencyConf }) => {
          if (!person) return null;
          return (
            <div
              key={transaction.id}
              className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              {/* Left Details */}
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mt-1">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onSelectPerson(person.id)}
                      className="text-base font-bold text-slate-900 dark:text-white hover:underline text-right"
                    >
                      {person.name}
                    </button>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200">
                      متأخر {daysOverdue} يوم
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {currencyConf.flag} {currencyConf.symbol}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {person.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span dir="ltr">{person.phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>تاريخ الاستحقاق: {transaction.dueDate}</span>
                    </div>
                  </div>

                  {transaction.description && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/40 px-2.5 py-1 rounded-md">
                      بيان الدين: {transaction.description}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Amounts & Actions */}
              <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-between md:justify-end pt-3 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="text-right">
                  <div className="text-xs text-slate-400">مبلغ الدين</div>
                  <div className="text-base font-extrabold text-rose-600 dark:text-rose-400">
                    {transaction.amount.toLocaleString()} {currencyConf.symbol}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    إجمالي متبقي الشخص: {remaining.toLocaleString()} {currencyConf.symbol}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSendWhatsApp(person, transaction, daysOverdue)}
                    title={t.sendReminderMsg}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>واتساب</span>
                  </button>

                  <button
                    onClick={() => onOpenAddPayment(person)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white transition-colors shadow-2xs"
                  >
                    <Coins className="w-3.5 h-3.5" />
                    <span>تسجيل دفعة</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {overdueList.length === 0 && (
          <div className="py-16 text-center bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {t.noOverdue}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              جميع الديون مسددة أو لم يحن موعد استحقاقها بعد. يمكنك تعيين تواريخ استحقاق لأي دين جديد ليتم تنبيهك دورياً عند حلول موعدها.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
