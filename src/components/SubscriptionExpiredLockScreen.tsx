import React, { useState } from 'react';
import { ClientProfile, Language, Theme } from '../types';
import { VIPBadge } from './VIPBadge';
import { calculateSubscriptionDetails } from '../lib/subscriptionUtils';
import {
  Lock,
  Calendar,
  CreditCard,
  MessageCircle,
  ShieldAlert,
  Sparkles,
  LogIn,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';

interface SubscriptionExpiredLockScreenProps {
  profile: ClientProfile;
  language: Language;
  theme?: Theme;
  onOpenRenewModal: () => void;
  onOpenCoachPasskeyModal: () => void;
  onSignOut: () => void;
}

export const SubscriptionExpiredLockScreen: React.FC<SubscriptionExpiredLockScreenProps> = ({
  profile,
  language,
  theme,
  onOpenRenewModal,
  onOpenCoachPasskeyModal,
  onSignOut,
}) => {
  const details = calculateSubscriptionDetails(profile);
  const isVip = profile.subscription_plan === 'VIP';

  const whatsappMessage = encodeURIComponent(
    `مرحباً كوتش عمر، أنا المشترك (${profile.name}) صاحب الرمز (${profile.clientCode || 'OAO'}). لقد انتهت فترة اشتراكي وأرغب في تجديد أو تمديد الاشتراك ومواصلة التمارين معك.`
  );
  const whatsappUrl = `https://wa.me/966500000000?text=${whatsappMessage}`;

  return (
    <div className="min-h-[85vh] w-full flex items-center justify-center p-4 sm:p-8 animate-fadeIn">
      {/* Background radial gradient card */}
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c142b] via-[#070a14] to-[#04060c] border border-rose-500/40 rounded-3xl p-6 sm:p-10 shadow-[0_0_80px_rgba(244,63,94,0.22)] overflow-hidden text-center space-y-6">
        {/* Top ambient glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

        {/* Floating Lock Icon with pulsing rings */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping opacity-60" />
          <div className="absolute inset-2 rounded-full bg-gradient-to-tr from-rose-600 to-amber-600 opacity-30 blur-md" />
          <div className="relative w-20 h-20 rounded-2xl bg-[#0b132b] border-2 border-rose-500/60 flex items-center justify-center shadow-lg shadow-rose-950/80">
            <Lock className="w-10 h-10 text-rose-400 animate-pulse" />
          </div>
        </div>

        {/* Heading & Notice */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-black tracking-wide">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>{language === 'ar' ? 'تم قفل الموقع لانتهاء فترة الاشتراك' : 'Portal Locked — Subscription Expired'}</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            {language === 'ar' ? 'انتهت فترة اشتراكك التدريبي' : 'Your Training Subscription Has Expired'}
          </h2>

          <p className="text-sm text-slate-300 max-w-lg mx-auto leading-relaxed">
            {language === 'ar' ? (
              <>
                أهلاً بك يا <span className="text-orange-400 font-bold">{profile.name}</span>. لقد انتهت الفترة المحددة لاشتراكك التدريبي مع{' '}
                <span className="text-amber-300 font-bold">الكوتش عمر عدنان</span>. للحفاظ على تقدمك الرياضي ومواصلة جدول التمارين والمتابعة، يُرجى تجديد اشتراكك الآن.
              </>
            ) : (
              <>
                Welcome <span className="text-orange-400 font-bold">{profile.name}</span>. Your training subscription with{' '}
                <span className="text-amber-300 font-bold">Coach Omar Adnan</span> has ended. Renew now to unlock your program and keep progressing.
              </>
            )}
          </p>
        </div>

        {/* Expired Subscription Summary Card */}
        <div className="bg-[#050811] border border-white/10 rounded-2xl p-4 sm:p-5 text-start space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <span className="text-xs text-slate-400 font-medium">
              {language === 'ar' ? 'نوع الباقة السابقة:' : 'Previous Subscription Plan:'}
            </span>
            <div className="flex items-center gap-1.5">
              {isVip ? (
                <VIPBadge variant="compact" language={language} />
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-200 border border-slate-600">
                  Standard
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
              <span className="text-slate-400 block text-[11px] mb-0.5">
                {language === 'ar' ? 'تاريخ البداية:' : 'Start Date:'}
              </span>
              <span className="font-bold text-slate-200">{details.formattedStartDateAr}</span>
              <span className="block text-[10px] font-mono text-slate-500">{details.startDate}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <span className="text-rose-300 block text-[11px] mb-0.5">
                {language === 'ar' ? 'تاريخ الانتهاء:' : 'End Date (Expired):'}
              </span>
              <span className="font-bold text-rose-300">{details.formattedEndDateAr}</span>
              <span className="block text-[10px] font-mono text-rose-400/80">{details.endDate}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              {language === 'ar'
                ? 'تم حفظ كافة بياناتك وقياساتك وسجلاتك الرياضية في أمان، وسيتم استعادتها فور التجديد.'
                : 'All your workout history and stats are safely saved and will reactivate immediately upon renewal.'}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          {/* Primary CTA: Renew Subscription */}
          <button
            type="button"
            onClick={onOpenRenewModal}
            className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-500 to-orange-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm shadow-[0_0_30px_rgba(249,115,22,0.5)] transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-5 h-5" />
            <span>{language === 'ar' ? 'تجديد الاشتراك وتفعيل الحساب فوراً ⚡' : 'Renew Subscription & Unlock Now ⚡'}</span>
          </button>

          {/* Secondary CTA: WhatsApp Direct to Coach */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-6 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>{language === 'ar' ? 'تواصل مع الكوتش عمر لتمديد أو تجديد الاشتراك' : 'Contact Coach Omar to Extend / Renew'}</span>
          </a>

          {/* Admin / Coach Unlock & Signout options */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-3 border-t border-white/5 text-xs">
            <button
              type="button"
              onClick={onOpenCoachPasskeyModal}
              className="text-amber-400/90 hover:text-amber-300 font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'دخول الكوتش لإدارة الحساب والتمديد' : 'Coach Login (Manage & Extend)'}</span>
            </button>

            <span className="text-slate-600">•</span>

            <button
              type="button"
              onClick={onSignOut}
              className="text-slate-400 hover:text-slate-200 font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تسجيل الخروج والعودة للرئيسية' : 'Sign Out to Main Portal'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
