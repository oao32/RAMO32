import React from 'react';
import { Language, Theme } from '../types';
import { Activity, Target } from 'lucide-react';

interface BMIGaugeProps {
  weight: number; // in KG
  height: number; // in CM
  targetWeight: number; // in KG
  language: Language;
  theme?: Theme;
}

export const BMIGauge: React.FC<BMIGaugeProps> = ({
  weight,
  height,
  targetWeight,
  language,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const heightInMeters = height / 100;
  const bmi = heightInMeters > 0 ? +(weight / (heightInMeters * heightInMeters)).toFixed(1) : 24.3;

  const minBMI = 15;
  const maxBMI = 35;
  const clampedBMI = Math.min(Math.max(bmi, minBMI), maxBMI);
  const percentage = (clampedBMI - minBMI) / (maxBMI - minBMI);
  const needleRotation = -90 + percentage * 180;

  let statusAr = 'وزن مثالي وطبيعي';
  let statusEn = 'Optimal Fitness Weight';
  let statusBg = isLight
    ? 'bg-emerald-50 border-emerald-400/70 text-emerald-800'
    : 'bg-[#04261C] border-[#10B981]/50 text-[#10B981]';

  if (bmi < 18.5) {
    statusAr = 'نقص في الوزن';
    statusEn = 'Underweight';
    statusBg = isLight
      ? 'bg-sky-50 border-sky-400/70 text-sky-800'
      : 'bg-[#041A2E] border-[#0284C7]/50 text-[#38BDF8]';
  } else if (bmi <= 24.9) {
    statusAr = 'وزن مثالي وطبيعي';
    statusEn = 'Optimal Fitness Weight';
    statusBg = isLight
      ? 'bg-emerald-50 border-emerald-400/70 text-emerald-800'
      : 'bg-[#04261C] border-[#10B981]/50 text-[#10B981]';
  } else if (bmi <= 29.9) {
    statusAr = 'زيادة طفيفة في الوزن';
    statusEn = 'Overweight';
    statusBg = isLight
      ? 'bg-orange-50 border-orange-400/70 text-orange-800'
      : 'bg-[#2E1805] border-[#EA580C]/50 text-[#FB923C]';
  } else {
    statusAr = 'سمنة / كتلة مرتفعة';
    statusEn = 'Obese';
    statusBg = isLight
      ? 'bg-rose-50 border-rose-400/70 text-rose-800'
      : 'bg-[#2B0808] border-[#DC2626]/50 text-[#F87171]';
  }

  return (
    <div
      className={`border rounded-3xl p-6 flex flex-col items-center justify-between transition-all w-full select-none ${
        isLight
          ? 'bg-[#FAFBFD] border-slate-300 shadow-md hover:border-orange-500/50'
          : 'bg-[#070e24]/90 backdrop-blur-xl border-white/10 shadow-2xl hover:border-orange-500/30'
      }`}
    >
      {/* Top Header Bar */}
      <div
        className={`w-full flex items-center justify-between pb-3 border-b ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}
      >
        <div className="flex items-center gap-2">
          <div
            className={`w-7 h-7 rounded-full border flex items-center justify-center ${
              isLight
                ? 'bg-orange-100 border-orange-300 text-[#EA580C]'
                : 'bg-orange-500/10 border-orange-500/40 text-orange-400'
            }`}
          >
            <Activity className="w-4 h-4 stroke-[2.5]" />
          </div>
          <h3 className="text-[#EA580C] dark:text-orange-400 font-black text-sm tracking-wide">
            {language === 'ar' ? 'مؤشر كتلة الجسم (BMI)' : 'Body Mass Index (BMI)'}
          </h3>
        </div>

        <span
          className={`text-[11px] px-3 py-0.5 rounded-full border font-bold shadow-xs ${
            isLight
              ? 'bg-slate-100 text-slate-700 border-slate-300'
              : 'bg-black/40 text-slate-300 border-slate-700'
          }`}
        >
          WHO Standard
        </span>
      </div>

      {/* Speedometer Gauge Visual */}
      <div className="relative w-56 h-32 flex items-end justify-center overflow-hidden my-3">
        <svg viewBox="0 0 200 115" className="w-full h-full">
          <defs>
            <linearGradient id="bmiArcGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00A3FF" />
              <stop offset="25%" stopColor="#00D2D3" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="75%" stopColor="#EA580C" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
            <filter id="gaugeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity={isLight ? '0.2' : '0.6'} />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke={isLight ? 'rgba(15,23,42,0.12)' : 'rgba(255,255,255,0.08)'}
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Glowing Gradient Colored Arc */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke="url(#bmiArcGrad)"
            strokeWidth="14"
            strokeLinecap="round"
            filter="url(#gaugeGlow)"
          />

          {/* Needle Indicator */}
          <g transform={`rotate(${needleRotation} 100 105)`}>
            <line
              x1="100"
              y1="105"
              x2="100"
              y2="38"
              stroke="#EA580C"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>

          {/* Center Hub: Concentric Circles with Orange Dot */}
          <circle
            cx="100"
            cy="105"
            r="10"
            fill={isLight ? '#FFFFFF' : '#040817'}
            stroke="#EA580C"
            strokeWidth="3"
          />
          <circle cx="100" cy="105" r="4" fill="#EA580C" />
        </svg>
      </div>

      {/* Numeric BMI Value & Status Badge */}
      <div className="text-center space-y-2 mt-1">
        <div
          className={`text-4xl font-black font-mono tracking-tight ${
            isLight ? 'text-[#0B132B]' : 'text-white drop-shadow-md'
          }`}
        >
          {bmi}
        </div>
        <div className={`text-xs font-black px-4 py-1.5 rounded-full border shadow-sm inline-block ${statusBg}`}>
          {language === 'ar' ? statusAr : statusEn}
        </div>
      </div>

      {/* Ideal Target Weight Box */}
      <div
        className={`w-full mt-5 border rounded-2xl p-4 text-center transition-all ${
          isLight
            ? 'bg-emerald-50/70 border-emerald-400/50 hover:border-emerald-500 shadow-xs'
            : 'bg-[#050C1F] border-emerald-500/40 hover:border-emerald-500/70 shadow-lg'
        }`}
      >
        <div
          className={`text-xs font-bold flex items-center justify-center gap-2 mb-1 ${
            isLight ? 'text-slate-700' : 'text-slate-300'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border flex items-center justify-center ${
              isLight
                ? 'bg-orange-100 border-orange-300 text-[#EA580C]'
                : 'bg-orange-500/15 border-orange-500/40 text-orange-400'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
          </div>
          <span>{language === 'ar' ? 'الوزن المستهدف المثالي' : 'Ideal Target Weight'}</span>
        </div>
        <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 tracking-wider font-mono flex items-center justify-center gap-1.5">
          <span>{targetWeight}</span>
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400">KG</span>
        </div>
      </div>
    </div>
  );
};
