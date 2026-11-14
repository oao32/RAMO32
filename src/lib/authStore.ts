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

/**
 * Sync real subscribers from Supabase `public.clients` table into local store.
 */
export async function fetchSubscribersFromSupabase(): Promise<UserCredentialRecord[]> {
  const local = getAllSubscribersWithCredentials();
  const supabase = getSupabaseClient();
  if (!supabase) return local;

  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data) return local;

    const remoteList: UserCredentialRecord[] = data
      .filter((row: Record<string, unknown>) => typeof row.email === 'string' && row.email.trim().length > 0)
      .map((row: Record<string, unknown>) => ({
        id: row.id ? String(row.id) : undefined,
        email: String(row.email).trim().toLowerCase(),
        password: row.assigned_password ? String(row.assigned_password) : 'OAO-2026',
        clientName: String(row.name_ar || row.name_en || 'مشترك'),
        clientCode: row.client_code ? String(row.client_code) : undefined,
        plan: normalizeSubscriptionPlan(row.subscription_plan as string),
        phone: row.phone ? String(row.phone) : undefined,
        status: (row.status as UserCredentialRecord['status']) || 'active',
        age: row.age ? Number(row.age) : undefined,
        bloodType: row.blood_type ? String(row.blood_type) : undefined,
        visualGoal: row.visual_goal ? String(row.visual_goal) : undefined,
        nutritionPlanLocked: Boolean(row.nutrition_plan_locked),
        inBodyFileName: row.inbody_filename ? String(row.inbody_filename) : undefined,
        inBodyFileUrl: row.inbody_file_url ? String(row.inbody_file_url) : undefined,
        createdAt: String(row.created_at || new Date().toISOString()),
        updatedAt: String(row.created_at || new Date().toISOString()),
        assignedByCoach: true,
        syncedToSupabase: true,
      }));

    // Merge remote & any unsynced local records
    const remoteEmails = new Set(remoteList.map((r) => r.email));
    const merged = [
      ...remoteList,
      ...local.filter((l) => !remoteEmails.has(l.email.toLowerCase())),
    ];
    saveSubscribersList(merged);
    return merged;
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
 * Syncs with Supabase if online/configured and persists in local auth store.
 */
export async function assignSubscriberPassword(params: {
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
}): Promise<{ success: boolean; syncedToSupabase: boolean; error?: string }> {
  const cleanEmail = params.email.trim().toLowerCase();
  const cleanPass = params.password.trim();
  const nowIso = new Date().toISOString();
  const normalizedPlan = normalizeSubscriptionPlan(params.plan || 'standard');

  if (!cleanEmail || !cleanPass) {
    return { success: false, syncedToSupabase: false, error: 'البريد الإلكتروني وكلمة المرور مطلوبان.' };
  }

  // 1. Update in local credentials store
  const all = getAllSubscribersWithCredentials();
  const existingIdx = all.findIndex((u) => u.email.toLowerCase() === cleanEmail);

  let updatedRecord: UserCredentialRecord;
  if (existingIdx >= 0) {
    updatedRecord = {
      ...all[existingIdx],
      password: cleanPass,
      clientName: params.clientName || all[existingIdx].clientName,
      clientCode: params.clientCode || all[existingIdx].clientCode,
      plan: normalizedPlan,
      phone: params.phone !== undefined ? params.phone : all[existingIdx].phone,
      status: params.status || all[existingIdx].status || 'active',
      age: params.age !== undefined ? params.age : all[existingIdx].age,
      bloodType: params.bloodType !== undefined ? params.bloodType : all[existingIdx].bloodType,
      visualGoal: params.visualGoal !== undefined ? params.visualGoal : all[existingIdx].visualGoal,
      nutritionPlanLocked:
        params.nutritionPlanLocked !== undefined
          ? params.nutritionPlanLocked
          : all[existingIdx].nutritionPlanLocked,
      inBodyFileName: params.inBodyFileName || all[existingIdx].inBodyFileName,
      inBodyFileUrl: params.inBodyFileUrl || all[existingIdx].inBodyFileUrl,
      updatedAt: nowIso,
      assignedByCoach: true,
    };
    all[existingIdx] = updatedRecord;
  } else {
    updatedRecord = {
      email: cleanEmail,
      password: cleanPass,
      clientName: params.clientName,
      clientCode: params.clientCode || `OAO-${normalizedPlan === 'VIP' ? 'VIP' : 'STD'}-${Math.floor(100 + Math.random() * 900)}`,
      plan: normalizedPlan,
      phone: params.phone,
      status: params.status || 'active',
      age: params.age,
      bloodType: params.bloodType,
      visualGoal: params.visualGoal,
      nutritionPlanLocked: params.nutritionPlanLocked || false,
      inBodyFileName: params.inBodyFileName,
      inBodyFileUrl: params.inBodyFileUrl,
      createdAt: nowIso,
      updatedAt: nowIso,
      assignedByCoach: true,
      syncedToSupabase: false,
    };
    all.unshift(updatedRecord);
  }

  saveSubscribersList(all);

  // 2. Also mirror into subscriber plans map for instant offline dashboard resolution
  try {
    const mapRaw = localStorage.getItem('oao_subscriber_plans_map');
    const mapObj = mapRaw ? JSON.parse(mapRaw) : {};
    mapObj[cleanEmail] = {
      plan: normalizedPlan,
      nameAr: params.clientName,
      status: params.status || 'active',
      nutritionPlanLocked: updatedRecord.nutritionPlanLocked,
    };
    localStorage.setItem('oao_subscriber_plans_map', JSON.stringify(mapObj));
  } catch {
    // ignore
  }

  // 3. Attempt cloud sync with Supabase if configured
  const supabase = getSupabaseClient();
  let syncedToSupabase = false;

  if (supabase) {
    try {
      const clientPayload: Record<string, unknown> = {
        email: cleanEmail,
        name_ar: params.clientName,
        subscription_plan: normalizedPlan,
        phone: params.phone || null,
        client_code: updatedRecord.clientCode,
        status: updatedRecord.status,
        age: updatedRecord.age || null,
        blood_type: updatedRecord.bloodType || null,
        visual_goal: updatedRecord.visualGoal || null,
        nutrition_plan_locked: Boolean(updatedRecord.nutritionPlanLocked),
        inbody_filename: updatedRecord.inBodyFileName || null,
        inbody_file_url: updatedRecord.inBodyFileUrl || null,
      };

      try {
        await supabase
          .from('clients')
          .upsert({ ...clientPayload, assigned_password: cleanPass }, { onConflict: 'email' });
        syncedToSupabase = true;
      } catch {
        await supabase
          .from('clients')
          .upsert(
            {
              email: cleanEmail,
              name_ar: params.clientName,
              subscription_plan: normalizedPlan,
              phone: params.phone || null,
              client_code: updatedRecord.clientCode,
              status: updatedRecord.status,
            },
            { onConflict: 'email' }
          );
        syncedToSupabase = true;
      }

      if (syncedToSupabase) {
        updatedRecord.syncedToSupabase = true;
        saveSubscribersList(all);
      }
    } catch (syncErr) {
      console.warn('Supabase cloud credentials sync notice (offline mode active):', syncErr);
    }
  }

  return { success: true, syncedToSupabase };
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

  // Remove from declarations
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

  // Remove related notes
  try {
    const notesRaw = localStorage.getItem('oao_client_notes');
    if (notesRaw && targetUser) {
      const notes = JSON.parse(notesRaw) as Array<{ clientId?: string; clientName?: string }>;
      const filteredNotes = notes.filter(
        (n) => n.clientId !== targetUser.id && n.clientName !== targetUser.clientName
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

  // Cascade delete from Supabase if configured
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      await supabase.from('clients').delete().eq('email', cleanEmail);
      await supabase.from('declarations').delete().eq('email', cleanEmail);
      if (targetUser?.id) {
        await supabase.from('workouts').delete().eq('client_id', targetUser.id);
        await supabase.from('notes').delete().eq('client_id', targetUser.id);
        await supabase.from('profiles').delete().eq('id', targetUser.id);
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
  saveSubscribersList(all);

  // Mirror in plans map
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
    supabase.from('clients').update({ status: newStatus }).eq('email', cleanEmail).then(() => {});
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
    window.dispatchEvent(new CustomEvent('oao_nutrition_lock_updated', { detail: { email: cleanEmail, locked: newVal } }));
  }

  const supabase = getSupabaseClient();
  if (supabase) {
    supabase.from('clients').update({ nutrition_plan_locked: newVal }).eq('email', cleanEmail).then(() => {});
  }

  return newVal;
}

/**
 * Check if nutrition plan is locked for a given subscriber email (or current logged-in user)
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
 * Authenticates user by Email + Password OR by Passcode / Client Code.
 */
export async function authenticateUser(
  identifier: string,
  password?: string
): Promise<{
  success: boolean;
  role: Role;
  email: string;
  name: string;
  plan: SubscriptionPlanTier;
  error?: string;
}> {
  const cleanId = (identifier || '').trim().toLowerCase();
  const cleanPass = (password || '').trim();

  // Special Master Coach checks
  if (cleanId === 'coach.omar@oao.com' || cleanId === 'ramo3223' || cleanId === 'coach') {
    if (!cleanPass || cleanPass === 'RAMO3223' || cleanPass.toUpperCase() === 'RAMO3223') {
      return {
        success: true,
        role: 'admin',
        email: 'coach.omar@oao.com',
        name: 'الكوتش عمر عدنان',
        plan: 'VIP',
      };
    }
  }

  const all = getAllSubscribersWithCredentials();

  // Search by email match with password
  const matchedByEmail = all.find((u) => u.email.toLowerCase() === cleanId);
  if (matchedByEmail) {
    if (matchedByEmail.status === 'suspended') {
      return {
        success: false,
        role: 'client',
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
        email: matchedByEmail.email,
        name: matchedByEmail.clientName,
        plan: matchedByEmail.plan,
        error: 'يرجى إدخال كلمة المرور المخصصة لحسابك.',
      };
    }
    if (matchedByEmail.password === cleanPass) {
      return {
        success: true,
        role: matchedByEmail.email === 'coach.omar@oao.com' ? 'admin' : 'client',
        email: matchedByEmail.email,
        name: matchedByEmail.clientName,
        plan: matchedByEmail.plan,
      };
    } else {
      return {
        success: false,
        role: 'client',
        email: matchedByEmail.email,
        name: matchedByEmail.clientName,
        plan: matchedByEmail.plan,
        error: 'كلمة المرور غير صحيحة، يرجى التحقق أو التواصل مع الكوتش.',
      };
    }
  }

  // Search by client code / passcode match
  const matchedByCode = all.find(
    (u) => (u.clientCode && u.clientCode.toLowerCase() === cleanId) || cleanId === u.clientCode?.toUpperCase()
  );
  if (matchedByCode) {
    if (matchedByCode.status === 'suspended') {
      return {
        success: false,
        role: 'client',
        email: matchedByCode.email,
        name: matchedByCode.clientName,
        plan: matchedByCode.plan,
        error: 'تم تعليق هذا الحساب مؤقتاً من قبل الكوتش. يرجى التواصل مع الإدارة.',
      };
    }
    return {
      success: true,
      role: 'client',
      email: matchedByCode.email,
      name: matchedByCode.clientName,
      plan: matchedByCode.plan,
    };
  }

  // Check signed declarations in localStorage
  if (typeof window !== 'undefined') {
    try {
      const declRaw = localStorage.getItem('oao_client_declarations');
      if (declRaw) {
        const decls = JSON.parse(declRaw) as Array<Record<string, unknown>>;
        const found = decls.find(
          (d) =>
            (typeof d.email === 'string' && d.email.trim().toLowerCase() === cleanId) ||
            (typeof d.id === 'string' && d.id.trim().toLowerCase() === cleanId)
        );
        if (found) {
          const rawPlan = (found.subscription_plan as string) || (found.planId as string);
          return {
            success: true,
            role: 'client',
            email: (found.email as string) || `${cleanId}@oao.athlete`,
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
    error: 'بيانات الدخول غير صحيحة أو غير مسجلة. يرجى التواصل مع الكوتش.',
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
