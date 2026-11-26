import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SubscriptionAgreement, SubscriptionPlanTier } from '../../types';
import {
  getAllSubscribersWithCredentials,
  fetchSubscribersFromSupabase,
  assignSubscriberPassword,
  deleteSubscriberRecord,
  toggleSubscriberStatus,
  toggleSubscriberNutritionLock,
  ensureSubscriberAccessToken,
  generateWhatsAppWelcomeMessage,
  UserCredentialRecord,
} from '../../lib/authStore';
import {
  fetchDeclarationsFromSupabase,
  deleteDeclarationFromSupabase,
  getSupabaseClient,
  buildCandidateClientKeys,
} from '../../lib/supabase';
import {
  addMonthsToDate,
  calculateDateSpanBreakdown,
  calculateSubscriptionDetails,
  getTodayIsoString,
} from '../../lib/subscriptionUtils';
import {
  Users,
  ShieldCheck,
  Share2,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Crown,
  Shield,
  Plus,
  Trash2,
  Edit3,
  Copy,
  CheckCircle2,
  X,
  Lock,
  Unlock,
  RefreshCw,
  Phone,
  Mail,
  User,
  Sparkles,
  UserCheck,
  UserX,
  FileText,
  Download,
  AlertTriangle,
  FileSpreadsheet,
  Link2,
  Calendar,
  Clock,
  MessageCircle,
} from 'lucide-react';

interface AdminSubscribersManagerProps {
  declarations: SubscriptionAgreement[];
  onOpenDeclaration: (decl: SubscriptionAgreement) => void;
  onCopySubscribeLink: () => void;
  copiedLink: boolean;
  language: 'ar' | 'en';
  onSubscriberAdded?: (subscriber?: UserCredentialRecord) => void;
}

function formatWhatsAppPhone(rawPhone?: string | null): string {
  try {
    if (!rawPhone || typeof rawPhone !== 'string') return '';
    const normalizedDigits = rawPhone
      .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));
    let digits = normalizedDigits.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) {
      digits = digits.slice(2);
    }
    if (digits.startsWith('05') && digits.length === 10) {
      digits = `966${digits.slice(1)}`;
    } else if (digits.startsWith('0')) {
      return '';
    }
    if (digits.length < 8 || digits.length > 15) return '';
    return digits;
  } catch {
    return '';
  }
}

export const AdminSubscribersManager: React.FC<AdminSubscribersManagerProps> = ({
  declarations: initialDeclarations,
  onOpenDeclaration,
  onCopySubscribeLink,
  copiedLink,
  language,
  onSubscriberAdded,
}) => {
  // Credentials list
  const [credentialsList, setCredentialsList] = useState<UserCredentialRecord[]>(() =>
    getAllSubscribersWithCredentials()
  );

  // Local declarations list with deletion support
  const [declarations, setDeclarations] = useState<SubscriptionAgreement[]>(initialDeclarations);

  // InBody Preview Modal State
  const [inBodyPreview, setInBodyPreview] = useState<{
    fileName: string;
    fileUrl: string;
    clientName: string;
  } | null>(null);

  // Quick Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState<UserCredentialRecord | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isSavingReset, setIsSavingReset] = useState(false);

  // Full Edit Subscriber Modal State
  const [editingSubscriber, setEditingSubscriber] = useState<UserCredentialRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPlan, setEditPlan] = useState<SubscriptionPlanTier>('VIP');
  const [editAge, setEditAge] = useState<number | undefined>(undefined);
  const [editBloodType, setEditBloodType] = useState<string>('');
  const [editVisualGoal, setEditVisualGoal] = useState<string>('');
  const [editStatus, setEditStatus] = useState<'active' | 'suspended'>('active');
  const [editStartDate, setEditStartDate] = useState<string>(() => getTodayIsoString());
  const [editEndDate, setEditEndDate] = useState<string>(() => addMonthsToDate(getTodayIsoString(), 1));
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Manual Add Subscriber Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addPlan, setAddPlan] = useState<SubscriptionPlanTier>('VIP');
  const [addPhone, setAddPhone] = useState('');
  const [addAge, setAddAge] = useState<string>('');
  const [addBloodType, setAddBloodType] = useState<string>('');
  const [addVisualGoal, setAddVisualGoal] = useState<string>('تضخيم وبناء عضلي (Bulking)');
  const [addStartDate, setAddStartDate] = useState<string>(() => getTodayIsoString());
  const [addEndDate, setAddEndDate] = useState<string>(() => addMonthsToDate(getTodayIsoString(), 1));
  const [addMessage, setAddMessage] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const [isRefreshingCloud, setIsRefreshingCloud] = useState(false);

  const editDateSpan = calculateDateSpanBreakdown(editStartDate, editEndDate);
  const editSubDetails = calculateSubscriptionDetails({
    subscriptionStartDate: editStartDate,
    subscriptionEndDate: editEndDate,
    subscriptionStatus: editStatus,
  });

  const addDateSpan = calculateDateSpanBreakdown(addStartDate, addEndDate);
  const addSubDetails = calculateSubscriptionDetails({
    subscriptionStartDate: addStartDate,
    subscriptionEndDate: addEndDate,
    subscriptionStatus: 'active',
  });

  // WhatsApp share notification & inline delete confirmation states
  const [whatsappCopiedFor, setWhatsappCopiedFor] = useState<string | null>(null);
  const [copiedPortalFor, setCopiedPortalFor] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [confirmDeleteEmail, setConfirmDeleteEmail] = useState<string | null>(null);
  const [confirmDeleteDeclId, setConfirmDeleteDeclId] = useState<string | null>(null);

  // Display-only password reveal state (auto-hides after 10 seconds)
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const revealTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Non-blocking warning shown after copying private link when setup steps are missing
  const [missingStepsWarning, setMissingStepsWarning] = useState<{
    clientName: string;
    missingLabels: string[];
  } | null>(null);
  const missingWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read-only setup progress snapshot loaded defensively from existing Supabase tables
  const [setupSnapshot, setSetupSnapshot] = useState<{
    workoutsReadable: boolean;
    profilesReadable: boolean;
    measurementKeys: Set<string>;
    workoutKeys: Set<string>;
    nutritionKeys: Set<string>;
    analysisKeys: Set<string>;
  }>({
    workoutsReadable: false,
    profilesReadable: false,
    measurementKeys: new Set<string>(),
    workoutKeys: new Set<string>(),
    nutritionKeys: new Set<string>(),
    analysisKeys: new Set<string>(),
  });

  useEffect(() => {
    return () => {
      Object.values(revealTimersRef.current).forEach((timer) => clearTimeout(timer));
      if (missingWarningTimerRef.current) clearTimeout(missingWarningTimerRef.current);
    };
  }, []);

  const handleToggleRevealPassword = (emailKey: string) => {
    try {
      if (!emailKey) return;
      if (revealTimersRef.current[emailKey]) {
        clearTimeout(revealTimersRef.current[emailKey]);
        delete revealTimersRef.current[emailKey];
      }
      setRevealedPasswords((prev) => {
        const nextVisible = !prev[emailKey];
        if (nextVisible) {
          revealTimersRef.current[emailKey] = setTimeout(() => {
            setRevealedPasswords((curr) => {
              if (!curr[emailKey]) return curr;
              return { ...curr, [emailKey]: false };
            });
            delete revealTimersRef.current[emailKey];
          }, 10000);
        }
        return { ...prev, [emailKey]: nextVisible };
      });
    } catch {
      // Defensive fallback: ignore toggle errors
    }
  };

  const loadSetupSnapshot = useCallback(async () => {
    try {
      const client = getSupabaseClient();
      if (!client) return;

      const [workoutsRes, profilesRes] = await Promise.all([
        client
          .from('workouts')
          .select('client_id, day_key, workout_data')
          .in('day_key', ['profile_ext', 'all_days', 'nutrition_plan', 'assessment_bundle']),
        client.from('profiles').select('id, weight, height, muscle_mass, body_fat'),
      ]);

      const workoutsReadable = !workoutsRes.error && Array.isArray(workoutsRes.data);
      const profilesReadable = !profilesRes.error && Array.isArray(profilesRes.data);

      const measurementKeys = new Set<string>();
      const workoutKeys = new Set<string>();
      const nutritionKeys = new Set<string>();
      const analysisKeys = new Set<string>();

      const addKey = (set: Set<string>, rawKey: unknown) => {
        if (typeof rawKey === 'string') {
          const clean = rawKey.trim().toLowerCase();
          if (clean) set.add(clean);
        }
      };

      if (profilesReadable && Array.isArray(profilesRes.data)) {
        for (const p of profilesRes.data as Array<Record<string, unknown>>) {
          const hasMeasure =
            (typeof p.weight === 'number' && p.weight > 0) ||
            (typeof p.height === 'number' && p.height > 0) ||
            (typeof p.muscle_mass === 'number' && p.muscle_mass > 0) ||
            (typeof p.body_fat === 'number' && p.body_fat > 0);
          if (hasMeasure) {
            addKey(measurementKeys, p.id);
          }
        }
      }

      if (workoutsReadable && Array.isArray(workoutsRes.data)) {
        for (const row of workoutsRes.data as Array<Record<string, unknown>>) {
          const dayKey = typeof row.day_key === 'string' ? row.day_key : '';
          const clientId = row.client_id;
          const wData = row.workout_data as Record<string, unknown> | unknown[] | null | undefined;

          if (dayKey === 'profile_ext' && wData && typeof wData === 'object' && !Array.isArray(wData)) {
            const hasMeasure =
              (typeof wData.weight === 'number' && wData.weight > 0) ||
              (typeof wData.height === 'number' && wData.height > 0) ||
              (typeof wData.muscleMass === 'number' && wData.muscleMass > 0) ||
              (typeof wData.bodyFat === 'number' && wData.bodyFat > 0);
            if (hasMeasure) {
              addKey(measurementKeys, clientId);
              if (typeof wData.email === 'string') addKey(measurementKeys, wData.email);
            }
            if (wData.analysisData && typeof wData.analysisData === 'object') {
              addKey(analysisKeys, clientId);
              if (typeof wData.email === 'string') addKey(analysisKeys, wData.email);
            }
          } else if (dayKey === 'all_days') {
            if (Array.isArray(wData) && wData.length > 0) {
              addKey(workoutKeys, clientId);
            }
          } else if (dayKey === 'nutrition_plan') {
            const cats = Array.isArray(wData)
              ? wData
              : wData && typeof wData === 'object'
              ? (wData as { categories?: unknown[] }).categories
              : undefined;
            if (Array.isArray(cats) && cats.length > 0) {
              addKey(nutritionKeys, clientId);
            }
          } else if (dayKey === 'assessment_bundle') {
            if (
              wData &&
              typeof wData === 'object' &&
              !Array.isArray(wData) &&
              wData.analysisData &&
              typeof wData.analysisData === 'object'
            ) {
              addKey(analysisKeys, clientId);
            }
          }
        }
      }

      setSetupSnapshot({
        workoutsReadable,
        profilesReadable,
        measurementKeys,
        workoutKeys,
        nutritionKeys,
        analysisKeys,
      });
    } catch {
      // Defensive fallback: keep unreadable flags false so chips are safely omitted
    }
  }, []);

  const getSubscriberSetupSteps = useCallback(
    (user: UserCredentialRecord) => {
      try {
        const candidates = buildCandidateClientKeys(user?.id, user?.email).map((k) =>
          k.trim().toLowerCase()
        );
        if (candidates.length === 0) return [];

        const hasMatch = (set: Set<string>) => candidates.some((k) => set.has(k));
        const steps: Array<{ key: string; label: string; done: boolean }> = [];

        if (setupSnapshot.workoutsReadable || setupSnapshot.profilesReadable) {
          steps.push({
            key: 'measurements',
            label: 'القياسات',
            done: hasMatch(setupSnapshot.measurementKeys),
          });
        }
        if (setupSnapshot.workoutsReadable) {
          steps.push({
            key: 'workouts',
            label: 'التمارين',
            done: hasMatch(setupSnapshot.workoutKeys),
          });
          steps.push({
            key: 'nutrition',
            label: 'التغذية',
            done: hasMatch(setupSnapshot.nutritionKeys),
          });
          steps.push({
            key: 'analysis',
            label: 'التحليل',
            done: hasMatch(setupSnapshot.analysisKeys),
          });
        }
        return steps;
      } catch {
        return [];
      }
    },
    [setupSnapshot]
  );

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const refreshList = async (forceRemote = false) => {
    if (forceRemote) {
      setIsRefreshingCloud(true);
      try {
        const [subs, decls] = await Promise.all([
          fetchSubscribersFromSupabase(),
          fetchDeclarationsFromSupabase(),
        ]);
        if (subs) setCredentialsList(subs);
        if (decls) setDeclarations(decls);
        void loadSetupSnapshot();
      } finally {
        setIsRefreshingCloud(false);
      }
      return;
    }

    setCredentialsList(getAllSubscribersWithCredentials());
    void fetchDeclarationsFromSupabase().then((decls) => {
      if (decls) setDeclarations(decls);
    });
    void loadSetupSnapshot();
  };

  useEffect(() => {
    setDeclarations(initialDeclarations);
  }, [initialDeclarations]);

  useEffect(() => {
    void refreshList(true);

    const handleSyncEvent = () => {
      void refreshList(false);
    };

    const handleSetupDataUpdated = () => {
      void loadSetupSnapshot();
    };

    window.addEventListener('oao_credentials_updated', handleSyncEvent);
    window.addEventListener('oao_declarations_updated', handleSyncEvent);
    window.addEventListener('oao_profile_updated', handleSetupDataUpdated);
    window.addEventListener('oao_workouts_updated', handleSetupDataUpdated);
    window.addEventListener('oao_diet_updated', handleSetupDataUpdated);
    return () => {
      window.removeEventListener('oao_credentials_updated', handleSyncEvent);
      window.removeEventListener('oao_declarations_updated', handleSyncEvent);
      window.removeEventListener('oao_profile_updated', handleSetupDataUpdated);
      window.removeEventListener('oao_workouts_updated', handleSetupDataUpdated);
      window.removeEventListener('oao_diet_updated', handleSetupDataUpdated);
    };
  }, [loadSetupSnapshot]);

  const expiringSoon14DaysCount = useMemo(() => {
    try {
      let count = 0;
      for (const user of credentialsList) {
        if (!user || user.status === 'suspended' || user.status === 'expired') continue;
        const rowSub = calculateSubscriptionDetails({
          subscriptionStartDate: user.subscriptionStartDate,
          subscriptionEndDate: user.subscriptionEndDate,
          subscriptionDaysLeft: user.subscriptionDaysLeft,
          subscriptionStatus: user.status,
        });
        const hasReliableEnd =
          Boolean(user.subscriptionEndDate && rowSub.hasExplicitEndDate) ||
          (typeof user.subscriptionDaysLeft === 'number' &&
            Number.isFinite(user.subscriptionDaysLeft));
        if (
          hasReliableEnd &&
          !rowSub.isExpired &&
          Number.isFinite(rowSub.daysRemaining) &&
          rowSub.daysRemaining <= 14
        ) {
          count += 1;
        }
      }
      return count;
    } catch {
      return 0;
    }
  }, [credentialsList]);

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'OAO-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Open Edit Profile Modal
  const handleOpenEditModal = (user: UserCredentialRecord) => {
    const defaultStart = user.subscriptionStartDate || getTodayIsoString();
    const defaultEnd = user.subscriptionEndDate || addMonthsToDate(defaultStart, 1);
    setEditingSubscriber(user);
    setEditName(user.clientName);
    setEditEmail(user.email);
    setEditPassword(user.password || '');
    setEditPhone(user.phone || '');
    setEditPlan(user.plan);
    setEditAge(user.age);
    setEditBloodType(user.bloodType || '');
    setEditVisualGoal(user.visualGoal || 'تضخيم وبناء عضلي (Bulking)');
    setEditStatus(user.status === 'suspended' ? 'suspended' : 'active');
    setEditStartDate(defaultStart);
    setEditEndDate(defaultEnd);
    setEditMessage(null);
    setEditError(null);
  };

  const handleSaveEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubscriber || !editEmail.trim() || !editName.trim()) return;

    setEditError(null);
    setEditMessage(null);
    setIsSavingEdit(true);

    const trimmedNewPass = editPassword.trim() || editingSubscriber.password || 'OAO-2026';
    const nextClientCode =
      editPassword.trim() && editPassword.trim() !== editingSubscriber.password
        ? editPassword.trim()
        : editingSubscriber.clientCode;

    const computedSub = calculateSubscriptionDetails({
      subscriptionStartDate: editStartDate,
      subscriptionEndDate: editEndDate,
      subscriptionStatus: editStatus,
    });
    const nextStatus: UserCredentialRecord['status'] =
      editStatus === 'suspended'
        ? 'suspended'
        : computedSub.isExpired
        ? 'expired'
        : 'active';

    const res = await assignSubscriberPassword({
      id: editingSubscriber.id,
      email: editEmail.trim(),
      password: trimmedNewPass,
      clientName: editName.trim(),
      clientCode: nextClientCode,
      accessToken: editingSubscriber.accessToken,
      plan: editPlan,
      phone: editPhone.trim() || undefined,
      age: editAge ? Number(editAge) : undefined,
      bloodType: editBloodType || undefined,
      visualGoal: editVisualGoal || undefined,
      status: nextStatus,
      subscriptionStartDate: editStartDate || undefined,
      subscriptionEndDate: editEndDate || undefined,
      subscriptionDaysLeft: computedSub.daysRemaining,
      nutritionPlanLocked: editingSubscriber.nutritionPlanLocked,
    });

    setIsSavingEdit(false);

    if (!res.success || !res.syncedToSupabase) {
      setEditError(res.error || 'تعذر تحديث بيانات المشترك في Supabase.');
      return;
    }

    window.dispatchEvent(
      new CustomEvent('oao_profile_updated', {
        detail: {
          id: res.record?.id || editingSubscriber.id,
          email: editEmail.trim().toLowerCase(),
          name: editName.trim(),
          subscription_plan: editPlan,
          subscriptionStartDate: editStartDate,
          subscriptionEndDate: editEndDate,
          subscriptionDaysLeft: computedSub.daysRemaining,
          subscriptionStatus: nextStatus,
        },
      })
    );

    await refreshList(true);
    setEditMessage('تم حفظ وتحديث بيانات المشترك وتواريخ الاشتراك في Supabase بنجاح!');
    setTimeout(() => {
      setEditingSubscriber(null);
      setEditMessage(null);
      showNotice('تم تحديث ملف المشترك وفترة الاشتراك وحفظها سحابياً في Supabase.');
    }, 1000);
  };

  // Toggle Suspend / Active
  const handleToggleStatus = (email: string, clientName: string) => {
    const newStatus = toggleSubscriberStatus(email);
    void refreshList(false);
    showNotice(
      newStatus === 'suspended'
        ? `⚠️ تم إيقاف/تعليق حساب المشترك (${clientName})`
        : `✅ تم إعادة تفعيل حساب المشترك (${clientName})`
    );
  };

  // Toggle Nutrition Plan Lock per subscriber
  const handleToggleNutritionLock = (email: string, clientName: string, currentLock?: boolean) => {
    const nextVal = toggleSubscriberNutritionLock(email, !currentLock);
    void refreshList(false);
    showNotice(
      nextVal
        ? `🔒 تم قفل الخطة الغذائية عن (${clientName})`
        : `🔓 تم إتاحة الخطة الغذائية لـ (${clientName})`
    );
  };

  // Delete Subscriber permanently (inline 2-step confirmation)
  const handleDeleteSubscriber = async (user: UserCredentialRecord) => {
    const email = user.email;
    const clientName = user.clientName;
    if (confirmDeleteEmail !== email) {
      setConfirmDeleteEmail(email);
      setTimeout(() => setConfirmDeleteEmail((prev) => (prev === email ? null : prev)), 4000);
      return;
    }

    setConfirmDeleteEmail(null);
    const deleteRes = await deleteSubscriberRecord({
      email,
      id: user.id,
      accessToken: user.accessToken,
    });
    if (!deleteRes.success) {
      showNotice(`⚠️ ${deleteRes.error || 'تعذر حذف المشترك نهائياً من Supabase.'}`);
      return;
    }
    await refreshList(true);
    showNotice(`🗑️ تم حذف المشترك (${clientName}) وجميع بياناته نهائياً من Supabase.`);
  };

  // Delete Declaration permanently (inline 2-step confirmation + Supabase sync)
  const handleDeleteDeclaration = async (id: string) => {
    if (confirmDeleteDeclId !== id) {
      setConfirmDeleteDeclId(id);
      setTimeout(() => setConfirmDeleteDeclId((prev) => (prev === id ? null : prev)), 4000);
      return;
    }

    setConfirmDeleteDeclId(null);
    await deleteDeclarationFromSupabase(id);
    const updated = declarations.filter((d) => d.id !== id);
    setDeclarations(updated);
    showNotice(`🗑️ تم حذف العقد (${id}) من النظام وقاعدة البيانات.`);
  };

  const handleOpenResetModal = (user: UserCredentialRecord) => {
    setResetModalUser(user);
    setNewPasswordVal(user.password || handleGenerateRandomPassword());
    setResetMessage(null);
    setResetError(null);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordVal.trim()) return;

    setResetError(null);
    setResetMessage(null);
    setIsSavingReset(true);

    const res = await assignSubscriberPassword({
      id: resetModalUser.id,
      email: resetModalUser.email,
      password: newPasswordVal.trim(),
      clientName: resetModalUser.clientName,
      clientCode: newPasswordVal.trim(),
      accessToken: resetModalUser.accessToken,
      plan: resetModalUser.plan,
      phone: resetModalUser.phone,
      age: resetModalUser.age,
      bloodType: resetModalUser.bloodType,
      visualGoal: resetModalUser.visualGoal,
      status: resetModalUser.status,
      nutritionPlanLocked: resetModalUser.nutritionPlanLocked,
    });

    setIsSavingReset(false);

    if (!res.success || !res.syncedToSupabase) {
      setResetError(res.error || 'تعذر تحديث رمز الدخول في Supabase.');
      return;
    }

    await refreshList(true);
    setResetMessage('تم تعيين رمز الدخول وتحديث الحساب في Supabase بنجاح!');
    setTimeout(() => {
      setResetModalUser(null);
      setResetMessage(null);
      showNotice('تم تحديث رمز الدخول سحابياً.');
    }, 1000);
  };

  const handleSaveNewSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim() || !addName.trim() || !addPassword.trim()) return;

    setAddError(null);
    setAddMessage(null);
    setIsSavingAdd(true);

    const computedAddSub = calculateSubscriptionDetails({
      subscriptionStartDate: addStartDate,
      subscriptionEndDate: addEndDate,
      subscriptionStatus: 'active',
    });

    const res = await assignSubscriberPassword({
      email: addEmail.trim(),
      password: addPassword.trim(),
      clientName: addName.trim(),
      clientCode: addPassword.trim(),
      plan: addPlan,
      phone: addPhone.trim() || undefined,
      age: addAge ? Number(addAge) : undefined,
      bloodType: addBloodType || undefined,
      visualGoal: addVisualGoal || undefined,
      status: computedAddSub.isExpired ? 'expired' : 'active',
      subscriptionStartDate: addStartDate || undefined,
      subscriptionEndDate: addEndDate || undefined,
      subscriptionDaysLeft: computedAddSub.daysRemaining,
      nutritionPlanLocked: false,
    });

    setIsSavingAdd(false);

    if (!res.success || !res.syncedToSupabase) {
      setAddError(
        res.error || 'تعذر حفظ بيانات المشترك في جدول subscribers بـ Supabase. يرجى التحقق من الربط.'
      );
      return;
    }

    await refreshList(true);
    setAddMessage('تم حفظ المشترك وبياناته وفترة الاشتراك مباشرة في Supabase بنجاح!');
    setTimeout(() => {
      const today = getTodayIsoString();
      setIsAddModalOpen(false);
      setAddMessage(null);
      setAddError(null);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddPhone('');
      setAddAge('');
      setAddBloodType('');
      setAddStartDate(today);
      setAddEndDate(addMonthsToDate(today, 1));
      showNotice('تمت إضافة المشترك الجديد ومزامنة تواريخ اشتراكه مع Supabase بنجاح.');
      try {
        onSubscriberAdded?.(res.record);
      } catch {
        // Never disrupt existing add flow
      }
    }, 1000);
  };

  const handleCopySubscriberPortalLink = async (user: UserCredentialRecord) => {
    const tokenRes = await ensureSubscriberAccessToken(user);
    if (!tokenRes.success || !tokenRes.accessToken) {
      showNotice(`⚠️ ${tokenRes.error || 'تعذر تجهيز رابط المشترك الخاص.'}`);
      return;
    }
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const portalLink = `${origin}/s/${tokenRes.accessToken}`;
    await navigator.clipboard.writeText(portalLink);
    setCopiedPortalFor(user.email);
    setTimeout(() => setCopiedPortalFor((prev) => (prev === user.email ? null : prev)), 2500);
    showNotice(`🔗 تم نسخ رابط المشترك الخاص لـ (${user.clientName}) بنجاح!`);

    try {
      const steps = getSubscriberSetupSteps(user);
      const missingLabels = steps.filter((s) => !s.done).map((s) => s.label);
      if (missingWarningTimerRef.current) {
        clearTimeout(missingWarningTimerRef.current);
        missingWarningTimerRef.current = null;
      }
      if (missingLabels.length > 0) {
        setMissingStepsWarning({
          clientName: user.clientName || '',
          missingLabels,
        });
        missingWarningTimerRef.current = setTimeout(() => {
          setMissingStepsWarning(null);
          missingWarningTimerRef.current = null;
        }, 6500);
      } else {
        setMissingStepsWarning(null);
      }
    } catch {
      // Non-blocking warning must never interfere with link copy
    }
  };

  const handleCopyWhatsAppMessage = async (user: {
    id?: string;
    clientName: string;
    email: string;
    password?: string;
    plan: SubscriptionPlanTier;
    clientCode?: string;
    phone?: string;
    accessToken?: string;
  }) => {
    let accessToken = user.accessToken;
    if (!accessToken) {
      const tokenRes = await ensureSubscriberAccessToken(user);
      if (tokenRes.success && tokenRes.accessToken) {
        accessToken = tokenRes.accessToken;
      }
    }

    const msg = generateWhatsAppWelcomeMessage({
      clientName: user.clientName,
      email: user.email,
      password: user.password,
      plan: user.plan,
      clientCode: user.clientCode,
      phone: user.phone,
      accessToken,
    });

    await navigator.clipboard.writeText(msg);
    setWhatsappCopiedFor(user.email);
    setTimeout(() => setWhatsappCopiedFor(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#0B132B]/80 p-6 rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-lg">
        <div>
          <h2 className="text-xl font-black text-[#0B132B] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-500 dark:text-orange-400" />
            <span>إدارة المشتركين وكلمات المرور والاعتمادات (Full CRUD)</span>
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mt-1">
            إدارة شاملة لحسابات المتدربين: تعديل الملف، تعيين كلمة المرور، التعليق، قفل النظام الغذائي، والحذف النهائي
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const today = getTodayIsoString();
              setAddError(null);
              setAddMessage(null);
              setAddPassword(handleGenerateRandomPassword());
              setAddStartDate(today);
              setAddEndDate(addMonthsToDate(today, 1));
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة وتفعيل مشترك جديد</span>
          </button>

          <button
            onClick={() => void refreshList(true)}
            disabled={isRefreshingCloud}
            className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
            title="تحديث قائمة المشتركين مباشرة من Supabase"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-orange-500 dark:text-orange-400 ${isRefreshingCloud ? 'animate-spin' : ''}`} />
            <span>تحديث السحابة</span>
          </button>

          <button
            onClick={onCopySubscribeLink}
            className="px-4 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/20 dark:hover:bg-orange-500/30 border border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{copiedLink ? 'تم نسخ الرابط!' : 'رابط التسجيل (/subscribe)'}</span>
          </button>
        </div>
      </div>

      {/* Global Notification */}
      {actionNotice && (
        <div className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-500/20 border border-orange-300 dark:border-orange-500/40 text-orange-950 dark:text-white text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Non-blocking Missing Setup Steps Warning after Copying Link */}
      {missingStepsWarning && missingStepsWarning.missingLabels.length > 0 && (
        <div className="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs font-bold flex items-center justify-between gap-2 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              {missingStepsWarning.clientName ? `(${missingStepsWarning.clientName}) — ` : ''}
              تنبيه: ما زال ينقص: {missingStepsWarning.missingLabels.join('، ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setMissingStepsWarning(null)}
            className="text-amber-700 hover:text-amber-950 dark:text-amber-300 dark:hover:text-white cursor-pointer shrink-0"
            aria-label="إغلاق التنبيه"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* WhatsApp Toast Notice */}
      {whatsappCopiedFor && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/50 text-emerald-950 dark:text-white text-xs font-bold flex items-center justify-between shadow-lg dark:shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              تم نسخ رسالة الترحيب وبيانات الدخول المجهزة للواتساب بنجاح! الصقها الآن في محادثة المشترك. 📲
            </span>
          </div>
          <button
            onClick={() => setWhatsappCopiedFor(null)}
            className="text-slate-500 hover:text-[#0B132B] dark:text-slate-400 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ACTIVE SUBSCRIBERS TABLE */}
      <div
        id="oao-subscribers-table"
        className="rounded-3xl bg-white dark:bg-[#0B132B]/90 border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl space-y-4 p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <h3 className="text-base font-black text-[#0B132B] dark:text-white">
                قائمة المشتركين وبيانات الدخول المعتمدة ({credentialsList.length})
              </h3>
            </div>
            {expiringSoon14DaysCount >= 1 && (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-500/15 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold">
                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  {expiringSoon14DaysCount === 1
                    ? 'اشتراك واحد ينتهي خلال 14 يوم'
                    : expiringSoon14DaysCount <= 10
                    ? `${expiringSoon14DaysCount} اشتراكات تنتهي خلال 14 يوم`
                    : `${expiringSoon14DaysCount} اشتراكاً ينتهي خلال 14 يوم`}
                </span>
              </div>
            )}
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            مزامنة سحابية مباشرة عبر جدول subscribers في Supabase
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 dark:bg-[#070e24] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
              <tr>
                <th className="p-3.5 font-bold">اسم المتدرب</th>
                <th className="p-3.5 font-bold">البريد الإلكتروني</th>
                <th className="p-3.5 font-bold">نوع الباقة</th>
                <th className="p-3.5 font-bold">الحالة</th>
                <th className="p-3.5 font-bold">جاهزية الإعداد</th>
                <th className="p-3.5 font-bold">الهدف التصوري</th>
                <th className="p-3.5 font-bold">كلمة المرور</th>
                <th className="p-3.5 font-bold text-center">الإجراءات والتحكم (CRUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
              {credentialsList.map((user) => (
                <tr key={user.email} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="p-3.5 font-black text-[#0B132B] dark:text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-orange-500/15 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold">
                      {user.clientName.charAt(0)}
                    </span>
                    <div>
                      <div>{user.clientName}</div>
                      {user.phone && (
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-normal">
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-slate-700 dark:text-slate-300">
                    <div>{user.email}</div>
                    {user.clientCode && (
                      <div className="text-[10px] text-amber-600 dark:text-amber-400/90 mt-0.5">
                        {user.clientCode}
                      </div>
                    )}
                  </td>
                  <td className="p-3.5">
                    {user.plan === 'VIP' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-400/50 dark:border-amber-400/40 font-bold">
                        <Crown className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        <span>VIP بلاتينيوم</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 font-bold">
                        <Shield className="w-3 h-3 text-slate-600 dark:text-slate-300" />
                        <span>Standard قياسية</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5">
                    {(() => {
                      try {
                        const rowSub = calculateSubscriptionDetails({
                          subscriptionStartDate: user.subscriptionStartDate,
                          subscriptionEndDate: user.subscriptionEndDate,
                          subscriptionDaysLeft: user.subscriptionDaysLeft,
                          subscriptionStatus: user.status,
                        });
                        const hasReliableEnd =
                          Boolean(user.subscriptionEndDate && rowSub.hasExplicitEndDate) ||
                          (typeof user.subscriptionDaysLeft === 'number' &&
                            Number.isFinite(user.subscriptionDaysLeft));
                        const isExpiredDisplay =
                          user.status !== 'suspended' &&
                          (rowSub.isExpired || user.status === 'expired');
                        const isExpiringWithin14 =
                          user.status !== 'suspended' &&
                          !isExpiredDisplay &&
                          hasReliableEnd &&
                          Number.isFinite(rowSub.daysRemaining) &&
                          rowSub.daysRemaining <= 14;

                        return (
                          <div className="flex flex-col items-start gap-1">
                            {user.status === 'suspended' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400/50 dark:border-rose-500/40 font-bold text-[11px]">
                                <UserX className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                <span>موقوف / معلق</span>
                              </span>
                            ) : isExpiredDisplay ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-400/50 dark:border-rose-500/40 font-bold text-[11px]">
                                <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                                <span>منتهي</span>
                              </span>
                            ) : isExpiringWithin14 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/50 dark:border-amber-500/40 font-bold text-[11px]">
                                <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                <span>ينتهي قريباً</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-400/50 dark:border-emerald-500/40 font-bold text-[11px]">
                                <UserCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                <span>نشط</span>
                              </span>
                            )}

                            {user.subscriptionEndDate && Number.isFinite(rowSub.daysRemaining) && (
                              <span
                                className={`text-[10px] font-mono ${
                                  isExpiredDisplay
                                    ? 'text-rose-600 dark:text-rose-400/90'
                                    : isExpiringWithin14
                                    ? 'text-amber-700 dark:text-amber-300'
                                    : 'text-slate-500 dark:text-slate-400'
                                }`}
                                title={`من ${rowSub.startDate} إلى ${rowSub.endDate}`}
                              >
                                {isExpiredDisplay
                                  ? `انتهى ${rowSub.endDate}`
                                  : `متبقي ${rowSub.daysRemaining} يوم (${rowSub.formattedRemainingDurationAr})`}
                              </span>
                            )}
                          </div>
                        );
                      } catch {
                        return <span className="text-slate-400 text-[11px]">—</span>;
                      }
                    })()}
                  </td>
                  <td className="p-3.5 min-w-[165px]">
                    {(() => {
                      const steps = getSubscriberSetupSteps(user);
                      if (steps.length === 0) {
                        return <span className="text-slate-400 text-[11px]">—</span>;
                      }
                      const doneCount = steps.filter((s) => s.done).length;
                      return (
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-black border ${
                                doneCount === steps.length
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40'
                                  : doneCount > 0
                                  ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400/40'
                                  : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10'
                              }`}
                            >
                              {doneCount}/{steps.length}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {steps.map((step) => (
                              <span
                                key={step.key}
                                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                  step.done
                                    ? 'bg-emerald-500/15 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-400/40 dark:border-emerald-500/30'
                                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10'
                                }`}
                              >
                                {step.done && <Check className="w-2.5 h-2.5 shrink-0" />}
                                <span>{step.label}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-3.5 text-slate-700 dark:text-slate-300">
                    <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-black/40 border border-orange-200 dark:border-white/5 text-[11px] font-medium text-orange-700 dark:text-orange-300">
                      {user.visualGoal || 'غير محدد'}
                    </span>
                  </td>
                  <td className="p-3.5 font-mono text-[#0B132B] dark:text-slate-200">
                    {user.password ? (
                      <div className="inline-flex items-center gap-1.5">
                        <span
                          className="px-2 py-1 rounded-md bg-slate-100 dark:bg-black/50 border border-slate-300 dark:border-white/10 font-bold tracking-wider"
                          dir="ltr"
                        >
                          {revealedPasswords[user.email] ? user.password : '••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleToggleRevealPassword(user.email)}
                          className="p-1 rounded-md bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title={
                            revealedPasswords[user.email]
                              ? 'إخفاء كلمة المرور'
                              : 'إظهار كلمة المرور لمدة 10 ثوانٍ'
                          }
                          aria-label={
                            revealedPasswords[user.email]
                              ? 'إخفاء كلمة المرور'
                              : 'إظهار كلمة المرور'
                          }
                        >
                          {revealedPasswords[user.email] ? (
                            <EyeOff className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-1.5 flex-wrap">
                      {/* Edit Profile & Password Button */}
                      <button
                        onClick={() => handleOpenEditModal(user)}
                        className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/15 dark:hover:bg-blue-500/25 border border-blue-300 dark:border-blue-500/40 text-blue-700 dark:text-blue-300 dark:hover:text-white transition-all cursor-pointer"
                        title="تعديل ملف المشترك والبيانات"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>

                      {/* Suspend / Activate Toggle Button */}
                      <button
                        onClick={() => handleToggleStatus(user.email, user.clientName)}
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          user.status === 'suspended'
                            ? 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/15 dark:hover:bg-amber-500/25 border-amber-300 dark:border-amber-500/40 text-amber-700 dark:text-amber-300'
                        }`}
                        title={user.status === 'suspended' ? 'إلغاء التعليق وتفعيل الحساب' : 'تعليق/إيقاف حساب المشترك'}
                      >
                        {user.status === 'suspended' ? (
                          <UserCheck className="w-3.5 h-3.5" />
                        ) : (
                          <UserX className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {/* Nutrition Plan Lock Toggle */}
                      <button
                        onClick={() =>
                          handleToggleNutritionLock(
                            user.email,
                            user.clientName,
                            user.nutritionPlanLocked
                          )
                        }
                        className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                          user.nutritionPlanLocked
                            ? 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-500/20 dark:hover:bg-amber-500/30 border-amber-400 dark:border-amber-500/50 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border-slate-300 dark:border-white/10 text-slate-600 dark:text-slate-400'
                        }`}
                        title={
                          user.nutritionPlanLocked
                            ? 'النظام الغذائي مقفل عن هذا المشترك (انقر للفتح)'
                            : 'قفل النظام الغذائي عن هذا المشترك'
                        }
                      >
                        {user.nutritionPlanLocked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        )}
                      </button>

                      {/* 1-Click Copy Isolated Subscriber /s/token Link Button */}
                      <button
                        onClick={() => handleCopySubscriberPortalLink(user)}
                        className={`px-2 py-1.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          copiedPortalFor === user.email
                            ? 'bg-emerald-50 dark:bg-emerald-500/25 border-emerald-400 text-emerald-700 dark:text-emerald-200'
                            : 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/15 dark:hover:bg-orange-500/25 border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 dark:hover:text-white'
                        }`}
                        title="نسخ رابط المشترك الخاص (/s/token)"
                      >
                        {copiedPortalFor === user.email ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>تم النسخ!</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span className="hidden xl:inline">نسخ رابط المشترك الخاص</span>
                          </>
                        )}
                      </button>

                      {/* Direct WhatsApp Send Button (hidden if no phone or no private token) */}
                      {(() => {
                        try {
                          const hasPhone = Boolean(user?.phone && user.phone.trim());
                          const hasToken = Boolean(user?.accessToken && user.accessToken.trim());
                          if (!hasPhone || !hasToken) return null;

                          const formattedPhone = formatWhatsAppPhone(user.phone);
                          const msg = generateWhatsAppWelcomeMessage({
                            clientName: user.clientName,
                            email: user.email,
                            password: user.password,
                            plan: user.plan,
                            clientCode: user.clientCode,
                            phone: user.phone,
                            accessToken: user.accessToken,
                          });
                          const waHref = formattedPhone
                            ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`
                            : `https://wa.me/?text=${encodeURIComponent(msg)}`;

                          return (
                            <a
                              href={waHref}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 dark:hover:text-white text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                              title="إرسال عبر واتساب"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span className="hidden xl:inline">إرسال عبر واتساب</span>
                            </a>
                          );
                        } catch {
                          return null;
                        }
                      })()}

                      {/* WhatsApp Quick Share Button */}
                      <button
                        onClick={() => handleCopyWhatsAppMessage(user)}
                        className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 dark:hover:text-white transition-all cursor-pointer"
                        title="نسخ رسالة الترحيب للواتساب"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Quick Password Modal Button */}
                      <button
                        onClick={() => handleOpenResetModal(user)}
                        className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/15 dark:hover:bg-orange-500/25 border border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 dark:hover:text-white transition-all cursor-pointer"
                        title="تغيير كلمة المرور سريعاً"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                      </button>

                      {/* Permanent Delete Button (Inline 2-Step Confirmation) */}
                      <button
                        onClick={() => handleDeleteSubscriber(user)}
                        className={`px-2 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                          confirmDeleteEmail === user.email
                            ? 'bg-rose-600 border-rose-400 text-white font-black text-[10px] animate-pulse'
                            : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300 dark:hover:text-rose-100'
                        }`}
                        title="حذف المشترك نهائياً من قاعدة البيانات"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {confirmDeleteEmail === user.email && <span>تأكيد الحذف</span>}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SIGNED CONTRACTS SECTION */}
      {declarations.length > 0 && (
        <div className="rounded-3xl bg-white dark:bg-[#0B132B]/90 border border-slate-200 dark:border-white/10 overflow-hidden shadow-sm dark:shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <h3 className="text-base font-black text-[#0B132B] dark:text-white">
                العقود الرقمية الموقعة والإقرارات ({declarations.length})
              </h3>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              إدارة العقود المحفوظة ومطالعة فحوصات InBody المرفقة
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-100 dark:bg-[#070e24] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-white/10">
                <tr>
                  <th className="p-3 font-bold">رقم العقد</th>
                  <th className="p-3 font-bold">اسم المتدرب</th>
                  <th className="p-3 font-bold">الباقة والخطة</th>
                  <th className="p-3 font-bold">الهدف والعمر</th>
                  <th className="p-3 font-bold">فحص InBody</th>
                  <th className="p-3 font-bold">تاريخ التوقيع</th>
                  <th className="p-3 font-bold text-center">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 dark:divide-white/5">
                {declarations.map((decl) => (
                  <tr key={decl.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-mono font-bold text-orange-600 dark:text-orange-400">{decl.id}</td>
                    <td className="p-3 font-bold text-[#0B132B] dark:text-white">{decl.fullName}</td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      <div>
                        {decl.subscription_plan === 'VIP' ? 'VIP بلاتينيوم' : 'Standard قياسي'} (
                        {decl.durationLabelAr || '3 شهور'})
                      </div>
                      <div className="text-[10px] text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                        {decl.paymentInstallments === 'full' || !decl.paymentInstallments
                          ? 'دفعة كاملة'
                          : decl.paymentInstallments === '2_installments'
                          ? `دفعتين (${decl.installmentAmount || Math.round(decl.planPrice / 2)} ر.س)`
                          : `3 دفعات (${decl.installmentAmount || Math.round(decl.planPrice / 3)} ر.س)`}
                      </div>
                    </td>
                    <td className="p-3 text-slate-700 dark:text-slate-300">
                      <div className="text-orange-600 dark:text-orange-300 font-medium">
                        {decl.visualGoal || 'غير محدد'}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                        {decl.age ? `${decl.age} سنة` : '—'} • {decl.bloodType || '—'}
                      </div>
                    </td>
                    <td className="p-3">
                      {decl.inBodyFileUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setInBodyPreview({
                              fileName: decl.inBodyFileName || 'inbody_scan',
                              fileUrl: decl.inBodyFileUrl!,
                              clientName: decl.fullName,
                            })
                          }
                          className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:hover:bg-emerald-500/25 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>عرض InBody</span>
                        </button>
                      ) : (
                        <span className="text-slate-500 text-[11px]">غير مرفق</span>
                      )}
                    </td>
                    <td className="p-3 text-slate-500 dark:text-slate-400">{decl.signedTimestamp}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onOpenDeclaration(decl)}
                          className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 dark:bg-orange-500/15 dark:hover:bg-orange-500/25 border border-orange-300 dark:border-orange-500/40 text-orange-700 dark:text-orange-300 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                          title="عرض العقد PDF"
                        >
                          <Eye className="w-3 h-3" />
                          <span>PDF</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDeclaration(decl.id)}
                          className={`px-2 py-1 rounded-lg border font-bold text-xs inline-flex items-center gap-1 cursor-pointer transition-all ${
                            confirmDeleteDeclId === decl.id
                              ? 'bg-rose-600 border-rose-400 text-white text-[10px] animate-pulse'
                              : 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-500/15 dark:hover:bg-rose-500/25 border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
                          }`}
                          title="حذف العقد"
                        >
                          <Trash2 className="w-3 h-3" />
                          {confirmDeleteDeclId === decl.id && <span>تأكيد؟</span>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INBODY SCAN PREVIEW MODAL */}
      {inBodyPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B132B] border-2 border-emerald-500/40 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative text-[#0B132B] dark:text-white space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-base font-black text-[#0B132B] dark:text-white">
                    تقرير فحص InBody — {inBodyPreview.clientName}
                  </h3>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    {inBodyPreview.fileName}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={inBodyPreview.fileUrl}
                  download={inBodyPreview.fileName}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تنزيل الملف</span>
                </a>
                <button
                  onClick={() => setInBodyPreview(null)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-500 hover:text-[#0B132B] dark:text-slate-400 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-black/60 rounded-2xl p-3 flex items-center justify-center min-h-[300px] border border-slate-200 dark:border-white/10">
              {inBodyPreview.fileUrl.startsWith('data:image/') ? (
                <img
                  src={inBodyPreview.fileUrl}
                  alt="InBody Scan"
                  className="max-h-[60vh] max-w-full object-contain rounded-lg"
                />
              ) : inBodyPreview.fileUrl.startsWith('data:application/pdf') ? (
                <iframe
                  src={inBodyPreview.fileUrl}
                  title="InBody PDF"
                  className="w-full h-[55vh] rounded-lg border-0"
                />
              ) : (
                <div className="text-center p-6 space-y-3">
                  <FileText className="w-12 h-12 text-emerald-600 dark:text-emerald-400 mx-auto" />
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    ملف الفحص جاهز للتنزيل والمطالعة على جهازك
                  </p>
                  <a
                    href={inBodyPreview.fileUrl}
                    download={inBodyPreview.fileName}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل {inBodyPreview.fileName}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL EDIT SUBSCRIBER PROFILE MODAL */}
      {editingSubscriber && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-xl p-6 shadow-2xl relative text-[#0B132B] dark:text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingSubscriber(null)}
              className="absolute top-5 left-5 text-slate-500 hover:text-[#0B132B] dark:text-slate-400 dark:hover:text-white p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
              <div className="p-3 rounded-2xl bg-orange-500/15 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                <Edit3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0B132B] dark:text-white">تعديل ملف وبيانات المشترك</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  {editingSubscriber.clientName} ({editingSubscriber.email})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditProfile} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم المشترك:</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">رقم الجوال:</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">نوع الباقة:</label>
                  <select
                    value={editPlan}
                    onChange={(e) => setEditPlan(e.target.value as SubscriptionPlanTier)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-bold"
                  >
                    <option value="VIP">الباقة البلاتينية النخبوية (VIP)</option>
                    <option value="standard">الباقة القياسية (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">حالة الحساب:</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'active' | 'suspended')}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-bold"
                  >
                    <option value="active">نشط (Active)</option>
                    <option value="suspended">معلق / موقوف (Suspended)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">الهدف التصوري:</label>
                  <select
                    value={editVisualGoal}
                    onChange={(e) => setEditVisualGoal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-bold"
                  >
                    <option value="تضخيم وبناء عضلي (Bulking)">تضخيم وبناء عضلي (Bulking)</option>
                    <option value="تنشيف وحرق دهون (Cut)">تنشيف وحرق دهون (Cut)</option>
                    <option value="ثبات وإعادة تشكيل (Maintenance)">ثبات وإعادة تشكيل (Maintenance)</option>
                    <option value="كيتو لو كارب (Keto)">كيتو لو كارب (Keto)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">العمر:</label>
                    <input
                      type="number"
                      min={14}
                      max={90}
                      value={editAge || ''}
                      onChange={(e) => setEditAge(e.target.value ? Number(e.target.value) : undefined)}
                      placeholder="25"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">فصيلة الدم:</label>
                    <select
                      value={editBloodType}
                      onChange={(e) => setEditBloodType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono font-bold"
                    >
                      <option value="">اختر</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subscription Start & End Date Calculator */}
              <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-[#070e24]/90 border border-orange-300 dark:border-orange-500/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                    <span>تواريخ ومدة الاشتراك (بالأشهر والأيام):</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'شهر', months: 1 },
                      { label: '3 شهور', months: 3 },
                      { label: '6 شهور', months: 6 },
                      { label: 'سنة', months: 12 },
                    ].map((preset) => (
                      <button
                        key={preset.months}
                        type="button"
                        onClick={() => {
                          const base = editStartDate || getTodayIsoString();
                          setEditStartDate(base);
                          setEditEndDate(addMonthsToDate(base, preset.months));
                        }}
                        className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/30 border border-orange-500/30 text-[10px] font-bold text-orange-700 dark:text-orange-200 cursor-pointer transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      من تاريخ (بداية الاشتراك):
                    </label>
                    <input
                      type="date"
                      required
                      value={editStartDate}
                      onChange={(e) => setEditStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      إلى تاريخ (نهاية الاشتراك):
                    </label>
                    <input
                      type="date"
                      required
                      value={editEndDate}
                      onChange={(e) => setEditEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                    editSubDetails.isExpired
                      ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
                      : 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>المدة المحسوبة: {editDateSpan.formattedWithTotalAr}</span>
                  </span>
                  <span className={editSubDetails.isExpired ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}>
                    {editSubDetails.isExpired
                      ? 'منتهي — سيتم قفل الحساب تلقائياً 🔒'
                      : `المتبقي من اليوم: ${editSubDetails.daysRemaining} يوم (${editSubDetails.formattedRemainingDurationAr})`}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">كلمة المرور:</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setEditPassword(handleGenerateRandomPassword())}
                    className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 cursor-pointer"
                    title="توليد كلمة سر"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-200 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              {editMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingSubscriber(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-lg cursor-pointer disabled:opacity-60"
                >
                  {isSavingEdit ? 'جاري الحفظ في Supabase...' : 'حفظ وتحديث الملف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK PASSWORD RESET MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-[#0B132B] dark:text-white space-y-5">
            <button
              onClick={() => setResetModalUser(null)}
              className="absolute top-5 left-5 text-slate-500 hover:text-[#0B132B] dark:text-slate-400 dark:hover:text-white p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/15 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0B132B] dark:text-white">إعادة تعيين كلمة المرور</h3>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-bold">
                  {resetModalUser.clientName} ({resetModalUser.email})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                  كلمة المرور الجديدة المخصصة:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white font-mono text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPasswordVal(handleGenerateRandomPassword())}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="توليد كلمة مرور جديدة"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>توليد</span>
                  </button>
                </div>
              </div>

              {resetError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-200 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{resetError}</span>
                </div>
              )}

              {resetMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resetMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyWhatsAppMessage({
                      ...resetModalUser,
                      password: newPasswordVal,
                    })
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-600/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>نسخ للواتساب</span>
                </button>

                <button
                  type="submit"
                  disabled={isSavingReset}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-md cursor-pointer disabled:opacity-60"
                >
                  {isSavingReset ? 'جاري التحديث...' : 'حفظ وتحديث كلمة المرور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADD SUBSCRIBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-[#0B132B] dark:text-white space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 left-5 text-slate-500 hover:text-[#0B132B] dark:text-slate-400 dark:hover:text-white p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/15 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-500/30">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#0B132B] dark:text-white">إضافة وتفعيل مشترك جديد</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  تسجيل بيانات المشترك وتعيين كلمة مرور مخصصة تمكنه من الدخول مباشرة
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewSubscriber} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">اسم المشترك الثلاثي:</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="مثال: فيصل خالد العتيبي"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="faisal@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">رقم الواتساب:</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">نوع الباقة التدريبية:</label>
                  <select
                    value={addPlan}
                    onChange={(e) => setAddPlan(e.target.value as SubscriptionPlanTier)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-bold"
                  >
                    <option value="VIP">الباقة البلاتينية النخبوية (VIP)</option>
                    <option value="standard">الباقة القياسية (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">الهدف التصوري:</label>
                  <select
                    value={addVisualGoal}
                    onChange={(e) => setAddVisualGoal(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-bold"
                  >
                    <option value="تضخيم وبناء عضلي (Bulking)">تضخيم وبناء عضلي (Bulking)</option>
                    <option value="تنشيف وحرق دهون (Cut)">تنشيف وحرق دهون (Cut)</option>
                    <option value="ثبات وإعادة تشكيل (Maintenance)">ثبات وإعادة تشكيل (Maintenance)</option>
                    <option value="كيتو لو كارب (Keto)">كيتو لو كارب (Keto)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">كلمة المرور المخصصة:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setAddPassword(handleGenerateRandomPassword())}
                      className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 cursor-pointer"
                      title="توليد كلمة سر"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">العمر:</label>
                    <input
                      type="number"
                      min={14}
                      max={90}
                      value={addAge}
                      onChange={(e) => setAddAge(e.target.value)}
                      placeholder="25"
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">فصيلة الدم:</label>
                    <select
                      value={addBloodType}
                      onChange={(e) => setAddBloodType(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono font-bold"
                    >
                      <option value="">اختر</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Subscription Start & End Date Calculator */}
              <div className="p-4 rounded-2xl bg-orange-50/70 dark:bg-[#070e24]/90 border border-orange-300 dark:border-orange-500/30 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-xs font-black text-orange-700 dark:text-orange-300 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                    <span>تواريخ ومدة الاشتراك (بالأشهر والأيام):</span>
                  </label>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {[
                      { label: 'شهر', months: 1 },
                      { label: '3 شهور', months: 3 },
                      { label: '6 شهور', months: 6 },
                      { label: 'سنة', months: 12 },
                    ].map((preset) => (
                      <button
                        key={preset.months}
                        type="button"
                        onClick={() => {
                          const base = addStartDate || getTodayIsoString();
                          setAddStartDate(base);
                          setAddEndDate(addMonthsToDate(base, preset.months));
                        }}
                        className="px-2 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/30 border border-orange-500/30 text-[10px] font-bold text-orange-700 dark:text-orange-200 cursor-pointer transition-colors"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      من تاريخ (بداية الاشتراك):
                    </label>
                    <input
                      type="date"
                      required
                      value={addStartDate}
                      onChange={(e) => setAddStartDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                      إلى تاريخ (نهاية الاشتراك):
                    </label>
                    <input
                      type="date"
                      required
                      value={addEndDate}
                      onChange={(e) => setAddEndDate(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-black/50 border border-slate-300 dark:border-white/15 focus:border-orange-500 text-[#0B132B] dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>

                <div
                  className={`p-2.5 rounded-xl border text-[11px] font-bold flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 ${
                    addSubDetails.isExpired
                      ? 'bg-rose-50 dark:bg-rose-500/15 border-rose-300 dark:border-rose-500/40 text-rose-800 dark:text-rose-200'
                      : 'bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 shrink-0" />
                    <span>المدة المحسوبة: {addDateSpan.formattedWithTotalAr}</span>
                  </span>
                  <span className={addSubDetails.isExpired ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-700 dark:text-emerald-300'}>
                    {addSubDetails.isExpired
                      ? 'تنبيه: التاريخ منتهي وسيكون مقفلاً 🔒'
                      : `المتبقي من اليوم: ${addSubDetails.daysRemaining} يوم (${addSubDetails.formattedRemainingDurationAr})`}
                  </span>
                </div>
              </div>

              {addError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/20 border border-rose-300 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-200 font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                  <span>{addError}</span>
                </div>
              )}

              {addMessage && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{addMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSavingAdd}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-lg cursor-pointer disabled:opacity-60"
                >
                  {isSavingAdd ? 'جاري الحفظ في Supabase...' : 'تفعيل الحساب واعتماد كلمة المرور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
