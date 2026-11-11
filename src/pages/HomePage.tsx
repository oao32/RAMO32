import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Theme } from '../types';
import { BrandHeroSection } from '../components/BrandHeroSection';
import { PricingPlansSection, PlanSelectionPayload } from '../components/PricingPlansSection';
import { SubscriptionCheckoutModal, PlanDetails } from '../components/SubscriptionCheckoutModal';
import {
  Shield,
  Zap,
  Target,
  Award,
  Flame,
  ArrowRight,
  User,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';

interface HomePageProps {
  language: Language;
  theme: Theme;
  onOpenAthleteLogin: () => void;
  onOpenCoachPasskey: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({
  language,
  theme,
  onOpenAthleteLogin,
  onOpenCoachPasskey,
}) => {
  const navigate = useNavigate();

  // Subscription Checkout Modal State for direct homepage plan clicks
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanDetails, setSelectedPlanDetails] = useState<PlanDetails>({
    id: 'platinum',
    nameAr: 'الباقة البلاتينية (VIP)',
    nameEn: 'Platinum VIP Package',
    priceMonthly: 450,
    priceYearly: 1450,
    selectedPrice: 450,
    durationKey: '3_months',
    tierSubtitleAr: 'التجربة التدريبية المتكاملة مع متابعة أسبوعية دقيقة، وتوجيه مباشر من الكوتش.',
    tierSubtitleEn: 'The complete coaching experience with weekly check-ins and direct coaching.',
    badgeTextAr: 'VIP PLATINUM',
    badgeTextEn: 'VIP PLATINUM',
  });

  const handleSelectPlan = (selection: PlanSelectionPayload) => {
    setSelectedPlanDetails({
      id: selection.planId,
      nameAr: selection.planNameAr,
      nameEn: selection.planNameEn,
      priceMonthly: selection.price,
      priceYearly: selection.price,
      selectedPrice: selection.price,
      durationKey: selection.durationKey,
      durationLabelAr: selection.durationLabelAr,
      durationLabelEn: selection.durationLabelEn,
      durationDays: selection.durationDays,
      tierSubtitleAr:
        selection.planId === 'platinum'
          ? 'التجربة التدريبية المتكاملة مع متابعة أسبوعية دقيقة، وتوجيه مباشر من الكوتش.'
          : 'الباقة المثالية لمن يمتلك الخبرة الأساسية ويفضل المتابعة الشهرية المنتظمة.',
      tierSubtitleEn:
        selection.planId === 'platinum'
          ? 'Complete coaching with weekly check-ins.'
          : 'Ideal for athletes preferring monthly check-ins.',
      badgeTextAr: selection.planId === 'platinum' ? 'VIP PLATINUM' : 'STANDARD',
      badgeTextEn: selection.planId === 'platinum' ? 'VIP PLATINUM' : 'STANDARD',
    });
    setIsCheckoutOpen(true);
  };

  return (
    <div className="w-full relative z-10">
      {/* 1. Official Brand Hero Section with Approved 3D Emblem */}
      <BrandHeroSection
        language={language}
        onEnterPortal={onOpenAthleteLogin}
        onOpenAdmin={onOpenCoachPasskey}
      />

      {/* 2. Philosophy & Transformation Value Pillars */}
      <section className="py-16 sm:py-20 px-4 sm:px-8 border-y border-white/5 bg-gradient-to-b from-[#070e24] via-[#0B132B]/80 to-[#070e24]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black tracking-widest text-orange-400 uppercase block mb-1">
              {language === 'ar' ? 'فلسفة التحول البدني' : 'TRANSFORMATION PILLARS'}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {language === 'ar' ? 'لماذا تختار منصة Own Aura Outcome؟' : 'Why Train with OAO?'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 font-medium mt-2">
              {language === 'ar'
                ? 'منهجية علمية مبنية على التخصيص الكامل بدون عشوائية تحت إشراف الكوتش عمر عدنان'
                : 'A scientifically validated coaching methodology built for sustainable body transformation.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-[#0B132B] border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">
                {language === 'ar' ? 'تخصيص دقيق 100%' : '100% Precision Customization'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'برنامجك التدريبي والغذائي يُصمم من الصفر بناءً على بنيتك، أهدافك، وجدولك اليومي دون أي قوالب مسبقة.'
                  : 'Workouts and nutrition designed specifically around your body, schedule, and equipment.'}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0B132B] border border-amber-500/20 hover:border-amber-500/40 transition-all shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">
                {language === 'ar' ? 'توثيق رسمي وحماية كاملة' : 'Certified Official Contracts'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'نموذج إقرار وتعهد رسمي يضمن حقوق المشترك والمدرب مع توليد فوري لوثيقة PDF معتمدة.'
                  : 'Official declarations and agreements with instant PDF download and legal binding protection.'}
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0B132B] border border-orange-500/20 hover:border-orange-500/40 transition-all shadow-lg group">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Award className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white mb-2">
                {language === 'ar' ? 'متابعة مباشرة مع الكوتش' : 'Direct Coach Supervision'}
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {language === 'ar'
                  ? 'تواصل مباشر مع الكوتش عمر عدنان لتعديل الأوزان، مراجعة الأداء بالفيديو، وتطوير النتائج.'
                  : 'Direct WhatsApp communication with Coach Omar Adnan for form checks and progression.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Pricing & Membership Packages Section */}
      <PricingPlansSection
        language={language}
        theme={theme}
        onSelectPlan={handleSelectPlan}
      />

      {/* 4. Standalone Subscription CTA Banner (Direct Route to /subscribe) */}
      <section className="py-12 px-4 sm:px-8 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 text-white select-none">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-right">
          <div>
            <span className="text-xs font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-2 inline-block">
              {language === 'ar' ? 'تسجيل مستقل وفوري' : 'INSTANT STANDALONE ENROLLMENT'}
            </span>
            <h3 className="text-2xl sm:text-3xl font-black">
              {language === 'ar'
                ? 'جاهز لبدء رحلة التغيير وتوثيق اشتراكك؟'
                : 'Ready to Begin Your Body Transformation?'}
            </h3>
            <p className="text-xs sm:text-sm text-white/90 mt-1 font-semibold">
              {language === 'ar'
                ? 'اختر باقتك، عبّئ الإقرار، ونزل وثيقة الـ PDF فوراً بدون الحاجة لحساب أو كلمة مرور'
                : 'Select your tier, sign the declaration, and download your PDF contract instantly.'}
            </p>
          </div>

          <button
            onClick={() => navigate('/subscribe')}
            className="px-8 py-4 rounded-2xl bg-[#0B132B] hover:bg-[#070e24] text-white font-black text-sm tracking-wider uppercase shadow-2xl flex items-center gap-3 transition-all hover:scale-105 active:scale-95 cursor-pointer shrink-0"
          >
            <span>{language === 'ar' ? 'بوابة الاشتراك وتوليد الإقرار (PDF)' : 'Go to Subscription Portal'}</span>
            <ArrowRight className="w-5 h-5 rtl:rotate-180 text-orange-400" />
          </button>
        </div>
      </section>

      {/* Modal for direct plan checkout clicks from PricingPlansSection */}
      <SubscriptionCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        selectedPlan={selectedPlanDetails}
        language={language}
        theme={theme}
      />
    </div>
  );
};
