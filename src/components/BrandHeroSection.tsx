import React from 'react';
import { Language } from '../types';
import emblemImg from '../assets/images/logo.png';
import { Sparkles, Dumbbell, Shield, Flame, Zap } from 'lucide-react';

interface BrandHeroSectionProps {
  onEnterPortal: () => void;
  onOpenAdmin?: () => void;
  language: Language;
}

export const BrandHeroSection: React.FC<BrandHeroSectionProps> = ({
  onEnterPortal,
  language,
}) => {
  return (
    <section className="relative w-full py-16 px-4 sm:px-8 overflow-hidden bg-gradient-to-b from-[#070b19] via-[#0b132b] to-[#030712] border-b border-orange-500/20 select-none">
      {/* Dynamic Background Aura Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-orange-600/20 via-orange-500/10 to-blue-900/15 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
        {/* Top Tagline Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-extrabold text-xs tracking-widest uppercase mb-6 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>{language === 'ar' ? 'الهوية الرياضية الرسمية المعتمدة' : 'Official Athletic Brand Identity'}</span>
        </div>

        {/* ================= OFFICIAL APPROVED EMBLEM DISPLAY ================= */}
        <div className="relative my-4 flex flex-col items-center justify-center">
          <div className="relative rounded-3xl p-4 sm:p-8 flex items-center justify-center w-full max-w-2xl bg-[#0b132b]/80 border border-orange-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.7)] backdrop-blur-xl">
            <div className="relative w-64 h-64 sm:w-80 sm:h-80 flex items-center justify-center select-none group py-4">
              <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/30 via-orange-500/20 to-blue-900/30 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700 pointer-events-none" />
              <img
                src={emblemImg}
                alt="OWN AURA OUTCOME Official 3D Emblem"
                className="w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] drop-shadow-[0_0_40px_rgba(249,115,22,0.6)] transform transition-all duration-500 group-hover:scale-105"
              />
            </div>

            {/* Glowing Accent Badge */}
            <div className="absolute -top-3 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 text-white font-mono text-[10px] font-black uppercase tracking-wider shadow-lg border border-orange-300/40">
              OAO OFFICIAL ICON
            </div>
          </div>
        </div>

        {/* Title & Brand Ethos */}
        <div className="mt-8 space-y-3 max-w-3xl">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-wider text-white flex flex-wrap items-center justify-center gap-2 sm:gap-4 select-none">
            <span className="text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">OWN</span>
            <span className="inline-block px-3 sm:px-5 py-0.5 sm:py-1 rounded-xl bg-gradient-to-r from-slate-100 via-white to-slate-200 text-[#07182E] border-2 border-slate-300 shadow-[0_0_25px_rgba(255,255,255,0.3)] transform -rotate-1 hover:rotate-0 transition-transform">
              AURA
            </span>
            <span className="text-orange-500 drop-shadow-[0_0_25px_#f97316]">OUTCOME</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-300 font-semibold max-w-xl mx-auto leading-relaxed">
            {language === 'ar'
              ? 'نظام رياضي نخبوي مصمم لتحويل الجينات إلى قوة عضلية حقيقية تحت إشراف الكوتش عمر عدنان.'
              : 'Elite training system engineered to forge real muscle hypertrophy and championship presence.'}
          </p>
        </div>

        {/* The 3 Pillars of OAO (Derived from the Logo Words) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-10 w-full max-w-4xl text-start">
          {/* Pillar 1: OWN */}
          <div className="bg-[#0b132b]/80 border border-orange-500/25 rounded-2xl p-5 hover:border-orange-500/60 transition-all hover:scale-[1.02] shadow-lg group">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-xl bg-orange-500/10 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <Shield className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs font-black text-orange-500 tracking-widest">PILLAR 01</span>
            </div>
            <h3 className="text-lg font-black text-white">
              {language === 'ar' ? 'OWN - امتلاك الانضباط' : 'OWN - Mastery & Discipline'}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {language === 'ar'
                ? 'السيطرة الكاملة على عاداتك اليومية، التزامك بالأوزان والتمارين، وعدم ترك أي مجال للأعذار.'
                : 'Absolute ownership of daily habits, training adherence, progressive overload, and no excuses.'}
            </p>
          </div>

          {/* Pillar 2: AURA */}
          <div className="bg-[#0b132b]/80 border border-orange-500/40 rounded-2xl p-5 hover:border-orange-500 transition-all hover:scale-[1.02] shadow-[0_0_25px_rgba(249,115,22,0.15)] group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-xl bg-orange-500/20 text-orange-400 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                <Flame className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs font-black text-orange-400 tracking-widest">PILLAR 02</span>
            </div>
            <h3 className="text-lg font-black text-orange-400">
              {language === 'ar' ? 'AURA - الهيبة والطاقة' : 'AURA - Energy & Presence'}
            </h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">
              {language === 'ar'
                ? 'حضور بدني طاغٍ يعكس قوة الشخصية والطاقة الإيجابية التي تملأ الصالة فور دخولك.'
                : 'Commanding physical presence and magnetic energy radiating from elite conditioning.'}
            </p>
          </div>

          {/* Pillar 3: OUTCOME */}
          <div className="bg-[#0b132b]/80 border border-orange-500/25 rounded-2xl p-5 hover:border-orange-500/60 transition-all hover:scale-[1.02] shadow-lg group">
            <div className="flex items-center justify-between mb-3">
              <span className="p-2 rounded-xl bg-blue-500/10 text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <Dumbbell className="w-5 h-5" />
              </span>
              <span className="font-mono text-xs font-black text-blue-400 tracking-widest">PILLAR 03</span>
            </div>
            <h3 className="text-lg font-black text-white">
              {language === 'ar' ? 'OUTCOME - النتيجة الفائقة' : 'OUTCOME - Real Transformation'}
            </h3>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
              {language === 'ar'
                ? 'أرقام ملموسة: زيادة الكتلة العضلية، خفض نسبة الدهون، وبناء الجسم الذي طالما حلمت به.'
                : 'Concrete measurable outcome: lean hypertrophy, low body fat %, and undeniable strength.'}
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onEnterPortal}
            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(249,115,22,0.8)] border border-orange-300/60 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4 fill-white" />
            <span>{language === 'ar' ? 'دخول بوابة المشترك' : 'Enter Athlete Portal'}</span>
          </button>
        </div>
      </div>
    </section>
  );
};
