import React, { useState, useRef, useEffect } from 'react';
import {
  Language,
  Theme,
  SubscriptionAgreement,
  SubscriptionDurationKey,
  SubscriptionPlanTier,
} from '../types';
import { BrandLogo } from './BrandLogo';
import { VIPBadge } from './VIPBadge';
import { normalizeSubscriptionPlan } from '../lib/supabase';
import {
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Maximize2,
  Minimize2,
  PenTool,
  User,
  Phone,
  Mail,
  Activity,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Shield,
  RotateCcw,
  X,
  Check,
  Download,
  Crown,
  MessageCircle,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface PlanDetails {
  id: string;
  nameAr: string;
  nameEn: string;
  priceMonthly: number;
  priceYearly: number;
  selectedPrice?: number;
  durationKey?: SubscriptionDurationKey;
  durationLabelAr?: string;
  durationLabelEn?: string;
  durationDays?: number;
  tierSubtitleAr: string;
  tierSubtitleEn: string;
  badgeTextAr: string;
  badgeTextEn: string;
}

interface SubscriptionCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan: PlanDetails;
  billingCycle?: SubscriptionDurationKey | 'monthly' | 'yearly';
  language: Language;
  theme?: Theme;
  onSubscriptionComplete?: (
    agreement: SubscriptionAgreement,
    athleteName: string,
    athleteEmail: string
  ) => void;
}

export const SubscriptionCheckoutModal: React.FC<SubscriptionCheckoutModalProps> = ({
  isOpen,
  onClose,
  selectedPlan: initialPlan,
  language,
}) => {
  // Step 1 = Plan Selection, Step 2 = Declaration & Terms Form, Step 3 = PDF Download & WhatsApp Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Active Selected Plan (Can be switched in Step 1)
  const [activePlanId, setActivePlanId] = useState<'standard' | 'platinum'>(
    initialPlan.id === 'platinum' || initialPlan.id === 'VIP' ? 'platinum' : 'standard'
  );
  const [selectedDurationKey, setSelectedDurationKey] = useState<SubscriptionDurationKey>(
    initialPlan.durationKey || '3_months'
  );

  // Form State - Part 1: Personal & Health Disclosures
  const [fullName, setFullName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [healthStatus, setHealthStatus] = useState<'healthy' | 'has_issues'>('healthy');
  const [healthIssuesDetails, setHealthIssuesDetails] = useState('');

  // Form State - Part 2: Mandatory Terms & Declarations
  const [agreedHealth, setAgreedHealth] = useState(false);
  const [agreedNutrition, setAgreedNutrition] = useState(false);
  const [agreedIP, setAgreedIP] = useState(false);
  const [agreedPaymentPolicy, setAgreedPaymentPolicy] = useState(false);

  // Form State - Part 3: Electronic Signature & Confirmation
  const [typedSignatureName, setTypedSignatureName] = useState('');
  const [contractId, setContractId] = useState('');
  const [signedDate, setSignedDate] = useState('');

  // Error & Alert Banner State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [completedAgreement, setCompletedAgreement] = useState<SubscriptionAgreement | null>(null);

  // Canvas for Digital Signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCanvasSignature, setHasCanvasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');

  // Hidden print container ref for rendering high-fidelity PDF
  const printableContractRef = useRef<HTMLDivElement | null>(null);
  const modalContainerRef = useRef<HTMLDivElement | null>(null);

  // Duration configurations & pricing
  const DURATION_DATA: Record<
    'standard' | 'platinum',
    Record<SubscriptionDurationKey, { price: number; labelAr: string; labelEn: string; days: number }>
  > = {
    standard: {
      '3_months': { price: 200, labelAr: '3 شهور', labelEn: '3 Months', days: 90 },
      '6_months': { price: 350, labelAr: '6 شهور', labelEn: '6 Months', days: 180 },
      '12_months': { price: 600, labelAr: 'سنة كاملة', labelEn: 'Full Year', days: 365 },
    },
    platinum: {
      '3_months': { price: 450, labelAr: '3 شهور', labelEn: '3 Months', days: 90 },
      '6_months': { price: 800, labelAr: '6 شهور', labelEn: '6 Months', days: 180 },
      '12_months': { price: 1450, labelAr: 'سنة كاملة', labelEn: 'Full Year', days: 365 },
    },
  };

  const currentDurationInfo = DURATION_DATA[activePlanId][selectedDurationKey];
  const currentPlanNameAr =
    activePlanId === 'platinum' ? 'الباقة البلاتينية (VIP)' : 'الباقة القياسية (Standard)';
  const currentPlanNameEn =
    activePlanId === 'platinum' ? 'Platinum VIP Package' : 'Standard Package';
  const resolvedPlanTier: SubscriptionPlanTier = activePlanId === 'platinum' ? 'VIP' : 'standard';

  // Initialize or reset on modal open
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setActivePlanId(
        initialPlan.id === 'platinum' || initialPlan.id === 'VIP' ? 'platinum' : 'standard'
      );
      if (initialPlan.durationKey) {
        setSelectedDurationKey(initialPlan.durationKey);
      }
      setErrorMessage(null);
      setMissingFields([]);
      setIsGeneratingPdf(false);

      // Generate unique legal contract verification ID
      const randomNum = Math.floor(100000 + Math.random() * 900000);
      const generatedId = `OAO-AGR-${new Date().getFullYear()}-${randomNum}`;
      setContractId(generatedId);

      const now = new Date();
      const formattedDate = now.toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setSignedDate(formattedDate);
    }
  }, [isOpen, initialPlan, language]);

  // Canvas drawing handlers
  const startDrawing = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasCanvasSignature(true);
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#FF7043';
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      setSignatureDataUrl(canvasRef.current.toDataURL('image/png'));
    }
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasCanvasSignature(false);
    setSignatureDataUrl('');
  };

  if (!isOpen) return null;

  // Validation function: Check 100% completeness
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!fullName.trim() || fullName.trim().split(' ').length < 2) {
      errors.push(
        language === 'ar' ? 'الاسم الثلاثي بالكامل (حقل إجباري)' : 'Full Three-Part Name'
      );
    }
    if (!phoneWhatsapp.trim() || phoneWhatsapp.trim().length < 8) {
      errors.push(
        language === 'ar' ? 'رقم الجوال / الواتساب الصحيح (حقل إجباري)' : 'Valid Phone / WhatsApp'
      );
    }
    if (!email.trim() || !email.includes('@')) {
      errors.push(
        language === 'ar' ? 'البريد الإلكتروني المعتمد (حقل إجباري)' : 'Valid Email Address'
      );
    }
    if (healthStatus === 'has_issues' && !healthIssuesDetails.trim()) {
      errors.push(
        language === 'ar'
          ? 'توضيح تفاصيل الحالة الصحية والإصابات (حقل إجباري)'
          : 'Health issues explanation'
      );
    }

    if (!agreedHealth) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند الحالة الصحية والمسؤولية التدريبية'
          : 'Health & Remote Coaching Terms'
      );
    }
    if (!agreedNutrition) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند النظام الغذائي والمكملات'
          : 'Nutrition & Supplements Terms'
      );
    }
    if (!agreedIP) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند الملكية الفكرية وحظر التسريب'
          : 'IP & Non-Leakage Agreement'
      );
    }
    if (!agreedPaymentPolicy) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند سياسة الدفع والاسترجاع والنتائج'
          : 'Payment & Results Policy'
      );
    }

    const cleanFullName = fullName.trim().replace(/\s+/g, ' ');
    const cleanSignature = typedSignatureName.trim().replace(/\s+/g, ' ');

    if (!cleanSignature) {
      errors.push(
        language === 'ar'
          ? 'كتابة الاسم الثلاثي للتوقيع الإلكتروني والاعتماد الرسمي'
          : 'Typed Signature Name is required'
      );
    } else if (cleanFullName && cleanSignature.toLowerCase() !== cleanFullName.toLowerCase()) {
      errors.push(
        language === 'ar'
          ? `اسم التوقيع الإلكتروني غير متطابق! يجب أن يطابق تماماً الاسم الثلاثي المدخل أعلاه (${cleanFullName})`
          : `Signature name must exactly match the full name entered above (${cleanFullName})`
      );
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Generate and download PDF instantly using html2canvas & jspdf
  const generateAndDownloadPDF = async () => {
    if (!printableContractRef.current) return;
    setIsGeneratingPdf(true);

    try {
      // Temporarily ensure element is rendered at high scale
      const element = printableContractRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      const imgWidth = 210; // A4 mm width
      const pageHeight = 297; // A4 mm height
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`OAO-Declaration-${contractId}.pdf`);
    } catch (err) {
      console.warn('PDF generation fallback:', err);
      // Fallback simple print dialog if html2canvas fails
      window.print();
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Handle "موافق وأقر" (Step 2 Submission & PDF Download)
  const handleAgreeAndDeclare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const { isValid, errors } = validateForm();

    if (!isValid) {
      setErrorMessage(
        language === 'ar'
          ? 'عذراً، يجب عليك قراءة الإقرار وتعبئته والموافقة على جميع الشروط والتوقيع لإتمام العملية.'
          : 'Sorry, you must read, fully complete, and agree to the declaration terms first.'
      );
      setMissingFields(errors);

      if (modalContainerRef.current) {
        modalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    setErrorMessage(null);
    setMissingFields([]);

    // Create standalone agreement record
    const agreementRecord: SubscriptionAgreement = {
      id: contractId,
      planId: activePlanId,
      subscription_plan: resolvedPlanTier,
      planNameAr: `${currentPlanNameAr} (${currentDurationInfo.labelAr})`,
      planPrice: currentDurationInfo.price,
      billingCycle: selectedDurationKey,
      durationLabelAr: currentDurationInfo.labelAr,
      durationDays: currentDurationInfo.days,
      fullName: fullName.trim(),
      phoneWhatsapp: phoneWhatsapp.trim(),
      email: email.trim(),
      hasHealthIssues: healthStatus === 'has_issues',
      healthIssuesDetails: healthStatus === 'has_issues' ? healthIssuesDetails.trim() : undefined,
      agreedHealthAndRemoteTraining: agreedHealth,
      agreedDietAndSupplements: agreedNutrition,
      agreedIntellectualProperty: agreedIP,
      agreedPaymentAndRefundPolicy: agreedPaymentPolicy,
      digitalSignature: typedSignatureName.trim(),
      signedTimestamp: signedDate,
      status: 'completed_and_active',
      completedTimestamp: new Date().toISOString(),
    };

    setCompletedAgreement(agreementRecord);

    // Save locally for offline preservation (No database or Auth calls)
    try {
      const existing = JSON.parse(localStorage.getItem('oao_client_declarations') || '[]');
      existing.push(agreementRecord);
      localStorage.setItem('oao_client_declarations', JSON.stringify(existing));
      localStorage.setItem('oao_active_contract', JSON.stringify(agreementRecord));
    } catch (e) {
      console.warn('Offline storage cache error:', e);
    }

    // Step 3: Trigger automatic PDF generation and download!
    await generateAndDownloadPDF();

    // Transition to Step 3
    setCurrentStep(3);
    if (modalContainerRef.current) {
      modalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // WhatsApp Message Preparation
  const coachPhoneNumber = '966500000000'; // Official Coach Omar Adnan WhatsApp
  const whatsappPreFilledText = encodeURIComponent(
    `السلام عليكم ورحمة الله وبركاته يا كوتش عمر عدنان 🫡\n` +
      `أنا المتدرب: ${fullName.trim()}\n` +
      `لقد أتممت تعبئة وتوقيع نموذج الإقرار والتعهد الرسمي لمنصة OAO (Own Aura Outcome).\n\n` +
      `📋 بيانات اشتراكي:\n` +
      `• رقم توثيق العقد: ${contractId}\n` +
      `• الباقة المختارة: ${currentPlanNameAr}\n` +
      `• مدة الاشتراك: ${currentDurationInfo.labelAr} (${currentDurationInfo.price} ريال)\n` +
      `• رقم الجوال: ${phoneWhatsapp.trim()}\n` +
      `• البريد: ${email.trim()}\n` +
      `• الإفصاح الصحي: ${healthStatus === 'healthy' ? 'سليم ولائق 100%' : healthIssuesDetails.trim()}\n\n` +
      `📄 مرفق لك ملف وثيقة الإقرار (PDF) الموقعة إلكترونياً لاعتمادها والختم المائي وبدء الخطة التدريبية. شكرًا لك!`
  );

  const whatsappDirectUrl = `https://wa.me/${coachPhoneNumber}?text=${whatsappPreFilledText}`;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md animate-in fade-in duration-200 ${
        isFullScreen ? 'p-0' : 'p-2 sm:p-4 md:p-6'
      }`}
    >
      <div
        ref={modalContainerRef}
        className={`relative flex flex-col bg-gradient-to-b from-[#0B132B]/95 via-[#070E24]/95 to-[#030712] border-2 border-orange-500/40 shadow-[0_0_80px_rgba(255,87,34,0.35)] backdrop-blur-2xl text-white select-none overflow-y-auto transition-all duration-300 ${
          isFullScreen
            ? 'w-screen h-screen rounded-none'
            : 'w-full max-w-4xl max-h-[92vh] rounded-3xl'
        }`}
      >
        {/* Top Metallic Orange Rim Accent */}
        <div className="sticky top-0 z-30 h-1 bg-gradient-to-r from-orange-600 via-amber-400 to-orange-600 shadow-[0_0_15px_#FF5722]" />

        {/* Modal Header */}
        <div className="sticky top-1 z-30 bg-[#0B132B]/90 backdrop-blur-md px-6 py-4 border-b border-orange-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#FF7043] uppercase">
                  {language === 'ar' ? 'بوابة الاشتراك والتوثيق' : 'ATHLETE REGISTRATION & CONTRACT'}
                </span>
                <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30 font-bold">
                  {currentPlanNameAr}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {currentStep === 1 &&
                  (language === 'ar' ? 'الخطوة الأولى: اختيار الباقة المناسبة' : 'Step 1: Choose Your Plan')}
                {currentStep === 2 &&
                  (language === 'ar'
                    ? 'الخطوة الثانية: نموذج إقرار وتعهد المشترك (PDF)'
                    : 'Step 2: Athlete Declaration & Agreement')}
                {currentStep === 3 &&
                  (language === 'ar'
                    ? 'الخطوة الثالثة: تم تنزيل الإقرار وتأكيد الاشتراك عبر الواتساب'
                    : 'Step 3: Agreement Saved & WhatsApp Confirmation')}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              title={
                isFullScreen
                  ? language === 'ar' ? 'تصغير' : 'Windowed'
                  : language === 'ar' ? 'ملء الشاشة' : 'Full Screen'
              }
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3-Step Progress Tracker */}
        <div className="px-6 py-3 bg-[#070e24]/80 border-b border-white/5 flex items-center justify-between text-xs">
          {/* Step 1 Indicator */}
          <div
            className={`flex items-center gap-2 cursor-pointer ${
              currentStep >= 1 ? 'text-orange-400 font-black' : 'text-slate-500 font-bold'
            }`}
            onClick={() => currentStep > 1 && setCurrentStep(1)}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-orange-500 text-white shadow-[0_0_10px_rgba(255,87,34,0.8)]'
              }`}
            >
              {currentStep > 1 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '1'}
            </span>
            <span>{language === 'ar' ? '1. اختيار الباقة' : '1. Select Plan'}</span>
          </div>

          <div className="h-0.5 w-6 sm:w-12 bg-white/10 mx-1" />

          {/* Step 2 Indicator */}
          <div
            className={`flex items-center gap-2 ${
              currentStep >= 2 ? 'text-orange-400 font-black' : 'text-slate-500 font-bold'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : currentStep === 2
                  ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(255,87,34,0.8)]'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              {currentStep > 2 ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : '2'}
            </span>
            <span>{language === 'ar' ? '2. نموذج الإقرار والتعهد' : '2. Declaration Form'}</span>
          </div>

          <div className="h-0.5 w-6 sm:w-12 bg-white/10 mx-1" />

          {/* Step 3 Indicator */}
          <div
            className={`flex items-center gap-2 ${
              currentStep === 3 ? 'text-emerald-400 font-black' : 'text-slate-500 font-bold'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${
                currentStep === 3
                  ? 'bg-emerald-500 text-white shadow-[0_0_10px_rgba(16,185,129,0.8)]'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              3
            </span>
            <span>{language === 'ar' ? '3. ملف PDF وتأكيد الواتساب' : '3. PDF & WhatsApp'}</span>
          </div>
        </div>

        {/* Mandatory Warning Alert Banner */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border-2 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 shadow-md">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-red-200 uppercase tracking-wide">
                  {language === 'ar' ? 'تنبيه إلزامي ومطلوب' : 'Mandatory Requirement Alert'}
                </h4>
                <p className="text-sm font-black text-white mt-1 leading-relaxed">
                  {errorMessage}
                </p>

                {missingFields.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-500/30">
                    <span className="text-xs font-bold text-red-300 block mb-1.5">
                      {language === 'ar'
                        ? 'يرجى استكمال البنود التالية أولاً:'
                        : 'Please complete the following items:'}
                    </span>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-red-100 font-semibold">
                      {missingFields.map((field, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                          <span>{field}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs text-red-300 hover:text-white px-2 py-1 rounded-lg bg-red-800/40"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 1: SELECT PLAN (الخطوة الأولى: اختيار الباقة المناسبة)
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-black tracking-widest text-[#FF7043] uppercase block mb-1">
                {language === 'ar' ? 'الخطوة الأولى' : 'Step 1'}
              </span>
              <h2 className="text-2xl font-black text-white">
                {language === 'ar' ? 'اختر الباقة والمدة المناسبة لك' : 'Select Your Package & Duration'}
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-1">
                {language === 'ar'
                  ? 'باقات تدريبية احترافية تحت إشراف مباشر من الكوتش عمر عدنان'
                  : 'Elite athletic coaching programs under Coach Omar Adnan'}
              </p>
            </div>

            {/* Plan Cards: Standard vs VIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
              {/* 1. Standard Package */}
              <div
                onClick={() => setActivePlanId('standard')}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activePlanId === 'standard'
                    ? 'bg-slate-900/80 border-slate-300 shadow-[0_0_30px_rgba(255,255,255,0.15)] ring-1 ring-slate-300'
                    : 'bg-black/40 border-white/10 hover:border-white/30 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-xs font-black">
                      STANDARD
                    </span>
                    <Shield className="w-5 h-5 text-slate-300" />
                  </div>
                  <h3 className="text-xl font-black text-white">الباقة القياسية (Standard)</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">
                    الباقة المثالية لمن يمتلك الخبرة الأساسية ويفضل المتابعة الشهرية المنتظمة.
                  </p>

                  <div className="my-4 space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>تقييم البنية العضلية وحساب الاحتياج اليومي</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>تصميم النظام الغذائي مع التحديث شهرياً</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>تحديث جدول التمارين شهرياً حسب التطور</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>متابعة دورية منتظمة</span>
                    </div>
                  </div>
                </div>

                {/* Duration options for standard */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2">
                    خيارات المدة والسعر:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['3_months', '6_months', '12_months'] as SubscriptionDurationKey[]).map((dk) => {
                      const dInfo = DURATION_DATA.standard[dk];
                      const isSelected = activePlanId === 'standard' && selectedDurationKey === dk;
                      return (
                        <button
                          key={dk}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePlanId('standard');
                            setSelectedDurationKey(dk);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-slate-900 border-white font-black shadow-md'
                              : 'bg-black/50 text-slate-300 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className="block text-[11px] font-bold">{dInfo.labelAr}</span>
                          <span className="block text-xs font-black font-mono mt-0.5">
                            {dInfo.price} ر.س
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 2. Platinum VIP Package */}
              <div
                onClick={() => setActivePlanId('platinum')}
                className={`p-6 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activePlanId === 'platinum'
                    ? 'bg-gradient-to-b from-[#1C1605] via-[#120F05] to-[#0A0802] border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                    : 'bg-black/40 border-white/10 hover:border-amber-400/30 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />
                      <span>PLATINUM VIP</span>
                    </span>
                    <VIPBadge variant="compact" language={language} />
                  </div>
                  <h3 className="text-xl font-black text-amber-300">الباقة البلاتينية (VIP)</h3>
                  <p className="text-xs text-amber-200/80 font-medium mt-1">
                    التجربة التدريبية المتكاملة مع متابعة أسبوعية دقيقة، وتوجيه مباشر من الكوتش.
                  </p>

                  <div className="my-4 space-y-2 text-xs text-slate-200">
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>تقييم وتحديث مستمر كل أسبوع مع الكوتش</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>نظام غذائي وتمارين تفاعلية متجددة</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>تواصل مباشر وأولوية استجابة فورية</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>ميزة تجميد الاشتراك عند السفر أو الظروف</span>
                    </div>
                  </div>
                </div>

                {/* Duration options for VIP */}
                <div className="mt-4 pt-4 border-t border-amber-500/20">
                  <span className="text-[11px] font-bold text-amber-300 block mb-2">
                    خيارات المدة والسعر:
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['3_months', '6_months', '12_months'] as SubscriptionDurationKey[]).map((dk) => {
                      const dInfo = DURATION_DATA.platinum[dk];
                      const isSelected = activePlanId === 'platinum' && selectedDurationKey === dk;
                      return (
                        <button
                          key={dk}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActivePlanId('platinum');
                            setSelectedDurationKey(dk);
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 font-black shadow-lg'
                              : 'bg-black/50 text-amber-100/70 border-amber-500/30 hover:border-amber-400/50'
                          }`}
                        >
                          <span className="block text-[11px] font-bold">{dInfo.labelAr}</span>
                          <span className="block text-xs font-black font-mono mt-0.5">
                            {dInfo.price} ر.س
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 Footer Action */}
            <div className="pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                <span>
                  الباقة المحددة: <strong className="text-white">{currentPlanNameAr}</strong> (
                  <strong className="text-orange-400">{currentDurationInfo.labelAr}</strong> -{' '}
                  <strong className="text-amber-300 font-mono">{currentDurationInfo.price} ريال</strong>)
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs transition-all cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentStep(2);
                    if (modalContainerRef.current) {
                      modalContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="flex-1 sm:flex-initial px-8 py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-orange-500 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(255,87,34,0.6)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    {language === 'ar'
                      ? 'الانتقال لنموذج الإقرار والتعهد 📋'
                      : 'Proceed to Declaration Form 📋'}
                  </span>
                  <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: DECLARATION FORM & DIGITAL SIGNATURE
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="p-6 sm:p-8 space-y-8">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-orange-500/10 via-[#1C2541]/70 to-blue-900/20 border border-orange-500/30 rounded-3xl p-6 relative overflow-hidden shadow-lg">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-black text-xs uppercase mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'الوثيقة القانونية والإقرار' : 'Official Legal Contract'}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
                    {language === 'ar'
                      ? 'نموذج إقرار وإخلاء مسؤولية وشروط الاشتراك (تدريب أونلاين) 📋'
                      : 'Declaration, Disclaimer & Service Terms Agreement'}
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-300 font-semibold mt-2 max-w-2xl leading-relaxed">
                    {language === 'ar'
                      ? 'يرجى قراءة البنود التالية بعناية وتعبئة البيانات المطلوبة والتوقيع الرقمي لتوليد وثيقة الـ PDF الرسمية.'
                      : 'Please read the terms carefully, enter your information, and sign to generate your certified PDF.'}
                  </p>
                </div>

                {/* Plan Summary Badge */}
                <div className="bg-[#0B132B] border border-orange-500/40 rounded-2xl p-4 text-center shrink-0 shadow-md">
                  <span className="text-[10px] text-slate-400 font-bold block">الباقة والمدة</span>
                  <span className="text-sm font-black text-white block mt-0.5">
                    {currentPlanNameAr}
                  </span>
                  <span className="text-xs font-black text-orange-400 block font-mono tabular-nums mt-0.5">
                    {currentDurationInfo.price.toLocaleString()} ريال • {currentDurationInfo.labelAr}
                  </span>
                </div>
              </div>
            </div>

            <form onSubmit={handleAgreeAndDeclare} className="space-y-8">
              {/* Part 1: Personal & Health Data */}
              <div className="bg-[#0B132B]/80 border border-slate-700/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-md">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      الجزء الأول: البيانات الشخصية والحالة الصحية 👤
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      جميع الحقول في هذا القسم إلزامية لإتمام الإقرار
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Field 1: Full Three-Part Name */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-black text-slate-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-orange-400" />
                        <span>1. الاسم الثلاثي</span>
                      </span>
                      <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                        [حقل إجباري]
                      </span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="أدخل اسمك الثلاثي الكامل"
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/15 focus:border-orange-500 text-white text-sm font-bold placeholder:text-slate-600 outline-none"
                    />
                  </div>

                  {/* Field 2: Phone / WhatsApp */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-black text-slate-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-orange-400" />
                        <span>2. رقم الجوال / الواتساب</span>
                      </span>
                      <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                        [حقل إجباري]
                      </span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phoneWhatsapp}
                      onChange={(e) => setPhoneWhatsapp(e.target.value)}
                      placeholder="05xxxxxxxx"
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/15 focus:border-orange-500 text-white text-sm font-bold placeholder:text-slate-600 outline-none font-mono"
                    />
                  </div>

                  {/* Field 3: Email */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-black text-slate-300 mb-2">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-orange-400" />
                        <span>3. البريد الإلكتروني</span>
                      </span>
                      <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20">
                        [حقل إجباري]
                      </span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full px-4 py-3 rounded-2xl bg-black/40 border border-white/15 focus:border-orange-500 text-white text-sm font-bold placeholder:text-slate-600 outline-none"
                    />
                  </div>
                </div>

                {/* Field 4: Health Condition */}
                <div className="pt-2 border-t border-white/10">
                  <label className="block text-xs font-black text-slate-300 mb-3">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-orange-400" />
                      <span>
                        4. هل تعاني من أي أمراض مزمنة، إصابات مسبقة، أو حساسية طعام؟
                      </span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal block mt-1">
                      [خيارات متعددة - إجباري]
                    </span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setHealthStatus('healthy')}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                        healthStatus === 'healthy'
                          ? 'bg-emerald-500/15 border-emerald-500/50 text-white ring-1 ring-emerald-500/40'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            healthStatus === 'healthy'
                              ? 'border-emerald-400 bg-emerald-500'
                              : 'border-slate-500'
                          }`}
                        >
                          {healthStatus === 'healthy' && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </span>
                        <span className="text-xs sm:text-sm font-bold">
                          لا، لا يوجد أي مشاكل صحية (سليم ولائق)
                        </span>
                      </div>
                      <span className="text-base">🛡️</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setHealthStatus('has_issues')}
                      className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex items-center justify-between ${
                        healthStatus === 'has_issues'
                          ? 'bg-orange-500/15 border-orange-500/50 text-white ring-1 ring-orange-500/40'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            healthStatus === 'has_issues'
                              ? 'border-orange-400 bg-orange-500'
                              : 'border-slate-500'
                          }`}
                        >
                          {healthStatus === 'has_issues' && (
                            <span className="w-1.5 h-1.5 bg-white rounded-full" />
                          )}
                        </span>
                        <span className="text-xs sm:text-sm font-bold">
                          نعم (يرجى توضيح التفاصيل)
                        </span>
                      </div>
                      <span className="text-base">⚠️</span>
                    </button>
                  </div>

                  {healthStatus === 'has_issues' && (
                    <div className="mt-4 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 animate-in fade-in duration-200">
                      <label className="block text-xs font-black text-orange-300 mb-2">
                        يرجى كتابة تفاصيل الحالة الصحية أو الإصابات أو الحساسية بدقة (إجباري):
                      </label>
                      <textarea
                        required
                        rows={3}
                        value={healthIssuesDetails}
                        onChange={(e) => setHealthIssuesDetails(e.target.value)}
                        placeholder="اكتب هنا الإصابات السابقة أو الحساسية الغذائية..."
                        className="w-full p-3 rounded-xl bg-black/60 border border-orange-500/40 focus:border-orange-400 text-white text-xs font-medium placeholder:text-slate-500 outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Part 2: Mandatory Declaration Clauses */}
              <div className="bg-[#0B132B]/80 border border-slate-700/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-white">
                        الجزء الثاني: بنود الإقرار وإخلاء المسؤولية ⚖️
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">
                        يرجى قراءة كل بند وتفعيل خيار (أوافق وأتعهد بذلك) بشكل منفصل وإلزامي
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30">
                    4 بنود قانونية
                  </span>
                </div>

                {/* Clause 1: Health & Remote Coaching */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    agreedHealth ? 'bg-orange-500/5 border-orange-500/40' : 'bg-black/30 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                        1
                      </span>
                      <span>الحالة الصحية والمسؤولية التدريبية عن بُعد</span>
                    </span>
                    <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                      [خيار إجباري]
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 my-3 bg-black/40 p-3.5 rounded-xl border border-white/5 leading-relaxed font-medium">
                    <p>
                      • أقر بأنني سليم صحياً ولائق لممارسة المجهود البدني، وأتحمل مسؤولية الإفصاح عن كافة
                      المشاكل الصحية قبل البدء.
                    </p>
                    <p>
                      • أقر بأن المقاطع المرئية المرفقة بالبرنامج هي للتوضيح والاسترشاد فقط، وأنني
                      المسؤول الأول عن تطبيق التمارين بالشكل الصحيح واختيار الأوزان المناسبة، ولا يتحمل
                      المدرب أي مسؤولية عن أي إصابة ناتجة عن الأداء الخاطئ أو الإهمال.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={agreedHealth}
                      onChange={(e) => setAgreedHealth(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 bg-black/60 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>أوافق وأتعهد بذلك</span>
                      <span className="text-orange-400">☑</span>
                    </span>
                  </label>
                </div>

                {/* Clause 2: Nutrition & Supplements */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    agreedNutrition ? 'bg-orange-500/5 border-orange-500/40' : 'bg-black/30 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                        2
                      </span>
                      <span>النظام الغذائي والمكملات</span>
                    </span>
                    <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                      [خيار إجباري]
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 my-3 bg-black/40 p-3.5 rounded-xl border border-white/5 leading-relaxed font-medium">
                    <p>
                      • أقر بأن النظام الغذائي مصمم بناءً على البيانات التي زودت المدرب بها، وأتحمل كامل
                      المسؤولية عن الإفصاح عن أي حساسية أو مشاكل هضمية.
                    </p>
                    <p>
                      • أقر بأن استخدام أو شراء أي مكملات غذائية يكون بناءً على رغبتي الشخصية وعلى
                      مسؤوليّتي الخاصة.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={agreedNutrition}
                      onChange={(e) => setAgreedNutrition(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 bg-black/60 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>أوافق وأتعهد بذلك</span>
                      <span className="text-orange-400">☑</span>
                    </span>
                  </label>
                </div>

                {/* Clause 3: Intellectual Property */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    agreedIP ? 'bg-orange-500/5 border-orange-500/40' : 'bg-black/30 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                        3
                      </span>
                      <span>الملكية الفكرية وحظر التسريب وإعادة الإنتاج</span>
                    </span>
                    <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                      [خيار إجباري]
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 my-3 bg-black/40 p-3.5 rounded-xl border border-white/5 leading-relaxed font-medium">
                    <p>
                      • أقر بأن جميع الجداول، والأنظمة الغذائية، والملفات المرفقة هي حقوق ملكية فكرية
                      خاصة بالمدرب فقط ومخصصة لاستخدامي الشخصي.
                    </p>
                    <p>
                      • أتعهد بعدم مشاركة، أو إعادة نشر، أو تسريب، أو بيع أي جزء من المحتوى أو الجداول لأي
                      شخص آخر أو عبر أي منصة.
                    </p>
                    <p>
                      • أعلم أنه في حال ثبوت تسريب أي محتوى، يحق للمدرب إلغاء اشتراكي فوراً دون استرجاع أي
                      مبالغ، مع الاحتفاظ بحقه القانوني في المطالبة بالتعويض عن الأضرار.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={agreedIP}
                      onChange={(e) => setAgreedIP(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 bg-black/60 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>أوافق وأتعهد بذلك</span>
                      <span className="text-orange-400">☑</span>
                    </span>
                  </label>
                </div>

                {/* Clause 4: Payment Policy */}
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    agreedPaymentPolicy
                      ? 'bg-orange-500/5 border-orange-500/40'
                      : 'bg-black/30 border-white/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                        4
                      </span>
                      <span>سياسة الدفع، الاسترجاع، والنتائج</span>
                    </span>
                    <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                      [خيار إجباري]
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1.5 my-3 bg-black/40 p-3.5 rounded-xl border border-white/5 leading-relaxed font-medium">
                    <p>
                      • أقر بأن الرسوم المدفوعة غير قابلة للاسترجاع بعد استلام الخطة والبرنامج التدريبي.
                    </p>
                    <p>
                      • أقر بأن النتائج تعتمد كلياً على مدى التزامي الشخصي بالتعليمات، والمدرب غير مسؤول
                      عن عدم تحقيق النتائج في حال عدم الالتزام الكامل.
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={agreedPaymentPolicy}
                      onChange={(e) => setAgreedPaymentPolicy(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 bg-black/60 cursor-pointer"
                    />
                    <span className="text-xs sm:text-sm font-black text-white flex items-center gap-1.5">
                      <span>أوافق وأتعهد بذلك</span>
                      <span className="text-orange-400">☑</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Part 3: Digital Signature */}
              <div className="bg-[#0B132B]/80 border border-slate-700/80 rounded-3xl p-6 sm:p-7 space-y-6 shadow-md">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      الجزء الثالث: التوقيع والإقرار النهائي 🖋️
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      اعتماد قانوني رسمي ملزم للطرفين
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 via-black/40 to-blue-500/10 border border-orange-500/30 text-xs sm:text-sm text-slate-200 font-semibold leading-relaxed">
                  <p className="font-bold text-white mb-1">الموافقة والتوقيع الإلكتروني [إجباري]:</p>
                  <p>
                    أقر أنا المذكور أعلاه بأن جميع البيانات المدخلة صحيحة، وبأني قرأت جميع الشروط
                    والأحكام وأوافق عليها كاملاً. يرجى كتابة اسمك الثلاثي هنا للتأكيد بمثابة (توقيع
                    إلكتروني واعتماد رسمي).
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Typed Name as Signature */}
                  <div>
                    <label className="block text-xs font-black text-slate-300 mb-2">
                      <span>كتابة الاسم الثلاثي (التوقيع الإلكتروني المعتمد):</span>
                      <span className="text-[10px] text-red-400 mr-2">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={typedSignatureName}
                      onChange={(e) => setTypedSignatureName(e.target.value)}
                      placeholder="اكتب اسمك الثلاثي للتوقيع هنا..."
                      className={`w-full px-4 py-3 rounded-2xl border text-white text-sm font-black placeholder:text-slate-600 outline-none transition-all ${
                        fullName.trim() &&
                        typedSignatureName.trim() &&
                        fullName.trim().replace(/\s+/g, ' ').toLowerCase() ===
                          typedSignatureName.trim().replace(/\s+/g, ' ').toLowerCase()
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : typedSignatureName.trim()
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'bg-black/40 border-orange-500/50 focus:border-orange-400'
                      }`}
                    />

                    {typedSignatureName.trim().length > 0 && (
                      <div className="mt-1.5 animate-in fade-in duration-200">
                        {fullName.trim().replace(/\s+/g, ' ').toLowerCase() ===
                        typedSignatureName.trim().replace(/\s+/g, ' ').toLowerCase() ? (
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
                            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span>
                              {language === 'ar'
                                ? '✓ الاسم متطابق تماماً مع بيانات المشترك المدخلة أعلاه'
                                : '✓ Name matches entered personal data'}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
                            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                            <span>
                              {language === 'ar'
                                ? `⚠ يجب أن يطابق تماماً الاسم الثلاثي: "${fullName.trim() || 'المدخل أعلاه'}"`
                                : `⚠ Must match full name: "${fullName.trim() || 'entered above'}"`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="mt-3 p-3 rounded-xl bg-black/50 border border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>
                        رقم توثيق العقد: <strong className="text-orange-400">{contractId}</strong>
                      </span>
                      <span>{signedDate}</span>
                    </div>
                  </div>

                  {/* Interactive Drawing Signature Canvas */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black text-slate-300 flex items-center gap-1.5">
                        <PenTool className="w-3.5 h-3.5 text-orange-400" />
                        <span>رسم التوقيع الرقمي باللمس / الماوس (اختياري إضافي):</span>
                      </label>
                      {hasCanvasSignature && (
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>مسح التوقيع</span>
                        </button>
                      )}
                    </div>

                    <div className="relative border-2 border-dashed border-orange-500/40 rounded-2xl bg-black/60 p-1 overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={360}
                        height={100}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-24 cursor-crosshair touch-none"
                      />
                      {!hasCanvasSignature && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-500 text-xs font-bold">
                          وقع هنا بيدك أو الماوس ✍️
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons: "موافق وأقر" */}
              <div className="sticky bottom-0 z-20 bg-[#0B132B]/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xl">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>تعديل الباقة المختارة</span>
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="submit"
                    disabled={isGeneratingPdf}
                    className="flex-1 sm:flex-initial px-9 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-orange-500 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_35px_rgba(255,87,34,0.7)] flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    {isGeneratingPdf ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>جاري توليد وتحميل ملف الـ PDF...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-5 h-5 text-white" />
                        <span>موافق وأقر (توليد وتنزيل وثيقة الـ PDF فوراً) 📄</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            STEP 3: COMPLETED - WHATSAPP DIRECT SUBMISSION & DOWNLOAD
            ========================================================================= */}
        {currentStep === 3 && completedAgreement && (
          <div className="p-6 sm:p-10 text-center space-y-6 animate-in fade-in duration-300">
            {/* Celebration Icon */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.7)] animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-black tracking-widest text-[#FF7043] uppercase mb-1 block">
                تم اعتماد وتنزيل وثيقة الإقرار بنجاح
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                أهلاً بك يا بطل! {fullName}
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-semibold max-w-xl mx-auto mt-2 leading-relaxed">
                تم توليد وتنزيل وثيقة الإقرار الرسمي بصيغة PDF على جهازك بنجاح. الخطوة التالية هي
                إرسال الإقرار عبر الواتساب للمدرب لاعتماده وختمه مائياً وتفعيل جدولك.
              </p>
            </div>

            {/* Official Agreement Snapshot Card */}
            <div className="max-w-2xl mx-auto bg-gradient-to-b from-[#0B132B] via-[#070E24] to-black border-2 border-emerald-500/40 rounded-3xl p-6 sm:p-7 text-right space-y-5 shadow-2xl relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <BrandLogo size="sm" showText={false} />
                  <div>
                    <span className="text-[10px] font-mono text-emerald-400 block">
                      إقرار وعقد تدريب رسمي معتمد
                    </span>
                    <span className="text-sm font-black text-white">{completedAgreement.id}</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">اسم المتدرب:</span>
                  <strong className="text-white font-black">{completedAgreement.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الباقة المختارة:</span>
                  <strong className="text-orange-400 font-black">{completedAgreement.planNameAr}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">قيمة الاشتراك:</span>
                  <strong className="text-amber-300 font-black font-mono">
                    {completedAgreement.planPrice} ريال
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">التوقيع الإلكتروني:</span>
                  <strong className="text-white font-mono">{completedAgreement.digitalSignature}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">تاريخ الاعتماد:</span>
                  <strong className="text-slate-300">{completedAgreement.signedTimestamp}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">الإفصاح الصحي:</span>
                  <strong
                    className={
                      completedAgreement.hasHealthIssues ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'
                    }
                  >
                    {completedAgreement.hasHealthIssues ? 'تم الإفصاح عن ملاحظات' : 'سليم ولائق 100%'}
                  </strong>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>تم حفظ وتنزيل ملف PDF في جهازك</span>
                </span>
                <button
                  type="button"
                  onClick={generateAndDownloadPDF}
                  className="text-orange-400 hover:text-white underline text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>إعادة تنزيل ملف PDF</span>
                </button>
              </div>
            </div>

            {/* =============================================================
                THE PROMINENT GREEN WHATSAPP BUTTON (Requested by the user)
                ============================================================= */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href={whatsappDirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 hover:from-emerald-500 hover:to-green-400 text-white font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(16,185,129,0.7)] border-2 border-emerald-300/40 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-6 h-6 fill-white text-emerald-600" />
                <span>إرسال الإقرار عبر الواتساب لتأكيد الاشتراك</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </a>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                العودة إلى الموقع
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            OFF-SCREEN PRINTABLE TEMPLATE (Rendered into clean, high-res PDF via html2canvas)
            ========================================================================= */}
        <div style={{ position: 'fixed', left: '-9999px', top: '-9999px', width: '800px' }}>
          <div
            ref={printableContractRef}
            dir="rtl"
            style={{
              backgroundColor: '#FFFFFF',
              color: '#0B132B',
              padding: '40px',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              width: '800px',
              minHeight: '1100px',
              boxSizing: 'border-box',
            }}
          >
            {/* PDF Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '3px solid #EA580C',
                paddingBottom: '20px',
                marginBottom: '25px',
              }}
            >
              <div>
                <h1
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    margin: 0,
                    color: '#0B132B',
                    letterSpacing: '1px',
                  }}
                >
                  OWN AURA OUTCOME
                </h1>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 700 }}>
                  الأكاديمية الرياضية النخبوية • إشراف الكوتش عمر عدنان
                </p>
                <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#EA580C', fontWeight: 800 }}>
                  وثيقة إقرار وتعهد وإخلاء مسؤولية رسمي (تدريب أونلاين)
                </p>
              </div>

              <div
                style={{
                  textAlign: 'left',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  backgroundColor: '#F8FAFC',
                }}
              >
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: 700 }}>رقم توثيق العقد:</div>
                <div style={{ fontSize: '14px', fontWeight: 900, color: '#EA580C', fontFamily: 'monospace' }}>
                  {contractId}
                </div>
                <div style={{ fontSize: '10px', color: '#94A3B8', marginTop: '3px' }}>{signedDate}</div>
              </div>
            </div>

            {/* Subscriber & Package Details Table */}
            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '14px',
                padding: '18px',
                marginBottom: '20px',
              }}
            >
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  margin: '0 0 12px 0',
                  color: '#0F172A',
                  borderBottom: '1px solid #CBD5E1',
                  paddingBottom: '6px',
                }}
              >
                أولاً: بيانات المشترك والباقة المعتمدة
              </h3>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: '10px',
                  fontSize: '12px',
                  color: '#334155',
                }}
              >
                <div>
                  <strong style={{ color: '#64748B' }}>اسم المتدرب: </strong>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>{fullName || 'المتدرب'}</span>
                </div>
                <div>
                  <strong style={{ color: '#64748B' }}>رقم الجوال / الواتساب: </strong>
                  <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                    {phoneWhatsapp || 'غير محدد'}
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#64748B' }}>البريد الإلكتروني: </strong>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>{email || 'غير محدد'}</span>
                </div>
                <div>
                  <strong style={{ color: '#64748B' }}>الباقة التدريبية: </strong>
                  <span style={{ fontWeight: 800, color: '#EA580C' }}>{currentPlanNameAr}</span>
                </div>
                <div>
                  <strong style={{ color: '#64748B' }}>مدة الاشتراك والرسوم: </strong>
                  <span style={{ fontWeight: 800, color: '#0F172A' }}>
                    {currentDurationInfo.labelAr} ({currentDurationInfo.price} ريال سعودي)
                  </span>
                </div>
                <div>
                  <strong style={{ color: '#64748B' }}>الإفصاح الصحي: </strong>
                  <span
                    style={{
                      fontWeight: 800,
                      color: healthStatus === 'healthy' ? '#059669' : '#D97706',
                    }}
                  >
                    {healthStatus === 'healthy'
                      ? 'سليم ولائق بدنياً 100%'
                      : `ملاحظات: ${healthIssuesDetails}`}
                  </span>
                </div>
              </div>
            </div>

            {/* Official PDF Clauses */}
            <div style={{ marginBottom: '20px' }}>
              <h3
                style={{
                  fontSize: '14px',
                  fontWeight: 900,
                  margin: '0 0 12px 0',
                  color: '#0F172A',
                  borderBottom: '1px solid #CBD5E1',
                  paddingBottom: '6px',
                }}
              >
                ثانياً: بنود الإقرار وإخلاء المسؤولية والشروط المعتمدة
              </h3>

              {/* Clause 1 */}
              <div style={{ marginBottom: '10px', fontSize: '11.5px', lineHeight: '1.6', color: '#1E293B' }}>
                <strong style={{ color: '#EA580C' }}>1. الحالة الصحية والمسؤولية التدريبية عن بُعد: </strong>
                أقر بأنني سليم صحياً ولائق لممارسة المجهود البدني، وأتحمل مسؤولية الإفصاح عن كافة المشاكل الصحية قبل البدء. أقر بأن المقاطع المرئية المرفقة بالبرنامج هي للتوضيح والاسترشاد فقط، وأنني المسؤول الأول عن تطبيق التمارين بالشكل الصحيح واختيار الأوزان المناسبة، ولا يتحمل المدرب أي مسؤولية عن أي إصابة ناتجة عن الأداء الخاطئ أو الإهمال.
              </div>

              {/* Clause 2 */}
              <div style={{ marginBottom: '10px', fontSize: '11.5px', lineHeight: '1.6', color: '#1E293B' }}>
                <strong style={{ color: '#EA580C' }}>2. النظام الغذائي والمكملات: </strong>
                أقر بأن النظام الغذائي مصمم بناءً على البيانات التي زودت المدرب بها، وأتحمل كامل المسؤولية عن الإفصاح عن أي حساسية أو مشاكل هضمية. أقر بأن استخدام أو شراء أي مكملات غذائية يكون بناءً على رغبتي الشخصية وعلى مسؤوليّتي الخاصة.
              </div>

              {/* Clause 3 */}
              <div style={{ marginBottom: '10px', fontSize: '11.5px', lineHeight: '1.6', color: '#1E293B' }}>
                <strong style={{ color: '#EA580C' }}>3. الملكية الفكرية وحظر التسريب وإعادة الإنتاج: </strong>
                أقر بأن جميع الجداول، والأنظمة الغذائية، والملفات المرفقة هي حقوق ملكية فكرية خاصة بالمدرب فقط ومخصصة لاستخدامي الشخصي. أتعهد بعدم مشاركة، أو إعادة نشر، أو تسريب، أو بيع أي جزء من المحتوى لأي شخص آخر أو عبر أي منصة، وأعلم بأنه في حال ثبوت التسريب يحق للمدرب إلغاء اشتراكي فوراً دون استرجاع أي مبالغ، مع الاحتفاظ بحقه القانوني في المطالبة بالتعويض عن الأضرار.
              </div>

              {/* Clause 4 */}
              <div style={{ marginBottom: '10px', fontSize: '11.5px', lineHeight: '1.6', color: '#1E293B' }}>
                <strong style={{ color: '#EA580C' }}>4. سياسة الدفع، الاسترجاع، والنتائج: </strong>
                أقر بأن الرسوم المدفوعة غير قابلة للاسترجاع بعد استلام الخطة والبرنامج التدريبي. أقر بأن النتائج تعتمد كلياً على مدى التزامي الشخصي بالتعليمات، والمدرب غير مسؤول عن عدم تحقيق النتائج في حال عدم الالتزام الكامل.
              </div>
            </div>

            {/* Official Signature Execution Box */}
            <div
              style={{
                marginTop: '25px',
                border: '2px solid #EA580C',
                borderRadius: '14px',
                padding: '16px',
                backgroundColor: '#FFF7ED',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: 900, color: '#C2410C', marginBottom: '6px' }}>
                    ثالثاً: الاعتماد والتوقيع الإلكتروني الرسمي
                  </div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#431407', lineHeight: '1.5' }}>
                    أقر أنا المذكور أعلاه بأن جميع البيانات المدخلة صحيحة، وبأني قرأت جميع الشروط والأحكام وأوافق عليها كاملاً. يُعتبر الاسم والتوقيع أدناه اعتماداً وتوقيعاً إلكترونياً رسمياً ملزماً قانونياً.
                  </p>
                  <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                    اسم الموقع: <span style={{ textDecoration: 'underline' }}>{typedSignatureName || fullName}</span>
                  </div>
                </div>

                {signatureDataUrl && (
                  <div
                    style={{
                      border: '1px solid #FDBA74',
                      borderRadius: '8px',
                      padding: '4px',
                      backgroundColor: '#FFFFFF',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontSize: '9px', color: '#9A3412', marginBottom: '2px' }}>التوقيع الرقمي:</div>
                    <img
                      src={signatureDataUrl}
                      alt="Digital Signature"
                      style={{ width: '120px', height: '45px', objectFit: 'contain' }}
                    />
                  </div>
                )}
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px',
                  paddingTop: '8px',
                  borderTop: '1px dashed #FDBA74',
                  fontSize: '10px',
                  color: '#9A3412',
                }}
              >
                <span>الختم والتوثيق الإلكتروني: منصة OAO للتدريب النخبوي</span>
                <span>تاريخ الاعتماد: {signedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
