import React from 'react';

interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
}) => {
  const sizeMap = {
    sm: { box: 'w-9 h-9', textTitle: 'text-xs', subText: 'text-[8px]' },
    md: { box: 'w-24 h-24 sm:w-28 sm:h-28', textTitle: 'text-lg sm:text-xl', subText: 'text-[9px]' },
    lg: { box: 'w-36 h-36 sm:w-44 sm:h-44', textTitle: 'text-2xl sm:text-3xl', subText: 'text-xs' },
    xl: { box: 'w-56 h-56 sm:w-64 sm:h-64', textTitle: 'text-3xl sm:text-4xl', subText: 'text-sm' },
  };

  const currentSize = sizeMap[size];

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* 3D Chrome Flexed Arm Logo Badge */}
      <div className={`relative ${currentSize.box} flex items-center justify-center group`}>
        {/* Glowing Orange/Cyan Aura Backlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/40 via-orange-500/25 to-cyan-500/20 rounded-full blur-lg animate-pulse group-hover:scale-125 transition-transform duration-500 pointer-events-none" />

        {/* Transparent Badge with Real Transparent Logo */}
        <div className="relative w-full h-full rounded-2xl p-1 bg-black/40 border border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.4)] group-hover:border-orange-400 transition-all duration-300 flex items-center justify-center">
          <img
            src="/logo.png"
            alt="OWN AURA OUTCOME 3D Flexed Arm Logo"
            className="w-full h-full object-contain filter drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] transform transition-transform duration-500 group-hover:scale-105"
          />
        </div>
      </div>

      {/* Typography with 3D athletic brand aesthetic */}
      {showText && (
        <div className="mt-2 text-center flex flex-col items-center select-none">
          <div className="text-[10px] md:text-xs tracking-[0.35em] uppercase font-extrabold text-white">
            OWN
          </div>
          <div className="my-1 px-3 py-0.5 rounded-md bg-gradient-to-r from-slate-100 via-white to-slate-200 text-[#07182E] font-black tracking-widest uppercase border border-slate-300 shadow-md">
            <span className={currentSize.textTitle}>AURA</span>
          </div>
          <div className="text-[9px] md:text-[11px] tracking-[0.4em] uppercase font-bold text-[#EA580C]">
            OUTCOME
          </div>
        </div>
      )}
    </div>
  );
};
