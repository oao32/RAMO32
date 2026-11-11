import React from 'react';
import { Crown } from 'lucide-react';
import { Language } from '../types';

interface VIPBadgeProps {
  variant?: 'compact' | 'hero';
  language?: Language;
  className?: string;
}

export const VIPBadge: React.FC<VIPBadgeProps> = ({
  variant = 'compact',
  language = 'ar',
  className = '',
}) => {
  if (variant === 'hero') {
    return (
      <div
        className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#1A1305] via-[#2A1D06] to-[#1A1305] border border-amber-400/70 text-amber-300 shadow-[0_0_24px_rgba(245,158,11,0.28)] whitespace-nowrap shrink-0 ${className}`}
      >
        <Crown className="w-4 h-4 text-amber-400 fill-amber-400/30 shrink-0" />
        <span className="text-xs font-black tracking-wider text-amber-200">
          {language === 'ar' ? 'عضوية النخبة VIP' : 'PLATINUM VIP MEMBER'}
        </span>
      </div>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-[#0B132B] border border-amber-200/80 font-black text-[11px] tracking-wider shadow-[0_0_14px_rgba(245,158,11,0.35)] whitespace-nowrap shrink-0 ${className}`}
    >
      <Crown className="w-3 h-3 text-[#0B132B] fill-[#0B132B]/25 shrink-0" />
      <span>VIP</span>
    </span>
  );
};
