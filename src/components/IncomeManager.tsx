import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  FileSpreadsheet,
  Printer,
  Calendar,
  User,
  Trash2,
  Edit2,
  TrendingUp,
} from 'lucide-react';
import { Income, Language, CurrencyCode, CURRENCIES } from '../types';
import { getTranslation } from '../i18n/translations';
import { exportToExcel, exportPrintablePDF } from '../utils/exportUtils';

interface IncomeManagerProps {
  income: Income[];
  language: Language;
  activeCurrency: CurrencyCode | 'ALL';
  onAddIncome: () => void;
  onEditIncome: (income: Income) => void;
  onDeleteIncome: (id: string) => void;
}

export const IncomeManager: React.FC<IncomeManagerProps> = ({
  income,
  language,
  activeCurrency,
  onAddIncome,
  onEditIncome,
  onDeleteIncome,
}) => {
  const t = getTranslation(language);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const currenciesList: CurrencyCode[] = ['IQD', 'USD', 'TRY'];

  const categories = useMemo(() => {
    const set = new Set<string>();
    income.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [income]);

  const filteredIncome = useMemo(() => {
    return income.filter((item) => {
      const matchCurrency = activeCurrency === 'ALL' || (item.currency || 'IQD') === activeCurrency;
      if (!matchCurrency) return false;

      const matchSearch =
        item.sourcePerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;

      return true;
    });
  }, [income, searchTerm, selectedCategory, activeCurrency]);

  const incomeByCurrency = currenciesList.reduce((acc, curr) => {
    const sum = filteredIncome
      .filter((i) => (i.currency || 'IQD') === curr)
      .reduce((s, i) => s + i.amount, 0);
    acc[curr] = sum;
    return acc;
  }, {} as Record<CurrencyCode, number>);

  const handleExportExcel = () => {
    const data = filteredIncome.map((item, idx) => ({
      '#': idx + 1,
      'التاريخ': item.date,
      'المصدر / اسم الشخص': item.sourcePerson || '-',
      'العملة': item.currency || 'IQD',
      'المبلغ': item.amount,
      'السبب / بيان الدخل': item.reason,
      'التصنيف': item.category || 'عام',
    }));

    exportToExcel(`تقرير_الدخل_والمقبوضات_${new Date().toISOString().split('T')[0]}`, [
      { name: 'الدخل والمقبوضات', data },
    ]);
  };

  const handleExportPDF = () => {
    const htmlContent = `
      <div class="cards-row">
        <div class="card">
          <div class="card-label">عدد عمليات الدخل</div>
          <div class="card-val">${filteredIncome.length}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>التاريخ</th>
            <th>المصدر / اسم الشخص</th>
            <th>العملة</th>
            <th>السبب وبيان الدخل</th>
            <th>التصنيف</th>
            <th>المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${filteredIncome
            .map((item, idx) => {
              const conf = CURRENCIES[item.currency || 'IQD'];
              return `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.date}</td>
                <td><strong>${item.sourcePerson || '-'}</strong></td>
                <td>${conf.flag} ${conf.symbol}</td>
                <td>${item.reason}</td>
                <td>${item.category || 'عام'}</td>
                <td style="font-weight: bold; color: #16a34a;">${item.amount.toLocaleString()} ${conf.symbol}</td>
              </tr>
            `;
            })
            .join('')}
        </tbody>
      </table>
    `;

    exportPrintablePDF('تقرير الدخل والمقبوضات المالية - نظام DF', htmlContent);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
            {t.income}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            تسجيل المبالغ الداخلة، المبيعات والتحصيلات (د.ع • $ • ₺)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{t.exportExcel}</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>{t.exportPDF}</span>
          </button>
          <button
            onClick={onAddIncome}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 text-white transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>{t.addIncome}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{t.totalIncome}</div>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              {currenciesList.map((c) => {
                const conf = CURRENCIES[c];
                const sum = incomeByCurrency[c];
                if (activeCurrency !== 'ALL' && activeCurrency !== c) return null;
                return (
                  <span key={c} className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {sum.toLocaleString()} <span className="text-xs text-slate-400">({conf.symbol})</span>
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400">
          إجمالي العمليات: <span className="font-bold text-slate-800 dark:text-white">{filteredIncome.length}</span>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث بمصدر الدخل أو السبب..."
            className="w-full pl-3 pr-10 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'all'
                ? 'bg-teal-600 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {t.all}
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Income Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredIncome.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4">المصدر / المستلم منه</th>
                  <th className="py-3 px-4">العملة</th>
                  <th className="py-3 px-4">المبلغ</th>
                  <th className="py-3 px-4">السبب / البيان</th>
                  <th className="py-3 px-4">التصنيف</th>
                  <th className="py-3 px-4 text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredIncome.map((item) => {
                  const conf = CURRENCIES[item.currency || 'IQD'];
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {item.date}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {item.sourcePerson || '-'}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-300">
                          <span>{conf.flag}</span>
                          <span>{item.currency || 'IQD'}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {item.amount.toLocaleString()} {conf.symbol}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {item.reason}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {item.category || 'عام'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onEditIncome(item)}
                            title={t.edit}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteIncome(item.id)}
                            title={t.delete}
                            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
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
          <div className="py-12 text-center text-slate-400 text-xs">
            {t.noIncomeFound}
          </div>
        )}
      </div>
    </div>
  );
};
