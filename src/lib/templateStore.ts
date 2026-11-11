import { WorkoutDay } from '../types';
import { MealCategory } from '../data/nutrition/dietPlanData';

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

const STORAGE_KEYS = {
  WORKOUT_TEMPLATES: 'oao_workout_templates',
  MEAL_TEMPLATES: 'oao_meal_templates',
};

// Default pre-seeded Workout Templates
export const DEFAULT_WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'wt_push_pull_legs',
    nameAr: 'نظام PPL الاحترافي (دفع / سحب / أرجل / راحة / علوي)',
    nameEn: 'Push Pull Legs Upper Split (5 Days)',
    category: 'hypertrophy',
    descriptionAr: 'خطة تدريبية متكاملة لزيادة الكتلة العضلية مع توازن الضغط العصبي والاستشفاء.',
    createdAt: '2026-11-01T00:00:00.000Z',
    workoutDays: [], // populated dynamically from initial workout days
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

export function getWorkoutTemplates(): WorkoutTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_WORKOUT_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WORKOUT_TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.WORKOUT_TEMPLATES, JSON.stringify(DEFAULT_WORKOUT_TEMPLATES));
      return DEFAULT_WORKOUT_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_WORKOUT_TEMPLATES;
  } catch {
    return DEFAULT_WORKOUT_TEMPLATES;
  }
}

export function saveWorkoutTemplate(template: WorkoutTemplate): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getWorkoutTemplates();
    const idx = existing.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      existing[idx] = template;
    } else {
      existing.unshift(template);
    }
    localStorage.setItem(STORAGE_KEYS.WORKOUT_TEMPLATES, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('oao_workout_templates_updated', { detail: existing }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed to save workout template:', err);
  }
}

export function deleteWorkoutTemplate(templateId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getWorkoutTemplates().filter((t) => t.id !== templateId);
    localStorage.setItem(STORAGE_KEYS.WORKOUT_TEMPLATES, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('oao_workout_templates_updated', { detail: existing }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed to delete workout template:', err);
  }
}

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

export function getMealPlanTemplates(): MealPlanTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_MEAL_TEMPLATES;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MEAL_TEMPLATES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.MEAL_TEMPLATES, JSON.stringify(DEFAULT_MEAL_TEMPLATES));
      return DEFAULT_MEAL_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_MEAL_TEMPLATES;
  } catch {
    return DEFAULT_MEAL_TEMPLATES;
  }
}

export function saveMealPlanTemplate(template: MealPlanTemplate): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getMealPlanTemplates();
    const idx = existing.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      existing[idx] = template;
    } else {
      existing.unshift(template);
    }
    localStorage.setItem(STORAGE_KEYS.MEAL_TEMPLATES, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('oao_meal_templates_updated', { detail: existing }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed to save meal plan template:', err);
  }
}

export function deleteMealPlanTemplate(templateId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getMealPlanTemplates().filter((t) => t.id !== templateId);
    localStorage.setItem(STORAGE_KEYS.MEAL_TEMPLATES, JSON.stringify(existing));
    window.dispatchEvent(new CustomEvent('oao_meal_templates_updated', { detail: existing }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed to delete meal plan template:', err);
  }
}
