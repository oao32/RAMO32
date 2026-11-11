import React, { useState } from 'react';
import { Language, ClientProfile, Theme } from '../types';
import { X, Sparkles, Activity, Utensils, Dumbbell, HeartPulse, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ComprehensiveAnalysisGridProps {
  profile: ClientProfile;
  onUpdateProfile?: (updated: ClientProfile) => void;
  language: Language;
  theme?: Theme;
}

type ModalType = 'muscle' | 'nutrition' | 'protocol' | 'recovery' | null;

export const ComprehensiveAnalysisGrid: React.FC<ComprehensiveAnalysisGridProps> = ({
  profile,
  onUpdateProfile,
  language,
}) => {
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  const cards = [
    {
      id: 'muscle' as ModalType,
      titleAr: 'التحليل المقطعي والبنية العضلية',
      titleEn: 'Cross-Sectional & Muscle Analysis',
      subtitleAr: 'اضغط للتحليل الدقيق 💡',
      subtitleEn: 'Click for Precise Anatomy 💡',
      icon: Activity,
      borderColor: 'border-orange-500/40 hover:border-orange-500',
    },
    {
      id: 'nutrition' as ModalType,
      titleAr: 'الهندسة الغذائية والماكروز',
      titleEn: 'Nutritional Engineering & Macros',
      subtitleAr: 'اضغط للتوزيع الغذائي 💡',
      subtitleEn: 'Click for Macro Breakdown 💡',
      icon: Utensils,
      borderColor: 'border-blue-500/40 hover:border-blue-500',
    },
    {
      id: 'protocol' as ModalType,
      titleAr: 'بروتوكول التدريب المعتمد',
      titleEn: 'Approved Training Protocol',
      subtitleAr: 'اضغط لنظام التمرين 💡',
      subtitleEn: 'Click for System Details 💡',
      icon: Dumbbell,
      borderColor: 'border-amber-500/40 hover:border-amber-500',
    },
    {
      id: 'recovery' as ModalType,
      titleAr: 'خط الاستشفاء والكارديو',
      titleEn: 'Recovery & Cardio Framework',
      subtitleAr: 'اضغط لخطط الاستشفاء 💡',
      subtitleEn: 'Click for Recovery Plan 💡',
      icon: HeartPulse,
      borderColor: 'border-emerald-500/40 hover:border-emerald-500',
    },
  ];

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b border-orange-500/20 pb-2">
        <h3 className="text-orange-600 dark:text-orange-400 font-extrabold text-sm md:text-base flex items-center gap-2">
          {/* Vibrant icon badge */}
          <span className="p-1 rounded-lg bg-gradient-to-br from-[#0B132B] to-[#1C2541] text-orange-400">
            <Activity className="w-4 h-4 text-orange-400" />
          </span>
          <span>
            {language === 'ar'
              ? 'التقييم العام والتحليل الشامل للمشترك'
              : 'Overall Assessment & Comprehensive Athlete Analysis'}
          </span>
        </h3>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>{language === 'ar' ? 'الماكروز والسعرات معتمدة من الكوتش عمر ✓' : 'Coach Certified Macros ✓'}</span>
          </span>
        </div>
      </div>

      {/* 2x2 Grid - Eye Comfort Light Mode Surfaces + Vibrant Navy/Orange/White Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.id}
              onClick={() => setActiveModal(card.id)}
              className={`bg-[#FAFBFD] dark:bg-[#0b132b]/85 border ${card.borderColor} rounded-2xl p-4.5 text-start transition-all duration-300 hover:scale-[1.02] shadow-[0_4px_20px_rgba(11,19,43,0.05)] dark:shadow-xl hover:shadow-[0_0_25px_rgba(234,88,12,0.25)] flex flex-col justify-between group relative overflow-hidden cursor-pointer`}
            >
              <div className="flex items-start justify-between w-full">
                {/* Vibrant Navy + Orange + White Badge */}
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 shadow-md group-hover:ring-orange-500 transition-all">
                  <Icon className="w-5 h-5 text-orange-400 stroke-[2.2]" />
                </div>
                <span className="text-xs text-orange-600 dark:text-orange-400 font-bold tracking-wider group-hover:translate-x-1 transition-transform">
                  {language === 'ar' ? 'تفاصيل ↗' : 'View ↗'}
                </span>
              </div>

              <div className="mt-3.5">
                <h4 className="text-[#0B132B] dark:text-white font-black text-sm md:text-base group-hover:text-orange-600 dark:group-hover:text-orange-300 transition-colors">
                  {language === 'ar' ? card.titleAr : card.titleEn}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-semibold flex items-center gap-1">
                  <span>{language === 'ar' ? card.subtitleAr : card.subtitleEn}</span>
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Modal Popup with Detailed Analysis */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border-2 border-slate-300 dark:border-orange-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-[#0B132B] dark:text-white">
            {/* Close button */}
            <button
              onClick={() => setActiveModal(null)}
              className="absolute top-5 left-5 rtl:left-5 rtl:right-auto ltr:right-5 ltr:left-auto text-slate-500 dark:text-slate-300 hover:text-white p-2 rounded-full bg-slate-200 dark:bg-white/10 hover:bg-orange-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Content Switch */}
            {activeModal === 'muscle' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 shadow-md">
                    <Activity className="w-7 h-7 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0B132B] dark:text-white">
                      {language === 'ar' ? 'التحليل المقطعي والبنية العضلية' : 'Cross-Sectional & Muscle Analysis'}
                    </h3>
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                      {language === 'ar'
                        ? `المشترك: ${profile.name || 'عبدالرحمن'} | مدرب: ${profile.coachName || 'عمر عدنان'}`
                        : `Athlete: ${profile.nameEn || profile.name || 'Abdulrahman'} | Coach: ${profile.coachName || 'Omar Adnan'}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-sm">
                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-4 rounded-2xl border border-slate-300/80 dark:border-white/10">
                    <h5 className="font-extrabold text-[#0B132B] dark:text-white mb-2 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-orange-500" />
                      {profile.analysisData?.muscleAnalysis?.strengthsTitleAr ||
                        (language === 'ar' ? 'نقاط القوة والكتلة المكتسبة' : 'Strengths & Muscle Mass Gained')}
                    </h5>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      {(profile.analysisData?.muscleAnalysis?.strengthsItems || [
                        {
                          labelAr: 'عضلات الظهر والمجنص',
                          labelEn: 'Back & Lat Width',
                          valueAr: 'ممتاز (V-Taper واضح)',
                          valueEn: 'Superior (V-Taper)',
                        },
                        {
                          labelAr: 'الصدر الأوسط والسفلي',
                          labelEn: 'Mid & Lower Pectorals',
                          valueAr: 'كثافة جيدة جداً',
                          valueEn: 'Very Good Density',
                        },
                      ]).map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-transparent">
                          <span className="text-slate-600 dark:text-slate-400 block font-medium">
                            {language === 'ar' ? item.labelAr : item.labelEn || item.labelAr}
                          </span>
                          <span className="font-black text-emerald-700 dark:text-emerald-400 text-sm">
                            {language === 'ar' ? item.valueAr : item.valueEn || item.valueAr}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-4 rounded-2xl border border-orange-500/30">
                    <h5 className="font-extrabold text-orange-600 dark:text-orange-400 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-orange-500" />
                      {profile.analysisData?.muscleAnalysis?.focusTitleAr ||
                        (language === 'ar' ? 'التركيز الأساسي في الخطة الحالية' : 'Primary Focus for Current Phase')}
                    </h5>
                    <ul className="space-y-2 text-xs list-disc list-inside text-slate-700 dark:text-slate-200 font-medium">
                      {(profile.analysisData?.muscleAnalysis?.focusItems || [
                        language === 'ar'
                          ? 'تكثيف تمارين الصدر العلوي (Incline Angle 30°) لسد الفجوة العلوية.'
                          : 'Prioritize upper clavicular pectorals (30° Incline) for 3D chest look.',
                        language === 'ar'
                          ? 'الرأس الجانبي للكتف بحجم تدريبي 14-16 جلسة أسبوعية لتوسيع العرض.'
                          : 'Side lateral delt volume (14-16 sets/wk) for frame width.',
                        language === 'ar'
                          ? 'الرأس الطويل للترايسبس لزيادة سماكة الذراع من الخلف.'
                          : 'Triceps long head overload to maximize arm circumference.',
                      ]).map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  {profile.analysisData?.customCoachNotes && (
                    <div className="bg-orange-500/10 p-3 rounded-2xl border border-orange-500/30 text-xs">
                      <span className="font-black text-orange-400 block mb-1">
                        {language === 'ar' ? 'ملاحظة خاصة من الكوتش عمر:' : "Coach Omar's Custom Note:"}
                      </span>
                      <p className="text-slate-300 font-medium">{profile.analysisData.customCoachNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeModal === 'nutrition' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-blue-500/30 text-blue-400 shadow-md">
                    <Utensils className="w-7 h-7 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0B132B] dark:text-white">
                      {language === 'ar' ? 'الهندسة الغذائية وتوزيع الماكروز' : 'Nutritional Engineering & Macros'}
                    </h3>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-bold">
                      {profile.analysisData?.nutritionEngineering?.goalTitleAr ||
                        (language === 'ar'
                          ? 'الهدف: تنشيف ذكي مع الحفاظ على القوة العضلية'
                          : 'Goal: Recomposition & Hypertrophy')}
                    </p>
                  </div>
                </div>

                {/* Macro breakdown cards - High Contrast Numbers */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-3 rounded-2xl border border-blue-500/40 text-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">
                      {language === 'ar' ? 'البروتين' : 'Protein'}
                    </span>
                    <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
                      {profile.macros?.protein || 165}g
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      {(profile.macros?.protein || 165) * 4} Kcal
                    </span>
                  </div>
                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-3 rounded-2xl border border-amber-500/40 text-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">
                      {language === 'ar' ? 'الكاربوهيدرات' : 'Carbs'}
                    </span>
                    <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                      {profile.macros?.carbs || 200}g
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      {(profile.macros?.carbs || 200) * 4} Kcal
                    </span>
                  </div>
                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-3 rounded-2xl border border-red-500/40 text-center">
                    <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">
                      {language === 'ar' ? 'الدهون الصحية' : 'Fats'}
                    </span>
                    <span className="text-2xl font-black text-red-700 dark:text-red-400">
                      {profile.macros?.fats || 60}g
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                      {(profile.macros?.fats || 60) * 9} Kcal
                    </span>
                  </div>
                </div>

                <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-4 rounded-2xl border border-slate-300/80 dark:border-white/10 text-xs space-y-2">
                  <div className="font-extrabold text-[#0B132B] dark:text-white flex items-center justify-between">
                    <span>{language === 'ar' ? 'إجمالي السعرات اليومية' : 'Total Daily Calories'}</span>
                    <span className="text-orange-600 dark:text-orange-400 text-lg font-black">
                      {profile.dailyCalories} Kcal
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {profile.analysisData?.nutritionEngineering?.preWorkoutNotesAr ||
                      (language === 'ar'
                        ? '• وجبة قبل التمرين: 40 جم كارب معقد + 30 جم بروتين سريع قبل التمرين بـ 90 دقيقة.'
                        : '• Pre-workout: 40g complex carbs + 30g fast protein 90 mins prior.')}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {profile.analysisData?.nutritionEngineering?.postWorkoutNotesAr ||
                      (language === 'ar'
                        ? '• وجبة بعد التمرين: 50 جم كارب سريع (موز/أرز أبيض) + 35 جم واي بروتين.'
                        : '• Post-workout: 50g fast carbs + 35g whey isolate.')}
                  </p>
                </div>
              </div>
            )}

            {activeModal === 'protocol' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-amber-500/30 text-amber-400 shadow-md">
                    <Dumbbell className="w-7 h-7 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0B132B] dark:text-white">
                      {language === 'ar' ? 'بروتوكول التدريب المعتمد' : 'Approved Training Protocol'}
                    </h3>
                    <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                      {profile.analysisData?.trainingProtocol?.splitNameAr ||
                        'Push / Pull / Legs / Rest / Upper Body Split'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-3 rounded-2xl border border-slate-300/80 dark:border-white/10">
                    <h5 className="font-extrabold text-[#0B132B] dark:text-white mb-1">
                      {language === 'ar' ? 'قاعدة الزيادة التدريجية (Progressive Overload)' : 'Progressive Overload Rule'}
                    </h5>
                    <p>
                      {profile.analysisData?.trainingProtocol?.overloadNotesAr ||
                        (language === 'ar'
                          ? 'عند تحقيق الحد الأقصى للتكرارات المستهدفة (مثال: 12 تكرار) في جلستين متتاليتين، يتم زيادة الوزن بمقدار 2.5 كجم إلى 5 كجم تلقائياً.'
                          : 'Once you hit the top rep target (e.g. 12 reps) for 2 consecutive sets with clean form, increase load by 2.5kg - 5kg.')}
                    </p>
                  </div>
                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-3 rounded-2xl border border-slate-300/80 dark:border-white/10">
                    <h5 className="font-extrabold text-[#0B132B] dark:text-white mb-1">
                      {language === 'ar' ? 'مؤشر القوة المتبقية (RPE / RIR)' : 'RIR / RPE Target'}
                    </h5>
                    <p>
                      {profile.analysisData?.trainingProtocol?.rpeNotesAr ||
                        (language === 'ar'
                          ? 'جميع الجولات الأساسية تُنفّذ عند RIR 1-2 (أي يتبقى تكرار أو تكراران قبل الفشل العضلي التام) لحماية الجهاز العصبي والاستشفاء السريع.'
                          : 'Execute working sets at 1-2 RIR (1-2 reps in reserve before true failure) for optimal CNS recovery.')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeModal === 'recovery' && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-emerald-500/30 text-emerald-400 shadow-md">
                    <HeartPulse className="w-7 h-7 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-[#0B132B] dark:text-white">
                      {language === 'ar' ? 'خطة الاستشفاء والكارديو اليومي' : 'Daily Recovery & Cardio Framework'}
                    </h3>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                      {language === 'ar'
                        ? 'تجديد مخازن الجلايكوجين وإعادة بناء الألياف'
                        : 'Maximizing Sleep, Tissue Repair & Parasympathetic State'}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300 font-medium">
                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-3 rounded-2xl border border-slate-300/80 dark:border-white/10">
                    <h5 className="font-extrabold text-[#0B132B] dark:text-white mb-1">
                      {language === 'ar' ? 'النوم وهرمونات البناء' : 'Sleep Hygiene & Anabolic Windows'}
                    </h5>
                    <p>
                      {profile.analysisData?.recoveryFramework?.sleepNotesAr ||
                        (language === 'ar'
                          ? '7.5 إلى 8.5 ساعات نوم متواصل في غرفة مظلمة وباردة لتحفيز هرمون النمو البنائي (GH) وتقليل الكورتيزول.'
                          : '7.5 to 8.5 hours continuous sleep in dark, cool room to trigger GH and minimize cortisol.')}
                    </p>
                  </div>

                  <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-3 rounded-2xl border border-slate-300/80 dark:border-white/10">
                    <h5 className="font-extrabold text-[#0B132B] dark:text-white mb-1">
                      {language === 'ar' ? 'بروتوكول المكملات الموصى به' : 'Recommended Supplement Protocol'}
                    </h5>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {(profile.analysisData?.recoveryFramework?.supplementItems || [
                        '• كرياتين مونوهيدرات: 5 جم',
                        '• أوميغا 3 عالي EPA: 2000 ملغ',
                        '• مغنيسيوم جلايسينات: 400 ملغ',
                        '• فيتامين D3 + K2: 5000 وحدة',
                      ]).map((sup, idx) => (
                        <span
                          key={idx}
                          className="bg-white dark:bg-white/5 p-2 rounded-lg border border-slate-200 dark:border-transparent"
                        >
                          {sup}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer close */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setActiveModal(null)}
                className="px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-extrabold text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق النافذة' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
