import React from 'react';
import {
  LayoutDashboard,
  Users,
  TrendingDown,
  TrendingUp,
  Bell,
  Moon,
  Sun,
  Languages,
  Database,
  RefreshCw,
  HardDriveDownload,
  AlertCircle,
  CheckCircle2,
  LogOut,
  User as UserIcon,
  Sparkles,
} from 'lucide-react';
import { ActiveTab, Language, ThemeMode, CurrencyCode, CURRENCIES, AuthUser } from '../types';
import { getTranslation } from '../i18n/translations';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: ThemeMode;
  toggleTheme: () => void;
  isDbConnected: boolean;
  isSyncing: boolean;
  onRefreshSync: () => void;
  onOpenBackupModal: () => void;
  overdueCount: number;
  activeCurrency: CurrencyCode | 'ALL';
  setActiveCurrency: (currency: CurrencyCode | 'ALL') => void;
  currentUser: AuthUser | null;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  language,
  setLanguage,
  theme,
  toggleTheme,
  isDbConnected,
  isSyncing,
  onRefreshSync,
  onOpenBackupModal,
  overdueCount,
  activeCurrency,
  setActiveCurrency,
  currentUser,
  onLogout,
}) => {
  const t = getTranslation(language);

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: t.dashboard, icon: LayoutDashboard },
    { id: 'people' as ActiveTab, label: t.accountsAndDebts, icon: Users },
    { id: 'expenses' as ActiveTab, label: t.expenses, icon: TrendingDown },
    { id: 'income' as ActiveTab, label: t.income, icon: TrendingUp },
    {
      id: 'reminders' as ActiveTab,
      label: t.reminders,
      icon: Bell,
      badge: overdueCount > 0 ? overdueCount : undefined,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
          {/* Logo & DF Title */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-black text-xl tracking-wider">
              DF
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  DF
                </h1>
                <span className="hidden sm:inline-block text-xs text-slate-400 font-normal">
                  | إدارة الحسابات والديون
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isDbConnected
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {isDbConnected ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  )}
                  {isDbConnected ? 'Neon PostgreSQL' : 'سحابة غير متصلة'}
                </span>
                <button
                  onClick={onRefreshSync}
                  title={t.refreshSync}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                >
                  <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-emerald-500' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-emerald-600 dark:text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Currency Switcher Selector */}
          <div className="flex items-center p-0.5 sm:p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <button
              onClick={() => setActiveCurrency('ALL')}
              className={`px-2 py-1 rounded-lg font-bold transition-colors ${
                activeCurrency === 'ALL'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setActiveCurrency('IQD')}
              title="دينار عراقي"
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                activeCurrency === 'IQD'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              }`}
            >
              <span>🇮🇶</span>
              <span className="hidden sm:inline">د.ع</span>
            </button>
            <button
              onClick={() => setActiveCurrency('USD')}
              title="دولار أمريكي"
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                activeCurrency === 'USD'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              }`}
            >
              <span>🇺🇸</span>
              <span className="hidden sm:inline">$</span>
            </button>
            <button
              onClick={() => setActiveCurrency('TRY')}
              title="ليرة تركية"
              className={`px-2 py-1 rounded-lg font-bold flex items-center gap-1 transition-colors ${
                activeCurrency === 'TRY'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
              }`}
            >
              <span>🇹🇷</span>
              <span className="hidden sm:inline">₺</span>
            </button>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Backups */}
            <button
              onClick={onOpenBackupModal}
              title={t.backups}
              className="p-2 sm:px-3 sm:py-1.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors shadow-2xs"
            >
              <HardDriveDownload className="w-4 h-4 text-teal-600 dark:text-teal-400 sm:mr-1 inline" />
              <span className="hidden md:inline">{t.backups}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
              title="تبديل المظهر / Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Language Switch */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-2 py-1.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors"
            >
              {language === 'ar' ? 'EN' : 'عربي'}
            </button>

            {/* User Profile & Logout */}
            {currentUser && (
              <div className="flex items-center gap-1.5 pl-1 border-r sm:border-r-0 border-slate-200 dark:border-slate-800">
                <div className="hidden xl:flex flex-col text-right">
                  <span className="text-xs font-bold text-slate-900 dark:text-white leading-none">
                    {currentUser.fullName}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                    {currentUser.role === 'admin' ? 'مدير عام' : 'مستخدم'}
                  </span>
                </div>
                <button
                  onClick={onLogout}
                  title="تسجيل الخروج"
                  className="p-2 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile / Tablet Navigation Row */}
        <div className="flex lg:hidden items-center justify-around py-2 border-t border-slate-100 dark:border-slate-800/60 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium relative transition-colors ${
                  isActive
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {item.badge !== undefined && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
