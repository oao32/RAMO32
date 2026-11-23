import React from 'react';
import { ClientProfile, Language, Theme } from '../types';
import { User, Scale, Ruler, Dumbbell, Flame } from 'lucide-react';

interface AthleteBiometricsBarProps {
  profile: ClientProfile;
  language: Language;
  theme?: Theme;
  isVIP?: boolean;
}

export const AthleteBiometricsBar: React.FC<AthleteBiometricsBarProps> = ({
  profile,
  language,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const cardCls = isLight
    ? 'bg-[#FAFBFD] border-slate-300 shadow-sm hover:border-orange-500/60'
    : 'bg-[#081024]/90 backdrop-blur-xl border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-orange-500/40';
  const labelCls = isLight ? 'text-slate-500' : 'text-slate-400';
  const valCls = isLight ? 'text-[#0B132B]' : 'text-white drop-shadow-sm';
  const iconBoxCls = isLight
    ? 'bg-orange-50 border-orange-200 text-[#EA580C]'
    : 'bg-white/5 border-white/15 text-orange-400 shadow-inner';

  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 select-none">
      {/* Card 1: المشترك (Athlete Name) */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between transition-all ${cardCls}`}>
        <div className="flex flex-col min-w-0">
          <span className={`text-[11px] font-bold mb-0.5 ${labelCls}`}>
            {language === 'ar' ? 'المشترك' : 'ATHLETE'}
          </span>
          <span className={`text-sm sm:text-base font-black truncate ${valCls}`}>
            {profile.name}
          </span>
        </div>
        <div
          className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center shrink-0 ms-2 ${
            isLight
              ? 'bg-[#0B132B] border-[#0B132B] text-white shadow-sm'
              : 'bg-white/5 border-white/15 text-white shadow-inner'
          }`}
        >
          <User className="w-5 h-5" />
        </div>
      </div>

      {/* Card 2: الوزن (Weight) */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between transition-all ${cardCls}`}>
        <div className="flex flex-col min-w-0">
          <span className={`text-[11px] font-bold mb-0.5 ${labelCls}`}>
            {language === 'ar' ? 'الوزن' : 'WEIGHT'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg sm:text-xl font-black font-mono tabular-nums ${valCls}`}>
              {profile.weight}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">
              {language === 'ar' ? 'كجم' : 'KG'}
            </span>
          </div>
        </div>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center shrink-0 ms-2 ${iconBoxCls}`}>
          <Scale className="w-5 h-5" />
        </div>
      </div>

      {/* Card 3: الطول (Height - Orange Highlighted Badge) */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between transition-all ${cardCls}`}>
        <div className="flex flex-col min-w-0">
          <span className={`text-[11px] font-bold mb-0.5 ${labelCls}`}>
            {language === 'ar' ? 'الطول' : 'HEIGHT'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg sm:text-xl font-black font-mono tabular-nums ${valCls}`}>
              {profile.height}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">
              {language === 'ar' ? 'سم' : 'CM'}
            </span>
          </div>
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center shrink-0 ms-2 shadow-[0_0_15px_rgba(234,88,12,0.45)]">
          <Ruler className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Card 4: العضلات (Muscle Mass) */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between transition-all ${cardCls}`}>
        <div className="flex flex-col min-w-0">
          <span className={`text-[11px] font-bold mb-0.5 ${labelCls}`}>
            {language === 'ar' ? 'العضلات' : 'MUSCLE'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg sm:text-xl font-black font-mono tabular-nums ${valCls}`}>
              {profile.muscleMass}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">
              {language === 'ar' ? 'كجم' : 'KG'}
            </span>
          </div>
        </div>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center shrink-0 ms-2 ${iconBoxCls}`}>
          <Dumbbell className="w-5 h-5" />
        </div>
      </div>

      {/* Card 5: الدهون (Body Fat Percentage) */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between col-span-2 sm:col-span-1 transition-all ${cardCls}`}>
        <div className="flex flex-col min-w-0">
          <span className={`text-[11px] font-bold mb-0.5 ${labelCls}`}>
            {language === 'ar' ? 'الدهون' : 'BODY FAT'}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className={`text-lg sm:text-xl font-black font-mono tabular-nums ${valCls}`}>
              {profile.bodyFat}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">%</span>
          </div>
        </div>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl border flex items-center justify-center shrink-0 ms-2 ${iconBoxCls}`}>
          <Flame className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
