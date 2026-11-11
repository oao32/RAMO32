import React, { useState, useEffect } from 'react';
import {
  AIGenerationLog,
  AIPlanType,
  ClientProfile,
  GeneratedAIPlanResponse,
  Language,
  Theme,
  WorkoutDay,
} from '../types';
import {
  fetchAILogs,
  generatePlanAndSaveToSupabase,
  mapGeneratedDaysToSchedule,
} from '../lib/supabase';
import { useSubscriptionAuth } from '../context/SubscriptionAuthContext';
import {
  Dumbbell,
  Utensils,
  RefreshCw,
  CheckCircle2,
  Database,
  Clock,
  Flame,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  History,
} from 'lucide-react';

interface AIPlanGeneratorSectionProps {
  profile: ClientProfile;
  workoutDays: WorkoutDay[];
  onUpdateProfile: (updated: ClientProfile) => void;
  onUpdateWorkouts: (updatedDays: WorkoutDay[]) => void;
  language: Language;
  theme?: Theme;
}

export const AIPlanGeneratorSection: React.FC<AIPlanGeneratorSectionProps> = ({
  profile,
  workoutDays,
  onUpdateProfile,
  onUpdateWorkouts,
  language,
}) => {
  const [selectedGoal, setSelectedGoal] = useState<'recomp' | 'cutting' | 'hypertrophy' | 'strength'>('recomp');
  const [customNotes, setCustomNotes] = useState('');
  const [loadingType, setLoadingType] = useState<AIPlanType | null>(null);
  const [updatingExisting, setUpdatingExisting] = useState(false);

  const [activePlan, setActivePlan] = useState<GeneratedAIPlanResponse | null>(null);
  const [activeLog, setActiveLog] = useState<AIGenerationLog | null>(null);
  const [saveBanner, setSaveBanner] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const [logs, setLogs] = useState<AIGenerationLog[]>([]);
  const [showLogsHistory, setShowLogsHistory] = useState(false);

  const loadLogs = async () => {
    const fetched = await fetchAILogs();
    setLogs(fetched);
    if (!activeLog && fetched.length > 0 && fetched[0].structured_plan) {
      setActiveLog(fetched[0]);
      setActivePlan(fetched[0].structured_plan);
    }
  };

  useEffect(() => {
    loadLogs();
    const handleLogsUpdated = () => {
      loadLogs();
    };
    window.addEventListener('oao-ai-logs-updated', handleLogsUpdated);
    return () => window.removeEventListener('oao-ai-logs-updated', handleLogsUpdated);
  }, []);

  const goals = [
    {
      id: 'recomp' as const,
      labelAr: 'إعادة تشكيل الجسم (عضل صافي + حرق دهون)',
      labelEn: 'Body Recomposition',
    },
    {
      id: 'cutting' as const,
      labelAr: 'تنشيف وخسارة الدهون',
      labelEn: 'Fat Loss & Cutting',
    },
    {
      id: 'hypertrophy' as const,
      labelAr: 'تضخيم وبناء الكتلة العضلية',
      labelEn: 'Muscle Hypertrophy',
    },
    {
      id: 'strength' as const,
      labelAr: 'القوة القصوى والأداء الرياضي',
      labelEn: 'Max Strength & Power',
    },
  ];

  const { canAccessFeature, openUpgradeToVIP } = useSubscriptionAuth();

  const handleGenerate = async (planType: AIPlanType, existingLogId?: string) => {
    const requiredFeature =
      planType === 'nutrition' ? 'interactive_nutrition' : 'custom_ai_workouts';
    if (!canAccessFeature(requiredFeature)) {
      openUpgradeToVIP();
      return;
    }

    setLoadingType(planType);
    if (existingLogId) setUpdatingExisting(true);
    setSaveBanner(null);

    try {
      const { plan, saveResult } = await generatePlanAndSaveToSupabase({
        planType,
        profile,
        goal: selectedGoal,
        customNotes,
        existingLogId,
      });

      setActivePlan(plan);
      setActiveLog(saveResult.log);

      // Apply generated results directly to subscriber's active schedule or nutrition profile
      if (plan.planType === 'workout' && plan.workoutDays && plan.workoutDays.length > 0) {
        const updatedSchedule = mapGeneratedDaysToSchedule(plan.workoutDays, workoutDays);
        onUpdateWorkouts(updatedSchedule);
      } else if (plan.planType === 'nutrition' && plan.nutritionPlan) {
        onUpdateProfile({
          ...profile,
          dailyCalories: plan.nutritionPlan.dailyCalories || profile.dailyCalories,
          dailyWaterGoal: plan.nutritionPlan.waterLiters || profile.dailyWaterGoal,
          macros: {
            protein: plan.nutritionPlan.protein || profile.macros.protein,
            carbs: plan.nutritionPlan.carbs || profile.macros.carbs,
            fats: plan.nutritionPlan.fats || profile.macros.fats,
          },
        });
      }

      await loadLogs();

      if (saveResult.syncedToSupabase) {
        setSaveBanner({
          type: 'success',
          message:
            language === 'ar'
              ? existingLogId
                ? 'تم تحديث البرنامج وحفظ السجل المحدّث في جدول ai_generation_logs في Supabase بنجاح!'
                : 'تم توليد البرنامج وحفظ النتيجة فوراً في جدول ai_generation_logs في Supabase!'
              : existingLogId
              ? 'Plan regenerated and updated in Supabase ai_generation_logs!'
              : 'Plan generated and immediately saved to Supabase ai_generation_logs!',
        });
      } else {
        setSaveBanner({
          type: 'warning',
          message:
            language === 'ar'
              ? `تم توليد البرنامج وتطبيقه محلياً — تنبيه من Supabase: ${saveResult.log.supabase_status_note || saveResult.error || 'تحقق من صلاحيات RLS للجدول ai_generation_logs'}`
              : `Plan generated locally — Supabase note: ${saveResult.error || 'Check RLS policies on ai_generation_logs'}`,
        });
      }
    } catch (err) {
      setSaveBanner({
        type: 'error',
        message:
          err instanceof Error
            ? err.message
            : language === 'ar'
            ? 'تعذر الاتصال بمحرك الذكاء الاصطناعي، يرجى المحاولة مرة أخرى.'
            : 'Failed to generate AI plan. Please try again.',
      });
    } finally {
      setLoadingType(null);
      setUpdatingExisting(false);
    }
  };

  return (
    <section className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/90 dark:border-orange-500/40 rounded-3xl p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]">
            <Flame className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-[#0B132B] dark:text-white">
              {language === 'ar'
                ? 'محرك التصميم الذكي للبرامج التدريبية والغذائية'
                : 'Smart Workout & Nutrition Program Generator'}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
              {language === 'ar'
                ? 'يصمم برنامجك المخصص حسب قياساتك الحيوية ويحفظ السجل تلقائياً في قاعدة بيانات Supabase'
                : 'Builds tailored plans from your biometrics and auto-saves directly to Supabase'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowLogsHistory(!showLogsHistory)}
          className="px-3.5 py-2 rounded-xl bg-slate-200/80 dark:bg-white/5 hover:bg-orange-500/15 border border-slate-300 dark:border-white/10 text-xs font-bold text-[#0B132B] dark:text-slate-200 flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
        >
          <History className="w-4 h-4 text-orange-500" />
          <span>
            {language === 'ar'
              ? `سجلات التوليد (${logs.length})`
              : `Saved Logs (${logs.length})`}
          </span>
          {showLogsHistory ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Goal & Custom Preferences */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
            {language === 'ar' ? 'الهدف التدريبي للمشترك' : 'Primary Training Goal'}
          </label>
          <select
            value={selectedGoal}
            onChange={(e) =>
              setSelectedGoal(e.target.value as 'recomp' | 'cutting' | 'hypertrophy' | 'strength')
            }
            disabled={loadingType !== null}
            className="w-full bg-white dark:bg-[#070a14] border border-slate-300 dark:border-white/15 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs font-bold text-[#0B132B] dark:text-white outline-none"
          >
            {goals.map((g) => (
              <option key={g.id} value={g.id}>
                {language === 'ar' ? g.labelAr : g.labelEn}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1.5">
            {language === 'ar'
              ? 'ملاحظات خاصة (إصابات، حساسية غذائية، أدوات متاحة)'
              : 'Custom Preferences (Injuries, Dietary Notes, Equipment)'}
          </label>
          <input
            type="text"
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            disabled={loadingType !== null}
            placeholder={
              language === 'ar'
                ? 'مثال: التركيز على الصدر العلوي، بدون منتجات ألبان...'
                : 'e.g. Focus on upper chest, lactose-free meals...'
            }
            className="w-full bg-white dark:bg-[#070a14] border border-slate-300 dark:border-white/15 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs text-[#0B132B] dark:text-white outline-none"
          />
        </div>
      </div>

      {/* Primary Generation Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => handleGenerate('workout')}
          disabled={loadingType !== null}
          className="flex-1 min-w-[220px] py-3 px-5 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 disabled:opacity-60 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-[0_6px_20px_rgba(234,88,12,0.35)] transition-all active:scale-98 cursor-pointer"
        >
          {loadingType === 'workout' && !updatingExisting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Dumbbell className="w-4 h-4" />
          )}
          <span>
            {loadingType === 'workout' && !updatingExisting
              ? language === 'ar'
                ? 'جاري توليد البرنامج التدريبي وحفظه في Supabase...'
                : 'Generating Workout & Saving to Supabase...'
              : language === 'ar'
              ? 'توليد برنامج تدريبي وحفظه في Supabase'
              : 'Generate Workout Plan & Save to Supabase'}
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleGenerate('nutrition')}
          disabled={loadingType !== null}
          className="flex-1 min-w-[220px] py-3 px-5 rounded-2xl bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:from-[#162247] hover:to-[#243054] border border-orange-500/50 disabled:opacity-60 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-md transition-all active:scale-98 cursor-pointer"
        >
          {loadingType === 'nutrition' && !updatingExisting ? (
            <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
          ) : (
            <Utensils className="w-4 h-4 text-orange-400" />
          )}
          <span>
            {loadingType === 'nutrition' && !updatingExisting
              ? language === 'ar'
                ? 'جاري توليد النظام الغذائي وحفظه في Supabase...'
                : 'Generating Nutrition & Saving to Supabase...'
              : language === 'ar'
              ? 'توليد برنامج غذائي وحفظه في Supabase'
              : 'Generate Nutrition Plan & Save to Supabase'}
          </span>
        </button>

        {activeLog && (
          <button
            type="button"
            onClick={() => handleGenerate(activeLog.plan_type, activeLog.id)}
            disabled={loadingType !== null}
            className="py-3 px-4 rounded-2xl bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/40 disabled:opacity-60 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs flex items-center gap-2 transition-all cursor-pointer"
            title={
              language === 'ar'
                ? 'إعادة التوليد وتحديث نفس السجل في جدول ai_generation_logs'
                : 'Regenerate and update existing record in ai_generation_logs'
            }
          >
            <RefreshCw className={`w-4 h-4 ${updatingExisting ? 'animate-spin' : ''}`} />
            <span>
              {language === 'ar' ? 'تحديث السجل الحالي' : 'Update Current Log'}
            </span>
          </button>
        )}
      </div>

      {/* Supabase Save Status Banner */}
      {saveBanner && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-bold flex items-start gap-2.5 ${
            saveBanner.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
              : saveBanner.type === 'warning'
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-700 dark:text-amber-300'
              : 'bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-300'
          }`}
        >
          {saveBanner.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p>{saveBanner.message}</p>
            {activeLog && (
              <p className="text-[11px] opacity-80 font-mono mt-1">
                Log ID: {activeLog.id.slice(0, 8)}... • Model: {activeLog.model_name} • Tokens:{' '}
                {activeLog.total_tokens}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Active Generated Plan Preview */}
      {activePlan && (
        <div className="bg-[#EEF2F6] dark:bg-[#070a14] border border-slate-300/80 dark:border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300/70 dark:border-white/10 pb-3">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 dark:text-orange-400">
                {activePlan.planType === 'nutrition'
                  ? language === 'ar'
                    ? 'النظام الغذائي المعتمد للمشترك'
                    : 'GENERATED NUTRITION PLAN'
                  : language === 'ar'
                  ? 'الجدول التدريبي المعتمد للمشترك (تم تطبيقه على جدولك)'
                  : 'GENERATED WORKOUT SPLIT (APPLIED TO SCHEDULE)'}
              </span>
              <h4 className="text-sm sm:text-base font-black text-[#0B132B] dark:text-white mt-0.5">
                {language === 'ar' ? activePlan.titleAr : activePlan.titleEn}
              </h4>
            </div>

            {activeLog && (
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Database className="w-3.5 h-3.5" />
                <span>
                  {activeLog.synced_to_supabase
                    ? language === 'ar'
                      ? 'محفوظ في Supabase'
                      : 'Saved in Supabase'
                    : language === 'ar'
                    ? 'محفوظ محلياً'
                    : 'Saved Locally'}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {language === 'ar' ? activePlan.summaryAr : activePlan.summaryEn}
          </p>

          {/* Nutrition Plan View */}
          {activePlan.planType === 'nutrition' && activePlan.nutritionPlan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="bg-white dark:bg-[#0b132b] p-3 rounded-xl border border-orange-500/30 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">
                    {language === 'ar' ? 'السعرات اليومية' : 'Calories'}
                  </span>
                  <span className="text-base font-black text-orange-600 dark:text-orange-400 font-mono">
                    {activePlan.nutritionPlan.dailyCalories} Kcal
                  </span>
                </div>
                <div className="bg-white dark:bg-[#0b132b] p-3 rounded-xl border border-blue-500/30 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">
                    {language === 'ar' ? 'البروتين' : 'Protein'}
                  </span>
                  <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">
                    {activePlan.nutritionPlan.protein}g
                  </span>
                </div>
                <div className="bg-white dark:bg-[#0b132b] p-3 rounded-xl border border-amber-500/30 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">
                    {language === 'ar' ? 'الكاربوهيدرات' : 'Carbs'}
                  </span>
                  <span className="text-base font-black text-amber-600 dark:text-amber-400 font-mono">
                    {activePlan.nutritionPlan.carbs}g
                  </span>
                </div>
                <div className="bg-white dark:bg-[#0b132b] p-3 rounded-xl border border-emerald-500/30 text-center">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-bold">
                    {language === 'ar' ? 'الدهون الصحية' : 'Fats'}
                  </span>
                  <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                    {activePlan.nutritionPlan.fats}g
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activePlan.nutritionPlan.meals.map((meal, idx) => (
                  <div
                    key={idx}
                    className="bg-white dark:bg-[#0b132b] p-3.5 rounded-xl border border-slate-200 dark:border-white/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-[#0B132B] dark:text-white">
                        {language === 'ar' ? meal.mealNameAr : meal.mealNameEn}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-orange-600 dark:text-orange-400">
                        {meal.calories} Kcal
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      <Clock className="w-3 h-3 text-orange-500" />
                      <span>{language === 'ar' ? meal.timingAr : meal.timingEn}</span>
                      <span>•</span>
                      <span className="font-mono">
                        P:{meal.protein}g C:{meal.carbs}g F:{meal.fats}g
                      </span>
                    </div>
                    <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1 list-disc list-inside">
                      {(language === 'ar' ? meal.itemsAr : meal.itemsEn).map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workout Plan Summary View */}
          {activePlan.planType === 'workout' && activePlan.workoutDays && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activePlan.workoutDays.map((day, idx) => (
                <div
                  key={idx}
                  className="bg-white dark:bg-[#0b132b] p-3.5 rounded-xl border border-slate-200 dark:border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-1.5">
                    <span className="font-black text-xs text-[#0B132B] dark:text-white">
                      {language === 'ar' ? day.titleAr : day.titleEn}
                    </span>
                    <span className="text-[10px] font-mono uppercase text-orange-600 dark:text-orange-400 font-bold">
                      {day.key}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {day.exercises.map((ex, eIdx) => (
                      <div
                        key={eIdx}
                        className="flex items-center justify-between text-xs text-slate-700 dark:text-slate-300"
                      >
                        <span className="font-semibold truncate max-w-[65%]">
                          {language === 'ar' ? ex.nameAr : ex.nameEn}
                        </span>
                        <span className="font-mono text-[11px] text-orange-600 dark:text-orange-400 font-bold">
                          {ex.setsCount} × {ex.repsRange}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Collapsible Supabase `ai_generation_logs` History */}
      {showLogsHistory && (
        <div className="bg-[#EEF2F6] dark:bg-[#070a14] border border-slate-300/80 dark:border-white/10 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-[#0B132B] dark:text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-500" />
              <span>
                {language === 'ar'
                  ? 'سجلات جدول ai_generation_logs المحفوظة'
                  : 'ai_generation_logs Records'}
              </span>
            </h4>
            <button
              type="button"
              onClick={loadLogs}
              className="text-xs text-orange-600 dark:text-orange-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 py-3 text-center">
              {language === 'ar'
                ? 'لا توجد سجلات محفوظة بعد. اضغط على أحد أزرار التوليد أعلاه لإنشاء أول برنامج وحفظه في Supabase.'
                : 'No logs recorded yet. Click a generation button above to create and save a plan.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setActiveLog(item);
                    if (item.structured_plan) {
                      setActivePlan(item.structured_plan);
                    }
                  }}
                  className="bg-white dark:bg-[#0b132b] border border-slate-200 dark:border-white/10 hover:border-orange-500/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-[#0B132B] dark:text-white">
                        {item.plan_type === 'nutrition'
                          ? language === 'ar'
                            ? 'برنامج غذائي وماكروز'
                            : 'Nutrition Plan'
                          : language === 'ar'
                          ? 'برنامج تدريبي'
                          : 'Workout Plan'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.synced_to_supabase
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                            : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {item.synced_to_supabase ? 'Supabase ✓' : 'Local'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                      {item.ai_output || item.prompt_input}
                    </p>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400 shrink-0">
                    {new Date(item.created_at).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};
