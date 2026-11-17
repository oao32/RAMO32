import { Role, SubscriptionPlanTier } from '../types';
import { getSupabaseClient, normalizeSubscriptionPlan } from './supabase';

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

const STORAGE_KEYS = {
  CREDENTIALS: 'oao_subscriber_credentials',
  SUBSCRIBERS_LIST: 'oao_admin_subscribers',
};

// Start cleanly with 0 dummy accounts (all records come dynamically from Supabase / Admin CRUD / Subscribe)
const DEFAULT_ACCOUNTS: UserCredentialRecord[] = [];

export function getAllSubscribersWithCredentials(): UserCredentialRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
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

/**
 * Sync real subscribers from Supabase `public.clients` merged with `workouts(day_key='client_auth')`.
 * Supabase is authoritative when reachable so deleted cloud subscribers do not resurrect from localStorage.
 */
export async function fetchSubscribersFromSupabase(): Promise<UserCredentialRecord[]> {
  const local = getAllSubscribersWithCredentials();
  const supabase = getSupabaseClient();
  if (!supabase) return local;

  try {
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

    if (clientsRes.error && authMirrorsRes.error) {
      return local;
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

    if (!clientsRes.error && Array.isArray(clientsRes.data)) {
      for (const row of clientsRes.data as Array<Record<string, unknown>>) {
        if (typeof row.email !== 'string' || !row.email.trim()) continue;
        const cleanEmail = String(row.email).trim().toLowerCase();
        const mirror = authByEmail.get(cleanEmail);

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

    // Include any records that only exist in client_auth mirror (e.g. if clients table lacked permission/columns)
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

    // Keep ONLY genuinely unsynced local-only records created offline
    const unsyncedLocal = local.filter(
      (l) => l.syncedToSupabase === false && !mergedByEmail.has(l.email.toLowerCase())
    );
    const remoteList = [...Array.from(mergedByEmail.values()), ...unsyncedLocal];
    saveSubscribersList(remoteList);
    return remoteList;
  } catch {
    return local;
  }
}

export function saveSubscribersList(records: UserCredentialRecord[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('oao_credentials_updated', { detail: records }));
    window.dispatchEvent(new Event('storage'));
  } catch (err) {
    console.warn('Failed to save subscriber credentials locally:', err);
  }
}

/**
 * Assign or update a subscriber password directly by the Coach.
 * Explicitly checks `{ error }` on Supabase `clients` and dual-writes to `workouts(day_key='client_auth')`.
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
    return { success: false, syncedToSupabase: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان.' };
  }

  const all = getAllSubscribersWithCredentials();
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
    clientName: params.clientName || existingRecord?.clientName || 'مشترك',
    clientCode:
      params.clientCode ||
      existingRecord?.clientCode ||
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

  if (existingIdx >= 0) {
    all[existingIdx] = updatedRecord;
  } else {
    all.unshift(updatedRecord);
  }
  saveSubscribersList(all);

  // Mirror into subscriber plans map
  if (typeof window !== 'undefined') {
    try {
      const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
      const mapObj = mapRaw ? JSON.parse(mapRaw) : {};
      mapObj[cleanEmail] = {
        plan: normalizedPlan,
        nameAr: updatedRecord.clientName,
        status: updatedRecord.status,
        nutritionPlanLocked: updatedRecord.nutritionPlanLocked,
      };
      localStorage.setItem('oao_subscriber_plans_map', JSON.stringify(mapObj));
    } catch {
      // ignore
    }
  }

  // Attempt cloud sync with Supabase (`clients` + `workouts.client_auth` backup)
  const supabase = getSupabaseClient();
  let syncedToSupabase = false;

  if (supabase) {
    try {
      // Lookup existing row ID by case-insensitive email so we update cleanly without duplicate/conflict issues
      let targetClientId = resolvedId;
      const { data: existingClient } = await supabase
        .from('clients')
        .select('id')
        .ilike('email', cleanEmail)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

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

      let { error: clientsErr } = await supabase
        .from('clients')
        .upsert(fullClientPayload, { onConflict: 'id' });

      if (
        clientsErr &&
        (clientsErr.code === 'PGRST204' ||
          clientsErr.code === '42703' ||
          clientsErr.message.includes('column'))
      ) {
        const corePayload = {
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
        const retryRes = await supabase
          .from('clients')
          .upsert(corePayload, { onConflict: 'id' });
        clientsErr = retryRes.error;
      }

      // Mirror complete auth + metadata into `workouts` (`day_key = 'client_auth'`) so cross-device login & lock work unconditionally
      const { error: mirrorErr } = await supabase.from('workouts').upsert(
        {
          id: `auth_${cleanEmail}`,
          client_id: targetClientId,
          day_key: 'client_auth',
          workout_data: {
            ...updatedRecord,
            syncedToSupabase: true,
          },
          updated_at: nowIso,
        },
        { onConflict: 'id' }
      );

      syncedToSupabase = !clientsErr || !mirrorErr;

      if (syncedToSupabase) {
        updatedRecord.syncedToSupabase = true;
        const latest = getAllSubscribersWithCredentials();
        const idx = latest.findIndex((u) => u.email.toLowerCase() === cleanEmail);
        if (idx >= 0) latest[idx] = updatedRecord;
        else latest.unshift(updatedRecord);
        saveSubscribersList(latest);
      }
    } catch (syncErr) {
      console.warn('Supabase cloud credentials sync notice:', syncErr);
    }
  }

  return { success: true, syncedToSupabase, record: updatedRecord };
}

/**
 * Permanently deletes a subscriber cascading through credentials, declarations, workouts, notes, and cloud.
 */
export async function deleteSubscriberRecord(email: string): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const all = getAllSubscribersWithCredentials();
  const targetUser = all.find((u) => u.email.toLowerCase() === cleanEmail);
  const filtered = all.filter((u) => u.email.toLowerCase() !== cleanEmail);
  saveSubscribersList(filtered);

  // Remove from declarations locally
  if (typeof window !== 'undefined') {
    try {
      const declRaw = localStorage.getItem('oao_client_declarations');
      if (declRaw) {
        const decls = JSON.parse(declRaw) as Array<{ email?: string; id?: string }>;
        const filteredDecls = decls.filter(
          (d) => (d.email || '').trim().toLowerCase() !== cleanEmail
        );
        localStorage.setItem('oao_client_declarations', JSON.stringify(filteredDecls));
        window.dispatchEvent(new CustomEvent('oao_declarations_updated', { detail: filteredDecls }));
      }
    } catch {
      // ignore
    }

    // Remove related notes locally
    try {
      const notesRaw = localStorage.getItem('oao_client_notes');
      if (notesRaw && targetUser) {
        const notes = JSON.parse(notesRaw) as Array<{ clientId?: string; clientName?: string; clientEmail?: string }>;
        const filteredNotes = notes.filter(
          (n) =>
            n.clientId !== targetUser.id &&
            n.clientEmail?.toLowerCase() !== cleanEmail &&
            n.clientName !== targetUser.clientName
        );
        localStorage.setItem('oao_client_notes', JSON.stringify(filteredNotes));
        window.dispatchEvent(new CustomEvent('oao_notes_updated'));
      }
    } catch {
      // ignore
    }

    // Remove from plans map
    try {
      const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
      if (mapRaw) {
        const mapObj = JSON.parse(mapRaw);
        delete mapObj[cleanEmail];
        localStorage.setItem('oao_subscriber_plans_map', JSON.stringify(mapObj));
      }
    } catch {
      // ignore
    }
  }

  // Cascade delete from Supabase
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data: cloudClient } = await supabase
        .from('clients')
        .select('id')
        .ilike('email', cleanEmail)
        .limit(1)
        .maybeSingle();

      const resolvedId =
        (cloudClient && typeof cloudClient.id === 'string' ? cloudClient.id : undefined) ||
        targetUser?.id;

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
    } catch (e) {
      console.warn('Supabase delete subscriber notice:', e);
    }
  }

  return true;
}

/**
 * Toggles a subscriber status between 'active' and 'suspended' and syncs to Supabase.
 */
export function toggleSubscriberStatus(email: string): 'active' | 'suspended' {
  const cleanEmail = email.trim().toLowerCase();
  const all = getAllSubscribersWithCredentials();
  const idx = all.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (idx < 0) return 'active';

  const newStatus = all[idx].status === 'suspended' ? 'active' : 'suspended';
  all[idx].status = newStatus;
  all[idx].updatedAt = new Date().toISOString();
  const updatedRec = { ...all[idx] };
  saveSubscribersList(all);

  try {
    const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
    const mapObj = mapRaw ? JSON.parse(mapRaw) : {};
    if (mapObj[cleanEmail]) {
      mapObj[cleanEmail].status = newStatus;
      localStorage.setItem('oao_subscriber_plans_map', JSON.stringify(mapObj));
    }
  } catch {
    // ignore
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    void (async () => {
      try {
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
  }

  return newStatus;
}

/**
 * Toggles a subscriber nutrition plan access lock and syncs to Supabase.
 */
export function toggleSubscriberNutritionLock(email: string, locked?: boolean): boolean {
  const cleanEmail = email.trim().toLowerCase();
  const all = getAllSubscribersWithCredentials();
  const idx = all.findIndex((u) => u.email.toLowerCase() === cleanEmail);
  if (idx < 0) return false;

  const currentVal = all[idx].nutritionPlanLocked || false;
  const newVal = locked !== undefined ? locked : !currentVal;
  all[idx].nutritionPlanLocked = newVal;
  all[idx].updatedAt = new Date().toISOString();
  const updatedRec = { ...all[idx] };
  saveSubscribersList(all);

  try {
    const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
    const mapObj = mapRaw ? JSON.parse(mapRaw) : {};
    if (mapObj[cleanEmail]) {
      mapObj[cleanEmail].nutritionPlanLocked = newVal;
      localStorage.setItem('oao_subscriber_plans_map', JSON.stringify(mapObj));
    }
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('oao_nutrition_lock_updated', { detail: { email: cleanEmail, locked: newVal } })
    );
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    void (async () => {
      try {
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
  }

  return newVal;
}

/**
 * Check if nutrition plan is locked for a given subscriber email (local fast check)
 */
export function isSubscriberNutritionLocked(email?: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (localStorage.getItem('oao_nutrition_locked') === 'true') return true;
    let checkEmail = email?.trim().toLowerCase();
    if (!checkEmail) {
      const currentRaw = localStorage.getItem('oao_current_user');
      if (currentRaw) {
        const parsed = JSON.parse(currentRaw);
        checkEmail = (parsed?.email || '').trim().toLowerCase();
      }
    }
    if (!checkEmail) {
      const profRaw = localStorage.getItem('oao_client_profile');
      if (profRaw) {
        const prof = JSON.parse(profRaw);
        if (prof?.nutritionPlanLocked) return true;
        checkEmail = (prof?.email || '').trim().toLowerCase();
      }
    }
    if (!checkEmail) return false;
    const all = getAllSubscribersWithCredentials();
    const matched = all.find((u) => u.email.toLowerCase() === checkEmail);
    if (matched?.nutritionPlanLocked) return true;

    const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
    if (mapRaw) {
      const mapObj = JSON.parse(mapRaw);
      if (mapObj[checkEmail]?.nutritionPlanLocked) return true;
    }
  } catch {
    // ignore
  }
  return false;
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
    const [globalRes, clientRes, mirrorRes] = await Promise.all([
      supabase
        .from('workouts')
        .select('workout_data')
        .eq('id', 'global_nutrition_lock')
        .maybeSingle(),
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

    if (typeof window !== 'undefined') {
      localStorage.setItem('oao_nutrition_locked', String(globalLocked));
    }

    return globalLocked || clientRowLocked || mirrorLocked;
  } catch {
    return isSubscriberNutritionLocked(cleanEmail);
  }
}

/**
 * Authenticates user by Email + Password OR by Passcode / Client Code / Assigned Password.
 * Queries live Supabase subscribers & declarations first so logins work seamlessly across all devices.
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

  // Special Master Coach checks
  if (cleanId === 'coach.omar@oao.com' || cleanId === 'ramo3223' || cleanId === 'coach') {
    if (!cleanPass || cleanPass.toUpperCase() === 'RAMO3223') {
      return {
        success: true,
        role: 'admin',
        id: 'coach_omar',
        email: 'coach.omar@oao.com',
        name: 'الكوتش عمر عدنان',
        plan: 'VIP',
      };
    }
  }

  // Always hydrate live subscriber directory from Supabase first
  const all = await fetchSubscribersFromSupabase();

  // 1. Credentials mode or direct email lookup
  const matchedByEmail = all.find((u) => u.email.trim().toLowerCase() === cleanId);
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
        error: 'يرجى إدخال كلمة المرور المخصصة لحسابك في تبويب (إيميل + كلمة المرور).',
      };
    }
    if (matchedByEmail.password.trim() === cleanPass) {
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
      error: 'كلمة المرور غير صحيحة، يرجى التحقق أو التواصل مع الكوتش.',
    };
  }

  // 2. Passcode mode: match either `clientCode` OR assigned `password` (e.g., OAO-XXXX) case-insensitively
  if (!cleanPass) {
    const matchedByCodeOrPass = all.find((u) => {
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
  const supabase = getSupabaseClient();
  if (supabase && !cleanPass) {
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
      // fall through to local declarations check
    }
  }

  // 4. Local signed declarations fallback (offline mode)
  if (typeof window !== 'undefined' && !cleanPass) {
    try {
      const declRaw = localStorage.getItem('oao_client_declarations');
      if (declRaw) {
        const decls = JSON.parse(declRaw) as Array<Record<string, unknown>>;
        const found = decls.find(
          (d) => typeof d.id === 'string' && d.id.trim().toLowerCase() === cleanId
        );
        if (found) {
          const rawPlan = (found.subscription_plan as string) || (found.planId as string);
          const declEmail = (found.email as string)?.trim().toLowerCase() || `${cleanId}@oao.athlete`;
          return {
            success: true,
            role: 'client',
            id: declEmail,
            email: declEmail,
            name: (found.fullName as string) || 'مشترك معتمد',
            plan: normalizeSubscriptionPlan(rawPlan),
          };
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    success: false,
    role: 'client',
    email: cleanId,
    name: 'مشترك',
    plan: 'standard',
    error: 'بيانات الدخول غير صحيحة أو غير مسجلة. يرجى التحقق من البريد وكلمة المرور أو التواصل مع الكوتش.',
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
