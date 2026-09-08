import React, { useState } from 'react';
import { Lock, User, AlertCircle, Globe, LogIn } from 'lucide-react';
import { AuthUser, Language } from '../types';
import { api } from '../services/api';

interface AuthScreenProps {
  onLoginSuccess: (user: AuthUser) => void;
  language: Language;
  onToggleLanguage: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLoginSuccess,
  language,
  onToggleLanguage,
}) => {
  const [username, setUsername] = useState('mothana');
  const [password, setPassword] = useState('admin123admin123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const cleanUser = username.trim();
      if (!cleanUser || !password) {
        throw new Error(
          language === 'ar'
            ? 'يرجى إدخال اسم المستخدم وكلمة المرور'
            : 'Please enter both username and password'
        );
      }

      const res = await api.login(cleanUser, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(
        err.message ||
          (language === 'ar'
            ? 'اسم المستخدم أو كلمة المرور غير صحيحة'
            : 'Invalid username or password')
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Subtle Background Ambience */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher */}
      <div className="absolute top-4 right-4 z-10">
        <button
          id="lang-toggle-auth-btn"
          onClick={onToggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'English' : 'العربية'}</span>
        </button>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-950 mb-3">
            <span className="text-2xl font-black tracking-wider">DF</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            {language === 'ar' ? 'نظام DF المالي' : 'DF Financial Manager'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {language === 'ar' ? 'تسجيل الدخول إلى النظام' : 'Sign in to your account'}
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-7 shadow-2xl">
          {error && (
            <div
              id="auth-error-alert"
              className="mb-4 p-3 rounded-xl bg-rose-950/50 border border-rose-900/80 text-xs font-semibold text-rose-300 flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label
                htmlFor="username-input"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                {language === 'ar' ? 'اسم المستخدم' : 'Username'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rtl:right-3 ltr:left-3 ltr:right-auto" />
                <input
                  id="username-input"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="mothana"
                  autoComplete="username"
                  className="w-full rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password-input"
                className="block text-xs font-bold text-slate-300 mb-1.5"
              >
                {language === 'ar' ? 'كلمة المرور' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2 rtl:right-3 ltr:left-3 ltr:right-auto" />
                <input
                  id="password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="admin123admin123"
                  autoComplete="current-password"
                  className="w-full rtl:pr-9 rtl:pl-3 ltr:pl-9 ltr:pr-3 py-2.5 rounded-xl text-xs sm:text-sm bg-slate-950 border border-slate-800 text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-md shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <span>{language === 'ar' ? 'جاري التحقق...' : 'Signing in...'}</span>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{language === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>

          {/* Simple Credentials Note */}
          <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
            <div className="inline-block px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-mono">
              <span className="text-slate-500">user:</span>{' '}
              <span className="text-emerald-400 font-semibold">mothana</span>
              <span className="mx-1.5 text-slate-700">•</span>
              <span className="text-slate-500">pass:</span>{' '}
              <span className="text-emerald-400 font-semibold">admin123admin123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
