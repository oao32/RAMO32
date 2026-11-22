import {
  AthleteRank,
  Badge,
  Exercise,
  StreakData,
  SubscriptionPlanTier,
  WorkoutDay,
} from '../types';
import { normalizeExerciseSets } from './workoutUtils';

/**
 * Local calendar date key in `YYYY-MM-DD` format for strict once-per-day streak locking.
 */
export function getTodayDateKey(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Resolves the canonical `YYYY-MM-DD` last streak award date from `StreakData`.
 */
export function getEffectiveLastStreakDate(streakData?: Partial<StreakData> | null): string {
  const raw = streakData?.last_streak_date || streakData?.lastCompletedDate || '';
  return typeof raw === 'string' ? raw.trim() : '';
}

/**
 * Strict once-per-day anti-manipulation check: returns true if the subscriber has
 * already received a streak award for the given calendar day (`YYYY-MM-DD`).
 */
export function isStreakAwardedToday(
  streakData?: Partial<StreakData> | null,
  todayKey: string = getTodayDateKey()
): boolean {
  return getEffectiveLastStreakDate(streakData) === todayKey;
}

/**
 * An exercise is considered completed when all of its configured sets are marked completed.
 */
export function isExerciseCompleted(exercise: Exercise): boolean {
  const normalized = normalizeExerciseSets(exercise);
  return normalized.sets.length > 0 && normalized.sets.every((s) => Boolean(s.isCompleted));
}

/**
 * A non-rest workout day is 100% completed when it has >= 1 exercise and every exercise is completed.
 */
export function isWorkoutDayCompleted(day?: WorkoutDay | null): boolean {
  if (!day || day.isRestDay || !Array.isArray(day.exercises) || day.exercises.length === 0) {
    return false;
  }
  return day.exercises.every((ex) => isExerciseCompleted(ex));
}

export interface DailyWorkoutProgressInfo {
  dayKey: string;
  dayTitleAr: string;
  dayTitleEn: string;
  completedExercises: number;
  totalExercises: number;
  isDayComplete: boolean;
  isAwardedToday: boolean;
}

/**
 * Computes progress (`completedExercises / totalExercises`) for the active workout day
 * and whether today's streak is already awarded & locked.
 */
export function computeDailyWorkoutProgress(
  days: WorkoutDay[],
  streakData?: Partial<StreakData> | null,
  activeDayKey?: string,
  todayKey: string = getTodayDateKey()
): DailyWorkoutProgressInfo {
  const awardedToday = isStreakAwardedToday(streakData, todayKey);
  const nonRestDays = (Array.isArray(days) ? days : []).filter(
    (d) => !d.isRestDay && Array.isArray(d.exercises) && d.exercises.length > 0
  );

  const selectedDay =
    nonRestDays.find((d) => d.key === activeDayKey) ||
    nonRestDays.find((d) => !isWorkoutDayCompleted(d)) ||
    nonRestDays[0];

  if (!selectedDay) {
    return {
      dayKey: '',
      dayTitleAr: 'تمارين اليوم',
      dayTitleEn: "Today's Workout",
      completedExercises: 0,
      totalExercises: 0,
      isDayComplete: false,
      isAwardedToday: awardedToday,
    };
  }

  const totalExercises = selectedDay.exercises.length;
  const completedExercises = selectedDay.exercises.filter((ex) => isExerciseCompleted(ex)).length;

  return {
    dayKey: selectedDay.key,
    dayTitleAr: selectedDay.titleAr,
    dayTitleEn: selectedDay.titleEn,
    completedExercises,
    totalExercises,
    isDayComplete: totalExercises > 0 && completedExercises === totalExercises,
    isAwardedToday: awardedToday,
  };
}

/**
 * Detects whether any non-rest workout day transitioned from incomplete (< 100%)
 * in `prevDays` to 100% completed in `nextDays`.
 */
export function findNewlyCompletedWorkoutDay(
  prevDays: WorkoutDay[],
  nextDays: WorkoutDay[],
  preferredDayKey?: string
): WorkoutDay | null {
  const candidates = (Array.isArray(nextDays) ? nextDays : []).filter(
    (d) => !d.isRestDay && Array.isArray(d.exercises) && d.exercises.length > 0
  );

  const ordered = preferredDayKey
    ? [
        ...candidates.filter((d) => d.key === preferredDayKey),
        ...candidates.filter((d) => d.key !== preferredDayKey),
      ]
    : candidates;

  for (const nextDay of ordered) {
    if (!isWorkoutDayCompleted(nextDay)) continue;
    const prevMatch = (Array.isArray(prevDays) ? prevDays : []).find(
      (p) => (p.id && nextDay.id && p.id === nextDay.id) || p.key === nextDay.key
    );
    if (!prevMatch || !isWorkoutDayCompleted(prevMatch)) {
      return nextDay;
    }
  }

  return null;
}

function getWeekdayCodeFromDate(now: Date = new Date()): string {
  const codes = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  return codes[now.getDay()] || 'We';
}

function calculateDayVolumeKg(day: WorkoutDay): number {
  let total = 0;
  for (const ex of day.exercises || []) {
    const norm = normalizeExerciseSets(ex);
    for (const s of norm.sets) {
      if (!s.isCompleted) continue;
      const w = parseFloat(String(s.completedWeightKg || '0'));
      const r = parseFloat(String(s.completedReps || '0'));
      if (Number.isFinite(w) && w > 0) {
        total += w * (Number.isFinite(r) && r > 0 ? r : 1);
      }
    }
  }
  return Math.round(total);
}

export interface VipStreakAwardResult {
  awarded: boolean;
  streakData: StreakData;
  athleteRank: AthleteRank;
  badges: Badge[];
}

/**
 * Awards +1 daily streak and +50 XP strictly for VIP subscribers upon completing
 * 100% of a workout day, enforcing the once-per-calendar-day lock (`last_streak_date`).
 */
export function applyAutomaticVipDailyStreakAward(params: {
  plan: SubscriptionPlanTier;
  completedDay: WorkoutDay | null;
  streakData: StreakData;
  athleteRank: AthleteRank;
  badges: Badge[];
  todayKey?: string;
}): VipStreakAwardResult {
  const todayKey = params.todayKey || getTodayDateKey();

  // Strictly VIP-only & require a newly completed 100% workout day
  if (params.plan !== 'VIP' || !params.completedDay) {
    return {
      awarded: false,
      streakData: params.streakData,
      athleteRank: params.athleteRank,
      badges: params.badges,
    };
  }

  // Strict once-per-day anti-manipulation lock
  if (isStreakAwardedToday(params.streakData, todayKey)) {
    return {
      awarded: false,
      streakData: params.streakData,
      athleteRank: params.athleteRank,
      badges: params.badges,
    };
  }

  const nextStreakCount = Math.max(0, Number(params.streakData.currentStreak) || 0) + 1;
  const nextLongestStreak = Math.max(nextStreakCount, Number(params.streakData.longestStreak) || 0);
  const nextWorkoutsCount = Math.max(0, Number(params.streakData.totalWorkoutsCompleted) || 0) + 1;
  const dayVolume = calculateDayVolumeKg(params.completedDay);
  const nextTotalVolume = Math.max(0, Number(params.streakData.totalVolumeLiftedKg) || 0) + dayVolume;
  const todayShortEn = getWeekdayCodeFromDate();

  const updatedWeekly = (params.streakData.weeklyActivity || []).map((wDay) => {
    if (wDay.shortNameEn === todayShortEn || wDay.isToday) {
      return {
        ...wDay,
        isCompleted: true,
        isToday: wDay.shortNameEn === todayShortEn ? true : wDay.isToday,
        dateStr: todayKey,
      };
    }
    return wDay;
  });

  const nextStreakData: StreakData = {
    ...params.streakData,
    currentStreak: nextStreakCount,
    longestStreak: nextLongestStreak,
    lastCompletedDate: todayKey,
    last_streak_date: todayKey,
    weeklyActivity: updatedWeekly,
    totalWorkoutsCompleted: nextWorkoutsCount,
    totalVolumeLiftedKg: nextTotalVolume,
  };

  const nextXp = Math.max(0, Number(params.athleteRank.currentXp) || 0) + 50;
  let nextLevel = Math.max(1, Number(params.athleteRank.level) || 1);
  let nextLevelXp = Math.max(500, Number(params.athleteRank.nextLevelXp) || 500);
  let nextTier = params.athleteRank.tier;
  let nextNameAr = params.athleteRank.nameAr;

  while (nextXp >= nextLevelXp) {
    nextLevel += 1;
    nextLevelXp += 500;
  }

  if (nextLevel >= 15) {
    nextTier = 'legend';
    nextNameAr = 'الأسطوري الخارق (Legend Aura 🔥)';
  } else if (nextLevel >= 10 && nextTier === 'bronze') {
    nextTier = 'platinum';
    nextNameAr = 'البلاتينيوم الجبار (Titan)';
  } else if (nextLevel >= 5 && nextTier === 'bronze') {
    nextTier = 'gold';
    nextNameAr = 'الذهبي المتقدم (Gold)';
  } else if (nextLevel >= 2 && nextTier === 'bronze') {
    nextTier = 'silver';
    nextNameAr = 'الفضي الصاعد (Silver)';
  }

  const nextRank: AthleteRank = {
    ...params.athleteRank,
    level: nextLevel,
    currentXp: nextXp,
    nextLevelXp,
    tier: nextTier,
    nameAr: nextNameAr,
  };

  const nextBadges: Badge[] = (params.badges || []).map((b) => {
    if (b.id === 'badge_unbreakable') {
      const unlocked = nextStreakCount >= 30 || b.isUnlocked;
      return {
        ...b,
        isUnlocked: unlocked,
        unlockedDate: unlocked ? b.unlockedDate || todayKey : undefined,
        progress: b.progress ? { ...b.progress, current: Math.min(30, nextStreakCount) } : undefined,
      };
    }
    if (b.id === 'badge_volume_titan') {
      const unlocked = nextTotalVolume >= 25000 || b.isUnlocked;
      return {
        ...b,
        isUnlocked: unlocked,
        unlockedDate: unlocked ? b.unlockedDate || todayKey : undefined,
        progress: b.progress
          ? { ...b.progress, current: Math.min(25000, nextTotalVolume) }
          : undefined,
      };
    }
    return b;
  });

  return {
    awarded: true,
    streakData: nextStreakData,
    athleteRank: nextRank,
    badges: nextBadges,
  };
}
