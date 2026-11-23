import React from 'react';
import { Language, Theme } from '../types';
import { OAO3DLogoStage } from './OAO3DLogoStage';
import { Sparkles, Dumbbell, Shield, Flame, Zap } from 'lucide-react';

interface BrandHeroSectionProps {
  onEnterPortal: () => void;
  onOpenAdmin?: () => void;
  language: Language;
  theme?: Theme;
}

export const BrandHeroSection: React.FC<BrandHeroSectionProps> = ({
  onEnterPortal,
  language,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  return (
    <section
      className={`relative w-full py-14 sm:py-16 px-4 sm:px-8 overflow-hidden border-b select-none transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-[#070b19] via-[#0b132b] to-[#030712] border-orange-500/20 text-white'
          : 'bg-gradient-to-b from-[#FAFBFD] via-[#EEF2F6] to-[#E6ECF4] border-slate-300 text-[#0B132B]'
      }`}
    >
      {/* Calm Navy & Orange Background Aura Pulse */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[560px] h-[560px] bg-gradient-to-tr from-[#0B132B]/25 via-[#1E3A8A]/20 to-[#F97316]/20 dark:from-[#1E3A8A]/25 dark:via-[#F97316]/15 dark:to-[#0B132B]/30 rounded-full blur-[135px] oao-calm-aura-pulse pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
        {/* Top Tagline Badge */}
        <div
          className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-extrabold text-xs tracking-widest uppercase mb-5 ${
            isDark
              ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.18)]'
              : 'bg-orange-50 border-orange-400/50 text-orange-700 shadow-xs'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
          <span>
            {language === 'ar' ? 'الهوية الرياضية الرسمية المعتمدة' : 'Official Athletic Brand Identity'}
          </span>
        </div>

        {/* Volumetric 3D Emblem Display Stage (Zero stray badges) */}
        <div
          className={`relative my-2 rounded-3xl p-4 sm:p-6 flex items-center justify-center w-full max-w-2xl border backdrop-blur-xl transition-colors ${
            isDark
              ? 'bg-[#0b132b]/80 border-orange-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.65)]'
              : 'bg-[#FAFBFD]/90 border-slate-300 shadow-[0_14px_40px_rgba(11,19,43,0.08)]'
          }`}
        >
          <OAO3DLogoStage compact showCaption />
        </div>

        {/* Title & Brand Ethos */}
        <div className="mt-7 space-y-3 max-w-3xl">
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-wider flex flex-wrap items-center justify-center gap-2 sm:gap-4 select-none">
            <span className={isDark ? 'text-white drop-shadow-[0_0_18px_rgba(255,255,255,0.3)]' : 'text-[#0B132B]'}>
              OWN
            </span>
            <span className="inline-block px-3 sm:px-5 py-0.5 sm:py-1 rounded-xl bg-gradient-to-r from-[#0B132B] via-[#1E3A8A] to-[#0B132B] dark:from-slate-100 dark:via-white dark:to-slate-200 text-white dark:text-[#07182E] border-2 border-orange-500/60 dark:border-slate-300 shadow-md">
              AURA
            </span>
            <span className="text-[#EA580C] dark:text-orange-500 drop-shadow-[0_0_20px_rgba(249,115,22,0.35)]">
              OUTCOME
            </span>
          </h2>

          <p
            className={`text-sm sm:text-base font-semibold max-w-xl mx-auto leading-relaxed ${
              isDark ? 'text-slate-300' : 'text-slate-600'
            }`}
          >
            {language === 'ar'
              ? 'نظام رياضي نخبوي مصمم لتحويل الجينات إلى قوة عضلية حقيقية تحت إشراف الكوتش عمر عدنان.'
              : 'Elite training system engineered to forge real muscle hypertrophy and championship presence.'}
          </p>
        </div>

        {/* The 3 Pillars of OAO */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 w-full max-w-4xl text-start">
          {/* Pillar 1: OWN */}
          <div
            className={`border rounded-2xl p-5 transition-all hover:scale-[1.02] shadow-md group ${
              isDark
                ? 'bg-[#0b132b]/80 border-orange-500/25 hover:border-orange-500/60'
                : 'bg-[#FAFBFD] border-slate-300 hover:border-orange-500/60'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`p-2 rounded-xl transition-colors ${
                  isDark
                    ? 'bg-orange-500/15 text-orange-400 group-hover:bg-orange-500 group-hover:text-white'
                    : 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white'
                }`}
              >
                <Shield className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs font-black text-orange-600 dark:text-orange-500 tracking-widest">
                PILLAR 01
              </span>
            </div>
            <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-[#0B132B]'}`}>
              {language === 'ar' ? 'OWN - امتلاك الانضباط' : 'OWN - Mastery & Discipline'}
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {language === 'ar'
                ? 'السيطرة الكاملة على عاداتك اليومية، التزامك بالأوزان والتمارين، وعدم ترك أي مجال للأعذار.'
                : 'Absolute ownership of daily habits, training adherence, progressive overload, and no excuses.'}
            </p>
          </div>

          {/* Pillar 2: AURA */}
          <div
            className={`border rounded-2xl p-5 transition-all hover:scale-[1.02] group relative overflow-hidden ${
              isDark
                ? 'bg-[#0b132b]/85 border-orange-500/40 hover:border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.12)]'
                : 'bg-white border-orange-400/60 hover:border-orange-500 shadow-[0_8px_24px_rgba(234,88,12,0.08)]'
            }`}
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span
                className={`p-2 rounded-xl transition-colors ${
                  isDark
                    ? 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white'
                    : 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white'
                }`}
              >
                <Flame className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs font-black text-orange-600 dark:text-orange-400 tracking-widest">
                PILLAR 02
              </span>
            </div>
            <h3 className="text-lg font-black text-[#EA580C] dark:text-orange-400">
              {language === 'ar' ? 'AURA - الهيبة والطاقة' : 'AURA - Energy & Presence'}
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              {language === 'ar'
                ? 'حضور بدني طاغٍ يعكس قوة الشخصية والطاقة الإيجابية التي تملأ الصالة فور دخولك.'
                : 'Commanding physical presence and magnetic energy radiating from elite conditioning.'}
            </p>
          </div>

          {/* Pillar 3: OUTCOME */}
          <div
            className={`border rounded-2xl p-5 transition-all hover:scale-[1.02] shadow-md group ${
              isDark
                ? 'bg-[#0b132b]/80 border-orange-500/25 hover:border-orange-500/60'
                : 'bg-[#FAFBFD] border-slate-300 hover:border-blue-700/50'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`p-2 rounded-xl transition-colors ${
                  isDark
                    ? 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                    : 'bg-blue-100 text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white'
                }`}
              >
                <Dumbbell className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs font-black text-[#1E3A8A] dark:text-blue-400 tracking-widest">
                PILLAR 03
              </span>
            </div>
            <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-[#0B132B]'}`}>
              {language === 'ar' ? 'OUTCOME - النتيجة الفائقة' : 'OUTCOME - Real Transformation'}
            </h3>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              {language === 'ar'
                ? 'أرقام ملموسة: زيادة الكتلة العضلية، خفض نسبة الدهون، وبناء الجسم الذي طالما حلمت به.'
                : 'Concrete measurable outcome: lean hypertrophy, low body fat %, and undeniable strength.'}
            </p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={onEnterPortal}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-[#EA580C] via-[#F97316] to-amber-500 hover:from-[#F97316] hover:to-amber-400 text-white font-black text-sm tracking-wider uppercase shadow-[0_10px_28px_rgba(234,88,12,0.4)] border border-orange-300/60 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>{language === 'ar' ? 'دخول بوابة المشترك' : 'Enter Athlete Portal'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
