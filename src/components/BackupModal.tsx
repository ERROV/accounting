import React, { useState, useEffect } from 'react';
import {
  X,
  Database,
  HardDriveDownload,
  UploadCloud,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { BackupRecord, Language } from '../types';
import { getTranslation } from '../i18n/translations';
import { api } from '../services/api';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onDataRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  language,
  onDataRestored,
}) => {
  const t = getTranslation(language);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const list = await api.getBackups();
      setBackups(list);
    } catch (e: any) {
      console.error('Failed to fetch backups', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    setLoading(true);
    setActionMessage(null);
    try {
      await api.createBackup('manual');
      setActionMessage('تم إنشاء النسخة الاحتياطية السحابية بنجاح!');
      await loadBackups();
    } catch (e: any) {
      setActionMessage('فشل إنشاء النسخة: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadLocalBackup = async () => {
    try {
      const fullData = await api.getAllData();
      const blob = new Blob([JSON.stringify(fullData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_accounts_db_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert('فشل تحميل النسخة الاحتياطية: ' + e.message);
    }
  };

  const handleRestoreCloudBackup = async (backupId: string) => {
    if (!window.confirm(t.restoreWarning)) return;
    setIsRestoring(true);
    try {
      await api.restoreBackup(backupId);
      setActionMessage('تمت استعادة البيانات بنجاح من السحابة!');
      onDataRestored();
    } catch (e: any) {
      alert('فشل الاستعادة: ' + e.message);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleFileUploadRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(t.restoreWarning)) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setIsRestoring(true);
        await api.restoreBackup(undefined, json);
        setActionMessage('تمت استعادة البيانات بنجاح من الملف المرفوع!');
        onDataRestored();
      } catch (err: any) {
        alert('الملف غير صالح أو حدث خطأ: ' + err.message);
      } finally {
        setIsRestoring(false);
      }
    };
    reader.readAsText(file);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {t.backupDatabase}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                مزامنة سحابية مباشرة على PostgreSQL مع حفظ تلقائي ويدوي
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-1">
          {/* Cloud Auto Backup Notice */}
          <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-emerald-900 dark:text-emerald-200 block mb-0.5">
                {t.autoBackupEnabled}
              </span>
              <p className="text-emerald-700 dark:text-emerald-300/90 leading-relaxed">
                يتم حفظ التغييرات فوراً في قاعدة بيانات PostgreSQL السحابية، بالإضافة إلى إنشاء نقاط استعادة تلقائية دورياً لضمان عدم فقدان أي بيانات والوصول إليها من أي هاتف أو جهاز كمبيوتر.
              </p>
            </div>
          </div>

          {actionMessage && (
            <div className="p-3 rounded-lg bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 text-xs font-semibold text-teal-800 dark:text-teal-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600" />
              <span>{actionMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleCreateBackup}
              disabled={loading}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white transition-colors shadow-xs disabled:opacity-50"
            >
              <UploadCloud className="w-4 h-4" />
              <span>{t.createBackupNow}</span>
            </button>

            <button
              onClick={handleDownloadLocalBackup}
              className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-2xs"
            >
              <Download className="w-4 h-4 text-teal-600" />
              <span>{t.downloadJsonBackup}</span>
            </button>
          </div>

          {/* Restore from File */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              استعادة نسخة احتياطية من جهازك (JSON):
            </label>
            <input
              type="file"
              accept=".json"
              onChange={handleFileUploadRestore}
              disabled={isRestoring}
              className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-200 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-300 cursor-pointer"
            />
          </div>

          {/* List of Cloud Backups */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                سجل النسخ الاحتياطية السحابية المحفوظة
              </h4>
              <button
                onClick={loadBackups}
                className="text-xs text-teal-600 dark:text-teal-400 flex items-center gap-1 hover:underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>تحديث</span>
              </button>
            </div>

            <div className="space-y-2">
              {backups.map((b) => (
                <div
                  key={b.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="font-bold text-slate-800 dark:text-slate-200">
                        {new Date(b.createdAt).toLocaleString('ar-SA')}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        نوع النسخة: {b.backup_type === 'auto' ? 'تلقائية' : 'يدوية'}
                        {b.summary && (
                          <span className="mx-1">
                            • {b.summary.peopleCount || 0} أشخاص • {b.summary.transactionsCount || 0} عمليات
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRestoreCloudBackup(b.id)}
                    disabled={isRestoring}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg font-bold text-[11px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="w-3 h-3 text-teal-600" />
                    <span>استعادة</span>
                  </button>
                </div>
              ))}

              {backups.length === 0 && !loading && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  لا توجد نسخ احتياطية محفوظة حالياً في السحابة
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
