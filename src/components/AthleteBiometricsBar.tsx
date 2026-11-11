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
}) => {
  return (
    <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 select-none">
      {/* Card 1: المشترك (Athlete Name) */}
      <div className="rounded-2xl p-4 bg-[#081024]/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between transition-all hover:border-orange-500/40">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-slate-400 mb-0.5">
            {language === 'ar' ? 'المشترك' : 'ATHLETE'}
          </span>
          <span className="text-sm sm:text-base font-black text-white truncate drop-shadow-sm">
            {profile.name}
          </span>
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 ms-2 text-white shadow-inner">
          <User className="w-5 h-5 text-slate-200" />
        </div>
      </div>

      {/* Card 2: الوزن (Weight) */}
      <div className="rounded-2xl p-4 bg-[#081024]/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between transition-all hover:border-orange-500/40">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-slate-400 mb-0.5">
            {language === 'ar' ? 'الوزن' : 'WEIGHT'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
              {profile.weight}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">
              {language === 'ar' ? 'كجم' : 'KG'}
            </span>
          </div>
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 ms-2 text-orange-400 shadow-inner">
          <Scale className="w-5 h-5 text-orange-400" />
        </div>
      </div>

      {/* Card 3: الطول (Height - Orange Highlighted Badge) */}
      <div className="rounded-2xl p-4 bg-[#081024]/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between transition-all hover:border-orange-500/40">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-slate-400 mb-0.5">
            {language === 'ar' ? 'الطول' : 'HEIGHT'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
              {profile.height}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">
              {language === 'ar' ? 'سم' : 'CM'}
            </span>
          </div>
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#EA580C] text-white flex items-center justify-center shrink-0 ms-2 shadow-[0_0_15px_rgba(234,88,12,0.6)]">
          <Ruler className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Card 4: العضلات (Muscle Mass) */}
      <div className="rounded-2xl p-4 bg-[#081024]/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between transition-all hover:border-orange-500/40">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-slate-400 mb-0.5">
            {language === 'ar' ? 'العضلات' : 'MUSCLE'}
          </span>
          <div className="flex items-baseline gap-1">
            <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
              {profile.muscleMass}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">
              {language === 'ar' ? 'كجم' : 'KG'}
            </span>
          </div>
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 ms-2 text-orange-400 shadow-inner">
          <Dumbbell className="w-5 h-5 text-orange-400" />
        </div>
      </div>

      {/* Card 5: الدهون (Body Fat Percentage) */}
      <div className="rounded-2xl p-4 bg-[#081024]/90 backdrop-blur-xl border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] flex items-center justify-between col-span-2 sm:col-span-1 transition-all hover:border-orange-500/40">
        <div className="flex flex-col min-w-0">
          <span className="text-[11px] font-bold text-slate-400 mb-0.5">
            {language === 'ar' ? 'الدهون' : 'BODY FAT'}
          </span>
          <div className="flex items-baseline gap-0.5">
            <span className="text-lg sm:text-xl font-black text-white font-mono tabular-nums">
              {profile.bodyFat}
            </span>
            <span className="text-xs font-bold text-[#EA580C]">%</span>
          </div>
        </div>
        <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-white/5 border border-white/15 flex items-center justify-center shrink-0 ms-2 text-orange-400 shadow-inner">
          <Flame className="w-5 h-5 text-orange-400" />
        </div>
      </div>
    </div>
  );
};
