import React, { useState, useEffect } from 'react';
import {
  MealCategory,
  DietMealItem,
  getSavedDietCategories,
  saveDietCategories,
  resetDietCategories,
  STANDARD_DIET_CATEGORIES,
  VIP_PLATINUM_DIET_CATEGORIES,
} from '../../data/nutrition/dietPlanData';
import {
  getMealPlanTemplates,
  saveMealPlanTemplate,
  deleteMealPlanTemplate,
  MealPlanTemplate,
} from '../../lib/templateStore';
import {
  Utensils,
  Plus,
  Trash2,
  Edit3,
  Save,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  Flame,
  Bookmark,
  Layers,
  X,
  Scale,
  Activity,
} from 'lucide-react';

interface AdminDietEditorProps {
  language: 'ar' | 'en';
}

export const AdminDietEditor: React.FC<AdminDietEditorProps> = ({ language }) => {
  const [tier, setTier] = useState<'standard' | 'VIP'>('standard');
  const [categories, setCategories] = useState<MealCategory[]>(() =>
    getSavedDietCategories('standard')
  );
  const [activeCategoryKey, setActiveCategoryKey] = useState<
    'breakfast' | 'lunch' | 'dinner' | 'snacks'
  >('breakfast');

  // Meal Edit/Add Modal State
  const [isMealModalOpen, setIsMealModalOpen] = useState(false);
  const [editingMeal, setEditingMeal] = useState<DietMealItem | null>(null);
  const [formNameAr, setFormNameAr] = useState('');
  const [formNameEn, setFormNameEn] = useState('');
  const [formPortionAr, setFormPortionAr] = useState('');
  const [formCalories, setFormCalories] = useState<number>(400);
  const [formProtein, setFormProtein] = useState<number>(35);
  const [formCarbs, setFormCarbs] = useState<number>(40);
  const [formFats, setFormFats] = useState<number>(10);
  const [formIngredients, setFormIngredients] = useState<string>('');
  const [formTip, setFormTip] = useState<string>('');

  // Templates Modal State
  const [templates, setTemplates] = useState<MealPlanTemplate[]>(() => getMealPlanTemplates());
  const [isSaveTemplateModalOpen, setIsSaveTemplateModalOpen] = useState(false);
  const [isApplyTemplateModalOpen, setIsApplyTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState<MealPlanTemplate['category']>('bulk');

  // Success message
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load categories whenever tier changes
  useEffect(() => {
    setCategories(getSavedDietCategories(tier));
  }, [tier]);

  const activeCategory = categories.find((c) => c.key === activeCategoryKey) || categories[0];

  // Calculate live daily totals across all categories (or sample daily meal: 1 bf + 1 lu + 1 dn + 2 snacks average)
  const calculateDailyAverages = () => {
    const bf = categories.find((c) => c.key === 'breakfast')?.meals || [];
    const lu = categories.find((c) => c.key === 'lunch')?.meals || [];
    const dn = categories.find((c) => c.key === 'dinner')?.meals || [];
    const sn = categories.find((c) => c.key === 'snacks')?.meals || [];

    const avg = (arr: DietMealItem[], key: 'calories' | 'protein' | 'carbs' | 'fats') => {
      if (arr.length === 0) return 0;
      return Math.round(arr.reduce((sum, item) => sum + (item[key] || 0), 0) / arr.length);
    };

    const avgBfCal = avg(bf, 'calories');
    const avgLuCal = avg(lu, 'calories');
    const avgDnCal = avg(dn, 'calories');
    const avgSnCal = avg(sn, 'calories') * 2; // two snacks per day

    const totalCal = avgBfCal + avgLuCal + avgDnCal + avgSnCal;
    const totalP = avg(bf, 'protein') + avg(lu, 'protein') + avg(dn, 'protein') + avg(sn, 'protein') * 2;
    const totalC = avg(bf, 'carbs') + avg(lu, 'carbs') + avg(dn, 'carbs') + avg(sn, 'carbs') * 2;
    const totalF = avg(bf, 'fats') + avg(lu, 'fats') + avg(dn, 'fats') + avg(sn, 'fats') * 2;

    return { totalCal, totalP, totalC, totalF };
  };

  const dailyTotals = calculateDailyAverages();

  // Open modal to add a new meal
  const handleOpenAddMeal = () => {
    setEditingMeal(null);
    setFormNameAr('');
    setFormNameEn('');
    setFormPortionAr('طبق متكامل محسوب الماكروز');
    setFormCalories(450);
    setFormProtein(40);
    setFormCarbs(45);
    setFormFats(12);
    setFormIngredients('200 غرام صدر دجاج\n150 غرام أرز مسلوق\nخضار مشوية');
    setFormTip('تناول الوجبة في التوقيت المناسب لتحفيز الاستشفاء العضلي.');
    setIsMealModalOpen(true);
  };

  // Open modal to edit an existing meal
  const handleOpenEditMeal = (meal: DietMealItem) => {
    setEditingMeal(meal);
    setFormNameAr(meal.nameAr);
    setFormNameEn(meal.nameEn || meal.nameAr);
    setFormPortionAr(meal.portionAr);
    setFormCalories(meal.calories);
    setFormProtein(meal.protein);
    setFormCarbs(meal.carbs);
    setFormFats(meal.fats);
    setFormIngredients(meal.ingredientsAr.join('\n'));
    setFormTip(meal.tipAr || '');
    setIsMealModalOpen(true);
  };

  // Save meal (Create or Update)
  const handleSaveMealForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNameAr.trim()) return;

    const ingredientsList = formIngredients
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const updatedMeal: DietMealItem = {
      id: editingMeal ? editingMeal.id : `meal_${Date.now()}`,
      nameAr: formNameAr.trim(),
      nameEn: formNameEn.trim() || formNameAr.trim(),
      portionAr: formPortionAr.trim() || 'طبق متكامل',
      calories: Number(formCalories) || 0,
      protein: Number(formProtein) || 0,
      carbs: Number(formCarbs) || 0,
      fats: Number(formFats) || 0,
      ingredientsAr: ingredientsList.length > 0 ? ingredientsList : ['مكونات صحية محسوبة الماكروز'],
      tipAr: formTip.trim(),
      tagsAr: editingMeal?.tagsAr || ['نظام معتمد', 'ماكروز دقيقة'],
      isVipExclusive: tier === 'VIP',
    };

    const updatedCategories = categories.map((cat) => {
      if (cat.key !== activeCategoryKey) return cat;
      const mealExists = cat.meals.some((m) => m.id === updatedMeal.id);
      const updatedMeals = mealExists
        ? cat.meals.map((m) => (m.id === updatedMeal.id ? updatedMeal : m))
        : [...cat.meals, updatedMeal];

      return {
        ...cat,
        meals: updatedMeals,
        itemCount: updatedMeals.length,
      };
    });

    setCategories(updatedCategories);
    saveDietCategories(tier, updatedCategories);
    setIsMealModalOpen(false);
    setSaveMessage('تم حفظ الوجبة وتحديث الماكروز بنجاح!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  // Delete meal
  const handleDeleteMeal = (mealId: string) => {
    const updatedCategories = categories.map((cat) => {
      if (cat.key !== activeCategoryKey) return cat;
      const updatedMeals = cat.meals.filter((m) => m.id !== mealId);
      return {
        ...cat,
        meals: updatedMeals,
        itemCount: updatedMeals.length,
      };
    });

    setCategories(updatedCategories);
    saveDietCategories(tier, updatedCategories);
    setSaveMessage('تم حذف الوجبة بنجاح!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  // Reset to default
  const handleResetToDefaults = () => {
    if (confirm('هل أنت متأكد من استعادة الوجبات الافتراضية للباقة؟')) {
      const defaults = resetDietCategories(tier);
      setCategories(defaults);
      setSaveMessage('تم استرجاع قائمة الوجبات الافتراضية بنجاح.');
      setTimeout(() => setSaveMessage(null), 2500);
    }
  };

  // Save current plan as reusable template
  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim()) return;

    const newTemplate: MealPlanTemplate = {
      id: `mt_${Date.now()}`,
      nameAr: newTemplateName.trim(),
      nameEn: newTemplateName.trim(),
      category: newTemplateCategory,
      targetCalories: dailyTotals.totalCal,
      macros: {
        protein: dailyTotals.totalP,
        carbs: dailyTotals.totalC,
        fats: dailyTotals.totalF,
      },
      descriptionAr: `خطة غذائية محفوظة من قبل الكوتش (${dailyTotals.totalCal} سعرة)`,
      createdAt: new Date().toISOString(),
      categories: JSON.parse(JSON.stringify(categories)),
    };

    saveMealPlanTemplate(newTemplate);
    setTemplates(getMealPlanTemplates());
    setIsSaveTemplateModalOpen(false);
    setNewTemplateName('');
    setSaveMessage('تم حفظ الخطة كقالب جاهز للاستخدام بنجاح!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  // Apply a template to current plan
  const handleApplyTemplate = (tmpl: MealPlanTemplate) => {
    if (tmpl.categories && tmpl.categories.length > 0) {
      setCategories(tmpl.categories);
      saveDietCategories(tier, tmpl.categories);
    }
    setIsApplyTemplateModalOpen(false);
    setSaveMessage(`تم تطبيق القالب (${tmpl.nameAr}) بنجاح!`);
    setTimeout(() => setSaveMessage(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Tier Toggle */}
      <div className="bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Utensils className="w-5 h-5 text-orange-400" />
            <span>محرر الأنظمة الغذائية والوجبات المتقدم (Meal Plan CRUD)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إضافة وتعديل وحذف الوجبات، تعديل المكونات والغرامات، وحساب الماكروز تلقائياً
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tier switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-black/50 border border-white/10 rounded-2xl">
            <button
              onClick={() => setTier('standard')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                tier === 'standard'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              الباقة القياسية (Standard)
            </button>
            <button
              onClick={() => setTier('VIP')}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                tier === 'VIP'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              باقة VIP النخبوية
            </button>
          </div>

          {/* Reset to defaults */}
          <button
            onClick={handleResetToDefaults}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="استرجاع الوجبات الافتراضية"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Save Notification */}
      {saveMessage && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-white text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Live Auto-Calculated Daily Macro Totals Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-5 rounded-3xl bg-gradient-to-br from-[#070e24] via-[#0b132b] to-[#040817] border-2 border-orange-500/30 shadow-xl">
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">متوسط السعرات اليومية</span>
          <span className="text-xl font-black text-orange-400 font-mono">
            {dailyTotals.totalCal} Kcal
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">محسوبة تلقائياً</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">البروتين اليومي</span>
          <span className="text-xl font-black text-blue-400 font-mono">
            {dailyTotals.totalP}g
          </span>
          <span className="text-[10px] text-blue-500/80 block mt-0.5">
            {Math.round(((dailyTotals.totalP * 4) / (dailyTotals.totalCal || 1)) * 100)}%
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">الكاربوهيدرات</span>
          <span className="text-xl font-black text-amber-400 font-mono">
            {dailyTotals.totalC}g
          </span>
          <span className="text-[10px] text-amber-500/80 block mt-0.5">
            {Math.round(((dailyTotals.totalC * 4) / (dailyTotals.totalCal || 1)) * 100)}%
          </span>
        </div>
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
          <span className="text-[11px] text-slate-400 block mb-1">الدهون الصحية</span>
          <span className="text-xl font-black text-rose-400 font-mono">
            {dailyTotals.totalF}g
          </span>
          <span className="text-[10px] text-rose-500/80 block mt-0.5">
            {Math.round(((dailyTotals.totalF * 9) / (dailyTotals.totalCal || 1)) * 100)}%
          </span>
        </div>
      </div>

      {/* Templates & Quick Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-[#0B132B]/80 border border-white/10">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-bold text-white">قوالب الخطط الغذائية الجاهزة:</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsApplyTemplateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>تطبيق قالب جاهز ({templates.length})</span>
          </button>

          <button
            onClick={() => setIsSaveTemplateModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>حفظ الخطة الحالية كقالب</span>
          </button>
        </div>
      </div>

      {/* Category Tabs (فطور، غداء، عشاء، سناكات) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategoryKey(cat.key)}
            className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between ${
              activeCategoryKey === cat.key
                ? 'bg-orange-500/15 border-orange-500 text-white ring-2 ring-orange-500/40 shadow-lg'
                : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{cat.icon}</span>
              <div>
                <h4 className="text-xs font-black text-white">{cat.titleAr}</h4>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {cat.meals.length} أصناف مخصصة
                </span>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-orange-400">
              {cat.meals.reduce((sum, m) => sum + m.calories, 0) / (cat.meals.length || 1) | 0} kcal avg
            </span>
          </button>
        ))}
      </div>

      {/* Active Category Header with Add Meal Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5 rounded-2xl bg-[#071329] border border-orange-500/30 shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{activeCategory.icon}</span>
          <div>
            <h3 className="text-base font-black text-white">{activeCategory.titleAr}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{activeCategory.subtitleAr}</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddMeal}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 shadow-lg cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>إضافة وجبة جديدة لهذا القسم</span>
        </button>
      </div>

      {/* Meals Grid for Active Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeCategory.meals.map((meal, idx) => (
          <div
            key={meal.id}
            className="p-5 rounded-3xl bg-[#0B132B]/90 border border-white/10 hover:border-orange-500/40 transition-all shadow-md space-y-3 flex flex-col justify-between group"
          >
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                <span className="px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 text-[10px] font-bold">
                  صنف {idx + 1}
                </span>
                <span className="text-sm font-black text-white font-mono">{meal.calories} Kcal</span>
              </div>

              <h4 className="text-sm font-black text-white leading-snug mb-1">{meal.nameAr}</h4>
              <p className="text-[11px] text-slate-400 font-semibold mb-2">{meal.portionAr}</p>

              {/* Macros Chips */}
              <div className="grid grid-cols-3 gap-1.5 p-2 rounded-xl bg-black/40 border border-white/5 text-center text-[10px] font-mono font-bold mb-3">
                <span className="text-blue-400">{meal.protein}g P</span>
                <span className="text-amber-400">{meal.carbs}g C</span>
                <span className="text-rose-400">{meal.fats}g F</span>
              </div>

              {/* Ingredients preview */}
              <div className="text-[11px] text-slate-300 space-y-1">
                <span className="text-[10px] text-orange-400/90 font-bold block">المكونات والمقادير:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                  {meal.ingredientsAr.slice(0, 3).map((ing, iIdx) => (
                    <li key={iIdx} className="line-clamp-1">{ing}</li>
                  ))}
                  {meal.ingredientsAr.length > 3 && (
                    <li className="text-[10px] text-slate-500">+{meal.ingredientsAr.length - 3} مكونات أخرى...</li>
                  )}
                </ul>
              </div>

              {meal.tipAr && (
                <div className="mt-2.5 p-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[10px] text-slate-300 font-medium">
                  💡 {meal.tipAr}
                </div>
              )}
            </div>

            {/* Meal Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-3">
              <button
                onClick={() => handleOpenEditMeal(meal)}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-orange-400" />
                <span>تعديل</span>
              </button>
              <button
                onClick={() => handleDeleteMeal(meal.id)}
                className="p-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all cursor-pointer"
                title="حذف الوجبة"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT MEAL MODAL */}
      {isMealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setIsMealModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">
                  {editingMeal ? 'تعديل بيانات الوجبة' : 'إضافة وجبة جديدة'}
                </h3>
                <p className="text-xs text-orange-400 font-bold">
                  {activeCategory.titleAr} ({tier === 'VIP' ? 'VIP' : 'Standard'})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveMealForm} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">اسم الوجبة (عربي):</label>
                  <input
                    type="text"
                    required
                    value={formNameAr}
                    onChange={(e) => setFormNameAr(e.target.value)}
                    placeholder="مثال: صدور دجاج مشوية مع بطاطا مهروسة"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">اسم الوجبة (إنجليزي):</label>
                  <input
                    type="text"
                    value={formNameEn}
                    onChange={(e) => setFormNameEn(e.target.value)}
                    placeholder="e.g. Grilled Chicken with Mashed Potato"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">وصف الحصة / التقديم:</label>
                <input
                  type="text"
                  value={formPortionAr}
                  onChange={(e) => setFormPortionAr(e.target.value)}
                  placeholder="مثال: طبق غداء رئيسي متكامل"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
                />
              </div>

              {/* Macros inputs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-black/40 border border-white/10">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">السعرات (Kcal):</label>
                  <input
                    type="number"
                    value={formCalories}
                    onChange={(e) => setFormCalories(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-orange-500 text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-blue-400 block mb-1">البروتين (g):</label>
                  <input
                    type="number"
                    value={formProtein}
                    onChange={(e) => setFormProtein(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-orange-500 text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-amber-400 block mb-1">الكاربوهيدرات (g):</label>
                  <input
                    type="number"
                    value={formCarbs}
                    onChange={(e) => setFormCarbs(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-orange-500 text-white font-mono font-bold outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-rose-400 block mb-1">الدهون (g):</label>
                  <input
                    type="number"
                    value={formFats}
                    onChange={(e) => setFormFats(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/15 focus:border-orange-500 text-white font-mono font-bold outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  المكونات والمقادير (سطر لكل مكون):
                </label>
                <textarea
                  rows={4}
                  value={formIngredients}
                  onChange={(e) => setFormIngredients(e.target.value)}
                  placeholder="200 غرام صدر دجاج مشوي&#10;150 غرام أرز أسمر مسلوق&#10;100 غرام بروكلي على البخار"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none font-sans"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  نصيحة وتوجيه الكوتش للوجبة:
                </label>
                <input
                  type="text"
                  value={formTip}
                  onChange={(e) => setFormTip(e.target.value)}
                  placeholder="مثال: يفضل تناولها قبل التمرين بساعتين لأعلى طاقة وانفجار عضلات"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsMealModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-lg cursor-pointer"
                >
                  {editingMeal ? 'حفظ تعديلات الوجبة' : 'إضافة الوجبة واعتمادها'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAVE MEAL TEMPLATE MODAL */}
      {isSaveTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setIsSaveTemplateModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">حفظ الخطة الحالية كقالب</h3>
                <p className="text-xs text-slate-400 font-medium">
                  إعادة تطبيق هذا النظام على أي مشترك لاحقاً بنقرة واحدة
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveAsTemplate} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اسم القالب:</label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="مثال: خطة تضخيم صافي 2500 سعرة"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">تصنيف الهدف:</label>
                <select
                  value={newTemplateCategory}
                  onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none font-bold"
                >
                  <option value="bulk">تضخيم وبناء عضلي (Bulk)</option>
                  <option value="cut">تنشيف وحرق دهون (Cut)</option>
                  <option value="maintenance">ثبات وإعادة تشكيل (Maintenance)</option>
                  <option value="keto">كيتو / لو كارب (Keto)</option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                <span className="text-slate-400 block mb-1">إجمالي ماكروز القالب:</span>
                <span className="font-mono text-orange-400 font-bold">
                  {dailyTotals.totalCal} Kcal • {dailyTotals.totalP}g P • {dailyTotals.totalC}g C • {dailyTotals.totalF}g F
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveTemplateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-lg cursor-pointer"
                >
                  حفظ القالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* APPLY MEAL TEMPLATE MODAL */}
      {isApplyTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setIsApplyTemplateModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تطبيق قالب غذائي جاهز</h3>
                <p className="text-xs text-slate-400 font-medium">
                  اختر قالباً غذائياً لتطبيقه فوراً على باقة {tier === 'VIP' ? 'VIP' : 'Standard'}
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-orange-500/40 transition-all flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-black text-white">{tmpl.nameAr}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{tmpl.descriptionAr}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono font-bold text-orange-400">
                      <span>{tmpl.targetCalories} Kcal</span>
                      <span className="text-blue-400">{tmpl.macros?.protein}g P</span>
                      <span className="text-amber-400">{tmpl.macros?.carbs}g C</span>
                      <span className="text-rose-400">{tmpl.macros?.fats}g F</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleApplyTemplate(tmpl)}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shrink-0 cursor-pointer shadow-md"
                  >
                    تطبيق 🚀
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
