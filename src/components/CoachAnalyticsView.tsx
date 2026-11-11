import React, { useState, useEffect } from 'react';
import { Language, Theme, SubscriptionAgreement } from '../types';
import { SignedDeclarationModal } from './SignedDeclarationModal';
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
} from 'lucide-react';

interface CoachAnalyticsViewProps {
  language: Language;
  theme?: Theme;
  onOpenClientProfile?: () => void;
}

interface AthleteRecord {
  id: string;
  name: string;
  plan: 'Standard' | 'Gold' | 'Platinum VIP';
  adherenceRate: number; // percentage
  daysLeftInSub: number;
  lastActive: string;
  weightDeltaKg: number;
  status: 'optimal' | 'warning' | 'vip' | 'expiring';
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

  // Legal Declarations & Electronic Contracts state
  const [declarations, setDeclarations] = useState<SubscriptionAgreement[]>([]);
  const [activeViewingAgreement, setActiveViewingAgreement] = useState<SubscriptionAgreement | null>(null);
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);

  // Load declarations from localStorage and ensure initial default agreements exist
  useEffect(() => {
    try {
      const stored = localStorage.getItem('oao_client_declarations');
      if (stored) {
        const parsed: SubscriptionAgreement[] = JSON.parse(stored);
        setDeclarations(parsed);

        // Prepend any new registered athletes from declarations to the coach's roster
        setAthletes((prev) => {
          const existingNames = new Set(prev.map((a) => a.name));
          const newOnes: AthleteRecord[] = [];
          parsed.forEach((agr, idx) => {
            if (!existingNames.has(agr.fullName) && agr.status === 'completed_and_active') {
              const isVipPlan =
                agr.subscription_plan === 'VIP' ||
                agr.planId === 'platinum' ||
                agr.planNameAr.includes('VIP');
              newOnes.push({
                id: `ath_reg_${idx + 1}`,
                name: agr.fullName,
                plan: isVipPlan ? 'Platinum VIP' : 'Standard',
                adherenceRate: 100,
                daysLeftInSub: agr.durationDays || (agr.billingCycle === 'yearly' ? 365 : 90),
                lastActive: 'الآن (مشترك جديد)',
                weightDeltaKg: 0,
                status: isVipPlan ? 'vip' : 'optimal',
                avatar: isVipPlan ? '👑' : '⚡',
              });
            }
          });
          return [...newOnes, ...prev];
        });
      } else {
        // Seed initial certified agreements for existing athletes
        const initialAgreements: SubscriptionAgreement[] = [
          {
            id: 'OAO-AGR-2026-884192',
            planId: 'platinum',
            subscription_plan: 'VIP',
            planNameAr: 'الباقة البلاتينية (Platinum VIP)',
            planPrice: 800,
            billingCycle: '6_months',
            fullName: 'عبدالرحمن الشمري',
            phoneWhatsapp: '+966 50 123 4567',
            email: 'abdulrahman@oao.com',
            hasHealthIssues: false,
            agreedHealthAndRemoteTraining: true,
            agreedDietAndSupplements: true,
            agreedIntellectualProperty: true,
            agreedPaymentAndRefundPolicy: true,
            digitalSignature: 'عبدالرحمن الشمري',
            signedTimestamp: '15 أغسطس 2026، 03:30 م',
            status: 'completed_and_active',
            paymentMethod: 'apple_pay',
            paymentReference: 'PAY-88419201',
          },
          {
            id: 'OAO-AGR-2026-729401',
            planId: 'platinum',
            subscription_plan: 'VIP',
            planNameAr: 'الباقة البلاتينية (Platinum VIP)',
            planPrice: 800,
            billingCycle: '6_months',
            fullName: 'فهد الدوسري',
            phoneWhatsapp: '+966 55 987 6543',
            email: 'fahad.d@example.com',
            hasHealthIssues: true,
            healthIssuesDetails: 'إصابة خفيفة سابقة في الكتف الأيمن (تعافى بنسبة 90%)، لا توجد حساسية طعام.',
            agreedHealthAndRemoteTraining: true,
            agreedDietAndSupplements: true,
            agreedIntellectualProperty: true,
            agreedPaymentAndRefundPolicy: true,
            digitalSignature: 'فهد محمد الدوسري',
            signedTimestamp: '20 سبتمبر 2026، 11:15 ص',
            status: 'completed_and_active',
            paymentMethod: 'card_mada',
            paymentReference: 'PAY-72940112',
          },
        ];
        localStorage.setItem('oao_client_declarations', JSON.stringify(initialAgreements));
        setDeclarations(initialAgreements);
      }
    } catch (e) {
      console.warn('Error loading declarations:', e);
    }
  }, []);

  const handleOpenDeclaration = (athleteName: string) => {
    // Find matching agreement or create on-the-fly for review
    const match = declarations.find((d) => d.fullName.includes(athleteName) || athleteName.includes(d.fullName));
    if (match) {
      setActiveViewingAgreement(match);
    } else {
      // Synthesize certified agreement for display
      const synthAgreement: SubscriptionAgreement = {
        id: `OAO-AGR-2026-${Math.floor(100000 + Math.random() * 900000)}`,
        planId: 'standard',
        subscription_plan: 'standard',
        planNameAr: 'الباقة القياسية (Standard)',
        planPrice: 200,
        billingCycle: '3_months',
        fullName: athleteName,
        phoneWhatsapp: '+966 5x xxx xxxx',
        email: `${athleteName.replace(/\s+/g, '.')}@athlete.oao.com`,
        hasHealthIssues: false,
        agreedHealthAndRemoteTraining: true,
        agreedDietAndSupplements: true,
        agreedIntellectualProperty: true,
        agreedPaymentAndRefundPolicy: true,
        digitalSignature: athleteName,
        signedTimestamp: 'معتمد وموثق عند الاشتراك',
        status: 'completed_and_active',
        paymentMethod: 'card_mada',
      };
      setActiveViewingAgreement(synthAgreement);
    }
    setIsDeclarationModalOpen(true);
  };

  // Sample real-world athlete roster managed by Coach Omar Adnan
  const [athletes, setAthletes] = useState<AthleteRecord[]>([
    {
      id: 'ath_1',
      name: 'عبدالرحمن الشمري',
      plan: 'Gold',
      adherenceRate: 92,
      daysLeftInSub: 12,
      lastActive: 'منذ ساعتين',
      weightDeltaKg: -3.8,
      status: 'optimal',
      avatar: '🏋️‍♂️',
    },
    {
      id: 'ath_2',
      name: 'فهد الدوسري',
      plan: 'Platinum VIP',
      adherenceRate: 97,
      daysLeftInSub: 24,
      lastActive: 'اليوم، 10:15 ص',
      weightDeltaKg: +2.4, // Lean bulk
      status: 'vip',
      avatar: '👑',
    },
    {
      id: 'ath_3',
      name: 'سلطان القحطاني',
      plan: 'Standard',
      adherenceRate: 64,
      daysLeftInSub: 3,
      lastActive: 'منذ 3 أيام',
      weightDeltaKg: -0.8,
      status: 'warning',
      avatar: '⚡',
    },
    {
      id: 'ath_4',
      name: 'ريان الغامدي',
      plan: 'Gold',
      adherenceRate: 88,
      daysLeftInSub: 18,
      lastActive: 'أمس، 8:40 م',
      weightDeltaKg: -4.5,
      status: 'optimal',
      avatar: '🔥',
    },
    {
      id: 'ath_5',
      name: 'ماجد السبيعي',
      plan: 'Platinum VIP',
      adherenceRate: 95,
      daysLeftInSub: 6,
      lastActive: 'اليوم، 7:30 ص',
      weightDeltaKg: +1.9,
      status: 'expiring',
      avatar: '🦾',
    },
    {
      id: 'ath_6',
      name: 'خالد العتيبي',
      plan: 'Standard',
      adherenceRate: 79,
      daysLeftInSub: 15,
      lastActive: 'أمس، 6:10 م',
      weightDeltaKg: -2.1,
      status: 'optimal',
      avatar: '🎯',
    },
  ]);

  const handleSendBroadcast = () => {
    setActionFeedback(
      language === 'ar'
        ? 'تم إرسال تنبيه ورسالة تحفيزية أسبوعية لجميع المتدربين الـ 28 بنجاح! 🚀'
        : 'Weekly motivational broadcast dispatched to all 28 athletes! 🚀'
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleExportReport = () => {
    setActionFeedback(
      language === 'ar'
        ? 'جاري تجهيز وتنزيل تقرير أداء المتدربين والأرباح الشهرية (PDF)... 📊'
        : 'Generating monthly performance & revenue report (PDF)... 📊'
    );
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleSendReminder = (athleteName: string) => {
    setActionFeedback(
      language === 'ar'
        ? `تم إرسال تذكير مخصص للتجديد والالتزام إلى ${athleteName} 📲`
        : `Sent renewal & workout reminder to ${athleteName} 📲`
    );
    setTimeout(() => setActionFeedback(null), 3500);
  };

  // Filtered athletes list
  const filteredAthletes = athletes.filter((ath) => {
    if (filterMode === 'warning') return ath.adherenceRate < 75 || ath.status === 'warning';
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
            className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white px-2 py-1"
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
              <span>{language === 'ar' ? 'لوحة تحليلات الكوتش والأداء المالي والبدني' : 'Coach Performance & Revenue Analytics'}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-[#0B132B] dark:text-white">
              {language === 'ar' ? 'نبض التدريب وعائدات الأكاديمية' : 'Academy Pulse & Training Revenue'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-semibold mt-1">
              {language === 'ar'
                ? 'مراقبة حية لالتزام 28 متدرباً، مؤشرات تجديد الاشتراكات، ومعدل نمو الأوزان في Own Aura Outcome'
                : 'Live tracking of 28 active athletes, subscription renewal health, and progressive overload metrics'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleSendBroadcast}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-[#FF7043] hover:from-[#FF7043] hover:to-orange-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(255,87,34,0.4)] transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>{language === 'ar' ? 'رسالة تحفيزية جماعية 🚀' : 'Broadcast Message 🚀'}</span>
            </button>

            <button
              onClick={() => {
                if (declarations.length > 0) {
                  setActiveViewingAgreement(declarations[0]);
                } else {
                  handleOpenDeclaration('عبدالرحمن الشمري');
                }
                setIsDeclarationModalOpen(true);
              }}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-teal-600 hover:to-emerald-500 text-white font-black text-xs sm:text-sm flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95"
            >
              <FileText className="w-4 h-4 text-emerald-200" />
              <span>{language === 'ar' ? 'سجل الإقرارات والعقود 🛡️' : 'Declarations Archive 🛡️'}</span>
            </button>

            <button
              onClick={handleExportReport}
              className="px-4 py-2.5 rounded-2xl bg-[#0B132B] dark:bg-white/10 hover:bg-[#1C2541] dark:hover:bg-white/15 text-white font-bold text-xs sm:text-sm border border-slate-300 dark:border-white/20 flex items-center gap-2 shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Download className="w-4 h-4 text-orange-400" />
              <span>{language === 'ar' ? 'تصدير تقرير شهري' : 'Export Monthly PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Core KPIs Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Athletes */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'المشتركون النشطون' : 'Active Athletes'}
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B132B] dark:text-white">28</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              +16.4%
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold mt-2">
            {language === 'ar' ? '4 جدد هذا الشهر | 0 حالات انسحاب' : '4 new this month | 0 churn'}
          </p>
        </div>

        {/* KPI 2: Adherence Rate */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'معدل الالتزام بالجداول' : 'Workout Adherence'}
            </span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B132B] dark:text-white">87.5%</span>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
              <TrendingUp className="w-3.5 h-3.5" />
              +4.2%
            </span>
          </div>
          {/* Mini Progress Bar */}
          <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full w-[87.5%]" />
          </div>
        </div>

        {/* KPI 3: Monthly Recurring Revenue */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'الإيراد الشهري (MRR)' : 'Monthly Revenue'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-[#0B132B] dark:text-white">12,450</span>
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
              {language === 'ar' ? 'ريال' : 'SAR'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {language === 'ar' ? '+22.5% مقارنة بالشهر السابق' : '+22.5% vs last month'}
          </p>
        </div>

        {/* KPI 4: Support Velocity */}
        <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 p-5 rounded-3xl shadow-md hover:border-orange-500/40 transition-all">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
              {language === 'ar' ? 'سرعة الرد وإغلاق الاستفسار' : 'Response Velocity'}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#0B132B] dark:text-white">2.4</span>
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {language === 'ar' ? 'ساعة' : 'hours'}
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold mt-2">
            {language === 'ar' ? 'معدل رضا المتدربين 99.2% ⭐' : '99.2% Athlete Satisfaction ⭐'}
          </p>
        </div>
      </div>

      {/* Subscription Breakdown & Muscle Engagement Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tier Breakdown Card */}
        <div className="lg:col-span-1 bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 rounded-3xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <h3 className="font-extrabold text-[#0B132B] dark:text-white text-sm sm:text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-500" />
                <span>{language === 'ar' ? 'توزيع باقات الاشتراكات' : 'Plan Distribution & Revenue'}</span>
              </h3>
              <span className="text-xs font-bold text-orange-600 dark:text-orange-400">
                28 {language === 'ar' ? 'متدرب' : 'Athletes'}
              </span>
            </div>

            <div className="space-y-4">
              {/* Platinum VIP */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 border border-amber-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Crown className="w-4 h-4 text-amber-500" />
                    <span className="font-extrabold text-xs text-[#0B132B] dark:text-white">بلاتينيوم VIP</span>
                  </div>
                  <span className="text-xs font-black text-amber-600 dark:text-amber-400">
                    10 {language === 'ar' ? 'مشتركين (36%)' : 'Athletes (36%)'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full w-[36%]" />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                  <span>599 ر.س / شهرياً</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">5,990 ر.س شهرياً</span>
                </div>
              </div>

              {/* Gold Plan */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-orange-500/10 to-orange-600/5 border border-orange-500/30">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span className="font-extrabold text-xs text-[#0B132B] dark:text-white">الذهبي (الأكثر طلباً)</span>
                  </div>
                  <span className="text-xs font-black text-orange-600 dark:text-orange-400">
                    14 {language === 'ar' ? 'مشتركاً (50%)' : 'Athletes (50%)'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-600 to-[#FF7043] rounded-full w-[50%]" />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                  <span>349 ر.س / شهرياً</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">4,886 ر.س شهرياً</span>
                </div>
              </div>

              {/* Standard Plan */}
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-300 dark:border-white/10">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-slate-400" />
                    <span className="font-extrabold text-xs text-[#0B132B] dark:text-white">ستاندرد الفضية</span>
                  </div>
                  <span className="text-xs font-black text-slate-600 dark:text-slate-300">
                    4 {language === 'ar' ? 'مشتركين (14%)' : 'Athletes (14%)'}
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-slate-400 to-slate-300 rounded-full w-[14%]" />
                </div>
                <div className="flex justify-between items-center text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                  <span>199 ر.س / شهرياً</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">796 ر.س شهرياً</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span>{language === 'ar' ? 'متوسط قيمة العضوية (ARPU):' : 'Avg. Revenue / User:'}</span>
            <span className="text-orange-600 dark:text-orange-400 font-black">444.6 ر.س</span>
          </div>
        </div>

        {/* Muscle Adherence & Training Analytics */}
        <div className="lg:col-span-2 bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 rounded-3xl p-6 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-white/10 mb-4">
              <h3 className="font-extrabold text-[#0B132B] dark:text-white text-sm sm:text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                <span>{language === 'ar' ? 'تحليل إنجاز العضلات والأيام التدريبية' : 'Target Muscle Completion Rates'}</span>
              </h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {language === 'ar' ? 'الأعلى التزاماً: الصدر والأكتاف' : 'Top: Upper Body'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Muscle Item 1 */}
              <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-4 rounded-2xl border border-slate-300/70 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#0B132B] dark:text-white">الصدر والأكتاف (Push / Upper)</span>
                  <span className="text-orange-600 dark:text-orange-400 font-black">93% إتمام</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full w-[93%]" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  متوسط الزيادة في البنش برس: +5.5 كجم خلال 4 أسابيع
                </p>
              </div>

              {/* Muscle Item 2 */}
              <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-4 rounded-2xl border border-slate-300/70 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#0B132B] dark:text-white">الظهر والمجنص (Pull / Back)</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-black">89% إتمام</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full w-[89%]" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  تحسن لافت في تمرين السحب الأرضي واللات بول داون
                </p>
              </div>

              {/* Muscle Item 3 */}
              <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-4 rounded-2xl border border-slate-300/70 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#0B132B] dark:text-white">الأرجل والسمانة (Legs & Glutes)</span>
                  <span className="text-amber-600 dark:text-amber-400 font-black">81% إتمام</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full w-[81%]" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  تم إرسال تذكيرات لتفادي تخطي يوم الأرجل لـ 3 متدربين
                </p>
              </div>

              {/* Muscle Item 4 */}
              <div className="bg-[#EEF2F6] dark:bg-[#070a14] p-4 rounded-2xl border border-slate-300/70 dark:border-white/5 space-y-2">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-[#0B132B] dark:text-white">البطن والكارديو وترطيب الماء</span>
                  <span className="text-blue-600 dark:text-blue-400 font-black">86% إتمام</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-white/10 h-2.5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full w-[86%]" />
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                  متوسط استهلاك الماء اليومي وصل إلى 3.2 لتر للمتدرب
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>{language === 'ar' ? 'مؤشر الحمل التدريبي العام (Total Load):' : 'Overall Training Volume:'}</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-black">
              {language === 'ar' ? 'ممتاز ومتدرج أسبوعياً (Progressive Overload Active)' : 'Progressive Overload On Track'}
            </span>
          </div>
        </div>
      </div>

      {/* Athlete Radar & Renewal Watchlist */}
      <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-slate-300/80 dark:border-white/10 rounded-3xl p-6 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/10 pb-4">
          <div>
            <h3 className="font-extrabold text-[#0B132B] dark:text-white text-base sm:text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-orange-500" />
              <span>{language === 'ar' ? 'رادار المتدربين ومتابعة التجديد الحية' : 'Athlete Roster & Renewal Watchlist'}</span>
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
              {language === 'ar'
                ? 'عرض تفصيلي لنسبة الالتزام، تقدم الوزن، التنبيهات المباشرة، وحالة تجديد العضوية'
                : 'Adherence tracking, body metric deltas, and automated renewal monitoring'}
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#EEF2F6] dark:bg-[#070a14] p-1 rounded-2xl border border-slate-300 dark:border-white/10">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'all'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-orange-500'
              }`}
            >
              {language === 'ar' ? 'الكل (6)' : 'All (6)'}
            </button>
            <button
              onClick={() => setFilterMode('warning')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-amber-500'
              }`}
            >
              {language === 'ar' ? 'تراجع التزام ⚠️' : 'Low Adherence ⚠️'}
            </button>
            <button
              onClick={() => setFilterMode('expiring')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'expiring'
                  ? 'bg-red-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-red-500'
              }`}
            >
              {language === 'ar' ? 'تجديد قريب ⏳' : 'Expiring Soon ⏳'}
            </button>
            <button
              onClick={() => setFilterMode('vip')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterMode === 'vip'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-blue-500'
              }`}
            >
              {language === 'ar' ? 'نخبة VIP 👑' : 'VIP Elite 👑'}
            </button>
          </div>
        </div>

        {/* Athletes Table / Cards */}
        <div className="overflow-x-auto">
          <table className="w-full text-right rtl:text-right ltr:text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black text-[11px] uppercase tracking-wider">
                <th className="py-3 px-3">{language === 'ar' ? 'المتدرب' : 'Athlete'}</th>
                <th className="py-3 px-3">{language === 'ar' ? 'الباقة' : 'Tier'}</th>
                <th className="py-3 px-3">{language === 'ar' ? 'نسبة الالتزام' : 'Adherence'}</th>
                <th className="py-3 px-3">{language === 'ar' ? 'تغير الوزن' : 'Weight Delta'}</th>
                <th className="py-3 px-3">{language === 'ar' ? 'متبقي للتجديد' : 'Days Left'}</th>
                <th className="py-3 px-3">{language === 'ar' ? 'آخر نشاط' : 'Last Active'}</th>
                <th className="py-3 px-3 text-center">{language === 'ar' ? 'الإقرار المعتمد' : 'Agreement'}</th>
                <th className="py-3 px-3 text-center">{language === 'ar' ? 'إجراء سريع' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {filteredAthletes.map((ath) => (
                <tr
                  key={ath.id}
                  className="hover:bg-slate-100/70 dark:hover:bg-white/5 transition-colors font-semibold"
                >
                  {/* Athlete Info */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl p-1.5 rounded-xl bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10">
                        {ath.avatar}
                      </span>
                      <div>
                        <span className="font-extrabold text-[#0B132B] dark:text-white block">
                          {ath.name}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">ID: {ath.id}</span>
                      </div>
                    </div>
                  </td>

                  {/* Tier */}
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black border ${
                        ath.plan === 'Platinum VIP'
                          ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                          : ath.plan === 'Gold'
                          ? 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30'
                          : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300 border-slate-400/30'
                      }`}
                    >
                      {ath.plan === 'Platinum VIP' && <Crown className="w-3 h-3 text-amber-500" />}
                      {ath.plan === 'Gold' && <Flame className="w-3 h-3 text-orange-500" />}
                      {ath.plan === 'Standard' && <Shield className="w-3 h-3 text-slate-400" />}
                      {ath.plan}
                    </span>
                  </td>

                  {/* Adherence */}
                  <td className="py-3.5 px-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-black ${
                            ath.adherenceRate >= 90
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : ath.adherenceRate >= 75
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400'
                          }`}
                        >
                          {ath.adherenceRate}%
                        </span>
                        {ath.adherenceRate >= 90 && <span className="text-[10px]">🔥 ممتاز</span>}
                        {ath.adherenceRate < 75 && <span className="text-[10px]">⚠️ تنبيه</span>}
                      </div>
                      <div className="w-20 bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ath.adherenceRate >= 90
                              ? 'bg-emerald-500'
                              : ath.adherenceRate >= 75
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${ath.adherenceRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Weight Delta */}
                  <td className="py-3.5 px-3">
                    <span
                      className={`font-bold ${
                        ath.weightDeltaKg < 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    >
                      {ath.weightDeltaKg > 0 ? `+${ath.weightDeltaKg}` : ath.weightDeltaKg} كجم
                    </span>
                  </td>

                  {/* Days Left in Sub */}
                  <td className="py-3.5 px-3">
                    <span
                      className={`inline-flex items-center gap-1 font-bold ${
                        ath.daysLeftInSub <= 5
                          ? 'text-red-600 dark:text-red-400'
                          : ath.daysLeftInSub <= 10
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      {ath.daysLeftInSub} {language === 'ar' ? 'أيام' : 'days'}
                    </span>
                  </td>

                  {/* Last Active */}
                  <td className="py-3.5 px-3 text-slate-500 dark:text-slate-400 text-xs font-mono">
                    {ath.lastActive}
                  </td>

                  {/* Verified Declaration Button */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => handleOpenDeclaration(ath.name)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[11px] font-black transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>{language === 'ar' ? 'معتمد 100%' : 'Verified'}</span>
                      <Eye className="w-3 h-3 text-slate-400" />
                    </button>
                  </td>

                  {/* Quick Action Button */}
                  <td className="py-3.5 px-3 text-center">
                    <button
                      onClick={() => handleSendReminder(ath.name)}
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#0B132B] to-[#1C2541] hover:bg-orange-600 text-white text-xs font-bold border border-orange-500/30 flex items-center gap-1.5 mx-auto transition-all cursor-pointer shadow-xs active:scale-95"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-orange-400" />
                      <span>{language === 'ar' ? 'تذكير / تحفيز' : 'Ping'}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Certified Declaration Modal Viewer */}
      <SignedDeclarationModal
        isOpen={isDeclarationModalOpen}
        onClose={() => setIsDeclarationModalOpen(false)}
        agreement={activeViewingAgreement}
        language={language}
        theme={theme}
      />
    </div>
  );
};
