import React, { useState } from 'react';
import { Language, Theme } from '../../types';
import {
  getDietPlanCategories,
  MealCategory,
  DietMealItem,
} from '../../data/nutrition/dietPlanData';
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
} from 'lucide-react';

interface AthleteDietPlanSectionProps {
  language: Language;
  theme?: Theme;
  isVIP?: boolean;
}

export const AthleteDietPlanSection: React.FC<AthleteDietPlanSectionProps> = ({
  language,
  isVIP = false,
}) => {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<'breakfast' | 'lunch' | 'dinner' | 'snacks'>('breakfast');
  const [selectedMealIndex, setSelectedMealIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'featured' | 'grid'>('featured');

  const categories: MealCategory[] = getDietPlanCategories(isVIP ? 'VIP' : 'standard');

  const activeCategory: MealCategory =
    categories.find((c) => c.key === selectedCategoryKey) || categories[0];

  const currentMeal: DietMealItem =
    activeCategory.meals[selectedMealIndex] || activeCategory.meals[0];

  const handleSelectCategory = (key: 'breakfast' | 'lunch' | 'dinner' | 'snacks') => {
    setSelectedCategoryKey(key);
    setSelectedMealIndex(0);
  };

  const handleNextMeal = () => {
    setSelectedMealIndex((prev) => (prev + 1) % activeCategory.meals.length);
  };

  const handlePrevMeal = () => {
    setSelectedMealIndex((prev) => (prev - 1 + activeCategory.meals.length) % activeCategory.meals.length);
  };

  return (
    <section className="relative w-full rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-[#0B132B]/95 via-[#070E24]/95 to-[#030712] border border-orange-500/30 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden select-none">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-extrabold text-xs tracking-wider uppercase mb-2">
            <Utensils className="w-3.5 h-3.5 text-orange-400" />
            <span>{language === 'ar' ? 'الجدول الغذائي الرياضي المعتمد' : 'Official Athletic Nutrition Plan'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
            <span>{language === 'ar' ? 'نظام الوجبات والخيارات المتوازنة' : 'Custom Meal Plan & Options'}</span>
            {isVIP && (
              <span className="text-xs px-2.5 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 font-mono">
                VIP MACROS
              </span>
            )}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
            {language === 'ar'
              ? 'اختر وجبتك المفضلة يومياً من بين 7 خيارات للفطور، 7 للغداء، 7 للعشاء، و6 خيارات للسناكات.'
              : 'Choose your preferred meals daily: 7 Breakfast, 7 Lunch, 7 Dinner, and 6 Snack options.'}
          </p>
        </div>

        {/* View Toggle (Featured Detail vs All Grid) */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl">
          <button
            onClick={() => setViewMode('featured')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'featured'
                ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md'
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
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {language === 'ar' ? 'عرض جميع الأصناف' : 'All Options'}
          </button>
        </div>
      </div>

      {/* Category Selection Tabs (فطور = 7, غداء = 7, عشاء = 7, سناكين = 6) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 my-6">
        {categories.map((cat) => {
          const isSelected = selectedCategoryKey === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => handleSelectCategory(cat.key)}
              className={`p-3.5 sm:p-4 rounded-2xl border text-start transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-gradient-to-br from-[#1C2541] via-[#0B132B] to-[#120F05] border-orange-500 shadow-[0_0_25px_rgba(234,88,12,0.35)] scale-[1.02]'
                  : 'bg-black/30 border-white/10 hover:border-white/20 text-slate-300 hover:bg-white/5'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xl sm:text-2xl">{cat.icon}</span>
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-orange-500 text-white shadow-xs'
                      : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {language === 'ar' ? `${cat.itemCount} أصناف` : `${cat.itemCount} Items`}
                </span>
              </div>
              <div>
                <h3 className={`font-black text-sm sm:text-base ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {language === 'ar' ? cat.titleAr : cat.titleEn}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 line-clamp-1 mt-0.5">
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
          {/* Sub-item Quick Picker Bar (Pills 1 to 7) */}
          <div className="flex items-center justify-between gap-2 overflow-x-auto pb-2 scrollbar-none">
            <div className="flex items-center gap-1.5 min-w-max">
              {activeCategory.meals.map((meal, idx) => {
                const isCurrent = idx === selectedMealIndex;
                return (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedMealIndex(idx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isCurrent
                        ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white border-orange-400 shadow-[0_0_15px_rgba(234,88,12,0.4)] scale-105'
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
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 rtl:rotate-180" />
              </button>
              <button
                onClick={handleNextMeal}
                aria-label="Next Meal"
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>

          {/* Active Meal Detailed Card */}
          <div className="rounded-3xl p-6 sm:p-8 bg-[#050C1F]/90 border-2 border-orange-500/40 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="px-3 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-mono font-bold text-xs">
                    {language === 'ar' ? `الخيار رقم ${selectedMealIndex + 1} من ${activeCategory.itemCount}` : `Option ${selectedMealIndex + 1} of ${activeCategory.itemCount}`}
                  </span>
                  {currentMeal.tagsAr.map((tag, tIdx) => (
                    <span
                      key={tIdx}
                      className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300 text-[11px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white leading-tight">
                  {currentMeal.nameAr}
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-mono">
                  {currentMeal.nameEn} • {currentMeal.portionAr}
                </p>
              </div>

              {/* Calories Highlight Box */}
              <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-gradient-to-br from-orange-600/20 via-orange-500/10 to-amber-500/20 border border-orange-500/50 shrink-0 shadow-[0_0_20px_rgba(234,88,12,0.2)]">
                <Flame className="w-7 h-7 text-orange-500 shrink-0" />
                <div className="text-start">
                  <span className="text-[10px] text-slate-400 block font-bold uppercase">
                    {language === 'ar' ? 'إجمالي السعرات' : 'TOTAL ENERGY'}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-black text-white font-mono">
                      {currentMeal.calories}
                    </span>
                    <span className="text-xs font-bold text-orange-400">KCAL</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Macros Breakdown 4-Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Protein */}
              <div className="p-4 rounded-2xl bg-black/40 border border-emerald-500/40 text-center shadow-xs">
                <div className="w-8 h-8 mx-auto rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center mb-2">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-slate-400 block font-bold">
                  {language === 'ar' ? 'البروتين الصافي' : 'Protein'}
                </span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {currentMeal.protein} <span className="text-xs font-bold">غرام</span>
                </span>
              </div>

              {/* Carbs */}
              <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/40 text-center shadow-xs">
                <div className="w-8 h-8 mx-auto rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center mb-2">
                  <Wheat className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-slate-400 block font-bold">
                  {language === 'ar' ? 'الكربوهيدرات' : 'Carbs'}
                </span>
                <span className="text-xl font-black text-amber-300 font-mono">
                  {currentMeal.carbs} <span className="text-xs font-bold">غرام</span>
                </span>
              </div>

              {/* Fats */}
              <div className="p-4 rounded-2xl bg-black/40 border border-rose-500/40 text-center shadow-xs">
                <div className="w-8 h-8 mx-auto rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center mb-2">
                  <Droplet className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-slate-400 block font-bold">
                  {language === 'ar' ? 'الدهون الصحية' : 'Healthy Fats'}
                </span>
                <span className="text-xl font-black text-rose-400 font-mono">
                  {currentMeal.fats} <span className="text-xs font-bold">غرام</span>
                </span>
              </div>

              {/* Fibers / Meal Size */}
              <div className="p-4 rounded-2xl bg-black/40 border border-blue-500/40 text-center shadow-xs">
                <div className="w-8 h-8 mx-auto rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center mb-2">
                  <Utensils className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-slate-400 block font-bold">
                  {language === 'ar' ? 'حجم الحصة' : 'Portion'}
                </span>
                <span className="text-sm font-black text-blue-300 truncate block mt-1">
                  {currentMeal.portionAr}
                </span>
              </div>
            </div>

            {/* Ingredients & Quantities Breakdown */}
            <div className="space-y-3 bg-black/30 p-5 rounded-2xl border border-white/5">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{language === 'ar' ? 'المكونات والمقادير المحددة بدقة (بالغرام):' : 'Exact Ingredients & Gram Portions:'}</span>
              </h4>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                {currentMeal.ingredientsAr.map((ing, iIdx) => (
                  <li
                    key={iIdx}
                    className="flex items-start gap-2 text-xs text-slate-300 bg-white/5 p-3 rounded-xl border border-white/5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coach Omar Adnan's Expert Nutrition Tip */}
            <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-s-4 border-orange-500 border-t border-b border-e border-orange-500/20 flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-black text-orange-400 block mb-0.5">
                  {language === 'ar' ? 'توجيه الكوتش عمر عدنان للوجبة:' : 'Coach Omar Adnan Tip:'}
                </span>
                <p className="text-xs text-slate-200 leading-relaxed font-medium">
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
              className="p-5 rounded-2xl bg-[#050C1F]/90 border border-white/10 hover:border-orange-500 transition-all hover:scale-[1.02] cursor-pointer flex flex-col justify-between space-y-4 shadow-lg group"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-bold font-mono">
                    {language === 'ar' ? `صنف ${mIdx + 1}` : `Item ${mIdx + 1}`}
                  </span>
                  <span className="font-mono text-white font-bold">
                    {meal.calories} KCAL
                  </span>
                </div>
                <h4 className="font-black text-white text-base group-hover:text-orange-400 transition-colors">
                  {meal.nameAr}
                </h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                  {meal.tipAr}
                </p>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs font-mono font-bold text-slate-300">
                <span className="text-emerald-400">{meal.protein}g P</span>
                <span className="text-amber-300">{meal.carbs}g C</span>
                <span className="text-rose-400">{meal.fats}g F</span>
                <span className="text-orange-400 text-[11px] font-sans group-hover:underline">
                  {language === 'ar' ? 'التفاصيل ➔' : 'View ➔'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Nutrition Note */}
      <div className="mt-6 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 font-medium">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            {language === 'ar'
              ? 'جميع الكميات والمقادير محسوبة وفق الاحتياج اليومي للوصول إلى الوزن المستهدف.'
              : 'All meals are calibrated to meet daily macro and caloric requirements.'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-orange-400 font-bold">
          <Info className="w-3.5 h-3.5" />
          <span>{language === 'ar' ? 'إجمالي الخيارات المتاحة: 27 صنفاً غذائياً' : '27 Total Meal Options Available'}</span>
        </div>
      </div>
    </section>
  );
};
