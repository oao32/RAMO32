import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Language, Theme } from '../types';
import { ShieldCheck, Lock, KeyRound, AlertCircle, X, Sparkles, ArrowRight } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface CoachPasskeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
  theme?: Theme;
}

export const CoachPasskeyModal: React.FC<CoachPasskeyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  language,
}) => {
  const navigate = useNavigate();
  const [passkey, setPasskey] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const validPasskeys = ['RAMO3223', 'ramo3223'];

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      if (validPasskeys.includes(passkey.trim())) {
        setIsLoading(false);
        onSuccess();
        navigate('/admin');
        onClose();
      } else {
        setIsLoading(false);
        setErrorMsg(
          language === 'ar'
            ? 'رمز المرور غير صحيح، يرجى التأكد من الرمز والمحاولة مرة أخرى.'
            : 'Incorrect passkey. Please check and try again.'
        );
      }
    }, 350);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
      {/* Background Animated Glowing Sparks */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-80 h-80 bg-blue-600/20 rounded-full blur-[130px]" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-orange-600/15 rounded-full blur-[130px]" />
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

        {/* Header Icon */}
        <div className="flex flex-col items-center mb-4">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] border-2 border-orange-500 flex items-center justify-center shadow-[0_0_25px_rgba(255,87,34,0.5)]">
              <ShieldCheck className="w-8 h-8 text-[#FF7043]" />
            </div>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider">
            {language === 'ar' ? 'دخول الكوتش والمدربين 👑' : 'Coach & Admin Access 👑'}
          </h3>
          <p className="text-xs text-slate-300 font-medium mt-1 max-w-xs">
            {language === 'ar'
              ? 'أدخل رمز المرور السري الخاص بالكوتش للوصول إلى لوحة التحكم وإدارة المشتركين'
              : 'Enter your secret coach passkey to manage workouts, clients and notes'}
          </p>
        </div>

        {/* Passcode Form */}
        <form onSubmit={handleVerify} className="space-y-4 text-start">
          <div>
            <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#FF7043]" />
                {language === 'ar' ? 'رمز المرور السري (Passkey)' : 'Secret Passkey'}
              </span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                autoFocus
                placeholder="••••••••"
                value={passkey}
                onChange={(e) => {
                  setPasskey(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-[#040817] border border-white/15 focus:border-[#FF5722] focus:ring-2 focus:ring-[#FF5722]/30 rounded-2xl py-3.5 px-4 text-center text-lg tracking-[0.4em] text-white font-mono outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !passkey}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(249,115,22,0.6)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <span className="animate-pulse">{language === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>{language === 'ar' ? 'تأكيد الدخول ككوتش' : 'Enter Coach Portal'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
