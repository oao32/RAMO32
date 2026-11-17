import { Role, SubscriptionPlanTier } from '../types';
import {
  formatSupabaseErrorMessage,
  getSupabaseClient,
  isCoachIdConstraintError,
  normalizeSubscriptionPlan,
  writeClientRowSafely,
} from './supabase';

export interface UserCredentialRecord {
  id?: string;
  email: string;
  password: string;
  clientName: string;
  clientCode?: string;
  plan: SubscriptionPlanTier;
  phone?: string;
  status: 'active' | 'suspended' | 'expiring' | 'expired';
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
}

const COACH_AUTH_SESSION_KEY = 'oao_coach_authenticated';
const USER_SESSION_STORAGE_KEY = 'oao_current_user_session';

// In-memory directory caches hydrated strictly from Supabase (Zero localStorage)
let subscribersMemoryCache: UserCredentialRecord[] = [];
let globalNutritionLockMemoryCache = false;

export function isCoachAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(COACH_AUTH_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setCoachAuthenticated(authenticated: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (authenticated) {
      sessionStorage.setItem(COACH_AUTH_SESSION_KEY, 'true');
    } else {
      sessionStorage.removeItem(COACH_AUTH_SESSION_KEY);
    }
  } catch {
    // ignore storage errors
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
  setCoachAuthenticated(false);
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
    plan: normalizeSubscriptionPlan(typeof rawTier === 'string' ? rawTier : undefined),
    phone: row.phone ? String(row.phone) : undefined,
    status: (row.status as UserCredentialRecord['status']) || 'active',
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

    const [clientsRes, authMirrorsRes] = await Promise.all([
      supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false }),
      supabase
        .from('workouts')
        .select('*')
        .eq('day_key', 'client_auth'),
    ]);

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
          if (!mapped.phone && mirror.phone) mapped.phone = String(mirror.phone);
          if (!mapped.age && mirror.age) mapped.age = Number(mirror.age);
          if (!mapped.bloodType && mirror.bloodType) mapped.bloodType = String(mirror.bloodType);
          if (!mapped.visualGoal && mirror.visualGoal) mapped.visualGoal = String(mirror.visualGoal);
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

        if (existingSub) {
          if (!existingSub.phone && row.phone) existingSub.phone = String(row.phone);
          if (!existingSub.clientCode && row.client_code) existingSub.clientCode = String(row.client_code);
          if (!existingSub.visualGoal && row.visual_goal) existingSub.visualGoal = String(row.visual_goal);
          if (!existingSub.age && row.age !== null && row.age !== undefined) existingSub.age = Number(row.age);
          if (!existingSub.bloodType && row.blood_type) existingSub.bloodType = String(row.blood_type);
          continue;
        }

        const record: UserCredentialRecord = {
          id: row.id ? String(row.id) : mirror?.id ? String(mirror.id) : undefined,
          email: cleanEmail,
          password: row.assigned_password
            ? String(row.assigned_password)
            : mirror?.password
            ? String(mirror.password)
            : 'OAO-2026',
          clientName: String(row.name_ar || row.name_en || mirror?.clientName || 'مشترك'),
          clientCode: row.client_code
            ? String(row.client_code)
            : mirror?.clientCode
            ? String(mirror.clientCode)
            : undefined,
          plan: normalizeSubscriptionPlan(
            (row.subscription_plan as string) || (mirror?.plan as string)
          ),
          phone: row.phone ? String(row.phone) : mirror?.phone ? String(mirror.phone) : undefined,
          status:
            ((row.status || mirror?.status) as UserCredentialRecord['status']) || 'active',
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
          plan: normalizeSubscriptionPlan(mirror.plan as string),
          phone: mirror.phone ? String(mirror.phone) : undefined,
          status: (mirror.status as UserCredentialRecord['status']) || 'active',
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
  plan?: SubscriptionPlanTier;
  phone?: string;
  status?: 'active' | 'suspended' | 'expiring' | 'expired';
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
    plan: normalizedPlan,
    phone: params.phone !== undefined ? params.phone : existingRecord?.phone,
    status: params.status || existingRecord?.status || 'active',
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
    // 0. If running behind server.ts with SUPABASE_SERVICE_ROLE_KEY, sync via Service Role endpoint (bypasses RLS)
    if (typeof window !== 'undefined') {
      try {
        const proxyRes = await fetch('/api/admin/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ record: updatedRecord }),
        });
        if (proxyRes.ok) {
          const proxyJson = (await proxyRes.json()) as { success?: boolean; id?: string };
          if (proxyJson.success) {
            if (proxyJson.id) updatedRecord.id = proxyJson.id;
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

    // 1. Insert / Update directly into central `public.subscribers` table (avoid `.select()` after write & `.upsert()` to minimize RLS surface)
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

    if (isMissingTableError(lookupSubErr)) {
      subscribersTableMissing = true;
    } else {
      const fullSubPayload: Record<string, unknown> = {
        name: updatedRecord.clientName,
        email: cleanEmail,
        passcode: cleanPass,
        client_code: updatedRecord.clientCode,
        tier: normalizedPlan,
        goals: updatedRecord.visualGoal || null,
        phone: updatedRecord.phone || null,
        age: updatedRecord.age ?? null,
        blood_type: updatedRecord.bloodType || null,
        status: updatedRecord.status,
        nutrition_plan_locked: Boolean(updatedRecord.nutritionPlanLocked),
        inbody_filename: updatedRecord.inBodyFileName || null,
        inbody_file_url: updatedRecord.inBodyFileUrl || null,
        updated_at: nowIso,
      };

      const coreSubPayload: Record<string, unknown> = {
        name: updatedRecord.clientName,
        email: cleanEmail,
        passcode: cleanPass,
        tier: normalizedPlan,
        goals: updatedRecord.visualGoal || null,
      };

      if (existingSub && existingSub.id !== undefined && existingSub.id !== null) {
        targetSubscriberId = String(existingSub.id);
        let res = await supabase
          .from('subscribers')
          .update(fullSubPayload)
          .eq('id', existingSub.id);

        if (res.error && isMissingColumnError(res.error)) {
          res = await supabase
            .from('subscribers')
            .update(coreSubPayload)
            .eq('id', existingSub.id);
        }
        subscribersErr = res.error;
        subscribersSynced = !res.error;
      } else {
        let res = await supabase
          .from('subscribers')
          .insert({ id: targetSubscriberId, ...fullSubPayload });

        if (res.error && isMissingColumnError(res.error)) {
          res = await supabase
            .from('subscribers')
            .insert(coreSubPayload);
        } else if (res.error && res.error.message.toLowerCase().includes('uuid')) {
          res = await supabase
            .from('subscribers')
            .insert(fullSubPayload);
        }

        subscribersErr = res.error;
        subscribersSynced = !res.error;
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

    // 2. Keep linked `public.clients` table synchronized (explicit insert vs update to avoid upsert dual-RLS check)
    let targetClientId = UUID_REGEX.test(targetSubscriberId) ? targetSubscriberId : resolvedId;
    const { data: existingClient } = await supabase
      .from('clients')
      .select('id')
      .ilike('email', cleanEmail)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const clientExistsInDb = Boolean(existingClient && typeof existingClient.id === 'string');
    if (existingClient && typeof existingClient.id === 'string') {
      targetClientId = existingClient.id;
      updatedRecord.id = targetClientId;
    }

    const fullClientPayload: Record<string, unknown> = {
      id: targetClientId,
      email: cleanEmail,
      name_ar: updatedRecord.clientName,
      name_en: updatedRecord.clientName,
      subscription_plan: normalizedPlan,
      package_type_ar: normalizedPlan === 'VIP' ? 'الباقة البلاتينية (VIP)' : 'الباقة القياسية (Standard)',
      package_type_en: normalizedPlan,
      phone: updatedRecord.phone || null,
      client_code: updatedRecord.clientCode,
      status: updatedRecord.status,
      assigned_password: cleanPass,
      age: updatedRecord.age ?? null,
      blood_type: updatedRecord.bloodType || null,
      visual_goal: updatedRecord.visualGoal || null,
      nutrition_plan_locked: Boolean(updatedRecord.nutritionPlanLocked),
      inbody_filename: updatedRecord.inBodyFileName || null,
      inbody_file_url: updatedRecord.inBodyFileUrl || null,
    };

    const existingClientRowId = clientExistsInDb ? targetClientId : null;
    let { error: clientsErr } = await writeClientRowSafely(
      supabase,
      fullClientPayload,
      existingClientRowId
    );

    if (clientsErr && isMissingColumnError(clientsErr)) {
      const corePayload: Record<string, unknown> = {
        id: targetClientId,
        email: cleanEmail,
        name_ar: updatedRecord.clientName,
        name_en: updatedRecord.clientName,
        package_type_ar: normalizedPlan === 'VIP' ? 'الباقة البلاتينية (VIP)' : 'الباقة القياسية (Standard)',
        package_type_en: normalizedPlan,
        phone: updatedRecord.phone || null,
        client_code: updatedRecord.clientCode,
        status: updatedRecord.status,
      };
      const retryRes = await writeClientRowSafely(
        supabase,
        corePayload,
        existingClientRowId
      );
      clientsErr = retryRes.error;
    }

    // If `clients` threw an RLS or coach_id NOT NULL violation, fail visibly with actionable instructions
    if (clientsErr && (isRlsPolicyError(clientsErr) || isCoachIdConstraintError(clientsErr))) {
      return {
        success: false,
        syncedToSupabase: false,
        error: formatSupabaseErrorMessage(clientsErr),
      };
    }

    // 3. Mirror full subscriber auth bundle into `workouts` (`day_key = 'client_auth'`)
    const authMirrorId = `auth_${cleanEmail}`;
    const { data: existingAuthRow } = await supabase
      .from('workouts')
      .select('id')
      .eq('id', authMirrorId)
      .limit(1)
      .maybeSingle();

    const authMirrorPayload = {
      client_id: targetClientId,
      day_key: 'client_auth',
      workout_data: {
        ...updatedRecord,
        syncedToSupabase: true,
      },
      updated_at: nowIso,
    };

    const { error: mirrorErr } = existingAuthRow
      ? await supabase.from('workouts').update(authMirrorPayload).eq('id', authMirrorId)
      : await supabase.from('workouts').insert({ id: authMirrorId, ...authMirrorPayload });

    const syncedToSupabase = subscribersSynced || (!clientsErr && !mirrorErr);
    if (!syncedToSupabase) {
      const rawErr = subscribersErr || clientsErr || mirrorErr;
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
 * Permanently deletes a subscriber cascading through subscribers, clients, declarations, workouts, notes, and profiles in Supabase.
 */
export async function deleteSubscriberRecord(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const targetUser = subscribersMemoryCache.find((u) => u.email.toLowerCase() === cleanEmail);

  if (typeof window !== 'undefined') {
    try {
      const proxyRes = await fetch('/api/admin/subscribers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, id: targetUser?.id }),
      });
      if (proxyRes.ok) {
        const filtered = subscribersMemoryCache.filter((u) => u.email.toLowerCase() !== cleanEmail);
        saveSubscribersList(filtered);
        return true;
      }
    } catch {
      // fall through to direct Supabase client
    }
  }

  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const [{ data: cloudSub }, { data: cloudClient }] = await Promise.all([
      supabase.from('subscribers').select('id').ilike('email', cleanEmail).limit(1).maybeSingle(),
      supabase.from('clients').select('id').ilike('email', cleanEmail).limit(1).maybeSingle(),
    ]);

    const resolvedId =
      (cloudClient && typeof cloudClient.id === 'string' ? cloudClient.id : undefined) ||
      (cloudSub && cloudSub.id !== undefined ? String(cloudSub.id) : undefined) ||
      targetUser?.id;

    await supabase.from('subscribers').delete().ilike('email', cleanEmail);
    await supabase.from('clients').delete().ilike('email', cleanEmail);
    await supabase.from('declarations').delete().ilike('email', cleanEmail);
    await supabase.from('workouts').delete().eq('id', `auth_${cleanEmail}`);

    const candidateKeys = [resolvedId, cleanEmail].filter((k): k is string => Boolean(k));
    for (const k of candidateKeys) {
      await supabase.from('workouts').delete().eq('client_id', k);
      await supabase.from('workouts').delete().eq('id', `workouts_${k}`);
      await supabase.from('workouts').delete().eq('id', `nutrition_${k}`);
      await supabase.from('workouts').delete().eq('id', `assessment_${k}`);
      await supabase.from('workouts').delete().eq('id', `profile_ext_${k}`);
      await supabase.from('notes').delete().eq('client_id', k);
      await supabase.from('profiles').delete().eq('id', k);
    }

    const filtered = subscribersMemoryCache.filter((u) => u.email.toLowerCase() !== cleanEmail);
    saveSubscribersList(filtered);
    return true;
  } catch (e) {
    console.warn('Supabase delete subscriber error:', e);
    return false;
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, status: newStatus, updatedRecord: updatedRec }),
        });
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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, nutritionPlanLocked: newVal, updatedRecord: updatedRec }),
        });
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
  error?: string;
}> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // Special Master Coach checks (strictly require secret passkey RAMO3223)
  if (cleanId === 'coach.omar@oao.com') {
    if (cleanPass.toUpperCase() === 'RAMO3223') {
      setCoachAuthenticated(true);
      return {
        success: true,
        role: 'admin',
        id: 'coach_omar',
        email: 'coach.omar@oao.com',
        name: 'الكوتش عمر عدنان',
        plan: 'VIP',
      };
    }
    return {
      success: false,
      role: 'client',
      email: 'coach.omar@oao.com',
      name: 'الكوتش عمر عدنان',
      plan: 'VIP',
      error: 'يرجى إدخال رمز المرور السري الصحيح للكوتش.',
    };
  }

  if (!cleanPass && cleanId === 'ramo3223') {
    setCoachAuthenticated(true);
    return {
      success: true,
      role: 'admin',
      id: 'coach_omar',
      email: 'coach.omar@oao.com',
      name: 'الكوتش عمر عدنان',
      plan: 'VIP',
    };
  }

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

  // Also run a direct targeted query against `public.subscribers` to guarantee immediate fresh validation
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
    } else if (directRes.error && !cleanPass) {
      // Retry without `client_code` in case `subscribers` has only the 5 core columns
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
    // ignore transient targeted query failure; fall back to `all` hydrated above
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
        role: matchedByEmail.email === 'coach.omar@oao.com' ? 'admin' : 'client',
        id: matchedByEmail.id,
        email: matchedByEmail.email,
        name: matchedByEmail.clientName,
        plan: matchedByEmail.plan,
        clientCode: matchedByEmail.clientCode,
        phone: matchedByEmail.phone,
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
}): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://oao-portal.com';
  const planNameAr = options.plan === 'VIP' ? 'الباقة البلاتينية النخبوية (VIP)' : 'الباقة القياسية (Standard)';

  return `مرحباً يا بطل ${options.clientName} 👋
يسعدنا انضمامك إلى منصة OAO التدريبية تحت إشراف الكوتش عمر عدنان! 🏋️‍♂️🔥

📋 بيانات دخول حسابك المعتمد:
🔗 رابط المنصة: ${origin}
📧 البريد الإلكتروني: ${options.email}
🔑 كلمة المرور: ${options.password || 'oao-vip-2026'}
${options.clientCode ? `🏷️ رمز الاشتراك البديل: ${options.clientCode}\n` : ''}💎 نوع الباقة: ${planNameAr}

💡 توجيهات سريعة:
1. ادخل عبر الرابط أعلاه وسجل دخولك بالبريد وكلمة المرور.
2. ستجد جدولك التدريبي المخصص ونظامك الغذائي ومتابعة مؤشراتك الحيوية.
3. يمكنك التواصل مباشرة مع الكوتش من صندوق الاستفسارات داخل حسابك.

نتمنى لك رحلة تدريبية ملهمة لتحقيق أهدافك بأعلى مستوى! 🚀💪`;
}
