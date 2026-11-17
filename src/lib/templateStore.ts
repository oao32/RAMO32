import { WorkoutDay } from '../types';
import { MealCategory } from '../data/nutrition/dietPlanData';
import { getSupabaseClient } from './supabase';

export interface WorkoutTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'hypertrophy' | 'fat_loss' | 'strength' | 'beginner' | 'general';
  descriptionAr: string;
  createdAt: string;
  workoutDays: WorkoutDay[];
}

export interface MealPlanTemplate {
  id: string;
  nameAr: string;
  nameEn: string;
  category: 'bulk' | 'cut' | 'maintenance' | 'keto' | 'general';
  targetCalories: number;
  macros: {
    protein: number;
    carbs: number;
    fats: number;
  };
  descriptionAr: string;
  createdAt: string;
  categories: MealCategory[];
}

// Default pre-seeded Workout Templates
export const DEFAULT_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'wt_push_pull_legs',
    nameAr: 'نظام PPL الاحترافي (دفع / سحب / أرجل / راحة / علوي)',
    nameEn: 'Push Pull Legs Upper Split (5 Days)',
    category: 'hypertrophy',
    descriptionAr: 'خطة تدريبية متكاملة لزيادة الكتلة العضلية مع توازن الضغط العصبي والاستشفاء.',
    createdAt: '2026-11-01T00:00:00.000Z',
    workoutDays: [],
  },
  {
    id: 'wt_chest_focus',
    nameAr: 'خطة التركيز العالي على الصدر والكتف الأمامي',
    nameEn: 'Chest & Delts Hypertrophy Focus',
    category: 'hypertrophy',
    descriptionAr: 'جدول مخصص لترقية عضلات الصدر العلوي والأكتاف مع عزل دقيق وحجم تدريبي مكثف.',
    createdAt: '2026-11-01T00:00:00.000Z',
    workoutDays: [],
  },
  {
    id: 'wt_fat_loss_conditioning',
    nameAr: 'خطة تنشيف سريع وحرق دهون مع الحفاظ على القوة',
    nameEn: 'Fat Loss & High Density Conditioning',
    category: 'fat_loss',
    descriptionAr: 'تكرارات متوسطة إلى عالية مع فترات راحة مقننة لرفع معدل الأيض دون هدم الألياف.',
    createdAt: '2026-11-01T00:00:00.000Z',
    workoutDays: [],
  },
];

// Default pre-seeded Meal Plan Templates
export const DEFAULT_MEAL_TEMPLATES: MealPlanTemplate[] = [
  {
    id: 'mt_clean_bulk_2500',
    nameAr: 'خطة التضخيم الصافي النخبوي (2500 سعرة حرارية)',
    nameEn: 'Elite Clean Bulk (2500 kcal)',
    category: 'bulk',
    targetCalories: 2500,
    macros: { protein: 180, carbs: 280, fats: 70 },
    descriptionAr: 'توزيع غذائي استراتيجي ببروتين عالي وكارب معقد لدعم التمارين الثقيلة والاستشفاء الصافي.',
    createdAt: '2026-11-01T00:00:00.000Z',
    categories: [],
  },
  {
    id: 'mt_fat_loss_1800',
    nameAr: 'خطة التنشيف الذكي وحرق الدهون (1800 سعرة حرارية)',
    nameEn: 'Smart Shred & Fat Loss (1800 kcal)',
    category: 'cut',
    targetCalories: 1800,
    macros: { protein: 165, carbs: 140, fats: 55 },
    descriptionAr: 'عجز سعرات مدروس ومحسوب مع الحفاظ على القوة العضلية والأداء الهرموني المستقر.',
    createdAt: '2026-11-01T00:00:00.000Z',
    categories: [],
  },
  {
    id: 'mt_maintenance_2100',
    nameAr: 'خطة الثبات وإعادة التشكيل العضلي (2100 سعرة حرارية)',
    nameEn: 'Body Recomposition & Maintenance (2100 kcal)',
    category: 'maintenance',
    targetCalories: 2100,
    macros: { protein: 160, carbs: 210, fats: 65 },
    descriptionAr: 'مثالية للاستقرار والتدريب المتوازن مع نحت الدهون وبناء الألياف العضلية تدريجياً.',
    createdAt: '2026-11-01T00:00:00.000Z',
    categories: [],
  },
];

// Ephemeral in-memory caches synced directly with Supabase (Zero localStorage)
let workoutTemplatesMemoryCache: WorkoutTemplate[] = JSON.parse(JSON.stringify(DEFAULT_WORKOUT_TEMPLATES));
let mealTemplatesMemoryCache: MealPlanTemplate[] = JSON.parse(JSON.stringify(DEFAULT_MEAL_TEMPLATES));

const WORKOUT_TEMPLATES_ROW_ID = 'admin_workout_templates';
const MEAL_TEMPLATES_ROW_ID = 'admin_meal_templates';

export function getWorkoutTemplates(): WorkoutTemplate[] {
  return workoutTemplatesMemoryCache;
}

export async function fetchWorkoutTemplatesFromSupabase(): Promise<WorkoutTemplate[]> {
  const client = getSupabaseClient();
  if (!client) return workoutTemplatesMemoryCache;

  try {
    const { data, error } = await client
      .from('workouts')
      .select('workout_data')
      .eq('id', WORKOUT_TEMPLATES_ROW_ID)
      .maybeSingle();

    if (!error && data && Array.isArray((data as Record<string, unknown>).workout_data)) {
      const list = (data as Record<string, unknown>).workout_data as WorkoutTemplate[];
      if (list.length > 0) {
        workoutTemplatesMemoryCache = list;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('oao_workout_templates_updated', { detail: list }));
        }
        return list;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch workout templates from Supabase:', err);
  }
  return workoutTemplatesMemoryCache;
}

async function persistWorkoutTemplatesToSupabase(list: WorkoutTemplate[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('workouts').upsert(
      {
        id: WORKOUT_TEMPLATES_ROW_ID,
        client_id: 'admin_config',
        day_key: 'workout_templates',
        workout_data: list,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (err) {
    console.warn('Failed to persist workout templates to Supabase:', err);
    return false;
  }
}

export async function saveWorkoutTemplate(template: WorkoutTemplate): Promise<void> {
  const existing = [...workoutTemplatesMemoryCache];
  const idx = existing.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    existing[idx] = template;
  } else {
    existing.unshift(template);
  }
  workoutTemplatesMemoryCache = existing;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oao_workout_templates_updated', { detail: existing }));
  }

  await persistWorkoutTemplatesToSupabase(existing);
}

export async function deleteWorkoutTemplate(templateId: string): Promise<void> {
  const existing = workoutTemplatesMemoryCache.filter((t) => t.id !== templateId);
  workoutTemplatesMemoryCache = existing;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oao_workout_templates_updated', { detail: existing }));
  }

  await persistWorkoutTemplatesToSupabase(existing);
}

export function getMealPlanTemplates(): MealPlanTemplate[] {
  return mealTemplatesMemoryCache;
}

export async function fetchMealPlanTemplatesFromSupabase(): Promise<MealPlanTemplate[]> {
  const client = getSupabaseClient();
  if (!client) return mealTemplatesMemoryCache;

  try {
    const { data, error } = await client
      .from('workouts')
      .select('workout_data')
      .eq('id', MEAL_TEMPLATES_ROW_ID)
      .maybeSingle();

    if (!error && data && Array.isArray((data as Record<string, unknown>).workout_data)) {
      const list = (data as Record<string, unknown>).workout_data as MealPlanTemplate[];
      if (list.length > 0) {
        mealTemplatesMemoryCache = list;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('oao_meal_templates_updated', { detail: list }));
        }
        return list;
      }
    }
  } catch (err) {
    console.warn('Failed to fetch meal plan templates from Supabase:', err);
  }
  return mealTemplatesMemoryCache;
}

async function persistMealTemplatesToSupabase(list: MealPlanTemplate[]): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  try {
    const { error } = await client.from('workouts').upsert(
      {
        id: MEAL_TEMPLATES_ROW_ID,
        client_id: 'admin_config',
        day_key: 'meal_templates',
        workout_data: list,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch (err) {
    console.warn('Failed to persist meal plan templates to Supabase:', err);
    return false;
  }
}

export async function saveMealPlanTemplate(template: MealPlanTemplate): Promise<void> {
  const existing = [...mealTemplatesMemoryCache];
  const idx = existing.findIndex((t) => t.id === template.id);
  if (idx >= 0) {
    existing[idx] = template;
  } else {
    existing.unshift(template);
  }
  mealTemplatesMemoryCache = existing;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oao_meal_templates_updated', { detail: existing }));
  }

  await persistMealTemplatesToSupabase(existing);
}

export async function deleteMealPlanTemplate(templateId: string): Promise<void> {
  const existing = mealTemplatesMemoryCache.filter((t) => t.id !== templateId);
  mealTemplatesMemoryCache = existing;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oao_meal_templates_updated', { detail: existing }));
  }

  await persistMealTemplatesToSupabase(existing);
}
