import React, { useState, useEffect } from 'react';
import { Language, Theme } from '../../types';
import {
  getDietPlanCategories,
  MealCategory,
  DietMealItem,
} from '../../data/nutrition/dietPlanData';
import {
  isSubscriberNutritionLocked,
  fetchSubscriberNutritionLockFromSupabase,
} from '../../lib/authStore';
import {
  fetchNutritionPlanFromSupabase,
  getCanonicalClientKey,
} from '../../lib/supabase';
import {
  Utensils,
  Flame,
  Dumbbell,
  Wheat,
  Droplet,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Info,
  Lock,
} from 'lucide-react';

interface AthleteDietPlanSectionProps {
  language: Language;
  theme?: Theme;
  isVIP?: boolean;
  isLocked?: boolean;
  subscriberEmail?: string;
  clientId?: string;
}

export const AthleteDietPlanSection: React.FC<AthleteDietPlanSectionProps> = ({
  language,
  theme = 'dark',
  isVIP = false,
  isLocked = false,
  subscriberEmail,
  clientId,
}) => {
  const isLight = theme === 'light';

  const [storedLocked, setStoredLocked] = useState<boolean>(() =>
    isSubscriberNutritionLocked(subscriberEmail)
  );

  const [selectedCategoryKey, setSelectedCategoryKey] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  const [selectedMealIndex, setSelectedMealIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'featured' | 'grid'>('featured');

  const [categories, setCategories] = useState<MealCategory[]>(() =>
    getDietPlanCategories(isVIP ? 'VIP' : 'standard')
  );

  useEffect(() => {
    let active = true;
    const tier = isVIP ? 'VIP' : 'standard';
    const cleanEmail = (subscriberEmail || '').trim().toLowerCase();
    const cleanId = (clientId || '').trim();
    const canonicalKey = getCanonicalClientKey(cleanId, cleanEmail);

    setCategories(getDietPlanCategories(tier));
    setSelectedMealIndex(0);

    const syncFromCloud = async () => {
      setStoredLocked(isSubscriberNutritionLocked(cleanEmail));
      const [cloudLocked, cloudCategories] = await Promise.all([
        fetchSubscriberNutritionLockFromSupabase(cleanId, cleanEmail),
        fetchNutritionPlanFromSupabase(cleanId, cleanEmail, tier),
      ]);
      if (!active) return;
      setStoredLocked(cloudLocked);
      if (Array.isArray(cloudCategories) && cloudCategories.length > 0) {
        setCategories(cloudCategories);
      }
    };

    void syncFromCloud();

    const handleDietUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ clientId?: string; tier?: string } | undefined>).detail;
      if (detail?.clientId) {
        const target = detail.clientId.trim().toLowerCase();
        const matches =
          (canonicalKey && target === canonicalKey.toLowerCase()) ||
          (cleanId && target === cleanId.toLowerCase()) ||
          (cleanEmail && target === cleanEmail);
        if (!matches) return;
      } else if (detail?.tier && detail.tier !== tier) {
        return;
      }
      void syncFromCloud();
    };

    const handleLockUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ email?: string } | undefined>).detail;
      if (detail?.email && cleanEmail && detail.email.trim().toLowerCase() !== cleanEmail) {
        return;
      }
      void syncFromCloud();
    };

    const handleProfileUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ id?: string; email?: string } | undefined>).detail;
      if (detail) {
        const dEmail = (detail.email || '').trim().toLowerCase();
        const dId = (detail.id || '').trim().toLowerCase();
        const matches =
          (cleanEmail && dEmail === cleanEmail) ||
          (cleanId && dId === cleanId.toLowerCase());
        if (!matches) return;
      }
      void syncFromCloud();
    };

    const handleCredentialsUpdated = () => {
      void syncFromCloud();
    };

    window.addEventListener('oao_diet_updated', handleDietUpdated);
    window.addEventListener('oao_nutrition_lock_updated', handleLockUpdated);
    window.addEventListener('oao_credentials_updated', handleCredentialsUpdated);
    window.addEventListener('oao_profile_updated', handleProfileUpdated);
    return () => {
      active = false;
      window.removeEventListener('oao_diet_updated', handleDietUpdated);
      window.removeEventListener('oao_nutrition_lock_updated', handleLockUpdated);
      window.removeEventListener('oao_credentials_updated', handleCredentialsUpdated);
      window.removeEventListener('oao_profile_updated', handleProfileUpdated);
    };
  }, [clientId, subscriberEmail, isVIP]);

  const isNutritionLocked = Boolean(isLocked || storedLocked);

  const activeCategory: MealCategory =
    categories.find((c) => c.key === selectedCategoryKey) || categories[0];

  const safeMealIndex =
    activeCategory.meals.length > 0 && selectedMealIndex < activeCategory.meals.length
      ? selectedMealIndex
      : 0;

  const currentMeal: DietMealItem =
    activeCategory.meals[safeMealIndex] || activeCategory.meals[0];

  const handleSelectCategory = (key: 'breakfast' | 'lunch' | 'dinner' | 'snacks') => {
    setSelectedCategoryKey(key);
    setSelectedMealIndex(0);
  };

  const handleNextMeal = () => {
    if (activeCategory.meals.length === 0) return;
    setSelectedMealIndex((prev) => (prev + 1) % activeCategory.meals.length);
  };

  const handlePrevMeal = () => {
    if (activeCategory.meals.length === 0) return;
    setSelectedMealIndex((prev) => (prev - 1 + activeCategory.meals.length) % activeCategory.meals.length);
  };

  if (isNutritionLocked) {
    return (
      <section
        className={`relative w-full rounded-3xl p-8 sm:p-12 border-2 text-center select-none overflow-hidden ${
          isLight
            ? 'bg-[#FAFBFD] border-amber-500/50 shadow-lg'
            : 'bg-gradient-to-b from-[#0B132B]/95 via-[#070E24]/95 to-[#030712] border-amber-500/40 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl'
        }`}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] pointer-events-none" />
        <div className="relative z-10 max-w-xl mx-auto space-y-4">
          <div
            className={`w-16 h-16 rounded-2xl border-2 flex items-center justify-center mx-auto ${
              isLight
                ? 'bg-amber-100 border-amber-400 text-amber-700 shadow-sm'
                : 'bg-amber-500/20 border-amber-500/40 text-amber-400 shadow-[0_0_30px_rgba(245,158,11,0.3)]'
            }`}
          >
            <Lock className="w-8 h-8" />
          </div>
          <div
            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold ${
              isLight
                ? 'bg-amber-50 border-amber-300 text-amber-800'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الخطة الغذائية معلقة مؤقتاً' : 'Nutrition Plan Temporarily Locked'}</span>
          </div>
          <h3
            className={`text-xl sm:text-2xl font-black leading-snug ${
              isLight ? 'text-[#0B132B]' : 'text-white'
            }`}
          >
            {language === 'ar'
              ? '🔒 تم تعليق/قفل عرض الخطة الغذائية من قبل الكوتش لحين تحديث التقييم والمقاييس الشخصية'
              : '🔒 Nutrition plan access is temporarily suspended by the coach pending assessment and biometrics update'}
          </h3>
          <p
            className={`text-xs sm:text-sm leading-relaxed font-medium ${
              isLight ? 'text-slate-600' : 'text-slate-300'
            }`}
          >
            {language === 'ar'
              ? 'يقوم الكوتش حالياً بمراجعة وتعديل خطتك الغذائية والسعرات والماكروز وفقاً لآخر قياساتك. يرجى التواصل مع الكوتش أو إرسال استفسار عند الحاجة.'
              : 'The coach is updating your custom meal plan, macros, and calories. Please contact the coach or submit an inquiry if you have questions.'}
          </p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative w-full rounded-3xl p-6 sm:p-8 border overflow-hidden select-none transition-colors ${
        isLight
          ? 'bg-[#FAFBFD] border-slate-300 shadow-lg'
          : 'bg-gradient-to-b from-[#0B132B]/95 via-[#070E24]/95 to-[#030712] border-orange-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl'
      }`}
    >
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-600/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div
        className={`relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b ${
          isLight ? 'border-slate-200' : 'border-white/10'
        }`}
      >
        <div>
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border font-extrabold text-xs tracking-wider uppercase mb-2 ${
              isLight
                ? 'bg-orange-50 border-orange-300 text-orange-700'
                : 'bg-orange-500/10 border-orange-500/30 text-orange-400'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>{language === 'ar' ? 'الجدول الغذائي الرياضي المعتمد' : 'Official Athletic Nutrition Plan'}</span>
          </div>
          <h2
            className={`text-2xl sm:text-3xl font-black flex items-center gap-2 ${
              isLight ? 'text-[#0B132B]' : 'text-white'
            }`}
          >
            <span>{language === 'ar' ? 'نظام الوجبات والخيارات المتوازنة' : 'Custom Meal Plan & Options'}</span>
            {isVIP && (
              <span
                className={`text-xs px-2.5 py-0.5 rounded-md border font-mono ${
                  isLight
                    ? 'bg-amber-100 text-amber-900 border-amber-400'
                    : 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                }`}
              >
                VIP MACROS
              </span>
            )}
          </h2>
          <p className={`text-xs sm:text-sm font-medium mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {language === 'ar'
              ? 'اختر وجبتك المفضلة يومياً من بين 7 خيارات للفطور، 7 للغداء، 7 للعشاء، و6 خيارات للسناكات.'
              : 'Choose your preferred meals daily: 7 Breakfast, 7 Lunch, 7 Dinner, and 6 Snack options.'}
          </p>
        </div>

        {/* View Toggle (Featured Detail vs All Grid) */}
        <div
          className={`flex items-center gap-1.5 p-1 border rounded-2xl ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-black/40 border-white/10'
          }`}
        >
          <button
            onClick={() => setViewMode('featured')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'featured'
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                : isLight
                ? 'text-slate-600 hover:text-[#0B132B]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'عرض تفصيلي' : 'Featured'}
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'grid'
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
                : isLight
                ? 'text-slate-600 hover:text-[#0B132B]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'عرض جميع الأصناف' : 'All Options'}
          </button>
        </div>
      </div>

      {/* Category Selection Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 my-6">
        {categories.map((cat) => {
          const isSelected = selectedCategoryKey === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => handleSelectCategory(cat.key)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? isLight
                    ? 'bg-gradient-to-br from-[#0B132B] to-[#1C2541] border-orange-500 text-white shadow-md scale-[1.02]'
                    : 'bg-gradient-to-br from-[#1C2541] via-[#0B132B] to-[#120F05] border-orange-500 shadow-[0_0_25px_rgba(234,88,12,0.35)] scale-[1.02]'
                  : isLight
                  ? 'bg-white border-slate-300 hover:border-orange-500/60 text-[#0B132B]'
                  : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl sm:text-2xl">{cat.icon}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-xs'
                      : isLight
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {language === 'ar' ? `${cat.itemCount} أصناف` : `${cat.itemCount} Items`}
                </span>
              </div>
              <div>
                <h3
                  className={`font-black text-sm sm:text-base ${
                    isSelected ? 'text-white' : isLight ? 'text-[#0B132B]' : 'text-slate-200'
                  }`}
                >
                  {language === 'ar' ? cat.titleAr : cat.titleEn}
                </h3>
                <p
                  className={`text-[10px] sm:text-[11px] line-clamp-1 mt-0.5 ${
                    isSelected ? 'text-slate-300' : isLight ? 'text-slate-600' : 'text-slate-400'
                  }`}
                >
                  {cat.subtitleAr}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* VIEW MODE 1: FEATURED CAROUSEL / DETAIL CARD */}
      {viewMode === 'featured' && (
        <div className="space-y-6">
          {/* Sub-item Quick Picker Bar */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-1.5 min-w-max">
              {activeCategory.meals.map((meal, idx) => {
                const isCurrent = idx === safeMealIndex;
                return (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedMealIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-orange-400 shadow-md scale-105'
                        : isLight
                        ? 'bg-white text-[#0B132B] border-slate-300 hover:border-orange-500'
                        : 'bg-white/5 text-slate-300 border-white/10 hover:border-orange-500/40 hover:text-white'
                    }`}
                  >
                    {language === 'ar' ? `صنف ${idx + 1}` : `Option ${idx + 1}`}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handlePrevMeal}
                aria-label="Previous Meal"
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-[#0B132B]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
              <button
                onClick={handleNextMeal}
                aria-label="Next Meal"
                className={`p-2 rounded-xl border transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-[#0B132B]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Active Meal Detailed Card */}
          <div
            className={`rounded-3xl p-6 sm:p-8 border-2 space-y-6 ${
              isLight
                ? 'bg-white border-orange-400/60 shadow-lg'
                : 'bg-[#050C1F]/90 border-orange-500/40 shadow-2xl'
            }`}
          >
            <div
              className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
                isLight ? 'border-slate-200' : 'border-white/10'
              }`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    className={`px-3 py-0.5 rounded-full border font-mono font-bold text-xs ${
                      isLight
                        ? 'bg-orange-50 border-orange-300 text-orange-800'
                        : 'bg-orange-500/20 border-orange-500/40 text-orange-400'
                    }`}
                  >
                    {language === 'ar'
                      ? `الخيار رقم ${safeMealIndex + 1} من ${activeCategory.meals.length}`
                      : `Option ${safeMealIndex + 1} of ${activeCategory.meals.length}`}
                  </span>
                  {currentMeal.tagsAr.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${
                        isLight
                          ? 'bg-slate-100 border-slate-300 text-slate-700'
                          : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3
                  className={`text-xl sm:text-2xl font-black leading-tight ${
                    isLight ? 'text-[#0B132B]' : 'text-white'
                  }`}
                >
                  {currentMeal.nameAr}
                </h3>
                <p className={`text-xs mt-1 font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {currentMeal.nameEn} • {currentMeal.portionAr}
                </p>
              </div>

              {/* Calories Highlight Box */}
              <div
                className={`flex items-center gap-3 px-5 py-3 rounded-2xl border shrink-0 ${
                  isLight
                    ? 'bg-orange-50 border-orange-300 shadow-xs'
                    : 'bg-gradient-to-br from-orange-600/20 via-orange-500/10 to-amber-500/20 border-orange-500/50 shadow-[0_0_20px_rgba(234,88,12,0.2)]'
                }`}
              >
                <Flame className="w-7 h-7 text-[#EA580C] dark:text-orange-500 shrink-0" />
                <div className="text-start">
                  <span className={`text-[10px] block font-bold uppercase ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {language === 'ar' ? 'إجمالي السعرات' : 'TOTAL ENERGY'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-2xl font-black font-mono ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>
                      {currentMeal.calories}
                    </span>
                    <span className="text-xs font-bold text-[#EA580C] dark:text-orange-400">KCAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Macros Breakdown 4-Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Protein */}
              <div
                className={`p-4 rounded-2xl border text-center shadow-xs ${
                  isLight ? 'bg-emerald-50/60 border-emerald-300' : 'bg-black/40 border-emerald-500/40'
                }`}
              >
                <div
                  className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    isLight ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  <Dumbbell className="w-4 h-4" />
                </div>
                <span className={`text-[11px] block font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {language === 'ar' ? 'البروتين الصافي' : 'Protein'}
                </span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400 font-mono">
                  {currentMeal.protein} <span className="text-xs font-bold">غرام</span>
                </span>
              </div>

              {/* Carbs */}
              <div
                className={`p-4 rounded-2xl border text-center shadow-xs ${
                  isLight ? 'bg-amber-50/70 border-amber-300' : 'bg-black/40 border-amber-500/40'
                }`}
              >
                <div
                  className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    isLight ? 'bg-amber-100 text-amber-700' : 'bg-amber-500/15 text-amber-400'
                  }`}
                >
                  <Wheat className="w-4 h-4" />
                </div>
                <span className={`text-[11px] block font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {language === 'ar' ? 'الكربوهيدرات' : 'Carbs'}
                </span>
                <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">
                  {currentMeal.carbs} <span className="text-xs font-bold">غرام</span>
                </span>
              </div>

              {/* Fats */}
              <div
                className={`p-4 rounded-2xl border text-center shadow-xs ${
                  isLight ? 'bg-rose-50/70 border-rose-300' : 'bg-black/40 border-rose-500/40'
                }`}
              >
                <div
                  className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    isLight ? 'bg-rose-100 text-rose-700' : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  <Droplet className="w-4 h-4" />
                </div>
                <span className={`text-[11px] block font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {language === 'ar' ? 'الدهون الصحية' : 'Healthy Fats'}
                </span>
                <span className="text-xl font-black text-rose-700 dark:text-rose-400 font-mono">
                  {currentMeal.fats} <span className="text-xs font-bold">غرام</span>
                </span>
              </div>

              {/* Portion Size */}
              <div
                className={`p-4 rounded-2xl border text-center shadow-xs ${
                  isLight ? 'bg-blue-50/70 border-blue-300' : 'bg-black/40 border-blue-500/40'
                }`}
              >
                <div
                  className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center mb-2 ${
                    isLight ? 'bg-blue-100 text-[#1E3A8A]' : 'bg-blue-500/15 text-blue-400'
                  }`}
                >
                  <Utensils className="w-4 h-4" />
                </div>
                <span className={`text-[11px] block font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {language === 'ar' ? 'حجم الحصة' : 'Portion'}
                </span>
                <span className="text-sm font-black text-[#1E3A8A] dark:text-blue-300 truncate block mt-1">
                  {currentMeal.portionAr}
                </span>
              </div>
            </div>

            {/* Ingredients Breakdown */}
            <div
              className={`space-y-3 p-5 rounded-2xl border ${
                isLight ? 'bg-slate-100/80 border-slate-300' : 'bg-black/30 border-white/5'
              }`}
            >
              <h4 className={`text-sm font-black flex items-center gap-2 ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>
                  {language === 'ar'
                    ? 'المكونات والمقادير المحددة بدقة (بالغرام):'
                    : 'Exact Ingredients & Gram Portions:'}
                </span>
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {currentMeal.ingredientsAr.map((ing, iIdx) => (
                  <li
                    key={iIdx}
                    className={`flex items-start gap-2 text-xs p-3 rounded-xl border ${
                      isLight
                        ? 'text-[#0B132B] bg-white border-slate-200'
                        : 'text-slate-300 bg-white/5 border-white/5'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coach Tip */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border-s-4 border-orange-500 border-t border-b border-e flex items-start gap-3 ${
                isLight
                  ? 'bg-orange-50/80 border-orange-300'
                  : 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-orange-500/20'
              }`}
            >
              <Sparkles className="w-5 h-5 text-[#EA580C] dark:text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-black text-[#EA580C] dark:text-orange-400 block mb-0.5">
                  {language === 'ar' ? 'توجيه الكوتش عمر عدنان للوجبة:' : 'Coach Omar Adnan Tip:'}
                </span>
                <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-[#0B132B]' : 'text-slate-200'}`}>
                  {currentMeal.tipAr}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: ALL ITEMS GRID */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeCategory.meals.map((meal, mIdx) => (
            <div
              key={meal.id}
              onClick={() => {
                setSelectedMealIndex(mIdx);
                setViewMode('featured');
              }}
              className={`p-5 rounded-2xl border transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between space-y-4 shadow-md group ${
                isLight
                  ? 'bg-white border-slate-300 hover:border-orange-500'
                  : 'bg-[#050C1F]/90 border-white/10 hover:border-orange-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold font-mono ${
                      isLight ? 'bg-orange-100 text-orange-800' : 'bg-orange-500/20 text-orange-400'
                    }`}
                  >
                    {language === 'ar' ? `صنف ${mIdx + 1}` : `Item ${mIdx + 1}`}
                  </span>
                  <span className={`font-mono font-bold ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>
                    {meal.calories} KCAL
                  </span>
                </div>
                <h4
                  className={`font-black text-base transition-colors ${
                    isLight
                      ? 'text-[#0B132B] group-hover:text-[#EA580C]'
                      : 'text-white group-hover:text-orange-400'
                  }`}
                >
                  {meal.nameAr}
                </h4>
                <p className={`text-xs mt-1 line-clamp-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  {meal.tipAr}
                </p>
              </div>

              <div
                className={`pt-3 border-t flex items-center justify-between text-xs font-mono font-bold ${
                  isLight ? 'border-slate-200 text-slate-700' : 'border-white/10 text-slate-300'
                }`}
              >
                <span className="text-emerald-700 dark:text-emerald-400">{meal.protein}g P</span>
                <span className="text-amber-700 dark:text-amber-300">{meal.carbs}g C</span>
                <span className="text-rose-700 dark:text-rose-400">{meal.fats}g F</span>
                <span className="text-[#EA580C] dark:text-orange-400 text-[11px] font-sans group-hover:underline">
                  {language === 'ar' ? 'التفاصيل ➔' : 'View ➔'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nutrition Note */}
      <div
        className={`mt-6 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-xs font-medium ${
          isLight ? 'border-slate-200 text-slate-600' : 'border-white/10 text-slate-400'
        }`}
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            {language === 'ar'
              ? 'جميع الكميات والمقادير محسوبة وفق الاحتياج اليومي للوصول إلى الوزن المستهدف.'
              : 'All meals are calibrated to meet daily macro and caloric requirements.'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[#EA580C] dark:text-orange-400 font-bold">
          <Info className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'إجمالي الخيارات المتاحة: 27 صنفاً غذائياً' : '27 Total Meal Options Available'}</span>
        </div>
      </div>
    </section>
  );
};
