import React from 'react';
import { ClientProfile, Language, Theme } from '../types';
import { VIPBadge } from './VIPBadge';
import { calculateSubscriptionDetails } from '../lib/subscriptionUtils';
import {
  Lock,
  MessageCircle,
  ShieldAlert,
  LogOut,
  KeyRound,
  AlertOctagon,
} from 'lucide-react';

interface SubscriptionExpiredLockScreenProps {
  profile: ClientProfile;
  language: Language;
  theme?: Theme;
  onOpenCoachPasskeyModal?: () => void;
  onSignOut: () => void;
}

export const SubscriptionExpiredLockScreen: React.FC<SubscriptionExpiredLockScreenProps> = ({
  profile,
  language,
  theme = 'dark',
  onOpenCoachPasskeyModal,
  onSignOut,
}) => {
  const details = calculateSubscriptionDetails(profile);
  const isVip = profile.subscription_plan === 'VIP';
  const isLight = theme === 'light';

  const whatsappMessage = encodeURIComponent(
    `مرحباً كوتش عمر، أنا المشترك (${profile.name || 'متدرب OAO'})${
      profile.clientCode ? ` صاحب الرمز (${profile.clientCode})` : ''
    }. لقد انتهت فترة اشتراكي بتاريخ (${details.endDate}) وأرغب في تجديد الاشتراك ومواصلة التمارين معك.`
  );
  const whatsappUrl = `https://wa.me/966500000000?text=${whatsappMessage}`;

  return (
    <div
      className="min-h-[85vh] w-full flex items-center justify-center p-4 sm:p-8 animate-fadeIn"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
    >
      <div
        className={`relative w-full max-w-2xl border rounded-3xl p-6 sm:p-10 overflow-hidden text-center space-y-6 ${
          isLight
            ? 'bg-[#FAFBFD] border-rose-400/70 shadow-[0_20px_50px_rgba(244,63,94,0.12)]'
            : 'bg-gradient-to-b from-[#0c142b] via-[#070a14] to-[#04060c] border-rose-500/40 shadow-[0_0_80px_rgba(244,63,94,0.22)]'
        }`}
      >
        {/* Top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600" />

        {/* Lock Emblem */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-rose-600 to-amber-600 opacity-20 blur-md" />
          <div
            className={`relative w-20 h-20 rounded-2xl border-2 border-rose-500/60 flex items-center justify-center shadow-lg ${
              isLight ? 'bg-rose-50' : 'bg-[#0b132b] shadow-rose-950/80'
            }`}
          >
            <Lock className="w-10 h-10 text-rose-600 dark:text-rose-400" />
          </div>
        </div>

        {/* Heading & Clear Coach Renewal Notice */}
        <div className="space-y-2.5">
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-black tracking-wide ${
              isLight
                ? 'bg-rose-50 border-rose-300 text-rose-800'
                : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
            }`}
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>
              {language === 'ar'
                ? 'الحساب مقفل تلقائياً لانتهاء مدة الاشتراك'
                : 'Account Locked — Subscription Period Ended'}
            </span>
          </div>

          <h2
            className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isLight ? 'text-[#0B132B]' : 'text-white'
            }`}
          >
            {language === 'ar' ? 'انتهت مدة اشتراكك التدريبي' : 'Your Training Subscription Has Ended'}
          </h2>

          <p
            className={`text-sm max-w-lg mx-auto leading-relaxed ${
              isLight ? 'text-slate-700' : 'text-slate-300'
            }`}
          >
            {language === 'ar' ? (
              <>
                أهلاً بك يا <span className="text-[#EA580C] dark:text-orange-400 font-bold">{profile.name}</span>. لقد انتهت صلاحية اشتراكك في منصة OAO. تم قفل التمارين والنظام الغذائي مؤقتاً —{' '}
                <span className="text-amber-700 dark:text-amber-300 font-bold">
                  يُرجى التواصل مع الكوتش عمر عدنان لتجديد اشتراكك وإعادة تفعيل حسابك
                </span>
                .
              </>
            ) : (
              <>
                Hello <span className="text-[#EA580C] dark:text-orange-400 font-bold">{profile.name}</span>. Your OAO subscription period has ended and access to workouts &amp; meal plans is locked.{' '}
                <span className="text-amber-700 dark:text-amber-300 font-bold">
                  Please contact Coach Omar Adnan to renew and unlock your account.
                </span>
              </>
            )}
          </p>
        </div>

        {/* Expired Subscription Summary Card */}
        <div
          className={`border rounded-2xl p-4 sm:p-5 text-start space-y-3 ${
            isLight ? 'bg-slate-100/80 border-slate-300' : 'bg-[#050811] border-white/10'
          }`}
        >
          <div
            className={`flex items-center justify-between border-b pb-2.5 ${
              isLight ? 'border-slate-300' : 'border-white/5'
            }`}
          >
            <span className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {language === 'ar' ? 'الباقة التدريبية:' : 'Subscription Plan:'}
            </span>
            <div className="flex items-center gap-1.5">
              {isVip ? (
                <VIPBadge variant="compact" language={language} />
              ) : (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isLight
                      ? 'bg-white text-[#0B132B] border-slate-300'
                      : 'bg-slate-800 text-slate-200 border-slate-600'
                  }`}
                >
                  Standard
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? 'bg-white border-slate-300' : 'bg-white/5 border-white/5'
              }`}
            >
              <span className={`block text-[11px] mb-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {language === 'ar' ? 'تاريخ البداية:' : 'Start Date:'}
              </span>
              <span className={`font-bold ${isLight ? 'text-[#0B132B]' : 'text-slate-200'}`}>
                {language === 'ar' ? details.formattedStartDateAr : details.formattedStartDateEn}
              </span>
              <span className="block text-[10px] font-mono text-slate-500">{details.startDate}</span>
            </div>

            <div
              className={`p-2.5 rounded-xl border ${
                isLight
                  ? 'bg-rose-50 border-rose-300'
                  : 'bg-rose-500/10 border-rose-500/20'
              }`}
            >
              <span className="text-rose-700 dark:text-rose-300 block text-[11px] mb-0.5">
                {language === 'ar' ? 'تاريخ الانتهاء:' : 'End Date (Expired):'}
              </span>
              <span className="font-bold text-rose-800 dark:text-rose-300">
                {language === 'ar' ? details.formattedEndDateAr : details.formattedEndDateEn}
              </span>
              <span className="block text-[10px] font-mono text-rose-600 dark:text-rose-400/80">
                {details.endDate}
              </span>
            </div>
          </div>

          <div
            className={`text-[11px] flex items-center gap-1.5 pt-1 ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {language === 'ar'
                ? 'جميع تمارينك وقياساتك وسجلاتك محفوظة بأمان تام، وسيُفتح الحساب مباشرة فور تمديد المدة من الكوتش.'
                : 'All your workout logs and stats are safely preserved and will unlock immediately once Coach Omar renews your dates.'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm shadow-[0_8px_25px_rgba(234,88,12,0.35)] transition-all hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span>
              {language === 'ar'
                ? 'تواصل مع الكوتش عمر لتجديد الاشتراك (واتساب)'
                : 'Contact Coach Omar on WhatsApp to Renew'}
            </span>
          </a>

          <div
            className={`flex flex-wrap items-center justify-center gap-4 pt-3 border-t text-xs ${
              isLight ? 'border-slate-300' : 'border-white/5'
            }`}
          >
            {onOpenCoachPasskeyModal && (
              <>
                <button
                  type="button"
                  onClick={onOpenCoachPasskeyModal}
                  className="text-amber-700 dark:text-amber-400/90 hover:text-amber-600 dark:hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'دخول الكوتش للتمديد' : 'Coach Login to Extend'}</span>
                </button>
                <span className="text-slate-400 dark:text-slate-600">•</span>
              </>
            )}

            <button
              type="button"
              onClick={onSignOut}
              className="text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-slate-200 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تسجيل الخروج' : 'Sign Out'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
