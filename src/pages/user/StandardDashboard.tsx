import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Language,
  SubscriptionPlanTier,
} from '../../types';
import {
  INITIAL_WORKOUT_DAYS,
  createNeutralClientProfile,
} from '../../data/initialData';
import { BrandLogo } from '../../components/BrandLogo';
import { AthleteBiometricsBar } from '../../components/AthleteBiometricsBar';
import { AthleteDietPlanSection } from '../../components/nutrition/AthleteDietPlanSection';
import { WorkoutSchedule } from '../../components/WorkoutSchedule';
import { WaterBottleTracker } from '../../components/WaterBottleTracker';
import { BMIGauge } from '../../components/BMIGauge';
import { ClientNotesSection } from '../../components/ClientNotesSection';
import { RestTimer } from '../../components/RestTimer';
import { VideoModal } from '../../components/VideoModal';
import { SubscriptionDurationBanner } from '../../components/SubscriptionDurationBanner';
import { SubscriptionExpiredLockScreen } from '../../components/SubscriptionExpiredLockScreen';
import { CoachPasskeyModal } from '../../components/CoachPasskeyModal';
import { calculateSubscriptionDetails } from '../../lib/subscriptionUtils';
import {
  fetchNotesFromSupabase,
  getCanonicalClientKey,
  loadClientWorkspaceFromSupabase,
  syncNoteToSupabase,
  syncProfileToSupabase,
  syncWorkoutDaysToSupabase,
} from '../../lib/supabase';
import { normalizeWorkoutDays } from '../../lib/workoutUtils';
import {
  getCurrentUserSession,
  clearCurrentUserSession,
  fetchSubscribersFromSupabase,
  isCoachAuthenticated,
} from '../../lib/authStore';
import { useOaoTheme } from '../../lib/themeUtils';
import {
  Home,
  LogOut,
  Shield,
  Crown,
  Clock,
  ArrowRight,
  Dumbbell,
  Lock,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';

export interface StandardDashboardProps {
  tokenSubscriber?: {
    id?: string;
    email: string;
    name: string;
    plan: SubscriptionPlanTier;
    clientCode?: string;
    phone?: string;
    accessToken?: string;
    subscriptionStartDate?: string;
    subscriptionEndDate?: string;
    status?: 'active' | 'suspended' | 'expiring' | 'expired';
  } | null;
  isolatedByToken?: boolean;
  onLogoutOverride?: () => void;
}

export const StandardDashboard: React.FC<StandardDashboardProps> = ({
  tokenSubscriber = null,
  isolatedByToken = false,
  onLogoutOverride,
}) => {
  const navigate = useNavigate();

  // Load language & reactive theme from shared storage
  const [language] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });
  const { theme, toggleTheme } = useOaoTheme();
  const isLight = theme === 'light';

  const [accessStatus, setAccessStatus] = useState<
    'checking' | 'authorized' | 'unauthorized' | 'tier_mismatch' | 'suspended'
  >('checking');

  // Client Profile state (Hydrated strictly from Supabase + active session)
  const [profile, setProfile] = useState<ClientProfile>(() => {
    const activeSub = tokenSubscriber || getCurrentUserSession();
    const subStatus =
      tokenSubscriber?.status || getCurrentUserSession()?.subscriptionStatus || 'active';
    return createNeutralClientProfile({
      id: activeSub?.id || activeSub?.email || '',
      email: activeSub?.email || '',
      name: activeSub?.name || 'مشترك',
      nameEn: activeSub?.name || 'Athlete',
      clientCode: activeSub?.clientCode,
      accessToken: activeSub?.accessToken,
      phone: activeSub?.phone,
      subscription_plan: 'standard',
      subscriptionStartDate: activeSub?.subscriptionStartDate,
      subscriptionEndDate: activeSub?.subscriptionEndDate,
      subscriptionStatus: subStatus,
    });
  });

  // Workouts state (Hydrated strictly from Supabase)
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(INITIAL_WORKOUT_DAYS);

  // Notes state (Hydrated strictly from Supabase)
  const [notes, setNotes] = useState<ClientNote[]>([]);

  // Verify authorization against Supabase & hydrate strictly isolated workspace
  useEffect(() => {
    let mounted = true;
    const verifyAndHydrate = async () => {
      setAccessStatus('checking');
      const sessionUser = getCurrentUserSession();
      const targetSub = tokenSubscriber || sessionUser;

      if (!targetSub || (!targetSub.email && !targetSub.id)) {
        if (mounted) setAccessStatus('unauthorized');
        return;
      }

      const targetEmail = (targetSub.email || '').trim().toLowerCase();
      const targetId = (targetSub.id || '').trim();
      const isCoachSession = !isolatedByToken && isCoachAuthenticated();

      if (!isolatedByToken && !isCoachSession) {
        const cloudSubs = await fetchSubscribersFromSupabase();
        if (!mounted) return;
        const matched = cloudSubs.find(
          (u) =>
            (targetEmail && u.email.toLowerCase() === targetEmail) ||
            (targetId && u.id === targetId)
        );
        if (!matched) {
          clearCurrentUserSession();
          setAccessStatus('unauthorized');
          return;
        }
        if (matched.status === 'suspended') {
          setAccessStatus('suspended');
          return;
        }
      }

      const workspace = await loadClientWorkspaceFromSupabase({
        clientId: targetId,
        email: targetEmail,
        fallbackName: targetSub.name,
        fallbackPlan: 'standard',
      });
      if (!mounted) return;

      const nextProfile: ClientProfile = {
        ...workspace.profile,
        accessToken: tokenSubscriber?.accessToken || workspace.profile.accessToken,
        subscription_plan: 'standard',
      };
      setProfile(nextProfile);
      setWorkoutDays(workspace.workoutDays);
      setNotes(workspace.notes);
      setAccessStatus('authorized');
    };

    void verifyAndHydrate();
    return () => {
      mounted = false;
    };
  }, [
    tokenSubscriber?.id,
    tokenSubscriber?.email,
    tokenSubscriber?.accessToken,
    tokenSubscriber?.plan,
    isolatedByToken,
  ]);

  // Real-time synchronization strictly scoped to THIS subscriber
  useEffect(() => {
    if (accessStatus !== 'authorized') return;
    const cleanEmail = (profile.email || '').trim().toLowerCase();
    const cleanId = (profile.id || '').trim();

    const handleNotesSync = () => {
      if (!cleanEmail && !cleanId) return;
      void fetchNotesFromSupabase({
        clientId: cleanId,
        clientEmail: cleanEmail,
        clientName: profile.name,
      }).then(setNotes);
    };

    const handleProfileSync = (e: Event) => {
      const detail = (e as CustomEvent<ClientProfile | undefined>).detail;
      if (detail) {
        const dEmail = (detail.email || '').trim().toLowerCase();
        const dId = (detail.id || '').trim().toLowerCase();
        if ((dEmail && cleanEmail && dEmail !== cleanEmail) || (dId && cleanId && dId !== cleanId.toLowerCase())) {
          return;
        }
        setProfile((prev) => ({ ...prev, ...detail, subscription_plan: 'standard' }));
      }
    };

    const handleWorkoutsSync = (e: Event) => {
      const detail = (
        e as CustomEvent<{ clientId?: string; email?: string; days?: WorkoutDay[] } | undefined>
      ).detail;
      if (detail && Array.isArray(detail.days)) {
        const dEmail = (detail.email || '').trim().toLowerCase();
        const dId = (detail.clientId || '').trim().toLowerCase();
        const canonicalKey = getCanonicalClientKey(cleanId, cleanEmail).toLowerCase();
        const matchesEmail = dEmail && cleanEmail && dEmail === cleanEmail;
        const matchesId =
          dId &&
          ((canonicalKey && dId === canonicalKey) ||
            (cleanId && dId === cleanId.toLowerCase()) ||
            (cleanEmail && dId === cleanEmail));
        if (!matchesEmail && !matchesId) return;
        setWorkoutDays(normalizeWorkoutDays(detail.days));
      }
    };

    window.addEventListener('oao_notes_updated', handleNotesSync);
    window.addEventListener('oao_profile_updated', handleProfileSync);
    window.addEventListener('oao_workouts_updated', handleWorkoutsSync);
    return () => {
      window.removeEventListener('oao_notes_updated', handleNotesSync);
      window.removeEventListener('oao_profile_updated', handleProfileSync);
      window.removeEventListener('oao_workouts_updated', handleWorkoutsSync);
    };
  }, [accessStatus, profile.id, profile.email, profile.name]);

  // Modals state
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);
  const [isCoachPasskeyModalOpen, setIsCoachPasskeyModalOpen] = useState(false);
  const notesSectionRef = React.useRef<HTMLElement | null>(null);

  const subDetails = calculateSubscriptionDetails(profile);
  const isCoachViewingAsAdmin = !isolatedByToken && isCoachAuthenticated();
  const isSubscriptionLocked = subDetails.isExpired && !isCoachViewingAsAdmin;

  const handleUpdateProfile = (updated: ClientProfile) => {
    setProfile(updated);
    void syncProfileToSupabase(updated);
  };

  const handleUpdateWorkouts = async (updatedDays: WorkoutDay[]): Promise<boolean> => {
    const normalized = normalizeWorkoutDays(updatedDays);
    setWorkoutDays(normalized);
    const canonicalKey = getCanonicalClientKey(profile.id, profile.email);
    return syncWorkoutDaysToSupabase(canonicalKey, normalized, profile.email);
  };

  const handleAddNote = (newNote: Omit<ClientNote, 'id' | 'timestamp' | 'isResolved'>) => {
    const noteRecord: ClientNote = {
      ...newNote,
      clientId: getCanonicalClientKey(profile.id, profile.email),
      clientEmail: profile.email,
      id: `note_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isResolved: false,
    };
    const updated = [noteRecord, ...notes];
    setNotes(updated);
    void syncNoteToSupabase(noteRecord).then(() => {
      window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    });
  };

  const handleLogout = () => {
    clearCurrentUserSession();
    if (onLogoutOverride) {
      onLogoutOverride();
    } else {
      navigate('/');
    }
  };

  if (accessStatus === 'checking') {
    return (
      <div
        className={`min-h-screen flex flex-col items-center justify-center p-6 font-['Alexandria',sans-serif] transition-colors ${
          isLight ? 'bg-[#EEF2F6] text-[#0B132B]' : 'bg-[#030712] text-white'
        }`}
      >
        <Loader2 className="w-10 h-10 text-[#EA580C] dark:text-orange-400 animate-spin mb-4" />
        <p className={`text-sm font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          جاري التحقق من صلاحية الحساب وتحميل بياناتك الخاصة...
        </p>
      </div>
    );
  }

  if (accessStatus !== 'authorized') {
    const title =
      accessStatus === 'suspended'
        ? 'تم تعليق هذا الحساب مؤقتاً'
        : 'مطلوب تسجيل الدخول للوصول للبوابة';
    const desc =
      accessStatus === 'suspended'
        ? 'يرجى التواصل مع الكوتش عمر عدنان لإعادة تفعيل الاشتراك.'
        : 'لضمان خصوصية وعزل بيانات كل مشترك، لا يمكن فتح هذه الصفحة بدون تسجيل الدخول أو استخدام الرابط الخاص المرسل من الكوتش.';

    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 font-['Alexandria',sans-serif] transition-colors ${
          isLight ? 'bg-[#EEF2F6] text-[#0B132B]' : 'bg-[#030712] text-white'
        }`}
        dir="rtl"
      >
        <div
          className={`max-w-md w-full rounded-3xl p-8 border text-center space-y-5 ${
            isLight
              ? 'bg-[#FAFBFD] border-orange-500/40 shadow-xl'
              : 'bg-gradient-to-br from-[#0B132B] via-[#070E24] to-[#040817] border-orange-500/35 shadow-2xl'
          }`}
        >
          <div
            className={`w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center ${
              isLight
                ? 'bg-orange-100 border-orange-300 text-[#EA580C]'
                : 'bg-orange-500/15 border-orange-500/40 text-orange-400'
            }`}
          >
            <Lock className="w-8 h-8" />
          </div>
          <h1 className={`text-xl font-black ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>{title}</h1>
          <p className={`text-xs sm:text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            {desc}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
          >
            <span>الانتقال لصفحة تسجيل الدخول</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  if (isSubscriptionLocked) {
    return (
      <div
        className={`min-h-screen font-['Alexandria',sans-serif] transition-colors ${
          isLight ? 'bg-[#EEF2F6] text-[#0B132B]' : 'bg-[#030712] text-white'
        }`}
        dir={language === 'ar' ? 'rtl' : 'ltr'}
      >
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-rose-600/10 rounded-full blur-[160px] pointer-events-none" />
        <main className="relative z-10 max-w-4xl mx-auto px-4 py-8">
          <SubscriptionExpiredLockScreen
            profile={profile}
            language={language}
            theme={theme}
            onOpenCoachPasskeyModal={() => setIsCoachPasskeyModalOpen(true)}
            onSignOut={handleLogout}
          />
        </main>
        <CoachPasskeyModal
          isOpen={isCoachPasskeyModalOpen}
          onClose={() => setIsCoachPasskeyModalOpen(false)}
          onSuccess={() => {
            navigate('/admin');
          }}
          language={language}
          theme={theme}
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen selection:bg-orange-500 selection:text-white font-['Alexandria',sans-serif] transition-colors ${
        isLight
          ? 'bg-gradient-to-b from-[#EEF2F6] via-[#E8EDF5] to-[#EEF2F6] text-[#0B132B]'
          : 'bg-[#030712] text-white'
      }`}
    >
      {/* Top Background Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-orange-600/8 rounded-full blur-[160px] pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors ${
          isLight
            ? 'bg-[#EEF2F6]/95 border-slate-300/80 shadow-[0_4px_20px_rgba(11,19,43,0.06)]'
            : 'bg-[#070e24]/90 border-white/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
            title="العودة للرئيسية"
          >
            <BrandLogo size="sm" showText={false} />
            <div className="flex flex-col text-start">
              <span
                className={`text-sm font-black tracking-wider flex items-center gap-1 ${
                  isLight ? 'text-[#0B132B]' : 'text-white'
                }`}
              >
                <span>OWN</span>
                <span className="text-[#EA580C]">AURA</span>
                <span>OUTCOME</span>
              </span>
              <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">STANDARD PORTAL</span>
            </div>
          </button>

          {/* Standard Tier Badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${
              isLight
                ? 'bg-white border-slate-300 text-[#0B132B]'
                : 'bg-slate-800/80 border-slate-600 text-slate-200'
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-[#EA580C] dark:text-slate-300" />
            <span>الباقة القياسية (Standard)</span>
          </div>
        </div>

        {/* Center / Right Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Subscription remaining days & months */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-mono ${
              isLight
                ? 'bg-white border-slate-300 text-[#0B132B]'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
            title={`من ${subDetails.startDate} إلى ${subDetails.endDate}`}
          >
            <Clock className="w-3.5 h-3.5 text-[#EA580C] dark:text-orange-400" />
            <span>
              {subDetails.remainingMonths > 0
                ? `${subDetails.formattedRemainingDurationAr} (${subDetails.daysRemaining} يوم)`
                : `${subDetails.daysRemaining} يوم متبقي`}
            </span>
          </div>

          {/* Upgrade to VIP Button */}
          <button
            onClick={() => navigate('/subscribe')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all hover:scale-105 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>ترقية إلى VIP</span>
          </button>

          {/* Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isLight ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-[#0B132B]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isLight ? 'الوضع الليلي' : 'الوضع النهاري'}
          >
            {isLight ? (
              <Moon className="w-4 h-4 text-[#0B132B]" />
            ) : (
              <Sun className="w-4 h-4 text-orange-400" />
            )}
          </button>

          {/* Return Home Button */}
          <button
            onClick={() => navigate('/')}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-[#0B132B]'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
            title="الرئيسية"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className={`p-2 rounded-xl border transition-all cursor-pointer ${
              isLight
                ? 'bg-rose-50 hover:bg-rose-100 border-rose-300 text-rose-700'
                : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400'
            }`}
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        {/* Welcome Header Card */}
        <div
          className={`relative rounded-3xl p-6 sm:p-8 border overflow-hidden transition-colors ${
            isLight
              ? 'bg-[#FAFBFD] border-slate-300 shadow-[0_10px_35px_rgba(11,19,43,0.06)]'
              : 'bg-gradient-to-r from-[#0B132B] via-[#070E24] to-[#040817] border-orange-500/25 shadow-2xl'
          }`}
        >
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold mb-2 ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-[#0B132B]'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#EA580C] dark:text-slate-300" />
                <span>عضوية الباقة القياسية (Standard Athlete)</span>
              </div>
              <h1 className={`text-2xl sm:text-3xl font-black ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>
                أهلاً بك يا بطل! {profile.name} 👋
              </h1>
              <p className={`text-xs sm:text-sm font-medium mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                جدول تمارينك المعتمد والمتابعة الدورية مع الكوتش عمر عدنان
              </p>
            </div>
          </div>

          {/* 5-Card Official Biometrics Bar */}
          <div className={`relative z-10 mt-6 pt-6 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <AthleteBiometricsBar
              profile={profile}
              language={language}
              theme={theme}
              isVIP={false}
            />
          </div>
        </div>

        {/* Subscription Duration & Remaining Days/Months Banner */}
        <SubscriptionDurationBanner
          profile={profile}
          language={language}
          theme={theme}
          onOpenUpgradeToVIP={() => navigate('/subscribe')}
          onScrollToCoachChat={() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />

        {/* Upgrade to VIP Callout Banner */}
        <div
          className={`rounded-2xl p-4 sm:p-5 border flex flex-col sm:flex-row items-center justify-between gap-4 ${
            isLight
              ? 'bg-gradient-to-r from-amber-50 via-[#FAFBFD] to-orange-50 border-amber-400/70 shadow-sm'
              : 'bg-gradient-to-r from-amber-500/10 via-[#0B132B] to-orange-500/10 border-amber-400/40'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-xl border shrink-0 ${
                isLight
                  ? 'bg-amber-100 text-amber-700 border-amber-300'
                  : 'bg-amber-500/20 text-amber-400 border-amber-400/30'
              }`}
            >
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h4 className={`text-sm font-black ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                هل ترغب في الحصول على مميزات الباقة البلاتينية VIP؟
              </h4>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                متابعة أسبوعية دقيقة، تواصل مباشر عبر الواتساب، وتحديث أسبوعي للجداول مع كرت الإنجاز.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/subscribe')}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs shrink-0 shadow-lg cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105"
          >
            <span>ترقية باقتي الآن</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>

        {/* WORKOUT SCHEDULE & EXERCISES */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-[#EA580C] dark:text-orange-400" />
            <h2 className={`text-lg font-black ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>
              جدول التمارين الأسبوعي
            </h2>
          </div>
          <WorkoutSchedule
            days={workoutDays}
            onUpdateWorkout={handleUpdateWorkouts}
            onOpenVideo={(exercise: Exercise) => {
              setActiveVideoExercise(exercise);
              setIsVideoModalOpen(true);
            }}
            onStartRestTimer={(seconds: number) => {
              setRestTimerSeconds(seconds);
              setIsRestTimerOpen(true);
            }}
            language={language}
            theme={theme}
            profile={profile}
          />
        </section>

        {/* BIOMETRICS & HYDRATION TRACKER GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WaterBottleTracker
            currentLiters={profile.dailyWaterCurrent}
            goalLiters={profile.dailyWaterGoal}
            onChange={(newVal: number) =>
              handleUpdateProfile({ ...profile, dailyWaterCurrent: newVal })
            }
            language={language}
            theme={theme}
          />
          <BMIGauge
            weight={profile.weight}
            height={profile.height}
            targetWeight={profile.targetWeight}
            language={language}
            theme={theme}
          />
        </div>

        {/* ATHLETE DIET & NUTRITION PLAN (7 Breakfast, 7 Lunch, 7 Dinner, 6 Snacks) */}
        <AthleteDietPlanSection
          language={language}
          theme={theme}
          isVIP={false}
          isLocked={profile.nutritionPlanLocked}
          subscriberEmail={profile.email}
          clientId={profile.id}
        />

        {/* COACH NOTES & INQUIRIES */}
        <section ref={notesSectionRef} className="space-y-4">
          <ClientNotesSection
            notes={notes}
            onAddNote={handleAddNote}
            language={language}
            theme={theme}
            profile={profile}
          />
        </section>
      </main>

      {/* Rest Timer Floating Component */}
      <RestTimer
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
        initialSeconds={restTimerSeconds}
        language={language}
      />

      {/* Exercise Video Guide Modal */}
      {activeVideoExercise && (
        <VideoModal
          isOpen={isVideoModalOpen}
          onClose={() => {
            setIsVideoModalOpen(false);
            setActiveVideoExercise(null);
          }}
          exercise={activeVideoExercise}
          language={language}
        />
      )}
    </div>
  );
};
