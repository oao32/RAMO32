import React from 'react';
import { Language } from '../types';

interface TickerBannerProps {
  language: Language;
}

export const TickerBanner: React.FC<TickerBannerProps> = ({ language }) => {
  const arabicQuotes = [
    'هنا نصنع القوة . . . وهنا تبدأ قصتك الجديدة',
    'طاقتك ملكك، ونتيجتك اختيارك',
    'هنا، الألم مؤقت . . . والفخر دائم',
    'هنا نصنع الأبطال، لا الأعذار',
    'امتلك حضورك، سيطر على طاقتك، وحقق نتيجتك',
    'لا حدود . . . لا توقف . . . فقط . . . AURA',
  ];

  const englishQuotes = [
    'Here we forge strength . . . and here your story begins',
    'Your energy is yours, your outcome is your choice',
    'Pain is temporary . . . Pride is forever',
    'We build champions, not excuses',
    'Own your aura, master your energy, conquer your outcome',
    'No limits . . . No stopping . . . Only AURA',
  ];

  const quotes = language === 'ar' ? arabicQuotes : englishQuotes;

  return (
    <div className="w-full bg-[#070a14] border-b border-orange-500/20 text-xs overflow-hidden py-2 select-none relative z-20 shadow-md">
      <div className={`flex whitespace-nowrap ${language === 'ar' ? 'animate-ticker-rtl' : 'animate-ticker-ltr'}`}>
        {[...quotes, ...quotes, ...quotes].map((quote, idx) => (
          <div key={idx} className="flex items-center mx-6 text-slate-300 font-medium tracking-wide">
            <span className="w-2 h-2 rounded-full bg-orange-500 mr-2 ml-2 shadow-[0_0_8px_#f97316] inline-block animate-ping" />
            <span className="hover:text-orange-400 transition-colors cursor-default">{quote}</span>
            <span className="text-orange-500/60 font-bold ml-6 mr-6">✦</span>
          </div>
        ))}
      </div>
    </div>
  );
};
