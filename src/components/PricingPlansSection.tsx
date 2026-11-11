import React, { useState } from 'react';
import { Language, SubscriptionDurationKey, Theme } from '../types';
import {
  Check,
  Zap,
  Crown,
  Shield,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Minus,
  Calendar,
  CalendarCheck2,
  Award,
  Gift,
} from 'lucide-react';

export interface PlanSelectionPayload {
  planId: 'standard' | 'platinum';
  planNameAr: string;
  planNameEn: string;
  durationKey: SubscriptionDurationKey;
  durationLabelAr: string;
  durationLabelEn: string;
  durationDays: number;
  price: number;
}

interface PricingPlansSectionProps {
  language: Language;
  onSelectPlan: (selection: PlanSelectionPayload) => void;
  theme?: Theme;
}

interface PlanDurationOption {
  key: SubscriptionDurationKey;
  monthsLabelAr: string;
  monthsLabelEn: string;
  days: number;
  price: number;
  formattedPrice: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const PricingPlansSection: React.FC<PricingPlansSectionProps> = ({
  language,
  onSelectPlan,
}) => {
  const [selectedDurations, setSelectedDurations] = useState<
    Record<'standard' | 'platinum', SubscriptionDurationKey>
  >({
    standard: '3_months',
    platinum: '6_months',
  });
  const [showComparisonTable, setShowComparisonTable] = useState(true);

  const plans: Array<{
    id: 'standard' | 'platinum';
    nameAr: string;
    nameEn: string;
    tierSubtitleAr: string;
    tierSubtitleEn: string;
    promoNoteAr?: string;
    promoNoteEn?: string;
    optionsHeadingAr: string;
    optionsHeadingEn: string;
    isVip: boolean;
    icon: React.ComponentType<{ className?: string }>;
    features: Array<{
      titleAr: string;
      descAr: string;
      titleEn: string;
      descEn: string;
    }>;
    durations: PlanDurationOption[];
    borderClass: string;
    bgClass: string;
    buttonClass: string;
  }> = [
    {
      id: 'standard',
      nameAr: 'الباقة القياسية (Standard)',
      nameEn: 'Standard Package',
      tierSubtitleAr:
        'الباقة المثالية لمن يمتلك الخبرة الأساسية ويفضل المتابعة الشهرية المنتظمة.',
      tierSubtitleEn:
        'The ideal package for athletes with foundational experience who prefer regular monthly check-ins.',
      optionsHeadingAr: 'خيارات الاشتراك:',
      optionsHeadingEn: 'Subscription Options:',
      isVip: false,
      icon: Shield,
      features: [
        {
          titleAr: 'التقييم الشامل:',
          descAr:
            'تقييم البنية العضلية، تحديد الاحتياج اليومي من التغذية، بروتوكول التدريب، وخطة الاستشفاء.',
          titleEn: 'Comprehensive Assessment:',
          descEn:
            'Muscular structure evaluation, daily nutritional needs calculation, training protocol, and recovery plan.',
        },
        {
          titleAr: 'النظام الغذائي:',
          descAr: 'تصميم النظام الغذائي مع التحديث والتغيير شهرياً.',
          titleEn: 'Nutrition Plan:',
          descEn: 'Custom diet design with monthly updates and adjustments.',
        },
        {
          titleAr: 'جدول التمارين:',
          descAr: 'تغيير وتحديث جدول التمارين شهرياً (حسب الخطة والتطور).',
          titleEn: 'Workout Schedule:',
          descEn: 'Monthly workout routine updates tailored to your plan and progress.',
        },
        {
          titleAr: 'نظام المتابعة:',
          descAr: 'متابعة شهرية.',
          titleEn: 'Follow-up System:',
          descEn: 'Structured monthly check-ins.',
        },
        {
          titleAr: 'تجميد الاشتراك:',
          descAr:
            'توقيف الاشتراك في حالات الطوارئ فقط (مرة واحدة لاشتراك 6 شهور / مرتين لاشتراك السنة).',
          titleEn: 'Subscription Freeze:',
          descEn:
            'Emergency pause only (once for 6-month plans / twice for full-year plans).',
        },
        {
          titleAr: 'نقل الاشتراك:',
          descAr: 'إمكانية تحويل أو بيع الاشتراك (متاحة لاشتراك السنة فقط).',
          titleEn: 'Subscription Transfer:',
          descEn: 'Option to transfer or resell your membership (available for 1-year plans only).',
        },
      ],
      durations: [
        {
          key: '3_months',
          monthsLabelAr: '3 شهور',
          monthsLabelEn: '3 Months',
          days: 90,
          price: 200,
          formattedPrice: '200',
          icon: Calendar,
        },
        {
          key: '6_months',
          monthsLabelAr: '6 شهور',
          monthsLabelEn: '6 Months',
          days: 180,
          price: 350,
          formattedPrice: '350',
          icon: CalendarCheck2,
        },
        {
          key: '12_months',
          monthsLabelAr: 'سنة كاملة',
          monthsLabelEn: 'Full Year',
          days: 365,
          price: 600,
          formattedPrice: '600',
          icon: Award,
        },
      ],
      borderClass:
        'border-slate-300 dark:border-slate-500/40 hover:border-orange-500/50 dark:hover:border-slate-300/60 hover:shadow-[0_8px_35px_rgba(11,19,43,0.12)] dark:hover:shadow-[0_0_35px_rgba(148,163,184,0.2)]',
      bgClass:
        'bg-[#FAFBFD] dark:bg-gradient-to-b dark:from-slate-900/75 dark:via-[#0B132B]/90 dark:to-[#030712]/95 shadow-lg',
      buttonClass:
        'bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:from-orange-600 hover:to-orange-500 text-white border border-slate-300 dark:border-white/20 shadow-md font-black',
    },
    {
      id: 'platinum',
      nameAr: 'الباقة البلاتينية (Platinum VIP)',
      nameEn: 'Platinum VIP Package',
      tierSubtitleAr:
        'التجربة التدريبية المتكاملة مع متابعة أسبوعية دقيقة، توجيه مباشر، ونظام تحفيز ومكافآت.',
      tierSubtitleEn:
        'The complete coaching experience with precise weekly check-ins, direct guidance, and a gamified rewards system.',
      promoNoteAr: 'خصم خاص 5% حصري على هذه الباقة',
      promoNoteEn: 'Exclusive 5% special discount on this package',
      optionsHeadingAr: 'خيارات الاشتراك (شاملة خصم 5%):',
      optionsHeadingEn: 'Subscription Options (Includes 5% Discount):',
      isVip: true,
      icon: Crown,
      features: [
        {
          titleAr: 'التقييم الشامل:',
          descAr:
            'تقييم البنية العضلية، تحديد الاحتياج اليومي من التغذية، بروتوكول التدريب، وخطة الاستشفاء.',
          titleEn: 'Comprehensive Assessment:',
          descEn:
            'Muscular structure evaluation, daily nutritional needs calculation, training protocol, and recovery plan.',
        },
        {
          titleAr: 'التغذية والتمارين:',
          descAr:
            'نظام غذائي مخصص مع تغيير شهري + مرونة تغيير جدول التمارين حسب الأدوات المتوفرة لديك.',
          titleEn: 'Nutrition & Workouts:',
          descEn:
            'Custom diet with monthly updates + flexible workout adjustments based on your available equipment.',
        },
        {
          titleAr: 'المكتبة التفاعلية:',
          descAr: 'شرح فيديو للتمارين، تسجيل الأوزان، ومؤقت الراحة بين الجلسات.',
          titleEn: 'Interactive Library:',
          descEn: 'Video exercise demonstrations, weight logging, and built-in rest timer between sets.',
        },
        {
          titleAr: 'المتابعة المباشرة:',
          descAr:
            'متابعة أسبوعية وشهرية + إمكانية متابعة التدريب مباشرة لأيام محددة (في اشتراكات 6 شهور والسنة).',
          titleEn: 'Direct Coaching:',
          descEn:
            'Weekly & monthly check-ins + live training supervision on selected days (for 6-month & 1-year plans).',
        },
        {
          titleAr: 'التواصل الفوري:',
          descAr: 'الرد المباشر على كافة الاستفسارات.',
          titleEn: 'Instant Communication:',
          descEn: 'Direct priority responses to all your inquiries.',
        },
        {
          titleAr: 'نظام التحفيز والتحديات:',
          descAr: 'سلسلة الالتزام الرياضي (النقاط) + تحديات ومكافآت.',
          titleEn: 'Motivation & Challenges:',
          descEn: 'Athletic commitment streak points + exclusive challenges and rewards.',
        },
        {
          titleAr: 'جدول تمارين الطوارئ:',
          descAr: 'خطط بديلة مخصصة للسفر، أو انتهاء اشتراك النادي، وغيرها.',
          titleEn: 'Contingency Workouts:',
          descEn: 'Dedicated backup routines for travel, gym membership breaks, and busy schedules.',
        },
        {
          titleAr: 'مرونة التجميد:',
          descAr: 'إمكانية توقيف الاشتراك متعددة حسب مدة الاشتراك.',
          titleEn: 'Flexible Freeze:',
          descEn: 'Multiple membership pause allowances scaled to your subscription duration.',
        },
        {
          titleAr: 'نقل الاشتراك:',
          descAr: 'إمكانية تحويل أو بيع الاشتراك (متاحة لاشتراكات 6 شهور وأكثر).',
          titleEn: 'Subscription Transfer:',
          descEn: 'Option to transfer or resell your membership (available for 6-month plans and above).',
        },
      ],
      durations: [
        {
          key: '3_months',
          monthsLabelAr: '3 شهور',
          monthsLabelEn: '3 Months',
          days: 90,
          price: 450,
          formattedPrice: '450',
          icon: Calendar,
        },
        {
          key: '6_months',
          monthsLabelAr: '6 شهور',
          monthsLabelEn: '6 Months',
          days: 180,
          price: 800,
          formattedPrice: '800',
          icon: CalendarCheck2,
        },
        {
          key: '12_months',
          monthsLabelAr: 'سنة كاملة',
          monthsLabelEn: 'Full Year',
          days: 365,
          price: 1450,
          formattedPrice: '1,450',
          icon: Award,
        },
      ],
      borderClass:
        'border-[#FF5722] shadow-[0_6px_35px_rgba(255,87,34,0.22)] dark:shadow-[0_0_45px_rgba(255,87,34,0.32)] hover:shadow-[0_0_55px_rgba(255,87,34,0.48)] hover:border-[#FF7043]',
      bgClass:
        'bg-[#FAFBFD] dark:bg-gradient-to-b dark:from-[#1C2541]/95 dark:via-[#0B132B]/95 dark:to-[#070A14] relative overflow-hidden ring-1 ring-orange-500/25',
      buttonClass:
        'bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-amber-400 text-white shadow-[0_0_25px_rgba(255,87,34,0.55)] border border-orange-300/40 font-black',
    },
  ];

  const handleChooseDuration = (planId: 'standard' | 'platinum', key: SubscriptionDurationKey) => {
    setSelectedDurations((prev) => ({ ...prev, [planId]: key }));
  };

  const triggerCheckout = (planId: 'standard' | 'platinum', overrideDuration?: SubscriptionDurationKey) => {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const chosenKey = overrideDuration || selectedDurations[planId];
    const durationObj = plan.durations.find((d) => d.key === chosenKey) || plan.durations[0];

    onSelectPlan({
      planId: plan.id,
      planNameAr: plan.nameAr,
      planNameEn: plan.nameEn,
      durationKey: durationObj.key,
      durationLabelAr: durationObj.monthsLabelAr,
      durationLabelEn: durationObj.monthsLabelEn,
      durationDays: durationObj.days,
      price: durationObj.price,
    });
  };

  return (
    <section
      id="plans"
      className="relative w-full py-20 px-4 sm:px-8 bg-gradient-to-b from-[#EEF2F6] via-[#E8EDF5] to-[#EEF2F6] dark:from-[#030712] dark:via-[#070A14] dark:to-[#0B132B] overflow-hidden select-none transition-colors duration-300"
    >
      {/* Background Ambient Glow Orbs */}
      <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-700/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-14">
          <p className="text-xs sm:text-sm font-extrabold text-orange-600 dark:text-orange-400 tracking-wide mb-2">
            {language === 'ar'
              ? 'باقات العضوية والاستثمار الرياضي'
              : 'Membership Pricing & Coaching Packages'}
          </p>

          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-[#0B132B] dark:text-white">
            <span>
              {language === 'ar' ? 'اختر باقة التدريب ' : 'Choose the Coaching Tier '}
            </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7043] via-amber-400 to-[#FF5722]">
              {language === 'ar' ? 'المناسبة لك' : 'Built For You'}
            </span>
          </h2>

          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 font-semibold mt-3 max-w-xl mx-auto">
            {language === 'ar'
              ? 'باقتان مصممتان بعناية لتلبية احتياجك التدريبي والغذائي مع خيارات اشتراك مرنة لمدة 3 شهور، 6 شهور، أو سنة كاملة'
              : 'Two precision-crafted coaching tiers with flexible 3-month, 6-month, and full-year enrollment options.'}
          </p>
        </div>

        {/* 2 Pricing Cards Grid: Standard & Platinum VIP */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {plans.map((plan) => {
            const TierIcon = plan.icon;
            const activeDurationKey = selectedDurations[plan.id];
            const activeDuration =
              plan.durations.find((d) => d.key === activeDurationKey) || plan.durations[0];

            return (
              <div
                key={plan.id}
                className={`flex flex-col justify-between rounded-3xl p-6 sm:p-8 backdrop-blur-xl border transition-all duration-300 hover:-translate-y-1.5 ${plan.borderClass} ${plan.bgClass}`}
              >
                {/* 1. الفئة (Tier Header & Subtitle) */}
                <div>
                  <div className="pb-5 mb-6 border-b border-slate-300/80 dark:border-white/10">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5">
                        <div
                          className={`p-3 rounded-2xl shrink-0 shadow-md ${
                            plan.isVip
                              ? 'bg-gradient-to-br from-[#FF5722] to-amber-500 text-white shadow-[0_0_20px_rgba(255,87,34,0.45)]'
                              : 'bg-gradient-to-br from-[#0B132B] to-[#1C2541] text-slate-200 border border-slate-500/30'
                          }`}
                        >
                          <TierIcon className="w-6 h-6" />
                        </div>
                        <div>
                          <h3 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white">
                            {language === 'ar' ? plan.nameAr : plan.nameEn}
                          </h3>
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 font-semibold leading-relaxed">
                            {language === 'ar' ? plan.tierSubtitleAr : plan.tierSubtitleEn}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Exclusive 5% Discount Highlight on VIP */}
                    {plan.promoNoteAr && (
                      <div className="mt-4 flex items-center gap-2 text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400">
                        <Gift className="w-4 h-4 shrink-0 text-[#FF5722] dark:text-amber-400" />
                        <span>
                          {language === 'ar' ? plan.promoNoteAr : plan.promoNoteEn}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 2. المميزات المذكورة تحت الفئة (Exact Features from PDF) */}
                  <div className="mb-8">
                    <h4 className="text-xs sm:text-sm font-black text-orange-600 dark:text-orange-400 mb-4">
                      {language === 'ar' ? 'المميزات والإمكانيات:' : 'Features & Capabilities:'}
                    </h4>

                    <ul className="space-y-3.5 text-xs sm:text-sm">
                      {plan.features.map((feat, idx) => (
                        <li
                          key={idx}
                          className="flex items-start gap-2.5 text-[#0B132B] dark:text-slate-200 leading-relaxed"
                        >
                          <span
                            className={`mt-1 p-1 rounded-full shrink-0 shadow-xs ${
                              plan.isVip
                                ? 'bg-gradient-to-br from-[#FF5722] to-amber-500 text-white'
                                : 'bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-1 ring-orange-500/30 text-orange-400'
                            }`}
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </span>
                          <div>
                            <strong className="font-black text-[#0B132B] dark:text-white">
                              {language === 'ar' ? feat.titleAr : feat.titleEn}
                            </strong>{' '}
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              {language === 'ar' ? feat.descAr : feat.descEn}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. ثلاث أيقونات فيها عدد الشهور والسعر + زر الاشتراك */}
                <div className="pt-5 border-t border-slate-300/80 dark:border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-black text-[#0B132B] dark:text-white">
                      {language === 'ar' ? plan.optionsHeadingAr : plan.optionsHeadingEn}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      {language === 'ar' ? 'اختر المدة المناسبة' : 'Select duration'}
                    </span>
                  </div>

                  {/* Three Interactive Duration & Price Icon Buttons */}
                  <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
                    {plan.durations.map((dur) => {
                      const DurIcon = dur.icon;
                      const isSelected = activeDurationKey === dur.key;

                      return (
                        <button
                          key={dur.key}
                          type="button"
                          onClick={() => handleChooseDuration(plan.id, dur.key)}
                          className={`relative rounded-2xl p-3 sm:p-4 text-center border transition-all duration-200 cursor-pointer flex flex-col items-center justify-center gap-1.5 ${
                            isSelected
                              ? plan.isVip
                                ? 'bg-gradient-to-b from-[#FF5722]/20 to-amber-500/10 border-[#FF5722] ring-2 ring-[#FF5722]/50 shadow-[0_0_20px_rgba(255,87,34,0.25)] scale-[1.02]'
                                : 'bg-gradient-to-b from-orange-500/15 to-[#0B132B]/10 dark:from-orange-500/20 dark:to-white/5 border-orange-500 ring-2 ring-orange-500/40 shadow-md scale-[1.02]'
                              : 'bg-white/80 dark:bg-black/35 border-slate-300/90 dark:border-white/10 hover:border-orange-500/50'
                          }`}
                        >
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-gradient-to-br from-[#FF5722] to-amber-500 text-white shadow-sm'
                                : 'bg-slate-200/80 dark:bg-white/10 text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <DurIcon className="w-4 h-4" />
                          </div>

                          <span className="text-xs sm:text-sm font-black text-[#0B132B] dark:text-white mt-0.5">
                            {language === 'ar' ? dur.monthsLabelAr : dur.monthsLabelEn}
                          </span>

                          <div className="flex items-baseline justify-center gap-1 font-mono tabular-nums">
                            <span
                              className={`text-base sm:text-xl font-black ${
                                isSelected
                                  ? 'text-orange-600 dark:text-amber-400'
                                  : 'text-[#0B132B] dark:text-slate-200'
                              }`}
                            >
                              {dur.formattedPrice}
                            </span>
                            <span className="text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
                              {language === 'ar' ? 'ريال' : 'SAR'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Primary Subscribe CTA Button */}
                  <button
                    type="button"
                    onClick={() => triggerCheckout(plan.id)}
                    className={`w-full py-3.5 px-5 rounded-2xl text-xs sm:text-sm transition-all duration-300 hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 ${plan.buttonClass}`}
                  >
                    <span>
                      {language === 'ar'
                        ? `اشترك الآن (${activeDuration.monthsLabelAr} • ${activeDuration.formattedPrice} ريال)`
                        : `Subscribe Now (${activeDuration.monthsLabelEn} • ${activeDuration.formattedPrice} SAR)`}
                    </span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Interactive Comparison Table (Updated for Standard vs Platinum VIP) */}
        <div className="mt-16 bg-[#FAFBFD] dark:bg-[#0B132B]/80 border border-slate-300/80 dark:border-white/10 rounded-3xl p-6 sm:p-8 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6 mb-6">
            <div>
              <h3 className="text-xl sm:text-2xl font-black text-[#0B132B] dark:text-white">
                {language === 'ar'
                  ? 'مقارنة سريعة بين الباقة القياسية والباقة البلاتينية VIP'
                  : 'Standard vs. Platinum VIP Comparison'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-semibold mt-1">
                {language === 'ar'
                  ? 'تعرف على الفروقات التفصيلية لاختيار الباقة الأنسب لأهدافك التدريبية'
                  : 'Compare detailed coaching features to pick the ideal tier for your goals'}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowComparisonTable(!showComparisonTable)}
              className="px-4 py-2.5 rounded-2xl bg-[#EEF2F6] dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/15 text-[#0B132B] dark:text-white font-bold text-xs sm:text-sm border border-slate-300 dark:border-white/20 flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-95 shrink-0"
            >
              <span>
                {showComparisonTable
                  ? language === 'ar'
                    ? 'إخفاء المقارنة'
                    : 'Collapse'
                  : language === 'ar'
                  ? 'عرض جدول المقارنة'
                  : 'Expand Matrix'}
              </span>
              {showComparisonTable ? (
                <ChevronUp className="w-4 h-4 text-orange-500" />
              ) : (
                <ChevronDown className="w-4 h-4 text-orange-500" />
              )}
            </button>
          </div>

          {showComparisonTable && (
            <div className="overflow-x-auto">
              <table className="w-full text-right rtl:text-right ltr:text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-300 dark:border-white/15">
                    <th className="py-4 px-4 text-[#0B132B] dark:text-white font-black text-sm sm:text-base w-1/2">
                      {language === 'ar' ? 'الميزة / الإمكانية' : 'Feature / Capability'}
                    </th>
                    <th className="py-4 px-3 text-center text-slate-700 dark:text-slate-200 font-extrabold w-1/4">
                      <div className="flex flex-col items-center gap-1">
                        <Shield className="w-4 h-4 text-slate-500 dark:text-slate-300" />
                        <span>{language === 'ar' ? 'الباقة القياسية (Standard)' : 'Standard'}</span>
                        <span className="text-[11px] text-orange-600 dark:text-orange-400 font-mono tabular-nums font-bold">
                          200 / 350 / 600 {language === 'ar' ? 'ريال' : 'SAR'}
                        </span>
                      </div>
                    </th>
                    <th className="py-4 px-3 text-center text-amber-600 dark:text-amber-400 font-black w-1/4 bg-orange-500/5 rounded-t-2xl border-x border-orange-500/20">
                      <div className="flex flex-col items-center gap-1">
                        <Crown className="w-4 h-4 text-[#FF5722] dark:text-amber-400" />
                        <span>
                          {language === 'ar' ? 'الباقة البلاتينية (Platinum VIP)' : 'Platinum VIP'}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums font-black">
                          450 / 800 / 1,450 {language === 'ar' ? 'ريال' : 'SAR'}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-white/5">
                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar'
                        ? 'التقييم الشامل (البنية العضلية، الاحتياج الغذائي، الاستشفاء)'
                        : 'Comprehensive Assessment & Recovery Plan'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400">
                      <Check className="w-4 h-4 mx-auto stroke-[3]" />
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 bg-orange-500/5 border-x border-orange-500/20">
                      <Check className="w-4 h-4 mx-auto stroke-[3]" />
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar'
                        ? 'النظام الغذائي وجدول التمارين'
                        : 'Nutrition & Workout Customization'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      {language === 'ar' ? 'تحديث وتغيير شهرياً' : 'Monthly updates'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-600 dark:text-amber-400 bg-orange-500/5 border-x border-orange-500/20 text-xs">
                      {language === 'ar'
                        ? 'تحديث شهري + مرونة التغيير حسب الأدوات المتوفرة'
                        : 'Monthly + Flexible equipment adaptation'}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar'
                        ? 'المكتبة التفاعلية (شرح فيديو، تسجيل أوزان، مؤقت راحة)'
                        : 'Interactive Video Library, Weight Log & Rest Timer'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400">
                      <Minus className="w-4 h-4 mx-auto" />
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 bg-orange-500/5 border-x border-orange-500/20">
                      <Check className="w-4 h-4 mx-auto stroke-[3]" />
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar' ? 'نظام المتابعة مع المدرب' : 'Coaching Check-ins'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      {language === 'ar' ? 'متابعة شهرية' : 'Monthly check-in'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-600 dark:text-amber-400 bg-orange-500/5 border-x border-orange-500/20 text-xs">
                      {language === 'ar'
                        ? 'أسبوعية وشهرية + متابعة تدريب مباشرة لأيام محددة (6 شهور والسنة)'
                        : 'Weekly & monthly + Live session tracking (6m & 1yr)'}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar'
                        ? 'التواصل الفوري ونظام التحفيز والتحديات والمكافآت'
                        : 'Instant Messaging + Gamified Streaks & Rewards'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400">
                      <Minus className="w-4 h-4 mx-auto" />
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 bg-orange-500/5 border-x border-orange-500/20">
                      <Check className="w-4 h-4 mx-auto stroke-[3]" />
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar'
                        ? 'جدول تمارين الطوارئ (للسفر أو انتهاء اشتراك النادي)'
                        : 'Emergency & Travel Backup Workout Plans'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-400">
                      <Minus className="w-4 h-4 mx-auto" />
                    </td>
                    <td className="py-3.5 px-3 text-center text-emerald-600 dark:text-emerald-400 bg-orange-500/5 border-x border-orange-500/20">
                      <Check className="w-4 h-4 mx-auto stroke-[3]" />
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar' ? 'تجميد الاشتراك' : 'Membership Freeze'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      {language === 'ar'
                        ? 'طوارئ فقط (مرة لـ 6 شهور / مرتين للسنة)'
                        : 'Emergency only (1x for 6m / 2x for 1yr)'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-600 dark:text-amber-400 bg-orange-500/5 border-x border-orange-500/20 text-xs">
                      {language === 'ar'
                        ? 'مرونة تجميد متعددة حسب مدة الاشتراك'
                        : 'Multiple flexible pauses by duration'}
                    </td>
                  </tr>

                  <tr className="hover:bg-slate-50 dark:hover:bg-white/5">
                    <td className="py-3.5 px-4 font-bold text-[#0B132B] dark:text-white">
                      {language === 'ar'
                        ? 'نقل أو بيع الاشتراك'
                        : 'Transfer or Resell Membership'}
                    </td>
                    <td className="py-3.5 px-3 text-center text-slate-600 dark:text-slate-300 font-semibold text-xs">
                      {language === 'ar' ? 'لاشتراك السنة فقط' : 'Full-year plan only'}
                    </td>
                    <td className="py-3.5 px-3 text-center font-black text-amber-600 dark:text-amber-400 bg-orange-500/5 border-x border-orange-500/20 text-xs">
                      {language === 'ar' ? 'متاحة لاشتراكات 6 شهور وأكثر' : 'Available for 6m+ plans'}
                    </td>
                  </tr>

                  {/* Bottom Quick Action Row */}
                  <tr className="border-t-2 border-slate-300 dark:border-white/10">
                    <td className="py-4 px-4 font-black text-xs text-slate-500 dark:text-slate-400">
                      {language === 'ar' ? 'ابدأ اشتراكك الآن' : 'Get Started'}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => triggerCheckout('standard')}
                        className="w-full py-2.5 px-3 rounded-xl bg-slate-200 dark:bg-white/10 hover:bg-orange-600 hover:text-white text-[#0B132B] dark:text-white text-xs font-bold transition-all cursor-pointer"
                      >
                        {language === 'ar' ? 'اشترك في القياسية' : 'Choose Standard'}
                      </button>
                    </td>
                    <td className="py-4 px-3 text-center bg-orange-500/5 border-x border-orange-500/20">
                      <button
                        type="button"
                        onClick={() => triggerCheckout('platinum')}
                        className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#FF5722] to-amber-500 hover:from-[#FF7043] hover:to-amber-400 text-white text-xs font-black shadow-md transition-all cursor-pointer"
                      >
                        {language === 'ar' ? 'اشترك في البلاتينية VIP' : 'Choose Platinum VIP'}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Security & Guarantee Footer */}
        <div className="mt-12 text-center flex flex-wrap items-center justify-center gap-6 text-xs text-slate-700 dark:text-slate-400 font-bold">
          <span className="flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            {language === 'ar' ? 'دفع آمن ومشفر 100%' : '100% Encrypted & Secure Payment'}
          </span>
          <span className="flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            {language === 'ar'
              ? 'تفعيل فوري للبوابة وجدول التمارين بعد توثيق الإقرار'
              : 'Instant Portal & Workout Activation'}
          </span>
        </div>
      </div>
    </section>
  );
};
