import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AIGenerationLog,
  AIPlanType,
  ClientNote,
  ClientProfile,
  GeneratedAIPlanResponse,
  SubscriptionPlanTier,
  WorkoutDay,
} from '../types';

// Read exclusively from environment variables (No hardcoded credentials)
export const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string) || '';
export const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';

const STORAGE_KEYS = {
  SUPABASE_URL: 'oao_supabase_url',
  SUPABASE_KEY: 'oao_supabase_anon_key',
  PROFILE_PREFIX: 'oao_profile_',
  WORKOUTS_PREFIX: 'oao_workouts_',
  NOTES: 'oao_notes',
  WATER: 'oao_water_',
  AI_LOGS: 'oao_ai_generation_logs',
};

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
  return rawMsg;
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseConfig(): { url: string; key: string } {
  const storedUrl =
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_URL) : null;
  const storedKey =
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.SUPABASE_KEY) : null;

  const url =
    (storedUrl && storedUrl.startsWith('http') ? storedUrl.trim() : '') ||
    ((import.meta.env.VITE_SUPABASE_URL as string) || '').trim();

  const key =
    (storedKey && storedKey.trim().length > 10 ? storedKey.trim() : '') ||
    ((import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '').trim();

  return { url, key };
}

export function saveSupabaseConfig(url: string, key: string) {
  localStorage.setItem(STORAGE_KEYS.SUPABASE_URL, url.trim());
  localStorage.setItem(STORAGE_KEYS.SUPABASE_KEY, key.trim());
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

function getLocalAILogs(): AIGenerationLog[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_LOGS);
    return raw ? (JSON.parse(raw) as AIGenerationLog[]) : [];
  } catch {
    return [];
  }
}

function saveLocalAILogRecord(record: AIGenerationLog) {
  if (typeof window === 'undefined') return;
  try {
    const current = getLocalAILogs();
    const existingIndex = current.findIndex((item) => item.id === record.id);
    let updated: AIGenerationLog[];
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = record;
    } else {
      updated = [record, ...current].slice(0, 50);
    }
    localStorage.setItem(STORAGE_KEYS.AI_LOGS, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('oao-ai-logs-updated', { detail: updated }));
  } catch (err) {
    console.warn('Failed to persist local AI log mirror:', err);
  }
}

/**
 * saveAILog: Automatically creates or updates records in `ai_generation_logs`
 * whenever a workout or nutrition plan is generated for a subscriber.
 */
export async function saveAILog(input: SaveAILogInput): Promise<SaveAILogResult> {
  const nowIso = new Date().toISOString();
  const recordId = input.id && UUID_REGEX.test(input.id) ? input.id : generateUUID();
  const modelName = input.modelName || 'gemini-3.8-flash';
  const promptTokens = input.promptTokens ?? 0;
  const completionTokens = input.completionTokens ?? 0;
  const totalTokens = input.totalTokens ?? promptTokens + completionTokens;

  const baseLocalRecord: AIGenerationLog = {
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
    saveLocalAILogRecord(baseLocalRecord);
    return {
      success: false,
      syncedToSupabase: false,
      log: baseLocalRecord,
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

      const fallbackRecord: AIGenerationLog = {
        ...baseLocalRecord,
        synced_to_supabase: false,
        supabase_status_note: statusNote,
      };
      saveLocalAILogRecord(fallbackRecord);
      return {
        success: false,
        syncedToSupabase: false,
        log: fallbackRecord,
        error: error.message,
      };
    }

    const syncedRecord: AIGenerationLog = {
      ...baseLocalRecord,
      id: (data && typeof data.id === 'string' ? data.id : recordId),
      created_at: (data && typeof data.created_at === 'string' ? data.created_at : nowIso),
      synced_to_supabase: true,
    };
    saveLocalAILogRecord(syncedRecord);

    return {
      success: true,
      syncedToSupabase: true,
      log: syncedRecord,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Supabase error';
    const fallbackRecord: AIGenerationLog = {
      ...baseLocalRecord,
      synced_to_supabase: false,
      supabase_status_note: message,
    };
    saveLocalAILogRecord(fallbackRecord);
    return {
      success: false,
      syncedToSupabase: false,
      log: fallbackRecord,
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
 * Fetch AI generation logs from Supabase `ai_generation_logs` merged with local history.
 */
export async function fetchAILogs(): Promise<AIGenerationLog[]> {
  const localLogs = getLocalAILogs();
  const client = getSupabaseClient();
  if (!client) return localLogs;

  try {
    const { data, error } = await client
      .from('ai_generation_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);

    if (error || !data) {
      return localLogs;
    }

    const remoteLogs: AIGenerationLog[] = data.map((row: Record<string, unknown>) => {
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

    // Merge remote logs with any unsynced local logs
    const remoteIds = new Set(remoteLogs.map((r) => r.id));
    const merged = [
      ...remoteLogs,
      ...localLogs.filter((l) => !remoteIds.has(l.id)),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return merged;
  } catch {
    return localLogs;
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
        isLocalMode: true,
        message:
          'قاعدة البيانات تعمل حالياً في الوضع المحلي المباشر (Local Storage Mode) بنجاح 100%. لم يتم إدخال بيانات Supabase في ملف .env أو في الحقول أدناه. الربط السحابي اختياري بالكامل.',
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
    const { error } = await client.from('notes').upsert({
      id: note.id,
      client_id: note.clientId,
      client_name: note.clientName,
      subject: note.subject,
      category: note.category,
      message: note.message,
      timestamp: note.timestamp,
      reply: note.reply || null,
      reply_timestamp: note.replyTimestamp || null,
      is_resolved: note.isResolved,
    });
    return !error;
  } catch (err) {
    console.warn('Supabase sync note error:', err);
    return false;
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
}

/**
 * Persist subscriber registration & `subscription_plan` ('standard' | 'VIP')
 * directly into Supabase `public.clients` (and `public.profiles` if present).
 */
export async function saveSubscriberToSupabase(
  input: SaveSubscriberPlanInput
): Promise<{ synced: boolean; subscriptionPlan: SubscriptionPlanTier; error?: string }> {
  const normalizedPlan = normalizeSubscriptionPlan(input.subscriptionPlan);
  const packageTypeAr =
    normalizedPlan === 'VIP' ? 'الباقة البلاتينية (VIP)' : 'الباقة القياسية (Standard)';
  const packageTypeEn = normalizedPlan; // 'VIP' | 'standard'

  // Mirror email -> plan mapping locally so returning logins always resolve immediately even offline
  if (typeof window !== 'undefined' && input.email) {
    try {
      const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
      const mapObj: Record<string, { plan: SubscriptionPlanTier; nameAr: string; startDate?: string; endDate?: string; status?: string }> = mapRaw
        ? JSON.parse(mapRaw)
        : {};
      mapObj[input.email.trim().toLowerCase()] = {
        plan: normalizedPlan,
        nameAr: input.nameAr,
        startDate: input.subscriptionStartDate,
        endDate: input.subscriptionEndDate,
        status: input.status,
      };
      localStorage.setItem('oao_subscriber_plans_map', JSON.stringify(mapObj));
    } catch {
      // ignore storage errors
    }
  }

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

    if (!existingUuid && input.email) {
      const { data: found } = await client
        .from('clients')
        .select('id')
        .eq('email', input.email.trim())
        .maybeSingle();
      if (found && typeof found.id === 'string') {
        existingUuid = found.id;
      }
    }

    const rowId = existingUuid || generateUUID();

    // Primary payload including `subscription_plan` ('standard' | 'VIP') and subscription duration
    const fullClientPayload: Record<string, unknown> = {
      id: rowId,
      client_code: clientCode,
      name_ar: input.nameAr,
      name_en: input.nameEn || input.nameAr,
      email: input.email || null,
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

    let { error } = await client
      .from('clients')
      .upsert(fullClientPayload, { onConflict: 'id' });

    // Adaptive fallback if columns haven't been added via SQL Editor yet
    if (
      error &&
      (error.code === 'PGRST204' ||
        error.code === '42703' ||
        error.message.includes('subscription_plan') ||
        error.message.includes('subscription_start_date') ||
        error.message.includes('subscription_end_date'))
    ) {
      const fallbackPayload: Record<string, unknown> = {
        id: rowId,
        client_code: clientCode,
        name_ar: input.nameAr,
        name_en: input.nameEn || input.nameAr,
        email: input.email || null,
        phone: input.phone || null,
        height_cm: input.heightCm ?? 175,
        target_weight_kg: input.targetWeightKg ?? 70,
        package_type_ar: packageTypeAr,
        package_type_en: packageTypeEn,
        status: input.status || 'active',
      };
      const retryRes = await client
        .from('clients')
        .upsert(fallbackPayload, { onConflict: 'id' });
      error = retryRes.error;
    }

    if (error) {
      return { synced: false, subscriptionPlan: normalizedPlan, error: error.message };
    }

    return { synced: true, subscriptionPlan: normalizedPlan };
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
      // fallback to local lookup
    }
  }

  if (typeof window !== 'undefined') {
    try {
      const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
      if (mapRaw) {
        const mapObj = JSON.parse(mapRaw) as Record<
          string,
          {
            plan: SubscriptionPlanTier;
            nameAr?: string;
            status?: string;
            startDate?: string;
            endDate?: string;
          }
        >;
        if (mapObj[cleanEmail]) {
          return {
            plan: normalizeSubscriptionPlan(mapObj[cleanEmail].plan),
            nameAr: mapObj[cleanEmail].nameAr,
            status: mapObj[cleanEmail].status,
            startDate: mapObj[cleanEmail].startDate,
            endDate: mapObj[cleanEmail].endDate,
          };
        }
      }

      const declRaw = localStorage.getItem('oao_client_declarations');
      if (declRaw) {
        const decls = JSON.parse(declRaw) as Array<Record<string, unknown>>;
        const matched = [...decls]
          .reverse()
          .find(
            (d) =>
              typeof d.email === 'string' && d.email.trim().toLowerCase() === cleanEmail
          );
        if (matched) {
          const rawPlan =
            (matched.subscription_plan as string | undefined) ||
            (matched.planId as string | undefined);
          return {
            plan: normalizeSubscriptionPlan(rawPlan),
            nameAr: typeof matched.fullName === 'string' ? matched.fullName : undefined,
            status: typeof matched.status === 'string' ? matched.status : undefined,
            startDate: typeof matched.startDate === 'string' ? matched.startDate : undefined,
            endDate: typeof matched.endDate === 'string' ? matched.endDate : undefined,
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// Sync profile stats & subscription_plan ('standard' | 'VIP') to Supabase
export async function syncProfileToSupabase(profile: ClientProfile): Promise<boolean> {
  const normalizedPlan = normalizeSubscriptionPlan(profile.subscription_plan);

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

  // 2. Also sync to `public.profiles` if created by SQL schema
  const client = getSupabaseClient();
  if (!client) return clientRes.synced;
  try {
    const { error } = await client.from('profiles').upsert({
      id: profile.id,
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
    return clientRes.synced || !error;
  } catch {
    return clientRes.synced;
  }
}

// Ready-to-copy SQL Schema for Coach/Admin including `clients.subscription_plan`, `subscription_start_date`, `subscription_end_date` & RLS policies
export const SUPABASE_SQL_SCHEMA = `-- OAO - OWN AURA OUTCOME TRAINING PORTAL DATABASE SCHEMA
-- شغّل هذا الكود في Supabase SQL Editor لضبط حقول الخطة وفترة الاشتراك وتفعيل الصلاحيات:

-- 1. جدول المشتركين (clients) + حقول خطة الاشتراك وفترة الاشتراك (من ... إلى ...)
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  client_code TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  email TEXT,
  phone TEXT,
  age INTEGER,
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

-- إضافة الحقول تلقائياً إذا كان جدول clients موجوداً مسبقاً
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'standard';
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS subscription_start_date DATE;
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS subscription_end_date DATE;

-- قيد التحقق لضمان أن الخطة دائماً 'standard' أو 'VIP' فقط
ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_subscription_plan_check;
ALTER TABLE public.clients
  ADD CONSTRAINT clients_subscription_plan_check
  CHECK (subscription_plan IN ('standard', 'VIP'));

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to clients" ON public.clients;
CREATE POLICY "Allow public access to clients"
  ON public.clients FOR ALL USING (true) WITH CHECK (true);

-- 2. جدول سجلات الذكاء الاصطناعي (ai_generation_logs)
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

ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public access to ai_generation_logs" ON public.ai_generation_logs;
CREATE POLICY "Allow public access to ai_generation_logs"
  ON public.ai_generation_logs FOR ALL USING (true) WITH CHECK (true);

-- 3. جدول الملفات الحيوية الإضافي (profiles) مع حقل subscription_plan
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

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_plan TEXT NOT NULL DEFAULT 'standard'
  CHECK (subscription_plan IN ('standard', 'VIP'));

-- 4. جدول التمارين (workouts) والملاحظات المباشرة (notes)
CREATE TABLE IF NOT EXISTS public.workouts (
  id TEXT PRIMARY KEY,
  client_id TEXT REFERENCES public.profiles(id),
  day_key TEXT NOT NULL,
  workout_data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.notes (
  id TEXT PRIMARY KEY,
  client_id TEXT,
  client_name TEXT NOT NULL,
  subject TEXT,
  category TEXT DEFAULT 'general',
  message TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  reply TEXT,
  reply_timestamp TEXT,
  is_resolved BOOLEAN DEFAULT false
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-write for demo/athletes" ON public.profiles;
CREATE POLICY "Allow public read-write for demo/athletes" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for workouts" ON public.workouts;
CREATE POLICY "Allow public read-write for workouts" ON public.workouts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read-write for notes" ON public.notes;
CREATE POLICY "Allow public read-write for notes" ON public.notes FOR ALL USING (true) WITH CHECK (true);
`;
