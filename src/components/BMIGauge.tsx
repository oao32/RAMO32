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
}) => {
  // BMI calculation: weight / (heightInMeters ^ 2)
  const heightInMeters = height / 100;
  const bmi = heightInMeters > 0 ? +(weight / (heightInMeters * heightInMeters)).toFixed(1) : 24.3;

  // Gauge angle calculation (180 degree semi-circle: 15 to 35 BMI range)
  const minBMI = 15;
  const maxBMI = 35;
  const clampedBMI = Math.min(Math.max(bmi, minBMI), maxBMI);
  const percentage = (clampedBMI - minBMI) / (maxBMI - minBMI);
  const needleRotation = -90 + percentage * 180;

  // BMI status matching clinical classifications
  let statusAr = 'وزن مثالي وطبيعي';
  let statusEn = 'Optimal Fitness Weight';
  let statusBg = 'bg-[#04261C] border-[#10B981]/50 text-[#10B981]';

  if (bmi < 18.5) {
    statusAr = 'نقص في الوزن';
    statusEn = 'Underweight';
    statusBg = 'bg-[#041A2E] border-[#0284C7]/50 text-[#38BDF8]';
  } else if (bmi <= 24.9) {
    statusAr = 'وزن مثالي وطبيعي';
    statusEn = 'Optimal Fitness Weight';
    statusBg = 'bg-[#04261C] border-[#10B981]/50 text-[#10B981]';
  } else if (bmi <= 29.9) {
    statusAr = 'زيادة طفيفة في الوزن';
    statusEn = 'Overweight';
    statusBg = 'bg-[#2E1805] border-[#EA580C]/50 text-[#FB923C]';
  } else {
    statusAr = 'سمنة / كتلة مرتفعة';
    statusEn = 'Obese';
    statusBg = 'bg-[#2B0808] border-[#DC2626]/50 text-[#F87171]';
  }

  return (
    <div className="bg-[#070e24]/90 backdrop-blur-xl border border-white/10 rounded-3xl p-6 flex flex-col items-center justify-between shadow-2xl transition-all hover:border-orange-500/30 w-full select-none">
      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-500/10 border border-orange-500/40 flex items-center justify-center">
            <Activity className="w-4 h-4 text-orange-400 stroke-[2.5]" />
          </div>
          <h3 className="text-orange-400 font-black text-sm tracking-wide">
            {language === 'ar' ? 'مؤشر كتلة الجسم (BMI)' : 'Body Mass Index (BMI)'}
          </h3>
        </div>

        <span className="text-[11px] px-3 py-0.5 rounded-full bg-black/40 text-slate-300 border border-slate-700 font-bold shadow-xs">
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
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.6" />
            </filter>
          </defs>

          {/* Background Track Arc */}
          <path
            d="M 25 105 A 75 75 0 0 1 175 105"
            fill="none"
            stroke="rgba(255,255,255,0.08)"
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
          <circle cx="100" cy="105" r="10" fill="#040817" stroke="#EA580C" strokeWidth="3" />
          <circle cx="100" cy="105" r="4" fill="#EA580C" />
        </svg>
      </div>

      {/* Numeric BMI Value & Status Badge */}
      <div className="text-center space-y-2 mt-1">
        <div className="text-4xl font-black text-white font-mono tracking-tight drop-shadow-md">
          {bmi}
        </div>
        <div className={`text-xs font-black px-4 py-1.5 rounded-full border shadow-md inline-block ${statusBg}`}>
          {language === 'ar' ? statusAr : statusEn}
        </div>
      </div>

      {/* Ideal Target Weight Box (Matching Screenshot Bottom Card) */}
      <div className="w-full mt-5 bg-[#050C1F] border border-emerald-500/40 rounded-2xl p-4 text-center transition-all hover:border-emerald-500/70 shadow-lg">
        <div className="text-xs text-slate-300 font-bold flex items-center justify-center gap-2 mb-1">
          <div className="w-5 h-5 rounded-full bg-orange-500/15 border border-orange-500/40 flex items-center justify-center">
            <Target className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <span>{language === 'ar' ? 'الوزن المستهدف المثالي' : 'Ideal Target Weight'}</span>
        </div>
        <div className="text-2xl font-black text-emerald-400 tracking-wider font-mono flex items-center justify-center gap-1.5 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
          <span>{targetWeight}</span>
          <span className="text-xs font-black text-emerald-400">KG</span>
        </div>
      </div>
    </div>
  );
};
