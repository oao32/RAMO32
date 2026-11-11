export type Role = 'client' | 'admin';

export type UserSession = 'guest' | 'client' | 'admin';

export type SubscriptionPlanTier = 'standard' | 'VIP';

export type VIPFeatureKey =
  | 'interactive_nutrition'
  | 'direct_coach_chat'
  | 'custom_ai_workouts'
  | 'gamification_rewards';

export type Language = 'ar' | 'en';

export type Theme = 'dark' | 'light';

export interface ClientProfile {
  id: string;
  name: string;
  nameEn: string;
  email?: string;
  phone?: string;
  clientCode?: string;
  avatar?: string;
  subscription_plan: SubscriptionPlanTier;
  weight: number; // in KG
  height: number; // in CM
  muscleMass: number; // in KG
  bodyFat: number; // in %
  targetWeight: number; // in KG
  dailyWaterGoal: number; // in Liters
  dailyWaterCurrent: number; // in Liters
  dailyCalories: number;
  macros: {
    protein: number; // in grams
    carbs: number; // in grams
    fats: number; // in grams
  };
  subscriptionStatus: 'active' | 'expiring' | 'expired';
  subscriptionDaysLeft: number;
  subscriptionStartDate?: string; // e.g. '2026-11-01'
  subscriptionEndDate?: string; // e.g. '2026-12-01'
  coachName: string;
  joinedDate: string;
}

export interface ExerciseSet {
  setNumber: number;
  targetReps: string;
  targetWeightKg?: number;
  completedWeightKg: number | string;
  completedReps: number | string;
  isCompleted: boolean;
  notes?: string;
}

export interface Exercise {
  id: string;
  nameAr: string;
  nameEn: string;
  targetMuscleAr: string;
  targetMuscleEn: string;
  setsCount: number;
  repsRange: string;
  recommendedRestSeconds: number;
  videoUrl?: string;
  thumbnailUrl?: string;
  formTipsAr: string[];
  formTipsEn: string[];
  tempo?: string;
  sets: ExerciseSet[];
}

export interface WorkoutDay {
  id: string;
  key: 'push' | 'pull' | 'rest' | 'legs' | 'upper';
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  isRestDay?: boolean;
  iconName: string;
  exercises: Exercise[];
}

export interface ClientNote {
  id: string;
  clientId: string;
  clientName: string;
  clientEmail?: string;
  subject: string;
  category: 'exercise' | 'nutrition' | 'recovery' | 'general';
  message: string;
  timestamp: string;
  reply?: string;
  replyTimestamp?: string;
  isResolved: boolean;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncedAt?: string;
}

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BadgeCategory = 'streak' | 'strength' | 'nutrition' | 'special';

export interface Badge {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  category: BadgeCategory;
  rarity: BadgeRarity;
  iconName: string;
  xpReward: number;
  isUnlocked: boolean;
  unlockedDate?: string;
  progress?: {
    current: number;
    target: number;
    unitAr: string;
    unitEn: string;
  };
}

export interface WeeklyStreakDay {
  dayAr: string;
  dayEn: string;
  shortNameAr: string;
  shortNameEn: string;
  isCompleted: boolean;
  isRestDay?: boolean;
  isToday?: boolean;
  workoutNameAr?: string;
  dateStr?: string;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
  freezesRemaining: number;
  weeklyActivity: WeeklyStreakDay[];
  totalWorkoutsCompleted: number;
  totalVolumeLiftedKg: number;
  totalMinutesTrained: number;
  bestPRWeightKg: number;
  bestPRExerciseAr: string;
}

export interface AthleteRank {
  tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'legend';
  nameAr: string;
  nameEn: string;
  level: number;
  currentXp: number;
  nextLevelXp: number;
  accentColor: string;
  badgeIcon: string;
}

export type SubscriptionDurationKey = '3_months' | '6_months' | '12_months';

export interface SubscriptionAgreement {
  id: string; // e.g. OAO-AGR-2026-8491
  planId: string;
  subscription_plan: SubscriptionPlanTier;
  planNameAr: string;
  planPrice: number;
  billingCycle: SubscriptionDurationKey | 'monthly' | 'yearly';
  durationLabelAr?: string;
  durationDays?: number;
  startDate?: string; // e.g. '2026-11-01'
  endDate?: string; // e.g. '2026-12-01'

  // Section 1: Personal & Health Data
  fullName: string;
  phoneWhatsapp: string;
  email: string;
  hasHealthIssues: boolean;
  healthIssuesDetails?: string;

  // Section 2: Acknowledgments (All 4 mandatory)
  agreedHealthAndRemoteTraining: boolean;
  agreedDietAndSupplements: boolean;
  agreedIntellectualProperty: boolean;
  agreedPaymentAndRefundPolicy: boolean;

  // Section 3: Final Signature
  digitalSignature: string;
  signedTimestamp: string;

  // Payment & status
  status: 'signed_pending_payment' | 'completed_and_active';
  paymentMethod?: 'apple_pay' | 'card_mada' | 'bank_transfer';
  paymentReference?: string;
  completedTimestamp?: string;
}

export type AIPlanType = 'workout' | 'nutrition';

export interface GeneratedExerciseItem {
  nameAr: string;
  nameEn: string;
  targetMuscleAr: string;
  targetMuscleEn: string;
  setsCount: number;
  repsRange: string;
  targetWeightKg: number;
  restSeconds: number;
  tipAr: string;
  tipEn: string;
}

export interface GeneratedWorkoutDayItem {
  key: 'push' | 'pull' | 'legs' | 'upper';
  titleAr: string;
  titleEn: string;
  subtitleAr: string;
  subtitleEn: string;
  exercises: GeneratedExerciseItem[];
}

export interface GeneratedMealItem {
  mealNameAr: string;
  mealNameEn: string;
  timingAr: string;
  timingEn: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  itemsAr: string[];
  itemsEn: string[];
}

export interface GeneratedAIPlanResponse {
  planType: AIPlanType;
  titleAr: string;
  titleEn: string;
  summaryAr: string;
  summaryEn: string;
  recommendationsAr: string[];
  recommendationsEn: string[];
  workoutDays?: GeneratedWorkoutDayItem[];
  nutritionPlan?: {
    dailyCalories: number;
    protein: number;
    carbs: number;
    fats: number;
    waterLiters: number;
    meals: GeneratedMealItem[];
  };
  modelName: string;
  promptInput: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AIGenerationLog {
  id: string;
  created_at: string;
  updated_at?: string;
  client_id: string | null;
  client_name?: string;
  coach_id?: string | null;
  plan_type: AIPlanType;
  model_name: string;
  prompt_input: string;
  ai_output: string;
  structured_plan?: GeneratedAIPlanResponse;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  synced_to_supabase: boolean;
  supabase_status_note?: string;
}



