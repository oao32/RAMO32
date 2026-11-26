/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { StandardDashboard } from './pages/user/StandardDashboard';
import { VipDashboard } from './pages/user/VipDashboard';
import { SubscriberTokenPortal } from './pages/user/SubscriberTokenPortal';
import { AdminPanel } from './pages/admin/AdminPanel';
import { StandaloneSubscribePage } from './pages/StandaloneSubscribePage';
import {
  Role,
  UserSession,
  Language,
  Theme,
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Badge,
  StreakData,
  AthleteRank,
  SubscriptionPlanTier,
} from './types';
import {
  INITIAL_WORKOUT_DAYS,
  createNeutralClientProfile,
  createNeutralStreakData,
  createNeutralBadges,
  createNeutralAthleteRank,
} from './data/initialData';
import { BrandLogo } from './components/BrandLogo';
import { TickerBanner } from './components/TickerBanner';
import { BMIGauge } from './components/BMIGauge';
import { WaterBottleTracker } from './components/WaterBottleTracker';
import { ComprehensiveAnalysisGrid } from './components/ComprehensiveAnalysisGrid';
import { WorkoutSchedule } from './components/WorkoutSchedule';
import { ClientNotesSection } from './components/ClientNotesSection';
import { AthleteBiometricsBar } from './components/AthleteBiometricsBar';
import { AthleteDietPlanSection } from './components/nutrition/AthleteDietPlanSection';
import { RestTimer } from './components/RestTimer';
import { VideoModal } from './components/VideoModal';
import { AuthModal } from './components/AuthModal';
import { CoachPasskeyModal } from './components/CoachPasskeyModal';
import { BackgroundEffects } from './components/BackgroundEffects';
import { CinematicHero } from './components/CinematicHero';
import { BrandHeroSection } from './components/BrandHeroSection';
import { BodyCompositionCard } from './components/BodyCompositionCard';
import { PricingPlansSection, PlanSelectionPayload } from './components/PricingPlansSection';
import { GamificationStreakSection } from './components/GamificationStreakSection';
import { ShareableProgressCardModal } from './components/ShareableProgressCardModal';
import { SubscriptionCheckoutModal, PlanDetails } from './components/SubscriptionCheckoutModal';
import { SubscriptionQRModal } from './components/SubscriptionQRModal';
import { SubscriptionDurationBanner } from './components/SubscriptionDurationBanner';
import { SubscriptionExpiredLockScreen } from './components/SubscriptionExpiredLockScreen';
import { calculateSubscriptionDetails, getTodayIsoString, addDaysToDate } from './lib/subscriptionUtils';
import { VIPBadge } from './components/VIPBadge';
import { VIPFeatureGate } from './components/VIPFeatureGate';
import { SubscriptionAuthProvider } from './context/SubscriptionAuthContext';
import { SubscriptionAgreement } from './types';

const ALL_PLANS: Record<'standard' | 'platinum', PlanDetails> = {
  standard: {
    id: 'standard',
    nameAr: 'الباقة القياسية (Standard)',
    nameEn: 'Standard Package',
    priceMonthly: 200,
    priceYearly: 600,
    selectedPrice: 200,
    durationKey: '3_months',
    durationLabelAr: '3 شهور',
    durationLabelEn: '3 Months',
    durationDays: 90,
    tierSubtitleAr: 'الباقة المثالية لمن يمتلك الخبرة الأساسية ويفضل المتابعة الشهرية المنتظمة.',
    tierSubtitleEn: 'The ideal package for athletes with foundational experience who prefer regular monthly check-ins.',
    badgeTextAr: 'الباقة القياسية',
    badgeTextEn: 'Standard',
  },
  platinum: {
    id: 'platinum',
    nameAr: 'الباقة البلاتينية (Platinum VIP)',
    nameEn: 'Platinum VIP Package',
    priceMonthly: 450,
    priceYearly: 1450,
    selectedPrice: 800,
    durationKey: '6_months',
    durationLabelAr: '6 شهور',
    durationLabelEn: '6 Months',
    durationDays: 180,
    tierSubtitleAr: 'التجربة التدريبية المتكاملة مع متابعة أسبوعية دقيقة، توجيه مباشر، ونظام تحفيز ومكافآت.',
    tierSubtitleEn: 'The complete coaching experience with precise weekly check-ins, direct guidance, and a gamified rewards system.',
    badgeTextAr: 'الباقة البلاتينية VIP',
    badgeTextEn: 'Platinum VIP',
  },
};
import {
  fetchNotesFromSupabase,
  getCanonicalClientKey,
  loadClientWorkspaceFromSupabase,
  syncAssessmentToSupabase,
  syncProfileToSupabase,
  syncNoteToSupabase,
  syncWorkoutDaysToSupabase,
  normalizeSubscriptionPlan,
} from './lib/supabase';
import { normalizeWorkoutDays } from './lib/workoutUtils';
import {
  applyAutomaticVipDailyStreakAward,
  computeDailyWorkoutProgress,
  findNewlyCompletedWorkoutDay,
  isStreakAwardedToday,
} from './lib/streakUtils';
import {
  isCoachAuthenticated,
  setCoachAuthenticated,
  getCurrentUserSession,
  setCurrentUserSession,
  clearCurrentUserSession,
} from './lib/authStore';
import { useOaoTheme } from './lib/themeUtils';
import {
  Sun,
  Moon,
  Globe,
  ShieldCheck,
  Flame,
  Compass,
  Zap,
  LogOut,
  KeyRound,
  QrCode,
  Crown,
  Clock,
  Menu,
  X,
} from 'lucide-react';

function MainPortal() {
  const navigate = useNavigate();
  // Theme & Language State
  const { theme, toggleTheme } = useOaoTheme();

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });

  // Session State: 'guest' (default regular visitor / client login view) or 'client' (authenticated athlete in current tab)
  const [userSession, setUserSession] = useState<UserSession>(() => {
    const active = getCurrentUserSession();
    return active?.role === 'client' ? 'client' : 'guest';
  });
  const [isHydratingClient, setIsHydratingClient] = useState<boolean>(() => {
    const active = getCurrentUserSession();
    return active?.role === 'client';
  });

  // Toggle viewing plans when logged in as client
  const [showPlansForAthlete, setShowPlansForAthlete] = useState(false);

  // Client Profile State (Hydrated strictly from Supabase + active tab session; zero demo defaults)
  const [profile, setProfile] = useState<ClientProfile>(() => {
    const active = getCurrentUserSession();
    if (active) {
      return createNeutralClientProfile({
        id: active.id || active.email || '',
        email: active.email || '',
        name: active.name || 'مشترك',
        nameEn: active.name || 'Athlete',
        clientCode: active.clientCode,
        accessToken: active.accessToken,
        phone: active.phone,
        subscription_plan: normalizeSubscriptionPlan(active.plan),
        subscriptionStartDate: active.subscriptionStartDate,
        subscriptionEndDate: active.subscriptionEndDate,
        subscriptionStatus: active.subscriptionStatus || 'active',
      });
    }
    return createNeutralClientProfile();
  });

  const activeSubscriptionPlan: SubscriptionPlanTier = normalizeSubscriptionPlan(
    profile.subscription_plan
  );
  const isClientVIP = activeSubscriptionPlan === 'VIP';
  const clientSubDetails = calculateSubscriptionDetails(profile);
  const isClientExpired = userSession === 'client' && clientSubDetails.isExpired;

  // Workout Days State (Hydrated strictly from Supabase)
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(INITIAL_WORKOUT_DAYS);

  // Client Notes State (Hydrated strictly from Supabase)
  const [notes, setNotes] = useState<ClientNote[]>([]);

  const workspaceRequestRef = useRef(0);

  const hydrateClientWorkspace = useCallback(
    async (params: {
      clientId?: string | null;
      email?: string | null;
      fallbackName?: string;
      fallbackPlan?: SubscriptionPlanTier;
    }) => {
      const requestId = ++workspaceRequestRef.current;
      setIsHydratingClient(true);
      try {
        const workspace = await loadClientWorkspaceFromSupabase(params);
        if (requestId !== workspaceRequestRef.current) return;
        setProfile(workspace.profile);
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
      } finally {
        if (requestId === workspaceRequestRef.current) {
          setIsHydratingClient(false);
        }
      }
    },
    []
  );

  // Hydrate live workspace from Supabase when a subscriber session is active on mount and window focus
  useEffect(() => {
    if (userSession !== 'client') {
      setIsHydratingClient(false);
      return;
    }
    const currentUser = getCurrentUserSession();
    const targetEmail = currentUser?.email || profile.email;
    const targetId = currentUser?.id || profile.id;
    if (!targetEmail && !targetId) {
      setIsHydratingClient(false);
      return;
    }

    const runHydrate = () => {
      void hydrateClientWorkspace({
        clientId: targetId,
        email: targetEmail,
        fallbackName: currentUser?.name || profile.name,
        fallbackPlan: currentUser?.plan || normalizeSubscriptionPlan(profile.subscription_plan),
      });
    };

    runHydrate();

    const handleFocusRefresh = () => {
      if (document.visibilityState === 'visible') {
        runHydrate();
      }
    };
    window.addEventListener('focus', handleFocusRefresh);
    document.addEventListener('visibilitychange', handleFocusRefresh);
    return () => {
      window.removeEventListener('focus', handleFocusRefresh);
      document.removeEventListener('visibilitychange', handleFocusRefresh);
    };
  }, [userSession]);

  // Real-time synchronization for coach replies, athlete inquiries, profile updates, and login triggers
  useEffect(() => {
    const cleanEmail = (profile.email || '').trim().toLowerCase();
    const cleanId = (profile.id || '').trim().toLowerCase();

    const handleNotesSync = () => {
      const currentUser = getCurrentUserSession();
      if (!currentUser && userSession !== 'client') return;
      void fetchNotesFromSupabase({
        clientId: currentUser?.id || profile.id,
        clientEmail: currentUser?.email || profile.email,
        clientName: currentUser?.name || profile.name,
      }).then(setNotes);
    };
    const handleProfileSync = (e: Event) => {
      const detail = (e as CustomEvent<ClientProfile | undefined>).detail;
      if (detail) {
        const dEmail = (detail.email || '').trim().toLowerCase();
        const dId = (detail.id || '').trim().toLowerCase();
        if (cleanEmail && dEmail && dEmail !== cleanEmail) return;
        if (cleanId && dId && dId !== cleanId && (!dEmail || dEmail !== cleanEmail)) return;
        setProfile((prev) => ({
          ...prev,
          ...detail,
          subscription_plan: normalizeSubscriptionPlan(detail.subscription_plan || prev.subscription_plan),
        }));
      }
    };
    const handleOpenLogin = () => {
      setAuthModalInitialRole('client');
      setIsAuthModalOpen(true);
    };
    window.addEventListener('oao_notes_updated', handleNotesSync);
    window.addEventListener('oao_profile_updated', handleProfileSync);
    window.addEventListener('oao-open-login-modal', handleOpenLogin);
    return () => {
      window.removeEventListener('oao_notes_updated', handleNotesSync);
      window.removeEventListener('oao_profile_updated', handleProfileSync);
      window.removeEventListener('oao-open-login-modal', handleOpenLogin);
    };
  }, [userSession, profile.id, profile.email, profile.name]);

  // Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalInitialRole, setAuthModalInitialRole] = useState<Role>('client');
  const [isCoachPasskeyModalOpen, setIsCoachPasskeyModalOpen] = useState(false);
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);
  const [isShareCardModalOpen, setIsShareCardModalOpen] = useState(false);

  // Mandatory Subscription Declaration & Checkout Modal State
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<PlanDetails>(ALL_PLANS.platinum);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileHeaderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    const handlePointerDownOutside = (event: MouseEvent | TouchEvent) => {
      if (
        mobileHeaderRef.current &&
        !mobileHeaderRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
      window.removeEventListener('resize', handleResize);
    };
  }, [isMobileMenuOpen]);

  // Direct Subscription Landing Mode (activated automatically when client scans QR code with ?view=plans)
  const [isDirectPlansLanding, setIsDirectPlansLanding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'plans';
  });

  // Gamification & Streak State (VIP-only, hydrated strictly from Supabase)
  const [activeWorkoutDayKey, setActiveWorkoutDayKey] = useState<string>('upper');
  const [streakData, setStreakData] = useState<StreakData>(() => createNeutralStreakData());
  const [badges, setBadges] = useState<Badge[]>(() => createNeutralBadges());
  const [athleteRank, setAthleteRank] = useState<AthleteRank>(() => createNeutralAthleteRank());

  const workoutDaysRef = useRef<WorkoutDay[]>(workoutDays);
  workoutDaysRef.current = workoutDays;
  const streakDataRef = useRef<StreakData>(streakData);
  streakDataRef.current = streakData;
  const athleteRankRef = useRef<AthleteRank>(athleteRank);
  athleteRankRef.current = athleteRank;
  const badgesRef = useRef<Badge[]>(badges);
  badgesRef.current = badges;

  // Section references for smooth scrolling
  const portalRef = useRef<HTMLDivElement | null>(null);
  const brandSectionRef = useRef<HTMLDivElement | null>(null);
  const plansRef = useRef<HTMLDivElement | null>(null);
  const programsRef = useRef<HTMLDivElement | null>(null);
  const coachesRef = useRef<HTMLDivElement | null>(null);
  const notesRef = useRef<HTMLDivElement | null>(null);

  const scrollToBrand = () => {
    if (brandSectionRef.current) {
      brandSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToPlans = () => {
    if (plansRef.current) {
      plansRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToPortal = () => {
    if (portalRef.current) {
      portalRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Sync language direction
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('oao_lang', language);
  }, [language]);

  // Auto-Save Profile to Supabase
  const handleUpdateProfile = (newProfile: ClientProfile) => {
    setProfile(newProfile);
    void syncProfileToSupabase(newProfile);
  };

  // Auto-Save Workouts to Supabase (+ VIP-Only Automatic Daily Streak)
  const handleUpdateWorkouts = async (
    newDays: WorkoutDay[],
    preferredDayKey?: string
  ): Promise<boolean> => {
    const prevDays = workoutDaysRef.current;
    const normalized = normalizeWorkoutDays(newDays);
    workoutDaysRef.current = normalized;
    setWorkoutDays(normalized);
    if (preferredDayKey) {
      setActiveWorkoutDayKey(preferredDayKey);
    }

    const canonicalKey = getCanonicalClientKey(profile.id, profile.email);
    const workoutSynced = await syncWorkoutDaysToSupabase(canonicalKey, normalized, profile.email);

    // Strictly VIP-only automatic streak award; Standard subscribers never trigger streaks
    const planTier = normalizeSubscriptionPlan(profile.subscription_plan);
    if (planTier === 'VIP' && !isStreakAwardedToday(streakDataRef.current)) {
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

  // Auto-Save Water
  const handleWaterChange = (newLiters: number) => {
    const updated = { ...profile, dailyWaterCurrent: newLiters };
    handleUpdateProfile(updated);
  };

  const handleUseStreakFreeze = () => {
    if (normalizeSubscriptionPlan(profile.subscription_plan) !== 'VIP') return;
    if (streakDataRef.current.freezesRemaining <= 0) return;
    const updatedStreakData: StreakData = {
      ...streakDataRef.current,
      freezesRemaining: streakDataRef.current.freezesRemaining - 1,
    };
    streakDataRef.current = updatedStreakData;
    setStreakData(updatedStreakData);
    const canonicalKey = getCanonicalClientKey(profile.id, profile.email);
    void syncAssessmentToSupabase(
      canonicalKey,
      {
        analysisData: profile.analysisData,
        streakData: updatedStreakData,
        athleteRank: athleteRankRef.current,
        badges: badgesRef.current,
      },
      profile.email
    );
  };

  // Auto-Save Notes to Supabase
  const handleAddNote = (newNoteData: Omit<ClientNote, 'id' | 'timestamp' | 'isResolved'>) => {
    const now = new Date();
    const timeString = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newNote: ClientNote = {
      ...newNoteData,
      clientId: getCanonicalClientKey(profile.id, profile.email),
      clientEmail: profile.email,
      id: `note_${Date.now()}`,
      timestamp: timeString,
      isResolved: false,
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    void syncNoteToSupabase(newNote).then(() => {
      window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    });
  };

  // Coach replies to note in Admin view
  const handleReplyNote = (noteId: string, replyText: string) => {
    const now = new Date();
    const timeString = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const updated = notes.map((item) => {
      if (item.id === noteId) {
        const modified: ClientNote = {
          ...item,
          reply: replyText,
          replyTimestamp: timeString,
          isResolved: true,
        };
        void syncNoteToSupabase(modified).then(() => {
          window.dispatchEvent(new CustomEvent('oao_notes_updated'));
        });
        return modified;
      }
      return item;
    });

    setNotes(updated);
  };

  // Mandatory Declaration & Plan Checkout Handlers
  const handleSelectPlanForCheckout = (selection: PlanSelectionPayload) => {
    const basePlan = ALL_PLANS[selection.planId] || ALL_PLANS.platinum;
    setSelectedCheckoutPlan({
      ...basePlan,
      selectedPrice: selection.price,
      durationKey: selection.durationKey,
      durationLabelAr: selection.durationLabelAr,
      durationLabelEn: selection.durationLabelEn,
      durationDays: selection.durationDays,
    });
    setIsCheckoutModalOpen(true);
  };

  const handleOpenUpgradeToVIP = () => {
    setSelectedCheckoutPlan(ALL_PLANS.platinum);
    setIsCheckoutModalOpen(true);
  };

  const handleSubscriptionCheckoutComplete = (
    agreement: SubscriptionAgreement,
    athleteName: string,
    athleteEmail: string
  ) => {
    setUserSession('client');

    const resolvedDays =
      agreement.durationDays ||
      (agreement.billingCycle === '12_months' || agreement.billingCycle === 'yearly'
        ? 365
        : agreement.billingCycle === '6_months'
        ? 180
        : 90);

    // Automatically assign 'VIP' when Platinum VIP is paid, or 'standard' when Standard is paid
    const resolvedPlan: SubscriptionPlanTier = normalizeSubscriptionPlan(
      agreement.subscription_plan || (agreement.planId === 'platinum' ? 'VIP' : 'standard')
    );

    const todayIso = agreement.startDate || getTodayIsoString();
    const calculatedEndDate = agreement.endDate || addDaysToDate(todayIso, resolvedDays);

    const resolvedEmail = (athleteEmail || profile.email || '').trim().toLowerCase();

    setCurrentUserSession({
      id: resolvedEmail,
      email: resolvedEmail,
      name: athleteName || profile.name,
      plan: resolvedPlan,
      role: 'client',
      phone: agreement.phoneWhatsapp || profile.phone,
    });

    const updatedProfile: ClientProfile = {
      ...profile,
      name: athleteName || profile.name,
      email: athleteEmail || profile.email,
      phone: agreement.phoneWhatsapp || profile.phone,
      subscription_plan: resolvedPlan,
      subscriptionStatus: 'active',
      subscriptionDaysLeft: resolvedDays,
      subscriptionStartDate: todayIso,
      subscriptionEndDate: calculatedEndDate,
    };
    handleUpdateProfile(updatedProfile);

    setIsDirectPlansLanding(false);
    if (typeof window !== 'undefined' && window.location.search.includes('view=plans')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    setTimeout(() => {
      portalRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 250);
  };

  // Switch role / session
  const handleOpenAthleteLogin = () => {
    setAuthModalInitialRole('client');
    setIsAuthModalOpen(true);
  };

  const handleOpenCoachPasskey = () => {
    setIsCoachPasskeyModalOpen(true);
  };

  const handleLogout = () => {
    workspaceRequestRef.current += 1;
    clearCurrentUserSession();
    setUserSession('guest');
    setShowPlansForAthlete(false);
    setProfile(createNeutralClientProfile());
    setWorkoutDays(INITIAL_WORKOUT_DAYS);
    setNotes([]);
    setStreakData(createNeutralStreakData());
    setBadges(createNeutralBadges());
    setAthleteRank(createNeutralAthleteRank());
  };

  const handleAuthSuccess = (
    role: Role,
    userEmail?: string,
    userName?: string,
    subscriptionPlan?: SubscriptionPlanTier,
    clientId?: string
  ) => {
    if (role === 'admin') {
      setCoachAuthenticated(true);
      navigate('/admin');
    } else {
      setIsHydratingClient(true);
      setUserSession('client');
      const nextPlan = normalizeSubscriptionPlan(subscriptionPlan || 'standard');
      const resolvedId = getCanonicalClientKey(clientId, userEmail);
      const existingSession = getCurrentUserSession();

      setCurrentUserSession({
        id: resolvedId,
        email: userEmail || '',
        name: userName || 'مشترك',
        plan: nextPlan,
        role: 'client',
        clientCode: existingSession?.clientCode,
        phone: existingSession?.phone,
        accessToken: existingSession?.accessToken,
        subscriptionStartDate: existingSession?.subscriptionStartDate,
        subscriptionEndDate: existingSession?.subscriptionEndDate,
        subscriptionStatus: existingSession?.subscriptionStatus,
      });

      const baselineProfile = createNeutralClientProfile({
        id: resolvedId,
        name: userName && userName.trim() ? userName.trim() : 'مشترك',
        nameEn: userName && userName.trim() ? userName.trim() : 'Athlete',
        email: userEmail || '',
        accessToken: existingSession?.accessToken,
        subscription_plan: nextPlan,
        subscriptionStartDate: existingSession?.subscriptionStartDate,
        subscriptionEndDate: existingSession?.subscriptionEndDate,
        subscriptionStatus: existingSession?.subscriptionStatus || 'active',
      });
      setProfile(baselineProfile);
      setWorkoutDays(INITIAL_WORKOUT_DAYS);
      setNotes([]);
      setStreakData(createNeutralStreakData());
      setBadges(createNeutralBadges());
      setAthleteRank(createNeutralAthleteRank());

      void hydrateClientWorkspace({
        clientId: resolvedId,
        email: userEmail,
        fallbackName: userName,
        fallbackPlan: nextPlan,
      });
    }
  };

  const handleCoachPasskeySuccess = () => {
    setCoachAuthenticated(true);
    navigate('/admin');
  };

  // Open video modal
  const handleOpenVideo = (exercise: Exercise) => {
    setActiveVideoExercise(exercise);
    setIsVideoModalOpen(true);
  };

  // Start rest timer
  const handleStartRestTimer = (seconds: number) => {
    setRestTimerSeconds(seconds);
    setIsRestTimerOpen(true);
  };

  return (
    <SubscriptionAuthProvider
      userSession={userSession}
      rawSubscriptionPlan={profile.subscription_plan}
      onUpdatePlan={(nextPlan) =>
        handleUpdateProfile({ ...profile, subscription_plan: nextPlan })
      }
      onOpenUpgradeModal={handleOpenUpgradeToVIP}
    >
    <div
      className={`min-h-screen w-full max-w-full overflow-x-clip relative selection:bg-orange-500 selection:text-white transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-[#030712] text-white'
          : 'bg-gradient-to-b from-[#EEF2F6] via-[#E8EDF5] to-[#EEF2F6] text-[#0B132B]'
      }`}
    >
      {/* Dynamic Background Laser & Embers Effects */}
      <BackgroundEffects theme={theme} />

      {/* 1. TOP TICKER QUOTES BANNER + 2. STICKY SUB-NAV / QUICK ACTION BAR */}
      <div ref={mobileHeaderRef} className="sticky top-0 z-40 w-full max-w-full">
        <TickerBanner language={language} />

        <header
          className={`backdrop-blur-xl border-b transition-colors ${
          userSession === 'client' && isClientVIP
            ? theme === 'dark'
              ? 'bg-[#090d1c]/95 border-amber-400/40 shadow-[0_4px_30px_rgba(245,158,11,0.12)]'
              : 'bg-[#FAF8F2]/95 border-amber-500/40 shadow-[0_4px_20px_rgba(217,119,6,0.08)]'
            : theme === 'dark'
            ? 'bg-[#070b19]/90 border-orange-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.7)]'
            : 'bg-[#EEF2F6]/95 border-slate-300/80 shadow-[0_4px_20px_rgba(11,19,43,0.06)]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <BrandLogo size="sm" showText={false} />
            <div className="flex flex-col">
              <span
                className={`font-black text-xs md:text-sm tracking-wide flex items-center gap-1 ${
                  theme === 'dark' ? 'text-white' : 'text-[#0B132B]'
                }`}
              >
                <span className="md:hidden">
                  <span className="text-[#EA580C]">O</span>A<span className="text-[#EA580C]">O</span>
                </span>
                <span className="hidden md:inline-flex items-center gap-1">
                  <span className="text-[#EA580C]">Own</span>
                  <span>Aura</span>
                  <span className="text-[#EA580C]">Outcome</span>
                </span>
              </span>
              <span
                className={`hidden md:block text-[9px] font-semibold tracking-widest uppercase ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {language === 'ar' ? 'بوابة التدريب الرياضي الرسمية' : 'Official Training Portal'}
              </span>
            </div>
          </div>

          {/* Dynamic Navigation according to User Session */}
          {userSession === 'guest' && !isDirectPlansLanding && (
            <div className="hidden md:flex items-center gap-2">
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                    : 'bg-[#FAFBFD] hover:bg-slate-200 text-[#0B132B] border border-slate-300 shadow-xs'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-orange-500" />
                <span>{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
              </button>
            </div>
          )}

          {userSession === 'client' && (
            <div className="flex items-center gap-2">
              {isClientVIP ? (
                <>
                  {/* Luxury VIP Top-Bar Identity + VIP Tag */}
                  <div
                    className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap ${
                      theme === 'dark'
                        ? 'bg-amber-500/10 border-amber-400/50 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.18)]'
                        : 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                    }`}
                  >
                    <span>
                      {language === 'ar'
                        ? `المشترك: ${profile.name}`
                        : `Athlete: ${profile.nameEn || profile.name}`}
                    </span>
                    <VIPBadge variant="compact" language={language} />
                  </div>

                  {/* VIP Streak & Share Card Button */}
                  <button
                    onClick={() => setIsShareCardModalOpen(true)}
                    className={`px-3 py-1.5 rounded-xl border font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                      theme === 'dark'
                        ? 'bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border-amber-400/50 hover:border-amber-300 text-amber-400'
                        : 'bg-amber-50 hover:bg-amber-100 border-amber-400 text-amber-800 shadow-xs'
                    }`}
                    title={language === 'ar' ? 'سلسلة الالتزام ومشاركة كرت الإنجاز' : 'Workout Streak & Share Card'}
                  >
                    <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-600 dark:fill-amber-400 dark:text-amber-400" />
                    <span className="font-mono tabular-nums">
                      {streakData.currentStreak} {language === 'ar' ? 'يوم' : 'Days'}
                    </span>
                    <span className="hidden md:inline text-[10px] text-amber-700 dark:text-amber-200 font-bold">
                      {language === 'ar' ? '· كرت الإنجاز' : '· Share'}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  {/* Classic Standard Top-Bar Identity (No VIP Badge) */}
                  <div
                    className={`hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap ${
                      theme === 'dark'
                        ? 'bg-white/5 border-white/15 text-slate-200'
                        : 'bg-white border-slate-300 text-[#0B132B]'
                    }`}
                  >
                    <span>
                      {language === 'ar'
                        ? `المشترك: ${profile.name}`
                        : `Athlete: ${profile.nameEn || profile.name}`}
                    </span>
                    <span aria-hidden="true" className="text-slate-500 dark:text-slate-400">·</span>
                    <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">Standard</span>
                  </div>

                  {/* Direct "Upgrade to VIP" CTA in Top Bar for Standard Subscribers (hidden when expired) */}
                  {!isClientExpired && (
                    <button
                      type="button"
                      onClick={handleOpenUpgradeToVIP}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-[#0B132B] font-black text-xs flex items-center gap-1.5 shadow-[0_0_18px_rgba(245,158,11,0.35)] border border-amber-200/80 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Crown className="w-3.5 h-3.5 text-[#0B132B] fill-[#0B132B]/20 shrink-0" />
                      <span>{language === 'ar' ? 'ترقية إلى VIP' : 'Upgrade to VIP'}</span>
                    </button>
                  )}
                </>
              )}

              {/* Live Subscription Remaining Days & Months Pill */}
              <div
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold whitespace-nowrap ${
                  clientSubDetails.isExpired
                    ? theme === 'dark'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      : 'bg-rose-50 border-rose-400 text-rose-700'
                    : clientSubDetails.isExpiringSoon
                    ? theme === 'dark'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                      : 'bg-amber-50 border-amber-400 text-amber-800 animate-pulse'
                    : theme === 'dark'
                    ? 'bg-white/5 border-white/10 text-slate-300'
                    : 'bg-white border-slate-300 text-[#0B132B] shadow-xs'
                }`}
                title={
                  language === 'ar'
                    ? `فترة الاشتراك: من ${clientSubDetails.startDate} إلى ${clientSubDetails.endDate}`
                    : `Period: ${clientSubDetails.startDate} to ${clientSubDetails.endDate}`
                }
              >
                <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                <span>
                  {clientSubDetails.isExpired
                    ? language === 'ar'
                      ? 'منتهي 🔒'
                      : 'Expired 🔒'
                    : clientSubDetails.remainingMonths > 0
                    ? language === 'ar'
                      ? `${clientSubDetails.daysRemaining} يوم (${clientSubDetails.formattedRemainingDurationAr})`
                      : `${clientSubDetails.daysRemaining}d (${clientSubDetails.formattedRemainingDurationEn})`
                    : `${clientSubDetails.daysRemaining} ${language === 'ar' ? 'يوم متبقي' : 'days left'}`}
                </span>
              </div>

              {!isClientExpired && (
                <button
                  onClick={() => setShowPlansForAthlete(!showPlansForAthlete)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold border flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                    showPlansForAthlete
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10 text-slate-300 border-white/10'
                      : 'bg-[#FAFBFD] hover:bg-slate-200 text-[#0B132B] border-slate-300'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-orange-500" />
                  <span>{language === 'ar' ? 'باقات الاشتراك' : 'Plans'}</span>
                </button>
              )}
            </div>
          )}

          {/* Action Buttons: QR Share, Logins, Logout, Theme, Language, Mobile Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* QR Code Generator Button for sharing Subscriptions directly */}
            {!isDirectPlansLanding && !isClientExpired && (
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className={`${
                  userSession === 'guest' ? 'hidden md:flex' : 'hidden sm:flex'
                } px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer items-center gap-1.5 focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 ${
                  theme === 'dark'
                    ? 'bg-orange-500/15 hover:bg-orange-500/25 border-orange-500/40 text-orange-300'
                    : 'bg-white hover:bg-orange-50 border-orange-500/40 text-[#0B132B] shadow-xs'
                }`}
                title={language === 'ar' ? 'باركود مشاركة صفحة الاشتراكات' : 'Subscriptions QR Code'}
              >
                <QrCode className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden lg:inline">
                  {language === 'ar' ? 'باركود الاشتراكات' : 'Share QR'}
                </span>
              </button>
            )}

            {/* Exit Direct Plans Preview button */}
            {isDirectPlansLanding && (
              <button
                type="button"
                onClick={() => {
                  setIsDirectPlansLanding(false);
                  if (typeof window !== 'undefined' && window.location.search.includes('view=plans')) {
                    window.history.replaceState({}, '', window.location.pathname);
                  }
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/20 border-white/15 text-slate-200'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-[#0B132B] shadow-xs'
                }`}
              >
                {language === 'ar' ? 'الصفحة الرئيسية الكاملة' : 'Full Website'}
              </button>
            )}

            {/* GUEST ACTIONS: Primary Subscribe Now + Desktop Outlined Subscriber Login + Mobile Hamburger */}
            {userSession === 'guest' && !isDirectPlansLanding && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    navigate('/subscribe');
                  }}
                  className="min-h-[40px] md:min-h-0 px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-amber-400 text-white font-black text-xs tracking-wide shadow-[0_0_16px_rgba(255,87,34,0.42)] border border-orange-300/40 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>{language === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAthleteLogin}
                  className={`hidden md:flex px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer items-center gap-1.5 whitespace-nowrap focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 ${
                    theme === 'dark'
                      ? 'bg-white/5 hover:bg-white/10 border-white/25 text-white'
                      : 'bg-white hover:bg-slate-100 border-slate-400 text-[#0B132B] shadow-xs'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                  <span>{language === 'ar' ? 'دخول المشترك' : 'Subscriber Login'}</span>
                </button>
              </>
            )}

            {/* LOGGED IN LOGOUT BUTTON */}
            {userSession === 'client' && (
              <button
                onClick={handleLogout}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                  theme === 'dark'
                    ? 'bg-red-500/15 hover:bg-red-500/25 border-red-500/30 text-red-400 hover:text-red-300'
                    : 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700'
                }`}
                title={language === 'ar' ? 'تسجيل الخروج والعودة للرئيسية' : 'Log Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}</span>
              </button>
            )}

            {/* Language Toggle (Moved inside mobile menu on <768px guest Home view) */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className={`${
                userSession === 'guest' && !isDirectPlansLanding ? 'hidden md:flex' : 'flex'
              } p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer items-center focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 hover:border-orange-500/50 text-slate-300'
                  : 'bg-[#FAFBFD] border-slate-300 hover:border-orange-500 text-[#0B132B] shadow-xs'
              }`}
              title="Toggle Language"
            >
              <div className="flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-orange-500" />
                <span>{language === 'ar' ? 'EN' : 'عربي'}</span>
              </div>
            </button>

            {/* Theme Toggle (Moved inside mobile menu on <768px guest Home view) */}
            <button
              type="button"
              onClick={toggleTheme}
              className={`${
                userSession === 'guest' && !isDirectPlansLanding ? 'hidden md:flex' : 'flex'
              } p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer items-center justify-center focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 ${
                theme === 'dark'
                  ? 'bg-white/5 border-white/10 hover:border-orange-500/50 text-slate-300'
                  : 'bg-[#FAFBFD] border-slate-300 hover:border-orange-500 text-[#0B132B] shadow-xs'
              }`}
              title="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-orange-400" />
              ) : (
                <Moon className="w-4 h-4 text-[#0B132B]" />
              )}
            </button>

            {/* Mobile Hamburger Menu Button (<768px on guest Home view) */}
            {userSession === 'guest' && !isDirectPlansLanding && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                aria-label={language === 'ar' ? 'القائمة' : 'Menu'}
                aria-expanded={isMobileMenuOpen}
                aria-controls="oao-mobile-nav-menu"
                className={`md:hidden min-w-[44px] min-h-[44px] p-2 rounded-xl border flex items-center justify-center transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 ${
                  theme === 'dark'
                    ? 'bg-white/5 border-white/15 hover:border-orange-500/60 text-white'
                    : 'bg-[#FAFBFD] border-slate-300 hover:border-orange-500 text-[#0B132B] shadow-xs'
                }`}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-orange-500" />
                ) : (
                  <Menu className="w-5 h-5 text-orange-500" />
                )}
              </button>
            )}
          </div>
        </div>
        </header>

        {/* Mobile Dropdown Navigation Menu (<768px) */}
        {userSession === 'guest' && !isDirectPlansLanding && isMobileMenuOpen && (
          <nav
            id="oao-mobile-nav-menu"
            aria-label={language === 'ar' ? 'القائمة' : 'Menu'}
            className="md:hidden absolute top-full inset-x-0 z-50 px-3 pt-2"
          >
            <div className="rounded-2xl bg-[#070b19]/95 backdrop-blur-xl border border-orange-500/40 shadow-[0_18px_45px_rgba(3,7,18,0.88)] p-2 space-y-1 text-white">
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-bold text-start text-slate-100 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
              >
                <span className="flex items-center gap-3">
                  <Compass className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  setIsQRModalOpen(true);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-bold text-start text-slate-100 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
              >
                <span className="flex items-center gap-3">
                  <QrCode className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{language === 'ar' ? 'باركود الاشتراكات' : 'Share QR'}</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleOpenAthleteLogin();
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-bold text-start text-slate-100 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
              >
                <span className="flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{language === 'ar' ? 'دخول المشترك' : 'Subscriber Login'}</span>
                </span>
              </button>

              <div className="my-1 border-t border-white/10" />

              <button
                type="button"
                onClick={() => {
                  setLanguage(language === 'ar' ? 'en' : 'ar');
                  setIsMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-bold text-start text-slate-100 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
              >
                <span className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-orange-500 shrink-0" />
                  <span>{language === 'ar' ? 'اللغة' : 'Language'}</span>
                </span>
                <span className="text-xs font-extrabold text-orange-400">
                  {language === 'ar' ? 'EN' : 'عربي'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full min-h-[44px] px-4 py-2.5 rounded-xl flex items-center justify-between gap-3 text-sm font-bold text-start text-slate-100 hover:bg-white/10 active:bg-white/15 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
              >
                <span className="flex items-center gap-3">
                  {theme === 'dark' ? (
                    <Sun className="w-4 h-4 text-orange-400 shrink-0" />
                  ) : (
                    <Moon className="w-4 h-4 text-orange-400 shrink-0" />
                  )}
                  <span>
                    {theme === 'dark'
                      ? language === 'ar'
                        ? 'الوضع الفاتح'
                        : 'Light Mode'
                      : language === 'ar'
                      ? 'الوضع الداكن'
                      : 'Dark Mode'}
                  </span>
                </span>
              </button>
            </div>
          </nav>
        )}
      </div>

      {/* =========================================================================
          VIEW 0: DIRECT QR SUBSCRIPTION LANDING PAGE (?view=plans)
          Opens directly on Subscription Packages -> Mandatory Declaration -> Checkout
          ========================================================================= */}
      {isDirectPlansLanding && (
        <main className="relative z-20">
          <PricingPlansSection
            language={language}
            theme={theme}
            onSelectPlan={handleSelectPlanForCheckout}
          />
        </main>
      )}

      {/* =========================================================================
          VIEW 1: GUEST VISITOR (Hero -> 3 Pillars -> Progress Card -> Pricing Plans)
          ========================================================================= */}
      {!isDirectPlansLanding && userSession === 'guest' && (
        <div className="space-y-0">
          {/* 1. Compact Single-Screen Hero */}
          <CinematicHero
            onEnterPortal={handleOpenAthleteLogin}
            onOpenPrograms={scrollToPlans}
            onOpenCoaches={scrollToBrand}
            onOpenFacilities={scrollToPlans}
            onOpenAuth={handleOpenAthleteLogin}
            language={language}
            theme={theme}
          />

          {/* 2. Compact 3 Pillars Row Directly Under Hero */}
          <div ref={brandSectionRef}>
            <BrandHeroSection
              onEnterPortal={handleOpenAthleteLogin}
              onOpenAdmin={handleOpenCoachPasskey}
              language={language}
              theme={theme}
            />
          </div>

          {/* 3. Interactive Body Composition Progress Card */}
          <BodyCompositionCard language={language} theme={theme} />

          {/* 4. Membership Pricing Plans (Shared Duration Switcher + Collapsed Matrix) */}
          <div ref={plansRef}>
            <PricingPlansSection
              language={language}
              theme={theme}
              onSelectPlan={handleSelectPlanForCheckout}
            />
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: LOGGED-IN ATHLETE (VIP Luxury Gold Theme vs Classic Standard Theme)
          ========================================================================= */}
      {/* 2.0: Hydrating subscriber subscription & dates gate */}
      {!isDirectPlansLanding && userSession === 'client' && isHydratingClient && (
        <main ref={portalRef} className="max-w-7xl mx-auto px-3 sm:px-6 py-20 relative z-20 flex flex-col items-center justify-center gap-4 min-h-[70vh]">
          <div className="w-12 h-12 rounded-full border-4 border-orange-500/30 border-t-orange-500 animate-spin" />
          <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {language === 'ar' ? 'جاري التحقق من حالة الاشتراك وبيانات المتدرب...' : 'Verifying subscription status & workspace...'}
          </p>
        </main>
      )}

      {/* 2A: Subscription Expired Locked Portal */}
      {!isDirectPlansLanding && userSession === 'client' && !isHydratingClient && isClientExpired && (
        <main ref={portalRef} className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-20 relative z-20">
          <SubscriptionExpiredLockScreen
            profile={profile}
            language={language}
            theme={theme}
            onOpenCoachPasskeyModal={handleOpenCoachPasskey}
            onSignOut={handleLogout}
          />
        </main>
      )}

      {/* 2B: Active Subscription Athlete Portal */}
      {!isDirectPlansLanding && userSession === 'client' && !isHydratingClient && !isClientExpired && (
        <main ref={portalRef} className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-20 relative z-20">
          {/* Optional Plans viewer toggle for registered athlete */}
          {showPlansForAthlete && (
            <div className="mb-8 animate-in fade-in duration-300">
              <PricingPlansSection
                language={language}
                theme={theme}
                onSelectPlan={(selection) => {
                  setShowPlansForAthlete(false);
                  handleSelectPlanForCheckout(selection);
                }}
              />
            </div>
          )}

          {/* Plan-Adaptive Outer Frame: Luxury Gold VIP Frame vs Clean Classic Standard */}
          <div
            className={
              isClientVIP
                ? `relative rounded-3xl p-4 sm:p-6 border space-y-6 transition-all ${
                    theme === 'dark'
                      ? 'bg-gradient-to-b from-[#131007]/85 via-[#090d1a]/95 to-[#050811] border-amber-400/50 ring-1 ring-amber-400/20 shadow-[0_0_55px_rgba(245,158,11,0.14)]'
                      : 'bg-gradient-to-b from-[#FFFCF5] via-[#FAFBFD] to-[#F3F6FA] border-amber-500/50 ring-1 ring-amber-400/25 shadow-[0_12px_40px_rgba(217,119,6,0.1)]'
                  }`
                : 'space-y-6'
            }
          >
            {/* Top Metallic Gold Rim exclusively for VIP Subscribers */}
            {isClientVIP && (
              <div className="absolute top-0 inset-x-8 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
            )}

            {/* Top Brand Header Card: Luxury VIP Crest vs Classic Standard Header */}
            <div
              ref={coachesRef}
              className={`relative rounded-3xl p-6 md:p-8 text-center border overflow-hidden transition-all ${
                isClientVIP
                  ? theme === 'dark'
                    ? 'bg-gradient-to-b from-[#211908]/90 via-[#0d1326] to-[#070a14] border-amber-400/45 shadow-[0_0_35px_rgba(245,158,11,0.12)]'
                    : 'bg-gradient-to-b from-[#FFFDF7] via-[#FAF6EC] to-[#F3EFE2] border-amber-500/45 shadow-md'
                  : theme === 'dark'
                  ? 'bg-gradient-to-b from-[#1c2541]/90 via-[#0b132b] to-[#070a14] border-white/15 shadow-xl'
                  : 'bg-gradient-to-b from-[#FAFBFD] via-[#F1F5F9] to-[#E9EFF6] border-slate-300/90 shadow-[0_10px_35px_rgba(11,19,43,0.06)]'
              }`}
            >
              {/* Ambient Glow */}
              <div
                className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-40 rounded-full blur-3xl pointer-events-none ${
                  isClientVIP ? 'bg-amber-500/15' : 'bg-slate-500/10'
                }`}
              />

              {/* Top VIP Luxury Crest (Shown ONLY for VIP Subscribers) */}
              {isClientVIP && (
                <div className="relative z-10 mb-3 flex justify-center">
                  <VIPBadge variant="hero" language={language} />
                </div>
              )}

              {/* Brand Sculpted Logo */}
              <BrandLogo size="md" showText={false} className="mb-2" />

              {/* Title */}
              <div className="relative inline-block">
                <h1
                  className={`text-2xl sm:text-4xl md:text-5xl font-black uppercase tracking-widest ${
                    theme === 'dark'
                      ? 'text-white drop-shadow-[0_2px_15px_rgba(0,0,0,0.8)]'
                      : 'text-[#0B132B] drop-shadow-xs'
                  }`}
                >
                  <span className={isClientVIP ? 'text-amber-400' : 'text-[#EA580C]'}>O</span>WN{' '}
                  <span className={isClientVIP ? 'text-amber-400' : 'text-[#EA580C]'}>A</span>URA{' '}
                  <span className={isClientVIP ? 'text-amber-400' : 'text-[#EA580C]'}>O</span>UTCOME
                </h1>
                <div className="mt-1">
                  <span
                    className={`text-[11px] sm:text-xs font-bold tracking-wider uppercase ${
                      isClientVIP
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {isClientVIP
                      ? language === 'ar'
                        ? 'بوابة نخبة المشتركين (Platinum VIP Suite)'
                        : 'PLATINUM VIP EXECUTIVE SUITE'
                      : language === 'ar'
                      ? 'بوابة التدريب القياسية (Standard Portal)'
                      : 'STANDARD TRAINING PORTAL'}
                  </span>
                </div>
              </div>

              {/* Subscriber Identity Line + VIP Badge OR Standard Upgrade Action */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
                <div
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border ${
                    isClientVIP
                      ? theme === 'dark'
                        ? 'bg-amber-500/10 border-amber-400/50 text-amber-100'
                        : 'bg-amber-50 border-amber-400 text-amber-950 shadow-xs'
                      : theme === 'dark'
                      ? 'bg-white/5 border-white/15 text-slate-200'
                      : 'bg-white border-slate-300 text-[#0B132B]'
                  }`}
                >
                  <span>
                    {language === 'ar'
                      ? `مرحباً بالبطل: ${profile.name}`
                      : `Welcome Athlete: ${profile.nameEn || profile.name}`}
                  </span>
                  {isClientVIP && <VIPBadge variant="compact" language={language} />}
                </div>

                <span
                  className={`px-3.5 py-2 rounded-xl border font-semibold ${
                    theme === 'dark'
                      ? 'bg-white/5 border-white/10 text-slate-300'
                      : 'bg-white border-slate-300 text-slate-700'
                  }`}
                >
                  {language === 'ar'
                    ? `الكوتش المشرف: ${profile.coachName}`
                    : `Head Coach: ${profile.coachName}`}
                </span>

                {/* Standard Plan Upgrade Banner CTA */}
                {!isClientVIP && (
                  <button
                    type="button"
                    onClick={handleOpenUpgradeToVIP}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-[#0B132B] font-black text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(245,158,11,0.3)] border border-amber-200/80 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    <Crown className="w-3.5 h-3.5 text-[#0B132B] fill-[#0B132B]/20" />
                    <span>{language === 'ar' ? 'ترقية إلى VIP لفتح جميع المميزات' : 'Upgrade to VIP'}</span>
                  </button>
                )}
              </div>

              {/* VIP Active Privileges Strip vs Classic Standard Info */}
              {isClientVIP ? (
                <div
                  className={`mt-5 pt-4 border-t flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] font-bold ${
                    theme === 'dark'
                      ? 'border-amber-400/20 text-amber-200/90'
                      : 'border-amber-500/25 text-amber-900'
                  }`}
                >
                  <span>{language === 'ar' ? 'صلاحيات VIP مفعّلة بالكامل:' : 'All VIP Privileges Active:'}</span>
                  <span>{language === 'ar' ? 'المتابعة الأسبوعية الدقيقة' : 'Weekly Check-ins'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{language === 'ar' ? 'التواصل المباشر مع الكوتش' : 'Direct Coach Access'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{language === 'ar' ? 'شارات النخبة VIP والثيم الفاخر' : 'Elite VIP Badges & Theme'}</span>
                  <span aria-hidden="true">·</span>
                  <span>{language === 'ar' ? 'نظام التحفيز والمكافآت' : 'Rewards & Streaks'}</span>
                </div>
              ) : (
                <div
                  className={`mt-4 pt-3 border-t flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-medium ${
                    theme === 'dark' ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-600'
                  }`}
                >
                  <span>
                    {language === 'ar'
                      ? 'الباقة الحالية: القياسية (Standard) · تشمل التقييم الشامل وجدول التمارين والمتابعة'
                      : 'Current Plan: Standard · Includes Assessment & Workout Schedule'}
                  </span>
                </div>
              )}
            </div>

            {/* Subscription Duration & Period Banner (for ALL subscribers: Standard & VIP) */}
            <SubscriptionDurationBanner
              profile={profile}
              language={language}
              theme={theme}
              onOpenRenewModal={handleOpenUpgradeToVIP}
              onOpenUpgradeToVIP={handleOpenUpgradeToVIP}
              onScrollToCoachChat={() => notesRef.current?.scrollIntoView({ behavior: 'smooth' })}
            />

            {/* 5-Card Official Biometrics Bar (المشترك، الوزن، الطول، العضلات، الدهون) */}
            <AthleteBiometricsBar
              profile={profile}
              language={language}
              theme={theme}
              isVIP={isClientVIP}
            />

            {/* Split Row: Interactive BMI Gauge & Smart Water Bottle Tracker (Available in both plans) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BMIGauge
                weight={profile.weight}
                height={profile.height}
                targetWeight={profile.targetWeight}
                language={language}
                theme={theme}
              />
              <WaterBottleTracker
                currentLiters={profile.dailyWaterCurrent}
                goalLiters={profile.dailyWaterGoal}
                onChange={handleWaterChange}
                language={language}
                theme={theme}
              />
            </div>

            {/* Comprehensive Analysis Grid (Standard overview open; interactive AI Macros gated inside) */}
            <ComprehensiveAnalysisGrid
              profile={profile}
              onUpdateProfile={handleUpdateProfile}
              language={language}
              theme={theme}
            />

            {/* Main Interactive Workout Schedule (Monthly schedule open; custom AI workout builder gated inside) */}
            <div ref={programsRef}>
              <WorkoutSchedule
                days={workoutDays}
                onUpdateWorkout={handleUpdateWorkouts}
                onActiveDayChange={setActiveWorkoutDayKey}
                onOpenVideo={handleOpenVideo}
                onStartRestTimer={handleStartRestTimer}
                language={language}
                theme={theme}
                profile={profile}
                onScrollToCoachNotes={() => notesRef.current?.scrollIntoView({ behavior: 'smooth' })}
              />
            </div>



            {/* ATHLETE DIET & NUTRITION PLAN (7 Breakfast, 7 Lunch, 7 Dinner, 6 Snacks) */}
            <AthleteDietPlanSection
              language={language}
              theme={theme}
              isVIP={isClientVIP}
              isLocked={profile.nutritionPlanLocked}
              subscriberEmail={profile.email}
              clientId={profile.id}
            />

            {/* DIRECT NOTES & INQUIRIES WITH COACH */}
            <div ref={notesRef}>
              <ClientNotesSection
                notes={notes}
                onAddNote={handleAddNote}
                language={language}
                theme={theme}
                profile={profile}
              />
            </div>

            {/* VIP EXCLUSIVE MODULE 3: Gamification, Streaks, Badges & Exclusive Rewards */}
            <VIPFeatureGate
              feature="gamification_rewards"
              titleAr="نظام التحفيز والأوسمة والمكافآت الحصرية (VIP)"
              titleEn="Gamification, Streaks & Exclusive Rewards System (VIP)"
              descriptionAr="اكسب نقاط الخبرة (XP)، افتح الأوسمة الأسطورية، واحصل على كرت الإنجاز القابل للمشاركة ومكافآت وهدايا عينية عند تحقيق أهدافك ضمن باقة VIP."
              descriptionEn="Earn XP, unlock legendary badges, export your shareable achievement card, and qualify for tangible rewards with VIP."
              highlightsAr={[
                'نظام السلسلة اليومية (Streaks) وتجميد السلسلة عند الطوارئ',
                'أوسمة التحديات ونقاط التقدم (XP) ومستويات النخبة',
                'تصدير كرت الإنجاز الاحترافي لمشاركته بضغطة زر',
                'مكافآت وهدايا عينية عند تحقيق الأهداف المتفق عليها',
              ]}
              highlightsEn={[
                'Daily workout streaks & emergency streak freezes',
                'Challenge badges, XP levels & elite ranks',
                '1-click shareable athlete progress card',
                'Tangible milestone rewards & gifts',
              ]}
              language={language}
              theme={theme}
            >
              <GamificationStreakSection
                streakData={streakData}
                badges={badges}
                athleteRank={athleteRank}
                dailyProgress={computeDailyWorkoutProgress(
                  workoutDays,
                  streakData,
                  activeWorkoutDayKey
                )}
                onUseStreakFreeze={handleUseStreakFreeze}
                onOpenShareCard={() => setIsShareCardModalOpen(true)}
                language={language}
                theme={theme}
              />
            </VIPFeatureGate>
          </div>
        </main>
      )}

      {/* FOOTER */}
      <footer
        className={`border-t py-6 text-center text-xs transition-colors relative z-20 ${
          theme === 'dark'
            ? 'bg-[#070a14] border-white/10 text-slate-500'
            : 'bg-[#EEF2F6] border-slate-300/80 text-slate-600 font-bold'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-400">
            <span>© 2026 OWN AURA OUTCOME (OAO)</span>
            <span>•</span>
            <span>COACH OMAR ADNAN</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            {userSession !== 'guest' && (
              <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {language === 'ar' ? 'نظام الحفظ التلقائي ومزامنة Supabase نشط' : 'Auto-Save & Supabase Engine Active'}
              </span>
            )}
            <button
              type="button"
              onClick={handleOpenCoachPasskey}
              className={`text-xs font-semibold underline-offset-4 hover:underline transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 rounded-sm ${
                theme === 'dark'
                  ? 'text-slate-400 hover:text-orange-400'
                  : 'text-slate-600 hover:text-[#EA580C]'
              }`}
            >
              {language === 'ar' ? 'دخول الكوتش' : 'Coach Login'}
            </button>
          </div>
        </div>
      </footer>

      {/* 5. MODALS */}
      {/* Exercise Video Player Modal */}
      <VideoModal
        exercise={activeVideoExercise}
        isOpen={isVideoModalOpen}
        onClose={() => setIsVideoModalOpen(false)}
        language={language}
      />

      {/* Interactive Rest Counter Timer Modal */}
      <RestTimer
        initialSeconds={restTimerSeconds}
        isOpen={isRestTimerOpen}
        onClose={() => setIsRestTimerOpen(false)}
        language={language}
      />

      {/* Athlete / Member Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        language={language}
        initialRole={authModalInitialRole}
      />

      {/* Coach Passkey Security Modal (PIN 1234) */}
      <CoachPasskeyModal
        isOpen={isCoachPasskeyModalOpen}
        onClose={() => setIsCoachPasskeyModalOpen(false)}
        onSuccess={handleCoachPasskeySuccess}
        language={language}
        theme={theme}
      />

      {/* Shareable Progress Card Modal */}
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

      {/* Mandatory Declaration & Subscription Checkout Flow Modal */}
      <SubscriptionCheckoutModal
        isOpen={isCheckoutModalOpen}
        onClose={() => setIsCheckoutModalOpen(false)}
        selectedPlan={selectedCheckoutPlan}
        language={language}
        theme={theme}
        onSubscriptionComplete={handleSubscriptionCheckoutComplete}
      />

      {/* Shareable Direct Subscription QR Code Modal */}
      <SubscriptionQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onPreviewDirectPage={() => {
          setIsDirectPlansLanding(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        language={language}
      />
    </div>
    </SubscriptionAuthProvider>
  );
}

function RequireCoachAuth({ children }: { children: React.ReactElement }) {
  if (!isCoachAuthenticated()) {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPortal />} />
        <Route path="/subscribe" element={<StandaloneSubscribePage />} />
        <Route path="/s/:token" element={<SubscriberTokenPortal />} />
        <Route path="/standard" element={<StandardDashboard />} />
        <Route path="/vip" element={<VipDashboard />} />
        <Route
          path="/admin"
          element={
            <RequireCoachAuth>
              <AdminPanel />
            </RequireCoachAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
