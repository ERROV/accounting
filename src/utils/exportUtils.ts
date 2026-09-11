import * as XLSX from 'xlsx';
import { Person, Transaction, Expense, Income } from '../types';

export function exportToExcel(
  filename: string,
  sheets: { name: string; data: any[] }[]
) {
  const wb = XLSX.utils.book_new();

  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.data);
    // RTL sheet view if supported
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'].push({ RTL: true });
    XLSX.utils.book_append_sheet(wb, ws, s.name.substring(0, 31));
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPersonStatementToExcel(
  person: Person,
  transactions: Transaction[],
  summary: { totalDebt: number; totalPaid: number; remaining: number }
) {
  const data = transactions.map((t, idx) => ({
    '#': idx + 1,
    'التاريخ': t.date,
    'النوع': t.type === 'debt' ? 'دين عليه' : 'دفعة مسددة',
    'المبلغ': t.amount,
    'البيان والسبب': t.description || '-',
    'تاريخ الاستحقاق': t.dueDate || '-',
    'الحالة': t.status === 'completed' ? 'مسدد' : (t.status === 'overdue' ? 'متأخر' : 'معلق'),
  }));

  const summaryData = [
    { 'البيان': 'اسم الشخص', 'القيمة': person.name },
    { 'البيان': 'رقم الهاتف', 'القيمة': person.phone || '-' },
    { 'البيان': 'إجمالي الديون المسجلة', 'القيمة': summary.totalDebt },
    { 'البيان': 'إجمالي المبالغ المسددة', 'القيمة': summary.totalPaid },
    { 'البيان': 'المبلغ المتبقي', 'القيمة': summary.remaining },
  ];

  exportToExcel(`كشف_حساب_${person.name.replace(/\s+/g, '_')}`, [
    { name: 'ملخص الحساب', data: summaryData },
    { name: 'سجل العمليات', data: data },
  ]);
}

export function exportAllDataToExcel(
  people: Person[],
  transactions: Transaction[],
  expenses: Expense[],
  income: Income[],
  stats: { totalIncome: number; totalExpenses: number; totalDebts: number; totalRemaining: number }
) {
  const summaryData = [
    { 'المؤشر': 'إجمالي الدخل', 'المبلغ': stats.totalIncome },
    { 'المؤشر': 'إجمالي المصروفات', 'المبلغ': stats.totalExpenses },
    { 'المؤشر': 'إجمالي الديون المسجلة', 'المبلغ': stats.totalDebts },
    { 'المؤشر': 'إجمالي المتبقي (المستحقات)', 'المبلغ': stats.totalRemaining },
  ];

  const peopleData = people.map((p) => {
    const pTrans = transactions.filter((t) => t.personId === p.id);
    const debts = pTrans.filter((t) => t.type === 'debt').reduce((s, t) => s + t.amount, 0);
    const paid = pTrans.filter((t) => t.type === 'payment').reduce((s, t) => s + t.amount, 0);
    return {
      'كود الحساب': p.id,
      'الاسم': p.name,
      'الهاتف': p.phone || '-',
      'إجمالي الديون': debts,
      'إجمالي المدفوع': paid,
      'المتبقي': debts - paid,
      'ملاحظات': p.notes || '-',
    };
  });

  const expensesData = expenses.map((e, idx) => ({
    '#': idx + 1,
    'التاريخ': e.date,
    'المستلم / اسم الشخص': e.personName,
    'المبلغ': e.amount,
    'السبب / البيان': e.reason,
    'التصنيف': e.category,
  }));

  const incomeData = income.map((inc, idx) => ({
    '#': idx + 1,
    'التاريخ': inc.date,
    'المصدر / اسم الشخص': inc.sourcePerson || '-',
    'المبلغ': inc.amount,
    'السبب / البيان': inc.reason,
    'التصنيف': inc.category,
  }));

  exportToExcel(`تقرير_مالي_شامل_${new Date().toISOString().split('T')[0]}`, [
    { name: 'الملخص العام', data: summaryData },
    { name: 'حسابات الأشخاص', data: peopleData },
    { name: 'المصروفات', data: expensesData },
    { name: 'الدخل', data: incomeData },
  ]);
}

/**
 * Generates an elegant print-ready document formatted with clean typography,
 * high-contrast tables, headers and metadata, allowing direct printing or "Save as PDF".
 */
export function exportPrintablePDF(title: string, htmlContent: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('يرجى السماح بفتح النوافذ المنبثقة لطباعة التقرير / Please allow popups to print report');
    return;
  }

  const currentDate = new Date().toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8" />
      <title>${title}</title>
      <link rel="icon" type="image/png" href="/logo.png" />
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Tajawal', sans-serif; }
        body { padding: 30px; color: #1e293b; background: #ffffff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
        .logo-box { display: flex; align-items: center; gap: 14px; }
        .logo-img { height: 42px; width: auto; object-fit: contain; }
        .title { font-size: 22px; font-weight: 800; color: #0f172a; }
        .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
        .date { font-size: 13px; color: #475569; font-weight: 600; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; margin-bottom: 24px; font-size: 13px; }
        th { background: #f1f5f9; color: #0f172a; padding: 10px 12px; text-align: right; border-bottom: 2px solid #cbd5e1; font-weight: 700; }
        td { padding: 9px 12px; border-bottom: 1px solid #e2e8f0; }
        tr:nth-child(even) { background: #fafafa; }
        .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-debt { background: #fee2e2; color: #991b1b; }
        .badge-payment { background: #dcfce7; color: #166534; }
        .cards-row { display: flex; gap: 16px; margin-bottom: 24px; }
        .card { flex: 1; padding: 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; }
        .card-label { font-size: 12px; color: #64748b; margin-bottom: 4px; }
        .card-val { font-size: 18px; font-weight: 800; color: #0f172a; }
        .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #94a3b8; }
        @media print {
          body { padding: 10mm; }
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo-box">
          <img src="/logo.png" alt="OsiFarma" class="logo-img" />
          <div>
            <div class="title">${title}</div>
            <div class="subtitle">تقرير مالي موثق من نظام OsiFarma لإدارة الحسابات</div>
          </div>
        </div>
        <div class="date">تاريخ التقرير: ${currentDate}</div>
      </div>

      ${htmlContent}

      <div class="footer">
        تم استخراج هذا التقرير تلقائياً من نظام OsiFarma المالي &copy; ${new Date().getFullYear()}
      </div>

      <script>
        window.onload = function() {
          window.print();
        }
      </script>
    </body>
    </html>
  `);
  printWindow.document.close();
}
