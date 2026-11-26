import { Role, SubscriptionPlanTier } from '../types';
import {
  formatSupabaseErrorMessage,
  generateSecureAccessToken,
  getSupabaseClient,
  isCoachIdConstraintError,
  isMissingTableError as isMissingTableErrShared,
  normalizeSubscriptionPlan,
  writeClientRowSafely,
  writeTableRowSafely,
} from './supabase';
import { calculateSubscriptionDetails, normalizeIsoDateOnly } from './subscriptionUtils';

export interface UserCredentialRecord {
  id?: string;
  email: string;
  password: string;
  clientName: string;
  clientCode?: string;
  accessToken?: string;
  plan: SubscriptionPlanTier;
  phone?: string;
  status: 'active' | 'suspended' | 'expiring' | 'expired';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionDaysLeft?: number;
  createdAt: string;
  updatedAt: string;
  assignedByCoach: boolean;
  syncedToSupabase?: boolean;
  age?: number;
  bloodType?: string;
  visualGoal?: string;
  nutritionPlanLocked?: boolean;
  inBodyFileName?: string;
  inBodyFileUrl?: string;
}

export interface CurrentUserSession {
  id?: string;
  email: string;
  name: string;
  plan: SubscriptionPlanTier;
  role: Role;
  clientCode?: string;
  phone?: string;
  accessToken?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionStatus?: UserCredentialRecord['status'];
}

const USER_SESSION_STORAGE_KEY = 'oao_current_user_session';

// In-memory directory & coach session caches (never stored in localStorage/sessionStorage)
let subscribersMemoryCache: UserCredentialRecord[] = [];
let globalNutritionLockMemoryCache = false;
let coachAuthenticatedMemory = false;
let coachTokenMemoryCache: string | null = null;
let coachSecretsConfiguredMemory = true;

export function isCoachAuthenticated(): boolean {
  return coachAuthenticatedMemory;
}

export function setCoachAuthenticated(authenticated: boolean): void {
  coachAuthenticatedMemory = authenticated;
  if (!authenticated) {
    coachTokenMemoryCache = null;
  }
}

export function getCoachAuthHeaders(): Record<string, string> {
  return coachTokenMemoryCache ? { Authorization: `Bearer ${coachTokenMemoryCache}` } : {};
}

export function handleCoachUnauthorizedResponse(message?: string): void {
  coachAuthenticatedMemory = false;
  coachTokenMemoryCache = null;
  if (typeof window !== 'undefined') {
    const notice =
      message || 'انتهت جلسة الكوتش أو غير مصرح بالوصول. يرجى تسجيل الدخول مجدداً.';
    window.dispatchEvent(
      new CustomEvent('oao_coach_unauthorized', { detail: { message: notice } })
    );
    window.dispatchEvent(new CustomEvent('oao_coach_auth_changed', { detail: { authenticated: false } }));
  }
}

export async function loginCoachOnServer(passkey: string): Promise<{
  success: boolean;
  secretsMissing?: boolean;
  rateLimited?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch('/api/coach/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passkey }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      authenticated?: boolean;
      token?: string;
      secretsMissing?: boolean;
      rateLimited?: boolean;
      error?: string;
    };

    if (res.ok && data.success) {
      coachAuthenticatedMemory = true;
      coachSecretsConfiguredMemory = true;
      coachTokenMemoryCache = typeof data.token === 'string' && data.token ? data.token : null;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('oao_coach_auth_changed', { detail: { authenticated: true } })
        );
      }
      return { success: true };
    }

    coachAuthenticatedMemory = false;
    coachTokenMemoryCache = null;
    if (data.secretsMissing) {
      coachSecretsConfiguredMemory = false;
    }
    return {
      success: false,
      secretsMissing: Boolean(data.secretsMissing),
      rateLimited: res.status === 429 || Boolean(data.rateLimited),
      error:
        data.error ||
        (res.status === 429
          ? 'تم تجاوز الحد الأقصى لمحاولات الدخول. يرجى الانتظار 15 دقيقة.'
          : 'رمز المرور غير صحيح، يرجى التأكد من الرمز والمحاولة مرة أخرى.'),
    };
  } catch {
    return {
      success: false,
      error: 'تعذر الاتصال بخادم التحقق. يرجى التأكد من عمل الخادم والمحاولة مرة أخرى.',
    };
  }
}

export async function checkCoachSession(): Promise<{
  authenticated: boolean;
  secretsConfigured: boolean;
}> {
  try {
    const res = await fetch('/api/coach/session', {
      method: 'GET',
      credentials: 'include',
      headers: getCoachAuthHeaders(),
    });
    if (!res.ok) {
      coachAuthenticatedMemory = false;
      return { authenticated: false, secretsConfigured: coachSecretsConfiguredMemory };
    }
    const data = (await res.json().catch(() => ({}))) as {
      authenticated?: boolean;
      secretsConfigured?: boolean;
    };
    const secretsConfigured = data.secretsConfigured !== false;
    const authenticated = Boolean(secretsConfigured && data.authenticated);
    coachSecretsConfiguredMemory = secretsConfigured;
    coachAuthenticatedMemory = authenticated;
    if (!authenticated) {
      coachTokenMemoryCache = null;
    }
    return { authenticated, secretsConfigured };
  } catch {
    return {
      authenticated: coachAuthenticatedMemory,
      secretsConfigured: coachSecretsConfiguredMemory,
    };
  }
}

export async function logoutCoachOnServer(): Promise<void> {
  const headers = getCoachAuthHeaders();
  coachAuthenticatedMemory = false;
  coachTokenMemoryCache = null;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('oao_coach_auth_changed', { detail: { authenticated: false } })
    );
  }
  try {
    await fetch('/api/coach/logout', {
      method: 'POST',
      credentials: 'include',
      headers,
    });
  } catch {
    // ignore network errors on logout
  }
}

export function getCurrentUserSession(): CurrentUserSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(USER_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurrentUserSession;
    return parsed && typeof parsed.email === 'string' ? parsed : null;
  } catch {
    return null;
  }
}

export function setCurrentUserSession(user: CurrentUserSession | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      sessionStorage.setItem(USER_SESSION_STORAGE_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(USER_SESSION_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function clearCurrentUserSession(): void {
  setCurrentUserSession(null);
  if (coachAuthenticatedMemory) {
    void logoutCoachOnServer();
  } else {
    setCoachAuthenticated(false);
  }
}

export function getAllSubscribersWithCredentials(): UserCredentialRecord[] {
  return subscribersMemoryCache;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function generateRecordUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function saveSubscribersList(records: UserCredentialRecord[]): void {
  subscribersMemoryCache = records;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('oao_credentials_updated', { detail: records }));
  }
}

function isMissingTableError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('could not find the table')
  );
}

function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return err.code === 'PGRST204' || err.code === '42703' || msg.includes('column');
}

function isRlsPolicyError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  const msg = (err.message || '').toLowerCase();
  return err.code === '42501' || msg.includes('row-level security') || msg.includes('violates row-level security policy');
}

function mapSubscribersRowToRecord(row: Record<string, unknown>): UserCredentialRecord | null {
  const rawEmail = typeof row.email === 'string' ? row.email.trim().toLowerCase() : '';
  if (!rawEmail) return null;

  const rawPass = row.passcode ?? row.password ?? row.assigned_password;
  const rawTier = row.tier ?? row.subscription_plan ?? row.package_type_en;
  const rawGoals = row.goals ?? row.visual_goal;
  const rawToken = typeof row.access_token === 'string' ? row.access_token.trim() : '';

  const startIso = normalizeIsoDateOnly(
    typeof row.subscription_start_date === 'string' ? row.subscription_start_date : undefined
  );
  const endIso = normalizeIsoDateOnly(
    typeof row.subscription_end_date === 'string' ? row.subscription_end_date : undefined
  );

  return {
    id: row.id ? String(row.id) : undefined,
    email: rawEmail,
    password: rawPass ? String(rawPass) : 'OAO-2026',
    clientName: String(row.name || row.name_ar || row.name_en || 'مشترك'),
    clientCode: row.client_code
      ? String(row.client_code)
      : rawPass
      ? String(rawPass)
      : undefined,
    accessToken: rawToken || undefined,
    plan: normalizeSubscriptionPlan(typeof rawTier === 'string' ? rawTier : undefined),
    phone: row.phone ? String(row.phone) : undefined,
    status: (row.status as UserCredentialRecord['status']) || 'active',
    subscriptionStartDate: startIso || undefined,
    subscriptionEndDate: endIso || undefined,
    subscriptionDaysLeft:
      row.subscription_days_left !== null && row.subscription_days_left !== undefined
        ? Number(row.subscription_days_left)
        : undefined,
    age: row.age !== null && row.age !== undefined ? Number(row.age) : undefined,
    bloodType: row.blood_type ? String(row.blood_type) : undefined,
    visualGoal: rawGoals ? String(rawGoals) : undefined,
    nutritionPlanLocked: Boolean(row.nutrition_plan_locked),
    inBodyFileName: row.inbody_filename ? String(row.inbody_filename) : undefined,
    inBodyFileUrl: row.inbody_file_url ? String(row.inbody_file_url) : undefined,
    createdAt: String(row.created_at || new Date().toISOString()),
    updatedAt: String(row.updated_at || row.created_at || new Date().toISOString()),
    assignedByCoach: true,
    syncedToSupabase: true,
  };
}

/**
 * Fetch authoritative subscribers exclusively from Supabase `public.subscribers`
 * enriched with `public.clients` and `workouts(day_key='client_auth')`.
 */
export async function fetchSubscribersFromSupabase(): Promise<UserCredentialRecord[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return subscribersMemoryCache;

  try {
    let subscribersRes = await supabase
      .from('subscribers')
      .select('*')
      .order('created_at', { ascending: false });

    if (subscribersRes.error && isMissingColumnError(subscribersRes.error)) {
      subscribersRes = await supabase.from('subscribers').select('*');
    }

    let [clientsRes, authMirrorsRes] = await Promise.all([
      supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('workouts')
        .select('*')
        .eq('day_key', 'client_auth'),
    ]);

    if (clientsRes.error && isMissingColumnError(clientsRes.error)) {
      clientsRes = await supabase.from('clients').select('*');
    }

    if (subscribersRes.error && clientsRes.error && authMirrorsRes.error) {
      return subscribersMemoryCache;
    }

    const authByEmail = new Map<string, Record<string, unknown>>();
    if (!authMirrorsRes.error && Array.isArray(authMirrorsRes.data)) {
      for (const row of authMirrorsRes.data as Array<Record<string, unknown>>) {
        const w = (row.workout_data || {}) as Record<string, unknown>;
        const em = typeof w.email === 'string' ? w.email.trim().toLowerCase() : '';
        if (em) {
          authByEmail.set(em, { ...w, _mirrorUpdatedAt: row.updated_at });
        }
      }
    }

    const mergedByEmail = new Map<string, UserCredentialRecord>();

    // 1. Primary source: central `public.subscribers` table
    if (!subscribersRes.error && Array.isArray(subscribersRes.data)) {
      for (const row of subscribersRes.data as Array<Record<string, unknown>>) {
        const mapped = mapSubscribersRowToRecord(row);
        if (!mapped) continue;
        const mirror = authByEmail.get(mapped.email);
        if (mirror) {
          if (!mapped.clientCode && mirror.clientCode) mapped.clientCode = String(mirror.clientCode);
          if (!mapped.accessToken && mirror.accessToken) mapped.accessToken = String(mirror.accessToken).trim();
          if (!mapped.phone && mirror.phone) mapped.phone = String(mirror.phone);
          if (!mapped.age && mirror.age) mapped.age = Number(mirror.age);
          if (!mapped.bloodType && mirror.bloodType) mapped.bloodType = String(mirror.bloodType);
          if (!mapped.visualGoal && mirror.visualGoal) mapped.visualGoal = String(mirror.visualGoal);
          if (!mapped.subscriptionStartDate && typeof mirror.subscriptionStartDate === 'string') {
            mapped.subscriptionStartDate = normalizeIsoDateOnly(mirror.subscriptionStartDate) || undefined;
          }
          if (!mapped.subscriptionEndDate && typeof mirror.subscriptionEndDate === 'string') {
            mapped.subscriptionEndDate = normalizeIsoDateOnly(mirror.subscriptionEndDate) || undefined;
          }
        }
        mergedByEmail.set(mapped.email, mapped);
      }
    }

    // 2. Enrich / include from `public.clients`
    if (!clientsRes.error && Array.isArray(clientsRes.data)) {
      for (const row of clientsRes.data as Array<Record<string, unknown>>) {
        if (typeof row.email !== 'string' || !row.email.trim()) continue;
        const cleanEmail = String(row.email).trim().toLowerCase();
        const mirror = authByEmail.get(cleanEmail);
        const existingSub = mergedByEmail.get(cleanEmail);
        const clientToken = typeof row.access_token === 'string' ? row.access_token.trim() : '';

        if (existingSub) {
          if (!existingSub.phone && row.phone) existingSub.phone = String(row.phone);
          if (!existingSub.clientCode && row.client_code) existingSub.clientCode = String(row.client_code);
          if (!existingSub.accessToken && clientToken) existingSub.accessToken = clientToken;
          if (!existingSub.visualGoal && row.visual_goal) existingSub.visualGoal = String(row.visual_goal);
          if (!existingSub.age && row.age !== null && row.age !== undefined) existingSub.age = Number(row.age);
          if (!existingSub.bloodType && row.blood_type) existingSub.bloodType = String(row.blood_type);
          if (!existingSub.subscriptionStartDate && row.subscription_start_date) {
            existingSub.subscriptionStartDate = normalizeIsoDateOnly(String(row.subscription_start_date)) || undefined;
          }
          if (!existingSub.subscriptionEndDate && row.subscription_end_date) {
            existingSub.subscriptionEndDate = normalizeIsoDateOnly(String(row.subscription_end_date)) || undefined;
          }
          if (existingSub.subscriptionDaysLeft === undefined && row.subscription_days_left !== null && row.subscription_days_left !== undefined) {
            existingSub.subscriptionDaysLeft = Number(row.subscription_days_left);
          }
          continue;
        }

        const record: UserCredentialRecord = {
          id: row.id ? String(row.id) : mirror?.id ? String(mirror.id) : undefined,
          email: cleanEmail,
          password: row.assigned_password
            ? String(row.assigned_password)
            : mirror?.password
            ? String(mirror.password)
            : row.client_code
            ? String(row.client_code)
            : 'OAO-2026',
          clientName: String(row.name_ar || row.name_en || mirror?.clientName || 'مشترك'),
          clientCode: row.client_code
            ? String(row.client_code)
            : mirror?.clientCode
            ? String(mirror.clientCode)
            : undefined,
          accessToken:
            clientToken ||
            (typeof mirror?.accessToken === 'string' ? mirror.accessToken.trim() : undefined),
          plan: normalizeSubscriptionPlan(
            (row.subscription_plan as string) || (mirror?.plan as string)
          ),
          phone: row.phone ? String(row.phone) : mirror?.phone ? String(mirror.phone) : undefined,
          status:
            ((row.status || mirror?.status) as UserCredentialRecord['status']) || 'active',
          subscriptionStartDate:
            normalizeIsoDateOnly(
              (row.subscription_start_date as string) || (mirror?.subscriptionStartDate as string)
            ) || undefined,
          subscriptionEndDate:
            normalizeIsoDateOnly(
              (row.subscription_end_date as string) || (mirror?.subscriptionEndDate as string)
            ) || undefined,
          subscriptionDaysLeft:
            row.subscription_days_left !== null && row.subscription_days_left !== undefined
              ? Number(row.subscription_days_left)
              : mirror?.subscriptionDaysLeft !== undefined
              ? Number(mirror.subscriptionDaysLeft)
              : undefined,
          age: row.age
            ? Number(row.age)
            : mirror?.age
            ? Number(mirror.age)
            : undefined,
          bloodType: row.blood_type
            ? String(row.blood_type)
            : mirror?.bloodType
            ? String(mirror.bloodType)
            : undefined,
          visualGoal: row.visual_goal
            ? String(row.visual_goal)
            : mirror?.visualGoal
            ? String(mirror.visualGoal)
            : undefined,
          nutritionPlanLocked:
            row.nutrition_plan_locked !== undefined && row.nutrition_plan_locked !== null
              ? Boolean(row.nutrition_plan_locked)
              : Boolean(mirror?.nutritionPlanLocked),
          inBodyFileName: row.inbody_filename
            ? String(row.inbody_filename)
            : mirror?.inBodyFileName
            ? String(mirror.inBodyFileName)
            : undefined,
          inBodyFileUrl: row.inbody_file_url
            ? String(row.inbody_file_url)
            : mirror?.inBodyFileUrl
            ? String(mirror.inBodyFileUrl)
            : undefined,
          createdAt: String(row.created_at || mirror?.createdAt || new Date().toISOString()),
          updatedAt: String(mirror?.updatedAt || row.created_at || new Date().toISOString()),
          assignedByCoach: true,
          syncedToSupabase: true,
        };
        mergedByEmail.set(cleanEmail, record);
      }
    }

    // 3. Include any records present in `client_auth` mirror
    for (const [cleanEmail, mirror] of authByEmail.entries()) {
      if (!mergedByEmail.has(cleanEmail)) {
        mergedByEmail.set(cleanEmail, {
          id: mirror.id ? String(mirror.id) : cleanEmail,
          email: cleanEmail,
          password: mirror.password ? String(mirror.password) : 'OAO-2026',
          clientName: String(mirror.clientName || 'مشترك'),
          clientCode: mirror.clientCode ? String(mirror.clientCode) : undefined,
          accessToken:
            typeof mirror.accessToken === 'string' && mirror.accessToken.trim()
              ? mirror.accessToken.trim()
              : undefined,
          plan: normalizeSubscriptionPlan(mirror.plan as string),
          phone: mirror.phone ? String(mirror.phone) : undefined,
          status: (mirror.status as UserCredentialRecord['status']) || 'active',
          subscriptionStartDate:
            normalizeIsoDateOnly(mirror.subscriptionStartDate as string) || undefined,
          subscriptionEndDate:
            normalizeIsoDateOnly(mirror.subscriptionEndDate as string) || undefined,
          subscriptionDaysLeft:
            mirror.subscriptionDaysLeft !== undefined
              ? Number(mirror.subscriptionDaysLeft)
              : undefined,
          age: mirror.age ? Number(mirror.age) : undefined,
          bloodType: mirror.bloodType ? String(mirror.bloodType) : undefined,
          visualGoal: mirror.visualGoal ? String(mirror.visualGoal) : undefined,
          nutritionPlanLocked: Boolean(mirror.nutritionPlanLocked),
          inBodyFileName: mirror.inBodyFileName ? String(mirror.inBodyFileName) : undefined,
          inBodyFileUrl: mirror.inBodyFileUrl ? String(mirror.inBodyFileUrl) : undefined,
          createdAt: String(mirror.createdAt || new Date().toISOString()),
          updatedAt: String(mirror.updatedAt || new Date().toISOString()),
          assignedByCoach: true,
          syncedToSupabase: true,
        });
      }
    }

    const remoteList = Array.from(mergedByEmail.values());
    saveSubscribersList(remoteList);
    return remoteList;
  } catch {
    return subscribersMemoryCache;
  }
}

/**
 * Create/update subscriber directly in Supabase central `public.subscribers` table
 * (name, email, passcode, tier, goals, etc.) plus linked `clients` and `workouts.client_auth`.
 * Zero browser localStorage fallback.
 */
export async function assignSubscriberPassword(params: {
  id?: string;
  email: string;
  password: string;
  clientName: string;
  clientCode?: string;
  accessToken?: string;
  plan?: SubscriptionPlanTier;
  phone?: string;
  status?: 'active' | 'suspended' | 'expiring' | 'expired';
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  subscriptionDaysLeft?: number;
  age?: number;
  bloodType?: string;
  visualGoal?: string;
  nutritionPlanLocked?: boolean;
  inBodyFileName?: string;
  inBodyFileUrl?: string;
}): Promise<{ success: boolean; syncedToSupabase: boolean; record?: UserCredentialRecord; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPass = params.password.trim();
  const nowIso = new Date().toISOString();
  const normalizedPlan = normalizeSubscriptionPlan(params.plan || 'standard');

  if (!cleanEmail || !cleanPass) {
    return { success: false, syncedToSupabase: false, error: 'البريد الإلكتروني ورمز الدخول (Passcode) مطلوبان.' };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      syncedToSupabase: false,
      error: 'قاعدة البيانات السحابية Supabase غير متصلة. يرجى ضبط متغيرات الربط أولاً.',
    };
  }

  const all = [...subscribersMemoryCache];
  const existingIdx = all.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  const existingRecord = existingIdx >= 0 ? all[existingIdx] : undefined;

  const resolvedId =
    (params.id && UUID_REGEX.test(params.id) ? params.id : undefined) ||
    (existingRecord?.id && UUID_REGEX.test(existingRecord.id) ? existingRecord.id : undefined) ||
    generateRecordUUID();

  // Preserve any existing access_token in DB before minting a fresh token
  let existingDbToken = '';
  try {
    const [{ data: subTokRow }, { data: clientTokRow }] = await Promise.all([
      supabase.from('subscribers').select('access_token').ilike('email', cleanEmail).limit(1).maybeSingle(),
      supabase.from('clients').select('access_token').ilike('email', cleanEmail).limit(1).maybeSingle(),
    ]);
    existingDbToken =
      (subTokRow && typeof (subTokRow as Record<string, unknown>).access_token === 'string'
        ? String((subTokRow as Record<string, unknown>).access_token).trim()
        : '') ||
      (clientTokRow && typeof (clientTokRow as Record<string, unknown>).access_token === 'string'
        ? String((clientTokRow as Record<string, unknown>).access_token).trim()
        : '');
  } catch {
    // Ignore if access_token column hasn't been added yet
  }

  const resolvedAccessToken =
    (params.accessToken && params.accessToken.trim()) ||
    (existingRecord?.accessToken && existingRecord.accessToken.trim()) ||
    existingDbToken ||
    generateSecureAccessToken();

  const resolvedStartDate =
    normalizeIsoDateOnly(
      params.subscriptionStartDate !== undefined
        ? params.subscriptionStartDate
        : existingRecord?.subscriptionStartDate
    ) || undefined;
  const resolvedEndDate =
    normalizeIsoDateOnly(
      params.subscriptionEndDate !== undefined
        ? params.subscriptionEndDate
        : existingRecord?.subscriptionEndDate
    ) || undefined;

  const computedSubDetails = calculateSubscriptionDetails({
    subscriptionStartDate: resolvedStartDate,
    subscriptionEndDate: resolvedEndDate,
    subscriptionStatus:
      params.status === 'suspended'
        ? 'suspended'
        : params.status === 'expired'
        ? 'expired'
        : 'active',
  });

  const resolvedDaysLeft =
    params.subscriptionDaysLeft !== undefined
      ? params.subscriptionDaysLeft
      : resolvedEndDate
      ? computedSubDetails.daysRemaining
      : existingRecord?.subscriptionDaysLeft;

  let resolvedStatus: UserCredentialRecord['status'] =
    params.status || existingRecord?.status || 'active';
  if (resolvedStatus !== 'suspended' && resolvedEndDate) {
    resolvedStatus = computedSubDetails.isExpired ? 'expired' : 'active';
  }

  const updatedRecord: UserCredentialRecord = {
    id: resolvedId,
    email: cleanEmail,
    password: cleanPass,
    clientName: params.clientName.trim() || existingRecord?.clientName || 'مشترك',
    clientCode:
      params.clientCode ||
      existingRecord?.clientCode ||
      cleanPass ||
      `OAO-${normalizedPlan === 'VIP' ? 'VIP' : 'STD'}-${Math.floor(100 + Math.random() * 900)}`,
    accessToken: resolvedAccessToken,
    plan: normalizedPlan,
    phone: params.phone !== undefined ? params.phone : existingRecord?.phone,
    status: resolvedStatus,
    subscriptionStartDate: resolvedStartDate,
    subscriptionEndDate: resolvedEndDate,
    subscriptionDaysLeft: resolvedDaysLeft,
    age: params.age !== undefined ? params.age : existingRecord?.age,
    bloodType: params.bloodType !== undefined ? params.bloodType : existingRecord?.bloodType,
    visualGoal: params.visualGoal !== undefined ? params.visualGoal : existingRecord?.visualGoal,
    nutritionPlanLocked:
      params.nutritionPlanLocked !== undefined
        ? params.nutritionPlanLocked
        : existingRecord?.nutritionPlanLocked || false,
    inBodyFileName: params.inBodyFileName || existingRecord?.inBodyFileName,
    inBodyFileUrl: params.inBodyFileUrl || existingRecord?.inBodyFileUrl,
    createdAt: existingRecord?.createdAt || nowIso,
    updatedAt: nowIso,
    assignedByCoach: true,
    syncedToSupabase: false,
  };

  try {
    // 0. If running in an authenticated coach session behind server.ts with SUPABASE_SERVICE_ROLE_KEY, sync via Service Role endpoint
    if (typeof window !== 'undefined' && coachAuthenticatedMemory) {
      try {
        const proxyRes = await fetch('/api/admin/subscribers', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...getCoachAuthHeaders() },
          body: JSON.stringify({ record: updatedRecord }),
        });
        if (proxyRes.status === 401) {
          const errJson = (await proxyRes.json().catch(() => ({}))) as { error?: string };
          const msg = errJson.error || 'انتهت جلسة الكوتش أو غير مصرح بالوصول. يرجى تسجيل الدخول مجدداً.';
          handleCoachUnauthorizedResponse(msg);
          return { success: false, syncedToSupabase: false, error: msg };
        }
        if (proxyRes.ok) {
          const proxyJson = (await proxyRes.json()) as { success?: boolean; id?: string; accessToken?: string };
          if (proxyJson.success) {
            if (proxyJson.id) updatedRecord.id = proxyJson.id;
            if (proxyJson.accessToken) updatedRecord.accessToken = proxyJson.accessToken;
            updatedRecord.syncedToSupabase = true;
            const latest = [...subscribersMemoryCache];
            const idx = latest.findIndex((u) => u.email.toLowerCase() === cleanEmail);
            if (idx >= 0) latest[idx] = updatedRecord;
            else latest.unshift(updatedRecord);
            saveSubscribersList(latest);
            return { success: true, syncedToSupabase: true, record: updatedRecord };
          }
        } else if (proxyRes.status !== 501 && proxyRes.status !== 404) {
          const errJson = (await proxyRes.json().catch(() => ({}))) as { error?: string; fallbackToClient?: boolean };
          if (!errJson.fallbackToClient && errJson.error) {
            return { success: false, syncedToSupabase: false, error: formatSupabaseErrorMessage(errJson.error) };
          }
        }
      } catch {
        // Static hosting or offline proxy -> proceed directly via Supabase client
      }
    }

    // 1. Insert / Update directly into central `public.subscribers` table (schema-adaptive)
    let targetSubscriberId = resolvedId;
    let subscribersTableMissing = false;
    let subscribersSynced = false;
    let subscribersErr: { code?: string; message: string } | null = null;

    const { data: existingSub, error: lookupSubErr } = await supabase
      .from('subscribers')
      .select('id')
      .ilike('email', cleanEmail)
      .limit(1)
      .maybeSingle();

    if (isMissingTableError(lookupSubErr) || isMissingTableErrShared(lookupSubErr)) {
      subscribersTableMissing = true;
    } else {
      const fullSubPayload: Record<string, unknown> = {
        id: targetSubscriberId,
        name: updatedRecord.clientName,
        email: cleanEmail,
        passcode: cleanPass,
        client_code: updatedRecord.clientCode,
        access_token: resolvedAccessToken,
        tier: normalizedPlan,
        goals: updatedRecord.visualGoal || null,
        phone: updatedRecord.phone || null,
        age: updatedRecord.age ?? null,
        blood_type: updatedRecord.bloodType || null,
        status: updatedRecord.status,
        subscription_start_date: updatedRecord.subscriptionStartDate || null,
        subscription_end_date: updatedRecord.subscriptionEndDate || null,
        subscription_days_left:
          updatedRecord.subscriptionDaysLeft !== undefined ? updatedRecord.subscriptionDaysLeft : null,
        nutrition_plan_locked: Boolean(updatedRecord.nutritionPlanLocked),
        inbody_filename: updatedRecord.inBodyFileName || null,
        inbody_file_url: updatedRecord.inBodyFileUrl || null,
        updated_at: nowIso,
      };

      const existingSubId =
        existingSub && existingSub.id !== undefined && existingSub.id !== null
          ? (existingSub.id as string | number)
          : null;
      if (existingSubId !== null) {
        targetSubscriberId = String(existingSubId);
      }

      const subWriteRes = await writeTableRowSafely(supabase, 'subscribers', fullSubPayload, {
        matchColumn: existingSubId !== null ? 'id' : undefined,
        matchValue: existingSubId,
      });

      if (subWriteRes.missingTable) {
        subscribersTableMissing = true;
      } else {
        subscribersErr = subWriteRes.error;
        subscribersSynced = !subWriteRes.error;
      }
    }

    if (UUID_REGEX.test(targetSubscriberId)) {
      updatedRecord.id = targetSubscriberId;
    }

    // If `subscribers` table exists and returned a hard error (RLS / constraint), fail visibly!
    if (!subscribersTableMissing && subscribersErr) {
      return {
        success: false,
        syncedToSupabase: false,
        error: isRlsPolicyError(subscribersErr)
          ? formatSupabaseErrorMessage(subscribersErr)
          : `تعذر حفظ المشترك في جدول subscribers: ${formatSupabaseErrorMessage(subscribersErr)}`,
      };
    }

    // 2. Keep linked `public.clients` table synchronized (schema-adaptive across any pre-existing columns/constraints)
    let targetClientId = UUID_REGEX.test(targetSubscriberId) ? targetSubscriberId : resolvedId;
    let clientsTableMissing = false;
    let clientsErr: { code?: string; message: string } | null = null;
    let clientsResData: { id?: string } | null = null;

    let clientLookup = await supabase
      .from('clients')
      .select('id')
      .ilike('email', cleanEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (clientLookup.error && isMissingColumnError(clientLookup.error)) {
      clientLookup = await supabase
        .from('clients')
        .select('id')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();
    }

    if (isMissingTableError(clientLookup.error) || isMissingTableErrShared(clientLookup.error)) {
      clientsTableMissing = true;
    } else {
      clientsResData = clientLookup.data as { id?: string } | null;
      const clientExistsInDb = Boolean(clientsResData && typeof clientsResData.id === 'string');
      if (clientsResData && typeof clientsResData.id === 'string') {
        targetClientId = clientsResData.id;
        updatedRecord.id = targetClientId;
      }

      const fullClientPayload: Record<string, unknown> = {
        id: targetClientId,
        email: cleanEmail,
        name_ar: updatedRecord.clientName,
        name_en: updatedRecord.clientName,
        height_cm: 175,
        target_weight_kg: 70,
        subscription_plan: normalizedPlan,
        package_type_ar: normalizedPlan === 'VIP' ? 'الباقة البلاتينية (VIP)' : 'الباقة القياسية (Standard)',
        package_type_en: normalizedPlan,
        phone: updatedRecord.phone || null,
        client_code: updatedRecord.clientCode,
        access_token: resolvedAccessToken,
        status: updatedRecord.status,
        subscription_start_date: updatedRecord.subscriptionStartDate || null,
        subscription_end_date: updatedRecord.subscriptionEndDate || null,
        subscription_days_left:
          updatedRecord.subscriptionDaysLeft !== undefined ? updatedRecord.subscriptionDaysLeft : null,
        assigned_password: cleanPass,
        age: updatedRecord.age ?? null,
        blood_type: updatedRecord.bloodType || null,
        visual_goal: updatedRecord.visualGoal || null,
        nutrition_plan_locked: Boolean(updatedRecord.nutritionPlanLocked),
        inbody_filename: updatedRecord.inBodyFileName || null,
        inbody_file_url: updatedRecord.inBodyFileUrl || null,
      };

      const existingClientRowId = clientExistsInDb ? targetClientId : null;
      const clientWriteRes = await writeClientRowSafely(
        supabase,
        fullClientPayload,
        existingClientRowId
      );

      clientsTableMissing = clientWriteRes.missingTable;
      clientsErr = clientWriteRes.error;

      // If `assigned_password` column doesn't exist in `clients` yet, mirror the passcode into `client_code`
      if (
        !clientsTableMissing &&
        !clientsErr &&
        clientWriteRes.strippedColumns.includes('assigned_password') &&
        updatedRecord.clientCode !== cleanPass
      ) {
        updatedRecord.clientCode = cleanPass;
        await supabase
          .from('clients')
          .update({ client_code: cleanPass })
          .ilike('email', cleanEmail);
      }
    }

    // If `clients` threw an RLS or unrecoverable constraint violation, fail visibly
    if (
      !clientsTableMissing &&
      clientsErr &&
      (isRlsPolicyError(clientsErr) ||
        isCoachIdConstraintError(clientsErr) ||
        clientsErr.code === '23502' ||
        (clientsErr.message || '').toLowerCase().includes('not-null'))
    ) {
      return {
        success: false,
        syncedToSupabase: false,
        error: formatSupabaseErrorMessage(clientsErr),
      };
    }

    // 3. Optionally mirror full subscriber auth bundle into `workouts` (`day_key = 'client_auth'`) if `workouts` table exists
    let workoutsTableMissing = false;
    let mirrorErr: { code?: string; message: string } | null = null;
    const authMirrorId = `auth_${cleanEmail}`;

    const { data: existingAuthRow, error: authLookupErr } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', authMirrorId)
      .limit(1)
      .maybeSingle();

    if (isMissingTableError(authLookupErr) || isMissingTableErrShared(authLookupErr)) {
      workoutsTableMissing = true;
    } else {
      const authMirrorPayload = {
        client_id: targetClientId,
        day_key: 'client_auth',
        workout_data: {
          ...updatedRecord,
          syncedToSupabase: true,
        },
        updated_at: nowIso,
      };

      const mirrorRes = existingAuthRow
        ? await supabase.from('workouts').update(authMirrorPayload).eq('id', authMirrorId)
        : await supabase.from('workouts').insert({ id: authMirrorId, ...authMirrorPayload });

      if (isMissingTableError(mirrorRes.error) || isMissingTableErrShared(mirrorRes.error)) {
        workoutsTableMissing = true;
      } else {
        mirrorErr = mirrorRes.error;
      }
    }

    const clientsSaved = !clientsTableMissing && !clientsErr;
    const workoutsSaved = !workoutsTableMissing && !mirrorErr;
    const syncedToSupabase = subscribersSynced || clientsSaved || workoutsSaved;

    if (!syncedToSupabase) {
      if (subscribersTableMissing && clientsTableMissing && workoutsTableMissing) {
        return {
          success: false,
          syncedToSupabase: false,
          error:
            'لم يتم العثور على جداول قاعدة البيانات (subscribers / clients / workouts) في Supabase. افتح تبويب (قاعدة البيانات و Supabase) واضغط (نسخ كود SQL لتهيئة الجداول) وشغّله في Supabase SQL Editor.',
        };
      }
      const rawErr =
        (!subscribersTableMissing && subscribersErr) ||
        (!clientsTableMissing && clientsErr) ||
        (!workoutsTableMissing && mirrorErr) ||
        subscribersErr ||
        clientsErr ||
        mirrorErr;
      return {
        success: false,
        syncedToSupabase: false,
        error: rawErr
          ? formatSupabaseErrorMessage(rawErr)
          : 'تعذر حفظ الحساب في قاعدة البيانات السحابية Supabase.',
      };
    }

    updatedRecord.syncedToSupabase = true;
    const latest = [...subscribersMemoryCache];
    const idx = latest.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (idx >= 0) latest[idx] = updatedRecord;
    else latest.unshift(updatedRecord);
    saveSubscribersList(latest);

    return { success: true, syncedToSupabase: true, record: updatedRecord };
  } catch (syncErr) {
    console.warn('Supabase cloud credentials sync error:', syncErr);
    return {
      success: false,
      syncedToSupabase: false,
      error: formatSupabaseErrorMessage(syncErr),
    };
  }
}

/**
 * Ensures a subscriber has an isolated, non-guessable access_token persisted in Supabase
 * without touching or overwriting any other subscriber or existing token.
 */
export async function ensureSubscriberAccessToken(user: {
  id?: string;
  email: string;
  accessToken?: string;
  clientName?: string;
  plan?: SubscriptionPlanTier;
  password?: string;
  clientCode?: string;
}): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  const cleanEmail = (user.email || '').trim().toLowerCase();
  const cachedUser = subscribersMemoryCache.find((u) => u.email.toLowerCase() === cleanEmail);
  const existingToken = (user.accessToken || cachedUser?.accessToken || '').trim();
  if (existingToken) {
    return { success: true, accessToken: existingToken };
  }

  const supabase = getSupabaseClient();
  if (!supabase || !cleanEmail) {
    return {
      success: false,
      error: 'قاعدة البيانات السحابية Supabase غير متصلة لتوليد رابط المشترك.',
    };
  }

  try {
    // 1. Check live Supabase first in case another device/SQL backfill already generated it
    const [{ data: subRow }, { data: clientRow }] = await Promise.all([
      supabase.from('subscribers').select('id, access_token').ilike('email', cleanEmail).limit(1).maybeSingle(),
      supabase.from('clients').select('id, access_token').ilike('email', cleanEmail).limit(1).maybeSingle(),
    ]);

    const liveToken =
      (subRow && typeof (subRow as Record<string, unknown>).access_token === 'string'
        ? String((subRow as Record<string, unknown>).access_token).trim()
        : '') ||
      (clientRow && typeof (clientRow as Record<string, unknown>).access_token === 'string'
        ? String((clientRow as Record<string, unknown>).access_token).trim()
        : '');

    if (liveToken) {
      const updatedList = subscribersMemoryCache.map((u) =>
        u.email.toLowerCase() === cleanEmail ? { ...u, accessToken: liveToken } : u
      );
      saveSubscribersList(updatedList);
      return { success: true, accessToken: liveToken };
    }

    // 2. Mint a fresh isolated token and persist strictly on this subscriber's rows
    const mintedToken = generateSecureAccessToken();
    const nowIso = new Date().toISOString();

    const [subUpd, clientUpd] = await Promise.all([
      supabase.from('subscribers').update({ access_token: mintedToken, updated_at: nowIso }).ilike('email', cleanEmail),
      supabase.from('clients').update({ access_token: mintedToken }).ilike('email', cleanEmail),
    ]);

    const hardSubErr =
      subUpd.error && !isMissingTableError(subUpd.error) && !isMissingColumnError(subUpd.error)
        ? subUpd.error
        : null;
    const hardClientErr =
      clientUpd.error && !isMissingTableError(clientUpd.error) && !isMissingColumnError(clientUpd.error)
        ? clientUpd.error
        : null;

    if (hardSubErr && hardClientErr) {
      return { success: false, error: formatSupabaseErrorMessage(hardSubErr) };
    }

    // Also update client_auth mirror if present
    try {
      const { data: authMirror } = await supabase
        .from('workouts')
        .select('id, workout_data')
        .eq('id', `auth_${cleanEmail}`)
        .maybeSingle();

      if (authMirror && authMirror.workout_data) {
        const wData = authMirror.workout_data as Record<string, unknown>;
        await supabase
          .from('workouts')
          .update({
            workout_data: { ...wData, accessToken: mintedToken, updatedAt: nowIso },
            updated_at: nowIso,
          })
          .eq('id', `auth_${cleanEmail}`);
      }
    } catch {
      // ignore if workouts mirror is absent
    }

    const updatedList = subscribersMemoryCache.map((u) =>
      u.email.toLowerCase() === cleanEmail ? { ...u, accessToken: mintedToken } : u
    );
    saveSubscribersList(updatedList);
    return { success: true, accessToken: mintedToken };
  } catch (err) {
    return { success: false, error: formatSupabaseErrorMessage(err) };
  }
}

/**
 * Authenticates an isolated subscriber portal `/s/:token` strictly by exact `access_token` match in Supabase.
 * Never falls back to any default/first subscriber row.
 */
export async function authenticateByAccessToken(token: string): Promise<{
  success: boolean;
  role: Role;
  id?: string;
  email: string;
  name: string;
  plan: SubscriptionPlanTier;
  clientCode?: string;
  phone?: string;
  accessToken?: string;
  status?: UserCredentialRecord['status'];
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  error?: string;
}> {
  const cleanToken = (token || '').trim();
  if (!cleanToken || cleanToken.length < 8) {
    return {
      success: false,
      role: 'client',
      email: '',
      name: 'مشترك',
      plan: 'standard',
      error: 'رابط الدخول الخاص غير صالح.',
    };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      role: 'client',
      email: '',
      name: 'مشترك',
      plan: 'standard',
      error: 'قاعدة البيانات السحابية Supabase غير متصلة حالياً.',
    };
  }

  try {
    let matchedRecord: UserCredentialRecord | null = null;

    // 1. Primary lookup in `subscribers` by exact access_token
    const { data: subRow, error: subErr } = await supabase
      .from('subscribers')
      .select('*')
      .eq('access_token', cleanToken)
      .limit(1)
      .maybeSingle();

    if (!subErr && subRow) {
      matchedRecord = mapSubscribersRowToRecord(subRow as Record<string, unknown>);
    }

    // 2. Lookup in `clients` by exact access_token if not found yet
    if (!matchedRecord) {
      const { data: clientRow, error: clientErr } = await supabase
        .from('clients')
        .select('*')
        .eq('access_token', cleanToken)
        .limit(1)
        .maybeSingle();

      if (!clientErr && clientRow) {
        const cRow = clientRow as Record<string, unknown>;
        matchedRecord = mapSubscribersRowToRecord({
          ...cRow,
          passcode: cRow.assigned_password ?? cRow.client_code,
          tier: cRow.subscription_plan ?? cRow.package_type_en,
          name: cRow.name_ar ?? cRow.name_en,
          goals: cRow.visual_goal,
          access_token: cRow.access_token,
        });
      }
    }

    // 3. Fallback strict filter inside `workouts(day_key='client_auth')`
    if (!matchedRecord) {
      const { data: authRows, error: authErr } = await supabase
        .from('workouts')
        .select('*')
        .eq('day_key', 'client_auth');

      if (!authErr && Array.isArray(authRows)) {
        for (const row of authRows as Array<Record<string, unknown>>) {
          const w = (row.workout_data || {}) as Record<string, unknown>;
          const rowToken = typeof w.accessToken === 'string' ? w.accessToken.trim() : '';
          if (rowToken && rowToken === cleanToken && typeof w.email === 'string') {
            matchedRecord = {
              id: w.id ? String(w.id) : row.client_id ? String(row.client_id) : undefined,
              email: w.email.trim().toLowerCase(),
              password: w.password ? String(w.password) : 'OAO-2026',
              clientName: String(w.clientName || 'مشترك'),
              clientCode: w.clientCode ? String(w.clientCode) : undefined,
              accessToken: rowToken,
              plan: normalizeSubscriptionPlan(w.plan as string),
              phone: w.phone ? String(w.phone) : undefined,
              status: (w.status as UserCredentialRecord['status']) || 'active',
              subscriptionStartDate:
                normalizeIsoDateOnly(w.subscriptionStartDate as string) || undefined,
              subscriptionEndDate:
                normalizeIsoDateOnly(w.subscriptionEndDate as string) || undefined,
              createdAt: String(w.createdAt || new Date().toISOString()),
              updatedAt: String(w.updatedAt || new Date().toISOString()),
              assignedByCoach: true,
              syncedToSupabase: true,
            };
            break;
          }
        }
      }
    }

    if (!matchedRecord) {
      return {
        success: false,
        role: 'client',
        email: '',
        name: 'مشترك',
        plan: 'standard',
        error: 'الرابط الخاص غير صالح أو تم إلغاء تفعيل الحساب.',
      };
    }

    if (matchedRecord.status === 'suspended') {
      return {
        success: false,
        role: 'client',
        id: matchedRecord.id,
        email: matchedRecord.email,
        name: matchedRecord.clientName,
        plan: matchedRecord.plan,
        status: 'suspended',
        error: 'تم تعليق هذا الحساب مؤقتاً من قبل الكوتش. يرجى التواصل مع الإدارة.',
      };
    }

    return {
      success: true,
      role: 'client',
      id: matchedRecord.id,
      email: matchedRecord.email,
      name: matchedRecord.clientName,
      plan: matchedRecord.plan,
      clientCode: matchedRecord.clientCode,
      phone: matchedRecord.phone,
      accessToken: matchedRecord.accessToken || cleanToken,
      status: matchedRecord.status,
      subscriptionStartDate: matchedRecord.subscriptionStartDate,
      subscriptionEndDate: matchedRecord.subscriptionEndDate,
    };
  } catch (err) {
    return {
      success: false,
      role: 'client',
      email: '',
      name: 'مشترك',
      plan: 'standard',
      error: formatSupabaseErrorMessage(err),
    };
  }
}

/**
 * Permanently deletes a subscriber cascading through subscribers, clients, declarations, workouts, notes, profiles,
 * and ai_generation_logs in Supabase. Verifies post-delete removal so silent RLS 0-row blocks never pretend success.
 */
export async function deleteSubscriberRecord(
  target: string | { email: string; id?: string; accessToken?: string }
): Promise<{ success: boolean; error?: string }> {
  const rawEmail = typeof target === 'string' ? target : target.email;
  const cleanEmail = (rawEmail || '').trim().toLowerCase();
  const targetUser = subscribersMemoryCache.find((u) => u.email.toLowerCase() === cleanEmail);
  const explicitId = typeof target === 'string' ? targetUser?.id : target.id || targetUser?.id;
  const explicitToken =
    typeof target === 'string' ? targetUser?.accessToken : target.accessToken || targetUser?.accessToken;

  if (!cleanEmail && !explicitId && !explicitToken) {
    return { success: false, error: 'تعذر تحديد المشترك المطلوب حذفه.' };
  }

  if (typeof window !== 'undefined') {
    try {
      const proxyRes = await fetch('/api/admin/subscribers', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...getCoachAuthHeaders() },
        body: JSON.stringify({ email: cleanEmail, id: explicitId, accessToken: explicitToken }),
      });
      if (proxyRes.status === 401) {
        const errJson = (await proxyRes.json().catch(() => ({}))) as { error?: string };
        const msg = errJson.error || 'انتهت جلسة الكوتش أو غير مصرح بالوصول. يرجى تسجيل الدخول مجدداً.';
        handleCoachUnauthorizedResponse(msg);
        return { success: false, error: msg };
      }
      if (proxyRes.ok) {
        const filtered = subscribersMemoryCache.filter((u) => u.email.toLowerCase() !== cleanEmail);
        saveSubscribersList(filtered);
        return { success: true };
      }
      if (proxyRes.status !== 404 && proxyRes.status !== 405 && proxyRes.status !== 501) {
        const errJson = (await proxyRes.json().catch(() => ({}))) as { error?: string; fallbackToClient?: boolean };
        if (!errJson.fallbackToClient) {
          return {
            success: false,
            error: errJson.error ? formatSupabaseErrorMessage(errJson.error) : 'تعذر حذف المشترك من الخادم.',
          };
        }
      }
    } catch {
      // Static hosting (Cloudflare Pages) or offline proxy -> proceed directly via Supabase client
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, error: 'قاعدة البيانات السحابية Supabase غير متصلة.' };
  }

  try {
    // 1. Gather all matching rows & candidate keys before deletion
    const candidateIds = new Set<string>();
    const candidateEmails = new Set<string>();
    if (cleanEmail) candidateEmails.add(cleanEmail);
    if (explicitId) candidateIds.add(String(explicitId));

    const [subRowsRes, clientRowsRes] = await Promise.all([
      cleanEmail
        ? supabase.from('subscribers').select('id, email').ilike('email', cleanEmail)
        : explicitId
        ? supabase.from('subscribers').select('id, email').eq('id', explicitId)
        : Promise.resolve({ data: null, error: null }),
      cleanEmail
        ? supabase.from('clients').select('id, email').ilike('email', cleanEmail)
        : explicitId
        ? supabase.from('clients').select('id, email').eq('id', explicitId)
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (Array.isArray(subRowsRes.data)) {
      for (const r of subRowsRes.data as Array<Record<string, unknown>>) {
        if (r.id !== undefined && r.id !== null) candidateIds.add(String(r.id));
        if (typeof r.email === 'string' && r.email.trim()) candidateEmails.add(r.email.trim().toLowerCase());
      }
    }
    if (Array.isArray(clientRowsRes.data)) {
      for (const r of clientRowsRes.data as Array<Record<string, unknown>>) {
        if (r.id !== undefined && r.id !== null) candidateIds.add(String(r.id));
        if (typeof r.email === 'string' && r.email.trim()) candidateEmails.add(r.email.trim().toLowerCase());
      }
    }

    const candidateKeys = Array.from(new Set([...candidateIds, ...candidateEmails]));
    const errors: string[] = [];

    const checkDeleteErr = (err: { code?: string; message?: string } | null | undefined) => {
      if (!err) return;
      if (isMissingTableError(err) || isMissingTableErrShared(err) || isMissingColumnError(err)) return;
      errors.push(formatSupabaseErrorMessage(err));
    };

    // 2. Delete child records first (avoid FK constraint violations)
    for (const em of candidateEmails) {
      const [wAuthRes, notesEmailRes, declRes] = await Promise.all([
        supabase.from('workouts').delete().eq('id', `auth_${em}`),
        supabase.from('notes').delete().ilike('client_email', em),
        supabase.from('declarations').delete().ilike('email', em),
      ]);
      checkDeleteErr(wAuthRes.error);
      checkDeleteErr(notesEmailRes.error);
      checkDeleteErr(declRes.error);
    }

    for (const k of candidateKeys) {
      const childOps = await Promise.all([
        supabase.from('notes').delete().eq('client_id', k),
        supabase.from('workouts').delete().eq('client_id', k),
        supabase.from('workouts').delete().eq('id', `workouts_${k}`),
        supabase.from('workouts').delete().eq('id', `nutrition_${k}`),
        supabase.from('workouts').delete().eq('id', `assessment_${k}`),
        supabase.from('workouts').delete().eq('id', `profile_ext_${k}`),
        supabase.from('ai_generation_logs').delete().eq('client_id', k),
        supabase.from('profiles').delete().eq('id', k),
      ]);
      for (const op of childOps) checkDeleteErr(op.error);
    }

    // 3. Delete parent rows from `subscribers` and `clients`
    for (const em of candidateEmails) {
      const [subDel, clientDel] = await Promise.all([
        supabase.from('subscribers').delete().ilike('email', em),
        supabase.from('clients').delete().ilike('email', em),
      ]);
      checkDeleteErr(subDel.error);
      checkDeleteErr(clientDel.error);
    }

    for (const idVal of candidateIds) {
      const [subById, clientById] = await Promise.all([
        supabase.from('subscribers').delete().eq('id', idVal),
        supabase.from('clients').delete().eq('id', idVal),
      ]);
      checkDeleteErr(subById.error);
      checkDeleteErr(clientById.error);
    }

    if (explicitToken) {
      const [subByTok, clientByTok] = await Promise.all([
        supabase.from('subscribers').delete().eq('access_token', explicitToken),
        supabase.from('clients').delete().eq('access_token', explicitToken),
      ]);
      checkDeleteErr(subByTok.error);
      checkDeleteErr(clientByTok.error);
    }

    // 4. Verify rows are genuinely gone in Supabase (catches silent RLS 0-row blocks)
    const [verifySub, verifyClient] = await Promise.all([
      cleanEmail
        ? supabase.from('subscribers').select('id').ilike('email', cleanEmail).limit(1)
        : Promise.resolve({ data: [], error: null }),
      cleanEmail
        ? supabase.from('clients').select('id').ilike('email', cleanEmail).limit(1)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const stillInSubscribers =
      !verifySub.error && Array.isArray(verifySub.data) && verifySub.data.length > 0;
    const stillInClients =
      !verifyClient.error && Array.isArray(verifyClient.data) && verifyClient.data.length > 0;

    if (errors.length > 0 || stillInSubscribers || stillInClients) {
      return {
        success: false,
        error:
          errors[0] ||
          'لم يتم حذف سجل المشترك من Supabase (تحقق من صلاحيات الحذف RLS Policy في جدول subscribers / clients).',
      };
    }

    const filtered = subscribersMemoryCache.filter((u) => {
      if (cleanEmail && u.email.toLowerCase() === cleanEmail) return false;
      if (explicitId && u.id === explicitId) return false;
      return true;
    });
    saveSubscribersList(filtered);
    return { success: true };
  } catch (e) {
    console.warn('Supabase delete subscriber error:', e);
    return { success: false, error: formatSupabaseErrorMessage(e) };
  }
}

/**
 * Toggles a subscriber status between 'active' and 'suspended' and syncs directly to Supabase `subscribers`, `clients`, and `workouts`.
 */
export function toggleSubscriberStatus(email: string): 'active' | 'suspended' {
  const cleanEmail = email.trim().toLowerCase();
  const all = [...subscribersMemoryCache];
  const idx = all.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (idx < 0) return 'active';

  const newStatus = all[idx].status === 'suspended' ? 'active' : 'suspended';
  all[idx] = {
    ...all[idx],
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
  const updatedRec = { ...all[idx] };
  saveSubscribersList(all);

  const supabase = getSupabaseClient();
  void (async () => {
    try {
      if (typeof window !== 'undefined') {
        const proxyRes = await fetch('/api/admin/subscribers/flags', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...getCoachAuthHeaders() },
          body: JSON.stringify({ email: cleanEmail, status: newStatus, updatedRecord: updatedRec }),
        });
        if (proxyRes.status === 401) {
          handleCoachUnauthorizedResponse('انتهت جلسة الكوتش أو غير مصرح بالوصول. يرجى تسجيل الدخول مجدداً.');
          return;
        }
        if (proxyRes.ok) return;
      }
    } catch {
      // fall through
    }
    if (!supabase) return;
    try {
      await supabase.from('subscribers').update({ status: newStatus }).ilike('email', cleanEmail);
      await supabase.from('clients').update({ status: newStatus }).ilike('email', cleanEmail);
      await supabase.from('workouts').upsert(
        {
          id: `auth_${cleanEmail}`,
          client_id: updatedRec.id || cleanEmail,
          day_key: 'client_auth',
          workout_data: updatedRec,
          updated_at: updatedRec.updatedAt,
        },
        { onConflict: 'id' }
      );
    } catch {
      // ignore
    }
  })();

  return newStatus;
}

/**
 * Toggles a subscriber nutrition plan access lock and syncs directly to Supabase `subscribers`, `clients`, and `workouts`.
 */
export function toggleSubscriberNutritionLock(email: string, locked?: boolean): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const all = [...subscribersMemoryCache];
  const idx = all.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (idx < 0) return false;

  const currentVal = all[idx].nutritionPlanLocked || false;
  const newVal = locked !== undefined ? locked : !currentVal;
  all[idx] = {
    ...all[idx],
    nutritionPlanLocked: newVal,
    updatedAt: new Date().toISOString(),
  };
  const updatedRec = { ...all[idx] };
  saveSubscribersList(all);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('oao_nutrition_lock_updated', { detail: { email: cleanEmail, locked: newVal } })
    );
  }

  const supabase = getSupabaseClient();
  void (async () => {
    try {
      if (typeof window !== 'undefined') {
        const proxyRes = await fetch('/api/admin/subscribers/flags', {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...getCoachAuthHeaders() },
          body: JSON.stringify({ email: cleanEmail, nutritionPlanLocked: newVal, updatedRecord: updatedRec }),
        });
        if (proxyRes.status === 401) {
          handleCoachUnauthorizedResponse('انتهت جلسة الكوتش أو غير مصرح بالوصول. يرجى تسجيل الدخول مجدداً.');
          return;
        }
        if (proxyRes.ok) return;
      }
    } catch {
      // fall through
    }
    if (!supabase) return;
    try {
      await supabase
        .from('subscribers')
        .update({ nutrition_plan_locked: newVal })
        .ilike('email', cleanEmail);
      await supabase
        .from('clients')
        .update({ nutrition_plan_locked: newVal })
        .ilike('email', cleanEmail);
      await supabase.from('workouts').upsert(
        {
          id: `auth_${cleanEmail}`,
          client_id: updatedRec.id || cleanEmail,
          day_key: 'client_auth',
          workout_data: updatedRec,
          updated_at: updatedRec.updatedAt,
        },
        { onConflict: 'id' }
      );
    } catch {
      // ignore
    }
  })();

  return newVal;
}

/**
 * Fast memory check for nutrition lock state (populated from Supabase)
 */
export function isSubscriberNutritionLocked(email?: string): boolean {
  if (globalNutritionLockMemoryCache) return true;
  const checkEmail = (email || getCurrentUserSession()?.email || '').trim().toLowerCase();
  if (!checkEmail) return false;
  const matched = subscribersMemoryCache.find((u) => u.email.toLowerCase() === checkEmail);
  return Boolean(matched?.nutritionPlanLocked);
}

/**
 * Fetch authoritative nutrition lock state from Supabase (global + per-client)
 */
export async function fetchSubscriberNutritionLockFromSupabase(
  clientId?: string | null,
  email?: string | null
): Promise<boolean> {
  const cleanEmail = (email || '').trim().toLowerCase();
  const supabase = getSupabaseClient();
  if (!supabase) return isSubscriberNutritionLocked(cleanEmail);

  try {
    const [globalRes, subRes, clientRes, mirrorRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('workout_data')
        .eq('id', 'global_nutrition_lock')
        .maybeSingle(),
      cleanEmail
        ? supabase
            .from('subscribers')
            .select('nutrition_plan_locked')
            .ilike('email', cleanEmail)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      cleanEmail
        ? supabase
            .from('clients')
            .select('nutrition_plan_locked')
            .ilike('email', cleanEmail)
            .limit(1)
            .maybeSingle()
        : clientId
        ? supabase
            .from('clients')
            .select('nutrition_plan_locked')
            .eq('id', clientId)
            .limit(1)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      cleanEmail
        ? supabase
            .from('workouts')
            .select('workout_data')
            .eq('id', `auth_${cleanEmail}`)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    const globalLocked = Boolean(
      !globalRes.error &&
        globalRes.data &&
        ((globalRes.data as Record<string, unknown>).workout_data as { locked?: boolean } | undefined)?.locked
    );
    const subRowLocked = Boolean(
      !subRes.error &&
        subRes.data &&
        (subRes.data as Record<string, unknown>).nutrition_plan_locked
    );
    const clientRowLocked = Boolean(
      !clientRes.error &&
        clientRes.data &&
        (clientRes.data as Record<string, unknown>).nutrition_plan_locked
    );
    const mirrorLocked = Boolean(
      !mirrorRes.error &&
        mirrorRes.data &&
        ((mirrorRes.data as Record<string, unknown>).workout_data as { nutritionPlanLocked?: boolean } | undefined)
          ?.nutritionPlanLocked
    );

    globalNutritionLockMemoryCache = globalLocked;
    return globalLocked || subRowLocked || clientRowLocked || mirrorLocked;
  } catch {
    return isSubscriberNutritionLocked(cleanEmail);
  }
}

/**
 * Authenticates user by Email + Passcode/Password OR by Passcode / Client Code.
 * Queries live Supabase `subscribers`, `clients`, `workouts(client_auth)`, and `declarations` directly
 * so manually created accounts work permanently across devices and after clearing browser cache.
 */
export async function authenticateUser(
  identifier: string,
  password?: string
): Promise<{
  success: boolean;
  role: Role;
  id?: string;
  email: string;
  name: string;
  plan: SubscriptionPlanTier;
  clientCode?: string;
  phone?: string;
  accessToken?: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  status?: UserCredentialRecord['status'];
  error?: string;
}> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: false,
      role: 'client',
      email: cleanId,
      name: 'مشترك',
      plan: 'standard',
      error: 'قاعدة البيانات السحابية Supabase غير متصلة حالياً. يرجى المحاولة لاحقاً أو التواصل مع الكوتش.',
    };
  }

  // Always query live subscriber directory directly from Supabase (`subscribers` + `clients` + `client_auth`)
  const all = await fetchSubscribersFromSupabase();

  // Also run a direct targeted query against `public.subscribers` and `public.clients` for immediate fresh validation
  let directSubRecord: UserCredentialRecord | null = null;
  try {
    const directRes = cleanPass
      ? await supabase.from('subscribers').select('*').ilike('email', cleanId).limit(1).maybeSingle()
      : await supabase
          .from('subscribers')
          .select('*')
          .or(`email.ilike.${cleanId},passcode.ilike.${cleanId},client_code.ilike.${cleanId}`)
          .limit(1)
          .maybeSingle();

    if (!directRes.error && directRes.data) {
      directSubRecord = mapSubscribersRowToRecord(directRes.data as Record<string, unknown>);
    } else if (directRes.error && !cleanPass && !isMissingTableError(directRes.error)) {
      const fallbackRes = await supabase
        .from('subscribers')
        .select('*')
        .or(`email.ilike.${cleanId},passcode.ilike.${cleanId}`)
        .limit(1)
        .maybeSingle();
      if (!fallbackRes.error && fallbackRes.data) {
        directSubRecord = mapSubscribersRowToRecord(fallbackRes.data as Record<string, unknown>);
      }
    }
  } catch {
    // ignore transient failure; check `clients` next
  }

  if (!directSubRecord) {
    try {
      let directClientRes = cleanPass
        ? await supabase.from('clients').select('*').ilike('email', cleanId).limit(1).maybeSingle()
        : await supabase
            .from('clients')
            .select('*')
            .or(`email.ilike.${cleanId},assigned_password.ilike.${cleanId},client_code.ilike.${cleanId}`)
            .limit(1)
            .maybeSingle();

      if (directClientRes.error && !cleanPass && isMissingColumnError(directClientRes.error)) {
        directClientRes = await supabase
          .from('clients')
          .select('*')
          .or(`email.ilike.${cleanId},client_code.ilike.${cleanId}`)
          .limit(1)
          .maybeSingle();
      }

      if (!directClientRes.error && directClientRes.data) {
        const cRow = directClientRes.data as Record<string, unknown>;
        directSubRecord = mapSubscribersRowToRecord({
          ...cRow,
          passcode: cRow.assigned_password ?? cRow.client_code,
          tier: cRow.subscription_plan ?? cRow.package_type_en,
          name: cRow.name_ar ?? cRow.name_en,
          goals: cRow.visual_goal,
        });
      }
    } catch {
      // fall back to `all` hydrated above
    }
  }

  // 1. Credentials mode (Email + Passcode/Password) or direct email lookup
  const matchedByEmail =
    (directSubRecord && directSubRecord.email === cleanId ? directSubRecord : null) ||
    all.find((u) => u.email.trim().toLowerCase() === cleanId);

  if (matchedByEmail) {
    if (matchedByEmail.status === 'suspended') {
      return {
        success: false,
        role: 'client',
        id: matchedByEmail.id,
        email: matchedByEmail.email,
        name: matchedByEmail.clientName,
        plan: matchedByEmail.plan,
        error: 'تم تعليق هذا الحساب مؤقتاً من قبل الكوتش. يرجى التواصل مع الإدارة.',
      };
    }
    if (!cleanPass) {
      return {
        success: false,
        role: 'client',
        id: matchedByEmail.id,
        email: matchedByEmail.email,
        name: matchedByEmail.clientName,
        plan: matchedByEmail.plan,
        error: 'يرجى إدخال رمز الدخول / كلمة المرور المخصصة لحسابك في تبويب (إيميل + كلمة المرور).',
      };
    }
    const storedPass = matchedByEmail.password.trim();
    const storedCode = (matchedByEmail.clientCode || '').trim();
    if (
      storedPass === cleanPass ||
      storedPass.toLowerCase() === cleanPass.toLowerCase() ||
      (storedCode && storedCode.toLowerCase() === cleanPass.toLowerCase())
    ) {
      return {
        success: true,
        role: 'client',
        id: matchedByEmail.id,
        email: matchedByEmail.email,
        name: matchedByEmail.clientName,
        plan: matchedByEmail.plan,
        clientCode: matchedByEmail.clientCode,
        phone: matchedByEmail.phone,
        accessToken: matchedByEmail.accessToken,
        subscriptionStartDate: matchedByEmail.subscriptionStartDate,
        subscriptionEndDate: matchedByEmail.subscriptionEndDate,
        status: matchedByEmail.status,
      };
    }
    return {
      success: false,
      role: 'client',
      id: matchedByEmail.id,
      email: matchedByEmail.email,
      name: matchedByEmail.clientName,
      plan: matchedByEmail.plan,
      error: 'كلمة المرور أو رمز الدخول غير صحيح، يرجى التحقق أو التواصل مع الكوتش.',
    };
  }

  // 2. Passcode mode: match `passcode` / `password` OR `clientCode` directly from Supabase `subscribers` / `clients`
  if (!cleanPass) {
    const matchedByCodeOrPass =
      directSubRecord ||
      all.find((u) => {
        const codeMatch = u.clientCode && u.clientCode.trim().toLowerCase() === cleanId;
        const passMatch = u.password && u.password.trim().toLowerCase() === cleanId;
        return Boolean(codeMatch || passMatch);
      });

    if (matchedByCodeOrPass) {
      if (matchedByCodeOrPass.status === 'suspended') {
        return {
          success: false,
          role: 'client',
          id: matchedByCodeOrPass.id,
          email: matchedByCodeOrPass.email,
          name: matchedByCodeOrPass.clientName,
          plan: matchedByCodeOrPass.plan,
          error: 'تم تعليق هذا الحساب مؤقتاً من قبل الكوتش. يرجى التواصل مع الإدارة.',
        };
      }
      return {
        success: true,
        role: 'client',
        id: matchedByCodeOrPass.id,
        email: matchedByCodeOrPass.email,
        name: matchedByCodeOrPass.clientName,
        plan: matchedByCodeOrPass.plan,
        clientCode: matchedByCodeOrPass.clientCode,
        phone: matchedByCodeOrPass.phone,
        accessToken: matchedByCodeOrPass.accessToken,
        subscriptionStartDate: matchedByCodeOrPass.subscriptionStartDate,
        subscriptionEndDate: matchedByCodeOrPass.subscriptionEndDate,
        status: matchedByCodeOrPass.status,
      };
    }
  }

  // 3. Check signed declarations in Supabase `public.declarations` (by contract ID only in passcode mode)
  if (!cleanPass) {
    try {
      const { data: declRow } = await supabase
        .from('declarations')
        .select('*')
        .ilike('id', cleanId)
        .limit(1)
        .maybeSingle();

      if (declRow) {
        const d = declRow as Record<string, unknown>;
        const declEmail = typeof d.email === 'string' ? d.email.trim().toLowerCase() : `${cleanId}@oao.athlete`;
        const linkedSub = all.find((u) => u.email.trim().toLowerCase() === declEmail);
        if (linkedSub?.status === 'suspended') {
          return {
            success: false,
            role: 'client',
            id: linkedSub.id,
            email: linkedSub.email,
            name: linkedSub.clientName,
            plan: linkedSub.plan,
            error: 'تم تعليق هذا الحساب مؤقتاً من قبل الكوتش. يرجى التواصل مع الإدارة.',
          };
        }
        return {
          success: true,
          role: 'client',
          id: linkedSub?.id || declEmail,
          email: declEmail,
          name: linkedSub?.clientName || (typeof d.full_name === 'string' ? d.full_name : 'مشترك معتمد'),
          plan: linkedSub?.plan || normalizeSubscriptionPlan((d.subscription_plan as string) || (d.plan_id as string)),
          clientCode: linkedSub?.clientCode,
          phone: linkedSub?.phone || (typeof d.phone_whatsapp === 'string' ? d.phone_whatsapp : undefined),
          accessToken: linkedSub?.accessToken,
        };
      }
    } catch {
      // ignore query failure
    }
  }

  return {
    success: false,
    role: 'client',
    email: cleanId,
    name: 'مشترك',
    plan: 'standard',
    error: 'بيانات الدخول غير صحيحة أو غير مسجلة في Supabase. يرجى التحقق من البريد أو رمز الدخول أو التواصل مع الكوتش.',
  };
}

/**
 * Generates ready-to-send WhatsApp formatted message for the Coach to share with a subscriber
 */
export function generateWhatsAppWelcomeMessage(options: {
  clientName: string;
  email: string;
  password?: string;
  plan: SubscriptionPlanTier;
  clientCode?: string;
  phone?: string;
  accessToken?: string;
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oao-portal.com';
  const planNameAr = options.plan === 'VIP' ? 'الباقة البلاتينية النخبوية (VIP)' : 'الباقة القياسية (Standard)';
  const portalUrl = options.accessToken ? `${origin}/s/${options.accessToken}` : origin;

  return `مرحباً يا بطل ${options.clientName} 👋
يسعدنا انضمامك إلى منصة OAO التدريبية تحت إشراف الكوتش عمر عدنان! 🏋️‍♂️🔥

📋 بيانات دخول حسابك المعتمد:
🔗 رابط حسابك الخاص المباشر: ${portalUrl}
📧 البريد الإلكتروني: ${options.email}
🔑 كلمة المرور: ${options.password || 'oao-vip-2026'}
${options.clientCode ? `🏷️ رمز الاشتراك البديل: ${options.clientCode}\n` : ''}💎 نوع الباقة: ${planNameAr}

💡 توجيهات سريعة:
1. افتح رابط حسابك الخاص أعلاه للدخول مباشرة إلى لوحتك التدريبية المعزولة.
2. ستجد جدولك التدريبي المخصص ونظامك الغذائي ومتابعة مؤشراتك الحيوية.
3. يمكنك التواصل مباشرة مع الكوتش من صندوق الاستفسارات داخل حسابك.

نتمنى لك رحلة تدريبية ملهمة لتحقيق أهدافك بأعلى مستوى! 🚀💪`;
}
