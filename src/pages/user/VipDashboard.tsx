import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Language,
  StreakData,
  Badge,
  AthleteRank,
  SubscriptionPlanTier,
} from '../../types';
import {
  INITIAL_WORKOUT_DAYS,
  createNeutralClientProfile,
  createNeutralStreakData,
  createNeutralBadges,
  createNeutralAthleteRank,
} from '../../data/initialData';
import { BrandLogo } from '../../components/BrandLogo';
import { VIPBadge } from '../../components/VIPBadge';
import { WorkoutSchedule } from '../../components/WorkoutSchedule';
import { WaterBottleTracker } from '../../components/WaterBottleTracker';
import { BMIGauge } from '../../components/BMIGauge';
import { AthleteBiometricsBar } from '../../components/AthleteBiometricsBar';
import { AthleteDietPlanSection } from '../../components/nutrition/AthleteDietPlanSection';
import { ComprehensiveAnalysisGrid } from '../../components/ComprehensiveAnalysisGrid';
import { GamificationStreakSection } from '../../components/GamificationStreakSection';
import { ClientNotesSection } from '../../components/ClientNotesSection';
import { RestTimer } from '../../components/RestTimer';
import { VideoModal } from '../../components/VideoModal';
import { ShareableProgressCardModal } from '../../components/ShareableProgressCardModal';
import { SubscriptionDurationBanner } from '../../components/SubscriptionDurationBanner';
import { SubscriptionExpiredLockScreen } from '../../components/SubscriptionExpiredLockScreen';
import { CoachPasskeyModal } from '../../components/CoachPasskeyModal';
import { calculateSubscriptionDetails } from '../../lib/subscriptionUtils';
import {
  fetchNotesFromSupabase,
  getCanonicalClientKey,
  loadClientWorkspaceFromSupabase,
  syncAssessmentToSupabase,
  syncNoteToSupabase,
  syncProfileToSupabase,
  syncWorkoutDaysToSupabase,
} from '../../lib/supabase';
import { normalizeWorkoutDays } from '../../lib/workoutUtils';
import {
  applyAutomaticVipDailyStreakAward,
  computeDailyWorkoutProgress,
  findNewlyCompletedWorkoutDay,
  isStreakAwardedToday,
} from '../../lib/streakUtils';
import {
  getCurrentUserSession,
  clearCurrentUserSession,
  fetchSubscribersFromSupabase,
  isCoachAuthenticated,
  setCoachAuthenticated,
} from '../../lib/authStore';
import { useOaoTheme } from '../../lib/themeUtils';
import {
  Home,
  LogOut,
  Crown,
  Flame,
  Clock,
  Share2,
  Dumbbell,
  MessageCircle,
  ShieldCheck,
  Lock,
  ArrowRight,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';

export interface VipDashboardProps {
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

export const VipDashboard: React.FC<VipDashboardProps> = ({
  tokenSubscriber = null,
  isolatedByToken = false,
  onLogoutOverride,
}) => {
  const navigate = useNavigate();

  // Load language & reactive theme
  const [language] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });
  const { theme, toggleTheme } = useOaoTheme();
  const isLight = theme === 'light';

  const [accessStatus, setAccessStatus] = useState<
    'checking' | 'authorized' | 'unauthorized' | 'tier_mismatch' | 'suspended'
  >('checking');

  // Client Profile state (Locked as VIP, hydrated strictly from Supabase with zero demo leakage)
  const [profile, setProfile] = useState<ClientProfile>(() => {
    const activeSub = tokenSubscriber || getCurrentUserSession();
    const subStatus =
      tokenSubscriber?.status || getCurrentUserSession()?.subscriptionStatus || 'active';
    return createNeutralClientProfile({
      id: activeSub?.id || activeSub?.email || '',
      email: activeSub?.email || '',
      name: activeSub?.name || 'مشترك VIP',
      nameEn: activeSub?.name || 'VIP Athlete',
      clientCode: activeSub?.clientCode,
      accessToken: activeSub?.accessToken,
      phone: activeSub?.phone,
      subscription_plan: 'VIP',
      subscriptionStartDate: activeSub?.subscriptionStartDate,
      subscriptionEndDate: activeSub?.subscriptionEndDate,
      subscriptionStatus: subStatus,
    });
  });

  // Workouts, Notes, Streak, Badges & Rank states (Hydrated strictly from Supabase)
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(INITIAL_WORKOUT_DAYS);
  const [activeWorkoutDayKey, setActiveWorkoutDayKey] = useState<string>('upper');
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [streakData, setStreakData] = useState<StreakData>(() => createNeutralStreakData());
  const [badges, setBadges] = useState<Badge[]>(() => createNeutralBadges());
  const [athleteRank, setAthleteRank] = useState<AthleteRank>(() => createNeutralAthleteRank());

  // Synchronous refs to enforce strict once-per-day lock across rapid events/re-renders
  const workoutDaysRef = useRef<WorkoutDay[]>(workoutDays);
  workoutDaysRef.current = workoutDays;
  const streakDataRef = useRef<StreakData>(streakData);
  streakDataRef.current = streakData;
  const athleteRankRef = useRef<AthleteRank>(athleteRank);
  athleteRankRef.current = athleteRank;
  const badgesRef = useRef<Badge[]>(badges);
  badgesRef.current = badges;

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
      const isCoachSession =
        !isolatedByToken &&
        (isCoachAuthenticated() || sessionUser?.role === 'admin' || targetEmail === 'coach.omar@oao.com');

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
        if (matched.plan !== 'VIP') {
          setAccessStatus('tier_mismatch');
          return;
        }
      }

      if (isolatedByToken && tokenSubscriber && tokenSubscriber.plan !== 'VIP') {
        if (mounted) setAccessStatus('tier_mismatch');
        return;
      }

      const workspace = await loadClientWorkspaceFromSupabase({
        clientId: targetId,
        email: targetEmail,
        fallbackName: targetSub.name,
        fallbackPlan: 'VIP',
      });
      if (!mounted) return;

      const nextProfile: ClientProfile = {
        ...workspace.profile,
        accessToken: tokenSubscriber?.accessToken || workspace.profile.accessToken,
        subscription_plan: 'VIP',
      };
      setProfile(nextProfile);
      workoutDaysRef.current = workspace.workoutDays;
      setWorkoutDays(workspace.workoutDays);
      setActiveWorkoutDayKey((prev) =>
        workspace.workoutDays.some((d) => d.key === prev && !d.isRestDay)
          ? prev
          : workspace.workoutDays.find((d) => !d.isRestDay)?.key || 'upper'
      );
      setNotes(workspace.notes);
      streakDataRef.current = workspace.streakData;
      setStreakData(workspace.streakData);
      athleteRankRef.current = workspace.athleteRank;
      setAthleteRank(workspace.athleteRank);
      if (workspace.badges) {
        badgesRef.current = workspace.badges;
        setBadges(workspace.badges);
      }
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
    const canonicalKey = getCanonicalClientKey(cleanId, cleanEmail);

    const isForCurrentSubscriber = (payload?: { id?: string; email?: string; clientId?: string }) => {
      if (!payload) return true;
      const pEmail = (payload.email || '').trim().toLowerCase();
      const pId = (payload.id || payload.clientId || '').trim().toLowerCase();
      if (pEmail && cleanEmail) return pEmail === cleanEmail;
      if (pId) {
        return (
          (canonicalKey && pId === canonicalKey.toLowerCase()) ||
          (cleanId && pId === cleanId.toLowerCase()) ||
          (cleanEmail && pId === cleanEmail)
        );
      }
      return true;
    };

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
      if (detail && isForCurrentSubscriber(detail)) {
        setProfile((prev) => ({ ...prev, ...detail, subscription_plan: 'VIP' }));
      }
    };
    const handleStreakSync = (e: Event) => {
      const detail = (e as CustomEvent<(StreakData & { clientId?: string; email?: string }) | undefined>).detail;
      if (detail && isForCurrentSubscriber(detail)) {
        streakDataRef.current = detail;
        setStreakData(detail);
      }
    };
    const handleRankSync = (e: Event) => {
      const detail = (e as CustomEvent<(AthleteRank & { clientId?: string; email?: string }) | undefined>).detail;
      if (detail && isForCurrentSubscriber(detail)) {
        athleteRankRef.current = detail;
        setAthleteRank(detail);
      }
    };

    const handleWorkoutsSync = (e: Event) => {
      const detail = (
        e as CustomEvent<{ clientId?: string; email?: string; days?: WorkoutDay[] } | undefined>
      ).detail;
      if (detail && Array.isArray(detail.days) && isForCurrentSubscriber(detail)) {
        const norm = normalizeWorkoutDays(detail.days);
        workoutDaysRef.current = norm;
        setWorkoutDays(norm);
      }
    };

    window.addEventListener('oao_notes_updated', handleNotesSync);
    window.addEventListener('oao_profile_updated', handleProfileSync);
    window.addEventListener('oao_streak_updated', handleStreakSync);
    window.addEventListener('oao_rank_updated', handleRankSync);
    window.addEventListener('oao_workouts_updated', handleWorkoutsSync);
    return () => {
      window.removeEventListener('oao_notes_updated', handleNotesSync);
      window.removeEventListener('oao_profile_updated', handleProfileSync);
      window.removeEventListener('oao_streak_updated', handleStreakSync);
      window.removeEventListener('oao_rank_updated', handleRankSync);
      window.removeEventListener('oao_workouts_updated', handleWorkoutsSync);
    };
  }, [accessStatus, profile.id, profile.email, profile.name]);

  // Modals state
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);
  const [isShareCardModalOpen, setIsShareCardModalOpen] = useState(false);
  const [isCoachPasskeyModalOpen, setIsCoachPasskeyModalOpen] = useState(false);
  const notesSectionRef = useRef<HTMLElement | null>(null);

  const subDetails = calculateSubscriptionDetails(profile);
  const isCoachViewingAsAdmin =
    !isolatedByToken &&
    (isCoachAuthenticated() || getCurrentUserSession()?.role === 'admin');
  const isSubscriptionLocked = subDetails.isExpired && !isCoachViewingAsAdmin;

  const handleUpdateProfile = (updated: ClientProfile) => {
    setProfile(updated);
    void syncProfileToSupabase(updated);
  };

  const handleUpdateWorkouts = async (
    updatedDays: WorkoutDay[],
    preferredDayKey?: string
  ): Promise<boolean> => {
    const prevDays = workoutDaysRef.current;
    const normalized = normalizeWorkoutDays(updatedDays);
    workoutDaysRef.current = normalized;
    setWorkoutDays(normalized);
    if (preferredDayKey) {
      setActiveWorkoutDayKey(preferredDayKey);
    }

    const canonicalKey = getCanonicalClientKey(profile.id, profile.email);
    const workoutSynced = await syncWorkoutDaysToSupabase(canonicalKey, normalized, profile.email);

    // Strictly VIP-only automatic streak upon 100% completion of a workout day (once per calendar day)
    if (!isStreakAwardedToday(streakDataRef.current)) {
      const completedDay = findNewlyCompletedWorkoutDay(
        prevDays,
        normalized,
        preferredDayKey || activeWorkoutDayKey
      );
      if (completedDay) {
        const awardResult = applyAutomaticVipDailyStreakAward({
          plan: 'VIP',
          completedDay,
          streakData: streakDataRef.current,
          athleteRank: athleteRankRef.current,
          badges: badgesRef.current,
        });

        if (awardResult.awarded) {
          streakDataRef.current = awardResult.streakData;
          athleteRankRef.current = awardResult.athleteRank;
          badgesRef.current = awardResult.badges;
          setStreakData(awardResult.streakData);
          setAthleteRank(awardResult.athleteRank);
          setBadges(awardResult.badges);
          setProfile((prev) => ({
            ...prev,
            streakData: awardResult.streakData,
            athleteRank: awardResult.athleteRank,
          }));

          await syncAssessmentToSupabase(
            canonicalKey,
            {
              analysisData: profile.analysisData,
              streakData: awardResult.streakData,
              athleteRank: awardResult.athleteRank,
              badges: awardResult.badges,
            },
            profile.email
          );
        }
      }
    }

    return workoutSynced;
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
        <Loader2 className="w-10 h-10 text-amber-500 dark:text-amber-400 animate-spin mb-4" />
        <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
          جاري التحقق من صلاحية الحساب وتحميل بياناتك الخاصة...
        </p>
      </div>
    );
  }

  if (accessStatus !== 'authorized') {
    const title =
      accessStatus === 'suspended'
        ? 'تم تعليق هذا الحساب مؤقتاً'
        : accessStatus === 'tier_mismatch'
        ? 'هذا المسار مخصص لباقة VIP النخبوية'
        : 'مطلوب تسجيل الدخول للوصول للبوابة';
    const desc =
      accessStatus === 'suspended'
        ? 'يرجى التواصل مع الكوتش عمر عدنان لإعادة تفعيل الاشتراك.'
        : accessStatus === 'tier_mismatch'
        ? 'حسابك الحالي مسجل على الباقة القياسية أو مسار آخر، أو انتهت الجلسة. استخدم رابطك الخاص أو سجل الدخول من الرئيسية.'
        : 'لضمان خصوصية وعزل بيانات كل مشترك، لا يمكن فتح هذه الصفحة بدون تسجيل الدخول أو استخدام الرابط الخاص المرسل من الكوتش.';

    return (
      <div
        className={`min-h-screen flex items-center justify-center p-6 font-['Alexandria',sans-serif] transition-colors ${
          isLight ? 'bg-[#EEF2F6] text-[#0B132B]' : 'bg-[#030712] text-white'
        }`}
        dir="rtl"
      >
        <div
          className={`max-w-md w-full rounded-3xl p-8 border-2 text-center space-y-5 ${
            isLight
              ? 'bg-[#FAFBFD] border-amber-500/50 shadow-xl'
              : 'bg-gradient-to-br from-[#0B132B] via-[#070E24] to-[#040817] border-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.18)]'
          }`}
        >
          <div
            className={`w-16 h-16 mx-auto rounded-2xl border flex items-center justify-center ${
              isLight
                ? 'bg-amber-100 border-amber-400 text-amber-700'
                : 'bg-amber-500/15 border-amber-400/40 text-amber-400'
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
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
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
            setCoachAuthenticated(true);
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
      className={`min-h-screen selection:bg-amber-500 selection:text-black font-['Alexandria',sans-serif] transition-colors ${
        isLight
          ? 'bg-gradient-to-b from-[#EEF2F6] via-[#E8EDF5] to-[#EEF2F6] text-[#0B132B]'
          : 'bg-[#030712] text-white'
      }`}
    >
      {/* Top Background Luxury Gold/Orange Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-500/12 via-orange-600/8 to-transparent rounded-full blur-[160px] pointer-events-none" />

      {/* TOP NAVIGATION BAR - LUXURY VIP THEME */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b px-4 sm:px-8 py-3.5 flex items-center justify-between transition-colors ${
          isLight
            ? 'bg-[#FAF8F2]/95 border-amber-500/40 shadow-[0_4px_20px_rgba(217,119,6,0.08)]'
            : 'bg-[#070e24]/95 border-amber-500/30 shadow-[0_4px_30px_rgba(245,158,11,0.1)]'
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
                <span className="text-amber-600 dark:text-amber-400">AURA</span>
                <span>OUTCOME</span>
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono font-bold tracking-widest">
                VIP ELITE PORTAL
              </span>
            </div>
          </button>

          {/* Luxury VIP Tag */}
          <VIPBadge variant="hero" language={language} className="hidden sm:inline-flex" />
        </div>

        {/* Center / Right VIP Status & Actions */}
        <div className="flex items-center gap-2">
          {/* Streak pill with Share trigger */}
          <button
            onClick={() => setIsShareCardModalOpen(true)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-black text-xs cursor-pointer transition-all hover:scale-105 ${
              isLight
                ? 'bg-amber-50 border-amber-400 text-amber-800 hover:bg-amber-100'
                : 'bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 border-amber-400/50 hover:border-amber-300 text-amber-300'
            }`}
            title="مشاركة كرت الإنجاز والستريك"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600 dark:fill-amber-400 dark:text-amber-400" />
            <span className="font-mono tabular-nums">{streakData.currentStreak} يوم التزام</span>
            <Share2 className="w-3 h-3 text-amber-700 dark:text-amber-400" />
          </button>

          {/* Subscription remaining days & months */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono ${
              isLight
                ? 'bg-white border-amber-400/50 text-[#0B132B]'
                : 'bg-black/50 border-amber-500/30 text-amber-200'
            }`}
            title={`من ${subDetails.startDate} إلى ${subDetails.endDate}`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>
              {subDetails.remainingMonths > 0
                ? `${subDetails.formattedRemainingDurationAr} (${subDetails.daysRemaining} يوم)`
                : `${subDetails.daysRemaining} يوم متبقي`}
            </span>
          </div>

          {/* Direct Coach WhatsApp Quick Ping */}
          <a
            href="https://wa.me/966500000000"
            target="_blank"
            rel="noopener noreferrer"
            className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border font-bold text-xs transition-all cursor-pointer ${
              isLight
                ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-400 text-emerald-800'
                : 'bg-emerald-600/20 hover:bg-emerald-600/30 border-emerald-500/40 text-emerald-300'
            }`}
            title="تواصل مباشر مع الكوتش عمر عبر الواتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>كوتش عمر</span>
          </a>

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
              <Sun className="w-4 h-4 text-amber-400" />
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
        {/* Luxury Gold VIP Welcome Banner */}
        <div
          className={`relative rounded-3xl p-6 sm:p-8 border-2 overflow-hidden transition-colors ${
            isLight
              ? 'bg-gradient-to-r from-[#FFFDF7] via-[#FAF6EC] to-[#F3EFE2] border-amber-500/50 shadow-[0_14px_40px_rgba(217,119,6,0.1)]'
              : 'bg-gradient-to-r from-[#171206] via-[#0E1528] to-[#040817] border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.25)]'
          }`}
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/12 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div
                className={`inline-flex items-center gap-2 px-3.5 py-1 rounded-full border text-xs font-black mb-2 shadow-xs ${
                  isLight
                    ? 'bg-amber-100 border-amber-400 text-amber-900'
                    : 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-400/60 text-amber-300'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>عضوية الباقة البلاتينية النخبوية (Platinum VIP Member)</span>
              </div>
              <h1
                className={`text-2xl sm:text-4xl font-black flex items-center gap-2 ${
                  isLight ? 'text-[#0B132B]' : 'text-white'
                }`}
              >
                <span>أهلاً بك يا بطل! {profile.name}</span>
                <span className="text-amber-500 dark:text-amber-400">👑</span>
              </h1>
              <p
                className={`text-xs sm:text-sm font-medium mt-1 max-w-xl ${
                  isLight ? 'text-amber-900/80' : 'text-amber-200/80'
                }`}
              >
                كامل مميزات المنظومة التدريبية مفتوحة لك: متابعة أسبوعية دقيقة، توجيه مباشر، وتحديثات دورية.
              </p>
            </div>
          </div>

          {/* 5-Card Official Biometrics Bar */}
          <div
            className={`relative z-10 mt-6 pt-6 border-t ${
              isLight ? 'border-amber-500/25' : 'border-amber-500/20'
            }`}
          >
            <AthleteBiometricsBar
              profile={profile}
              language={language}
              theme={theme}
              isVIP={true}
            />
          </div>
        </div>

        {/* Subscription Duration & Remaining Days/Months Banner */}
        <SubscriptionDurationBanner
          profile={profile}
          language={language}
          theme={theme}
          onScrollToCoachChat={() => notesSectionRef.current?.scrollIntoView({ behavior: 'smooth' })}
        />

        {/* COMPREHENSIVE BIOMETRIC & BODY FAT ANALYSIS GRID */}
        <section className="space-y-4">
          <ComprehensiveAnalysisGrid
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            language={language}
            theme={theme}
          />
        </section>

        {/* WORKOUT SCHEDULE & EXERCISES */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              <h2 className={`text-lg font-black ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>
                جدول التمارين الأسبوعي VIP
              </h2>
            </div>
            <span className="text-xs font-bold text-amber-700 dark:text-amber-300 font-mono">
              متابعة أسبوعية مباشرة
            </span>
          </div>

          <WorkoutSchedule
            days={workoutDays}
            onUpdateWorkout={handleUpdateWorkouts}
            onActiveDayChange={setActiveWorkoutDayKey}
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

        {/* HYDRATION, WATER TRACKER & BMI GAUGE */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          {/* VIP Concierge Card */}
          <div
            className={`rounded-3xl p-6 border-2 shadow-xl flex flex-col justify-between transition-colors ${
              isLight
                ? 'bg-[#FAFBFD] border-amber-500/50'
                : 'bg-gradient-to-br from-[#120F05] via-[#0B132B] to-[#040817] border-amber-400/40'
            }`}
          >
            <div>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 mb-2">
                <Crown className="w-5 h-5" />
                <h3 className={`text-base font-black ${isLight ? 'text-[#0B132B]' : 'text-white'}`}>
                  المساعد الرياضي الخاص VIP
                </h3>
              </div>
              <p className={`text-xs leading-relaxed font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                بصفتك مشتركاً في الباقة البلاتينية، لديك أولوية مطلقة في الرد على الاستفسارات،
                مراجعة تكنيك التمارين بالفيديو، وإمكانية تجميد الاشتراك عند السفر أو الانشغال.
              </p>
            </div>

            <div
              className={`mt-5 pt-4 border-t flex flex-wrap items-center justify-between gap-3 ${
                isLight ? 'border-amber-500/25' : 'border-amber-500/20'
              }`}
            >
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>إشراف مباشر: الكوتش عمر عدنان</span>
              </span>

              <a
                href="https://wa.me/966500000000"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <MessageCircle className="w-4 h-4" />
                <span>محادثة الواتساب</span>
              </a>
            </div>
          </div>
        </section>

        {/* GAMIFICATION, STREAKS & BADGES (VIP-ONLY AUTOMATIC) */}
        <section className="space-y-4">
          <GamificationStreakSection
            streakData={streakData}
            badges={badges}
            athleteRank={athleteRank}
            dailyProgress={computeDailyWorkoutProgress(
              workoutDays,
              streakData,
              activeWorkoutDayKey
            )}
            onUseStreakFreeze={() => {
              if (streakDataRef.current.freezesRemaining <= 0) return;
              const nextStreak: StreakData = {
                ...streakDataRef.current,
                freezesRemaining: Math.max(0, streakDataRef.current.freezesRemaining - 1),
              };
              streakDataRef.current = nextStreak;
              setStreakData(nextStreak);
              const canonicalKey = getCanonicalClientKey(profile.id, profile.email);
              syncAssessmentToSupabase(
                canonicalKey,
                {
                  analysisData: profile.analysisData,
                  streakData: nextStreak,
                  athleteRank: athleteRankRef.current,
                  badges: badgesRef.current,
                },
                profile.email
              ).catch(() => {});
            }}
            language={language}
            theme={theme}
            onOpenShareCard={() => setIsShareCardModalOpen(true)}
          />
        </section>

        {/* ATHLETE DIET & NUTRITION PLAN (7 Breakfast, 7 Lunch, 7 Dinner, 6 Snacks) */}
        <AthleteDietPlanSection
          language={language}
          theme={theme}
          isVIP={true}
          isLocked={profile.nutritionPlanLocked}
          subscriberEmail={profile.email}
          clientId={profile.id}
        />

        {/* DIRECT VIP NOTES & INQUIRIES WITH COACH */}
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

      {/* Shareable Achievement Progress Card Modal */}
      <ShareableProgressCardModal
        isOpen={isShareCardModalOpen}
        onClose={() => setIsShareCardModalOpen(false)}
        profile={profile}
        streakData={streakData}
        athleteRank={athleteRank}
        badges={badges}
        language={language}
        theme={theme}
      />
    </div>
  );
};
