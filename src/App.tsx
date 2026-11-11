/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { StandardDashboard } from './pages/user/StandardDashboard';
import { VipDashboard } from './pages/user/VipDashboard';
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
  INITIAL_CLIENT_PROFILE,
  INITIAL_WORKOUT_DAYS,
  INITIAL_CLIENT_NOTES,
  INITIAL_STREAK_DATA,
  INITIAL_BADGES,
  INITIAL_ATHLETE_RANK,
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
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { CoachPasskeyModal } from './components/CoachPasskeyModal';
import { BackgroundEffects } from './components/BackgroundEffects';
import { CinematicHero } from './components/CinematicHero';
import { BrandHeroSection } from './components/BrandHeroSection';
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
  syncProfileToSupabase,
  syncNoteToSupabase,
  normalizeSubscriptionPlan,
} from './lib/supabase';
import {
  Sun,
  Moon,
  Globe,
  User,
  ShieldCheck,
  Dumbbell,
  Scale,
  Ruler,
  Flame,
  Sparkles,
  Compass,
  Zap,
  LogOut,
  KeyRound,
  Lock,
  ArrowRight,
  QrCode,
  Crown,
  Clock,
  Calendar,
} from 'lucide-react';

function MainPortal() {
  const navigate = useNavigate();
  // Theme & Language State
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('oao_theme') as Theme) || 'dark';
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });

  // Session State: 'guest' (default visitor), 'client' (authenticated athlete), or 'admin' (coach with passkey)
  const [userSession, setUserSession] = useState<UserSession>(() => {
    const saved = localStorage.getItem('oao_session') as UserSession;
    if (saved === 'client' || saved === 'admin') {
      return saved;
    }
    return 'guest'; // By default, visitor sees only the Home page and Membership plans
  });

  // Backward-compatible role indicator for child components
  const currentRole: Role = userSession === 'admin' ? 'admin' : 'client';

  // Toggle viewing plans when logged in as client
  const [showPlansForAthlete, setShowPlansForAthlete] = useState(false);

  // Client Profile State with LocalStorage Persistence (normalized subscription_plan: 'standard' | 'VIP')
  const [profile, setProfile] = useState<ClientProfile>(() => {
    const saved = localStorage.getItem('oao_client_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ClientProfile;
        return {
          ...INITIAL_CLIENT_PROFILE,
          ...parsed,
          subscription_plan: normalizeSubscriptionPlan(parsed.subscription_plan || 'VIP'),
        };
      } catch {
        // fallback
      }
    }
    return INITIAL_CLIENT_PROFILE;
  });

  const activeSubscriptionPlan: SubscriptionPlanTier = normalizeSubscriptionPlan(
    profile.subscription_plan
  );
  const isClientVIP = activeSubscriptionPlan === 'VIP';
  const clientSubDetails = calculateSubscriptionDetails(profile);
  const isClientExpired = userSession === 'client' && clientSubDetails.isExpired;

  // Workout Days State with LocalStorage Persistence
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(() => {
    const saved = localStorage.getItem('oao_workout_days');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_WORKOUT_DAYS;
  });

  // Client Notes State with LocalStorage Persistence
  const [notes, setNotes] = useState<ClientNote[]>(() => {
    const saved = localStorage.getItem('oao_client_notes');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_CLIENT_NOTES;
  });

  // Real-time synchronization for coach replies and athlete inquiries
  useEffect(() => {
    const handleSync = () => {
      const saved = localStorage.getItem('oao_client_notes');
      if (saved) {
        try {
          setNotes(JSON.parse(saved));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('oao_notes_updated', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('oao_notes_updated', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

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

  // Direct Subscription Landing Mode (activated automatically when client scans QR code with ?view=plans)
  const [isDirectPlansLanding, setIsDirectPlansLanding] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'plans';
  });

  // Gamification & Streak State with LocalStorage Persistence
  const [streakData, setStreakData] = useState<StreakData>(() => {
    const saved = localStorage.getItem('oao_streak_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_STREAK_DATA;
  });

  const [badges, setBadges] = useState<Badge[]>(() => {
    const saved = localStorage.getItem('oao_badges');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_BADGES;
  });

  const [athleteRank, setAthleteRank] = useState<AthleteRank>(() => {
    const saved = localStorage.getItem('oao_athlete_rank');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return INITIAL_ATHLETE_RANK;
  });

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

  // Sync to HTML root class & direction
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    localStorage.setItem('oao_lang', language);
  }, [language]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('oao_theme', theme);
  }, [theme]);

  // Auto-Save Profile
  const handleUpdateProfile = (newProfile: ClientProfile) => {
    setProfile(newProfile);
    localStorage.setItem('oao_client_profile', JSON.stringify(newProfile));
    syncProfileToSupabase(newProfile);
  };

  // Auto-Save Workouts
  const handleUpdateWorkouts = (newDays: WorkoutDay[]) => {
    setWorkoutDays(newDays);
    localStorage.setItem('oao_workout_days', JSON.stringify(newDays));
  };

  // Auto-Save Water
  const handleWaterChange = (newLiters: number) => {
    const updated = { ...profile, dailyWaterCurrent: newLiters };
    handleUpdateProfile(updated);
  };

  // Gamification & Streak Handlers
  const handleUpdateStreakData = (newStreak: StreakData) => {
    setStreakData(newStreak);
    localStorage.setItem('oao_streak_data', JSON.stringify(newStreak));
  };

  const handleUpdateBadges = (newBadges: Badge[]) => {
    setBadges(newBadges);
    localStorage.setItem('oao_badges', JSON.stringify(newBadges));
  };

  const handleUpdateAthleteRank = (newRank: AthleteRank) => {
    setAthleteRank(newRank);
    localStorage.setItem('oao_athlete_rank', JSON.stringify(newRank));
  };

  const handleLogTodayWorkout = () => {
    const today = new Date().toISOString().split('T')[0];

    // Mark today as completed in weekly activity
    const updatedWeekly = streakData.weeklyActivity.map((day) => {
      if (day.isToday) {
        return { ...day, isCompleted: true };
      }
      return day;
    });

    const newStreakCount = streakData.currentStreak + 1;
    const newLongest = Math.max(newStreakCount, streakData.longestStreak);
    const newWorkouts = streakData.totalWorkoutsCompleted + 1;
    const newVolume = streakData.totalVolumeLiftedKg + 450;

    const newStreakData: StreakData = {
      ...streakData,
      currentStreak: newStreakCount,
      longestStreak: newLongest,
      lastCompletedDate: today,
      weeklyActivity: updatedWeekly,
      totalWorkoutsCompleted: newWorkouts,
      totalVolumeLiftedKg: newVolume,
    };
    handleUpdateStreakData(newStreakData);

    // Add +50 XP and check level progression
    const newXp = athleteRank.currentXp + 50;
    let newLevel = athleteRank.level;
    let newNextXp = athleteRank.nextLevelXp;
    let newTier = athleteRank.tier;
    let newNameAr = athleteRank.nameAr;

    if (newXp >= athleteRank.nextLevelXp) {
      newLevel += 1;
      newNextXp += 500;
      if (newLevel >= 15) {
        newTier = 'legend';
        newNameAr = 'الأسطوري الخارق (Legend Aura 🔥)';
      }
    }

    const updatedRank: AthleteRank = {
      ...athleteRank,
      level: newLevel,
      currentXp: newXp,
      nextLevelXp: newNextXp,
      tier: newTier,
      nameAr: newNameAr,
    };
    handleUpdateAthleteRank(updatedRank);

    // Update Badges Progress & Unlocks
    const updatedBadges = badges.map((b) => {
      if (b.id === 'badge_unbreakable' && newStreakCount >= 30) {
        return { ...b, isUnlocked: true, unlockedDate: today };
      }
      if (b.id === 'badge_volume_titan' && newVolume >= 25000) {
        return { ...b, isUnlocked: true, unlockedDate: today };
      }
      if (b.progress) {
        if (b.id === 'badge_unbreakable') {
          return { ...b, progress: { ...b.progress, current: Math.min(30, newStreakCount) } };
        }
        if (b.id === 'badge_volume_titan') {
          return { ...b, progress: { ...b.progress, current: Math.min(25000, newVolume) } };
        }
      }
      return b;
    });
    handleUpdateBadges(updatedBadges);
  };

  const handleUseStreakFreeze = () => {
    if (streakData.freezesRemaining <= 0) return;
    const updatedStreakData: StreakData = {
      ...streakData,
      freezesRemaining: streakData.freezesRemaining - 1,
    };
    handleUpdateStreakData(updatedStreakData);
  };

  // Auto-Save Notes
  const handleAddNote = (newNoteData: Omit<ClientNote, 'id' | 'timestamp' | 'isResolved'>) => {
    const now = new Date();
    const timeString = `${now.toISOString().slice(0, 10)} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newNote: ClientNote = {
      ...newNoteData,
      id: `note_${Date.now()}`,
      timestamp: timeString,
      isResolved: false,
    };

    const updated = [newNote, ...notes];
    setNotes(updated);
    localStorage.setItem('oao_client_notes', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    window.dispatchEvent(new Event('storage'));
    syncNoteToSupabase(newNote);
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
        syncNoteToSupabase(modified);
        return modified;
      }
      return item;
    });

    setNotes(updated);
    localStorage.setItem('oao_client_notes', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    window.dispatchEvent(new Event('storage'));
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
    localStorage.setItem('oao_session', 'client');

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
    setUserSession('guest');
    localStorage.setItem('oao_session', 'guest');
    setShowPlansForAthlete(false);
  };

  const handleAuthSuccess = (
    role: Role,
    userEmail?: string,
    userName?: string,
    subscriptionPlan?: SubscriptionPlanTier
  ) => {
    if (role === 'admin') {
      setUserSession('admin');
      localStorage.setItem('oao_session', 'admin');
    } else {
      setUserSession('client');
      localStorage.setItem('oao_session', 'client');
      const nextPlan = normalizeSubscriptionPlan(subscriptionPlan || profile.subscription_plan);
      const todayIso = getTodayIsoString();
      handleUpdateProfile({
        ...profile,
        name: userName && userName.trim() ? userName.trim() : profile.name,
        email: userEmail || profile.email,
        subscription_plan: nextPlan,
        subscriptionStartDate: profile.subscriptionStartDate || todayIso,
        subscriptionEndDate:
          profile.subscriptionEndDate || addDaysToDate(todayIso, profile.subscriptionDaysLeft || 60),
      });
    }
  };

  const handleCoachPasskeySuccess = () => {
    setUserSession('admin');
    localStorage.setItem('oao_session', 'admin');
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
      className={`min-h-screen relative selection:bg-orange-500 selection:text-white transition-colors duration-300 ${
        theme === 'dark'
          ? 'bg-[#030712] text-white'
          : 'bg-gradient-to-b from-[#EEF2F6] via-[#E8EDF5] to-[#EEF2F6] text-[#0B132B]'
      }`}
    >
      {/* Dynamic Background Laser & Embers Effects */}
      <BackgroundEffects />

      {/* 1. TOP TICKER QUOTES BANNER */}
      <TickerBanner language={language} />

      {/* 2. STICKY SUB-NAV / QUICK ACTION BAR */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors ${
          userSession === 'client' && isClientVIP
            ? theme === 'dark'
              ? 'bg-[#090d1c]/95 border-amber-400/40 shadow-[0_4px_30px_rgba(245,158,11,0.12)]'
              : 'bg-[#FAF8F2]/95 border-amber-500/40 shadow-[0_4px_20px_rgba(217,119,6,0.08)]'
            : theme === 'dark'
            ? 'bg-[#070b19]/90 border-orange-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.7)]'
            : 'bg-[#EEF2F6]/95 border-slate-300/80 shadow-[0_4px_20px_rgba(11,19,43,0.06)]'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          >
            <BrandLogo size="sm" showText={false} />
            <div className="flex flex-col">
              <span
                className={`font-black text-xs md:text-sm tracking-wide flex items-center gap-1.5 ${
                  theme === 'dark' ? 'text-white' : 'text-[#0B132B]'
                }`}
              >
                <span className="text-[#EA580C]">Own</span>
                <span>Aura</span>
                <span className="text-[#EA580C]">Outcome</span>
              </span>
              <span
                className={`text-[9px] font-semibold tracking-widest uppercase ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                }`}
              >
                {language === 'ar' ? 'بوابة التدريب الرياضي الرسمية' : 'Official Training Portal'}
              </span>
            </div>
          </div>

          {/* Dynamic Navigation according to User Session */}
          {userSession === 'guest' && (
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 text-slate-300'
                    : 'bg-[#FAFBFD] hover:bg-slate-200 text-[#0B132B] border border-slate-300 shadow-xs'
                }`}
              >
                <Compass className="w-3.5 h-3.5 text-orange-500" />
                <span>{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
              </button>
              <button
                onClick={scrollToPlans}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-[#FF5722]/15 hover:bg-[#FF5722]/25 text-[#FF7043] border-[#FF5722]/40'
                    : 'bg-orange-500/15 hover:bg-orange-500/25 text-orange-700 border-orange-500/40 shadow-xs'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                <span>{language === 'ar' ? 'باقات الاشتراك' : 'Pricing Plans'}</span>
              </button>
              <button
                onClick={() => navigate('/subscribe')}
                className={`text-xs px-3.5 py-1.5 rounded-full font-bold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-emerald-500/15 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-400/50 shadow-xs'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>{language === 'ar' ? 'اشترك الآن' : 'Subscribe Now'}</span>
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
                        : 'bg-[#141A2E] text-amber-200 border-amber-400/60 shadow-sm'
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
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/20 to-amber-500/20 border border-amber-400/50 hover:border-amber-300 text-amber-400 font-black text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                    title={language === 'ar' ? 'سلسلة الالتزام ومشاركة كرت الإنجاز' : 'Workout Streak & Share Card'}
                  >
                    <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    <span className="font-mono tabular-nums">
                      {streakData.currentStreak} {language === 'ar' ? 'يوم' : 'Days'}
                    </span>
                    <span className="hidden md:inline text-[10px] text-amber-200 font-bold">
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
                    <span aria-hidden="true" className="text-slate-400">·</span>
                    <span className="font-mono text-[11px] text-slate-400">Standard</span>
                  </div>

                  {/* Direct "Upgrade to VIP" CTA in Top Bar for Standard Subscribers */}
                  <button
                    type="button"
                    onClick={handleOpenUpgradeToVIP}
                    className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-[#0B132B] font-black text-xs flex items-center gap-1.5 shadow-[0_0_18px_rgba(245,158,11,0.35)] border border-amber-200/80 transition-transform duration-150 hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <Crown className="w-3.5 h-3.5 text-[#0B132B] fill-[#0B132B]/20 shrink-0" />
                    <span>{language === 'ar' ? 'ترقية إلى VIP' : 'Upgrade to VIP'}</span>
                  </button>
                </>
              )}

              {/* Live Subscription Remaining Days Pill */}
              <div
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-bold whitespace-nowrap ${
                  clientSubDetails.isExpired
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                    : clientSubDetails.isExpiringSoon
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
                    : 'bg-white/5 border-white/10 text-slate-300'
                }`}
                title={language === 'ar' ? `فترة الاشتراك: من ${clientSubDetails.startDate} إلى ${clientSubDetails.endDate}` : `Period: ${clientSubDetails.startDate} to ${clientSubDetails.endDate}`}
              >
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {clientSubDetails.isExpired
                    ? language === 'ar'
                      ? 'منتهي 🔒'
                      : 'Expired 🔒'
                    : `${clientSubDetails.daysRemaining} ${language === 'ar' ? 'يوم متبقي' : 'days left'}`}
                </span>
              </div>

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
            </div>
          )}

          {userSession === 'admin' && (
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold ${
                  theme === 'dark'
                    ? 'bg-blue-600/15 border-blue-500/40 text-blue-300'
                    : 'bg-gradient-to-r from-[#0B132B] to-[#1C2541] text-white border-blue-500/40'
                }`}
              >
                <ShieldCheck className="w-4 h-4 text-orange-400" />
                <span>{language === 'ar' ? 'لوحة تحكم الكوتش (عمر عدنان)' : 'Coach Admin Portal'}</span>
              </div>
            </div>
          )}

          {/* Action Buttons: QR Share, Logins, Logout, Theme, Language */}
          <div className="flex items-center gap-2">
            {/* QR Code Generator Button for sharing Subscriptions directly */}
            {!isDirectPlansLanding && (
              <button
                type="button"
                onClick={() => setIsQRModalOpen(true)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
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
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
              >
                {language === 'ar' ? 'الصفحة الرئيسية الكاملة' : 'Full Website'}
              </button>
            )}

            {/* GUEST ACTIONS: Athlete Passcode Login + Coach Passkey */}
            {userSession === 'guest' && !isDirectPlansLanding && (
              <>
                <button
                  onClick={handleOpenAthleteLogin}
                  className="px-3 sm:px-4 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-black text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-white" />
                  <span>{language === 'ar' ? 'دخول المشترك برمز سري' : 'Passcode Login'}</span>
                </button>

                <button
                  onClick={handleOpenCoachPasskey}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5 ${
                    theme === 'dark'
                      ? 'bg-blue-950/60 hover:bg-blue-900/60 border-blue-500/40 text-blue-300'
                      : 'bg-white hover:bg-slate-100 border-slate-300 text-[#0B132B] shadow-xs'
                  }`}
                  title={language === 'ar' ? 'دخول الكوتش برمز المرور' : 'Coach Passkey Access'}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                  <span className="hidden sm:inline">{language === 'ar' ? 'دخول الكوتش' : 'Coach'}</span>
                </button>
              </>
            )}

            {/* LOGGED IN LOGOUT BUTTON */}
            {userSession !== 'guest' && (
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 hover:text-red-300 text-xs font-bold transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                title={language === 'ar' ? 'تسجيل الخروج والعودة للرئيسية' : 'Log Out'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{language === 'ar' ? 'تسجيل الخروج' : 'Log Out'}</span>
              </button>
            )}

            {/* Language Toggle */}
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
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

            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className={`p-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
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
          </div>
        </div>
      </header>

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
          VIEW 1: GUEST VISITOR (Sees ONLY Landing Hero, 3D Brand & Pricing Plans)
          ========================================================================= */}
      {!isDirectPlansLanding && userSession === 'guest' && (
        <div className="space-y-0">
          {/* 3D Cinematic Gym Hero */}
          <CinematicHero
            onEnterPortal={handleOpenAthleteLogin}
            onOpenPrograms={scrollToPlans}
            onOpenCoaches={scrollToBrand}
            onOpenFacilities={scrollToPlans}
            onOpenAuth={handleOpenAthleteLogin}
            language={language}
          />

          {/* 3D Metallic Brand Identity & Technical Blueprint Section */}
          <div ref={brandSectionRef}>
            <BrandHeroSection
              onEnterPortal={handleOpenAthleteLogin}
              onOpenAdmin={handleOpenCoachPasskey}
              language={language}
            />
          </div>

          {/* Membership Pricing Plans (Standard Silver, Gold Neon, Platinum VIP) */}
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
      {/* 2A: Subscription Expired Locked Portal */}
      {!isDirectPlansLanding && userSession === 'client' && isClientExpired && (
        <main ref={portalRef} className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-20 relative z-20">
          <SubscriptionExpiredLockScreen
            profile={profile}
            language={language}
            theme={theme}
            onOpenRenewModal={handleOpenUpgradeToVIP}
            onOpenCoachPasskeyModal={handleOpenCoachPasskey}
            onSignOut={handleLogout}
          />
        </main>
      )}

      {/* 2B: Active Subscription Athlete Portal */}
      {!isDirectPlansLanding && userSession === 'client' && !isClientExpired && (
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
                        ? 'text-amber-500 dark:text-amber-300'
                        : 'text-slate-500 dark:text-slate-400'
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
                        : 'bg-[#141A2E] border-amber-400/60 text-amber-100'
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
                onLogTodayWorkout={handleLogTodayWorkout}
                onUseStreakFreeze={handleUseStreakFreeze}
                onOpenShareCard={() => setIsShareCardModalOpen(true)}
                language={language}
                theme={theme}
              />
            </VIPFeatureGate>
          </div>
        </main>
      )}

      {/* =========================================================================
          VIEW 3: COACH ADMIN PORTAL (Entered via passkey 1234)
          ========================================================================= */}
      {!isDirectPlansLanding && userSession === 'admin' && (
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-6 pb-20 relative z-20">
          <AdminDashboard
            profile={profile}
            onUpdateProfile={handleUpdateProfile}
            workoutDays={workoutDays}
            onUpdateWorkouts={handleUpdateWorkouts}
            notes={notes}
            onReplyNote={handleReplyNote}
            onSwitchToClient={() => setUserSession('guest')}
            language={language}
            theme={theme}
            onOpenShareCard={() => setIsShareCardModalOpen(true)}
            onOpenQRModal={() => setIsQRModalOpen(true)}
            streakData={streakData}
          />
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
          <div className="flex items-center gap-2 font-bold text-slate-400">
            <span>© 2026 OWN AURA OUTCOME (OAO)</span>
            <span>•</span>
            <span>COACH OMAR ADNAN</span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {language === 'ar' ? 'نظام الحفظ التلقائي ومزامنة Supabase نشط' : 'Auto-Save & Supabase Engine Active'}
            </span>
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainPortal />} />
        <Route path="/subscribe" element={<StandaloneSubscribePage />} />
        <Route path="/standard" element={<StandardDashboard />} />
        <Route path="/vip" element={<VipDashboard />} />
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
