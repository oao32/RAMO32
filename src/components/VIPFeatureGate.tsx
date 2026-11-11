import React from 'react';
import { Crown, Lock, ArrowRight, Check } from 'lucide-react';
import { Language, Theme, VIPFeatureKey } from '../types';
import { useSubscriptionAuth } from '../context/SubscriptionAuthContext';

interface VIPFeatureGateProps {
  feature: VIPFeatureKey;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  highlightsAr: string[];
  highlightsEn: string[];
  language: Language;
  theme?: Theme;
  children: React.ReactNode;
}

export const VIPFeatureGate: React.FC<VIPFeatureGateProps> = ({
  feature,
  titleAr,
  titleEn,
  descriptionAr,
  descriptionEn,
  highlightsAr,
  highlightsEn,
  language,
  theme = 'dark',
  children,
}) => {
  const { canAccessFeature, openUpgradeToVIP } = useSubscriptionAuth();
  const isAr = language === 'ar';

  // Full access for VIP subscribers & Coach Admin
  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  const highlights = isAr ? highlightsAr : highlightsEn;

  // Restricted state for Standard subscribers with clear "ترقية إلى VIP" CTA
  return (
    <section
      className={`relative rounded-2xl p-6 sm:p-8 border overflow-hidden transition-all ${
        theme === 'dark'
          ? 'bg-[#0B132B]/90 border-amber-500/30 text-white'
          : 'bg-[#FAFBFD] border-amber-500/40 text-[#0B132B] shadow-[0_6px_24px_rgba(11,19,43,0.06)]'
      }`}
    >
      {/* Top subtle gold hairline */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />

      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span>{isAr ? 'ميزة مقفلة — حصرية لمشتركي VIP' : 'Locked Feature — Exclusive to VIP'}</span>
            </span>
            <span aria-hidden="true" className="text-slate-400">·</span>
            <span className="text-slate-500 dark:text-slate-400">
              {isAr ? 'خطتك الحالية: الباقة القياسية (Standard)' : 'Current Plan: Standard'}
            </span>
          </div>

          <h3
            className={`text-lg sm:text-xl font-black ${
              theme === 'dark' ? 'text-white' : 'text-[#0B132B]'
            }`}
          >
            {isAr ? titleAr : titleEn}
          </h3>

          <p
            className={`text-xs sm:text-sm leading-relaxed ${
              theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {isAr ? descriptionAr : descriptionEn}
          </p>

          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {highlights.map((item, idx) => (
              <li
                key={idx}
                className={`flex items-center gap-2 text-xs font-semibold ${
                  theme === 'dark' ? 'text-slate-200' : 'text-slate-700'
                }`}
              >
                <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-3 shrink-0">
          <button
            type="button"
            onClick={openUpgradeToVIP}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-[#0B132B] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(245,158,11,0.35)] border border-amber-200/80 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
          >
            <Crown className="w-4 h-4 text-[#0B132B] fill-[#0B132B]/20 shrink-0" />
            <span>{isAr ? 'ترقية إلى VIP' : 'Upgrade to VIP'}</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180 shrink-0" />
          </button>

          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 text-center lg:text-end">
            {isAr
              ? 'تفعيل فوري لكافة صلاحيات النخبة بعد إتمام الترقية'
              : 'Instant activation of all VIP privileges upon upgrade'}
          </span>
        </div>
      </div>
    </section>
  );
};
