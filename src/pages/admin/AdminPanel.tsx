import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Language,
  Theme,
  SubscriptionAgreement,
  AIGenerationLog,
} from '../../types';
import {
  INITIAL_CLIENT_PROFILE,
  INITIAL_WORKOUT_DAYS,
  INITIAL_CLIENT_NOTES,
} from '../../data/initialData';
import { BrandLogo } from '../../components/BrandLogo';
import { SignedDeclarationModal } from '../../components/SignedDeclarationModal';
import { SubscriptionQRModal } from '../../components/SubscriptionQRModal';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  SUPABASE_SQL_SCHEMA,
  fetchAILogs,
} from '../../lib/supabase';
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
  QrCode,
  Crown,
  Shield,
  Clock,
  Eye,
  Home,
  LogOut,
  ExternalLink,
  Share2,
  AlertCircle,
  Calendar,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  // Load language & theme
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('oao_theme') as Theme) || 'dark';
  });

  const [activeTab, setActiveTab] = useState<'subscribers' | 'workouts' | 'inquiries' | 'database'>('subscribers');

  // Real Subscribers & Declarations (Starts Clean without Fake Mock Data)
  const [declarations, setDeclarations] = useState<SubscriptionAgreement[]>(() => {
    try {
      const stored = localStorage.getItem('oao_client_declarations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [selectedDeclaration, setSelectedDeclaration] = useState<SubscriptionAgreement | null>(null);
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Workouts State
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(() => {
    const saved = localStorage.getItem('oao_workout_days');
    return saved ? JSON.parse(saved) : INITIAL_WORKOUT_DAYS;
  });
  const [selectedDayKey, setSelectedDayKey] = useState<string>('upper');
  const [newExerciseModalOpen, setNewExerciseModalOpen] = useState(false);
  const [newExNameAr, setNewExNameAr] = useState('');
  const [newExNameEn, setNewExNameEn] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState('10 - 12');
  const [newExVideo, setNewExVideo] = useState('');

  // Inquiries & Notes State
  const [notes, setNotes] = useState<ClientNote[]>(() => {
    const saved = localStorage.getItem('oao_client_notes');
    return saved ? JSON.parse(saved) : INITIAL_CLIENT_NOTES;
  });
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});

  // Database & AI Logs State
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.key);
  const [connStatus, setConnStatus] = useState<{ testing: boolean; message: string; success?: boolean; isLocalMode?: boolean }>({
    testing: false,
    message: '',
  });
  const [savedConfigMessage, setSavedConfigMessage] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [aiLogs, setAiLogs] = useState<AIGenerationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Refresh declarations and live notes on load
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oao_client_declarations');
      if (stored) {
        setDeclarations(JSON.parse(stored));
      }
    } catch {
      // ignore
    }

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

  const refreshAILogs = async () => {
    setLoadingLogs(true);
    const records = await fetchAILogs();
    setAiLogs(records);
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (activeTab === 'database') {
      refreshAILogs();
    }
  }, [activeTab]);

  const handleCopySubscribeLink = () => {
    const url = `${window.location.origin}/subscribe`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenDeclaration = (decl: SubscriptionAgreement) => {
    setSelectedDeclaration(decl);
    setIsDeclarationModalOpen(true);
  };

  // Reply to note
  const handleSendReply = (noteId: string) => {
    const text = replyTexts[noteId]?.trim();
    if (!text) return;
    const updated = notes.map((n) =>
      n.id === noteId
        ? {
            ...n,
            reply: text,
            replyTimestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            isResolved: true,
          }
        : n
    );
    setNotes(updated);
    localStorage.setItem('oao_client_notes', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    window.dispatchEvent(new Event('storage'));
    setReplyTexts((prev) => ({ ...prev, [noteId]: '' }));
  };

  // Add exercise to workout split
  const handleAddExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExNameAr.trim()) return;

    const newEx: Exercise = {
      id: `ex_${Date.now()}`,
      nameAr: newExNameAr.trim(),
      nameEn: newExNameEn.trim() || newExNameAr.trim(),
      targetMuscleAr: newExMuscle.trim() || 'العضلات المستهدفة',
      targetMuscleEn: newExMuscle.trim() || 'Target Muscle',
      setsCount: Number(newExSets) || 3,
      repsRange: newExReps.trim() || '10 - 12',
      recommendedRestSeconds: 90,
      videoUrl: newExVideo.trim() || undefined,
      formTipsAr: ['أداء منضبط وتحكم كامل في المدى الحركي'],
      formTipsEn: ['Controlled cadence and full range of motion'],
      sets: Array.from({ length: Number(newExSets) || 3 }, (_, idx) => ({
        setNumber: idx + 1,
        targetReps: newExReps.trim() || '10',
        targetWeightKg: 20,
        completedWeightKg: '',
        completedReps: '',
        isCompleted: false,
      })),
    };

    const updated = workoutDays.map((day) =>
      day.key === selectedDayKey ? { ...day, exercises: [...day.exercises, newEx] } : day
    );

    setWorkoutDays(updated);
    localStorage.setItem('oao_workout_days', JSON.stringify(updated));

    setNewExNameAr('');
    setNewExNameEn('');
    setNewExMuscle('');
    setNewExVideo('');
    setNewExerciseModalOpen(false);
  };

  // Delete exercise
  const handleDeleteExercise = (dayKey: string, exId: string) => {
    const updated = workoutDays.map((day) =>
      day.key === dayKey ? { ...day, exercises: day.exercises.filter((e) => e.id !== exId) } : day
    );
    setWorkoutDays(updated);
    localStorage.setItem('oao_workout_days', JSON.stringify(updated));
  };

  const handleLogout = () => {
    localStorage.setItem('oao_session', 'guest');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-orange-500 selection:text-white font-['Alexandria',sans-serif]">
      {/* Background Ambience */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-700/10 rounded-full blur-[180px] pointer-events-none" />

      {/* ADMIN TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#070e24]/95 backdrop-blur-xl border-b border-blue-500/30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_4px_30px_rgba(30,58,138,0.2)]">
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
                <span className="text-orange-500">AURA</span>
                <span>OUTCOME</span>
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-bold tracking-widest">
                COACH ADMIN PANEL
              </span>
            </div>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>لوحة تحكم الكوتش (عمر عدنان)</span>
          </div>
        </div>

        {/* Quick Tools & Session Controls */}
        <div className="flex items-center gap-2">
          {/* Share / Copy Subscribe link */}
          <button
            onClick={handleCopySubscribeLink}
            className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
            title="نسخ رابط صفحة الاشتراك المستقلة"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {copiedLink ? 'تم نسخ الرابط!' : 'رابط الاشتراك'}
            </span>
          </button>

          {/* QR Code Modal Button */}
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="باركود الاشتراكات"
          >
            <QrCode className="w-4 h-4 text-orange-400" />
          </button>

          {/* View VIP Portal */}
          <button
            onClick={() => navigate('/vip')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
            title="معاينة بوابة VIP"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">بوابة VIP</span>
          </button>

          {/* View Standard Portal */}
          <button
            onClick={() => navigate('/standard')}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
            title="معاينة البوابة القياسية"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">القياسية</span>
          </button>

          {/* Return Home */}
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="الرئيسية"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ADMIN TABS & CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#070e24]/80 border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'subscribers'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المشتركون والعقود المعتمدة</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono">
              {declarations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('workouts')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'workouts'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>محرر جداول التمارين</span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'inquiries'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>استفسارات المشتركين</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono">
              {notes.filter((n) => !n.isResolved).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>قاعدة البيانات و Supabase</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: SUBSCRIBERS & CERTIFIED CONTRACTS (Clean Real Data / Empty State)
            ========================================================================= */}
        {activeTab === 'subscribers' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-orange-400" />
                  <span>عقود المشتركين والإقرارات المعتمدة</span>
                </h2>
                <p className="text-xs text-slate-400 font-medium mt-1">
                  المشتركون الحقيقيون الذين قاموا بتعبئة الإقرار وحفظ وثيقة الـ PDF
                </p>
              </div>

              <button
                onClick={handleCopySubscribeLink}
                className="px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                <span>{copiedLink ? 'تم نسخ الرابط!' : 'مشاركة رابط التسجيل (/subscribe)'}</span>
              </button>
            </div>

            {/* If zero real subscribers: SHOW CLEAN EMPTY STATE */}
            {declarations.length === 0 ? (
              <div className="rounded-3xl p-12 bg-[#0B132B]/50 border-2 border-dashed border-white/15 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto border border-orange-500/20">
                  <Users className="w-8 h-8" />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-lg font-black text-white">لا توجد اشتراكات مسجلة حالياً</h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    تم تفريغ البيانات الوهمية بالكامل. عندما يقوم أي مشترك جديد بتعبئة نموذج الإقرار
                    وحفظ وثيقة الـ PDF أو التواصل معك عبر الواتساب، ستظهر عقوده وبياناته هنا فوراً.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleCopySubscribeLink}
                    className="px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs tracking-wider uppercase shadow-lg transition-transform hover:scale-105 cursor-pointer"
                  >
                    نسخ رابط صفحة الاشتراك لإرساله للمتدربين
                  </button>
                </div>
              </div>
            ) : (
              /* REAL SUBSCRIBERS TABLE */
              <div className="rounded-3xl bg-[#0B132B]/90 border border-white/10 overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#070e24] text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="p-4 font-bold">رقم العقد</th>
                        <th className="p-4 font-bold">اسم المتدرب</th>
                        <th className="p-4 font-bold">الباقة</th>
                        <th className="p-4 font-bold">المدة والسعر</th>
                        <th className="p-4 font-bold">رقم الجوال</th>
                        <th className="p-4 font-bold">تاريخ الاعتماد</th>
                        <th className="p-4 font-bold text-center">وثيقة الإقرار</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {declarations.map((decl) => (
                        <tr key={decl.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 font-mono font-bold text-orange-400">{decl.id}</td>
                          <td className="p-4 font-black text-white">{decl.fullName}</td>
                          <td className="p-4">
                            {decl.subscription_plan === 'VIP' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
                                <Crown className="w-3 h-3 text-amber-400" />
                                <span>VIP</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600 font-bold">
                                <Shield className="w-3 h-3 text-slate-300" />
                                <span>Standard</span>
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-semibold text-slate-300">
                            {decl.durationLabelAr || '3 شهور'} ({decl.planPrice} ريال)
                          </td>
                          <td className="p-4 font-mono text-slate-400">{decl.phoneWhatsapp}</td>
                          <td className="p-4 text-slate-400">{decl.signedTimestamp}</td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => handleOpenDeclaration(decl)}
                              className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center justify-center gap-1.5 mx-auto cursor-pointer transition-all hover:scale-105"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>عرض العقد PDF</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 2: WORKOUTS EDITOR
            ========================================================================= */}
        {activeTab === 'workouts' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10">
              <div>
                <h2 className="text-xl font-black text-white">إدارة وتحديث جدول التمارين</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تعديل التمارين، الجلسات، التكرارات، وإضافة فيديوهات تعليمية للمشتركين
                </p>
              </div>

              <button
                onClick={() => setNewExerciseModalOpen(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة تمرين جديد</span>
              </button>
            </div>

            {/* Split Days Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {workoutDays.map((day) => (
                <button
                  key={day.key}
                  onClick={() => setSelectedDayKey(day.key)}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer ${
                    selectedDayKey === day.key
                      ? 'bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500/40'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-xs font-black block text-white">{day.titleAr}</span>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    {day.exercises.length} تمارين مخصصة
                  </span>
                </button>
              ))}
            </div>

            {/* Exercises List for Selected Day */}
            {workoutDays
              .filter((day) => day.key === selectedDayKey)
              .map((day) => (
                <div key={day.key} className="space-y-3">
                  {day.exercises.map((ex, exIdx) => (
                    <div
                      key={ex.id}
                      className="p-5 rounded-2xl bg-[#0B132B]/80 border border-white/10 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono font-black text-sm">
                          {exIdx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-black text-white">{ex.nameAr}</h4>
                          <span className="text-xs text-slate-400">
                            {ex.targetMuscleAr} • {ex.setsCount} جلسات × {ex.repsRange}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteExercise(day.key, ex.id)}
                        className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer"
                        title="حذف التمرين"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}

        {/* =========================================================================
            TAB 3: INQUIRIES & NOTES
            ========================================================================= */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <div className="bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10">
              <h2 className="text-xl font-black text-white">صندوق استفسارات المشتركين</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                تواصل مباشر مع المتدربين والرد على ملاحظاتهم اليومية
              </p>
            </div>

            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[#0B132B]/60 border border-white/10 space-y-3">
                  <MessageSquare className="w-10 h-10 text-orange-400/40 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">
                    لا توجد استفسارات مرسلة من المشتركين حالياً.
                  </p>
                  <p className="text-xs text-slate-500">
                    عندما يقوم أي مشترك بكتابة استفسار من حسابه، سيصلك فورياً هنا للرد عليه مباشرة.
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                <div
                  key={note.id}
                  className="p-6 rounded-3xl bg-[#0B132B]/90 border border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <span className="text-sm font-black text-white">{note.clientName}</span>
                      <span className="text-xs text-slate-400 mx-2">•</span>
                      <span className="text-xs text-orange-400 font-bold">{note.subject}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">{note.timestamp}</span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
                    {note.message}
                  </p>

                  {note.reply ? (
                    <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between text-orange-400 font-bold">
                        <span>رد الكوتش عمر:</span>
                        <span className="text-[10px] text-slate-400">{note.replyTimestamp}</span>
                      </div>
                      <p className="text-slate-200">{note.reply}</p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={replyTexts[note.id] || ''}
                        onChange={(e) =>
                          setReplyTexts((prev) => ({ ...prev, [note.id]: e.target.value }))
                        }
                        placeholder="اكتب رد الكوتش هنا..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs outline-none"
                      />
                      <button
                        onClick={() => handleSendReply(note.id)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs transition-transform hover:scale-105 cursor-pointer"
                      >
                        إرسال الرد
                      </button>
                    </div>
                  )}
                </div>
              )))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: DATABASE STATUS, SUPABASE CLOUD SYNC & AI LOGS
            ========================================================================= */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* System Operational Mode Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#071329] to-[#040817] border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">الوضع المحلي المباشر نشط (Active Local Storage Mode)</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                        100% OPERATIONAL
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      جميع أقسام المنصة (المشتركون، التمارين، الأنظمة الغذائية، مؤشر BMI، الاستفسارات، والإقرارات والعقود) تعمل وتُحفظ محلياً وفورياً 100% دون انقطاع.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Supabase Cloud Connection Settings */}
            <div className="bg-[#0B132B]/80 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-orange-400" />
                    <span>إعدادات ربط Supabase السحابي (اختياري)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    إذا أردت مزامنة بيانات المشتركين سحابياً بين أجهزة متعددة، أدخل رابط مشروعك ومفتاح anon العام هنا أو في ملف <span className="text-orange-400 font-mono">.env</span>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setConnStatus({ testing: true, message: 'جاري فحص الاتصال...' });
                      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
                      setConnStatus({
                        testing: false,
                        message: res.message,
                        success: res.success,
                        isLocalMode: res.isLocalMode,
                      });
                    }}
                    disabled={connStatus.testing}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${connStatus.testing ? 'animate-spin' : ''}`} />
                    <span>فحص الاتصال بقاعدة البيانات</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {connStatus.message && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 transition-all ${
                    connStatus.success
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : connStatus.isLocalMode
                      ? 'bg-blue-500/15 border-blue-500/50 text-blue-200 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                      : 'bg-red-500/15 border-red-500/50 text-red-300'
                  }`}
                >
                  {connStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  ) : connStatus.isLocalMode ? (
                    <ShieldCheck className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="block leading-relaxed">{connStatus.message}</span>
                    {connStatus.isLocalMode && (
                      <p className="text-[11px] text-slate-300 font-normal">
                        تنويه: لا تقلق! منصة OAO مصممة للعمل 100% في وضع عدم الاتصال (Offline First). يمكنك استخدام المنصة وإدارتها بالكامل دون ربط Supabase، أو ربطه لاحقاً في أي وقت.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Inputs for Supabase credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    رابط مشروع Supabase (Project URL):
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    من لوحة تحكم Supabase &gt; Project Settings &gt; API
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    مفتاح الربط العام (Anon Public Key):
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    مفتاح anon العام المخصص لتطبيقات الويب
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      saveSupabaseConfig(supabaseUrl, supabaseKey);
                      setSavedConfigMessage(true);
                      setTimeout(() => setSavedConfigMessage(false), 3000);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ بيانات الربط في المتصفح</span>
                  </button>

                  {savedConfigMessage && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم الحفظ بنجاح!</span>
                    </span>
                  )}
                </div>

                {/* Copy SQL Schema Button */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                    setCopiedSchema(true);
                    setTimeout(() => setCopiedSchema(false), 3000);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-orange-400" />
                  <span>{copiedSchema ? 'تم نسخ كود SQL بنجاح!' : 'نسخ كود SQL لتهيئة الجداول'}</span>
                </button>
              </div>
            </div>

            {/* AI Generation Logs Section */}
            <div className="bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">
                    سجلات توليد الخطط الذكية (AI Generation Logs)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تتبع الخطط التدريبية والغذائية المولدة بالذكاء الاصطناعي والمزامنة مع Supabase
                  </p>
                </div>
                <button
                  onClick={refreshAILogs}
                  className="text-xs text-orange-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>تحديث السجلات</span>
                </button>
              </div>

              {aiLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-white/5 rounded-2xl bg-black/20">
                  لا توجد سجلات توليد مسجلة حالياً (يتم تسجيلها تلقائياً عند توليد أي برنامج تدريبي أو غذائي)
                </div>
              ) : (
                <div className="space-y-3">
                  {aiLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                        <span>{log.id}</span>
                        <span>{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{log.client_name} • {log.plan_type === 'nutrition' ? 'خطة غذائية' : 'خطة تمارين'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-mono">
                          {log.model_name}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed bg-black/30 p-2.5 rounded-xl">{log.ai_output}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* New Exercise Modal */}
      {newExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0B132B] border border-orange-500/40 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg font-black text-white">إضافة تمرين جديد لجدول التدريب</h3>
            <form onSubmit={handleAddExercise} className="space-y-4 text-start">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اسم التمرين بالعربي:</label>
                <input
                  type="text"
                  required
                  value={newExNameAr}
                  onChange={(e) => setNewExNameAr(e.target.value)}
                  placeholder="مثال: ضغط صدر علوي بالبار"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">العضلة المستهدفة:</label>
                <input
                  type="text"
                  value={newExMuscle}
                  onChange={(e) => setNewExMuscle(e.target.value)}
                  placeholder="الصدر العلوي"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">عدد الجلسات:</label>
                  <input
                    type="number"
                    value={newExSets}
                    onChange={(e) => setNewExSets(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">نطاق التكرارات:</label>
                  <input
                    type="text"
                    value={newExReps}
                    onChange={(e) => setNewExReps(e.target.value)}
                    placeholder="10 - 12"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setNewExerciseModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-black"
                >
                  حفظ التمرين
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signed Declaration PDF Viewer Modal */}
      {selectedDeclaration && (
        <SignedDeclarationModal
          isOpen={isDeclarationModalOpen}
          onClose={() => {
            setIsDeclarationModalOpen(false);
            setSelectedDeclaration(null);
          }}
          agreement={selectedDeclaration}
          language={language}
        />
      )}

      {/* QR Code Sharing Modal */}
      <SubscriptionQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onPreviewDirectPage={() => navigate('/subscribe')}
        language={language}
      />
    </div>
  );
};
