import { Exercise, ExerciseSet, WorkoutDay } from '../types';

/**
 * Ensures an exercise's `sets` array always matches its configured `setsCount`
 * (`1`, `2`, `3`, `4`, ...), preserving any existing subscriber-logged weights,
 * reps, completion state, and notes without injecting hardcoded target weights.
 */
export function normalizeExerciseSets(exercise: Exercise): Exercise {
  const parsedCount = Number(exercise.setsCount);
  const existingSets = Array.isArray(exercise.sets) ? exercise.sets : [];
  const exactCount =
    Number.isFinite(parsedCount) && parsedCount >= 1
      ? Math.round(parsedCount)
      : existingSets.length > 0
      ? existingSets.length
      : 3;

  const normalizedSets: ExerciseSet[] = Array.from({ length: exactCount }, (_, idx) => {
    const prev = existingSets[idx];
    if (prev) {
      return {
        setNumber: idx + 1,
        targetReps: '',
        completedWeightKg:
          prev.completedWeightKg !== undefined && prev.completedWeightKg !== null
            ? prev.completedWeightKg
            : '',
        completedReps:
          prev.completedReps !== undefined && prev.completedReps !== null
            ? prev.completedReps
            : '',
        isCompleted: Boolean(prev.isCompleted),
        ...(prev.notes ? { notes: prev.notes } : {}),
      };
    }

    return {
      setNumber: idx + 1,
      targetReps: '',
      completedWeightKg: '',
      completedReps: '',
      isCompleted: false,
    };
  });

  return {
    ...exercise,
    setsCount: exactCount,
    subscriberGoal: typeof exercise.subscriberGoal === 'string' ? exercise.subscriberGoal : '',
    sets: normalizedSets,
  };
}

/**
 * Normalizes every exercise across all workout days so rendered and persisted
 * set rows strictly match each exercise's `setsCount`.
 */
export function normalizeWorkoutDays(days: WorkoutDay[]): WorkoutDay[] {
  if (!Array.isArray(days)) return [];
  return days.map((day) => ({
    ...day,
    exercises: Array.isArray(day.exercises)
      ? day.exercises.map((ex) => normalizeExerciseSets(ex))
      : [],
  }));
}
