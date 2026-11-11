import React from 'react';
import { ClientProfile, Language, Theme } from '../types';
import { VIPBadge } from './VIPBadge';
import { calculateSubscriptionDetails } from '../lib/subscriptionUtils';
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowUpRight,
  MessageCircle,
  Sparkles,
  Shield,
  CreditCard,
} from 'lucide-react';

interface SubscriptionDurationBannerProps {
  profile: ClientProfile;
  language: Language;
  theme?: Theme;
  onOpenRenewModal: () => void;
  onOpenUpgradeToVIP?: () => void;
  onScrollToCoachChat?: () => void;
  onCoachEditDates?: () => void;
  isCoachView?: boolean;
}

export const SubscriptionDurationBanner: React.FC<SubscriptionDurationBannerProps> = ({
  profile,
  language,
  theme,
  onOpenRenewModal,
  onOpenUpgradeToVIP,
  onScrollToCoachChat,
  onCoachEditDates,
  isCoachView = false,
}) => {
  const details = calculateSubscriptionDetails(profile);
  const isVip = profile.subscription_plan === 'VIP';

  const isLight = theme === 'light';

  // Badge styling according to status
  const statusConfig = {
    active: {
      labelAr: 'الاشتراك نشط',
      labelEn: 'Subscription Active',
      color: 'emerald',
      bgClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      icon: CheckCircle2,
    },
    expiring: {
      labelAr: `ينتهي قريباً (${details.daysRemaining} يوم متبقي)`,
      labelEn: `Expiring Soon (${details.daysRemaining} days left)`,
      color: 'amber',
      bgClass: 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse',
      icon: AlertTriangle,
    },
    expired: {
      labelAr: 'الاشتراك منتهي ومقفل',
      labelEn: 'Expired & Locked',
      color: 'rose',
      bgClass: 'bg-rose-500/15 text-rose-400 border-rose-500/40',
      icon: Lock,
    },
  }[details.status];

  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-3xl transition-all duration-300 border ${
        isVip
          ? 'bg-gradient-to-br from-[#0c1429] via-[#070a14] to-[#141b2d] border-amber-500/35 shadow-[0_4px_30px_rgba(245,158,11,0.12)]'
          : isLight
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-[#0b132b]/95 border-orange-500/25 shadow-md'
      }`}
    >
      {/* Top subtle glow banner */}
      <div
        className={`h-1.5 w-full ${
          isVip
            ? 'bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-600 animate-pulse'
            : details.status === 'expiring'
            ? 'bg-gradient-to-r from-amber-500 to-rose-500'
            : details.status === 'expired'
            ? 'bg-rose-500'
            : 'bg-gradient-to-r from-orange-500 to-amber-500'
        }`}
      />

      <div className="p-5 sm:p-6 space-y-4">
        {/* Row 1: Header with Plan, Title, and Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <div
              className={`p-2 rounded-2xl ${
                isVip
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
              }`}
            >
              <Calendar className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3
                  className={`text-sm sm:text-base font-black ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  {language === 'ar' ? 'فترة وصلاحية اشتراكك التدريبي' : 'Subscription Duration & Period'}
                </h3>
                {isVip ? (
                  <VIPBadge variant="compact" language={language} />
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-slate-700/60 text-slate-200 border border-slate-500/40">
                    Standard
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                {language === 'ar'
                  ? 'محدد وموثق من الكوتش عمر عدنان — تتبع الأيام المتبقية وتاريخ التجديد'
                  : 'Coordinated by Coach Omar Adnan — track remaining days and renewal'}
              </p>
            </div>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span
              className={`px-3 py-1.5 rounded-full border text-xs font-black flex items-center gap-1.5 ${statusConfig.bgClass}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? statusConfig.labelAr : statusConfig.labelEn}</span>
            </span>

            {isCoachView && onCoachEditDates && (
              <button
                type="button"
                onClick={onCoachEditDates}
                className="px-2.5 py-1 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 text-[11px] font-bold border border-orange-500/40 transition-all cursor-pointer"
              >
                {language === 'ar' ? 'تعديل التواريخ ✏️' : 'Edit Dates ✏️'}
              </button>
            )}
          </div>
        </div>

        {/* Row 2: Metrics Grid (Start Date, End Date, Days Remaining) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Box 1: Start Date */}
          <div
            className={`p-3.5 rounded-2xl border ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#070a14]/80 border-white/5'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
              {language === 'ar' ? 'تاريخ بداية الاشتراك' : 'Start Date'}
            </span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span
                className={`text-sm font-bold ${
                  isLight ? 'text-slate-800' : 'text-slate-100'
                }`}
              >
                {language === 'ar' ? details.formattedStartDateAr : details.formattedStartDateEn}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
              {details.startDate}
            </span>
          </div>

          {/* Box 2: End Date */}
          <div
            className={`p-3.5 rounded-2xl border ${
              details.status === 'expiring'
                ? 'bg-amber-500/10 border-amber-500/30'
                : details.status === 'expired'
                ? 'bg-rose-500/10 border-rose-500/30'
                : isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#070a14]/80 border-white/5'
            }`}
          >
            <span className="text-[11px] font-medium text-slate-400 block mb-0.5">
              {language === 'ar' ? 'تاريخ نهاية الاشتراك' : 'End Date (Expiration)'}
            </span>
            <div className="flex items-center gap-2">
              <Clock
                className={`w-4 h-4 ${
                  details.status === 'expiring'
                    ? 'text-amber-400'
                    : details.status === 'expired'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              />
              <span
                className={`text-sm font-bold ${
                  details.status === 'expiring'
                    ? 'text-amber-300'
                    : details.status === 'expired'
                    ? 'text-rose-400 font-black'
                    : isLight
                    ? 'text-slate-800'
                    : 'text-slate-100'
                }`}
              >
                {language === 'ar' ? details.formattedEndDateAr : details.formattedEndDateEn}
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-500 block mt-0.5">
              {details.endDate}
            </span>
          </div>

          {/* Box 3: Days Remaining & Countdown */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
              isVip
                ? 'bg-gradient-to-br from-amber-500/15 to-amber-600/5 border-amber-500/30'
                : 'bg-gradient-to-br from-orange-500/15 to-orange-600/5 border-orange-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300">
                {language === 'ar' ? 'المدة المتبقية' : 'Remaining Time'}
              </span>
              <span className="text-[10px] text-slate-400">
                {details.daysElapsed} / {details.totalDays}{' '}
                {language === 'ar' ? 'يوم مكتمل' : 'days passed'}
              </span>
            </div>

            <div className="flex items-baseline gap-1.5 my-1">
              <span
                className={`text-2xl font-black font-mono ${
                  details.isExpired
                    ? 'text-rose-400'
                    : details.isExpiringSoon
                    ? 'text-amber-300'
                    : isVip
                    ? 'text-amber-400'
                    : 'text-orange-400'
                }`}
              >
                {details.daysRemaining}
              </span>
              <span className="text-xs font-bold text-slate-300">
                {language === 'ar' ? 'يوم متبقي' : 'days left'}
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  details.isExpired
                    ? 'bg-rose-500'
                    : details.isExpiringSoon
                    ? 'bg-gradient-to-r from-amber-500 to-rose-400'
                    : isVip
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]'
                    : 'bg-gradient-to-r from-orange-500 to-amber-400 shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                }`}
                style={{ width: `${details.progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Row 3: Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-white/5">
          <div className="flex flex-wrap items-center gap-2">
            {/* Renew Button */}
            <button
              type="button"
              onClick={onOpenRenewModal}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-black shadow-md hover:shadow-orange-500/25 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'تجديد الاشتراك الآن' : 'Renew Subscription'}</span>
            </button>

            {/* Upgrade to VIP Button (if standard) */}
            {!isVip && onOpenUpgradeToVIP && (
              <button
                type="button"
                onClick={onOpenUpgradeToVIP}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/10 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 text-xs font-black shadow-sm transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{language === 'ar' ? 'ترقية إلى VIP' : 'Upgrade to VIP'}</span>
              </button>
            )}

            {/* Contact Coach Button */}
            {onScrollToCoachChat && (
              <button
                type="button"
                onClick={onScrollToCoachChat}
                className={`px-3.5 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                }`}
              >
                <MessageCircle className="w-3.5 h-3.5 text-orange-400" />
                <span>{language === 'ar' ? 'تواصل مع الكوتش للاستفسار' : 'Ask Coach Omar'}</span>
              </button>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>
              {language === 'ar'
                ? 'ينتهي الاشتراك تلقائياً ويقفل الموقع عند نهاية المدة'
                : 'Portal auto-locks upon expiration until renewed'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
