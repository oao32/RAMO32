import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Language } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  QrCode,
  Download,
  Copy,
  Check,
  X,
  Eye,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Link2,
} from 'lucide-react';

interface SubscriptionQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewDirectPage: () => void;
  language: Language;
}

function getDefaultShareablePlansUrl(): string {
  if (typeof window === 'undefined') return 'https://ownauraoutcome.com/?view=plans';
  const origin = window.location.origin.replace('https://ais-dev-', 'https://ais-pre-');
  return `${origin}/?view=plans`;
}

export const SubscriptionQRModal: React.FC<SubscriptionQRModalProps> = ({
  isOpen,
  onClose,
  onPreviewDirectPage,
  language,
}) => {
  const [targetUrl, setTargetUrl] = useState<string>(getDefaultShareablePlansUrl);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPoster, setDownloadingPoster] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    QRCode.toDataURL(targetUrl, {
      width: 520,
      margin: 2,
      color: {
        dark: '#0B132B',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'H',
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch((err) => {
        console.warn('QR generation failed:', err);
      });

    return () => {
      active = false;
    };
  }, [isOpen, targetUrl]);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // ignore clipboard restriction
    }
  };

  const handleDownloadBrandedPoster = async () => {
    if (!qrDataUrl || downloadingPoster) return;
    setDownloadingPoster(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Deep Navy Gradient Background
      const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGrad.addColorStop(0, '#0B132B');
      bgGrad.addColorStop(0.55, '#070E24');
      bgGrad.addColorStop(1, '#030712');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Top Accent Bar
      const accentGrad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      accentGrad.addColorStop(0, '#EA580C');
      accentGrad.addColorStop(0.5, '#F59E0B');
      accentGrad.addColorStop(1, '#EA580C');
      ctx.fillStyle = accentGrad;
      ctx.fillRect(0, 0, canvas.width, 16);

      // Subtle Outer Frame
      ctx.strokeStyle = 'rgba(234, 88, 12, 0.35)';
      ctx.lineWidth = 4;
      ctx.strokeRect(48, 56, canvas.width - 96, canvas.height - 112);

      // 2. Brand Title
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FB923C';
      ctx.font = 'bold 30px Outfit, Alexandria, sans-serif';
      ctx.fillText('OFFICIAL TRAINING PORTAL', canvas.width / 2, 160);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '900 64px Outfit, Alexandria, sans-serif';
      ctx.fillText('OWN AURA OUTCOME', canvas.width / 2, 240);

      ctx.fillStyle = '#CBD5E1';
      ctx.font = 'bold 34px Alexandria, sans-serif';
      ctx.fillText('بوابة التدريب الرياضي — الكوتش عمر عدنان', canvas.width / 2, 305);

      // 3. White Rounded Container for QR Code
      const qrBoxSize = 600;
      const qrBoxX = (canvas.width - qrBoxSize) / 2;
      const qrBoxY = 375;

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.roundRect(qrBoxX, qrBoxY, qrBoxSize, qrBoxSize, 40);
      ctx.fill();

      ctx.strokeStyle = '#EA580C';
      ctx.lineWidth = 8;
      ctx.stroke();

      // Draw QR Image inside White Box
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('QR load error'));
        img.src = qrDataUrl;
      });
      ctx.drawImage(img, qrBoxX + 40, qrBoxY + 40, qrBoxSize - 80, qrBoxSize - 80);

      // 4. Instructions Below QR
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 42px Alexandria, sans-serif';
      ctx.fillText('امسح الباركود لاستعراض الباقات والاشتراك', canvas.width / 2, 1065);

      ctx.fillStyle = '#FDBA74';
      ctx.font = '600 28px Alexandria, sans-serif';
      ctx.fillText(
        'الباقة القياسية (Standard)  •  الباقة البلاتينية (Platinum VIP)',
        canvas.width / 2,
        1125
      );

      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 24px Alexandria, sans-serif';
      ctx.fillText(
        'اختر الباقة والمدة ← عبّئ نموذج الإقرار الإلكتروني ← أتمم تسجيلك فوراً',
        canvas.width / 2,
        1185
      );

      const posterDataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = 'OAO-Subscriptions-QR.png';
      link.href = posterDataUrl;
      link.click();
    } catch (err) {
      console.warn('Failed to export QR poster:', err);
    } finally {
      setDownloadingPoster(false);
    }
  };

  const steps = [
    {
      icon: QrCode,
      titleAr: '1. مسح الباركود',
      descAr: 'يفتح للعميل صفحة باقات الاشتراك مباشرة (Standard و VIP) دون الحاجة للتنقل.',
      titleEn: '1. Scan QR Code',
      descEn: 'Opens the dedicated subscription packages view directly.',
    },
    {
      icon: CheckCircle2,
      titleAr: '2. اختيار الفئة والمدة',
      descAr: 'يختار العميل الباقة المناسبة والمدة (3 شهور / 6 شهور / سنة كاملة) ويضغط اشترك.',
      titleEn: '2. Select Tier & Duration',
      descEn: 'Client picks Standard or VIP and selects 3, 6, or 12 months.',
    },
    {
      icon: ShieldCheck,
      titleAr: '3. تعبئة وتوقيع الإقرار الإلزامي',
      descAr: 'يظهر له فوراً نموذج الإقرار الصحي والشروط (إلزامي 100%) لتعبئته والتوقيع إلكترونياً.',
      titleEn: '3. Mandatory Declaration Form',
      descEn: 'Completes health disclosure, 4 legal terms, and electronic signature.',
    },
    {
      icon: CreditCard,
      titleAr: '4. الدفع وتفعيل الحساب مباشرة',
      descAr: 'يكمل بيانات الدفع والتسجيل، فيُربط الإقرار بحسابه وتُفتح له بوابته التدريبية فوراً.',
      titleEn: '4. Checkout & Instant Activation',
      descEn: 'Completes payment, links contract to profile, and unlocks athlete portal.',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] overflow-y-auto rounded-3xl bg-gradient-to-b from-[#0B132B] via-[#070E24] to-[#030712] border-2 border-orange-500/40 text-white shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={false} />
            <div>
              <h3 className="text-lg sm:text-xl font-black text-white">
                {language === 'ar'
                  ? 'باركود ورابط الاشتراكات المباشر للمشتركين الجدد'
                  : 'Direct Subscription QR Code & Enrollment Link'}
              </h3>
              <p className="text-xs text-slate-400 font-semibold">
                {language === 'ar'
                  ? 'أرسل الباركود أو الرابط لأي شخص ليدخل مباشرة على الباقات ← الإقرار ← إتمام التسجيل'
                  : 'Share this QR or link to send clients directly to Packages → Declaration → Checkout'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* QR Card Column */}
          <div className="md:col-span-5 flex flex-col items-center bg-[#070a14] border border-orange-500/30 rounded-3xl p-5 text-center space-y-4">
            <div className="bg-white p-3.5 rounded-2xl shadow-lg border-2 border-orange-500">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt="OAO Subscriptions QR Code"
                  className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto"
                />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center text-slate-400 text-xs">
                  جاري توليد الباركود...
                </div>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs font-black text-white">
                {language === 'ar'
                  ? 'امسح الكود بكاميرا الجوال'
                  : 'Scan with Phone Camera'}
              </p>
              <p className="text-[11px] text-slate-400">
                {language === 'ar'
                  ? 'يحوّل العميل فوراً لصفحة اختيار الباقة والإقرار'
                  : 'Routes directly to Subscription Plans & Declaration'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadBrandedPoster}
              disabled={!qrDataUrl || downloadingPoster}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>
                {downloadingPoster
                  ? language === 'ar'
                    ? 'جاري تجهيز البطاقة...'
                    : 'Generating Card...'
                  : language === 'ar'
                  ? 'تحميل بطاقة الباركود جاهزة للإرسال (PNG)'
                  : 'Download Branded QR Card (PNG)'}
              </span>
            </button>
          </div>

          {/* Journey Steps & Link Controls Column */}
          <div className="md:col-span-7 space-y-4">
            <h4 className="text-xs sm:text-sm font-black text-orange-400">
              {language === 'ar'
                ? 'مسار العميل التلقائي عند مسح الباركود:'
                : 'Client Enrollment Flow After Scanning:'}
            </h4>

            <div className="space-y-2.5">
              {steps.map((step, idx) => {
                const StepIcon = step.icon;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3"
                  >
                    <div className="p-2 rounded-xl bg-orange-500/15 text-orange-400 shrink-0 mt-0.5">
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-white">
                        {language === 'ar' ? step.titleAr : step.titleEn}
                      </h5>
                      <p className="text-[11px] text-slate-300 leading-relaxed mt-0.5">
                        {language === 'ar' ? step.descAr : step.descEn}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Direct Link Box */}
            <div className="pt-2 space-y-2">
              <label className="text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5 text-orange-400" />
                <span>
                  {language === 'ar'
                    ? 'الرابط المباشر المدمج داخل الباركود (يمكنك نسخه أو تخصيصه):'
                    : 'Direct Subscription URL encoded in QR:'}
                </span>
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={targetUrl}
                  onChange={(e) => setTargetUrl(e.target.value)}
                  dir="ltr"
                  className="flex-1 bg-black/50 border border-white/15 focus:border-orange-500 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-200 outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">
                        {language === 'ar' ? 'تم النسخ' : 'Copied'}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-orange-400" />
                      <span>{language === 'ar' ? 'نسخ الرابط' : 'Copy'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Preview Client Experience Button */}
            <button
              type="button"
              onClick={() => {
                onClose();
                onPreviewDirectPage();
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>
                {language === 'ar'
                  ? 'معاينة الصفحة كما ستظهر للعميل عند مسح الباركود'
                  : 'Preview Direct Subscription Page as Client'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
