import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Language,
  SubscriptionAgreement,
  SubscriptionDurationKey,
  SubscriptionPlanTier,
} from '../types';
import { BrandLogo } from '../components/BrandLogo';
import { VIPBadge } from '../components/VIPBadge';
import {
  FileText,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  User,
  Phone,
  Mail,
  Activity,
  ArrowRight,
  ArrowLeft,
  Shield,
  RotateCcw,
  Check,
  Download,
  Crown,
  MessageCircle,
  Home,
  CheckSquare,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const SubscribePage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState<Language>('ar');

  // Step 1 = Plan Selection, Step 2 = Declaration & Terms Form, Step 3 = PDF Download & WhatsApp Confirmation
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Active Selected Plan (Can be switched in Step 1)
  const [activePlanId, setActivePlanId] = useState<'standard' | 'platinum'>('platinum');
  const [selectedDurationKey, setSelectedDurationKey] = useState<SubscriptionDurationKey>('3_months');

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

  // Ref for rendering high-fidelity PDF
  const printableContractRef = useRef<HTMLDivElement | null>(null);

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

  // Initialize unique contract ID and timestamp
  useEffect(() => {
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
  }, [language]);

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
      window.scrollTo({ top: 0, behavior: 'smooth' });
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

    // Step 3: Trigger automatic PDF generation and download
    await generateAndDownloadPDF();

    // Transition to Step 3
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    <div className="min-h-screen bg-[#070E24] text-white selection:bg-orange-500 selection:text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-[#0B132B]/90 backdrop-blur-xl border-b border-orange-500/20 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={true} />
            <div className="hidden sm:block h-5 w-[1px] bg-white/10" />
            <span className="hidden sm:inline-block text-xs font-black tracking-widest text-orange-400 uppercase">
              {language === 'ar' ? 'بوابة الاشتراك والتوثيق المباشر' : 'Standalone Subscription Portal'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-slate-300 transition-all cursor-pointer"
            >
              {language === 'ar' ? 'English' : 'عربي'}
            </button>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>{language === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-5xl mx-auto px-4 py-8 sm:py-12">
        {/* Progress Tracker */}
        <div className="mb-8 p-4 rounded-2xl bg-[#0B132B] border border-orange-500/20 flex items-center justify-between text-xs max-w-2xl mx-auto shadow-lg">
          {/* Step 1 Indicator */}
          <div
            className={`flex items-center gap-2 cursor-pointer ${
              currentStep >= 1 ? 'text-orange-400 font-black' : 'text-slate-500 font-bold'
            }`}
            onClick={() => currentStep > 1 && setCurrentStep(1)}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-orange-500 text-white shadow-[0_0_12px_rgba(255,87,34,0.8)]'
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
            </span>
            <span>{language === 'ar' ? '1. اختيار الباقة' : '1. Select Plan'}</span>
          </div>

          <div className="h-0.5 flex-1 bg-white/10 mx-3" />

          {/* Step 2 Indicator */}
          <div
            className={`flex items-center gap-2 ${
              currentStep >= 2 ? 'text-orange-400 font-black' : 'text-slate-500 font-bold'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : currentStep === 2
                  ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(255,87,34,0.8)]'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
            </span>
            <span>{language === 'ar' ? '2. نموذج الإقرار والتعهد' : '2. Declaration'}</span>
          </div>

          <div className="h-0.5 flex-1 bg-white/10 mx-3" />

          {/* Step 3 Indicator */}
          <div
            className={`flex items-center gap-2 ${
              currentStep === 3 ? 'text-emerald-400 font-black' : 'text-slate-500 font-bold'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${
                currentStep === 3
                  ? 'bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  : 'bg-white/10 text-slate-400'
              }`}
            >
              3
            </span>
            <span>{language === 'ar' ? '3. ملف PDF والواتساب' : '3. PDF & WhatsApp'}</span>
          </div>
        </div>

        {/* Mandatory Warning Alert Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border-2 border-red-500 text-white shadow-[0_0_25px_rgba(239,68,68,0.5)]">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-600 text-white shrink-0 shadow-md">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-black text-red-200 uppercase tracking-wide">
                  {language === 'ar' ? 'تنبيه إلزامي ومطلوب' : 'Mandatory Requirement Alert'}
                </h4>
                <p className="text-sm font-black text-white mt-1 leading-relaxed">{errorMessage}</p>

                {missingFields.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-red-500/30">
                    <span className="text-xs font-bold text-red-300 block mb-1.5">
                      {language === 'ar' ? 'يرجى استكمال البنود التالية أولاً:' : 'Please complete the following:'}
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
            STEP 1: SELECT PLAN
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="text-center max-w-xl mx-auto">
              <span className="text-xs font-black tracking-widest text-[#FF7043] uppercase block mb-1">
                {language === 'ar' ? 'الخطوة الأولى: اختيار الباقة والمدة' : 'Step 1: Select Plan & Duration'}
              </span>
              <h1 className="text-3xl font-black text-white">
                {language === 'ar' ? 'اختر الباقة الرياضية المناسبة لك' : 'Choose Your Elite Coaching Tier'}
              </h1>
              <p className="text-sm text-slate-400 font-medium mt-2">
                {language === 'ar'
                  ? 'جميع الباقات تحت إشراف وتصميم مباشر ومخصص من الكوتش عمر عدنان'
                  : 'Tailored athletic and nutritional coaching directly from Coach Omar Adnan'}
              </p>
            </div>

            {/* Plan Cards Grid: Standard vs VIP */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Standard Package */}
              <div
                onClick={() => setActivePlanId('standard')}
                className={`p-6 sm:p-8 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activePlanId === 'standard'
                    ? 'bg-slate-900/90 border-slate-300 shadow-[0_0_35px_rgba(255,255,255,0.15)] ring-2 ring-slate-300'
                    : 'bg-[#0B132B]/80 border-white/10 hover:border-white/30 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3.5 py-1 rounded-full bg-slate-800 text-slate-200 border border-slate-700 text-xs font-black">
                      STANDARD
                    </span>
                    <Shield className="w-6 h-6 text-slate-300" />
                  </div>
                  <h3 className="text-2xl font-black text-white">الباقة القياسية (Standard)</h3>
                  <p className="text-xs text-slate-400 font-medium mt-2 leading-relaxed">
                    الباقة المثالية لمن يمتلك الخبرة الأساسية ويفضل المتابعة الشهرية المنتظمة.
                  </p>

                  <div className="my-6 space-y-2.5 text-xs text-slate-300">
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>تقييم البنية العضلية وحساب الاحتياج اليومي</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>تصميم النظام الغذائي مع التحديث شهرياً</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>تحديث جدول التمارين شهرياً حسب التطور</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-slate-400 shrink-0" />
                      <span>متابعة شهرية مع الكوتش</span>
                    </div>
                  </div>
                </div>

                {/* Duration options for standard */}
                <div className="mt-4 pt-4 border-t border-white/10">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2.5">
                    اختر مدة الاشتراك:
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
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white text-slate-900 border-white font-black shadow-lg scale-105'
                              : 'bg-black/50 text-slate-300 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className="block text-xs font-bold">{dInfo.labelAr}</span>
                          <span className="block text-sm font-black font-mono mt-0.5">
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
                className={`p-6 sm:p-8 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                  activePlanId === 'platinum'
                    ? 'bg-gradient-to-b from-[#1C1605] via-[#120F05] to-[#0A0802] border-amber-400 shadow-[0_0_45px_rgba(245,158,11,0.35)] ring-2 ring-amber-400'
                    : 'bg-[#0B132B]/80 border-white/10 hover:border-amber-400/30 text-slate-400'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-black shadow-md flex items-center gap-1.5">
                      <Crown className="w-3.5 h-3.5" />
                      <span>PLATINUM VIP</span>
                    </span>
                    <VIPBadge variant="compact" language={language} />
                  </div>
                  <h3 className="text-2xl font-black text-amber-300">الباقة البلاتينية (VIP)</h3>
                  <p className="text-xs text-amber-200/80 font-medium mt-2 leading-relaxed">
                    التجربة التدريبية المتكاملة مع متابعة أسبوعية دقيقة، وتوجيه مباشر من الكوتش.
                  </p>

                  <div className="my-6 space-y-2.5 text-xs text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>تقييم وتحديث مستمر كل أسبوع مع الكوتش</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>نظام غذائي وتمارين تفاعلية متجددة</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>تواصل مباشر وأولوية استجابة فورية</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Check className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>ميزة تجميد الاشتراك عند السفر أو الطوارئ</span>
                    </div>
                  </div>
                </div>

                {/* Duration options for VIP */}
                <div className="mt-4 pt-4 border-t border-amber-500/20">
                  <span className="text-[11px] font-bold text-amber-300 block mb-2.5">
                    اختر مدة الاشتراك:
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
                          className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-300 font-black shadow-lg scale-105'
                              : 'bg-black/50 text-amber-100/70 border-amber-500/30 hover:border-amber-400/50'
                          }`}
                        >
                          <span className="block text-xs font-bold">{dInfo.labelAr}</span>
                          <span className="block text-sm font-black font-mono mt-0.5">
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
            <div className="p-6 rounded-3xl bg-[#0B132B] border border-orange-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="text-xs sm:text-sm text-slate-300 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-500 animate-pulse" />
                <span>
                  الباقة المحددة: <strong className="text-white font-black">{currentPlanNameAr}</strong> (
                  <strong className="text-orange-400">{currentDurationInfo.labelAr}</strong> -{' '}
                  <strong className="text-amber-300 font-mono">{currentDurationInfo.price} ريال</strong>)
                </span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-[#FF7043] to-amber-500 hover:from-[#FF7043] hover:to-orange-500 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_30px_rgba(255,87,34,0.6)] flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer"
              >
                <FileText className="w-5 h-5" />
                <span>
                  {language === 'ar'
                    ? 'الانتقال لنموذج الإقرار والتعهد 📋'
                    : 'Proceed to Declaration Form 📋'}
                </span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: DECLARATION FORM & DIGITAL SIGNATURE
            ========================================================================= */}
        {currentStep === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Top Banner */}
            <div className="bg-gradient-to-r from-orange-500/10 via-[#1C2541]/70 to-blue-900/20 border border-orange-500/30 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-orange-500/20 border border-orange-500/40 text-orange-400 font-black text-xs uppercase mb-2">
                    <FileText className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'الوثيقة القانونية والإقرار' : 'Official Legal Contract'}</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
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
                <div className="bg-[#0B132B] border border-orange-500/40 rounded-2xl p-4 text-center shrink-0 shadow-lg">
                  <span className="text-[10px] text-slate-400 font-bold block">الباقة والمدة</span>
                  <span className="text-sm font-black text-white block mt-0.5">
                    {currentPlanNameAr}
                  </span>
                  <span className="text-xs font-black text-orange-400 block font-mono tabular-nums mt-0.5">
                    {currentDurationInfo.price.toLocaleString()} ريال • {currentDurationInfo.labelAr}
                  </span>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-[10px] text-slate-400 hover:text-white underline mt-2 block"
                  >
                    {language === 'ar' ? 'تغيير الباقة' : 'Change Plan'}
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleAgreeAndDeclare} className="space-y-8">
              {/* Part 1: Personal & Health Data */}
              <div className="bg-[#0B132B]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
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
                    4. الإفصاح عن الحالة الصحية والإصابات (اختر بدقة):
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <label
                      onClick={() => setHealthStatus('healthy')}
                      className={`p-4 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                        healthStatus === 'healthy'
                          ? 'bg-emerald-500/15 border-emerald-500 text-white ring-2 ring-emerald-500/40'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="healthStatus"
                        checked={healthStatus === 'healthy'}
                        onChange={() => setHealthStatus('healthy')}
                        className="accent-emerald-500 w-4 h-4"
                      />
                      <div>
                        <strong className="block text-sm font-black text-emerald-400">
                          أنا سليم 100% ولا أعاني من أي أمراض مزمنة أو إصابات
                        </strong>
                        <span className="text-xs text-slate-400">
                          جاهز للتدريب الرياضي الشامل دون أي موانع طبية
                        </span>
                      </div>
                    </label>

                    <label
                      onClick={() => setHealthStatus('has_issues')}
                      className={`p-4 rounded-2xl border cursor-pointer flex items-center gap-3 transition-all ${
                        healthStatus === 'has_issues'
                          ? 'bg-amber-500/15 border-amber-500 text-white ring-2 ring-amber-500/40'
                          : 'bg-black/30 border-white/10 text-slate-400 hover:border-white/20'
                      }`}
                    >
                      <input
                        type="radio"
                        name="healthStatus"
                        checked={healthStatus === 'has_issues'}
                        onChange={() => setHealthStatus('has_issues')}
                        className="accent-amber-500 w-4 h-4"
                      />
                      <div>
                        <strong className="block text-sm font-black text-amber-400">
                          نعم، أعاني من إصابات سابقة أو حالات صحية محددة
                        </strong>
                        <span className="text-xs text-slate-400">
                          (مثل: خشونة بالركبة، انزلاق غضروفي، ضغط دم، ربو...)
                        </span>
                      </div>
                    </label>
                  </div>

                  {healthStatus === 'has_issues' && (
                    <div className="mt-4 p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 space-y-2 animate-in fade-in">
                      <label className="text-xs font-black text-amber-300 block">
                        يرجى توضيح تفاصيل الإصابة أو الحالة الصحية بدقة للكوتش:
                      </label>
                      <textarea
                        rows={3}
                        required
                        value={healthIssuesDetails}
                        onChange={(e) => setHealthIssuesDetails(e.target.value)}
                        placeholder="اكتب هنا أي تفاصيل أو تقارير طبية حتى يراعيها الكوتش في البرنامج..."
                        className="w-full p-3 rounded-xl bg-black/50 border border-amber-500/40 text-white text-xs outline-none focus:border-amber-400"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Part 2: Mandatory Terms & Declarations */}
              <div className="bg-[#0B132B]/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      الجزء الثاني: بنود الإقرار وإخلاء المسؤولية المعتمدة ⚖️
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      يجب قراءة جميع البنود وتفعيل خانات الموافقة الأربعة لتوليد الوثيقة
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Clause 1: Health & Remote Training */}
                  <label
                    onClick={() => setAgreedHealth(!agreedHealth)}
                    className={`p-5 rounded-2xl border cursor-pointer flex items-start gap-4 transition-all ${
                      agreedHealth
                        ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreedHealth}
                      onChange={(e) => setAgreedHealth(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                    />
                    <div className="text-xs leading-relaxed space-y-1">
                      <strong className="text-sm font-black text-white block">
                        1. بند الحالة الصحية والمسؤولية التدريبية عن بُعد
                      </strong>
                      <p className="text-slate-300">
                        أقر بأنني لائق بدنياً وصحياً لممارسة النشاط الرياضي، وأن خدمة التدريب المقدمة هي "عن بُعد" (Online Coaching). إن مقاطع الفيديو التوضيحية والإرشادات المعطاة هي للاسترشاد الفني، وأتحمل المسؤولية الكاملة عن أداء التمارين واختيار الأوزان المناسبة لقدرتي داخل النادي أو المنزل دون أدنى مسؤولية مدنية أو جنائية على المدرب عمر عدنان أو منصة OAO عند وقوع أي إصابة ناتجة عن سوء التنفيذ أو الإجهاد الزائد.
                      </p>
                    </div>
                  </label>

                  {/* Clause 2: Diet & Supplements */}
                  <label
                    onClick={() => setAgreedNutrition(!agreedNutrition)}
                    className={`p-5 rounded-2xl border cursor-pointer flex items-start gap-4 transition-all ${
                      agreedNutrition
                        ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreedNutrition}
                      onChange={(e) => setAgreedNutrition(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                    />
                    <div className="text-xs leading-relaxed space-y-1">
                      <strong className="text-sm font-black text-white block">
                        2. بند النظام الغذائي والمكملات الغذائية
                      </strong>
                      <p className="text-slate-300">
                        أقر بمسؤوليتي التامة عن إشعار المدرب بأي حساسية غذائية أو أمراض باطنية (كالسكري أو الضغط أو حساسية اللاكتوز/الجلوتين). كما أقر بأن أي مكملات غذائية مقترحة هي خيار شخصي وشرائها واستخدامها يكون بناءً على رغبتي ومسؤوليتي بعد مراجعة النشرات الطبية أو الاستشارة المتخصصة.
                      </p>
                    </div>
                  </label>

                  {/* Clause 3: Intellectual Property & Non-Leakage */}
                  <label
                    onClick={() => setAgreedIP(!agreedIP)}
                    className={`p-5 rounded-2xl border cursor-pointer flex items-start gap-4 transition-all ${
                      agreedIP
                        ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreedIP}
                      onChange={(e) => setAgreedIP(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                    />
                    <div className="text-xs leading-relaxed space-y-1">
                      <strong className="text-sm font-black text-white block">
                        3. بند الملكية الفكرية وحظر التسريب وإعادة النشر
                      </strong>
                      <p className="text-slate-300">
                        جميع الجداول والخطط التدريبية والأنظمة الغذائية المصممة من قبل المدرب عمر عدنان (Own Aura Outcome) هي حقوق ملكية فكرية خاصة به وتُمنح لي للاستخدام الشخصي فقط. وأتعهد تعهداً قاطعاً بعدم نشرها أو بيعها أو مشاركتها عبر وسائل التواصل الاجتماعي أو مع أطراف أخرى، مع علمي بأن أي مخالفة تعرضني للمساءلة القانونية والمطالبة بالتعويض المادي والأدبي.
                      </p>
                    </div>
                  </label>

                  {/* Clause 4: Payment, Refund & Results Policy */}
                  <label
                    onClick={() => setAgreedPaymentPolicy(!agreedPaymentPolicy)}
                    className={`p-5 rounded-2xl border cursor-pointer flex items-start gap-4 transition-all ${
                      agreedPaymentPolicy
                        ? 'bg-emerald-500/10 border-emerald-500/60 ring-1 ring-emerald-500/30'
                        : 'bg-black/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={agreedPaymentPolicy}
                      onChange={(e) => setAgreedPaymentPolicy(e.target.checked)}
                      className="mt-1 w-5 h-5 accent-emerald-500 rounded cursor-pointer shrink-0"
                    />
                    <div className="text-xs leading-relaxed space-y-1">
                      <strong className="text-sm font-black text-white block">
                        4. بند سياسة الدفع والاسترجاع والنتائج
                      </strong>
                      <p className="text-slate-300">
                        أعلم أن رسوم الاشتراك المدفوعة هي مقابل الجهد الفني والوقت المخصص لتصميم البرنامج، وهي غير قابلة للاسترجاع بعد استلام الخطة أو البدء فيها. كما أقر بأن تحقيق النتائج الرياضية والبدنية يعتمد بنسبة 100% على التزامي الشخصي بتطبيق التمارين وتناول الاحتياج الغذائي بدقة.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Part 3: Electronic Signature & Execution */}
              <div className="bg-[#0B132B]/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
                <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                  <div className="p-2.5 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">
                      الجزء الثالث: التوقيع الإلكتروني والاعتماد الرسمي ✍️
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      اكتب اسمك الثلاثي واعتمد توقيعك ليكون ملزماً ونظامياً
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Typed Electronic Signature */}
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-300">
                      أ) كتابة الاسم الثلاثي للتوقيع الإلكتروني:
                      <span className="text-red-400 mr-1">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={typedSignatureName}
                      onChange={(e) => setTypedSignatureName(e.target.value)}
                      placeholder="أدخل اسمك الثلاثي كتوقيع إلكتروني معتمد"
                      className={`w-full px-4 py-3 rounded-2xl border text-white text-sm font-black outline-none placeholder:text-slate-600 transition-all ${
                        fullName.trim() &&
                        typedSignatureName.trim() &&
                        fullName.trim().replace(/\s+/g, ' ').toLowerCase() ===
                          typedSignatureName.trim().replace(/\s+/g, ' ').toLowerCase()
                          ? 'border-emerald-500 bg-emerald-500/10'
                          : typedSignatureName.trim()
                          ? 'border-amber-500 bg-amber-500/10'
                          : 'bg-black/40 border-white/15 focus:border-emerald-500'
                      }`}
                    />
                    {typedSignatureName.trim().length > 0 && (
                      <div className="mt-1 animate-in fade-in duration-200">
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
                    <span className="text-[11px] text-slate-500 block">
                      يعتبر إدخال اسمك هنا بمثابة توقيع إلكتروني نافذ نظاماً وفق أحكام المعاملات الإلكترونية.
                    </span>
                  </div>

                  {/* Drawing Signature Pad (Optional Enhancement) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-slate-300">
                        ب) التوقيع اليدوي باللمس أو الماوس (اختياري):
                      </label>
                      {hasCanvasSignature && (
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>مسح التوقيع</span>
                        </button>
                      )}
                    </div>

                    <div className="h-32 rounded-2xl bg-black/50 border border-white/15 overflow-hidden relative touch-none">
                      <canvas
                        ref={canvasRef}
                        width={400}
                        height={128}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-full cursor-crosshair"
                      />
                      {!hasCanvasSignature && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-slate-600 text-xs font-bold">
                          وقع بيدك أو بالماوس هنا
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit & Legal Seal */}
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">رقم التوثيق المرجعي للعقد:</span>
                    <strong className="text-orange-400 font-mono text-sm">{contractId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[11px]">تاريخ ووقت التوقيع:</span>
                    <strong className="text-slate-200">{signedDate}</strong>
                  </div>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-black">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>جاهز للتوثيق والاعتماد</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                  <span>{language === 'ar' ? 'الرجوع لاختيار الباقة' : 'Back to Plans'}</span>
                </button>

                <button
                  type="submit"
                  disabled={isGeneratingPdf}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_35px_rgba(16,185,129,0.5)] flex items-center justify-center gap-2 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <span>جاري توليد ملف الـ PDF...</span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>{language === 'ar' ? 'موافق وأقر (توليد وتنزيل وثيقة الـ PDF فوراً) 📥' : 'Agree & Sign (Instant PDF Download) 📥'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            STEP 3: PDF DOWNLOAD CONFIRMATION & WHATSAPP BUTTON
            ========================================================================= */}
        {currentStep === 3 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-gradient-to-b from-emerald-950/60 via-[#0B132B]/90 to-[#070E24] border-2 border-emerald-500/50 rounded-3xl p-8 sm:p-12 text-center shadow-[0_0_60px_rgba(16,185,129,0.25)] relative overflow-hidden">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(16,185,129,0.7)] mb-6">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase block mb-1">
                {language === 'ar' ? 'تم حفظ وتوثيق الإقرار بنجاح' : 'DECLARATION EXECUTED & CERTIFIED'}
              </span>

              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">
                {language === 'ar'
                  ? 'تم تنزيل وثيقة إقرارك بصيغة PDF على جهازك بنجاح! 📄'
                  : 'Your Official Signed Declaration PDF Has Been Downloaded!'}
              </h2>

              <p className="text-sm text-slate-300 max-w-xl mx-auto leading-relaxed mb-6 font-medium">
                {language === 'ar'
                  ? `أهلاً بك يا بطل (${fullName})! تم حفظ وتوثيق إقرار اشتراكك بالرقم المرجعي (${contractId}). الخطوة الأخيرة لتأكيد تفعيل جدولك والختم المائي هي إرسال الملف أو البيانات للكوتش عمر عبر الواتساب.`
                  : `Welcome athlete (${fullName})! Your contract (${contractId}) is recorded. Please forward the signed PDF to Coach Omar Adnan via WhatsApp to activate your workouts.`}
              </p>

              {/* Contract Summary Box */}
              <div className="max-w-md mx-auto p-4 rounded-2xl bg-black/50 border border-white/10 text-right text-xs space-y-2 mb-8">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">اسم المتدرب:</span>
                  <strong className="text-white">{fullName}</strong>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">الباقة والمدة:</span>
                  <strong className="text-orange-400">{currentPlanNameAr} ({currentDurationInfo.labelAr})</strong>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-slate-400">قيمة الاشتراك:</span>
                  <strong className="text-amber-300 font-mono">{currentDurationInfo.price} ريال</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">رقم التوثيق المرجعي:</span>
                  <strong className="text-white font-mono">{contractId}</strong>
                </div>
              </div>

              {/* Action Buttons: Green WhatsApp Button + Re-download PDF Button */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto">
                {/* PROMINENT GREEN WHATSAPP BUTTON */}
                <a
                  href={whatsappDirectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-4 px-6 rounded-2xl bg-[#25D366] hover:bg-[#20ba5a] text-white font-black text-sm tracking-wide shadow-[0_0_35px_rgba(37,211,102,0.6)] flex items-center justify-center gap-2.5 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <MessageCircle className="w-5 h-5 fill-white stroke-none" />
                  <span>{language === 'ar' ? 'إرسال الإقرار عبر الواتساب لتأكيد الاشتراك' : 'Send Declaration via WhatsApp'}</span>
                </a>

                {/* Re-download PDF Button */}
                <button
                  type="button"
                  onClick={generateAndDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="w-full sm:w-auto py-4 px-6 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-orange-400" />
                  <span>{isGeneratingPdf ? 'جاري التحميل...' : 'إعادة تحميل الـ PDF'}</span>
                </button>
              </div>

              {/* Return to home link */}
              <div className="mt-8 pt-6 border-t border-white/10">
                <button
                  onClick={() => navigate('/')}
                  className="text-xs text-slate-400 hover:text-white underline font-bold"
                >
                  {language === 'ar' ? 'الرجوع إلى الصفحة الرئيسية لمنصة OAO' : 'Return to OAO Homepage'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          HIDDEN PRINTABLE CONTAINER FOR HIGH-FIDELITY PDF RENDERING (html2canvas)
          ========================================================================= */}
      <div className="overflow-hidden h-0 w-0 pointer-events-none opacity-0">
        <div
          ref={printableContractRef}
          style={{ width: '800px', backgroundColor: '#ffffff', color: '#111827', padding: '40px', fontFamily: 'sans-serif', direction: 'rtl' }}
        >
          {/* PDF Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #EA580C', paddingBottom: '16px', marginBottom: '24px' }}>
            <div>
              <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '900', color: '#0B132B' }}>
                منصة Own Aura Outcome (OAO)
              </h1>
              <span style={{ fontSize: '13px', color: '#EA580C', fontWeight: 'bold' }}>
                أكاديمية التدريب الرياضي الشامل تحت إشراف الكوتش عمر عدنان
              </span>
            </div>
            <div style={{ textAlign: 'left', direction: 'ltr' }}>
              <span style={{ fontSize: '11px', color: '#6B7280', display: 'block' }}>Contract ID:</span>
              <strong style={{ fontSize: '14px', color: '#0B132B', fontFamily: 'monospace' }}>{contractId}</strong>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '900', color: '#111827', margin: '0 0 6px 0' }}>
              وثيقة إقرار وإخلاء مسؤولية وشروط الاشتراك المعتمدة
            </h2>
            <span style={{ fontSize: '12px', color: '#4B5563' }}>
              تاريخ الاعتماد: {signedDate}
            </span>
          </div>

          {/* Section 1 */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#EA580C' }}>
              أولاً: البيانات الشخصية والصحية للمشترك
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#6B7280', display: 'block' }}>الاسم الكامل:</span>
                <strong style={{ color: '#111827' }}>{fullName}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block' }}>رقم الجوال:</span>
                <strong style={{ color: '#111827' }} dir="ltr">{phoneWhatsapp}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block' }}>البريد الإلكتروني:</span>
                <strong style={{ color: '#111827' }}>{email}</strong>
              </div>
            </div>
            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #F3F4F6', fontSize: '12px' }}>
              <span style={{ color: '#6B7280', display: 'block' }}>الإفصاح الصحي:</span>
              <strong style={{ color: healthStatus === 'healthy' ? '#059669' : '#D97706' }}>
                {healthStatus === 'healthy' ? 'سليم ولائق بدنياً 100% ولا توجد أي مشاكل صحية' : healthIssuesDetails}
              </strong>
            </div>
          </div>

          {/* Section 2 */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '16px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 'bold', color: '#EA580C' }}>
              ثانياً: تفاصيل الباقة والاشتراك
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', fontSize: '12px' }}>
              <div>
                <span style={{ color: '#6B7280', display: 'block' }}>نوع الباقة:</span>
                <strong style={{ color: '#111827' }}>{currentPlanNameAr}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block' }}>مدة الاشتراك:</span>
                <strong style={{ color: '#111827' }}>{currentDurationInfo.labelAr}</strong>
              </div>
              <div>
                <span style={{ color: '#6B7280', display: 'block' }}>رسوم الاشتراك:</span>
                <strong style={{ color: '#EA580C' }}>{currentDurationInfo.price} ريال سعودي</strong>
              </div>
            </div>
          </div>

          {/* Section 3 */}
          <div style={{ border: '1px solid #E5E7EB', borderRadius: '12px', padding: '16px', marginBottom: '16px', fontSize: '11px', lineHeight: '1.6', color: '#374151' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold', color: '#EA580C' }}>
              ثالثاً: الإقرارات والتعهدات المعتمدة
            </h3>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>1. المسؤولية التدريبية:</strong> أقر بأنني لائق بدنياً وأتحمل المسؤولية الشخصية الكاملة عن أداء التمارين والأوزان دون أدنى مسؤولية على الكوتش.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>2. النظام الغذائي والمكملات:</strong> أتحمل المسؤولية الكاملة عن الإفصاح عن الحساسيات، وأن المكملات هي خيار شخصي طوعي.
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              <strong>3. الملكية الفكرية:</strong> أتعهد بعدم نشر أو تسريب أو بيع أي جداول تدريبية مع علمي بحقوق الكوتش القانونية.
            </p>
            <p style={{ margin: '0' }}>
              <strong>4. سياسة الدفع:</strong> أعلم أن الرسوم غير قابلة للاسترجاع بعد استلام الخطة، وأن النتائج تعتمد على التزامي الشخصي.
            </p>
          </div>

          {/* Section 4: Signature Box */}
          <div style={{ border: '2px solid #059669', borderRadius: '12px', padding: '16px', backgroundColor: '#F0FDF4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 'bold', display: 'block' }}>
                التوقيع الإلكتروني للمشترك:
              </span>
              <strong style={{ fontSize: '16px', color: '#065F46', display: 'block', marginTop: '4px' }}>
                {typedSignatureName}
              </strong>
              <span style={{ fontSize: '10px', color: '#6B7280', display: 'block', marginTop: '4px' }}>
                وثيقة نافذة وموقعة إلكترونياً • {signedDate}
              </span>
            </div>
            {signatureDataUrl && (
              <div>
                <img src={signatureDataUrl} alt="Signature" style={{ maxHeight: '50px', border: '1px solid #D1D5DB', borderRadius: '6px' }} />
              </div>
            )}
            <div style={{ textAlign: 'center', border: '1px dashed #059669', padding: '8px 16px', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669', display: 'block' }}>
                معتمد رسمياً 100%
              </span>
              <span style={{ fontSize: '10px', color: '#065F46' }}>
                Own Aura Outcome
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
