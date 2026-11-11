import React, { useState } from 'react';
import {
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Language,
  Theme,
  StreakData,
  AIGenerationLog,
} from '../types';
import {
  Users,
  Dumbbell,
  MessageSquare,
  Database,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Copy,
  ShieldCheck,
  RefreshCw,
  TrendingUp,
  Utensils,
  QrCode,
  Crown,
  Shield,
  Calendar,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  fetchAILogs,
  normalizeSubscriptionPlan,
} from '../lib/supabase';
import {
  calculateSubscriptionDetails,
  addDaysToDate,
  getTodayIsoString,
} from '../lib/subscriptionUtils';
import { CoachAnalyticsView } from './CoachAnalyticsView';
import { VIPBadge } from './VIPBadge';

interface AdminDashboardProps {
  profile: ClientProfile;
  onUpdateProfile: (updatedProfile: ClientProfile) => void;
  workoutDays: WorkoutDay[];
  onUpdateWorkouts: (updatedDays: WorkoutDay[]) => void;
  notes: ClientNote[];
  onReplyNote: (noteId: string, replyText: string) => void;
  onSwitchToClient: () => void;
  language: Language;
  theme?: Theme;
  onOpenShareCard?: () => void;
  onOpenQRModal?: () => void;
  streakData?: StreakData;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  profile,
  onUpdateProfile,
  workoutDays,
  onUpdateWorkouts,
  notes,
  onReplyNote,
  onSwitchToClient,
  language,
  theme,
  onOpenShareCard,
  onOpenQRModal,
}) => {
  const [activeTab, setActiveTab] = useState<'analytics' | 'clients' | 'workouts' | 'inquiries' | 'database'>('analytics');

  // Client stats edit state
  const [editedProfile, setEditedProfile] = useState<ClientProfile>({ ...profile });
  const [profileSavedFeedback, setProfileSavedFeedback] = useState(false);

  // Inquiries reply state
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Workouts edit state
  const [selectedDayKey, setSelectedDayKey] = useState<string>('upper');
  const [newExerciseModalOpen, setNewExerciseModalOpen] = useState(false);
  const [newExNameAr, setNewExNameAr] = useState('');
  const [newExNameEn, setNewExNameEn] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState('10 - 12');
  const [newExVideo, setNewExVideo] = useState('');

  // Supabase settings & AI Logs state
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.key);
  const [connStatus, setConnStatus] = useState<{ testing: boolean; message: string; success?: boolean }>({
    testing: false,
    message: '',
  });
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [aiLogs, setAiLogs] = useState<AIGenerationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const refreshAILogs = async () => {
    setLoadingLogs(true);
    const records = await fetchAILogs();
    setAiLogs(records);
    setLoadingLogs(false);
  };

  React.useEffect(() => {
    setEditedProfile({ ...profile });
  }, [profile]);

  React.useEffect(() => {
    refreshAILogs();
  }, [activeTab]);

  // Save profile changes
  const handleSaveProfile = () => {
    const subDetails = calculateSubscriptionDetails(editedProfile);
    const finalizedProfile: ClientProfile = {
      ...editedProfile,
      subscriptionDaysLeft: subDetails.daysRemaining,
      subscriptionStatus: subDetails.status,
      subscriptionStartDate: subDetails.startDate,
      subscriptionEndDate: subDetails.endDate,
    };
    setEditedProfile(finalizedProfile);
    onUpdateProfile(finalizedProfile);
    setProfileSavedFeedback(true);
    setTimeout(() => setProfileSavedFeedback(false), 3000);
  };

  // Reply to note
  const handleSendReply = (noteId: string) => {
    const text = replyTexts[noteId]?.trim();
    if (!text) return;
    onReplyNote(noteId, text);
    setReplyTexts((prev) => ({ ...prev, [noteId]: '' }));
  };

  // Add exercise to selected day
  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExNameAr.trim()) return;

    const newEx: Exercise = {
      id: `ex_${Date.now()}`,
      nameAr: newExNameAr,
      nameEn: newExNameEn || newExNameAr,
      targetMuscleAr: newExMuscle || 'عضلات مستهدفة',
      targetMuscleEn: newExMuscle || 'Target Muscle',
      setsCount: Number(newExSets) || 3,
      repsRange: newExReps,
      recommendedRestSeconds: 90,
      videoUrl: newExVideo.trim() || undefined,
      formTipsAr: ['أداء منضبط ومحكوم مع ثبات لوحي الكتف', 'تنفس سليم عند الانقباض والانبساط'],
      formTipsEn: ['Controlled form with steady core', 'Exhale on exertion, inhale on release'],
      sets: Array.from({ length: Number(newExSets) || 3 }, (_, i) => ({
        setNumber: i + 1,
        targetReps: newExReps,
        targetWeightKg: 40,
        completedWeightKg: '',
        completedReps: '',
        isCompleted: false,
      })),
    };

    const updated = workoutDays.map((day) => {
      if (day.key === selectedDayKey) {
        return {
          ...day,
          exercises: [...day.exercises, newEx],
        };
      }
      return day;
    });

    onUpdateWorkouts(updated);
    setNewExerciseModalOpen(false);
    setNewExNameAr('');
    setNewExNameEn('');
    setNewExMuscle('');
    setNewExVideo('');
  };

  // Delete exercise
  const handleDeleteExercise = (dayKey: string, exId: string) => {
    const updated = workoutDays.map((day) => {
      if (day.key === dayKey) {
        return {
          ...day,
          exercises: day.exercises.filter((ex) => ex.id !== exId),
        };
      }
      return day;
    });
    onUpdateWorkouts(updated);
  };

  // Test Supabase connection
  const handleTestSupabase = async () => {
    setConnStatus({ testing: true, message: 'Testing connection...' });
    saveSupabaseConfig(supabaseUrl, supabaseKey);
    const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
    setConnStatus({ testing: false, message: res.message, success: res.success });
  };

  const copySqlSchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2500);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Top Banner / Switch */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/90 dark:border-orange-500/40 p-4 rounded-3xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 shadow-md">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#0B132B] dark:text-white">
                {language === 'ar' ? 'لوحة تحكم المدرب عمر عدنان' : 'Coach Omar Adnan Dashboard'}
              </h2>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-extrabold border border-emerald-500/40">
                ADMIN
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">
              {language === 'ar'
                ? 'إدارة برامج المشتركين، تحديث الأوزان، الرد الفوري ومزامنة Supabase'
                : 'Athlete management, program assignments & live Supabase sync'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onOpenQRModal && (
            <button
              type="button"
              onClick={onOpenQRModal}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md"
            >
              <QrCode className="w-4 h-4" />
              <span>{language === 'ar' ? 'باركود إرسال الاشتراكات' : 'Share Subscriptions QR'}</span>
            </button>
          )}

          <button
            onClick={onSwitchToClient}
            className="px-4 py-2 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:from-[#1C2541] hover:to-[#0B132B] text-white font-bold text-xs border border-orange-500/40 flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-sm"
          >
            <span>{language === 'ar' ? 'معاينة شاشة المشترك 👁️' : 'View Client Portal 👁️'}</span>
          </button>
        </div>
      </div>

      {/* Admin Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-300/80 dark:border-white/10 pb-2">
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
              : 'bg-[#FAFBFD] dark:bg-[#0b132b] text-[#0B132B] dark:text-slate-300 hover:text-orange-500 border border-slate-300 dark:border-white/10'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-orange-400" />
          <span>{language === 'ar' ? 'لوحة تحليلات الكوتش' : 'Coach Analytics'}</span>
          <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] font-black border border-emerald-500/30">
            {language === 'ar' ? 'مباشر ⚡' : 'LIVE ⚡'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('inquiries')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
            activeTab === 'inquiries'
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
              : 'bg-[#FAFBFD] dark:bg-[#0b132b] text-[#0B132B] dark:text-slate-300 hover:text-orange-500 border border-slate-300 dark:border-white/10'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-orange-400" />
          <span>{language === 'ar' ? 'استفسارات المشتركين' : 'Client Inquiries'}</span>
          {notes.filter((n) => !n.isResolved).length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[10px]">
              {notes.filter((n) => !n.isResolved).length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('clients')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
            activeTab === 'clients'
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
              : 'bg-[#FAFBFD] dark:bg-[#0b132b] text-[#0B132B] dark:text-slate-300 hover:text-orange-500 border border-slate-300 dark:border-white/10'
          }`}
        >
          <Users className="w-4 h-4 text-orange-400" />
          <span>{language === 'ar' ? 'إدارة المشترك (عبدالرحمن)' : 'Athlete Profile'}</span>
        </button>

        <button
          onClick={() => setActiveTab('workouts')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
            activeTab === 'workouts'
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
              : 'bg-[#FAFBFD] dark:bg-[#0b132b] text-[#0B132B] dark:text-slate-300 hover:text-orange-500 border border-slate-300 dark:border-white/10'
          }`}
        >
          <Dumbbell className="w-4 h-4 text-orange-400" />
          <span>{language === 'ar' ? 'تعديل التمارين والجداول' : 'Manage Workouts'}</span>
        </button>

        <button
          onClick={() => setActiveTab('database')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm transition-all cursor-pointer ${
            activeTab === 'database'
              ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.5)]'
              : 'bg-[#FAFBFD] dark:bg-[#0b132b] text-[#0B132B] dark:text-slate-300 hover:text-orange-500 border border-slate-300 dark:border-white/10'
          }`}
        >
          <Database className="w-4 h-4 text-orange-400" />
          <span>{language === 'ar' ? 'إعدادات Supabase والـ SQL' : 'Supabase & SQL'}</span>
        </button>
      </div>

      {/* Tab 0: Coach Analytics */}
      {activeTab === 'analytics' && (
        <CoachAnalyticsView
          language={language}
          theme={theme}
          onOpenClientProfile={() => setActiveTab('clients')}
        />
      )}

      {/* Tab 1: Client Inquiries */}
      {activeTab === 'inquiries' && (
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/90 dark:border-orange-500/30 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 pb-3">
            <h3 className="text-base font-extrabold text-[#0B132B] dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 shadow-md">
                <MessageSquare className="w-4 h-4 text-orange-400" />
              </span>
              <span>{language === 'ar' ? 'الرسائل والملاحظات الواردة من المشتركين' : 'Incoming Inquiries from Athletes'}</span>
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
              {notes.length} {language === 'ar' ? 'ملاحظة مسجلة' : 'Total Notes'}
            </span>
          </div>

          <div className="space-y-4">
            {notes.map((note) => (
              <div
                key={note.id}
                className="bg-[#EEF2F6] dark:bg-[#070a14] border border-slate-300/80 dark:border-white/10 rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#0B132B] dark:text-white text-sm">{note.clientName}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-200 dark:bg-orange-500/10 text-orange-700 dark:text-orange-400 font-bold border border-orange-500/30">
                      {note.category}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">{note.timestamp}</span>
                </div>

                <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                  <h4 className="text-xs font-bold text-orange-300 mb-1">{note.subject}</h4>
                  <p className="text-xs text-slate-200">"{note.message}"</p>
                </div>

                {note.reply ? (
                  <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-xl">
                    <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold mb-1">
                      <span>✓ {language === 'ar' ? 'تم إرسال ردك:' : 'Your reply sent:'}</span>
                      <span className="text-slate-400 font-mono">{note.replyTimestamp}</span>
                    </div>
                    <p className="text-xs text-slate-200">{note.reply}</p>
                  </div>
                ) : (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder={
                          language === 'ar'
                            ? 'اكتب ردك المباشر للمشترك هنا...'
                            : 'Type coach response here...'
                        }
                        value={replyTexts[note.id] || ''}
                        onChange={(e) =>
                          setReplyTexts((prev) => ({ ...prev, [note.id]: e.target.value }))
                        }
                        className="flex-1 bg-[#0b132b] border border-white/10 focus:border-orange-500 rounded-xl px-3 py-2 text-xs text-white outline-none"
                      />
                      <button
                        onClick={() => handleSendReply(note.id)}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                      >
                        {language === 'ar' ? 'إرسال الرد 💬' : 'Reply 💬'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Client Profile Stats */}
      {activeTab === 'clients' && (
        <div className="bg-[#0b132b] border border-orange-500/30 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-400" />
              <span>{language === 'ar' ? 'تعديل بيانات المشترك وأهدافه' : 'Edit Athlete Stats & Targets'}</span>
            </h3>
            <div className="flex items-center gap-2">
              {onOpenShareCard && (
                <button
                  type="button"
                  onClick={onOpenShareCard}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>{language === 'ar' ? '✨ تصدير كرت إنجاز البطل' : '✨ Export Athlete Card'}</span>
                </button>
              )}
              {profileSavedFeedback && (
                <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  {language === 'ar' ? 'تم الحفظ وتحديث شاشة المشترك!' : 'Saved successfully!'}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Subscription Plan Control: standard vs VIP */}
            <div className="md:col-span-3 p-4 rounded-2xl bg-[#070a14] border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white">
                    {language === 'ar'
                      ? 'خطة اشتراك المشترك (subscription_plan في Supabase):'
                      : 'Subscriber Plan (subscription_plan in Supabase):'}
                  </span>
                  {normalizeSubscriptionPlan(editedProfile.subscription_plan) === 'VIP' ? (
                    <VIPBadge variant="compact" language={language} />
                  ) : (
                    <span className="text-xs font-mono text-slate-300">standard</span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  {language === 'ar'
                    ? 'تغيير الخطة هنا يحدّث صلاحيات المشترك وثيم واجهته وحالته في جدول المشتركين بـ Supabase.'
                    : 'Updating this field syncs subscriber permissions, UI theme, and Supabase clients record.'}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setEditedProfile({ ...editedProfile, subscription_plan: 'standard' })
                  }
                  className={`px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    normalizeSubscriptionPlan(editedProfile.subscription_plan) === 'standard'
                      ? 'bg-slate-800 border-slate-300 text-white'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-slate-300" />
                  <span>standard</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setEditedProfile({ ...editedProfile, subscription_plan: 'VIP' })
                  }
                  className={`px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    normalizeSubscriptionPlan(editedProfile.subscription_plan) === 'VIP'
                      ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:text-amber-300'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span>VIP</span>
                </button>
              </div>
            </div>

            {/* Coach Subscription Duration Controller: "من ... إلى ..." */}
            <div className="md:col-span-3 p-4 sm:p-5 rounded-2xl bg-[#070a14] border border-orange-500/40 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-orange-400" />
                  <div>
                    <h4 className="text-xs font-black text-white">
                      {language === 'ar'
                        ? 'إدارة فترة الاشتراك وقفل الحساب (من ... إلى ...)'
                        : 'Subscription Duration & Account Lock Controller'}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      {language === 'ar'
                        ? 'حدد فترة البداية والنهاية بدقة. إذا انتهت الفترة أو تم اختيار منتهي، يقفل الموقع فوراً على المشترك.'
                        : 'Set start and end dates. When expired, the portal automatically locks for this subscriber.'}
                    </p>
                  </div>
                </div>

                {/* Live Status Pill */}
                {(() => {
                  const liveDetails = calculateSubscriptionDetails(editedProfile);
                  return (
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 self-start sm:self-auto ${
                        liveDetails.isExpired
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : liveDetails.isExpiringSoon
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {liveDetails.isExpired ? (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'مقفل لانتهاء الاشتراك 🔒' : 'Locked — Expired'}</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {language === 'ar'
                              ? `نشط ومفتوح (${liveDetails.daysRemaining} يوم متبقي)`
                              : `Active (${liveDetails.daysRemaining}d left)`}
                          </span>
                        </>
                      )}
                    </span>
                  );
                })()}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Start Date */}
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {language === 'ar' ? 'تاريخ بداية الاشتراك (من):' : 'Start Date (From):'}
                  </label>
                  <input
                    type="date"
                    value={editedProfile.subscriptionStartDate || getTodayIsoString()}
                    onChange={(e) => {
                      const newStart = e.target.value;
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionStartDate: newStart,
                      }));
                    }}
                    className="w-full bg-[#0b132b] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                {/* End Date */}
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {language === 'ar' ? 'تاريخ نهاية الاشتراك (إلى):' : 'End Date (To):'}
                  </label>
                  <input
                    type="date"
                    value={
                      editedProfile.subscriptionEndDate ||
                      addDaysToDate(editedProfile.subscriptionStartDate || getTodayIsoString(), 30)
                    }
                    onChange={(e) => {
                      const newEnd = e.target.value;
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionEndDate: newEnd,
                      }));
                    }}
                    className="w-full bg-[#0b132b] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                {/* Status Override */}
                <div>
                  <label className="text-xs text-slate-300 font-bold block mb-1">
                    {language === 'ar' ? 'حالة الحساب المباشرة:' : 'Direct Account Status:'}
                  </label>
                  <select
                    value={editedProfile.subscriptionStatus}
                    onChange={(e) =>
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionStatus: e.target.value as 'active' | 'expiring' | 'expired',
                      }))
                    }
                    className="w-full bg-[#0b132b] border border-white/15 rounded-xl p-2.5 text-xs text-white outline-none focus:border-orange-500 font-bold"
                  >
                    <option value="active">{language === 'ar' ? 'نشط ومفتوح (Active)' : 'Active & Open'}</option>
                    <option value="expiring">{language === 'ar' ? 'ينتهي قريباً (Expiring Soon)' : 'Expiring Soon'}</option>
                    <option value="expired">{language === 'ar' ? 'منتهي ومقفل (Expired / Locked)' : 'Expired / Locked'}</option>
                  </select>
                </div>
              </div>

              {/* Quick Duration Preset Buttons */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-400 block">
                  {language === 'ar' ? 'أزرار تحديد وتمديد سريعة بنقرة واحدة:' : 'Quick Period Presets:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const start = editedProfile.subscriptionStartDate || getTodayIsoString();
                      const end = addDaysToDate(start, 30);
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionStartDate: start,
                        subscriptionEndDate: end,
                        subscriptionStatus: 'active',
                      }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    +30 يوم (شهر)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = editedProfile.subscriptionStartDate || getTodayIsoString();
                      const end = addDaysToDate(start, 60);
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionStartDate: start,
                        subscriptionEndDate: end,
                        subscriptionStatus: 'active',
                      }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    +60 يوم (شهرين)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = editedProfile.subscriptionStartDate || getTodayIsoString();
                      const end = addDaysToDate(start, 90);
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionStartDate: start,
                        subscriptionEndDate: end,
                        subscriptionStatus: 'active',
                      }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    +90 يوم (3 شهور)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = editedProfile.subscriptionStartDate || getTodayIsoString();
                      const end = addDaysToDate(start, 180);
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionStartDate: start,
                        subscriptionEndDate: end,
                        subscriptionStatus: 'active',
                      }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    +180 يوم (6 شهور)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const start = editedProfile.subscriptionStartDate || getTodayIsoString();
                      const end = addDaysToDate(start, 365);
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionStartDate: start,
                        subscriptionEndDate: end,
                        subscriptionStatus: 'active',
                      }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    +365 يوم (سنة)
                  </button>

                  {/* Lock immediately button */}
                  <button
                    type="button"
                    onClick={() => {
                      const yesterday = addDaysToDate(getTodayIsoString(), -1);
                      setEditedProfile((prev) => ({
                        ...prev,
                        subscriptionEndDate: yesterday,
                        subscriptionStatus: 'expired',
                      }));
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-black transition-all cursor-pointer flex items-center gap-1"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>قفل الموقع فوراً (إنهاء الاشتراك)</span>
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'اسم المشترك' : 'Athlete Name'}
              </label>
              <input
                type="text"
                value={editedProfile.name}
                onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'الوزن الحالي (KG)' : 'Current Weight (KG)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={editedProfile.weight}
                onChange={(e) => setEditedProfile({ ...editedProfile, weight: Number(e.target.value) })}
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'الطول (CM)' : 'Height (CM)'}
              </label>
              <input
                type="number"
                value={editedProfile.height}
                onChange={(e) => setEditedProfile({ ...editedProfile, height: Number(e.target.value) })}
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'حجم العضلات (KG)' : 'Muscle Mass (KG)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={editedProfile.muscleMass}
                onChange={(e) => setEditedProfile({ ...editedProfile, muscleMass: Number(e.target.value) })}
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'نسبة الدهون (%)' : 'Body Fat (%)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={editedProfile.bodyFat}
                onChange={(e) => setEditedProfile({ ...editedProfile, bodyFat: Number(e.target.value) })}
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'الوزن المستهدف المثالي (KG)' : 'Target Ideal Weight (KG)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={editedProfile.targetWeight}
                onChange={(e) => setEditedProfile({ ...editedProfile, targetWeight: Number(e.target.value) })}
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'السعرات الحرارية اليومية (Kcal)' : 'Daily Calories (Kcal)'}
              </label>
              <input
                type="number"
                value={editedProfile.dailyCalories}
                onChange={(e) => setEditedProfile({ ...editedProfile, dailyCalories: Number(e.target.value) })}
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'البروتين اليومي (g)' : 'Daily Protein (g)'}
              </label>
              <input
                type="number"
                value={editedProfile.macros.protein}
                onChange={(e) =>
                  setEditedProfile({
                    ...editedProfile,
                    macros: { ...editedProfile.macros, protein: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-medium block mb-1">
                {language === 'ar' ? 'الكاربوهيدرات (g)' : 'Daily Carbs (g)'}
              </label>
              <input
                type="number"
                value={editedProfile.macros.carbs}
                onChange={(e) =>
                  setEditedProfile({
                    ...editedProfile,
                    macros: { ...editedProfile.macros, carbs: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-slate-400">
              {language === 'ar'
                ? 'يتم حفظ السعرات والماكروز وفترة الاشتراك ومزامنتها فوراً مع Supabase'
                : 'Macros and subscription period sync instantly to Supabase'}
            </span>

            <button
              onClick={handleSaveProfile}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white font-bold text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(249,115,22,0.5)] transition-all active:scale-95 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{language === 'ar' ? 'حفظ التعديلات ومزامنتها فوراً' : 'Save Changes & Sync Now'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Tab 3: Manage Workouts & Exercises */}
      {activeTab === 'workouts' && (
        <div className="bg-[#0b132b] border border-orange-500/30 rounded-3xl p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-orange-400" />
              <h3 className="text-base font-bold text-white">
                {language === 'ar' ? 'إدارة برامج وتمارين المشترك' : 'Workout Program Builder'}
              </h3>
            </div>

            {/* Select Day & Add Exercise */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedDayKey}
                onChange={(e) => setSelectedDayKey(e.target.value)}
                className="bg-[#070a14] border border-orange-500/40 text-orange-400 font-bold rounded-xl px-3 py-1.5 text-xs outline-none"
              >
                {workoutDays.map((day) => (
                  <option key={day.key} value={day.key}>
                    {day.titleAr} ({day.key.toUpperCase()})
                  </option>
                ))}
              </select>

              <button
                onClick={() => setNewExerciseModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{language === 'ar' ? 'إضافة تمرين جديد' : 'Add Exercise'}</span>
              </button>
            </div>
          </div>



          {/* List of exercises in current selected day */}
          <div className="space-y-3">
            {workoutDays
              .find((d) => d.key === selectedDayKey)
              ?.exercises.map((ex) => (
                <div
                  key={ex.id}
                  className="bg-[#070a14] border border-white/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-orange-500/40 transition-colors"
                >
                  <div>
                    <h4 className="font-bold text-sm text-white">{ex.nameAr}</h4>
                    <p className="text-xs text-orange-400 font-medium">
                      {ex.targetMuscleAr} • {ex.setsCount} {language === 'ar' ? 'جلسات' : 'Sets'} • {ex.repsRange} {language === 'ar' ? 'تكرار' : 'reps'}
                    </p>
                    {ex.videoUrl && (
                      <span className="text-[10px] text-slate-400 truncate max-w-xs block mt-1">
                        URL: {ex.videoUrl}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDeleteExercise(selectedDayKey, ex.id)}
                      className="p-2 rounded-xl bg-red-950/40 border border-red-500/40 text-red-400 hover:bg-red-900 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Modal to add exercise */}
          {newExerciseModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <div className="bg-[#0b132b] border border-orange-500/40 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                <h3 className="text-lg font-bold text-white mb-4">
                  {language === 'ar' ? 'إضافة تمرين جديد للجدول' : 'Add New Exercise'}
                </h3>

                <form onSubmit={handleAddExercise} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">اسم التمرين (عربي)</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: Incline Dumbbell Flyes"
                      value={newExNameAr}
                      onChange={(e) => setNewExNameAr(e.target.value)}
                      className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">العضلة المستهدفة</label>
                    <input
                      type="text"
                      placeholder="مثال: الصدر العلوي"
                      value={newExMuscle}
                      onChange={(e) => setNewExMuscle(e.target.value)}
                      className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-400 mb-1">عدد الجلسات</label>
                      <input
                        type="number"
                        min="1"
                        max="8"
                        value={newExSets}
                        onChange={(e) => setNewExSets(Number(e.target.value))}
                        className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-white outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">مدى التكرارات</label>
                      <input
                        type="text"
                        placeholder="10 - 12"
                        value={newExReps}
                        onChange={(e) => setNewExReps(e.target.value)}
                        className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-white outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1">رابط فيديو الشرح (YouTube Embed)</label>
                    <input
                      type="text"
                      placeholder="https://www.youtube.com/embed/..."
                      value={newExVideo}
                      onChange={(e) => setNewExVideo(e.target.value)}
                      className="w-full bg-[#070a14] border border-white/10 rounded-xl p-2.5 text-white outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-3">
                    <button
                      type="button"
                      onClick={() => setNewExerciseModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-white/10 text-white"
                    >
                      إلغاء
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
                    >
                      إضافة التمرين
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Supabase Connection & SQL Schema */}
      {activeTab === 'database' && (
        <div className="bg-[#0b132b] border border-orange-500/30 rounded-3xl p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-orange-400" />
              <span>{language === 'ar' ? 'ربط قاعدة بيانات Supabase' : 'Supabase Integration & SQL'}</span>
            </h3>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>LocalStorage Sync: Active</span>
            </span>
          </div>

          <div className="bg-[#070a14] p-4 rounded-2xl border border-white/10 space-y-3">
            <p className="text-xs text-slate-300">
              {language === 'ar'
                ? 'النظام مزوّد بنظام حفظ محلي فوري (LocalStorage Auto-Save). لربطه مع قاعدة بيانات Supabase السحابية، أدخل بيانات مشروعك هنا:'
                : 'System features instant local auto-save. Connect your cloud Supabase database below:'}
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  SUPABASE PROJECT URL
                </label>
                <input
                  type="text"
                  placeholder="https://xyzcompany.supabase.co"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  className="w-full bg-[#0b132b] border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  SUPABASE ANON KEY
                </label>
                <input
                  type="password"
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  className="w-full bg-[#0b132b] border border-white/10 rounded-xl p-2.5 text-xs text-white font-mono outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  onClick={handleTestSupabase}
                  disabled={connStatus.testing}
                  className="px-5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${connStatus.testing ? 'animate-spin' : ''}`} />
                  <span>{connStatus.testing ? 'جاري الفحص...' : 'فحص الاتصال وحفظ الإعدادات'}</span>
                </button>

                {connStatus.message && (
                  <span
                    className={`text-xs font-bold ${
                      connStatus.success ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {connStatus.message}
                  </span>
                )}
              </div>
            </div>
          </div>



          <div className="bg-[#070a14] p-4 rounded-2xl border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-orange-400" />
                <span>سجلات جدول ai_generation_logs في Supabase ({aiLogs.length})</span>
              </h4>
              <button
                type="button"
                onClick={refreshAILogs}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-orange-400 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingLogs ? 'animate-spin' : ''}`} />
                <span>تحديث السجلات</span>
              </button>
            </div>

            {aiLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                لا توجد سجلات بعد في جدول ai_generation_logs. استخدم أزرار التوليد أعلاه لحفظ أول سجل.
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {aiLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-[#0b132b] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">
                          {log.plan_type === 'nutrition' ? 'برنامج غذائي' : 'برنامج تدريبي'}
                        </span>
                        <span className="font-mono text-[10px] text-orange-400">{log.model_name}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${
                            log.synced_to_supabase
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {log.synced_to_supabase ? 'Supabase Synced ✓' : 'Local Pending'}
                        </span>
                      </div>
                      <p className="text-slate-400 line-clamp-1">{log.ai_output || log.prompt_input}</p>
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 shrink-0">
                      {log.total_tokens} tokens • {new Date(log.created_at).toLocaleTimeString('ar-SA')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SQL Schema Copy Box */}
          <div className="bg-[#070a14] p-4 rounded-2xl border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>⚡</span>
                <span>كود بناء الجداول وصلاحيات ai_generation_logs (SQL Editor)</span>
              </h4>
              <button
                onClick={copySqlSchema}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-orange-400 font-semibold text-xs flex items-center gap-1 transition-all cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedSchema ? 'تم النسخ بنجاح! ✓' : 'نسخ كود الـ SQL'}</span>
              </button>
            </div>
            <pre className="p-3 bg-black/60 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-40 border border-white/5">
              {SUPABASE_SQL_SCHEMA}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
