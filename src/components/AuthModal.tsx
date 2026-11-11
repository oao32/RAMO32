import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Role, Language, SubscriptionPlanTier } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  KeyRound,
  X,
  ArrowRight,
  Flame,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { normalizeSubscriptionPlan } from '../lib/supabase';
import { authenticateUser } from '../lib/authStore';
import { Mail, Lock } from 'lucide-react';

export interface AllowedPasscode {
  code: string;
  plan: SubscriptionPlanTier;
  clientName: string;
  email?: string;
  role?: Role;
}

// --------------------------------------------------------------------------
// 1. القائمة اليدوية المعتمدة للأكواد المسموحة (Manual Allowed Passcodes Array)
// يمكن للمدرب إضافة أو تعديل أي كود للمشتركين هنا مباشرة
// --------------------------------------------------------------------------
export const ALLOWED_PASSCODES: AllowedPasscode[] = [
  {
    code: 'RAMO32',
    plan: 'VIP',
    clientName: 'مشترك VIP',
    email: 'ramo32@oao.athlete',
  },
  {
    code: 'OAO-101',
    plan: 'standard',
    clientName: 'مشترك قياسي',
    email: 'oao101@oao.athlete',
  },
  {
    code: 'OAO-VIP-1',
    plan: 'VIP',
    clientName: 'مشترك VIP',
    email: 'vip1@oao.athlete',
  },
  {
    code: 'OAO-STD-1',
    plan: 'standard',
    clientName: 'مشترك قياسي',
    email: 'std1@oao.athlete',
  },
  {
    code: 'RAMO3223',
    plan: 'VIP',
    clientName: 'الكوتش عمر عدنان',
    email: 'coach.omar@oao.com',
    role: 'admin',
  },
  {
    code: 'COACH',
    plan: 'VIP',
    clientName: 'الكوتش عمر عدنان',
    email: 'coach.omar@oao.com',
    role: 'admin',
  },
];

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    role: Role,
    userEmail?: string,
    userName?: string,
    subscriptionPlan?: SubscriptionPlanTier
  ) => void;
  language: Language;
  initialRole?: Role;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language,
}) => {
  const navigate = useNavigate();
  const [loginMethod, setLoginMethod] = useState<'passcode' | 'credentials'>('passcode');
  const [accessCode, setAccessCode] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Reset state whenever the modal opens
  React.useEffect(() => {
    if (isOpen) {
      setAccessCode('');
      setEmailInput('');
      setPasswordInput('');
      setErrorMsg('');
      setSuccessNotice(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessNotice(null);

    if (loginMethod === 'credentials') {
      const cleanEmail = emailInput.trim();
      const cleanPass = passwordInput.trim();

      if (!cleanEmail || !cleanPass) {
        setErrorMsg(
          language === 'ar'
            ? 'يرجى إدخال البريد الإلكتروني وكلمة المرور الخاصة بحسابك.'
            : 'Please enter your email and password.'
        );
        return;
      }

      setIsLoading(true);
      const authResult = await authenticateUser(cleanEmail, cleanPass);

      if (!authResult.success) {
        setIsLoading(false);
        setErrorMsg(
          authResult.error ||
            (language === 'ar'
              ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة، يرجى التحقق أو التواصل مع الكوتش.'
              : 'Invalid email or password. Please verify with your coach.')
        );
        return;
      }

      setSuccessNotice(
        language === 'ar'
          ? `تم التحقق بنجاح! أهلاً بك يا ${authResult.name} (${authResult.plan === 'VIP' ? 'عضوية VIP' : 'الباقة القياسية'})`
          : `Verified successfully! Welcome ${authResult.name} (${authResult.plan})`
      );

      setTimeout(() => {
        setIsLoading(false);
        onSuccess(authResult.role, authResult.email, authResult.name, authResult.plan);
        if (authResult.role === 'admin') {
          navigate('/admin');
        } else if (authResult.plan === 'VIP') {
          navigate('/vip');
        } else {
          navigate('/standard');
        }
        onClose();
      }, 400);
      return;
    }

    // Passcode mode
    const cleanCode = accessCode.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMsg(
        language === 'ar'
          ? 'يرجى إدخال رمز الاشتراك الخاص بك.'
          : 'Please enter your subscription passcode.'
      );
      return;
    }

    setIsLoading(true);

    // 1. Check authenticateUser first
    const authByCode = await authenticateUser(cleanCode);
    if (authByCode.success) {
      setSuccessNotice(
        language === 'ar'
          ? `تم التحقق بنجاح! أهلاً بك يا ${authByCode.name} (${authByCode.plan === 'VIP' ? 'عضوية VIP' : 'الباقة القياسية'})`
          : `Verified successfully! Welcome ${authByCode.name} (${authByCode.plan})`
      );
      setTimeout(() => {
        setIsLoading(false);
        onSuccess(authByCode.role, authByCode.email, authByCode.name, authByCode.plan);
        if (authByCode.role === 'admin') {
          navigate('/admin');
        } else if (authByCode.plan === 'VIP') {
          navigate('/vip');
        } else {
          navigate('/standard');
        }
        onClose();
      }, 400);
      return;
    }

    // 2. Search in the manual ALLOWED_PASSCODES list
    const matchedEntry = ALLOWED_PASSCODES.find(
      (entry) => entry.code.trim().toUpperCase() === cleanCode
    );

    // 3. Also check if the entered code matches a locally generated signed contract ID
    let localContractMatch: { plan: SubscriptionPlanTier; name: string; email: string } | null = null;
    if (!matchedEntry) {
      try {
        const storedDeclRaw = localStorage.getItem('oao_client_declarations');
        if (storedDeclRaw) {
          const declarations = JSON.parse(storedDeclRaw) as Array<Record<string, unknown>>;
          const foundDecl = declarations.find((d) => {
            const id = typeof d.id === 'string' ? d.id.trim().toUpperCase() : '';
            return id === cleanCode;
          });
          if (foundDecl) {
            localContractMatch = {
              plan: normalizeSubscriptionPlan(
                (foundDecl.subscription_plan as string) || (foundDecl.planId as string)
              ),
              name: typeof foundDecl.fullName === 'string' ? foundDecl.fullName : 'مشترك معتمد',
              email: typeof foundDecl.email === 'string' ? foundDecl.email : `${cleanCode.toLowerCase()}@oao.athlete`,
            };
          }
        }
      } catch {
        // ignore storage errors
      }
    }

    // 4. Evaluation: If neither matched, show the exact requested error alert
    if (!matchedEntry && !localContractMatch) {
      setIsLoading(false);
      setErrorMsg(
        language === 'ar'
          ? 'رمز الاشتراك غير صحيح أو غير مفعّل، يرجى التواصل مع الكوتش'
          : 'Invalid or inactive subscription passcode. Please contact your coach.'
      );
      return;
    }

    // 5. Successful match handling
    const resolvedRole: Role = matchedEntry?.role || 'client';
    const resolvedPlan: SubscriptionPlanTier =
      matchedEntry?.plan || localContractMatch?.plan || 'standard';
    const resolvedName: string =
      matchedEntry?.clientName || localContractMatch?.name || 'مشترك معتمد';
    const resolvedEmail: string =
      matchedEntry?.email || localContractMatch?.email || `${cleanCode.toLowerCase()}@oao.athlete`;

    setSuccessNotice(
      language === 'ar'
        ? `تم التحقق بنجاح! أهلاً بك يا بطل (${resolvedPlan === 'VIP' ? 'عضوية VIP' : 'الباقة القياسية'})`
        : `Verified successfully! Welcome (${resolvedPlan})`
    );

    setTimeout(() => {
      setIsLoading(false);
      onSuccess(resolvedRole, resolvedEmail, resolvedName, resolvedPlan);
      if (resolvedRole === 'admin') {
        navigate('/admin');
      } else if (resolvedPlan === 'VIP') {
        navigate('/vip');
      } else {
        navigate('/standard');
      }
      onClose();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
      {/* Background Subtle Ambient Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-600/15 rounded-full blur-[140px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative w-full max-w-md my-8 bg-gradient-to-b from-[#0B132B]/95 via-[#070E24]/95 to-[#030712] border-2 border-orange-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_60px_rgba(255,87,34,0.35)] backdrop-blur-2xl text-center select-none overflow-hidden">
        {/* Top Rim Glow Light */}
        <div className="absolute -top-1 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#FF7043] to-transparent shadow-[0_0_15px_#FF5722]" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 left-4 rtl:left-4 rtl:right-auto ltr:right-4 ltr:left-auto text-slate-400 hover:text-white p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Emblem Header */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative mb-2.5">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-600/50 to-amber-500/30 rounded-full blur-md animate-pulse" />
            <BrandLogo size="md" showText={false} className="relative z-10" />
          </div>

          <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-1.5 select-none">
            <span className="text-white drop-shadow-md">OWN</span>
            <span className="px-2 py-0.5 rounded-md text-xs sm:text-sm font-black tracking-widest uppercase bg-gradient-to-r from-slate-100 via-white to-slate-200 text-[#07182E] shadow-md border border-slate-300">
              AURA
            </span>
            <span className="text-[#EA580C] drop-shadow-md">OUTCOME</span>
          </h3>

          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 mt-2.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 font-extrabold text-[11px] tracking-wide">
            <KeyRound className="w-3.5 h-3.5 text-orange-400" />
            <span>
              {language === 'ar' ? 'بوابة دخول المشتركين' : 'Athlete Portal Access'}
            </span>
          </div>

          {/* Login Method Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-black/40 border border-white/10 rounded-2xl mt-4 w-full">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('passcode');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMethod === 'passcode'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'رمز الاشتراك' : 'Passcode'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('credentials');
                setErrorMsg('');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                loginMethod === 'credentials'
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'إيميل + كلمة المرور' : 'Email & Pass'}</span>
            </button>
          </div>
        </div>

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-start">
          {loginMethod === 'passcode' ? (
            <div>
              <label className="text-xs font-black text-slate-300 flex items-center justify-between mb-2">
                <span className="flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#FF7043]" />
                  <span>
                    {language === 'ar' ? 'أدخل رمز الاشتراك الخاص بك:' : 'Enter Your Passcode:'}
                  </span>
                </span>
                <span className="text-[10px] text-orange-400 font-mono font-bold">
                  [Passcode]
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  required
                  maxLength={24}
                  value={accessCode}
                  onChange={(e) => {
                    setAccessCode(e.target.value.toUpperCase());
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder={language === 'ar' ? 'أدخل رمز الاشتراك الخاص بك...' : 'Enter your subscriber passcode...'}
                  className="w-full bg-[#040817] border-2 border-orange-500/40 focus:border-[#FF5722] focus:ring-4 focus:ring-[#FF5722]/20 rounded-2xl py-3.5 px-4 text-center text-lg sm:text-xl font-black font-mono tracking-widest text-white outline-none transition-all placeholder:text-slate-600 placeholder:text-xs sm:placeholder:text-sm placeholder:font-sans shadow-inner uppercase"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-black text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#FF7043]" />
                  <span>{language === 'ar' ? 'البريد الإلكتروني:' : 'Email Address:'}</span>
                </label>
                <input
                  type="email"
                  autoFocus
                  required
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="name@example.com"
                  className="w-full bg-[#040817] border-2 border-orange-500/40 focus:border-[#FF5722] focus:ring-4 focus:ring-[#FF5722]/20 rounded-2xl py-3 px-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-600 shadow-inner"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-300 flex items-center gap-1.5 mb-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#FF7043]" />
                  <span>{language === 'ar' ? 'كلمة المرور:' : 'Password:'}</span>
                </label>
                <input
                  type="password"
                  required
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#040817] border-2 border-orange-500/40 focus:border-[#FF5722] focus:ring-4 focus:ring-[#FF5722]/20 rounded-2xl py-3 px-4 text-sm font-bold text-white outline-none transition-all placeholder:text-slate-600 shadow-inner"
                />
              </div>
            </div>
          )}

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border-2 border-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-in fade-in duration-200">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span className="text-xs font-black text-red-100 leading-relaxed">
                  {errorMsg}
                </span>
              </div>
            </div>
          )}

          {/* Success Notice */}
          {successNotice && (
            <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center gap-2 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* Action Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-[#FF5722] via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-amber-400 text-white font-black text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,87,34,0.75)] border border-orange-300/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-60"
          >
            {isLoading ? (
              <>
                <Flame className="w-5 h-5 animate-spin text-white" />
                <span>{language === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
              </>
            ) : (
              <>
                <span>{language === 'ar' ? 'دخول البوابة 🚀' : 'Enter Portal 🚀'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>

        {/* Clean Footer Note */}
        <div className="mt-4 pt-3.5 border-t border-white/10 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            {language === 'ar'
              ? 'يتم تزويدك ببيانات الدخول مباشرة من الكوتش فور تأكيد اشتراكك'
              : 'Credentials are provided directly by your coach upon enrollment'}
          </span>
        </div>
      </div>
    </div>
  );
};
