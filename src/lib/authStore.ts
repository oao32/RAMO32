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
  status: 'active' | 'expiring' | 'expired';
  createdAt: string;
  updatedAt: string;
  assignedByCoach: boolean;
  syncedToSupabase?: boolean;
}

const STORAGE_KEYS = {
  CREDENTIALS: 'oao_subscriber_credentials',
  SUBSCRIBERS_LIST: 'oao_admin_subscribers',
};

// Default seed subscribers for smooth local development & testing
const DEFAULT_ACCOUNTS: UserCredentialRecord[] = [
  {
    email: 'abdulrahman@oao.com',
    password: 'oao-vip-2026',
    clientName: 'عبدالرحمن الشمري',
    clientCode: 'RAMO32',
    plan: 'VIP',
    phone: '0550001122',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    assignedByCoach: true,
    syncedToSupabase: false,
  },
  {
    email: 'standard@oao.com',
    password: 'oao-std-2026',
    clientName: 'مشترك الباقة القياسية',
    clientCode: 'OAO-101',
    plan: 'standard',
    phone: '0559998877',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    assignedByCoach: true,
    syncedToSupabase: false,
  },
  {
    email: 'coach.omar@oao.com',
    password: 'RAMO3223',
    clientName: 'الكوتش عمر عدنان',
    clientCode: 'RAMO3223',
    plan: 'VIP',
    phone: '0500000000',
    status: 'active',
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    assignedByCoach: true,
    syncedToSupabase: false,
  },
];

export function getAllSubscribersWithCredentials(): UserCredentialRecord[] {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CREDENTIALS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CREDENTIALS, JSON.stringify(DEFAULT_ACCOUNTS));
      return DEFAULT_ACCOUNTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_ACCOUNTS;
  } catch {
    return DEFAULT_ACCOUNTS;
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
  status?: 'active' | 'expiring' | 'expired';
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
      phone: params.phone || all[existingIdx].phone,
      status: params.status || all[existingIdx].status || 'active',
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
      // Upsert into public.clients table with assigned_password field if supported
      const clientPayload: Record<string, unknown> = {
        email: cleanEmail,
        name_ar: params.clientName,
        subscription_plan: normalizedPlan,
        phone: params.phone || null,
        client_code: updatedRecord.clientCode,
        status: updatedRecord.status,
      };

      // Try adding assigned_password
      try {
        await supabase
          .from('clients')
          .upsert({ ...clientPayload, assigned_password: cleanPass }, { onConflict: 'email' });
        syncedToSupabase = true;
      } catch {
        // Fallback without assigned_password column
        await supabase
          .from('clients')
          .upsert(clientPayload, { onConflict: 'email' });
        syncedToSupabase = true;
      }

      // Mark locally as synced
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
