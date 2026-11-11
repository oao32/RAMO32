import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Language,
  Theme,
  StreakData,
  Badge,
  AthleteRank,
} from '../../types';
import {
  INITIAL_CLIENT_PROFILE,
  INITIAL_WORKOUT_DAYS,
  INITIAL_CLIENT_NOTES,
  INITIAL_STREAK_DATA,
  INITIAL_BADGES,
  INITIAL_ATHLETE_RANK,
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
import { calculateSubscriptionDetails } from '../../lib/subscriptionUtils';
import {
  Home,
  LogOut,
  Crown,
  Flame,
  Clock,
  Sparkles,
  Share2,
  Dumbbell,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';

export const VipDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Load language & theme
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('oao_theme') as Theme) || 'dark';
  });

  // Client Profile state (Locked as VIP)
  const [profile, setProfile] = useState<ClientProfile>(() => {
    const saved = localStorage.getItem('oao_client_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_CLIENT_PROFILE, ...parsed, subscription_plan: 'VIP' };
      } catch {
        // fallback
      }
    }
    return {
      ...INITIAL_CLIENT_PROFILE,
      name: 'عبدالرحمن الشمري',
      nameEn: 'Abdulrahman Al-Shammari',
      subscription_plan: 'VIP',
    };
  });

  // Real-time synchronization for coach replies and inquiries
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

  // Workouts state
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

  // Notes state
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

  // Streak & Gamification state
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

  // Modals state
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);
  const [isShareCardModalOpen, setIsShareCardModalOpen] = useState(false);

  const subDetails = calculateSubscriptionDetails(profile);

  const handleUpdateProfile = (updated: ClientProfile) => {
    setProfile(updated);
    localStorage.setItem('oao_client_profile', JSON.stringify(updated));
  };

  const handleUpdateWorkouts = (updatedDays: WorkoutDay[]) => {
    setWorkoutDays(updatedDays);
    localStorage.setItem('oao_workout_days', JSON.stringify(updatedDays));
  };

  const handleAddNote = (newNote: Omit<ClientNote, 'id' | 'timestamp' | 'isResolved'>) => {
    const noteRecord: ClientNote = {
      ...newNote,
      id: `note_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isResolved: false,
    };
    const updated = [noteRecord, ...notes];
    setNotes(updated);
    localStorage.setItem('oao_client_notes', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    window.dispatchEvent(new Event('storage'));
  };

  const handleLogout = () => {
    localStorage.setItem('oao_session', 'guest');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-amber-500 selection:text-black font-['Alexandria',sans-serif]">
      {/* Top Background Luxury Gold/Orange Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-amber-500/15 via-orange-600/10 to-transparent rounded-full blur-[160px] pointer-events-none" />

      {/* TOP NAVIGATION BAR - LUXURY VIP THEME */}
      <header className="sticky top-0 z-40 bg-[#070e24]/95 backdrop-blur-xl border-b border-amber-500/30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_4px_30px_rgba(245,158,11,0.1)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
            title="العودة للرئيسية"
          >
            <BrandLogo size="sm" showText={false} />
            <div className="flex flex-col text-start">
              <span className="text-sm font-black tracking-wider text-white flex items-center gap-1">
                <span>OWN</span>
                <span className="text-amber-400">AURA</span>
                <span>OUTCOME</span>
              </span>
              <span className="text-[10px] text-amber-300 font-mono font-bold tracking-widest">
                VIP ELITE PORTAL
              </span>
            </div>
          </button>

          {/* Luxury VIP Tag */}
          <VIPBadge variant="hero" language={language} />
        </div>

        {/* Center / Right VIP Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Streak pill with Share trigger */}
          <button
            onClick={() => setIsShareCardModalOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-orange-500/20 border border-amber-400/50 hover:border-amber-300 text-amber-300 font-black text-xs cursor-pointer transition-all hover:scale-105"
            title="مشاركة كرت الإنجاز والستريك"
          >
            <Flame className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-mono tabular-nums">{streakData.currentStreak} يوم التزام</span>
            <Share2 className="w-3 h-3 text-amber-400" />
          </button>

          {/* Subscription remaining days */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/50 border border-amber-500/30 text-xs font-mono text-amber-200">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{subDetails.daysRemaining} يوم متبقي</span>
          </div>

          {/* Direct Coach WhatsApp Quick Ping */}
          <a
            href="https://wa.me/966500000000"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition-all cursor-pointer"
            title="تواصل مباشر مع الكوتش عمر عبر الواتساب"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>كوتش عمر</span>
          </a>

          {/* Return Home Button */}
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="الرئيسية"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* DASHBOARD BODY */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Luxury Gold VIP Welcome Banner */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#171206] via-[#0E1528] to-[#040817] border-2 border-amber-400/50 shadow-[0_0_50px_rgba(245,158,11,0.25)] overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/60 text-amber-300 text-xs font-black mb-2 shadow-sm">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>عضوية الباقة البلاتينية النخبوية (Platinum VIP Member)</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-white flex items-center gap-2">
                <span>أهلاً بك يا بطل! {profile.name}</span>
                <span className="text-amber-400">👑</span>
              </h1>
              <p className="text-xs sm:text-sm text-amber-200/80 font-medium mt-1 max-w-xl">
                كامل مميزات المنظومة التدريبية مفتوحة لك: متابعة أسبوعية دقيقة، توجيه مباشر، وتحديثات دورية.
              </p>
            </div>
          </div>

          {/* 5-Card Official Biometrics Bar (المشترك، الوزن، الطول، العضلات، الدهون) */}
          <div className="relative z-10 mt-6 pt-6 border-t border-amber-500/20">
            <AthleteBiometricsBar
              profile={profile}
              language={language}
              theme={theme}
              isVIP={true}
            />
          </div>
        </div>

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
              <Dumbbell className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black text-white">جدول التمارين الأسبوعي VIP</h2>
            </div>
            <span className="text-xs font-bold text-amber-300 font-mono">
              متابعة أسبوعية مباشرة
            </span>
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
          <div className="rounded-3xl p-6 bg-gradient-to-br from-[#120F05] via-[#0B132B] to-[#040817] border-2 border-amber-400/40 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-amber-400 mb-2">
                <Crown className="w-5 h-5" />
                <h3 className="text-base font-black text-white">المساعد الرياضي الخاص VIP</h3>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">
                بصفتك مشتركاً في الباقة البلاتينية، لديك أولوية مطلقة في الرد على الاستفسارات،
                مراجعة تكنيك التمارين بالفيديو، وإمكانية تجميد الاشتراك عند السفر أو الانشغال.
              </p>
            </div>

            <div className="mt-5 pt-4 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
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

        {/* GAMIFICATION, STREAKS & BADGES */}
        <section className="space-y-4">
          <GamificationStreakSection
            streakData={streakData}
            badges={badges}
            athleteRank={athleteRank}
            onLogTodayWorkout={() => {
              setStreakData((prev) => ({
                ...prev,
                currentStreak: prev.currentStreak + 1,
                lastCompletedDate: new Date().toISOString().split('T')[0],
              }));
            }}
            onUseStreakFreeze={() => {
              setStreakData((prev) => ({
                ...prev,
                freezesRemaining: Math.max(0, prev.freezesRemaining - 1),
              }));
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
        />

        {/* DIRECT VIP NOTES & INQUIRIES WITH COACH */}
        <section className="space-y-4">
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
