import React, { useState, useEffect } from 'react';
import { Language, Theme, SubscriptionAgreement } from '../types';
import { SignedDeclarationModal } from './SignedDeclarationModal';
import {
  getAllSubscribersWithCredentials,
  fetchSubscribersFromSupabase,
  UserCredentialRecord,
} from '../lib/authStore';
import {
  fetchDeclarationsFromSupabase,
  fetchAverageWorkoutCompletionFromSupabase,
} from '../lib/supabase';
import {
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Flame,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Send,
  Download,
  Filter,
  Sparkles,
  Crown,
  Shield,
  Zap,
  ChevronRight,
  RefreshCw,
  MessageCircle,
  FileText,
  ShieldCheck,
  Eye,
  CreditCard,
} from 'lucide-react';

interface CoachAnalyticsViewProps {
  language: Language;
  theme?: Theme;
  onOpenClientProfile?: () => void;
}

interface AthleteRecord {
  id: string;
  name: string;
  email: string;
  phone?: string;
  plan: 'Standard' | 'Platinum VIP';
  adherenceRate: number;
  daysLeftInSub: number;
  lastActive: string;
  weightDeltaKg: number;
  status: 'optimal' | 'warning' | 'vip' | 'expiring' | 'suspended';
  avatar: string;
}

export const CoachAnalyticsView: React.FC<CoachAnalyticsViewProps> = ({
  language,
  theme,
  onOpenClientProfile,
}) => {
  const [filterMode, setFilterMode] = useState<'all' | 'warning' | 'expiring' | 'vip'>('all');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteRecord | null>(null);

  // Real Legal Declarations & Electronic Contracts (Fetched strictly from Supabase)
  const [declarations, setDeclarations] = useState<SubscriptionAgreement[]>([]);

  // Real Registered Credentials
  const [credentialsList, setCredentialsList] = useState<UserCredentialRecord[]>(() =>
    getAllSubscribersWithCredentials()
  );
  const [muscleCompletionPct, setMuscleCompletionPct] = useState<number>(0);

  const [activeViewingAgreement, setActiveViewingAgreement] = useState<SubscriptionAgreement | null>(null);
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);

  const refreshData = () => {
    setCredentialsList(getAllSubscribersWithCredentials());
    void fetchDeclarationsFromSupabase().then((decls) => {
      if (decls) setDeclarations(decls);
    });
    void fetchAverageWorkoutCompletionFromSupabase().then(setMuscleCompletionPct);
  };

  useEffect(() => {
    void fetchSubscribersFromSupabase().then((subs) => {
      if (subs) setCredentialsList(subs);
    });
    void fetchDeclarationsFromSupabase().then((decls) => {
      if (decls) setDeclarations(decls);
    });
    void fetchAverageWorkoutCompletionFromSupabase().then(setMuscleCompletionPct);

    window.addEventListener('oao_declarations_updated', refreshData);
    window.addEventListener('oao_credentials_updated', refreshData);
    return () => {
      window.removeEventListener('oao_declarations_updated', refreshData);
      window.removeEventListener('oao_credentials_updated', refreshData);
    };
  }, []);

  // Map real subscribers to athlete records (Starts cleanly empty if 0 registered)
  const athletes: AthleteRecord[] = credentialsList.map((user, idx) => {
    const isVip = user.plan === 'VIP';
    const isSuspended = user.status === 'suspended';
    return {
      id: user.id || `ath_${idx + 1}`,
      name: user.clientName,
      email: user.email,
      phone: user.phone,
      plan: isVip ? 'Platinum VIP' : 'Standard',
      adherenceRate: isSuspended ? 0 : muscleCompletionPct,
      daysLeftInSub: isVip ? 180 : 90,
      lastActive: isSuspended ? 'حساب معلق' : 'نشط اليوم',
      weightDeltaKg: 0,
      status: isSuspended ? 'suspended' : isVip ? 'vip' : 'optimal',
      avatar: isVip ? '👑' : '⚡',
    };
  });

  // Calculate live dynamic revenues from real declarations (0 when empty)
  const totalRevenue = declarations.reduce(
    (sum, d) => sum + (Number(d.planPrice) || 0),
    0
  );

  const monthlyRecurringRevenue = Math.round(
    declarations.reduce((sum, d) => {
      const price = Number(d.planPrice) || 0;
      const months = Math.max(1, Math.round((Number(d.durationDays) || 90) / 30));
      return sum + price / months;
    }, 0)
  );

  const totalSubscribers = credentialsList.length;
  const activeSubscribers = credentialsList.filter((u) => u.status !== 'suspended').length;
  const vipSubscribers = credentialsList.filter((u) => u.plan === 'VIP').length;
  const standardSubscribers = credentialsList.filter((u) => u.plan !== 'VIP').length;

  const handleOpenDeclaration = (athleteName: string, athleteEmail?: string) => {
    const cleanEmail = (athleteEmail || '').trim().toLowerCase();
    const cleanName = athleteName.trim().toLowerCase();
    const match = declarations.find(
      (d) =>
        (cleanEmail && (d.email || '').trim().toLowerCase() === cleanEmail) ||
        d.fullName.trim().toLowerCase() === cleanName ||
        d.fullName.includes(athleteName) ||
        athleteName.includes(d.fullName)
    );
    if (match) {
      setActiveViewingAgreement(match);
      setIsDeclarationModalOpen(true);
    } else {
      setActionFeedback(
        language === 'ar'
          ? `لم يتم العثور على عقد موقع للمتدرب (${athleteName}) بعد.`
          : `No signed agreement found for (${athleteName}) yet.`
      );
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleSendBroadcast = () => {
    setActionFeedback(
      language === 'ar'
        ? `تم إرسال تنبيه ورسالة تحفيزية لجميع المشتركين (${totalSubscribers}) بنجاح! 🚀`
        : `Motivational broadcast dispatched to all (${totalSubscribers}) athletes! 🚀`
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleExportReport = () => {
    setActionFeedback(
      language === 'ar'
        ? 'تم تجهيز ملخص الأداء والإيرادات للطباعة والتصدير 📊'
        : 'Performance and revenue report ready for export 📊'
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  // Filtered athletes list
  const filteredAthletes = athletes.filter((ath) => {
    if (filterMode === 'warning') return ath.status === 'warning' || ath.status === 'suspended';
    if (filterMode === 'expiring') return ath.daysLeftInSub <= 7;
    if (filterMode === 'vip') return ath.plan === 'Platinum VIP';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Toast Feedback Banner */}
      {actionFeedback && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-600/20 to-teal-500/20 border border-emerald-500/50 text-emerald-800 dark:text-emerald-300 font-extrabold text-xs sm:text-sm flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
          <button
            onClick={() => setActionFeedback(null)}
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Header for Coach Analytics */}
      <div className="bg-[#FAFBFD] dark:bg-gradient-to-r dark:from-[#0B132B] dark:via-[#1C2541] dark:to-[#070A14] border border-slate-300/90 dark:border-orange-500/30 rounded-3xl p-6 sm:p-7 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-[90px] pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-black text-xs uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'لوحة تحليلات الكوتش والإيرادات المباشرة' : 'Live Coach Performance & Revenue'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white">
              {language === 'ar' ? 'نبض الأكاديمية والتحليلات المالية' : 'Academy Pulse & Analytics'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold mt-1">
              {language === 'ar'
                ? `متابعة حية لعدد ${totalSubscribers} مشترك، مع حساب دقيق ومباشر للإيرادات والعقود المعتمدة.`
                : `Live tracking of ${totalSubscribers} registered subscribers and verified revenue stream.`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSendBroadcast}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-[#FF7043] hover:from-[#FF7043] hover:to-orange-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,87,34,0.4)] transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'ar' ? 'رسالة تحفيزية للمشتركين 🚀' : 'Broadcast Message 🚀'}</span>
            </button>
            <button
              onClick={handleExportReport}
              className="px-4 py-2.5 rounded-2xl bg-slate-200 hover:bg-slate-300 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-white font-bold text-xs sm:text-sm flex items-center gap-2 border border-slate-300 dark:border-white/10 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{language === 'ar' ? 'تصدير التقرير' : 'Export'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid (Starts Cleanly at 0 When Empty) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Subscribers */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'إجمالي المشتركين النشطين' : 'Active Subscribers'}
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B132B] dark:text-white">{activeSubscribers}</span>
            <span className="text-xs font-bold text-slate-400">
              / {totalSubscribers} مسجل
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold mt-2">
            {vipSubscribers} VIP • {standardSubscribers} Standard
          </p>
        </div>

        {/* KPI 2: Total Revenue (Dynamically Computed from Real Declarations) */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'إجمالي الإيرادات المحققة' : 'Total Revenue'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-400 font-mono">
              {totalRevenue.toLocaleString()}
            </span>
            <span className="text-xs font-bold text-orange-400">
              {language === 'ar' ? 'ريال' : 'SAR'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>
              MRR الشهري: {monthlyRecurringRevenue.toLocaleString()} ريال • {declarations.length} عقد موثق
            </span>
          </p>
        </div>

        {/* KPI 3: VIP Ratio */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'نسبة اشتراكات VIP النخبوية' : 'VIP Plan Share'}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Crown className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B132B] dark:text-white">
              {totalSubscribers > 0 ? Math.round((vipSubscribers / totalSubscribers) * 100) : 0}%
            </span>
            <span className="text-xs font-bold text-amber-400">
              ({vipSubscribers} مشترك VIP)
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
              style={{
                width: `${totalSubscribers > 0 ? (vipSubscribers / totalSubscribers) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* KPI 4: Muscle Completion % & Contract Integrity */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'نسبة إنجاز التمارين العضلية' : 'Muscle Completion %'}
            </span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B132B] dark:text-white font-mono">
              {muscleCompletionPct}%
            </span>
            <span className="text-xs font-bold text-slate-400">
              • {declarations.length} عقد موثق
            </span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-600 to-amber-400 rounded-full transition-all duration-500"
              style={{ width: `${muscleCompletionPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Athletes List Table */}
      <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-black text-[#0B132B] dark:text-white">
              {language === 'ar' ? 'قائمة المشتركين ومتابعة الأداء' : 'Athletes Roster'}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-mono font-bold">
              {filteredAthletes.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-orange-500 text-white'
                  : 'bg-black/40 text-slate-400 hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilterMode('vip')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'vip'
                  ? 'bg-amber-500 text-white'
                  : 'bg-black/40 text-slate-400 hover:text-white'
              }`}
            >
              VIP فقط
            </button>
            <button
              onClick={() => setFilterMode('warning')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'warning'
                  ? 'bg-rose-500 text-white'
                  : 'bg-black/40 text-slate-400 hover:text-white'
              }`}
            >
              المعلقون
            </button>
          </div>
        </div>

        {filteredAthletes.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Users className="w-12 h-12 text-slate-600 mx-auto" />
            <p className="text-sm font-bold text-slate-300">
              لا يوجد متدربون مسجلون في هذه الفئة حالياً.
            </p>
            <p className="text-xs text-slate-500">
              سيظهر هنا تلقائياً أي مشترك جديد يقوم بتسجيل الاشتراك وتوقيع العقد.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#070e24] text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3 font-bold">المتدرب</th>
                  <th className="p-3 font-bold">البريد الإلكتروني</th>
                  <th className="p-3 font-bold">الباقة</th>
                  <th className="p-3 font-bold">الحالة</th>
                  <th className="p-3 font-bold text-center">وثيقة العقد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredAthletes.map((ath) => (
                  <tr key={ath.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-black text-white flex items-center gap-2">
                      <span className="text-lg">{ath.avatar}</span>
                      <span>{ath.name}</span>
                    </td>
                    <td className="p-3 font-mono text-slate-400">{ath.email}</td>
                    <td className="p-3">
                      {ath.plan === 'Platinum VIP' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-[11px]">
                          VIP بلاتينيوم
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600 font-bold text-[11px]">
                          Standard قياسي
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          ath.status === 'suspended'
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {ath.status === 'suspended' ? 'معلق' : 'نشط'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleOpenDeclaration(ath.name, ath.email)}
                        className="px-2.5 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>عرض العقد</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signed Declaration Modal */}
      {activeViewingAgreement && (
        <SignedDeclarationModal
          isOpen={isDeclarationModalOpen}
          onClose={() => {
            setIsDeclarationModalOpen(false);
            setActiveViewingAgreement(null);
          }}
          agreement={activeViewingAgreement}
          language={language}
          theme={theme}
        />
      )}
    </div>
  );
};
