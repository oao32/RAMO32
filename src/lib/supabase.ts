import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AIGenerationLog,
  AIPlanType,
  AthleteRank,
  Badge,
  ClientNote,
  ClientProfile,
  ComprehensiveAnalysisData,
  GeneratedAIPlanResponse,
  StreakData,
  SubscriptionAgreement,
  SubscriptionPlanTier,
  WorkoutDay,
} from '../types';
import {
  INITIAL_ATHLETE_RANK,
  INITIAL_BADGES,
  INITIAL_CLIENT_PROFILE,
  INITIAL_STREAK_DATA,
  INITIAL_WORKOUT_DAYS,
} from '../data/initialData';
import {
  MealCategory,
  STANDARD_DIET_CATEGORIES,
  VIP_PLATINUM_DIET_CATEGORIES,
  saveDietCategories,
} from '../data/nutrition/dietPlanData';

// Read exclusively from environment variables (No hardcoded credentials)
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

let runtimeSupabaseConfig: { url?: string; key?: string } = {};

const LEGACY_PLACEHOLDER_IDS = new Set(['client_abdulrahman', 'client_001', 'client_athlete', 'global']);

export function getCanonicalClientKey(clientId?: string | null, email?: string | null): string {
  const cleanId = (clientId || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanId && !LEGACY_PLACEHOLDER_IDS.has(cleanId)) {
    return cleanId;
  }
  if (cleanEmail) {
    return cleanEmail;
  }
  return cleanId || 'global';
}

export function buildCandidateClientKeys(clientId?: string | null, email?: string | null): string[] {
  const keys = new Set<string>();
  const cleanId = (clientId || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();
  if (cleanId && !LEGACY_PLACEHOLDER_IDS.has(cleanId)) {
    keys.add(cleanId);
  }
  if (cleanEmail) {
    keys.add(cleanEmail);
  }
  if (keys.size === 0 && cleanId) {
    keys.add(cleanId);
  }
  return Array.from(keys);
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Format any Supabase or network error into a clear, user-friendly message
 */
export function formatSupabaseErrorMessage(error: unknown): string {
  if (!error) return 'حدث خطأ غير متوقع في الاتصال.';
  const rawMsg =
    typeof error === 'string'
      ? error
      : error instanceof Error
      ? error.message
      : (error as { message?: string }).message || String(error);

  if (rawMsg.includes('Failed to fetch') || rawMsg.includes('NetworkError') || rawMsg.includes('network')) {
    return 'تعذر الاتصال بخادم قاعدة البيانات Supabase (Failed to fetch). يرجى التأكد من توفر اتصال بالإنترنت ومن ضبط متغيرات البيئة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY بشكل صحيح.';
  }
  if (rawMsg.includes('Invalid API key') || rawMsg.includes('JWT') || rawMsg.includes('apikey')) {
    return 'مفتاح الربط (VITE_SUPABASE_ANON_KEY) غير صالح أو منتهي الصلاحية. يرجى مراجعة إعدادات لوحة تحكم Supabase.';
  }
  if (rawMsg.includes('Invalid login credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
  }
  if (rawMsg.includes('Email not confirmed')) {
    return 'البريد الإلكتروني لم يتم تأكيده بعد في Supabase.';
  }
  if (rawMsg.includes('User already registered')) {
    return 'هذا الحساب مسجل مسبقاً، يرجى الانتقال إلى تسجيل الدخول.';
  }
  if (rawMsg.includes('relation') && rawMsg.includes('does not exist')) {
    return 'الجدول غير موجود في قاعدة بيانات Supabase. يرجى تشغيل استعلام SQL الموجود في لوحة التحكم.';
  }
  if (
    rawMsg.toLowerCase().includes('row-level security') ||
    rawMsg.includes('42501') ||
    rawMsg.toLowerCase().includes('violates row-level security policy')
  ) {
    return 'تم حظر العملية بسبب سياسة أمان الصفوف (RLS) في Supabase. يرجى فتح تبويب (قاعدة البيانات و Supabase) ونسخ كود إصلاح RLS وتشغيله في Supabase SQL Editor، أو إضافة SUPABASE_SERVICE_ROLE_KEY في الخادم.';
  }
  if (
    rawMsg.includes('23502') ||
    rawMsg.toLowerCase().includes('not-null') ||
    rawMsg.toLowerCase().includes('null value in column')
  ) {
    const colMatch = rawMsg.match(/null value in column ["']?([a-zA-Z0-9_]+)["']?/i);
    const colName = colMatch?.[1] || 'مطلوب';
    return `فشل الحفظ بسبب وجود حقل (${colName}) مطلوب في قاعدة البيانات (NOT NULL). تم تحديث المعالجة التلقائية، وفي حال استمرار الخطأ شغّل كود إصلاح الجداول من تبويب (قاعدة البيانات و Supabase).`;
  }
  return rawMsg;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; key: string } {
  const url =
    (runtimeSupabaseConfig.url && runtimeSupabaseConfig.url.startsWith('http')
      ? runtimeSupabaseConfig.url.trim()
      : '') || ((import.meta.env.VITE_SUPABASE_URL as string) || '').trim();

  const key =
    (runtimeSupabaseConfig.key && runtimeSupabaseConfig.key.trim().length > 10
      ? runtimeSupabaseConfig.key.trim()
      : '') || ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim();

  return { url, key };
}

export function saveSupabaseConfig(url: string, key: string) {
  runtimeSupabaseConfig = { url: url.trim(), key: key.trim() };
  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient;
  const { url, key } = getSupabaseConfig();
  if (!url || !key || !url.startsWith('http')) return null;

  try {
    // Support global window.supabase loaded via CDN script in index.html or bundled @supabase/supabase-js
    const globalSupabase =
      typeof window !== 'undefined' ? (window as unknown as { supabase?: { createClient: typeof createClient } }).supabase : undefined;

    cachedClient = globalSupabase?.createClient
      ? globalSupabase.createClient(url, key)
      : createClient(url, key);

    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).supabaseClient = cachedClient;
    }

    return cachedClient;
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    return null;
  }
}

export interface SaveAILogInput {
  id?: string; // Provide existing record ID to update an existing log, or omit to create a new record
  clientId?: string | null;
  clientName?: string;
  coachId?: string | null;
  planType: AIPlanType;
  modelName?: string;
  promptInput: string;
  aiOutput: string;
  structuredPlan?: GeneratedAIPlanResponse;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface SaveAILogResult {
  success: boolean;
  syncedToSupabase: boolean;
  log: AIGenerationLog;
  error?: string;
}

export async function saveAILog(input: SaveAILogInput): Promise<SaveAILogResult> {
  const nowIso = new Date().toISOString();
  const recordId = input.id && UUID_REGEX.test(input.id) ? input.id : generateUUID();
  const modelName = input.modelName || 'gemini-3.8-flash';
  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  const totalTokens = input.totalTokens ?? promptTokens + completionTokens;

  const baseRecord: AIGenerationLog = {
    id: recordId,
    created_at: nowIso,
    updated_at: nowIso,
    client_id: input.clientId || null,
    client_name: input.clientName || 'المشترك',
    coach_id: input.coachId || null,
    plan_type: input.planType,
    model_name: modelName,
    prompt_input: input.promptInput,
    ai_output: input.aiOutput,
    structured_plan: input.structuredPlan,
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    total_tokens: totalTokens,
    synced_to_supabase: false,
  };

  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      syncedToSupabase: false,
      log: baseRecord,
      error: 'Supabase client is not initialized.',
    };
  }

  // Prepare rich envelope for prompt_input fallback if table only contains core token/prompt columns
  const serializedEnvelope = JSON.stringify({
    plan_type: input.planType,
    client_id: input.clientId || null,
    client_name: input.clientName || 'المشترك',
    updated_at: nowIso,
    prompt: input.promptInput,
    ai_output: input.aiOutput,
    structured_plan: input.structuredPlan || null,
  });

  const safeUuidClientId =
    input.clientId && UUID_REGEX.test(input.clientId) ? input.clientId : null;
  const safeUuidCoachId =
    input.coachId && UUID_REGEX.test(input.coachId) ? input.coachId : null;

  try {
    // Step 1: Attempt upsert with extended columns (supports custom columns if added)
    const fullRowPayload: Record<string, unknown> = {
      id: recordId,
      client_id: safeUuidClientId,
      coach_id: safeUuidCoachId,
      plan_type: input.planType,
      model_name: modelName,
      prompt_input: input.promptInput,
      ai_output: input.aiOutput,
      prompt_tokens: promptTokens,
      completion_tokens: completionTokens,
      total_tokens: totalTokens,
    };

    let { data, error } = await client
      .from('ai_generation_logs')
      .upsert(fullRowPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    // Step 2: If table schema uses the core `ai_generation_logs` columns without `plan_type` / `ai_output`,
    // automatically adapt and upsert using the verified core columns so zero data is lost.
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message.includes('column'))) {
      const coreRowPayload: Record<string, unknown> = {
        id: recordId,
        client_id: safeUuidClientId,
        coach_id: safeUuidCoachId,
        model_name: modelName,
        prompt_input: serializedEnvelope,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      };

      const retryRes = await client
        .from('ai_generation_logs')
        .upsert(coreRowPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      data = retryRes.data;
      error = retryRes.error;
    }

    if (error) {
      const statusNote =
        error.code === '42501'
          ? 'يتطلب تفعيل صلاحية RLS للجدول ai_generation_logs في Supabase SQL Editor'
          : error.message;

      const failedRecord: AIGenerationLog = {
        ...baseRecord,
        synced_to_supabase: false,
        supabase_status_note: statusNote,
      };
      return {
        success: false,
        syncedToSupabase: false,
        log: failedRecord,
        error: error.message,
      };
    }

    const syncedRecord: AIGenerationLog = {
      ...baseRecord,
      id: (data && typeof data.id === 'string' ? data.id : recordId),
      created_at: (data && typeof data.created_at === 'string' ? data.created_at : nowIso),
      synced_to_supabase: true,
    };
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oao-ai-logs-updated', { detail: [syncedRecord] }));
    }

    return {
      success: true,
      syncedToSupabase: true,
      log: syncedRecord,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Supabase error';
    const failedRecord: AIGenerationLog = {
      ...baseRecord,
      synced_to_supabase: false,
      supabase_status_note: message,
    };
    return {
      success: false,
      syncedToSupabase: false,
      log: failedRecord,
      error: message,
    };
  }
}

// Expose `saveAILog` globally on `window` as well for direct script interoperability
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).saveAILog = saveAILog;
  // Initialize global Supabase client eagerly on load
  getSupabaseClient();
}

/**
 * Fetch AI generation logs exclusively from Supabase `ai_generation_logs`.
 */
export async function fetchAILogs(): Promise<AIGenerationLog[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('ai_generation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) {
      return [];
    }

    return data.map((row: Record<string, unknown>) => {
      let parsedEnvelope: Record<string, unknown> | null = null;
      const rawPrompt = typeof row.prompt_input === 'string' ? row.prompt_input : '';
      if (rawPrompt.trim().startsWith('{')) {
        try {
          parsedEnvelope = JSON.parse(rawPrompt) as Record<string, unknown>;
        } catch {
          parsedEnvelope = null;
        }
      }

      const planType: AIPlanType =
        row.plan_type === 'nutrition' || parsedEnvelope?.plan_type === 'nutrition'
          ? 'nutrition'
          : 'workout';

      const promptText =
        typeof parsedEnvelope?.prompt === 'string' ? parsedEnvelope.prompt : rawPrompt;
      const aiOutputText =
        typeof row.ai_output === 'string'
          ? row.ai_output
          : typeof parsedEnvelope?.ai_output === 'string'
          ? parsedEnvelope.ai_output
          : '';

      return {
        id: String(row.id || generateUUID()),
        created_at: String(row.created_at || new Date().toISOString()),
        client_id: (row.client_id as string | null) ?? (parsedEnvelope?.client_id as string | null) ?? null,
        client_name:
          (typeof parsedEnvelope?.client_name === 'string' ? parsedEnvelope.client_name : undefined) ||
          'المشترك',
        coach_id: (row.coach_id as string | null) ?? null,
        plan_type: planType,
        model_name: String(row.model_name || 'gemini-3.8-flash'),
        prompt_input: promptText,
        ai_output: aiOutputText,
        structured_plan: (parsedEnvelope?.structured_plan as GeneratedAIPlanResponse | undefined) || undefined,
        prompt_tokens: Number(row.prompt_tokens || 0),
        completion_tokens: Number(row.completion_tokens || 0),
        total_tokens: Number(row.total_tokens || 0),
        synced_to_supabase: true,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Unified helper for generation buttons:
 * Calls server-side Gemini API to generate a workout or nutrition plan and
 * IMMEDIATELY saves/updates the result in Supabase `ai_generation_logs` via `saveAILog`.
 */
export async function generatePlanAndSaveToSupabase(options: {
  planType: AIPlanType;
  profile: ClientProfile;
  goal?: string;
  customNotes?: string;
  existingLogId?: string;
}): Promise<{
  plan: GeneratedAIPlanResponse;
  saveResult: SaveAILogResult;
}> {
  const response = await fetch('/api/ai/generate-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      planType: options.planType,
      profile: options.profile,
      goal: options.goal || 'recomp',
      customNotes: options.customNotes || '',
    }),
  });

  const payload = await response.json();
  if (!response.ok || !payload?.plan) {
    throw new Error(payload?.error || 'تعذر توليد البرنامج بالذكاء الاصطناعي حالياً.');
  }

  const plan: GeneratedAIPlanResponse = payload.plan;

  // Format concise, readable text summary of the AI output for storage in `ai_generation_logs`
  const formattedOutput =
    plan.planType === 'nutrition' && plan.nutritionPlan
      ? `${plan.titleAr}\n${plan.summaryAr}\nالسعرات: ${plan.nutritionPlan.dailyCalories} Kcal | بروتين: ${plan.nutritionPlan.protein}g | كارب: ${plan.nutritionPlan.carbs}g | دهون: ${plan.nutritionPlan.fats}g\n` +
        plan.nutritionPlan.meals
          .map(
            (m) => `- ${m.mealNameAr} (${m.timingAr}): ${m.calories} Kcal [${m.itemsAr.join('، ')}]`
          )
          .join('\n')
      : `${plan.titleAr}\n${plan.summaryAr}\n` +
        (plan.workoutDays || [])
          .map(
            (d) =>
              `• ${d.titleAr}: ` +
              d.exercises.map((e) => `${e.nameAr} (${e.setsCount}×${e.repsRange})`).join(' | ')
          )
          .join('\n');

  // Immediately persist to Supabase `ai_generation_logs` upon generation!
  const saveResult = await saveAILog({
    id: options.existingLogId,
    clientId: options.profile.id,
    clientName: options.profile.name,
    planType: plan.planType,
    modelName: plan.modelName,
    promptInput: plan.promptInput,
    aiOutput: formattedOutput,
    structuredPlan: plan,
    promptTokens: plan.promptTokens,
    completionTokens: plan.completionTokens,
    totalTokens: plan.totalTokens,
  });

  return { plan, saveResult };
}

/**
 * Helper to convert AI-generated workout days into the interactive WorkoutDay[] structure
 * used by the OAO WorkoutSchedule component.
 */
export function mapGeneratedDaysToSchedule(
  generatedDays: GeneratedAIPlanResponse['workoutDays'],
  currentDays: WorkoutDay[]
): WorkoutDay[] {
  if (!generatedDays || generatedDays.length === 0) return currentDays;

  const restDay = currentDays.find((d) => d.isRestDay) || {
    id: 'day_rest',
    key: 'rest' as const,
    titleAr: 'يوم الاستشفاء النشط والراحة',
    titleEn: 'Active Recovery & Rest Day',
    subtitleAr: 'تغذية عضلية + مشي خفيف 30 دقيقة',
    subtitleEn: 'Muscle Recovery + Light Zone 2 Walk',
    isRestDay: true,
    iconName: 'Sparkles',
    exercises: [],
  };

  const mappedActiveDays: WorkoutDay[] = generatedDays.map((gDay, idx) => {
    const validKey = ['push', 'pull', 'legs', 'upper'].includes(gDay.key)
      ? (gDay.key as 'push' | 'pull' | 'legs' | 'upper')
      : (['push', 'pull', 'legs', 'upper'][idx % 4] as 'push' | 'pull' | 'legs' | 'upper');

    return {
      id: `ai_day_${validKey}_${Date.now()}_${idx}`,
      key: validKey,
      titleAr: gDay.titleAr,
      titleEn: gDay.titleEn,
      subtitleAr: gDay.subtitleAr,
      subtitleEn: gDay.subtitleEn,
      isRestDay: false,
      iconName: 'Dumbbell',
      exercises: gDay.exercises.map((ex, exIdx) => ({
        id: `ai_ex_${validKey}_${Date.now()}_${exIdx}`,
        nameAr: ex.nameAr,
        nameEn: ex.nameEn,
        targetMuscleAr: ex.targetMuscleAr,
        targetMuscleEn: ex.targetMuscleEn,
        setsCount: ex.setsCount || 3,
        repsRange: ex.repsRange || '8 - 12',
        recommendedRestSeconds: ex.restSeconds || 90,
        formTipsAr: [ex.tipAr || 'تحكم كامل في المدى الحركي مع ثبات الجذع'],
        formTipsEn: [ex.tipEn || 'Full range of motion with controlled tempo'],
        sets: Array.from({ length: ex.setsCount || 3 }, (_, sIdx) => ({
          setNumber: sIdx + 1,
          targetReps: ex.repsRange || '10',
          targetWeightKg: ex.targetWeightKg || 30,
          completedWeightKg: '',
          completedReps: '',
          isCompleted: false,
        })),
      })),
    };
  });

  // Insert rest day in the middle of the split
  if (mappedActiveDays.length >= 3) {
    return [
      mappedActiveDays[0],
      mappedActiveDays[1],
      restDay,
      ...mappedActiveDays.slice(2),
    ];
  }
  return [...mappedActiveDays, restDay];
}

// Check connection to Supabase
export async function testSupabaseConnection(
  url: string,
  key: string
): Promise<{ success: boolean; message: string; isLocalMode?: boolean }> {
  try {
    const cleanUrl = (url || '').trim();
    const cleanKey = (key || '').trim();

    if (!cleanUrl || !cleanKey || cleanUrl.includes('your-project-id') || !cleanUrl.startsWith('http')) {
      return {
        success: false,
        isLocalMode: false,
        message:
          'لم يتم ضبط بيانات الربط السحابي (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY). يعتمد النظام كلياً على قاعدة بيانات Supabase السحابية لحفظ جميع البيانات.',
      };
    }

    const testClient = createClient(cleanUrl, cleanKey);
    const { error } = await testClient
      .from('ai_generation_logs')
      .select('id', { count: 'exact', head: true });

    if (error && error.code !== 'PGRST116') {
      if (error.message.includes('relation') || error.message.includes('does not exist')) {
        return {
          success: true,
          isLocalMode: false,
          message: 'تم الاتصال بـ Supabase بنجاح! (يرجى تشغيل كود SQL لإنشاء الجداول في حال عدم إنشائها مسبقاً)',
        };
      }
      return { success: false, isLocalMode: false, message: formatSupabaseErrorMessage(error) };
    }
    return {
      success: true,
      isLocalMode: false,
      message: 'تم التحقق من الاتصال السحابي بـ Supabase وجدول ai_generation_logs بنجاح!',
    };
  } catch (err) {
    return {
      success: false,
      isLocalMode: false,
      message: formatSupabaseErrorMessage(err),
    };
  }
}

// Sync client notes
export async function syncNoteToSupabase(note: ClientNote): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const canonicalClientId = getCanonicalClientKey(note.clientId, note.clientEmail);
    const fullPayload: Record<string, unknown> = {
      id: note.id,
      client_id: canonicalClientId,
      client_name: note.clientName,
      client_email: note.clientEmail ? note.clientEmail.trim().toLowerCase() : null,
      subject: note.subject,
      category: note.category,
      message: note.message,
      timestamp: note.timestamp,
      reply: note.reply || null,
      reply_timestamp: note.replyTimestamp || null,
      is_resolved: note.isResolved,
    };

    let { error } = await client.from('notes').upsert(fullPayload, { onConflict: 'id' });
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message.includes('client_email'))) {
      const { client_email: _omit, ...corePayload } = fullPayload;
      const retry = await client.from('notes').upsert(corePayload, { onConflict: 'id' });
      error = retry.error;
    }
    return !error;
  } catch (err) {
    console.warn('Supabase sync note error:', err);
    return false;
  }
}

export async function fetchNotesFromSupabase(filter?: {
  clientId?: string;
  clientEmail?: string;
  clientName?: string;
}): Promise<ClientNote[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('notes')
      .select('*')
      .order('id', { ascending: false });

    if (error || !data) return [];

    const mapped: ClientNote[] = data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      clientId: row.client_id ? String(row.client_id) : 'client_athlete',
      clientName: String(row.client_name || 'مشترك'),
      clientEmail: row.client_email ? String(row.client_email).trim().toLowerCase() : undefined,
      subject: String(row.subject || ''),
      category: (row.category as ClientNote['category']) || 'general',
      message: String(row.message || ''),
      timestamp: String(row.timestamp || ''),
      reply: row.reply ? String(row.reply) : undefined,
      replyTimestamp: row.reply_timestamp ? String(row.reply_timestamp) : undefined,
      isResolved: Boolean(row.is_resolved),
    }));

    if (filter && (filter.clientId || filter.clientEmail || filter.clientName)) {
      const candidates = buildCandidateClientKeys(filter.clientId, filter.clientEmail);
      const cleanEmail = (filter.clientEmail || '').trim().toLowerCase();
      const cleanName = (filter.clientName || '').trim().toLowerCase();
      return mapped.filter((n) => {
        if (n.clientId && candidates.includes(n.clientId)) return true;
        if (cleanEmail && n.clientEmail && n.clientEmail.trim().toLowerCase() === cleanEmail) return true;
        if (cleanName && n.clientName && n.clientName.trim().toLowerCase() === cleanName) return true;
        return false;
      });
    }

    return mapped;
  } catch {
    return [];
  }
}

/**
 * Normalize any plan identifier strictly to 'VIP' or 'standard'
 */
export function normalizeSubscriptionPlan(raw?: string | null): SubscriptionPlanTier {
  if (!raw) return 'standard';
  const cleaned = raw.trim().toLowerCase();
  if (
    raw === 'VIP' ||
    cleaned === 'vip' ||
    cleaned === 'platinum' ||
    cleaned.includes('vip') ||
    cleaned.includes('بلاتين')
  ) {
    return 'VIP';
  }
  return 'standard';
}

export const DEFAULT_COACH_UUID = '00000000-0000-4000-8000-000000000001';

export function isCoachIdConstraintError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  const code = (error.code || '').trim();
  const msg = (error.message || '').toLowerCase();
  if (code === '23502' && (!msg || msg.includes('coach_id'))) return true;
  return msg.includes('coach_id') && (msg.includes('not-null') || msg.includes('null value') || msg.includes('foreign key'));
}

/**
 * Resolve a valid UUID for `coach_id` when `public.clients.coach_id` requires a non-null value.
 * Prefers an explicitly supplied UUID, signed-in Supabase Auth user, an existing `coach_id` in `clients`/`coaches`,
 * and falls back to DEFAULT_COACH_UUID.
 */
export async function resolveDefaultCoachId(
  client: SupabaseClient,
  explicitCoachId?: string | null
): Promise<string> {
  if (explicitCoachId && UUID_REGEX.test(explicitCoachId.trim())) {
    return explicitCoachId.trim();
  }

  try {
    const { data: authData } = await client.auth.getUser();
    if (authData?.user?.id && UUID_REGEX.test(authData.user.id)) {
      return authData.user.id;
    }
  } catch {
    // ignore when using anon coach passcode mode
  }

  try {
    const { data: existingWithCoach } = await client
      .from('clients')
      .select('coach_id')
      .not('coach_id', 'is', null)
      .limit(1)
      .maybeSingle();
    if (existingWithCoach && typeof existingWithCoach.coach_id === 'string' && UUID_REGEX.test(existingWithCoach.coach_id)) {
      return existingWithCoach.coach_id;
    }
  } catch {
    // ignore if coach_id column does not exist
  }

  try {
    const { data: coachRow } = await client
      .from('coaches')
      .select('id')
      .limit(1)
      .maybeSingle();
    if (coachRow && typeof coachRow.id === 'string' && UUID_REGEX.test(coachRow.id)) {
      return coachRow.id;
    }
  } catch {
    // ignore if coaches table does not exist
  }

  return DEFAULT_COACH_UUID;
}

function getDefaultValueForRequiredClientColumn(
  colName: string,
  payload: Record<string, unknown>,
  resolvedCoachId: string
): unknown {
  const c = colName.toLowerCase();
  if (c === 'coach_id') return resolvedCoachId;
  if (c === 'height_cm' || c === 'height') return 175;
  if (c === 'target_weight_kg' || c === 'target_weight') return 70;
  if (c === 'starting_weight_kg' || c === 'current_weight_kg' || c === 'weight_kg' || c === 'weight') return 75;
  if (c === 'age') return 25;
  if (c === 'muscle_mass' || c === 'muscle_mass_kg') return 32;
  if (c === 'body_fat' || c === 'body_fat_pct') return 20;
  if (c === 'daily_calories' || c === 'calories') return 2000;
  if (c === 'gender') return 'male';
  if (c === 'status') return 'active';
  if (c === 'subscription_plan' || c === 'package_type_en' || c === 'tier') return 'standard';
  if (c === 'package_type_ar') return 'الباقة القياسية (Standard)';
  if (c === 'name_ar' || c === 'name_en' || c === 'name' || c === 'full_name') {
    return payload.name_ar || payload.name_en || payload.email || 'مشترك';
  }
  if (c === 'client_code') return payload.client_code || 'OAO-1000';
  if (c === 'phone' || c === 'phone_whatsapp') return '0500000000';
  if (c === 'email') return payload.email || 'client@oao.fit';
  if (c === 'visual_goal' || c === 'goal' || c === 'goals') return 'Bulking';
  if (c === 'blood_type') return 'O+';
  if (c === 'subscription_start_date' || c === 'start_date') return new Date().toISOString().split('T')[0];
  if (c === 'subscription_end_date' || c === 'end_date') {
    return new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
  }
  if (c.endsWith('_id') || c.includes('uuid')) return generateUUID();
  if (c.endsWith('_at') || c.endsWith('_date')) return new Date().toISOString();
  if (c.startsWith('is_') || c.startsWith('has_') || c.startsWith('agreed_') || c.endsWith('_locked')) {
    return false;
  }
  if (
    c.endsWith('_cm') ||
    c.endsWith('_kg') ||
    c.endsWith('_pct') ||
    c.endsWith('_count') ||
    c.endsWith('_days') ||
    c.endsWith('_amount') ||
    c.endsWith('_price')
  ) {
    return 0;
  }
  return '';
}

function extractColumnFromPostgresError(message: string): string | null {
  const patterns = [
    /null value in column ["']?([a-zA-Z0-9_]+)["']?/i,
    /Could not find the ['"]([a-zA-Z0-9_]+)['"] column/i,
    /column ["']?([a-zA-Z0-9_]+)["']? of relation/i,
    /column ["']?([a-zA-Z0-9_]+)["']? does not exist/i,
  ];
  for (const re of patterns) {
    const match = message.match(re);
    if (match?.[1]) return match[1];
  }
  return null;
}

/**
 * Insert or update a row in `public.clients` safely:
 * - Includes valid `coach_id` only if explicitly provided, otherwise omits it cleanly.
 * - Automatically adapts to pre-existing DB schemas:
 *   1) If ANY column fails NOT NULL (`23502`, e.g. `height_cm`, `target_weight_kg`, `coach_id`), populates a valid default and retries.
 *   2) If ANY column is missing (`PGRST204` / `42703`), strips that missing column and retries without losing the other fields.
 *   3) If `coach_id` hits a FK error (`23503`) when nullable, strips `coach_id` and retries.
 */
export async function writeClientRowSafely(
  client: SupabaseClient,
  payload: Record<string, unknown>,
  existingRowId?: string | null,
  explicitCoachId?: string | null
): Promise<{ error: { code?: string; message: string } | null }> {
  const currentPayload: Record<string, unknown> = { ...payload };
  if (explicitCoachId && UUID_REGEX.test(explicitCoachId.trim())) {
    currentPayload.coach_id = explicitCoachId.trim();
  } else if (
    currentPayload.coach_id === undefined ||
    currentPayload.coach_id === null ||
    currentPayload.coach_id === ''
  ) {
    delete currentPayload.coach_id;
  }

  const executeWrite = async (row: Record<string, unknown>) => {
    if (existingRowId) {
      const { id: _omit, ...upd } = row;
      return client.from('clients').update(upd).eq('id', existingRowId);
    }
    return client.from('clients').insert(row);
  };

  let { error } = await executeWrite(currentPayload);
  let cachedCoachId: string | null = null;

  for (let attempt = 0; attempt < 8 && error; attempt++) {
    const msg = error.message || '';
    const lowerMsg = msg.toLowerCase();

    // 1. Handle NOT NULL constraint (23502) on any column (coach_id, height_cm, target_weight_kg, etc.)
    if (
      error.code === '23502' ||
      lowerMsg.includes('not-null') ||
      lowerMsg.includes('null value in column')
    ) {
      const col = extractColumnFromPostgresError(msg) || (lowerMsg.includes('coach_id') ? 'coach_id' : null);
      if (col) {
        if (col === 'coach_id' && !cachedCoachId) {
          cachedCoachId = await resolveDefaultCoachId(client, explicitCoachId);
        }
        const resolvedCoach = cachedCoachId || DEFAULT_COACH_UUID;
        const nextVal = getDefaultValueForRequiredClientColumn(col, currentPayload, resolvedCoach);
        if (currentPayload[col] !== nextVal) {
          currentPayload[col] = nextVal;
          const retryRes = await executeWrite(currentPayload);
          error = retryRes.error;
          continue;
        }
      }
    }

    // 2. Handle missing column in target table (PGRST204 / 42703) by stripping ONLY that column
    if (
      error.code === 'PGRST204' ||
      error.code === '42703' ||
      lowerMsg.includes('could not find') ||
      lowerMsg.includes('does not exist')
    ) {
      const missingCol = extractColumnFromPostgresError(msg);
      if (missingCol && Object.prototype.hasOwnProperty.call(currentPayload, missingCol)) {
        delete currentPayload[missingCol];
        const retryRes = await executeWrite(currentPayload);
        error = retryRes.error;
        continue;
      }
    }

    // 3. Handle incompatible foreign key on synthetic coach_id when nullable
    if (
      currentPayload.coach_id !== undefined &&
      lowerMsg.includes('coach_id') &&
      (error.code === '23503' || lowerMsg.includes('foreign key'))
    ) {
      delete currentPayload.coach_id;
      const retryRes = await executeWrite(currentPayload);
      error = retryRes.error;
      continue;
    }

    break;
  }

  return { error };
}

export interface SaveSubscriberPlanInput {
  id?: string;
  nameAr: string;
  nameEn?: string;
  email?: string;
  phone?: string;
  heightCm?: number;
  targetWeightKg?: number;
  subscriptionPlan: SubscriptionPlanTier;
  clientCode?: string;
  status?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  coachId?: string | null;
}

/**
 * Persist subscriber registration & `subscription_plan` ('standard' | 'VIP')
 * directly into Supabase `public.clients` (and `public.profiles` if present).
 */
export async function saveSubscriberToSupabase(
  input: SaveSubscriberPlanInput
): Promise<{ synced: boolean; subscriptionPlan: SubscriptionPlanTier; id?: string; error?: string }> {
  const normalizedPlan = normalizeSubscriptionPlan(input.subscriptionPlan);
  const packageTypeAr =
    normalizedPlan === 'VIP' ? 'الباقة البلاتينية (VIP)' : 'الباقة القياسية (Standard)';
  const packageTypeEn = normalizedPlan; // 'VIP' | 'standard'
  const cleanEmail = input.email ? input.email.trim().toLowerCase() : undefined;

  const client = getSupabaseClient();
  if (!client) {
    return { synced: false, subscriptionPlan: normalizedPlan, error: 'Supabase client unavailable' };
  }

  const clientCode =
    input.clientCode ||
    `OAO-${normalizedPlan === 'VIP' ? 'VIP' : 'STD'}-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    // Check if a subscriber row with this email already exists in `public.clients`
    let existingUuid: string | null =
      input.id && UUID_REGEX.test(input.id) ? input.id : null;

    if (!existingUuid && cleanEmail) {
      const { data: found } = await client
        .from('clients')
        .select('id')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (found && typeof found.id === 'string') {
        existingUuid = found.id;
      }
    }

    let existingRowId: string | null = existingUuid;
    if (existingRowId) {
      const { data: verifyExisting } = await client
        .from('clients')
        .select('id')
        .eq('id', existingRowId)
        .limit(1)
        .maybeSingle();
      if (!verifyExisting) {
        existingRowId = null;
      }
    }

    const rowId = existingRowId || existingUuid || generateUUID();

    // Primary payload including `subscription_plan` ('standard' | 'VIP') and subscription duration
    const fullClientPayload: Record<string, unknown> = {
      id: rowId,
      client_code: clientCode,
      name_ar: input.nameAr,
      name_en: input.nameEn || input.nameAr,
      email: cleanEmail || null,
      phone: input.phone || null,
      height_cm: input.heightCm ?? 175,
      target_weight_kg: input.targetWeightKg ?? 70,
      subscription_plan: normalizedPlan,
      subscription_start_date: input.subscriptionStartDate || null,
      subscription_end_date: input.subscriptionEndDate || null,
      package_type_ar: packageTypeAr,
      package_type_en: packageTypeEn,
      status: input.status || 'active',
    };

    let { error } = await writeClientRowSafely(client, fullClientPayload, existingRowId, input.coachId);

    // Adaptive fallback if extended columns haven't been added via SQL Editor yet
    if (
      error &&
      (error.code === 'PGRST204' ||
        error.code === '42703' ||
        error.message.includes('subscription_plan') ||
        error.message.includes('subscription_start_date') ||
        error.message.includes('subscription_end_date') ||
        error.message.includes('column'))
    ) {
      const fallbackPayload: Record<string, unknown> = {
        id: rowId,
        client_code: clientCode,
        name_ar: input.nameAr,
        name_en: input.nameEn || input.nameAr,
        email: cleanEmail || null,
        phone: input.phone || null,
        height_cm: input.heightCm ?? 175,
        target_weight_kg: input.targetWeightKg ?? 70,
        package_type_ar: packageTypeAr,
        package_type_en: packageTypeEn,
        status: input.status || 'active',
      };
      const retryRes = await writeClientRowSafely(client, fallbackPayload, existingRowId, input.coachId);
      error = retryRes.error;
    }

    if (error) {
      return {
        synced: false,
        subscriptionPlan: normalizedPlan,
        id: rowId,
        error: formatSupabaseErrorMessage(error),
      };
    }

    return { synced: true, subscriptionPlan: normalizedPlan, id: rowId };
  } catch (err) {
    return {
      synced: false,
      subscriptionPlan: normalizedPlan,
      error: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}

/**
 * Look up a subscriber's `subscription_plan` ('standard' | 'VIP') by email from Supabase `public.clients`
 * with automatic fallback to locally stored declarations/registrations.
 */
export async function fetchSubscriberPlanFromSupabase(
  email?: string
): Promise<{
  plan: SubscriptionPlanTier;
  nameAr?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
} | null> {
  const cleanEmail = email?.trim().toLowerCase();
  if (!cleanEmail) return null;

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('clients')
        .select('*')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const row = data as Record<string, unknown>;
        const rawPlan =
          row.subscription_plan ||
          row.package_type_en ||
          row.package_type_ar;
        const resolvedPlan = normalizeSubscriptionPlan(
          typeof rawPlan === 'string' ? rawPlan : null
        );
        const nameAr =
          typeof row.name_ar === 'string'
            ? (row.name_ar as string)
            : undefined;
        const status = typeof row.status === 'string' ? row.status : undefined;
        const startDate =
          typeof row.subscription_start_date === 'string'
            ? row.subscription_start_date
            : undefined;
        const endDate =
          typeof row.subscription_end_date === 'string'
            ? row.subscription_end_date
            : undefined;

        return { plan: resolvedPlan, nameAr, status, startDate, endDate };
      }
    } catch {
      return null;
    }
  }

  return null;
}

// Sync profile stats & subscription_plan ('standard' | 'VIP') exclusively to Supabase
export async function syncProfileToSupabase(profile: ClientProfile): Promise<boolean> {
  const normalizedPlan = normalizeSubscriptionPlan(profile.subscription_plan);
  const canonicalKey = getCanonicalClientKey(profile.id, profile.email);

  // 1. Sync to live `public.clients` table
  const clientRes = await saveSubscriberToSupabase({
    id: profile.id,
    nameAr: profile.name,
    nameEn: profile.nameEn || profile.name,
    email: profile.email,
    phone: profile.phone,
    heightCm: profile.height,
    targetWeightKg: profile.targetWeight,
    subscriptionPlan: normalizedPlan,
    clientCode: profile.clientCode,
    status: profile.subscriptionStatus,
    subscriptionStartDate: profile.subscriptionStartDate,
    subscriptionEndDate: profile.subscriptionEndDate,
  });

  const resolvedId = clientRes.id || canonicalKey;
  const client = getSupabaseClient();
  if (!client) return clientRes.synced;

  let profilesSynced = false;
  let extSynced = false;

  try {
    const { error } = await client.from('profiles').upsert({
      id: resolvedId,
      name: profile.name,
      subscription_plan: normalizedPlan,
      weight: profile.weight,
      height: profile.height,
      muscle_mass: profile.muscleMass,
      body_fat: profile.bodyFat,
      target_weight: profile.targetWeight,
      daily_calories: profile.dailyCalories,
      daily_water_current: profile.dailyWaterCurrent,
      updated_at: new Date().toISOString(),
    });
    profilesSynced = !error;
  } catch {
    profilesSynced = false;
  }

  // 3. Persist full extended profile JSONB in `public.workouts` (`day_key = 'profile_ext'`) for 100% cross-device fidelity
  try {
    const { error } = await client.from('workouts').upsert(
      {
        id: `profile_ext_${resolvedId}`,
        client_id: resolvedId,
        day_key: 'profile_ext',
        workout_data: {
          ...profile,
          id: resolvedId,
          subscription_plan: normalizedPlan,
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    extSynced = !error;
  } catch {
    extSynced = false;
  }

  return clientRes.synced || profilesSynced || extSynced;
}

export async function syncClientProfileToSupabase(
  clientKey: string,
  profile: ClientProfile
): Promise<boolean> {
  const canonicalKey = getCanonicalClientKey(clientKey || profile.id, profile.email);
  return syncProfileToSupabase({
    ...profile,
    id: canonicalKey,
  });
}

export async function fetchClientProfileFromSupabase(
  clientId?: string | null,
  email?: string | null,
  fallback?: Partial<ClientProfile>
): Promise<ClientProfile> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const candidates = buildCandidateClientKeys(clientId, cleanEmail);
  const canonicalKey = getCanonicalClientKey(clientId, cleanEmail);

  const baseProfile: ClientProfile = {
    ...INITIAL_CLIENT_PROFILE,
    ...fallback,
    id: canonicalKey || INITIAL_CLIENT_PROFILE.id,
    email: cleanEmail || fallback?.email || INITIAL_CLIENT_PROFILE.email,
    subscription_plan: normalizeSubscriptionPlan(
      fallback?.subscription_plan || INITIAL_CLIENT_PROFILE.subscription_plan
    ),
  };

  const client = getSupabaseClient();
  if (!client || candidates.length === 0) {
    return baseProfile;
  }

  try {
    // Query subscribers, clients, profiles, and extended profile JSONB in parallel
    const [subscribersRes, clientsRes, profilesRes, extRes, authRes] = await Promise.all([
      cleanEmail
        ? client
            .from('subscribers')
            .select('*')
            .ilike('email', cleanEmail)
            .limit(1)
            .maybeSingle()
        : client
            .from('subscribers')
            .select('*')
            .in('id', candidates)
            .limit(1)
            .maybeSingle(),
      cleanEmail
        ? client
            .from('clients')
            .select('*')
            .ilike('email', cleanEmail)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle()
        : client
            .from('clients')
            .select('*')
            .in('id', candidates)
            .limit(1)
            .maybeSingle(),
      client
        .from('profiles')
        .select('*')
        .in('id', candidates)
        .limit(1)
        .maybeSingle(),
      client
        .from('workouts')
        .select('*')
        .eq('day_key', 'profile_ext')
        .in('client_id', candidates)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      cleanEmail
        ? client
            .from('workouts')
            .select('*')
            .eq('id', `auth_${cleanEmail}`)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const merged: ClientProfile = { ...baseProfile };

    if (!subscribersRes.error && subscribersRes.data) {
      const sRow = subscribersRes.data as Record<string, unknown>;
      if (sRow.id) merged.id = String(sRow.id);
      if (sRow.name) {
        merged.name = String(sRow.name);
        merged.nameEn = String(sRow.name);
      }
      if (sRow.email) merged.email = String(sRow.email).trim().toLowerCase();
      if (sRow.phone) merged.phone = String(sRow.phone);
      if (sRow.client_code) merged.clientCode = String(sRow.client_code);
      if (sRow.tier) merged.subscription_plan = normalizeSubscriptionPlan(String(sRow.tier));
      if (sRow.goals) merged.visualGoal = String(sRow.goals);
      if (sRow.status) merged.subscriptionStatus = sRow.status as ClientProfile['subscriptionStatus'];
      if (sRow.age !== null && sRow.age !== undefined) merged.age = Number(sRow.age);
      if (sRow.blood_type) merged.bloodType = String(sRow.blood_type);
      if (sRow.nutrition_plan_locked !== undefined) {
        merged.nutritionPlanLocked = Boolean(sRow.nutrition_plan_locked);
      }
      if (sRow.inbody_filename) merged.inBodyFileName = String(sRow.inbody_filename);
      if (sRow.inbody_file_url) merged.inBodyFileUrl = String(sRow.inbody_file_url);
      if (sRow.passcode) merged.assignedPassword = String(sRow.passcode);
    }

    if (!clientsRes.error && clientsRes.data) {
      const row = clientsRes.data as Record<string, unknown>;
      if (row.id && !subscribersRes.data) merged.id = String(row.id);
      if (row.name_ar && !subscribersRes.data) merged.name = String(row.name_ar);
      if (row.name_en && !subscribersRes.data) merged.nameEn = String(row.name_en);
      if (row.email) merged.email = String(row.email).trim().toLowerCase();
      if (row.phone && !merged.phone) merged.phone = String(row.phone);
      if (row.client_code && !merged.clientCode) merged.clientCode = String(row.client_code);
      if (row.height_cm) merged.height = Number(row.height_cm);
      if (row.target_weight_kg) merged.targetWeight = Number(row.target_weight_kg);
      if (!subscribersRes.data && (row.subscription_plan || row.package_type_en)) {
        merged.subscription_plan = normalizeSubscriptionPlan(
          String(row.subscription_plan || row.package_type_en)
        );
      }
      if (row.status && !subscribersRes.data) {
        merged.subscriptionStatus = row.status as ClientProfile['subscriptionStatus'];
      }
      if (row.subscription_start_date) {
        merged.subscriptionStartDate = String(row.subscription_start_date);
      }
      if (row.subscription_end_date) {
        merged.subscriptionEndDate = String(row.subscription_end_date);
      }
      if (row.age !== null && row.age !== undefined && !merged.age) merged.age = Number(row.age);
      if (row.blood_type && !merged.bloodType) merged.bloodType = String(row.blood_type);
      if (row.visual_goal && !merged.visualGoal) merged.visualGoal = String(row.visual_goal);
      if (row.nutrition_plan_locked !== undefined && !subscribersRes.data) {
        merged.nutritionPlanLocked = Boolean(row.nutrition_plan_locked);
      }
      if (row.inbody_filename && !merged.inBodyFileName) merged.inBodyFileName = String(row.inbody_filename);
      if (row.inbody_file_url && !merged.inBodyFileUrl) merged.inBodyFileUrl = String(row.inbody_file_url);
      if (row.assigned_password && !merged.assignedPassword) merged.assignedPassword = String(row.assigned_password);
    }

    if (!authRes.error && authRes.data && (authRes.data as Record<string, unknown>).workout_data) {
      const authData = (authRes.data as Record<string, unknown>).workout_data as Record<string, unknown>;
      if (authData.clientName && !clientsRes.data && !subscribersRes.data) merged.name = String(authData.clientName);
      if (authData.plan && !subscribersRes.data) merged.subscription_plan = normalizeSubscriptionPlan(String(authData.plan));
      if (authData.nutritionPlanLocked !== undefined && !subscribersRes.data) {
        merged.nutritionPlanLocked = Boolean(authData.nutritionPlanLocked);
      }
      if (authData.visualGoal && !merged.visualGoal) merged.visualGoal = String(authData.visualGoal);
      if (authData.age && !merged.age) merged.age = Number(authData.age);
      if (authData.bloodType && !merged.bloodType) merged.bloodType = String(authData.bloodType);
      if (authData.password && !merged.assignedPassword) merged.assignedPassword = String(authData.password);
    }

    if (!profilesRes.error && profilesRes.data) {
      const p = profilesRes.data as Record<string, unknown>;
      if (p.weight !== null && p.weight !== undefined) merged.weight = Number(p.weight);
      if (p.height !== null && p.height !== undefined) merged.height = Number(p.height);
      if (p.muscle_mass !== null && p.muscle_mass !== undefined) merged.muscleMass = Number(p.muscle_mass);
      if (p.body_fat !== null && p.body_fat !== undefined) merged.bodyFat = Number(p.body_fat);
      if (p.target_weight !== null && p.target_weight !== undefined) merged.targetWeight = Number(p.target_weight);
      if (p.daily_calories !== null && p.daily_calories !== undefined) merged.dailyCalories = Number(p.daily_calories);
      if (p.daily_water_current !== null && p.daily_water_current !== undefined) merged.dailyWaterCurrent = Number(p.daily_water_current);
    }

    if (!extRes.error && extRes.data && (extRes.data as Record<string, unknown>).workout_data) {
      const ext = (extRes.data as Record<string, unknown>).workout_data as Partial<ClientProfile>;
      if (ext.weight !== undefined) merged.weight = ext.weight;
      if (ext.height !== undefined) merged.height = ext.height;
      if (ext.muscleMass !== undefined) merged.muscleMass = ext.muscleMass;
      if (ext.bodyFat !== undefined) merged.bodyFat = ext.bodyFat;
      if (ext.targetWeight !== undefined) merged.targetWeight = ext.targetWeight;
      if (ext.dailyWaterGoal !== undefined) merged.dailyWaterGoal = ext.dailyWaterGoal;
      if (ext.dailyWaterCurrent !== undefined) merged.dailyWaterCurrent = ext.dailyWaterCurrent;
      if (ext.dailyCalories !== undefined) merged.dailyCalories = ext.dailyCalories;
      if (ext.macros) merged.macros = ext.macros;
      if (ext.analysisData) merged.analysisData = ext.analysisData;
      if (ext.streakData) merged.streakData = ext.streakData;
      if (ext.athleteRank) merged.athleteRank = ext.athleteRank;
      if (ext.visualGoal) merged.visualGoal = ext.visualGoal;
      if (ext.age !== undefined) merged.age = ext.age;
      if (ext.bloodType) merged.bloodType = ext.bloodType;
      if (ext.subscriptionStartDate) merged.subscriptionStartDate = ext.subscriptionStartDate;
      if (ext.subscriptionEndDate) merged.subscriptionEndDate = ext.subscriptionEndDate;
    }

    return merged;
  } catch {
    return baseProfile;
  }
}

/**
 * Persist completed subscription agreement exclusively into Supabase `public.declarations`
 */
export async function saveDeclarationToSupabase(
  agreement: SubscriptionAgreement
): Promise<{ synced: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return { synced: false, error: 'Supabase client unavailable' };
  }

  try {
    const payload = {
      id: agreement.id,
      plan_id: agreement.planId,
      subscription_plan: agreement.subscription_plan || (agreement.planId === 'platinum' ? 'VIP' : 'standard'),
      plan_name_ar: agreement.planNameAr,
      plan_price: agreement.planPrice,
      billing_cycle: agreement.billingCycle,
      duration_label_ar: agreement.durationLabelAr || '',
      duration_days: agreement.durationDays || 90,
      payment_installments: agreement.paymentInstallments || 'full',
      installment_amount: agreement.installmentAmount || agreement.planPrice,
      visual_goal: agreement.visualGoal || '',
      full_name: agreement.fullName,
      phone_whatsapp: agreement.phoneWhatsapp,
      email: agreement.email.trim().toLowerCase(),
      age: agreement.age || null,
      blood_type: agreement.bloodType || null,
      inbody_file_url: agreement.inBodyFileUrl || null,
      inbody_filename: agreement.inBodyFileName || null,
      inbody_filesize: agreement.inBodyFileSize || null,
      has_health_issues: agreement.hasHealthIssues,
      health_issues_details: agreement.healthIssuesDetails || null,
      agreed_health_and_remote_training: agreement.agreedHealthAndRemoteTraining,
      agreed_diet_and_supplements: agreement.agreedDietAndSupplements,
      agreed_intellectual_property: agreement.agreedIntellectualProperty,
      agreed_payment_and_refund_policy: agreement.agreedPaymentAndRefundPolicy,
      digital_signature: agreement.digitalSignature,
      signed_timestamp: agreement.signedTimestamp,
      status: agreement.status || 'completed_and_active',
      completed_timestamp: agreement.completedTimestamp || new Date().toISOString(),
    };

    const { error } = await client
      .from('declarations')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      return { synced: false, error: error.message };
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oao_declarations_updated'));
    }
    return { synced: true };
  } catch (err) {
    return { synced: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

/**
 * Fetch agreements exclusively from Supabase `public.declarations`.
 */
export async function fetchDeclarationsFromSupabase(): Promise<SubscriptionAgreement[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('declarations')
      .select('*')
      .order('completed_timestamp', { ascending: false });

    if (error || !data) return [];

    return data.map((row: Record<string, unknown>) => ({
      id: String(row.id),
      planId: (row.plan_id === 'platinum' ? 'platinum' : 'standard') as 'standard' | 'platinum',
      subscription_plan: normalizeSubscriptionPlan(row.subscription_plan as string),
      planNameAr: String(row.plan_name_ar || ''),
      planPrice: Number(row.plan_price || 0),
      billingCycle: String(row.billing_cycle || '3_months') as SubscriptionAgreement['billingCycle'],
      durationLabelAr: row.duration_label_ar ? String(row.duration_label_ar) : undefined,
      durationDays: row.duration_days ? Number(row.duration_days) : undefined,
      paymentInstallments: (row.payment_installments as SubscriptionAgreement['paymentInstallments']) || 'full',
      installmentAmount: row.installment_amount ? Number(row.installment_amount) : undefined,
      visualGoal: row.visual_goal ? String(row.visual_goal) : undefined,
      fullName: String(row.full_name || ''),
      phoneWhatsapp: String(row.phone_whatsapp || ''),
      email: String(row.email || ''),
      age: row.age ? Number(row.age) : undefined,
      bloodType: row.blood_type ? String(row.blood_type) : undefined,
      inBodyFileUrl: row.inbody_file_url ? String(row.inbody_file_url) : undefined,
      inBodyFileName: row.inbody_filename ? String(row.inbody_filename) : undefined,
      inBodyFileSize: row.inbody_filesize ? String(row.inbody_filesize) : undefined,
      hasHealthIssues: Boolean(row.has_health_issues),
      healthIssuesDetails: row.health_issues_details ? String(row.health_issues_details) : undefined,
      agreedHealthAndRemoteTraining: Boolean(row.agreed_health_and_remote_training),
      agreedDietAndSupplements: Boolean(row.agreed_diet_and_supplements),
      agreedIntellectualProperty: Boolean(row.agreed_intellectual_property),
      agreedPaymentAndRefundPolicy: Boolean(row.agreed_payment_and_refund_policy),
      digitalSignature: String(row.digital_signature || ''),
      signedTimestamp: String(row.signed_timestamp || ''),
      status: 'completed_and_active',
      completedTimestamp: row.completed_timestamp ? String(row.completed_timestamp) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Delete declaration exclusively from Supabase
 */
export async function deleteDeclarationFromSupabase(id: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('declarations').delete().eq('id', id);
    if (!error && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('oao_declarations_updated'));
    }
    return !error;
  } catch {
    return false;
  }
}

/**
 * Delete inquiry/note from Supabase & local storage
 */
export async function deleteNoteFromSupabase(noteId: string): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return true;
  try {
    await client.from('notes').delete().eq('id', noteId);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sync workout days exclusively to Supabase `workouts` table scoped to target client key
 */
export async function syncWorkoutDaysToSupabase(
  clientId: string,
  days: WorkoutDay[],
  email?: string
): Promise<boolean> {
  const canonicalKey = getCanonicalClientKey(clientId, email);
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const payload = {
      id: `workouts_${canonicalKey}`,
      client_id: canonicalKey,
      day_key: 'all_days',
      workout_data: days,
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('workouts').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function fetchWorkoutDaysFromSupabase(
  clientId?: string | null,
  email?: string | null
): Promise<WorkoutDay[]> {
  const candidates = buildCandidateClientKeys(clientId, email);

  const client = getSupabaseClient();
  if (client && candidates.length > 0) {
    try {
      const { data, error } = await client
        .from('workouts')
        .select('workout_data, updated_at')
        .eq('day_key', 'all_days')
        .in('client_id', candidates)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && Array.isArray((data as Record<string, unknown>).workout_data)) {
        const cloudDays = (data as Record<string, unknown>).workout_data as WorkoutDay[];
        if (cloudDays.length > 0) {
          return cloudDays;
        }
      }
    } catch {
      // fallback to initial template
    }
  }

  return JSON.parse(JSON.stringify(INITIAL_WORKOUT_DAYS));
}

export async function fetchAverageWorkoutCompletionFromSupabase(): Promise<number> {
  const client = getSupabaseClient();
  if (!client) return 0;
  try {
    const { data, error } = await client
      .from('workouts')
      .select('workout_data')
      .eq('day_key', 'all_days');

    if (error || !Array.isArray(data)) return 0;

    let totalSets = 0;
    let completedSets = 0;
    for (const row of data as Array<Record<string, unknown>>) {
      if (!Array.isArray(row.workout_data)) continue;
      for (const d of row.workout_data as WorkoutDay[]) {
        for (const ex of d.exercises || []) {
          for (const s of ex.sets || []) {
            totalSets += 1;
            if (s.isCompleted) completedSets += 1;
          }
        }
      }
    }
    return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  } catch {
    return 0;
  }
}

/**
 * Sync & fetch tier-level Nutrition Plans (`day_key = 'tier_nutrition_standard' | 'tier_nutrition_VIP'`)
 */
export async function syncTierNutritionPlanToSupabase(
  tier: SubscriptionPlanTier,
  categories: MealCategory[]
): Promise<boolean> {
  saveDietCategories(tier, categories);
  const client = getSupabaseClient();
  if (!client) return false;
  const rowId = `tier_nutrition_${tier}`;
  try {
    const { error } = await client.from('workouts').upsert(
      {
        id: rowId,
        client_id: 'admin_config',
        day_key: rowId,
        workout_data: { tier, categories, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchTierNutritionPlanFromSupabase(
  tier: SubscriptionPlanTier
): Promise<MealCategory[]> {
  const client = getSupabaseClient();
  const rowId = `tier_nutrition_${tier}`;
  if (client) {
    try {
      const { data, error } = await client
        .from('workouts')
        .select('workout_data')
        .eq('id', rowId)
        .maybeSingle();

      if (!error && data) {
        const rawData = (data as Record<string, unknown>).workout_data as
          | { categories?: MealCategory[] }
          | MealCategory[]
          | undefined;
        const cats = Array.isArray(rawData) ? rawData : rawData?.categories;
        if (Array.isArray(cats) && cats.length > 0) {
          saveDietCategories(tier, cats);
          return cats;
        }
      }
    } catch {
      // fallback to static defaults
    }
  }
  return JSON.parse(
    JSON.stringify(tier === 'VIP' ? VIP_PLATINUM_DIET_CATEGORIES : STANDARD_DIET_CATEGORIES)
  );
}

export async function resetTierNutritionPlanInSupabase(
  tier: SubscriptionPlanTier
): Promise<MealCategory[]> {
  const defaults = JSON.parse(
    JSON.stringify(tier === 'VIP' ? VIP_PLATINUM_DIET_CATEGORIES : STANDARD_DIET_CATEGORIES)
  ) as MealCategory[];
  saveDietCategories(tier, defaults);
  const client = getSupabaseClient();
  const rowId = `tier_nutrition_${tier}`;
  if (client) {
    try {
      await client.from('workouts').delete().eq('id', rowId);
    } catch {
      // ignore
    }
  }
  return defaults;
}

/**
 * Sync & fetch per-client nutrition plan (`day_key = 'nutrition_plan'`) in Supabase `public.workouts`
 */
export async function syncNutritionPlanToSupabase(
  clientKey: string,
  categories: MealCategory[],
  tier: SubscriptionPlanTier = 'standard',
  email?: string
): Promise<boolean> {
  const canonicalKey = getCanonicalClientKey(clientKey, email);
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const payload = {
      id: `nutrition_${canonicalKey}`,
      client_id: canonicalKey,
      day_key: 'nutrition_plan',
      workout_data: {
        tier,
        categories,
        updatedAt: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };
    const { error } = await client.from('workouts').upsert(payload, { onConflict: 'id' });
    return !error;
  } catch {
    return false;
  }
}

export async function resetNutritionPlanInSupabase(
  clientKey: string,
  tier: SubscriptionPlanTier = 'standard',
  email?: string
): Promise<MealCategory[]> {
  const canonicalKey = getCanonicalClientKey(clientKey, email);
  const client = getSupabaseClient();
  if (client && canonicalKey) {
    try {
      await client.from('workouts').delete().eq('id', `nutrition_${canonicalKey}`);
    } catch {
      // ignore
    }
  }
  return fetchTierNutritionPlanFromSupabase(tier);
}

export async function fetchNutritionPlanFromSupabase(
  clientId?: string | null,
  email?: string | null,
  tier: SubscriptionPlanTier = 'standard'
): Promise<MealCategory[]> {
  const candidates = buildCandidateClientKeys(clientId, email);

  const client = getSupabaseClient();
  if (client && candidates.length > 0) {
    try {
      const { data, error } = await client
        .from('workouts')
        .select('workout_data, updated_at')
        .eq('day_key', 'nutrition_plan')
        .in('client_id', candidates)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        const rawData = (data as Record<string, unknown>).workout_data as
          | { categories?: MealCategory[] }
          | MealCategory[]
          | undefined;
        const cloudCategories = Array.isArray(rawData)
          ? rawData
          : rawData?.categories;
        if (Array.isArray(cloudCategories) && cloudCategories.length > 0) {
          return cloudCategories;
        }
      }
    } catch {
      // fallback to tier plan in Supabase
    }
  }

  return fetchTierNutritionPlanFromSupabase(tier);
}

/**
 * Sync & fetch global nutrition lock setting in Supabase
 */
export async function syncGlobalNutritionLockToSupabase(locked: boolean): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('workouts').upsert(
      {
        id: 'global_nutrition_lock',
        client_id: 'global_settings',
        day_key: 'nutrition_lock',
        workout_data: { locked, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchGlobalNutritionLockFromSupabase(): Promise<boolean> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client
        .from('workouts')
        .select('workout_data')
        .eq('id', 'global_nutrition_lock')
        .maybeSingle();
      if (!error && data && (data as Record<string, unknown>).workout_data) {
        return Boolean(((data as Record<string, unknown>).workout_data as { locked?: boolean }).locked);
      }
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Sync & fetch Admin Selected Target Client Key in Supabase (`admin_selected_target`)
 */
export async function syncAdminTargetClientToSupabase(clientKey: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client || !clientKey) return;
  try {
    await client.from('workouts').upsert(
      {
        id: 'admin_selected_target',
        client_id: 'admin_config',
        day_key: 'admin_config',
        workout_data: { clientKey, updatedAt: new Date().toISOString() },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch {
    // ignore
  }
}

export async function fetchAdminTargetClientFromSupabase(): Promise<string> {
  const client = getSupabaseClient();
  if (!client) return '';
  try {
    const { data, error } = await client
      .from('workouts')
      .select('workout_data')
      .eq('id', 'admin_selected_target')
      .maybeSingle();
    if (!error && data && (data as Record<string, unknown>).workout_data) {
      const k = ((data as Record<string, unknown>).workout_data as { clientKey?: string }).clientKey;
      return typeof k === 'string' ? k : '';
    }
  } catch {
    // ignore
  }
  return '';
}

/**
 * Sync & fetch per-client Dynamic Assessment, Streak, Athlete Rank & Badges (`day_key = 'assessment_bundle'`)
 */
export interface ClientAssessmentBundle {
  analysisData?: ComprehensiveAnalysisData;
  streakData: StreakData;
  athleteRank: AthleteRank;
  badges?: Badge[];
}

export async function syncAssessmentToSupabase(
  clientKey: string,
  bundle: ClientAssessmentBundle,
  email?: string
): Promise<boolean> {
  const canonicalKey = getCanonicalClientKey(clientKey, email);
  const client = getSupabaseClient();
  if (!client) return false;
  try {
    const { error } = await client.from('workouts').upsert(
      {
        id: `assessment_${canonicalKey}`,
        client_id: canonicalKey,
        day_key: 'assessment_bundle',
        workout_data: bundle,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    return !error;
  } catch {
    return false;
  }
}

export async function fetchAssessmentFromSupabase(
  clientId?: string | null,
  email?: string | null
): Promise<ClientAssessmentBundle> {
  const candidates = buildCandidateClientKeys(clientId, email);

  const client = getSupabaseClient();
  if (client && candidates.length > 0) {
    try {
      const { data, error } = await client
        .from('workouts')
        .select('workout_data, updated_at')
        .eq('day_key', 'assessment_bundle')
        .in('client_id', candidates)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data && (data as Record<string, unknown>).workout_data) {
        const w = (data as Record<string, unknown>).workout_data as Partial<ClientAssessmentBundle>;
        return {
          analysisData: w.analysisData,
          streakData: w.streakData || INITIAL_STREAK_DATA,
          athleteRank: w.athleteRank || INITIAL_ATHLETE_RANK,
          badges: Array.isArray(w.badges) && w.badges.length > 0 ? w.badges : INITIAL_BADGES,
        };
      }
    } catch {
      // fallback below
    }
  }

  return {
    analysisData: undefined,
    streakData: JSON.parse(JSON.stringify(INITIAL_STREAK_DATA)),
    athleteRank: JSON.parse(JSON.stringify(INITIAL_ATHLETE_RANK)),
    badges: JSON.parse(JSON.stringify(INITIAL_BADGES)),
  };
}

/**
 * Hydrate a subscriber's full workspace (profile, workouts, nutrition, lock state, assessment, notes) from Supabase
 */
export async function loadClientWorkspaceFromSupabase(params: {
  clientId?: string | null;
  email?: string | null;
  fallbackName?: string;
  fallbackPlan?: SubscriptionPlanTier;
}): Promise<{
  profile: ClientProfile;
  workoutDays: WorkoutDay[];
  nutritionCategories: MealCategory[];
  isNutritionLocked: boolean;
  analysisData?: ComprehensiveAnalysisData;
  streakData: StreakData;
  athleteRank: AthleteRank;
  badges: Badge[];
  notes: ClientNote[];
}> {
  const profile = await fetchClientProfileFromSupabase(params.clientId, params.email, {
    name: params.fallbackName,
    nameEn: params.fallbackName,
    subscription_plan: params.fallbackPlan,
  });

  const resolvedId = profile.id || params.clientId || undefined;
  const resolvedEmail = profile.email || params.email || undefined;
  const resolvedTier = normalizeSubscriptionPlan(profile.subscription_plan || params.fallbackPlan);

  const [workoutDays, nutritionCategories, globalLocked, assessment, notes] = await Promise.all([
    fetchWorkoutDaysFromSupabase(resolvedId, resolvedEmail),
    fetchNutritionPlanFromSupabase(resolvedId, resolvedEmail, resolvedTier),
    fetchGlobalNutritionLockFromSupabase(),
    fetchAssessmentFromSupabase(resolvedId, resolvedEmail),
    fetchNotesFromSupabase({
      clientId: resolvedId,
      clientEmail: resolvedEmail,
      clientName: profile.name,
    }),
  ]);

  const analysisData = assessment.analysisData || profile.analysisData;
  const streakData = assessment.streakData || profile.streakData || INITIAL_STREAK_DATA;
  const athleteRank = assessment.athleteRank || profile.athleteRank || INITIAL_ATHLETE_RANK;
  const badges = Array.isArray(assessment.badges) && assessment.badges.length > 0 ? assessment.badges : INITIAL_BADGES;

  const hydratedProfile: ClientProfile = {
    ...profile,
    subscription_plan: resolvedTier,
    nutritionPlanLocked: Boolean(profile.nutritionPlanLocked || globalLocked),
    analysisData,
    streakData,
    athleteRank,
  };

  return {
    profile: hydratedProfile,
    workoutDays,
    nutritionCategories,
    isNutritionLocked: Boolean(hydratedProfile.nutritionPlanLocked),
    analysisData,
    streakData,
    athleteRank,
    badges,
    notes,
  };
}

export const SUPABASE_RLS_FIX_SQL = `-- OAO RLS FIX SCRIPT (إصلاح سياسات الأمان RLS لجميع الجداول الإدارية)
-- شغّل هذا الكود في Supabase SQL Editor لإزالة قيود الإدخال والتعديل من لوحة التحكم:
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

DO $$
DECLARE
  pol RECORD;
  tbl TEXT;
  admin_tables TEXT[] := ARRAY[
    'subscribers',
    'clients',
    'declarations',
    'ai_generation_logs',
    'profiles',
    'workouts',
    'notes'
  ];
BEGIN
  FOREACH tbl IN ARRAY admin_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      FOR pol IN
        SELECT policyname FROM pg_policies
        WHERE schemaname = 'public' AND tablename = tbl
      LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
      END LOOP;

      EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('GRANT ALL ON TABLE public.%I TO anon, authenticated, service_role', tbl);
    END IF;
  END LOOP;

  -- Ensure optional columns on public.clients allow NULL & have safe defaults for direct admin provisioning
  FOREACH tbl IN ARRAY ARRAY['coach_id', 'height_cm', 'target_weight_kg', 'age', 'gender', 'phone', 'client_code', 'name_en'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE public.clients ALTER COLUMN %I DROP NOT NULL', tbl);
    END IF;
  END LOOP;
END $$;
`;

// Ready-to-copy SQL Schema for Coach/Admin including `subscribers`, `clients`, `declarations`, `workouts`, `notes` & RLS fix
export const SUPABASE_SQL_SCHEMA = `-- OAO - OWN AURA OUTCOME TRAINING PORTAL DATABASE SCHEMA
-- شغّل هذا الكود في Supabase SQL Editor لضبط الجداول وتفعيل الصلاحيات الكاملة وإصلاح RLS:

-- 0. جدول المشتركين المركزي وبيانات الدخول (subscribers)
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  passcode TEXT NOT NULL,
  client_code TEXT,
  tier TEXT NOT NULL DEFAULT 'standard' CHECK (tier IN ('standard', 'VIP')),
  goals TEXT,
  phone TEXT,
  age INTEGER,
  blood_type TEXT,
  status TEXT DEFAULT 'active',
  nutrition_plan_locked BOOLEAN DEFAULT false,
  inbody_filename TEXT,
  inbody_file_url TEXT
);

ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS passcode TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS client_code TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS tier TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS goals TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS nutrition_plan_locked BOOLEAN DEFAULT false;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS inbody_filename TEXT;
ALTER TABLE public.subscribers ADD COLUMN IF NOT EXISTS inbody_file_url TEXT;

-- 1. جدول المشتركين التفصيلي (clients)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  client_code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  assigned_password TEXT,
  age INTEGER,
  blood_type TEXT,
  visual_goal TEXT,
  nutrition_plan_locked BOOLEAN DEFAULT false,
  inbody_filename TEXT,
  inbody_file_url TEXT,
  gender TEXT,
  height_cm NUMERIC DEFAULT 175,
  target_weight_kg NUMERIC DEFAULT 70,
  subscription_plan TEXT NOT NULL DEFAULT 'standard' CHECK (subscription_plan IN ('standard', 'VIP')),
  subscription_start_date DATE,
  subscription_end_date DATE,
  package_type_ar TEXT DEFAULT 'الباقة القياسية (Standard)',
  package_type_en TEXT DEFAULT 'standard',
  status TEXT DEFAULT 'active',
  coach_id UUID
);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS assigned_password TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS blood_type TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS visual_goal TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS nutrition_plan_locked BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS inbody_filename TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS inbody_file_url TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS subscription_end_date DATE;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS coach_id UUID;
ALTER TABLE public.clients ALTER COLUMN coach_id DROP NOT NULL;
ALTER TABLE public.clients ALTER COLUMN height_cm SET DEFAULT 175;
ALTER TABLE public.clients ALTER COLUMN height_cm DROP NOT NULL;
ALTER TABLE public.clients ALTER COLUMN target_weight_kg SET DEFAULT 70;
ALTER TABLE public.clients ALTER COLUMN target_weight_kg DROP NOT NULL;

ALTER TABLE public.clients DROP CONSTRAINT IF EXISTS clients_subscription_plan_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_subscription_plan_check
  CHECK (subscription_plan IN ('standard', 'VIP'));

-- 2. جدول الإقرارات والعقود الرقمية (declarations)
CREATE TABLE IF NOT EXISTS public.declarations (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  plan_id TEXT,
  subscription_plan TEXT DEFAULT 'standard',
  plan_name_ar TEXT,
  plan_price NUMERIC DEFAULT 0,
  billing_cycle TEXT,
  duration_label_ar TEXT,
  duration_days INTEGER DEFAULT 90,
  payment_installments TEXT DEFAULT 'full',
  installment_amount NUMERIC DEFAULT 0,
  visual_goal TEXT,
  full_name TEXT NOT NULL,
  phone_whatsapp TEXT,
  email TEXT,
  age INTEGER,
  blood_type TEXT,
  inbody_file_url TEXT,
  inbody_filename TEXT,
  inbody_filesize TEXT,
  has_health_issues BOOLEAN DEFAULT false,
  health_issues_details TEXT,
  agreed_health_and_remote_training BOOLEAN DEFAULT true,
  agreed_diet_and_supplements BOOLEAN DEFAULT true,
  agreed_intellectual_property BOOLEAN DEFAULT true,
  agreed_payment_and_refund_policy BOOLEAN DEFAULT true,
  digital_signature TEXT,
  signed_timestamp TEXT,
  status TEXT DEFAULT 'completed_and_active',
  completed_timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. جدول سجلات الذكاء الاصطناعي (ai_generation_logs)
CREATE TABLE IF NOT EXISTS public.ai_generation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  client_id UUID,
  coach_id UUID,
  plan_type TEXT DEFAULT 'workout',
  model_name TEXT DEFAULT 'gemini-3.8-flash',
  prompt_input TEXT,
  ai_output TEXT,
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0
);

ALTER TABLE public.ai_generation_logs ADD COLUMN IF NOT EXISTS plan_type TEXT DEFAULT 'workout';
ALTER TABLE public.ai_generation_logs ADD COLUMN IF NOT EXISTS ai_output TEXT;

-- 4. جدول الملفات الحيوية الإضافي (profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  subscription_plan TEXT NOT NULL DEFAULT 'standard' CHECK (subscription_plan IN ('standard', 'VIP')),
  weight NUMERIC DEFAULT 74.5,
  height NUMERIC DEFAULT 175,
  muscle_mass NUMERIC DEFAULT 32.9,
  body_fat NUMERIC DEFAULT 22.1,
  target_weight NUMERIC DEFAULT 68.9,
  daily_calories INTEGER DEFAULT 2050,
  daily_water_current NUMERIC DEFAULT 2.0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. جدول التمارين (workouts) والملاحظات المباشرة (notes)
CREATE TABLE IF NOT EXISTS public.workouts (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  day_key TEXT NOT NULL,
  workout_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  subject TEXT,
  category TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  reply TEXT,
  reply_timestamp TEXT,
  is_resolved BOOLEAN DEFAULT false
);

ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS client_email TEXT;

-- 6. فتح صلاحيات الإدخال والتعديل وإيقاف RLS المقيد للجداول الإدارية
${SUPABASE_RLS_FIX_SQL}
`;

