import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Language,
  Theme,
} from '../../types';
import {
  INITIAL_CLIENT_PROFILE,
  INITIAL_WORKOUT_DAYS,
  INITIAL_CLIENT_NOTES,
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
import { calculateSubscriptionDetails } from '../../lib/subscriptionUtils';
import {
  Home,
  LogOut,
  Shield,
  Crown,
  Clock,
  ArrowRight,
  Sparkles,
  Calendar,
  Activity,
  Dumbbell,
  CheckCircle2,
} from 'lucide-react';

export const StandardDashboard: React.FC = () => {
  const navigate = useNavigate();

  // Load language & theme from storage
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('oao_theme') as Theme) || 'dark';
  });

  // Client Profile state
  const [profile, setProfile] = useState<ClientProfile>(() => {
    const saved = localStorage.getItem('oao_client_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_CLIENT_PROFILE, ...parsed, subscription_plan: 'standard' };
      } catch {
        // fallback
      }
    }
    return {
      ...INITIAL_CLIENT_PROFILE,
      subscription_plan: 'standard',
    };
  });

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

  // Real-time synchronization for coach replies and new notes
  useEffect(() => {
    const syncLiveNotes = () => {
      try {
        const savedNotes = localStorage.getItem('oao_client_notes');
        if (savedNotes) {
          setNotes(JSON.parse(savedNotes));
        }
      } catch {
        // ignore
      }
    };

    window.addEventListener('oao_notes_updated', syncLiveNotes);
    window.addEventListener('storage', syncLiveNotes);
    return () => {
      window.removeEventListener('oao_notes_updated', syncLiveNotes);
      window.removeEventListener('storage', syncLiveNotes);
    };
  }, []);

  // Modals state
  const [activeVideoExercise, setActiveVideoExercise] = useState<Exercise | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isRestTimerOpen, setIsRestTimerOpen] = useState(false);
  const [restTimerSeconds, setRestTimerSeconds] = useState(90);

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
    const latestRaw = localStorage.getItem('oao_client_notes');
    const existingList: ClientNote[] = latestRaw ? JSON.parse(latestRaw) : notes;
    const updated = [noteRecord, ...existingList];
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
    <div className="min-h-screen bg-[#030712] text-white selection:bg-orange-500 selection:text-white font-['Alexandria',sans-serif]">
      {/* Top Background Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-orange-600/10 rounded-full blur-[160px] pointer-events-none" />

      {/* TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#070e24]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
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
                <span className="text-[#EA580C]">AURA</span>
                <span>OUTCOME</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">STANDARD PORTAL</span>
            </div>
          </button>

          {/* Standard Tier Badge */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-600 text-slate-200 text-xs font-bold">
            <Shield className="w-3.5 h-3.5 text-slate-300" />
            <span>الباقة القياسية (Standard)</span>
          </div>
        </div>

        {/* Center / Right Status & Actions */}
        <div className="flex items-center gap-2.5">
          {/* Subscription remaining days */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-300">
            <Clock className="w-3.5 h-3.5 text-orange-400" />
            <span>{subDetails.daysRemaining} يوم متبقي</span>
          </div>

          {/* Upgrade to VIP Button */}
          <button
            onClick={() => navigate('/subscribe')}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-black text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all hover:scale-105 cursor-pointer"
          >
            <Crown className="w-3.5 h-3.5" />
            <span>ترقية إلى VIP</span>
          </button>

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
        {/* Welcome Header Card */}
        <div className="relative rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#0B132B] via-[#070E24] to-[#040817] border border-orange-500/25 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold mb-2">
                <Shield className="w-3.5 h-3.5 text-slate-300" />
                <span>عضوية الباقة القياسية (Standard Athlete)</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">
                أهلاً بك يا بطل! {profile.name} 👋
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 font-medium mt-1">
                جدول تمارينك المعتمد والمتابعة الدورية مع الكوتش عمر عدنان
              </p>
            </div>
          </div>

          {/* 5-Card Official Biometrics Bar (المشترك، الوزن، الطول، العضلات، الدهون) */}
          <div className="relative z-10 mt-6 pt-6 border-t border-white/10">
            <AthleteBiometricsBar
              profile={profile}
              language={language}
              theme={theme}
              isVIP={false}
            />
          </div>
        </div>

        {/* Upgrade to VIP Callout Banner */}
        <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500/10 via-[#0B132B] to-orange-500/10 border border-amber-400/40 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-400/30 shrink-0">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-300">
                هل ترغب في الحصول على مميزات الباقة البلاتينية VIP؟
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
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
            <Dumbbell className="w-5 h-5 text-orange-400" />
            <h2 className="text-lg font-black text-white">جدول التمارين الأسبوعي</h2>
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
        />

        {/* COACH NOTES & INQUIRIES */}
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
    </div>
  );
};
