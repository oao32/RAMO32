import React, { useState } from 'react';
import { WorkoutDay, Exercise, Language, Theme, ClientProfile } from '../types';
import {
  ChevronDown,
  ChevronUp,
  Play,
  CheckCircle2,
  Clock,
  Dumbbell,
  ShieldCheck,
  MessageCircle,
  Sparkles,
  Target,
  Save,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/audio';
import { normalizeExerciseSets } from '../lib/workoutUtils';

interface WorkoutScheduleProps {
  days: WorkoutDay[];
  onUpdateWorkout: (updatedDays: WorkoutDay[], activeDayKey?: string) => Promise<boolean> | boolean | void;
  onActiveDayChange?: (dayKey: string) => void;
  onOpenVideo: (exercise: Exercise) => void;
  onStartRestTimer: (seconds: number) => void;
  language: Language;
  theme?: Theme;
  profile?: ClientProfile;
  onScrollToCoachNotes?: () => void;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const WorkoutSchedule: React.FC<WorkoutScheduleProps> = ({
  days,
  onUpdateWorkout,
  onActiveDayChange,
  onOpenVideo,
  onStartRestTimer,
  language,
  profile,
  onScrollToCoachNotes,
}) => {
  const [expandedDayKey, setExpandedDayKey] = useState<string>(() => {
    if (days.some((d) => d.key === 'upper' && !d.isRestDay)) return 'upper';
    return days.find((d) => !d.isRestDay)?.key || days[0]?.key || 'upper';
  });
  const [activeExerciseDetailsId, setActiveExerciseDetailsId] = useState<string | null>(null);
  const [saveStatusByEx, setSaveStatusByEx] = useState<Record<string, SaveStatus>>({});

  const toggleDay = (key: string) => {
    setExpandedDayKey((prev) => {
      const next = prev === key ? '' : key;
      if (next) onActiveDayChange?.(next);
      return next;
    });
  };

  const commitDaysUpdate = async (
    exerciseId: string,
    updatedDays: WorkoutDay[],
    dayKey?: string
  ) => {
    setSaveStatusByEx((prev) => ({ ...prev, [exerciseId]: 'saving' }));
    try {
      const result = await Promise.resolve(onUpdateWorkout(updatedDays, dayKey || expandedDayKey));
      const ok = result !== false;
      setSaveStatusByEx((prev) => ({ ...prev, [exerciseId]: ok ? 'saved' : 'error' }));
    } catch {
      setSaveStatusByEx((prev) => ({ ...prev, [exerciseId]: 'error' }));
    }
  };

  const handleGoalChange = (dayIndex: number, exIndex: number, goalValue: string) => {
    const targetExerciseId = days[dayIndex]?.exercises[exIndex]?.id;
    if (!targetExerciseId) return;

    const newDays = days.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex, eIdx) => {
          if (eIdx !== exIndex) return ex;
          return normalizeExerciseSets({
            ...ex,
            subscriberGoal: goalValue,
          });
        }),
      };
    });

    void commitDaysUpdate(targetExerciseId, newDays, days[dayIndex]?.key);
  };

  const handleSetChange = (
    dayIndex: number,
    exIndex: number,
    setIndex: number,
    field: 'completedWeightKg' | 'completedReps',
    value: string
  ) => {
    const targetExerciseId = days[dayIndex]?.exercises[exIndex]?.id;
    if (!targetExerciseId) return;

    const newDays = days.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex, eIdx) => {
          if (eIdx !== exIndex) return ex;
          const normalized = normalizeExerciseSets(ex);
          return {
            ...normalized,
            sets: normalized.sets.map((s, sIdx) =>
              sIdx === setIndex ? { ...s, [field]: value } : s
            ),
          };
        }),
      };
    });

    void commitDaysUpdate(targetExerciseId, newDays, days[dayIndex]?.key);
  };

  const toggleSetComplete = (dayIndex: number, exIndex: number, setIndex: number) => {
    const targetEx = days[dayIndex]?.exercises[exIndex];
    if (!targetEx) return;
    const normalizedTarget = normalizeExerciseSets(targetEx);
    const currentSet = normalizedTarget.sets[setIndex];
    if (!currentSet) return;

    const isNowCompleted = !currentSet.isCompleted;

    const newDays = days.map((day, dIdx) => {
      if (dIdx !== dayIndex) return day;
      return {
        ...day,
        exercises: day.exercises.map((ex, eIdx) => {
          const norm = normalizeExerciseSets(ex);
          if (eIdx !== exIndex) return norm;
          return {
            ...norm,
            sets: norm.sets.map((s, sIdx) =>
              sIdx === setIndex ? { ...s, isCompleted: isNowCompleted } : s
            ),
          };
        }),
      };
    });

    if (isNowCompleted) {
      soundEffects.playSetComplete();

      const allDone = newDays[dayIndex].exercises.every((ex) =>
        ex.sets.every((s) => s.isCompleted)
      );
      if (allDone) {
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#f97316', '#ea580c', '#38bdf8', '#ffffff'],
          });
        } catch {
          // ignore
        }
      }

      const restSecs = normalizedTarget.recommendedRestSeconds || 90;
      onStartRestTimer(restSecs);
    }

    void commitDaysUpdate(targetEx.id, newDays, days[dayIndex]?.key);
  };

  const handleManualSaveExercise = (exerciseId: string, dayKey?: string) => {
    const normalizedDays = days.map((day) => ({
      ...day,
      exercises: day.exercises.map((ex) => normalizeExerciseSets(ex)),
    }));
    void commitDaysUpdate(exerciseId, normalizedDays, dayKey);
  };

  return (
    <div className="w-full space-y-3.5">
      {profile && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
          <h3 className="text-orange-600 dark:text-orange-400 font-extrabold text-sm md:text-base flex items-center gap-2">
            <span className="p-1 rounded-lg bg-gradient-to-br from-[#0B132B] to-[#1C2541] text-orange-400">
              <Dumbbell className="w-4 h-4 text-orange-400" />
            </span>
            <span>
              {language === 'ar' ? 'جدول التمارين التفاعلي المعتمد' : 'Interactive Workout Schedule'}
            </span>
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>{language === 'ar' ? 'البرنامج معتمد من الكوتش عمر عدنان ✓' : 'Certified by Coach Omar ✓'}</span>
            </span>

            {onScrollToCoachNotes && (
              <button
                type="button"
                onClick={onScrollToCoachNotes}
                className="px-3 py-1 rounded-full bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'طلب تعديل من الكوتش' : 'Request Adjustment'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {days.map((day, dayIndex) => {
        const isExpanded = expandedDayKey === day.key;
        const normalizedExercises = day.exercises.map((ex) => normalizeExerciseSets(ex));
        const totalSets = normalizedExercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const completedSets = normalizedExercises.reduce(
          (sum, ex) => sum + ex.sets.filter((s) => s.isCompleted).length,
          0
        );
        const dayProgress = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

        return (
          <div
            key={day.id}
            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
              isExpanded
                ? 'bg-[#FAFBFD] dark:bg-[#0b132b] border-orange-500/60 shadow-[0_4px_25px_rgba(234,88,12,0.15)] dark:shadow-[0_0_25px_rgba(249,115,22,0.15)]'
                : 'bg-[#FAFBFD] dark:bg-[#0b132b]/80 border-slate-300/80 dark:border-white/10 hover:border-orange-500/40 shadow-xs'
            }`}
          >
            {/* Accordion Header Button */}
            <button
              type="button"
              onClick={() => toggleDay(day.key)}
              className="w-full py-3.5 px-5 flex items-center justify-between text-start group select-none transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 group-hover:ring-orange-500 transition-all shadow-md">
                  <Dumbbell className="w-4 h-4 text-orange-400 stroke-[2.2]" />
                </span>
                <div>
                  <h4 className="font-black text-sm md:text-base text-[#0B132B] dark:text-white tracking-wider uppercase group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                    {language === 'ar' ? day.titleAr : day.titleEn}
                  </h4>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                    {language === 'ar' ? day.subtitleAr : day.subtitleEn}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!day.isRestDay && (
                  <span className="text-xs px-3 py-1 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] text-orange-400 border border-orange-500/40 font-black shadow-xs font-mono">
                    {dayProgress}%
                  </span>
                )}
                <div className="p-1.5 rounded-xl bg-slate-200 dark:bg-white/5 text-[#0B132B] dark:text-slate-300 group-hover:text-orange-600 dark:group-hover:text-white transition-colors">
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </button>

            {/* Accordion Body Content */}
            {isExpanded && (
              <div className="p-4 border-t border-slate-300/80 dark:border-white/5 bg-[#EEF2F6] dark:bg-[#070a14]/60 animate-in fade-in duration-200">
                {day.isRestDay ? (
                  <div className="py-6 text-center">
                    <Sparkles className="w-10 h-10 text-orange-500 mx-auto mb-2 animate-bounce" />
                    <h5 className="font-black text-[#0B132B] dark:text-white text-base">
                      {language === 'ar' ? 'يوم الراحة وتجديد الطاقة' : 'Active Recovery & Recharge'}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mt-1 font-semibold">
                      {language === 'ar'
                        ? 'استغل هذا اليوم في تغذية أليافك العضلية، شرب كميات وافرة من الماء، ومشي خفيف لتنشيط الدورة الدموية.'
                        : 'Replenish glycogen, maintain hydration, and keep moving with gentle Zone 2 walking.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Table Column Titles */}
                    <div className="hidden sm:grid sm:grid-cols-12 gap-2 text-xs font-black text-orange-700 dark:text-orange-400 px-3 pb-2 border-b border-orange-500/20">
                      <div className="sm:col-span-6 flex items-center gap-1">
                        <span>{language === 'ar' ? 'التمرين (اضغط لمشاهدة الشرح)' : 'Exercise (Click for Tutorial)'}</span>
                      </div>
                      <div className="sm:col-span-3 text-center">
                        <span>{language === 'ar' ? 'الجلسات' : 'Sets Target'}</span>
                      </div>
                      <div className="sm:col-span-3 text-center">
                        <span>{language === 'ar' ? 'العداد (اضغط لإكمال الجلسة)' : 'Reps & Logger'}</span>
                      </div>
                    </div>

                    {/* Exercise items list */}
                    {normalizedExercises.map((exercise, exIndex) => {
                      const isDetailsOpen = activeExerciseDetailsId === exercise.id;
                      const completedCount = exercise.sets.filter((s) => s.isCompleted).length;
                      const isAllSetsDone =
                        exercise.sets.length > 0 && completedCount === exercise.sets.length;
                      const saveStatus = saveStatusByEx[exercise.id] || 'idle';
                      const savedGoalText = (exercise.subscriberGoal || '').trim();

                      return (
                        <div
                          key={exercise.id}
                          className={`rounded-2xl border transition-all p-3 sm:p-4 shadow-xs ${
                            isAllSetsDone
                              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500/40'
                              : 'bg-[#FAFBFD] dark:bg-[#0b132b]/80 border-slate-300/80 dark:border-white/10 hover:border-orange-500/40'
                          }`}
                        >
                          {/* Main Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                            {/* Exercise Name with Video button */}
                            <div className="sm:col-span-6 flex items-center justify-between sm:justify-start gap-2.5">
                              <button
                                type="button"
                                onClick={() => onOpenVideo(exercise)}
                                className="flex items-center gap-2.5 group/btn text-start cursor-pointer"
                                title="Watch Video Demonstration"
                              >
                                <div className="p-2 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-all shadow-md shrink-0">
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </div>
                                <div>
                                  <span className="font-black text-sm text-[#0B132B] dark:text-white group-hover/btn:text-orange-600 dark:group-hover/btn:text-orange-400 transition-colors block">
                                    {language === 'ar' ? exercise.nameAr : exercise.nameEn}
                                  </span>
                                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold block">
                                    {language === 'ar' ? exercise.targetMuscleAr : exercise.targetMuscleEn}
                                  </span>
                                  {savedGoalText && (
                                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-amber-300 text-[10px] font-bold">
                                      <Target className="w-3 h-3 text-orange-500 shrink-0" />
                                      <span>
                                        {language === 'ar' ? 'هدفي:' : 'My Goal:'} {savedGoalText}
                                      </span>
                                    </span>
                                  )}
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => onOpenVideo(exercise)}
                                className="text-[10px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/40 hover:bg-orange-500 hover:text-white transition-colors shrink-0 font-bold cursor-pointer"
                              >
                                {language === 'ar' ? '🎥 الشرح' : '🎥 Video'}
                              </button>
                            </div>

                            {/* Sets Badge - Exact dynamic count */}
                            <div className="sm:col-span-3 flex items-center justify-center">
                              <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] border border-blue-500/40 text-blue-300 font-black text-xs shadow-xs">
                                {exercise.sets.length} {language === 'ar' ? 'جلسات' : 'Sets'}
                              </span>
                            </div>

                            {/* Reps Badge & Logger Toggle */}
                            <div className="sm:col-span-3 flex items-center justify-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] border border-orange-500/40 text-orange-300 font-black text-xs flex items-center gap-1 shadow-xs">
                                <span className="text-orange-400">⚡</span>
                                <span>{exercise.repsRange}</span>
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  setActiveExerciseDetailsId(isDetailsOpen ? null : exercise.id)
                                }
                                className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-colors cursor-pointer ${
                                  isDetailsOpen
                                    ? 'bg-orange-500 text-white border-orange-500 shadow-md'
                                    : 'bg-white dark:bg-white/5 text-[#0B132B] dark:text-slate-300 border-slate-300 dark:border-white/10 hover:border-orange-500'
                                }`}
                              >
                                {isDetailsOpen
                                  ? language === 'ar'
                                    ? 'إخفاء ▲'
                                    : 'Hide ▲'
                                  : language === 'ar'
                                  ? 'تسجيل ▼'
                                  : 'Log ▼'}
                              </button>
                            </div>
                          </div>

                          {/* Interactive Set Logger & Subscriber Goal Window */}
                          {isDetailsOpen && (
                            <div className="mt-4 pt-3 border-t border-slate-300/80 dark:border-white/10 animate-in fade-in duration-200 space-y-3">
                              {/* Subscriber-Defined Goal Field */}
                              <div className="p-3 rounded-xl bg-white dark:bg-black/40 border border-orange-500/30 space-y-1.5">
                                <label className="text-xs font-black text-orange-600 dark:text-amber-400 flex items-center gap-1.5">
                                  <Target className="w-3.5 h-3.5 text-orange-500" />
                                  <span>
                                    {language === 'ar'
                                      ? 'هدفي الشخصي في هذا التمرين:'
                                      : 'My Goal for this Exercise:'}
                                  </span>
                                </label>
                                <input
                                  type="text"
                                  value={exercise.subscriberGoal || ''}
                                  onChange={(e) =>
                                    handleGoalChange(dayIndex, exIndex, e.target.value)
                                  }
                                  placeholder={
                                    language === 'ar'
                                      ? 'اكتب هدفك هنا (مثال: الوصول إلى 60 كجم × 10 تكرارات)'
                                      : 'Enter your personal goal (e.g. Reach 60kg × 10 reps)'
                                  }
                                  className="w-full px-3 py-2 rounded-lg bg-[#EEF2F6] dark:bg-white/5 border border-slate-300 dark:border-white/10 focus:border-orange-500 text-xs font-bold text-[#0B132B] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 outline-none transition-colors"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                                  {language === 'ar'
                                    ? `سجل الوزن الفعلي والتكرارات (${exercise.sets.length} جلسات):`
                                    : `Record actual weight & reps (${exercise.sets.length} sets):`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onStartRestTimer(exercise.recommendedRestSeconds || 90)}
                                  className="text-[11px] text-orange-600 dark:text-orange-400 hover:underline flex items-center gap-1.5 font-bold cursor-pointer"
                                >
                                  <Clock className="w-3.5 h-3.5 text-orange-500" />
                                  <span>{language === 'ar' ? 'بدء الراحة (90s)' : 'Rest Timer (90s)'}</span>
                                </button>
                              </div>

                              <div className="space-y-2">
                                {exercise.sets.map((set, setIndex) => (
                                  <div
                                    key={`${exercise.id}_set_${setIndex + 1}`}
                                    className={`flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl border text-xs shadow-xs ${
                                      set.isCompleted
                                        ? 'bg-emerald-100/70 dark:bg-emerald-950/30 border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-white dark:bg-black/40 border-slate-300/80 dark:border-white/10 text-[#0B132B] dark:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-orange-600 dark:text-orange-400 text-sm">
                                        #{setIndex + 1}
                                      </span>
                                      <span className="text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                                        {language === 'ar' ? `الجلسة ${setIndex + 1}` : `Set ${setIndex + 1}`}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Weight input - Blank by default until subscriber enters value */}
                                      <div className="flex items-center gap-1 bg-[#EEF2F6] dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/10 focus-within:border-orange-500">
                                        <input
                                          type="number"
                                          inputMode="decimal"
                                          placeholder="--"
                                          value={set.completedWeightKg}
                                          onChange={(e) =>
                                            handleSetChange(
                                              dayIndex,
                                              exIndex,
                                              setIndex,
                                              'completedWeightKg',
                                              e.target.value
                                            )
                                          }
                                          className="w-14 bg-transparent text-[#0B132B] dark:text-white font-black text-center outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">KG</span>
                                      </div>

                                      {/* Reps input - Blank by default until subscriber enters value */}
                                      <div className="flex items-center gap-1 bg-[#EEF2F6] dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/10 focus-within:border-orange-500">
                                        <input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="--"
                                          value={set.completedReps}
                                          onChange={(e) =>
                                            handleSetChange(
                                              dayIndex,
                                              exIndex,
                                              setIndex,
                                              'completedReps',
                                              e.target.value
                                            )
                                          }
                                          className="w-12 bg-transparent text-[#0B132B] dark:text-white font-black text-center outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                        />
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                          {language === 'ar' ? 'تكرار' : 'reps'}
                                        </span>
                                      </div>

                                      {/* Checkmark complete button */}
                                      <button
                                        type="button"
                                        onClick={() => toggleSetComplete(dayIndex, exIndex, setIndex)}
                                        className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                                          set.isCompleted
                                            ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                            : 'bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:bg-orange-500 text-white'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>
                                          {set.isCompleted
                                            ? language === 'ar'
                                              ? 'تمت'
                                              : 'Done'
                                            : language === 'ar'
                                            ? 'إكمال'
                                            : 'Check'}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {/* Persistent Save Footer & Cloud Sync Feedback */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-300/60 dark:border-white/10">
                                <div className="text-[11px] font-bold flex items-center gap-1.5">
                                  {saveStatus === 'saving' && (
                                    <span className="text-amber-500 flex items-center gap-1">
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>
                                        {language === 'ar' ? 'جاري الحفظ في حسابك...' : 'Saving to your account...'}
                                      </span>
                                    </span>
                                  )}
                                  {saveStatus === 'saved' && (
                                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>
                                        {language === 'ar' ? 'تم الحفظ في حسابك بشكل دائم ✓' : 'Saved permanently ✓'}
                                      </span>
                                    </span>
                                  )}
                                  {saveStatus === 'error' && (
                                    <span className="text-rose-500 flex items-center gap-1">
                                      <AlertCircle className="w-3.5 h-3.5" />
                                      <span>
                                        {language === 'ar'
                                          ? 'تعذر الحفظ الآن — اضغط حفظ للمحاولة مجدداً'
                                          : 'Save failed — click Save to retry'}
                                      </span>
                                    </span>
                                  )}
                                  {saveStatus === 'idle' && (
                                    <span className="text-slate-500 dark:text-slate-400">
                                      {language === 'ar'
                                        ? 'يتم حفظ هدفك وأوزانك تلقائياً في السحابة'
                                        : 'Goal and sets sync automatically to cloud'}
                                    </span>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleManualSaveExercise(exercise.id, day.key)}
                                  disabled={saveStatus === 'saving'}
                                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 disabled:opacity-60 text-white font-black text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all"
                                >
                                  <Save className="w-3.5 h-3.5" />
                                  <span>{language === 'ar' ? 'حفظ التمرين' : 'Save Exercise'}</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
