import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SubscriptionPlanTier } from '../../types';
import {
  authenticateByAccessToken,
  clearCurrentUserSession,
  getCurrentUserSession,
  setCurrentUserSession,
} from '../../lib/authStore';
import { VipDashboard } from './VipDashboard';
import { StandardDashboard } from './StandardDashboard';
import { BrandLogo } from '../../components/BrandLogo';
import { AlertTriangle, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';

interface AuthenticatedTokenSubscriber {
  id?: string;
  email: string;
  name: string;
  plan: SubscriptionPlanTier;
  clientCode?: string;
  phone?: string;
  accessToken: string;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  status?: 'active' | 'suspended' | 'expiring' | 'expired';
}

export const SubscriberTokenPortal: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'authorized' | 'invalid' | 'suspended'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [subscriber, setSubscriber] = useState<AuthenticatedTokenSubscriber | null>(null);

  useEffect(() => {
    let active = true;
    const cleanToken = (token || '').trim();

    // Immediately clear any prior user workspace/session when entering or switching a token portal URL
    setStatus('loading');
    setSubscriber(null);
    setErrorMessage('');

    const existingSession = getCurrentUserSession();
    if (existingSession && existingSession.accessToken !== cleanToken) {
      clearCurrentUserSession();
    }

    const resolveToken = async () => {
      if (!cleanToken) {
        if (active) {
          setStatus('invalid');
          setErrorMessage('رابط الدخول الخاص غير مكتمل أو غير صالح.');
        }
        return;
      }

      const authRes = await authenticateByAccessToken(cleanToken);
      if (!active) return;

      if (!authRes.success || !authRes.email) {
        clearCurrentUserSession();
        setStatus(authRes.status === 'suspended' ? 'suspended' : 'invalid');
        setErrorMessage(
          authRes.error || 'عذراً، هذا الرابط الخاص غير صالح أو لم يعد نشطاً.'
        );
        return;
      }

      const resolvedToken = authRes.accessToken || cleanToken;
      const verifiedSub: AuthenticatedTokenSubscriber = {
        id: authRes.id,
        email: authRes.email,
        name: authRes.name,
        plan: authRes.plan,
        clientCode: authRes.clientCode,
        phone: authRes.phone,
        accessToken: resolvedToken,
        subscriptionStartDate: authRes.subscriptionStartDate,
        subscriptionEndDate: authRes.subscriptionEndDate,
        status: authRes.status,
      };

      setCurrentUserSession({
        id: authRes.id,
        email: authRes.email,
        name: authRes.name,
        plan: authRes.plan,
        role: authRes.role,
        clientCode: authRes.clientCode,
        phone: authRes.phone,
        accessToken: resolvedToken,
        subscriptionStartDate: authRes.subscriptionStartDate,
        subscriptionEndDate: authRes.subscriptionEndDate,
        subscriptionStatus: authRes.status,
      });

      setSubscriber(verifiedSub);
      setStatus('authorized');
    };

    void resolveToken();
    return () => {
      active = false;
    };
  }, [token]);

  if (status === 'loading') {
    return (
      <div
        className="min-h-screen bg-[#030712] text-white flex flex-col items-center justify-center p-6 font-['Alexandria',sans-serif]"
        dir="rtl"
      >
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10 flex flex-col items-center gap-4 text-center">
          <BrandLogo size="md" showText={false} />
          <Loader2 className="w-9 h-9 text-orange-400 animate-spin" />
          <p className="text-sm font-black text-white">جاري فتح بوابتك التدريبية المعزولة...</p>
          <p className="text-xs text-slate-400">التحقق المشفر من رابط الدخول الخاص عبر Supabase</p>
        </div>
      </div>
    );
  }

  if (status !== 'authorized' || !subscriber) {
    const isSuspended = status === 'suspended';
    return (
      <div
        className="min-h-screen bg-[#030712] text-white flex items-center justify-center p-6 font-['Alexandria',sans-serif]"
        dir="rtl"
      >
        <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-orange-600/15 rounded-full blur-[140px] pointer-events-none" />
        <div className="relative z-10 max-w-md w-full rounded-3xl p-8 bg-gradient-to-br from-[#0B132B] via-[#070E24] to-[#040817] border-2 border-orange-500/40 shadow-[0_0_50px_rgba(249,115,22,0.18)] text-center space-y-5">
          <div
            className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border ${
              isSuspended
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
            }`}
          >
            {isSuspended ? <AlertTriangle className="w-8 h-8" /> : <ShieldAlert className="w-8 h-8" />}
          </div>
          <h1 className="text-xl font-black text-white">
            {isSuspended ? 'تم تعليق الاشتراك مؤقتاً' : 'رابط الدخول الخاص غير صالح'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {errorMessage ||
              'لم يتم العثور على اشتراك نشط مرتبط بهذا الرابط. يرجى التأكد من الرابط أو التواصل مع الكوتش عمر عدنان.'}
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
          >
            <span>الانتقال لصفحة تسجيل الدخول</span>
            <ArrowRight className="w-4 h-4 rtl:rotate-180" />
          </button>
        </div>
      </div>
    );
  }

  if (subscriber.plan === 'VIP') {
    return (
      <VipDashboard
        key={`${subscriber.email}_${subscriber.accessToken}`}
        tokenSubscriber={subscriber}
        isolatedByToken={true}
        onLogoutOverride={() => navigate('/')}
      />
    );
  }

  return (
    <StandardDashboard
      key={`${subscriber.email}_${subscriber.accessToken}`}
      tokenSubscriber={subscriber}
      isolatedByToken={true}
      onLogoutOverride={() => navigate('/')}
    />
  );
};
