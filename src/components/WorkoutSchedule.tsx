import React, { useState } from 'react';
import { WorkoutDay, Exercise, Language, Theme, ClientProfile } from '../types';
import { ChevronDown, ChevronUp, Play, CheckCircle2, Clock, Dumbbell, ShieldCheck, MessageCircle, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEffects } from '../utils/audio';

interface WorkoutScheduleProps {
  days: WorkoutDay[];
  onUpdateWorkout: (updatedDays: WorkoutDay[]) => void;
  onOpenVideo: (exercise: Exercise) => void;
  onStartRestTimer: (seconds: number) => void;
  language: Language;
  theme?: Theme;
  profile?: ClientProfile;
  onScrollToCoachNotes?: () => void;
}

export const WorkoutSchedule: React.FC<WorkoutScheduleProps> = ({
  days,
  onUpdateWorkout,
  onOpenVideo,
  onStartRestTimer,
  language,
  profile,
  onScrollToCoachNotes,
}) => {
  const [expandedDayKey, setExpandedDayKey] = useState<string>('upper');
  const [activeExerciseDetailsId, setActiveExerciseDetailsId] = useState<string | null>(null);

  const toggleDay = (key: string) => {
    setExpandedDayKey((prev) => (prev === key ? '' : key));
  };

  const handleSetChange = (
    dayIndex: number,
    exIndex: number,
    setIndex: number,
    field: 'completedWeightKg' | 'completedReps',
    value: string
  ) => {
    const newDays = [...days];
    newDays[dayIndex].exercises[exIndex].sets[setIndex][field] = value;
    onUpdateWorkout(newDays);
  };

  const toggleSetComplete = (dayIndex: number, exIndex: number, setIndex: number) => {
    const newDays = [...days];
    const targetSet = newDays[dayIndex].exercises[exIndex].sets[setIndex];
    const isNowCompleted = !targetSet.isCompleted;
    targetSet.isCompleted = isNowCompleted;

    if (isNowCompleted) {
      soundEffects.playSetComplete();

      if (!targetSet.completedWeightKg && targetSet.targetWeightKg) {
        targetSet.completedWeightKg = String(targetSet.targetWeightKg);
      }
      if (!targetSet.completedReps && targetSet.targetReps) {
        targetSet.completedReps = targetSet.targetReps;
      }

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

      const restSecs = newDays[dayIndex].exercises[exIndex].recommendedRestSeconds || 90;
      onStartRestTimer(restSecs);
    }

    onUpdateWorkout(newDays);
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
        const totalSets = day.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
        const completedSets = day.exercises.reduce(
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
              onClick={() => toggleDay(day.key)}
              className="w-full py-3.5 px-5 flex items-center justify-between text-start group select-none transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                {/* Vibrant Navy + Orange + White Badge */}
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
                    {day.exercises.map((exercise, exIndex) => {
                      const isDetailsOpen = activeExerciseDetailsId === exercise.id;
                      const completedCount = exercise.sets.filter((s) => s.isCompleted).length;
                      const isAllSetsDone = completedCount === exercise.sets.length;

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
                                onClick={() => onOpenVideo(exercise)}
                                className="flex items-center gap-2.5 group/btn text-start cursor-pointer"
                                title="Watch Video Demonstration"
                              >
                                {/* Vibrant Navy + Orange + White Badge */}
                                <div className="p-2 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-all shadow-md">
                                  <Play className="w-3.5 h-3.5 fill-current" />
                                </div>
                                <div>
                                  <span className="font-black text-sm text-[#0B132B] dark:text-white group-hover/btn:text-orange-600 dark:group-hover/btn:text-orange-400 transition-colors block">
                                    {language === 'ar' ? exercise.nameAr : exercise.nameEn}
                                  </span>
                                  <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold">
                                    {language === 'ar' ? exercise.targetMuscleAr : exercise.targetMuscleEn}
                                  </span>
                                </div>
                              </button>

                              <button
                                onClick={() => onOpenVideo(exercise)}
                                className="text-[10px] px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/40 hover:bg-orange-500 hover:text-white transition-colors shrink-0 font-bold cursor-pointer"
                              >
                                {language === 'ar' ? '🎥 الشرح' : '🎥 Video'}
                              </button>
                            </div>

                            {/* Sets Badge - High Contrast */}
                            <div className="sm:col-span-3 flex items-center justify-center">
                              <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] border border-blue-500/40 text-blue-300 font-black text-xs shadow-xs">
                                {exercise.setsCount} {language === 'ar' ? 'جلسات' : 'Sets'}
                              </span>
                            </div>

                            {/* Reps Badge & Logger Toggle - High Contrast */}
                            <div className="sm:col-span-3 flex items-center justify-center gap-2">
                              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] border border-orange-500/40 text-orange-300 font-black text-xs flex items-center gap-1 shadow-xs">
                                <span className="text-orange-400">⚡</span>
                                <span>{exercise.repsRange}</span>
                              </span>

                              <button
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

                          {/* Interactive Set Logger Panel */}
                          {isDetailsOpen && (
                            <div className="mt-4 pt-3 border-t border-slate-300/80 dark:border-white/10 animate-in fade-in duration-200">
                              <div className="flex items-center justify-between mb-2.5">
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                                  {language === 'ar'
                                    ? 'سجل الوزن الفعلي والتكرارات المنجزة:'
                                    : 'Record actual weight & completed reps:'}
                                </span>
                                <button
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
                                    key={setIndex}
                                    className={`flex items-center justify-between p-2.5 rounded-xl border text-xs shadow-xs ${
                                      set.isCompleted
                                        ? 'bg-emerald-100/70 dark:bg-emerald-950/30 border-emerald-500/50 text-emerald-900 dark:text-emerald-200'
                                        : 'bg-white dark:bg-black/40 border-slate-300/80 dark:border-white/10 text-[#0B132B] dark:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-black text-orange-600 dark:text-orange-400 text-sm">
                                        #{set.setNumber}
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-400 font-bold">
                                        ({language === 'ar' ? 'الهدف' : 'Target'}: {set.targetWeightKg}kg × {set.targetReps})
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {/* Weight input - Crisp high contrast */}
                                      <div className="flex items-center gap-1 bg-[#EEF2F6] dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/10">
                                        <input
                                          type="number"
                                          placeholder={String(set.targetWeightKg || '0')}
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
                                          className="w-12 bg-transparent text-[#0B132B] dark:text-white font-black text-center outline-none"
                                        />
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">KG</span>
                                      </div>

                                      {/* Reps input - Crisp high contrast */}
                                      <div className="flex items-center gap-1 bg-[#EEF2F6] dark:bg-white/5 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-white/10">
                                        <input
                                          type="text"
                                          placeholder={set.targetReps}
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
                                          className="w-10 bg-transparent text-[#0B132B] dark:text-white font-black text-center outline-none"
                                        />
                                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold">
                                          {language === 'ar' ? 'تكرار' : 'reps'}
                                        </span>
                                      </div>

                                      {/* Checkmark complete button */}
                                      <button
                                        onClick={() => toggleSetComplete(dayIndex, exIndex, setIndex)}
                                        className={`px-3 py-1.5 rounded-lg font-black flex items-center gap-1 transition-all cursor-pointer shadow-xs ${
                                          set.isCompleted
                                            ? 'bg-emerald-600 text-white shadow-[0_0_10px_rgba(16,185,129,0.5)]'
                                            : 'bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:bg-orange-500 text-white'
                                        }`}
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>{set.isCompleted ? (language === 'ar' ? 'تمت' : 'Done') : (language === 'ar' ? 'إكمال' : 'Check')}</span>
                                      </button>
                                    </div>
                                  </div>
                                ))}
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
