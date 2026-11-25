import React from 'react';
import { Language, Theme } from '../types';
import { Dumbbell, Shield, Flame } from 'lucide-react';

interface BrandHeroSectionProps {
  onEnterPortal?: () => void;
  onOpenAdmin?: () => void;
  language: Language;
  theme?: Theme;
}

export const BrandHeroSection: React.FC<BrandHeroSectionProps> = ({
  language,
  theme = 'dark',
}) => {
  const isDark = theme === 'dark';

  return (
    <section
      className={`relative w-full py-8 sm:py-10 px-4 sm:px-8 overflow-hidden border-y select-none transition-colors duration-300 ${
        isDark
          ? 'bg-gradient-to-b from-[#030712] via-[#070b19] to-[#030712] border-orange-500/20 text-white'
          : 'bg-gradient-to-b from-[#EEF2F6] via-[#F8FAFC] to-[#EEF2F6] border-slate-300 text-[#0B132B]'
      }`}
    >
      <div className="max-w-5xl mx-auto relative z-10 text-start">
        {/* The 3 Compact Pillars of OAO (1 row on desktop, stacked on mobile) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 w-full">
          {/* Pillar 1: OWN */}
          <div
            className={`border rounded-2xl p-4 sm:p-5 transition-colors shadow-md group ${
              isDark
                ? 'bg-[#0b132b]/80 border-orange-500/25 hover:border-orange-500/60'
                : 'bg-[#FAFBFD] border-slate-300 hover:border-orange-500/60'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isDark
                    ? 'bg-orange-500/15 text-orange-400 group-hover:bg-orange-500 group-hover:text-white'
                    : 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white'
                }`}
              >
                <Shield className="w-4 h-4" />
              </span>
              <h3 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-[#0B132B]'}`}>
                {language === 'ar' ? 'OWN - امتلاك الانضباط' : 'OWN - Mastery & Discipline'}
              </h3>
            </div>
            <p className={`text-[13px] sm:text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {language === 'ar'
                ? 'السيطرة الكاملة على عاداتك اليومية، التزامك بالأوزان والتمارين، وعدم ترك أي مجال للأعذار.'
                : 'Absolute ownership of daily habits, training adherence, progressive overload, and no excuses.'}
            </p>
          </div>

          {/* Pillar 2: AURA */}
          <div
            className={`border rounded-2xl p-4 sm:p-5 transition-colors group relative overflow-hidden ${
              isDark
                ? 'bg-[#0b132b]/85 border-orange-500/40 hover:border-orange-500 shadow-[0_0_25px_rgba(249,115,22,0.12)]'
                : 'bg-white border-orange-400/60 hover:border-orange-500 shadow-[0_8px_24px_rgba(234,88,12,0.08)]'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isDark
                    ? 'bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white'
                    : 'bg-orange-100 text-orange-700 group-hover:bg-orange-600 group-hover:text-white'
                }`}
              >
                <Flame className="w-4 h-4" />
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#EA580C] dark:text-orange-400">
                {language === 'ar' ? 'AURA - الهيبة والطاقة' : 'AURA - Energy & Presence'}
              </h3>
            </div>
            <p className={`text-[13px] sm:text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {language === 'ar'
                ? 'حضور بدني طاغٍ يعكس قوة الشخصية والطاقة الإيجابية التي تملأ الصالة فور دخولك.'
                : 'Commanding physical presence and magnetic energy radiating from elite conditioning.'}
            </p>
          </div>

          {/* Pillar 3: OUTCOME */}
          <div
            className={`border rounded-2xl p-4 sm:p-5 transition-colors shadow-md group ${
              isDark
                ? 'bg-[#0b132b]/80 border-orange-500/25 hover:border-orange-500/60'
                : 'bg-[#FAFBFD] border-slate-300 hover:border-blue-700/50'
            }`}
          >
            <div className="flex items-center gap-2.5 mb-2">
              <span
                className={`p-2 rounded-xl transition-colors shrink-0 ${
                  isDark
                    ? 'bg-blue-500/15 text-blue-400 group-hover:bg-blue-600 group-hover:text-white'
                    : 'bg-blue-100 text-[#1E3A8A] group-hover:bg-[#1E3A8A] group-hover:text-white'
                }`}
              >
                <Dumbbell className="w-4 h-4" />
              </span>
              <h3 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-[#0B132B]'}`}>
                {language === 'ar' ? 'OUTCOME - النتيجة الفائقة' : 'OUTCOME - Real Transformation'}
              </h3>
            </div>
            <p className={`text-[13px] sm:text-sm leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
              {language === 'ar'
                ? 'أرقام ملموسة: زيادة الكتلة العضلية، خفض نسبة الدهون، وبناء الجسم الذي طالما حلمت به.'
                : 'Concrete measurable outcome: lean hypertrophy, low body fat %, and undeniable strength.'}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

