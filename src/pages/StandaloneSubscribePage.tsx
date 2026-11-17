import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { VIPBadge } from '../components/VIPBadge';
import {
  SubscriptionAgreement,
  SubscriptionDurationKey,
  SubscriptionPlanTier,
  Language,
  Theme,
} from '../types';
import {
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  PenTool,
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
  Home,
  Sparkles,
  Sun,
  Moon,
  Globe,
  Scale,
  Flame,
  FileCheck,
  Lock,
  CreditCard,
  FileText,
  Upload,
  Paperclip,
  Trash2,
  LogIn,
  Eye,
} from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { assignSubscriberPassword, setCurrentUserSession } from '../lib/authStore';
import { saveDeclarationToSupabase, syncProfileToSupabase } from '../lib/supabase';
import { INITIAL_CLIENT_PROFILE } from '../data/initialData';

export const StandaloneSubscribePage: React.FC = () => {
  const navigate = useNavigate();

  // Language & Theme State
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('oao_theme') as Theme) || 'dark';
  });

  const toggleLanguage = () => {
    const next = language === 'ar' ? 'en' : 'ar';
    setLanguage(next);
    localStorage.setItem('oao_lang', next);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('oao_theme', next);
  };

  // Navigation Steps: 1 = Plan Selection, 2 = Declaration Form, 3 = Confirmation & WhatsApp
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Active Plan & Duration Selection
  const [activePlanId, setActivePlanId] = useState<'standard' | 'platinum'>('platinum');
  const [selectedDurationKey, setSelectedDurationKey] = useState<SubscriptionDurationKey>('6_months');

  // Payment Installments: 3 options
  const [paymentInstallments, setPaymentInstallments] = useState<'full' | '2_installments' | '3_installments'>('full');

  // Visual Goal: 4 exact standardized options
  const [visualGoal, setVisualGoal] = useState<string>('تضخيم وبناء عضلي (Bulking)');

  // Form State - Part 1: Personal & Health Info
  const [fullName, setFullName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState<number | ''>(24);
  const [bloodType, setBloodType] = useState<string>('O+');
  const [inBodyFileUrl, setInBodyFileUrl] = useState<string>('');
  const [inBodyFileName, setInBodyFileName] = useState<string>('');
  const [inBodyFileSize, setInBodyFileSize] = useState<string>('');
  const inBodyInputRef = useRef<HTMLInputElement | null>(null);

  const [healthStatus, setHealthStatus] = useState<'healthy' | 'has_issues'>('healthy');
  const [healthIssuesDetails, setHealthIssuesDetails] = useState('');

  // Installments Logic:
  // VIP: All 3 options available across all durations
  // Standard: ONLY available when 12_months (Full Year) is selected
  const isInstallmentsAllowed = activePlanId === 'platinum' || selectedDurationKey === '12_months';

  useEffect(() => {
    if (!isInstallmentsAllowed && paymentInstallments !== 'full') {
      setPaymentInstallments('full');
    }
  }, [activePlanId, selectedDurationKey, isInstallmentsAllowed, paymentInstallments]);

  // Form State - Part 2: Mandatory Terms (Images 1 & 2)
  const [agreedHealth, setAgreedHealth] = useState(false);
  const [agreedNutrition, setAgreedNutrition] = useState(false);
  const [agreedIP, setAgreedIP] = useState(false);
  const [agreedPaymentPolicy, setAgreedPaymentPolicy] = useState(false);

  // Form State - Part 3: Digital Signature (Image 3)
  const [typedSignatureName, setTypedSignatureName] = useState('');
  const [contractId, setContractId] = useState('');
  const [signedDate, setSignedDate] = useState('');

  // Error & Alert States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [completedAgreement, setCompletedAgreement] = useState<SubscriptionAgreement | null>(null);

  // Canvas for Digital Signature
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasCanvasSignature, setHasCanvasSignature] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string>('');

  // Printable ref for high-resolution PDF rendering
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
    activePlanId === 'platinum' ? 'Platinum VIP Plan' : 'Standard Athlete Plan';
  const resolvedPlanTier: SubscriptionPlanTier = activePlanId === 'platinum' ? 'VIP' : 'standard';

  // Initialize unique contract verification ID & Date on mount
  useEffect(() => {
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    setContractId(`OAO-AGR-${new Date().getFullYear()}-${randomNum}`);

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
    ctx.strokeStyle = '#EA580C';
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

  // Name Matching Helper
  const cleanFullName = fullName.trim().replace(/\s+/g, ' ');
  const cleanSignature = typedSignatureName.trim().replace(/\s+/g, ' ');
  const isNameMatching =
    cleanFullName.length > 0 &&
    cleanSignature.length > 0 &&
    cleanFullName.toLowerCase() === cleanSignature.toLowerCase();

  // Validation function: Check 100% completeness & exact name match
  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!fullName.trim() || fullName.trim().split(/\s+/).length < 2) {
      errors.push(
        language === 'ar'
          ? 'الاسم الثلاثي بالكامل (حقل إجباري)'
          : 'Full name (triple name required)'
      );
    }
    if (!phoneWhatsapp.trim() || phoneWhatsapp.trim().length < 8) {
      errors.push(
        language === 'ar'
          ? 'رقم الجوال / الواتساب الصحيح (حقل إجباري)'
          : 'Valid WhatsApp phone number'
      );
    }
    if (!email.trim() || !email.includes('@')) {
      errors.push(
        language === 'ar'
          ? 'البريد الإلكتروني المعتمد (حقل إجباري)'
          : 'Valid email address'
      );
    }
    if (!age || Number(age) < 14 || Number(age) > 90) {
      errors.push(
        language === 'ar'
          ? 'العمر بالسنوات (حقل إجباري بين 14 و 90 سنة)'
          : 'Valid age (between 14 and 90)'
      );
    }
    if (!bloodType) {
      errors.push(
        language === 'ar'
          ? 'فصيلة الدم (حقل إجباري)'
          : 'Blood type is required'
      );
    }
    if (healthStatus === 'has_issues' && !healthIssuesDetails.trim()) {
      errors.push(
        language === 'ar'
          ? 'توضيح تفاصيل الحالة الصحية والإصابات (حقل إجباري)'
          : 'Health condition / injury details disclosure'
      );
    }

    // 4 Legal clauses
    if (!agreedHealth) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند: الحالة الصحية والمسؤولية التدريبية عن بُعد'
          : 'Agreement to: Health Status & Remote Training Liability'
      );
    }
    if (!agreedNutrition) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند: النظام الغذائي والمكملات'
          : 'Agreement to: Nutrition & Supplements Policy'
      );
    }
    if (!agreedIP) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند: الملكية الفكرية وحظر التسريب وإعادة الإنتاج'
          : 'Agreement to: IP & Non-Leakage Terms'
      );
    }
    if (!agreedPaymentPolicy) {
      errors.push(
        language === 'ar'
          ? 'الموافقة على بند: سياسة الدفع، الاسترجاع، والنتائج'
          : 'Agreement to: Payment, Refund & Results Policy'
      );
    }

    // Strict Name Matching Validation
    if (!cleanSignature) {
      errors.push(
        language === 'ar'
          ? 'كتابة الاسم الثلاثي في خانة التوقيع الإلكتروني والاعتماد الرسمي'
          : 'Typed signature name is required'
      );
    } else if (cleanFullName && cleanSignature.toLowerCase() !== cleanFullName.toLowerCase()) {
      errors.push(
        language === 'ar'
          ? `اسم التوقيع الإلكتروني غير متطابق! يجب أن يطابق تماماً الاسم الثلاثي المدخل أعلاه (${cleanFullName})`
          : `Signature name does not match! It must match the entered full name exactly (${cleanFullName})`
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

      const imgWidth = 210;
      const pageHeight = 297;
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

  // Handle "موافق وأقر"
  const handleAgreeAndDeclare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const { isValid, errors } = validateForm();

    if (!isValid) {
      setErrorMessage(
        language === 'ar'
          ? 'عذراً، يجب عليك قراءة الإقرار وتعبئته والموافقة على جميع البنود وتطابق الاسم للتوقيع بنجاح.'
          : 'Please review and accept all clauses, and ensure the signature name matches your full name.'
      );
      setMissingFields(errors);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setErrorMessage(null);
    setMissingFields([]);

    const installmentAmount =
      paymentInstallments === '3_installments'
        ? Math.round(currentDurationInfo.price / 3)
        : paymentInstallments === '2_installments'
        ? Math.round(currentDurationInfo.price / 2)
        : currentDurationInfo.price;

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
      paymentInstallments,
      installmentAmount,
      visualGoal,
      fullName: cleanFullName,
      phoneWhatsapp: phoneWhatsapp.trim(),
      email: email.trim(),
      age: Number(age) || undefined,
      bloodType,
      inBodyFileUrl: inBodyFileUrl || undefined,
      inBodyFileName: inBodyFileName || undefined,
      inBodyFileSize: inBodyFileSize || undefined,
      hasHealthIssues: healthStatus === 'has_issues',
      healthIssuesDetails: healthStatus === 'has_issues' ? healthIssuesDetails.trim() : undefined,
      agreedHealthAndRemoteTraining: agreedHealth,
      agreedDietAndSupplements: agreedNutrition,
      agreedIntellectualProperty: agreedIP,
      agreedPaymentAndRefundPolicy: agreedPaymentPolicy,
      digitalSignature: cleanSignature,
      signedTimestamp: signedDate,
      status: 'completed_and_active',
      completedTimestamp: new Date().toISOString(),
    };

    setCompletedAgreement(agreementRecord);

    // Save directly to database (Supabase public.declarations + local storage)
    try {
      await saveDeclarationToSupabase(agreementRecord);
    } catch (e) {
      console.warn('Declaration storage error:', e);
    }

    // Auto-provision athlete credentials & update athlete profile
    const cleanEmail = email.trim().toLowerCase();
    try {
      const generatedCode = `OAO-${resolvedPlanTier === 'VIP' ? 'VIP' : 'STD'}-${Math.floor(100 + Math.random() * 900)}`;
      const generatedPass = `OAO-${resolvedPlanTier === 'VIP' ? 'VIP' : 'STD'}-${Math.floor(1000 + Math.random() * 9000)}`;
      const assignRes = await assignSubscriberPassword({
        email: cleanEmail,
        password: generatedPass,
        clientName: cleanFullName,
        clientCode: generatedCode,
        plan: resolvedPlanTier,
        phone: phoneWhatsapp.trim(),
        age: Number(age) || undefined,
        bloodType,
        visualGoal,
        inBodyFileName: inBodyFileName || undefined,
        inBodyFileUrl: inBodyFileUrl || undefined,
        status: 'active',
      });

      const canonicalId = assignRes.record?.id || cleanEmail;
      const updatedProfile = {
        ...INITIAL_CLIENT_PROFILE,
        id: canonicalId,
        name: cleanFullName,
        nameEn: cleanFullName,
        email: cleanEmail,
        phone: phoneWhatsapp.trim(),
        clientCode: assignRes.record?.clientCode || generatedCode,
        age: Number(age) || undefined,
        bloodType,
        visualGoal,
        inBodyFileName: inBodyFileName || undefined,
        inBodyFileUrl: inBodyFileUrl || undefined,
        subscription_plan: resolvedPlanTier,
        subscriptionStatus: 'active' as const,
        subscriptionDaysLeft: currentDurationInfo.days,
      };
      setCurrentUserSession({
        id: canonicalId,
        email: cleanEmail,
        name: cleanFullName,
        plan: resolvedPlanTier,
        role: 'client',
        clientCode: assignRes.record?.clientCode || generatedCode,
        phone: phoneWhatsapp.trim(),
      });
      window.dispatchEvent(new CustomEvent('oao_profile_updated', { detail: updatedProfile }));
      await syncProfileToSupabase(updatedProfile);
    } catch (authErr) {
      console.warn('Auto-provisioning subscriber credentials notice:', authErr);
    }

    // Trigger automatic PDF generation and download!
    await generateAndDownloadPDF();

    // Transition to Step 3 (Direct database storage confirmed, no WhatsApp redirect)
    setCurrentStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      className={`min-h-screen transition-colors duration-300 font-['Alexandria',sans-serif] ${
        theme === 'dark'
          ? 'bg-[#030712] text-white selection:bg-orange-500 selection:text-white'
          : 'bg-[#F8FAFC] text-[#0F172A] selection:bg-orange-500 selection:text-white'
      }`}
    >
      {/* Background Ambience */}
      <div
        className={`fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] rounded-full blur-[200px] pointer-events-none transition-opacity ${
          theme === 'dark' ? 'bg-orange-600/15 opacity-100' : 'bg-orange-500/10 opacity-60'
        }`}
      />

      {/* TOP HEADER */}
      <header
        className={`sticky top-0 z-40 backdrop-blur-xl border-b transition-colors px-4 sm:px-8 py-3.5 flex items-center justify-between ${
          theme === 'dark'
            ? 'bg-[#070e24]/95 border-orange-500/20 shadow-[0_4px_30px_rgba(0,0,0,0.5)]'
            : 'bg-white/95 border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.04)]'
        }`}
      >
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
        >
          <BrandLogo size="sm" showText={false} />
          <div className="flex flex-col text-start">
            <span
              className={`text-sm font-black tracking-wider flex items-center gap-1 ${
                theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
              }`}
            >
              <span>OWN</span>
              <span className="text-[#EA580C]">AURA</span>
              <span>OUTCOME</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest">
              OFFICIAL REGISTRATION
            </span>
          </div>
        </button>

        <div className="flex items-center gap-2.5">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Language"
          >
            <Globe className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-mono text-[11px]">{language === 'ar' ? 'EN' : 'عربي'}</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
            title="Theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700" />
            )}
          </button>

          {/* Home Button */}
          <button
            onClick={() => navigate('/')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              theme === 'dark'
                ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
            }`}
          >
            <Home className="w-3.5 h-3.5 text-orange-500" />
            <span className="hidden sm:inline">{language === 'ar' ? 'الرئيسية' : 'Home'}</span>
          </button>
        </div>
      </header>

      {/* STEP PROGRESS TRACKER */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div
          className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between text-xs transition-colors shadow-sm ${
            theme === 'dark'
              ? 'bg-[#070e24]/90 border-white/10'
              : 'bg-white border-slate-200'
          }`}
        >
          {/* Step 1 Tab */}
          <div
            className={`flex items-center gap-2 cursor-pointer transition-colors ${
              currentStep >= 1 ? 'text-orange-500 font-black' : 'text-slate-400 font-bold'
            }`}
            onClick={() => currentStep > 1 && setCurrentStep(1)}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-md ${
                currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gradient-to-r from-orange-600 to-amber-500 text-white'
              }`}
            >
              {currentStep > 1 ? <Check className="w-4 h-4 stroke-[3]" /> : '1'}
            </span>
            <span className="text-xs sm:text-sm">
              {language === 'ar' ? '1. اختيار الباقة' : '1. Select Plan'}
            </span>
          </div>

          <div
            className={`h-0.5 flex-1 max-w-[60px] sm:max-w-[100px] mx-2 ${
              currentStep >= 2 ? 'bg-orange-500' : theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'
            }`}
          />

          {/* Step 2 Tab */}
          <div
            className={`flex items-center gap-2 transition-colors ${
              currentStep >= 2 ? 'text-orange-500 font-black' : 'text-slate-400 font-bold'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-md ${
                currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : currentStep === 2
                  ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white'
                  : theme === 'dark'
                  ? 'bg-white/10 text-slate-400'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              {currentStep > 2 ? <Check className="w-4 h-4 stroke-[3]" /> : '2'}
            </span>
            <span className="text-xs sm:text-sm">
              {language === 'ar' ? '2. نموذج الإقرار والتعهد' : '2. Declaration & Terms'}
            </span>
          </div>

          <div
            className={`h-0.5 flex-1 max-w-[60px] sm:max-w-[100px] mx-2 ${
              currentStep === 3 ? 'bg-emerald-500' : theme === 'dark' ? 'bg-white/10' : 'bg-slate-200'
            }`}
          />

          {/* Step 3 Tab */}
          <div
            className={`flex items-center gap-2 transition-colors ${
              currentStep === 3 ? 'text-emerald-500 font-black' : 'text-slate-400 font-bold'
            }`}
          >
            <span
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shadow-md ${
                currentStep === 3
                  ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.6)]'
                  : theme === 'dark'
                  ? 'bg-white/10 text-slate-400'
                  : 'bg-slate-200 text-slate-500'
              }`}
            >
              3
            </span>
            <span className="text-xs sm:text-sm">
              {language === 'ar' ? '3. حفظ العقد و PDF' : '3. Contract & PDF'}
            </span>
          </div>
        </div>
      </div>

      {/* ERROR BANNER */}
      {errorMessage && (
        <div className="max-w-4xl mx-auto px-4 mt-4">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/90 via-red-900/80 to-red-950/90 border-2 border-red-500 text-white shadow-xl animate-in fade-in duration-300">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-black text-red-200">
                  {language === 'ar' ? 'تنبيه إلزامي ومطلوب' : 'Required Action Notice'}
                </h4>
                <p className="text-xs sm:text-sm font-bold text-white mt-0.5">{errorMessage}</p>
                {missingFields.length > 0 && (
                  <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-red-200 font-medium">
                    {missingFields.map((f, i) => (
                      <li key={i}>• {f}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* =========================================================================
            STEP 1: SELECT PLAN & DURATION
            ========================================================================= */}
        {currentStep === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header Description */}
            <div className="text-center space-y-2">
              <span className="text-xs font-black tracking-widest text-[#EA580C] uppercase block">
                {language === 'ar' ? 'المرحلة الأولى: اختر برنامجك' : 'Step 1: Choose Your Program'}
              </span>
              <h1
                className={`text-2xl sm:text-4xl font-black ${
                  theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                {language === 'ar'
                  ? 'بوابتك الرياضية لبناء الجسم المثالي 🚀'
                  : 'Your Athletic Gateway to Physical Mastery 🚀'}
              </h1>
              <p
                className={`text-xs sm:text-sm max-w-xl mx-auto leading-relaxed ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {language === 'ar'
                  ? 'اختر الباقة المناسبة لأهدافك الرياضية. بعد اختيار الباقة، ستنتقل لنموذج الإقرار وتوليد ملف PDF الرسمي.'
                  : 'Select your preferred subscription tier to proceed to the official declaration and PDF generation.'}
              </p>
            </div>

            {/* Plan Cards Grid (Standard vs VIP) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. VIP Platinum Plan (Highlighted Hero) */}
              <div
                onClick={() => setActivePlanId('platinum')}
                className={`relative rounded-3xl p-6 sm:p-7 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  activePlanId === 'platinum'
                    ? 'border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.25)] ring-2 ring-amber-400/30'
                    : theme === 'dark'
                    ? 'border-amber-500/30 bg-[#0B132B]/80 hover:border-amber-400/60'
                    : 'border-amber-400/40 bg-white hover:border-amber-400'
                } ${
                  theme === 'dark'
                    ? 'bg-gradient-to-b from-[#140F05] via-[#0E1528] to-[#040817]'
                    : 'bg-gradient-to-b from-amber-50/60 via-white to-amber-50/30'
                }`}
              >
                {/* Popular Badge */}
                <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[11px] shadow-lg flex items-center gap-1.5">
                  <Crown className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'الباقة الأكثر طلباً واكتمالاً 👑' : 'Most Popular VIP 👑'}</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mt-1 mb-3">
                    <VIPBadge variant="hero" language={language} />
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {DURATION_DATA.platinum[selectedDurationKey].labelAr}
                    </span>
                  </div>

                  <h3
                    className={`text-xl sm:text-2xl font-black mb-1 ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {language === 'ar' ? 'الباقة البلاتينية VIP' : 'Platinum VIP Elite'}
                  </h3>
                  <p
                    className={`text-xs mb-4 leading-relaxed ${
                      theme === 'dark' ? 'text-amber-200/80' : 'text-slate-600'
                    }`}
                  >
                    {language === 'ar'
                      ? 'متابعة أسبوعية دقيقة، محادثة واتساب مباشرة مع الكوتش عمر، وتحديث دوري للجداول.'
                      : 'Precise weekly follow-ups, direct WhatsApp chat with Coach Omar, and schedule updates.'}
                  </p>

                  {/* Pricing Display */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-amber-500/30 mb-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-amber-400 font-mono">
                        {DURATION_DATA.platinum[selectedDurationKey].price}
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        {language === 'ar' ? 'ريال سعودي' : 'SAR'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono ms-auto">
                        ~{Math.round(DURATION_DATA.platinum[selectedDurationKey].price / (DURATION_DATA.platinum[selectedDurationKey].days / 30))} {language === 'ar' ? 'ريال/شهر' : 'SAR/mo'}
                      </span>
                    </div>
                  </div>

                  {/* Duration Selector for VIP */}
                  <div className="space-y-1.5 mb-5">
                    <span className="text-[11px] font-bold text-amber-300/80 block">
                      {language === 'ar' ? 'اختر مدة الاشتراك:' : 'Select Duration:'}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['3_months', '6_months', '12_months'] as SubscriptionDurationKey[]).map((dk) => {
                        const d = DURATION_DATA.platinum[dk];
                        const isSel = selectedDurationKey === dk;
                        return (
                          <button
                            key={dk}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePlanId('platinum');
                              setSelectedDurationKey(dk);
                            }}
                            className={`py-2 px-1 rounded-xl text-center text-xs font-black transition-all cursor-pointer ${
                              isSel
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-black shadow-md border border-amber-300'
                                : 'bg-black/50 text-slate-300 border border-white/10 hover:border-amber-400/40'
                            }`}
                          >
                            <span className="block text-[10px]">{language === 'ar' ? d.labelAr : d.labelEn}</span>
                            <span className="block font-mono text-xs">{d.price} ر.س</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2 text-xs font-medium">
                    {[
                      language === 'ar' ? 'تواصل مباشر عبر الواتساب مع الكوتش عمر' : 'Direct WhatsApp chat with Coach Omar',
                      language === 'ar' ? 'متابعة أسبوعية دقيقة وتعديل الجداول' : 'Weekly check-in & schedule adjustments',
                      language === 'ar' ? 'النظام الغذائي الشامل (27 صنفاً)' : 'Complete Athlete Nutrition Plan (27 Items)',
                      language === 'ar' ? 'تجميد الاشتراك عند السفر أو الانشغال' : 'Pause subscription feature during travels',
                      language === 'ar' ? 'كرت الإنجاز ومشاركة السلسلة والأوسمة' : 'Shareable progress card, streaks & badges',
                    ].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-amber-100">
                        <Check className="w-4 h-4 text-amber-400 shrink-0 stroke-[3]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-amber-500/20">
                  <div className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-black font-black text-xs sm:text-sm text-center uppercase tracking-wider shadow-lg">
                    {activePlanId === 'platinum'
                      ? language === 'ar'
                        ? 'الباقة المحددة حالياً ✓'
                        : 'Selected VIP Plan ✓'
                      : language === 'ar'
                      ? 'اختيار الباقة البلاتينية'
                      : 'Choose Platinum Plan'}
                  </div>
                </div>
              </div>

              {/* 2. Standard Athlete Plan */}
              <div
                onClick={() => setActivePlanId('standard')}
                className={`relative rounded-3xl p-6 sm:p-7 border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  activePlanId === 'standard'
                    ? 'border-orange-500 shadow-[0_0_35px_rgba(234,88,12,0.25)] ring-2 ring-orange-500/30'
                    : theme === 'dark'
                    ? 'border-white/10 bg-[#0B132B]/80 hover:border-orange-500/50'
                    : 'border-slate-200 bg-white hover:border-orange-400'
                } ${
                  theme === 'dark'
                    ? 'bg-gradient-to-b from-[#0B132B] to-[#040817]'
                    : 'bg-gradient-to-b from-slate-50 via-white to-slate-50'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-300" />
                      <span>{language === 'ar' ? 'الأساس المتين للالتزام' : 'Core Discipline'}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-orange-400">
                      {DURATION_DATA.standard[selectedDurationKey].labelAr}
                    </span>
                  </div>

                  <h3
                    className={`text-xl sm:text-2xl font-black mb-1 ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {language === 'ar' ? 'الباقة القياسية (Standard)' : 'Standard Plan'}
                  </h3>
                  <p
                    className={`text-xs mb-4 leading-relaxed ${
                      theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {language === 'ar'
                      ? 'التقييم الشامل، جدول التمارين الشهري، والنظام الغذائي مع المتابعة الشهرية.'
                      : 'Comprehensive biometrics, monthly workout protocol, nutrition, and monthly check-in.'}
                  </p>

                  {/* Pricing Display */}
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 mb-5">
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-white font-mono">
                        {DURATION_DATA.standard[selectedDurationKey].price}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        {language === 'ar' ? 'ريال سعودي' : 'SAR'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono ms-auto">
                        ~{Math.round(DURATION_DATA.standard[selectedDurationKey].price / (DURATION_DATA.standard[selectedDurationKey].days / 30))} {language === 'ar' ? 'ريال/شهر' : 'SAR/mo'}
                      </span>
                    </div>
                  </div>

                  {/* Duration Selector for Standard */}
                  <div className="space-y-1.5 mb-5">
                    <span className="text-[11px] font-bold text-slate-400 block">
                      {language === 'ar' ? 'اختر مدة الاشتراك:' : 'Select Duration:'}
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {(['3_months', '6_months', '12_months'] as SubscriptionDurationKey[]).map((dk) => {
                        const d = DURATION_DATA.standard[dk];
                        const isSel = selectedDurationKey === dk;
                        return (
                          <button
                            key={dk}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActivePlanId('standard');
                              setSelectedDurationKey(dk);
                            }}
                            className={`py-2 px-1 rounded-xl text-center text-xs font-black transition-all cursor-pointer ${
                              isSel
                                ? 'bg-orange-500 text-white shadow-md border border-orange-400'
                                : 'bg-black/50 text-slate-300 border border-white/10 hover:border-orange-500/40'
                            }`}
                          >
                            <span className="block text-[10px]">{language === 'ar' ? d.labelAr : d.labelEn}</span>
                            <span className="block font-mono text-xs">{d.price} ر.س</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Features list */}
                  <ul className="space-y-2 text-xs font-medium">
                    {[
                      language === 'ar' ? 'الجدول التدريبي الأسبوعي المتكامل' : 'Weekly structured workout schedule',
                      language === 'ar' ? 'النظام الغذائي الشامل (27 صنفاً)' : 'Complete Athlete Nutrition Plan (27 Items)',
                      language === 'ar' ? 'حساب السعرات ومؤشر BMI والماء' : 'BMI gauge, calories & water tracking',
                      language === 'ar' ? 'المتابعة الدورية الشهرية مع الكوتش' : 'Monthly progress check-in with coach',
                      language === 'ar' ? 'دخول دائم للبوابة برمز سري' : 'Dedicated access code to athlete portal',
                    ].map((feat, i) => (
                      <li key={i} className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10">
                  <div
                    className={`w-full py-3 rounded-2xl font-black text-xs sm:text-sm text-center uppercase tracking-wider transition-all ${
                      activePlanId === 'standard'
                        ? 'bg-orange-500 text-white shadow-lg'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {activePlanId === 'standard'
                      ? language === 'ar'
                        ? 'الباقة المحددة حالياً ✓'
                        : 'Selected Standard Plan ✓'
                      : language === 'ar'
                      ? 'اختيار الباقة القياسية'
                      : 'Choose Standard Plan'}
                  </div>
                </div>
              </div>
            </div>

            {/* Step 1 Action Button */}
            <div
              className={`p-5 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                theme === 'dark' ? 'bg-[#070e24]/90 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
                  <Sparkles className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-bold">
                    {language === 'ar' ? 'الباقة المحددة:' : 'Selected Plan:'}
                  </span>
                  <span
                    className={`text-sm sm:text-base font-black ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {language === 'ar' ? currentPlanNameAr : currentPlanNameEn} (
                    <strong className="text-orange-400">
                      {language === 'ar' ? currentDurationInfo.labelAr : currentDurationInfo.labelEn}
                    </strong>{' '}
                    -{' '}
                    <strong className="text-amber-400 font-mono">
                      {currentDurationInfo.price} {language === 'ar' ? 'ريال' : 'SAR'}
                    </strong>
                    )
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentStep(2);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2.5 shadow-[0_0_25px_rgba(234,88,12,0.6)] cursor-pointer transition-transform hover:scale-105 active:scale-95"
              >
                <span>{language === 'ar' ? 'متابعة إلى نموذج الإقرار والتعهد (PDF)' : 'Continue to Declaration Form'}</span>
                <ArrowRight className="w-4 h-4 rtl:rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STEP 2: DECLARATION FORM & DIGITAL SIGNATURE (Exact Images 1, 2, 3)
            ========================================================================= */}
        {currentStep === 2 && (
          <form onSubmit={handleAgreeAndDeclare} className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="text-center space-y-2">
              <span className="text-xs font-black tracking-widest text-[#EA580C] uppercase block">
                {language === 'ar' ? 'المرحلة الثانية: الإقرار والتعهد الرسمي' : 'Step 2: Official Declaration'}
              </span>
              <h1
                className={`text-2xl sm:text-3xl font-black ${
                  theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                {language === 'ar' ? 'إقرار وتعهد المشترك وإخلاء المسؤولية 📄' : 'Athlete Declaration & Liability Waiver 📄'}
              </h1>
              <p
                className={`text-xs sm:text-sm max-w-xl mx-auto leading-relaxed ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {language === 'ar'
                  ? 'يرجى تعبئة بياناتك الشخصية والصحية بدقة، وقراءة البنود القانونية وتفعيل الموافقة على كل بند، ثم كتابة اسمك الثلاثي للتوقيع.'
                  : 'Please complete your personal and health information, review and accept each legal clause, and sign.'}
              </p>
            </div>

            {/* PART 1: PERSONAL & HEALTH INFORMATION */}
            <div
              className={`rounded-3xl p-6 sm:p-7 border space-y-5 transition-colors ${
                theme === 'dark'
                  ? 'bg-[#0B132B]/85 border-white/10 shadow-xl'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                <div className="w-9 h-9 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-black">
                  <User className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3
                    className={`text-base sm:text-lg font-black ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    {language === 'ar' ? 'الجزء الأول: البيانات الشخصية والصحية' : 'Part 1: Personal & Health Info'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {language === 'ar' ? 'تُستخدم لإنشاء سجلك الرياضي المعتمد' : 'Used for your official training record'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Full Triple Name */}
                <div>
                  <label
                    className={`block text-xs font-black mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span>{language === 'ar' ? 'الاسم الثلاثي بالكامل:' : 'Full Name (Triple):'}</span>
                    <span className="text-red-400 ms-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={language === 'ar' ? 'مثال: محمد عبدالله الشمري' : 'e.g. John David Smith'}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/15 focus:border-orange-500 text-white placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-300 focus:border-orange-500 text-[#0F172A] placeholder:text-slate-400'
                    }`}
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {language === 'ar' ? 'يجب أن يطابق تماماً الاسم الذي ستوقعه في الأسفل' : 'Must match the signature name below'}
                  </span>
                </div>

                {/* WhatsApp Phone */}
                <div>
                  <label
                    className={`block text-xs font-black mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span>{language === 'ar' ? 'رقم الجوال / الواتساب:' : 'WhatsApp Phone Number:'}</span>
                    <span className="text-red-400 ms-1">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phoneWhatsapp}
                    onChange={(e) => setPhoneWhatsapp(e.target.value)}
                    placeholder="05XXXXXXXX / +966..."
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono font-bold outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/15 focus:border-orange-500 text-white placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-300 focus:border-orange-500 text-[#0F172A] placeholder:text-slate-400'
                    }`}
                  />
                </div>

                {/* Email */}
                <div>
                  <label
                    className={`block text-xs font-black mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span>{language === 'ar' ? 'البريد الإلكتروني المعتمد:' : 'Email Address:'}</span>
                    <span className="text-red-400 ms-1">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-bold outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/15 focus:border-orange-500 text-white placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-300 focus:border-orange-500 text-[#0F172A] placeholder:text-slate-400'
                    }`}
                  />
                </div>
              </div>

              {/* SECOND ROW: AGE, BLOOD TYPE & VISUAL GOAL */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* Age Input */}
                <div>
                  <label
                    className={`block text-xs font-black mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span>{language === 'ar' ? 'العمر (Age):' : 'Age:'}</span>
                    <span className="text-red-400 ms-1">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={14}
                    max={90}
                    value={age}
                    onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="24"
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-mono font-bold outline-none transition-all ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/15 focus:border-orange-500 text-white placeholder:text-slate-600'
                        : 'bg-slate-50 border-slate-300 focus:border-orange-500 text-[#0F172A] placeholder:text-slate-400'
                    }`}
                  />
                </div>

                {/* Blood Type Dropdown */}
                <div>
                  <label
                    className={`block text-xs font-black mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span>{language === 'ar' ? 'فصيلة الدم (Blood Type):' : 'Blood Type:'}</span>
                    <span className="text-red-400 ms-1">*</span>
                  </label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-sm font-black outline-none transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/15 focus:border-orange-500 text-white'
                        : 'bg-slate-50 border-slate-300 focus:border-orange-500 text-[#0F172A]'
                    }`}
                  >
                    {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bt) => (
                      <option key={bt} value={bt} className="bg-[#0B132B] text-white">
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Visual Goal Dropdown (Exact 4 options) */}
                <div>
                  <label
                    className={`block text-xs font-black mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span>{language === 'ar' ? 'الهدف التصوري (Visual Goal):' : 'Visual Goal:'}</span>
                    <span className="text-red-400 ms-1">*</span>
                  </label>
                  <select
                    value={visualGoal}
                    onChange={(e) => setVisualGoal(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm font-black outline-none transition-all cursor-pointer ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/15 focus:border-orange-500 text-orange-400'
                        : 'bg-slate-50 border-slate-300 focus:border-orange-500 text-orange-600'
                    }`}
                  >
                    <option value="تضخيم وبناء عضلي (Bulking)" className="bg-[#0B132B] text-white">
                      تضخيم وبناء عضلي (Bulking)
                    </option>
                    <option value="تنشيف وحرق دهون (Cut)" className="bg-[#0B132B] text-white">
                      تنشيف وحرق دهون (Cut)
                    </option>
                    <option value="ثبات وإعادة تشكيل (Maintenance)" className="bg-[#0B132B] text-white">
                      ثبات وإعادة تشكيل (Maintenance)
                    </option>
                    <option value="كيتو لو كارب (Keto)" className="bg-[#0B132B] text-white">
                      كيتو لو كارب (Keto)
                    </option>
                  </select>
                </div>
              </div>

              {/* THIRD ROW: PAYMENT INSTALLMENTS SELECTOR & INBODY ATTACHMENT */}
              <div className="pt-3 border-t border-white/10 space-y-4">
                {/* Payment Installments Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className={`text-xs font-black flex items-center gap-1.5 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5 text-orange-400" />
                      <span>{language === 'ar' ? 'خطة سداد الرسوم والأقساط:' : 'Payment Plan / Installments:'}</span>
                    </label>

                    {!isInstallmentsAllowed && (
                      <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/30">
                        {language === 'ar'
                          ? 'الأقساط متاحة لاشتراك السنة في الباقة القياسية، ولجميع المدد في VIP'
                          : 'Installments available for 1-Year Standard & all VIP'}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* Option 1: Full Payment */}
                    <button
                      type="button"
                      onClick={() => setPaymentInstallments('full')}
                      className={`p-3 rounded-2xl border text-start transition-all cursor-pointer ${
                        paymentInstallments === 'full'
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-md'
                          : theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black">
                          {language === 'ar' ? 'دفعة كاملة (Full)' : 'Full Payment'}
                        </span>
                        <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold">
                          {paymentInstallments === 'full' ? '✓' : ''}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-black text-amber-400 block">
                        {currentDurationInfo.price} ريال
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'ar' ? 'سداد المبلغ كاملاً لمرة واحدة' : 'One-time full payment'}
                      </span>
                    </button>

                    {/* Option 2: 2 Installments */}
                    <button
                      type="button"
                      disabled={!isInstallmentsAllowed}
                      onClick={() => isInstallmentsAllowed && setPaymentInstallments('2_installments')}
                      className={`p-3 rounded-2xl border text-start transition-all ${
                        !isInstallmentsAllowed
                          ? 'opacity-40 cursor-not-allowed border-white/5 bg-black/20'
                          : paymentInstallments === '2_installments'
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-md cursor-pointer'
                          : theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 cursor-pointer'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black">
                          {language === 'ar' ? 'دفعتين (2 Installments)' : '2 Installments'}
                        </span>
                        <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold">
                          {paymentInstallments === '2_installments' ? '✓' : ''}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-black text-amber-400 block">
                        {Math.round(currentDurationInfo.price / 2)} ريال / دفعة
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'ar' ? 'مقسمة على دفعتين متساويتين' : 'Split into 2 equal payments'}
                      </span>
                    </button>

                    {/* Option 3: 3 Installments */}
                    <button
                      type="button"
                      disabled={!isInstallmentsAllowed}
                      onClick={() => isInstallmentsAllowed && setPaymentInstallments('3_installments')}
                      className={`p-3 rounded-2xl border text-start transition-all ${
                        !isInstallmentsAllowed
                          ? 'opacity-40 cursor-not-allowed border-white/5 bg-black/20'
                          : paymentInstallments === '3_installments'
                          ? 'bg-orange-500/15 border-orange-500 text-white shadow-md cursor-pointer'
                          : theme === 'dark'
                          ? 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20 cursor-pointer'
                          : 'bg-slate-50 border-slate-300 text-slate-700 hover:border-slate-400 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-black">
                          {language === 'ar' ? 'ثلاث دفعات (3 Installments)' : '3 Installments'}
                        </span>
                        <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold">
                          {paymentInstallments === '3_installments' ? '✓' : ''}
                        </span>
                      </div>
                      <span className="text-sm font-mono font-black text-amber-400 block">
                        {Math.round(currentDurationInfo.price / 3)} ريال / دفعة
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {language === 'ar' ? 'مقسمة على 3 دفعات ميسرة' : 'Split into 3 equal payments'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* InBody File Upload (.pdf, image/*) */}
                <div>
                  <label
                    className={`block text-xs font-black mb-1.5 ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-orange-400" />
                      <span>
                        {language === 'ar'
                          ? 'إرفاق فحص InBody أو تحليل مكونات الجسم (اختياري / موصى به):'
                          : 'Attach InBody Scan or Body Composition (.pdf or image):'}
                      </span>
                    </span>
                  </label>

                  <input
                    ref={inBodyInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 8 * 1024 * 1024) {
                        setErrorMessage(
                          language === 'ar'
                            ? 'حجم الملف يجب ألا يتجاوز 8 ميغابايت'
                            : 'File size must be under 8MB'
                        );
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        if (typeof reader.result === 'string') {
                          setInBodyFileUrl(reader.result);
                          setInBodyFileName(file.name);
                          setInBodyFileSize((file.size / 1024).toFixed(1) + ' KB');
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                    className="hidden"
                    id="inbody-upload-file"
                  />

                  {inBodyFileName ? (
                    <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-emerald-300">{inBodyFileName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({inBodyFileSize})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setInBodyFileUrl('');
                          setInBodyFileName('');
                          setInBodyFileSize('');
                          if (inBodyInputRef.current) inBodyInputRef.current.value = '';
                        }}
                        className="text-red-400 hover:text-red-300 p-1 rounded-lg bg-white/5 cursor-pointer"
                        title="إلغاء المرفق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="inbody-upload-file"
                      className={`p-3.5 rounded-2xl border-2 border-dashed flex items-center justify-center gap-2 cursor-pointer transition-all ${
                        theme === 'dark'
                          ? 'border-white/15 bg-black/30 hover:border-orange-500/50 text-slate-300'
                          : 'border-slate-300 bg-slate-50 hover:border-orange-500 text-slate-700'
                      }`}
                    >
                      <Upload className="w-4 h-4 text-orange-400" />
                      <span className="text-xs font-bold">
                        {language === 'ar'
                          ? 'اضغط هنا لرفع ملف فحص InBody بصيغة PDF أو صورة'
                          : 'Click to upload InBody scan (PDF or Image)'}
                      </span>
                    </label>
                  )}
                </div>
              </div>

              {/* Health Status Disclosure */}
              <div className="pt-3 border-t border-white/10 space-y-3">
                <label
                  className={`block text-xs font-black ${
                    theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                  }`}
                >
                  {language === 'ar' ? 'الحالة الصحية العامة والإفصاح عن الإصابات:' : 'Health Status & Injuries Disclosure:'}
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      healthStatus === 'healthy'
                        ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-black'
                        : theme === 'dark'
                        ? 'bg-black/40 border-white/10 text-slate-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="healthStatus"
                      checked={healthStatus === 'healthy'}
                      onChange={() => setHealthStatus('healthy')}
                      className="w-4 h-4 text-emerald-500 focus:ring-0"
                    />
                    <span className="text-xs">
                      {language === 'ar' ? 'أنا سليم ومعافى ولائق 100% لممارسة المجهود البدني' : 'Healthy & 100% fit for physical training'}
                    </span>
                  </label>

                  <label
                    className={`p-3.5 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                      healthStatus === 'has_issues'
                        ? 'bg-orange-500/10 border-orange-500/50 text-orange-400 font-black'
                        : theme === 'dark'
                        ? 'bg-black/40 border-white/10 text-slate-400'
                        : 'bg-slate-50 border-slate-300 text-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="healthStatus"
                      checked={healthStatus === 'has_issues'}
                      onChange={() => setHealthStatus('has_issues')}
                      className="w-4 h-4 text-orange-500 focus:ring-0"
                    />
                    <span className="text-xs">
                      {language === 'ar' ? 'أعاني من إصابات سابقة أو مشاكل صحية وأرغب بالإفصاح عنها' : 'I have past injuries or conditions to disclose'}
                    </span>
                  </label>
                </div>

                {healthStatus === 'has_issues' && (
                  <div className="pt-2 animate-in fade-in duration-200">
                    <textarea
                      required
                      rows={3}
                      value={healthIssuesDetails}
                      onChange={(e) => setHealthIssuesDetails(e.target.value)}
                      placeholder={language === 'ar' ? 'اكتب هنا تفاصيل الإصابات (مثل: آلام أسفل الظهر، الركبة، حساسية اللاكتوز، الربو)...' : 'Describe your injuries or conditions in detail...'}
                      className={`w-full p-3.5 rounded-2xl border text-xs outline-none transition-all ${
                        theme === 'dark'
                          ? 'bg-black/60 border-orange-500/50 text-white placeholder:text-slate-600'
                          : 'bg-slate-50 border-orange-500/50 text-[#0F172A] placeholder:text-slate-400'
                      }`}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* =========================================================================
                PART 2: MANDATORY CLAUSES & WAIVER (EXACT 1:1 REPLICATION OF IMAGES 1 & 2)
                ========================================================================= */}
            <div
              className={`rounded-3xl p-6 sm:p-7 border space-y-6 transition-colors ${
                theme === 'dark'
                  ? 'bg-[#0B132B]/85 border-white/10 shadow-xl'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Header Box Matching Screenshot 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0">
                    <Scale className="w-5 h-5 text-orange-400" />
                  </div>
                  <div>
                    <h3
                      className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                        theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                      }`}
                    >
                      <span>
                        {language === 'ar'
                          ? 'الجزء الثاني: بنود الإقرار وإخلاء المسؤولية ⚖️'
                          : 'Part 2: Declaration & Liability Waiver Clauses ⚖️'}
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 font-medium mt-0.5">
                      {language === 'ar'
                        ? 'طريقة الإعداد: قم بقراءة كل بند وتفعيل خيار (أوافق وأتعهد بذلك) بشكل منفصل وإلزامي'
                        : 'Instruction: Read each clause and activate the required agreement checkbox individually'}
                    </p>
                  </div>
                </div>

                <span className="self-start sm:self-center text-xs font-black text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/30 shrink-0">
                  {language === 'ar' ? '4 بنود قانونية' : '4 Legal Clauses'}
                </span>
              </div>

              {/* CLAUSE 1: HEALTH & REMOTE COACHING (IMAGE 1) */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  agreedHealth
                    ? 'bg-orange-500/5 border-orange-500/50 shadow-sm'
                    : theme === 'dark'
                    ? 'bg-black/35 border-white/10'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                      1
                    </span>
                    <span>
                      {language === 'ar'
                        ? 'الحالة الصحية والمسؤولية التدريبية عن بُعد'
                        : 'Health Status & Remote Training Liability'}
                    </span>
                  </span>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                    {language === 'ar' ? '[خيار إجباري]' : '[Mandatory]'}
                  </span>
                </div>

                <div
                  className={`text-xs space-y-2 my-3 p-3.5 rounded-xl border leading-relaxed font-medium ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/5 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <p>
                    • {language === 'ar'
                      ? 'أقر بأنني سليم صحياً ولائق لممارسة المجهود البدني، وأتحمل مسؤولية الإفصاح عن كافة المشاكل الصحية قبل البدء.'
                      : 'I certify that I am medically healthy and fit to exert physical effort, and assume full responsibility to disclose all conditions prior to starting.'}
                  </p>
                  <p>
                    • {language === 'ar'
                      ? 'أقر بأن المقاطع المرئية (الفيديوهات) المرفقة بالبرنامج هي للتوضيح والاسترشاد فقط، وأنني المسؤول الأول عن تطبيق التمارين بالشكل الصحيح واختيار الأوزان المناسبة، ولا يتحمل المدرب أي مسؤولية عن أي إصابة ناتجة عن الأداء الخاطئ أو الإهمال.'
                      : 'I acknowledge that program videos are guidance only, and I am solely responsible for correct execution and load selection. The coach bears no liability for injuries.'}
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={agreedHealth}
                    onChange={(e) => setAgreedHealth(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                      agreedHealth ? 'text-orange-500' : theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span>{language === 'ar' ? 'أوافق وأتعهد بذلك' : 'I agree and pledge'}</span>
                    <span className="text-orange-400">☑</span>
                  </span>
                </label>
              </div>

              {/* CLAUSE 2: NUTRITION & SUPPLEMENTS (IMAGE 1) */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  agreedNutrition
                    ? 'bg-orange-500/5 border-orange-500/50 shadow-sm'
                    : theme === 'dark'
                    ? 'bg-black/35 border-white/10'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                      2
                    </span>
                    <span>
                      {language === 'ar' ? 'النظام الغذائي والمكملات' : 'Nutrition & Supplements'}
                    </span>
                  </span>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                    {language === 'ar' ? '[خيار إجباري]' : '[Mandatory]'}
                  </span>
                </div>

                <div
                  className={`text-xs space-y-2 my-3 p-3.5 rounded-xl border leading-relaxed font-medium ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/5 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <p>
                    • {language === 'ar'
                      ? 'أقر بأن النظام الغذائي مصمم بناءً على البيانات التي زودت المدرب بها، وأتحمل كامل المسؤولية عن الإفصاح عن أي حساسية أو مشاكل هضمية.'
                      : 'I acknowledge that the meal plan is tailored based on my submitted data, and I bear full responsibility to disclose all allergies or digestive conditions.'}
                  </p>
                  <p>
                    • {language === 'ar'
                      ? 'أقر بأن استخدام أو شراء أي مكملات غذائية يكون بناءً على رغبتي الشخصية وعلى مسؤوليّتي الخاصة.'
                      : 'I agree that purchasing or taking any supplements is strictly voluntary and at my own personal discretion and responsibility.'}
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={agreedNutrition}
                    onChange={(e) => setAgreedNutrition(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                      agreedNutrition ? 'text-orange-500' : theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span>{language === 'ar' ? 'أوافق وأتعهد بذلك' : 'I agree and pledge'}</span>
                    <span className="text-orange-400">☑</span>
                  </span>
                </label>
              </div>

              {/* CLAUSE 3: INTELLECTUAL PROPERTY & ANTI-LEAKAGE (IMAGE 2) */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  agreedIP
                    ? 'bg-orange-500/5 border-orange-500/50 shadow-sm'
                    : theme === 'dark'
                    ? 'bg-black/35 border-white/10'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                      3
                    </span>
                    <span>
                      {language === 'ar'
                        ? 'الملكية الفكرية وحظر التسريب وإعادة الإنتاج'
                        : 'Intellectual Property & Non-Leakage Terms'}
                    </span>
                  </span>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                    {language === 'ar' ? '[خيار إجباري]' : '[Mandatory]'}
                  </span>
                </div>

                <div
                  className={`text-xs space-y-2 my-3 p-3.5 rounded-xl border leading-relaxed font-medium ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/5 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <p>
                    • {language === 'ar'
                      ? 'أقر بأن جميع الجداول، والأنظمة الغذائية، والملفات المرفقة هي حقوق ملكية فكرية خاصة بالمدرب فقط ومخصصة لاستخدامي الشخصي.'
                      : 'I acknowledge that all routines, diet plans, and attached files are the intellectual property of the coach, intended solely for my personal use.'}
                  </p>
                  <p>
                    • {language === 'ar'
                      ? 'أتعهد بعدم مشاركة، أو إعادة نشر، أو تسريب، أو بيع أي جزء من المحتوى أو الجداول لأي شخص آخر أو عبر أي منصة.'
                      : 'I pledge not to share, re-publish, leak, or sell any part of the materials or routines to any third party on any platform.'}
                  </p>
                  <p>
                    • {language === 'ar'
                      ? 'أعلم أنه في حال ثبوت تسريب أي محتوى، يحق للمدرب إلغاء اشتراكي فوراً دون استرجاع أي مبالغ، مع الاحتفاظ بحقه القانوني في المطالبة بالتعويض عن الأضرار.'
                      : 'I understand that in the event of any unauthorized leak, the coach reserves the right to terminate my enrollment without refund and seek legal damages.'}
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={agreedIP}
                    onChange={(e) => setAgreedIP(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                      agreedIP ? 'text-orange-500' : theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span>{language === 'ar' ? 'أوافق وأتعهد بذلك' : 'I agree and pledge'}</span>
                    <span className="text-orange-400">☑</span>
                  </span>
                </label>
              </div>

              {/* CLAUSE 4: PAYMENT, REFUND & RESULTS POLICY (IMAGE 2) */}
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  agreedPaymentPolicy
                    ? 'bg-orange-500/5 border-orange-500/50 shadow-sm'
                    : theme === 'dark'
                    ? 'bg-black/35 border-white/10'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs font-black">
                      4
                    </span>
                    <span>
                      {language === 'ar'
                        ? 'سياسة الدفع، الاسترجاع، والنتائج'
                        : 'Payment, Refund & Transformation Results Policy'}
                    </span>
                  </span>
                  <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md border border-red-500/20 font-bold shrink-0">
                    {language === 'ar' ? '[خيار إجباري]' : '[Mandatory]'}
                  </span>
                </div>

                <div
                  className={`text-xs space-y-2 my-3 p-3.5 rounded-xl border leading-relaxed font-medium ${
                    theme === 'dark'
                      ? 'bg-black/40 border-white/5 text-slate-300'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <p>
                    • {language === 'ar'
                      ? 'أقر بأن الرسوم المدفوعة غير قابلة للاسترجاع بعد استلام الخطة والبرنامج التدريبي.'
                      : 'I acknowledge that all subscription fees paid are non-refundable once the training program and meal plan have been issued.'}
                  </p>
                  <p>
                    • {language === 'ar'
                      ? 'أقر بأن النتائج تعتمد كلياً على مدى التزامي الشخصي بالتعليمات، والمدرب غير مسؤول عن عدم تحقيق النتائج في حال عدم الالتزام الكامل.'
                      : 'I understand that fitness results depend completely on my personal adherence and execution, and the coach bears no responsibility in cases of non-compliance.'}
                  </p>
                </div>

                <label className="flex items-center gap-3 cursor-pointer pt-1 select-none">
                  <input
                    type="checkbox"
                    checked={agreedPaymentPolicy}
                    onChange={(e) => setAgreedPaymentPolicy(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-2 border-orange-500 text-orange-600 focus:ring-0 cursor-pointer"
                  />
                  <span
                    className={`text-xs sm:text-sm font-black flex items-center gap-1.5 ${
                      agreedPaymentPolicy ? 'text-orange-500' : theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span>{language === 'ar' ? 'أوافق وأتعهد بذلك' : 'I agree and pledge'}</span>
                    <span className="text-orange-400">☑</span>
                  </span>
                </label>
              </div>
            </div>

            {/* =========================================================================
                PART 3: DIGITAL SIGNATURE & FINAL DECLARATION (EXACT 1:1 REPLICATION OF IMAGE 3)
                ========================================================================= */}
            <div
              className={`rounded-3xl p-6 sm:p-7 border space-y-6 transition-colors ${
                theme === 'dark'
                  ? 'bg-[#0B132B]/85 border-white/10 shadow-xl'
                  : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {/* Header Box Matching Screenshot 3 */}
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/20 border border-orange-500/40 text-orange-400 flex items-center justify-center shrink-0">
                  <PenTool className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3
                    className={`text-base sm:text-lg font-black flex items-center gap-2 ${
                      theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                    }`}
                  >
                    <span>
                      {language === 'ar'
                        ? 'الجزء الثالث: التوقيع والإقرار النهائي 🖊️'
                        : 'Part 3: Final Declaration & Digital Signature 🖊️'}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">
                    {language === 'ar'
                      ? 'اعتماد قانوني رسمي ملزم للطرفين'
                      : 'Legally binding official confirmation for both parties'}
                  </p>
                </div>
              </div>

              {/* Disclaimer Box Matching Screenshot 3 */}
              <div
                className={`p-4 rounded-2xl border text-xs sm:text-sm font-semibold leading-relaxed ${
                  theme === 'dark'
                    ? 'bg-gradient-to-r from-orange-500/10 via-black/40 to-blue-500/10 border-orange-500/30 text-slate-200'
                    : 'bg-orange-50/70 border-orange-300 text-slate-800'
                }`}
              >
                <p className="font-black text-orange-400 mb-1">
                  {language === 'ar'
                    ? 'الموافقة والتوقيع الإلكتروني [Required - إجباري]:'
                    : 'Confirmation & Electronic Signature [Required]:'}
                </p>
                <p>
                  {language === 'ar'
                    ? 'أقر أنا المذكور أعلاه بأن جميع البيانات المدخلة صحيحة، وبأني قرأت جميع الشروط والأحكام وأوافق عليها كاملاً. يرجى كتابة اسمك الثلاثي هنا للتأكيد (توقيع إلكتروني واعتماد رسمي).'
                    : 'I hereby declare that all information entered above is accurate, and I have read and agree to all terms and conditions in full. Please type your full name below as an official electronic signature.'}
                </p>
              </div>

              {/* Two Column Signature Area Matching Screenshot 3 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Right Column: Typed Full Name Signature */}
                <div className="space-y-2">
                  <label
                    className={`block text-xs font-black ${
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    }`}
                  >
                    <span>
                      {language === 'ar'
                        ? '• كتابة الاسم الثلاثي (التوقيع الإلكتروني المعتمد):'
                        : '• Typed Full Name (Official Signature):'}
                    </span>
                    <span className="text-red-400 ms-1">*</span>
                  </label>

                  <input
                    type="text"
                    required
                    value={typedSignatureName}
                    onChange={(e) => setTypedSignatureName(e.target.value)}
                    placeholder={
                      language === 'ar' ? 'اكتب اسمك الثلاثي للتوقيع...' : 'Type your full name to sign...'
                    }
                    className={`w-full px-4 py-3.5 rounded-2xl border text-sm font-black outline-none transition-all ${
                      isNameMatching
                        ? 'border-emerald-500 bg-emerald-500/5'
                        : cleanSignature.length > 0 && !isNameMatching
                        ? 'border-amber-500 bg-amber-500/5'
                        : theme === 'dark'
                        ? 'bg-black/40 border-orange-500/50 focus:border-orange-400 text-white placeholder:text-slate-600'
                        : 'bg-slate-50 border-orange-500/50 focus:border-orange-400 text-[#0F172A] placeholder:text-slate-400'
                    }`}
                  />

                  {/* Real-Time Name Match Feedback */}
                  {cleanSignature.length > 0 && (
                    <div className="animate-in fade-in duration-200">
                      {isNameMatching ? (
                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/30">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span>
                            {language === 'ar'
                              ? '✓ الاسم متطابق تماماً مع بيانات المشترك المدخلة أعلاه'
                              : '✓ Name matches entered personal data perfectly'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-bold bg-amber-500/10 p-2 rounded-xl border border-amber-500/30">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span>
                            {language === 'ar'
                              ? `⚠ يجب أن يطابق تماماً الاسم الثلاثي: "${cleanFullName || 'المدخل أعلاه'}"`
                              : `⚠ Must match full name: "${cleanFullName || 'entered above'}"`}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contract ID & Date Footer Box Matching Screenshot 3 */}
                  <div
                    className={`p-3 rounded-xl border text-[11px] flex flex-wrap items-center justify-between gap-2 ${
                      theme === 'dark'
                        ? 'bg-black/50 border-white/10 text-slate-400'
                        : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{language === 'ar' ? 'رقم توثيق العقد:' : 'Contract ID:'}</span>
                      <strong className="text-orange-400 font-mono">{contractId}</strong>
                    </div>
                    <span className="font-mono text-[10px]">{signedDate}</span>
                  </div>
                </div>

                {/* Left Column: Interactive Drawing Touch Canvas Matching Screenshot 3 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label
                      className={`text-xs font-black flex items-center gap-1.5 ${
                        theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                      }`}
                    >
                      <PenTool className="w-3.5 h-3.5 text-orange-400" />
                      <span>
                        {language === 'ar'
                          ? '✍️ رسم التوقيع الرقمي باللمس / الماوس (اختياري إضافي):'
                          : '✍️ Digital Touch / Mouse Signature (Optional):'}
                      </span>
                    </label>
                    {hasCanvasSignature && (
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{language === 'ar' ? 'مسح' : 'Clear'}</span>
                      </button>
                    )}
                  </div>

                  <div
                    className={`relative border-2 border-dashed rounded-2xl p-1 overflow-hidden transition-colors ${
                      theme === 'dark'
                        ? 'bg-black/60 border-orange-500/40'
                        : 'bg-slate-50 border-orange-400/50'
                    }`}
                  >
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={110}
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
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs font-bold gap-1.5">
                        <span>{language === 'ar' ? 'وقع هنا بيدك أو الماوس ✍️' : 'Draw your signature here ✍️'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* FORM ACTION BUTTONS */}
            <div
              className={`p-6 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors ${
                theme === 'dark' ? 'bg-[#070e24]/90 border-white/10' : 'bg-white border-slate-200'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(1);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`w-full sm:w-auto px-6 py-3.5 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                }`}
              >
                <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                <span>{language === 'ar' ? 'الرجوع لتعديل الباقة' : 'Back to Plan Selection'}</span>
              </button>

              <button
                type="submit"
                disabled={isGeneratingPdf}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-3 shadow-[0_0_35px_rgba(234,88,12,0.7)] border-2 border-orange-300/60 cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-60"
              >
                {isGeneratingPdf ? (
                  <>
                    <Flame className="w-5 h-5 text-white animate-spin" />
                    <span>{language === 'ar' ? 'جاري توليد ملف PDF...' : 'Generating PDF...'}</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-5 h-5" />
                    <span>
                      {language === 'ar'
                        ? 'موافق وأقر واعتماد الاشتراك (توليد وتنزيل PDF) 🚀'
                        : 'Agree & Submit Declaration (Download PDF) 🚀'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* =========================================================================
            STEP 3: COMPLETED - DIRECT DATABASE REGISTRATION & DOWNLOAD
            ========================================================================= */}
        {currentStep === 3 && completedAgreement && (
          <div className="text-center space-y-6 py-6 animate-in fade-in duration-300">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center mx-auto shadow-[0_0_50px_rgba(16,185,129,0.7)] animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-black tracking-widest text-emerald-400 uppercase block mb-1">
                {language === 'ar' ? 'تم توثيق اشتراكك وحفظ العقد بنجاح في قاعدة البيانات ✅' : 'Subscription & Contract Saved Directly to Database ✅'}
              </span>
              <h2
                className={`text-2xl sm:text-4xl font-black ${
                  theme === 'dark' ? 'text-white' : 'text-[#0F172A]'
                }`}
              >
                {language === 'ar' ? `أهلاً بك يا بطل! ${fullName}` : `Welcome Champion! ${fullName}`}
              </h2>
              <p
                className={`text-xs sm:text-sm max-w-xl mx-auto leading-relaxed mt-2 ${
                  theme === 'dark' ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {language === 'ar'
                  ? 'تم حفظ وتوثيق إقرارك وعقدك الرياضي مباشرة في قاعدة بيانات المنصة الرسمية، وتنزيل نسخة PDF المعتمدة على جهازك. حسابك جاهز الآن للدخول الفوري.'
                  : 'Your subscription agreement has been recorded directly in the official platform database and downloaded as PDF. Your account is active now.'}
              </p>
            </div>

            {/* Agreement Snapshot Card */}
            <div
              className={`max-w-xl mx-auto p-6 sm:p-7 rounded-3xl border-2 text-start space-y-4 shadow-2xl transition-colors ${
                theme === 'dark'
                  ? 'bg-[#0B132B] border-emerald-500/50 text-white'
                  : 'bg-white border-emerald-500/50 text-[#0F172A]'
              }`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="text-xs font-black text-emerald-400 font-mono">
                  {completedAgreement.id}
                </span>
                <span className="text-xs font-bold">{completedAgreement.fullName}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {language === 'ar' ? 'الباقة المختارة:' : 'Selected Plan:'}
                  </span>
                  <strong className="text-orange-400">{completedAgreement.planNameAr}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {language === 'ar' ? 'خطة الرسوم والسداد:' : 'Payment Plan:'}
                  </span>
                  <strong className="text-amber-400 font-mono">
                    {completedAgreement.paymentInstallments === '3_installments'
                      ? `ثلاث دفعات (${completedAgreement.installmentAmount} ريال/دفعة)`
                      : completedAgreement.paymentInstallments === '2_installments'
                      ? `دفعتين (${completedAgreement.installmentAmount} ريال/دفعة)`
                      : `دفعة كاملة (${completedAgreement.planPrice} ريال)`}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {language === 'ar' ? 'الهدف التصوري:' : 'Visual Goal:'}
                  </span>
                  <strong className="text-slate-200">
                    {completedAgreement.visualGoal || visualGoal}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {language === 'ar' ? 'العمر وفصيلة الدم:' : 'Age & Blood Type:'}
                  </span>
                  <strong className="text-slate-200">
                    {completedAgreement.age ? `${completedAgreement.age} سنة` : '—'} • {completedAgreement.bloodType || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {language === 'ar' ? 'فحص InBody المرفق:' : 'InBody Attachment:'}
                  </span>
                  <strong className={completedAgreement.inBodyFileName ? 'text-emerald-400' : 'text-slate-400'}>
                    {completedAgreement.inBodyFileName ? `✓ ${completedAgreement.inBodyFileName}` : 'غير مرفق'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    {language === 'ar' ? 'التوقيع الرقمي المعتمد:' : 'Signature:'}
                  </span>
                  <strong className="font-mono text-emerald-400">{completedAgreement.digitalSignature}</strong>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{language === 'ar' ? 'تم تنزيل ملف PDF وحفظ العقد في قاعدة البيانات' : 'PDF Saved & Synced to Database'}</span>
                </span>
                <button
                  type="button"
                  onClick={generateAndDownloadPDF}
                  className="text-orange-400 hover:text-white underline text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'تنزيل PDF مجدداً' : 'Re-download PDF'}</span>
                </button>
              </div>
            </div>

            {/* Direct Portal Access Action Buttons (Direct Database Storage - No WhatsApp Redirect) */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => {
                  setCurrentUserSession({
                    id: email.trim().toLowerCase(),
                    email: email.trim().toLowerCase(),
                    name: cleanFullName,
                    plan: resolvedPlanTier,
                    role: 'client',
                  });
                  if (resolvedPlanTier === 'VIP') {
                    navigate('/vip');
                  } else {
                    navigate('/standard');
                  }
                }}
                className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm sm:text-base tracking-wide flex items-center justify-center gap-3 shadow-[0_0_40px_rgba(234,88,12,0.7)] border-2 border-orange-300/40 transition-transform hover:scale-105 cursor-pointer"
              >
                <LogIn className="w-5 h-5 text-white" />
                <span>{language === 'ar' ? 'الدخول إلى حسابك الرياضي مباشرة 🚀' : 'Enter Athlete Portal Now 🚀'}</span>
                <ArrowRight className="w-5 h-5 rtl:rotate-180" />
              </button>

              <button
                type="button"
                onClick={generateAndDownloadPDF}
                className={`w-full sm:w-auto px-6 py-4 rounded-2xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/10 hover:bg-white/15 border-white/10 text-slate-300'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                }`}
              >
                <Download className="w-4 h-4 text-orange-400" />
                <span>{language === 'ar' ? 'تحميل وثيقة PDF' : 'Download Contract PDF'}</span>
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className={`w-full sm:w-auto px-6 py-4 rounded-2xl border text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  theme === 'dark'
                    ? 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-400'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                {language === 'ar' ? 'الرئيسية' : 'Home'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* OFF-SCREEN PRINTABLE TEMPLATE FOR PDF RENDERING (100% COMPLETE CLAUSES) */}
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
              marginBottom: '20px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#0B132B' }}>
                OWN AURA OUTCOME
              </h1>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 700 }}>
                المنظومة التدريبية الرياضية النخبوية • إشراف الكوتش عمر عدنان
              </p>
              <p style={{ margin: '2px 0 0 0', fontSize: '11px', color: '#EA580C', fontWeight: 800 }}>
                وثيقة إقرار وتعهد وإخلاء مسؤولية رسمي معتمد
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

          {/* Part 1 Details in PDF */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: '14px',
              padding: '16px',
              marginBottom: '18px',
            }}
          >
            <h3 style={{ fontSize: '13px', fontWeight: 900, margin: '0 0 10px 0', color: '#0F172A' }}>
              أولاً: بيانات المشترك والباقة المعتمدة
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', fontSize: '11px' }}>
              <div><strong>اسم المتدرب: </strong>{cleanFullName}</div>
              <div><strong>رقم الجوال / الواتساب: </strong>{phoneWhatsapp}</div>
              <div><strong>البريد الإلكتروني: </strong>{email}</div>
              <div><strong>العمر وفصيلة الدم: </strong>{age || '—'} سنة • {bloodType || '—'}</div>
              <div><strong>الباقة التدريبية: </strong>{currentPlanNameAr}</div>
              <div>
                <strong>المدة والرسوم: </strong>
                {currentDurationInfo.labelAr} ({currentDurationInfo.price} ريال) - {paymentInstallments === 'full' ? 'دفعة كاملة' : paymentInstallments === '2_installments' ? 'دفعتين' : '3 دفعات'}
              </div>
              <div>
                <strong>الهدف التصوري: </strong>
                {visualGoal}
              </div>
              <div>
                <strong>فحص InBody: </strong>
                {inBodyFileName ? `مرفق (${inBodyFileName})` : 'غير مرفق'}
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <strong>الإفصاح الصحي: </strong>
                {healthStatus === 'healthy' ? 'سليم ولائق 100%' : healthIssuesDetails}
              </div>
            </div>
          </div>

          {/* Part 2: Complete Legal Clauses in PDF (Exact from Images 1 & 2) */}
          <div style={{ marginBottom: '18px', fontSize: '10.5px', lineHeight: '1.6', color: '#1E293B' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 900, margin: '0 0 10px 0', color: '#0F172A', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
              ثانياً: بنود الإقرار وإخلاء المسؤولية المعتمدة (4 بنود قانونية)
            </h3>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 800, color: '#C2410C' }}>1. الحالة الصحية والمسؤولية التدريبية عن بُعد:</div>
              <div style={{ paddingRight: '8px' }}>
                • أقر بأنني سليم صحياً ولائق لممارسة المجهود البدني، وأتحمل مسؤولية الإفصاح عن كافة المشاكل الصحية قبل البدء.<br />
                • أقر بأن المقاطع المرئية (الفيديوهات) المرفقة بالبرنامج هي للتوضيح والاسترشاد فقط، وأنني المسؤول الأول عن تطبيق التمارين بالشكل الصحيح واختيار الأوزان المناسبة، ولا يتحمل المدرب أي مسؤولية عن أي إصابة ناتجة عن الأداء الخاطئ أو الإهمال.
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 800, color: '#C2410C' }}>2. النظام الغذائي والمكملات:</div>
              <div style={{ paddingRight: '8px' }}>
                • أقر بأن النظام الغذائي مصمم بناءً على البيانات التي زودت المدرب بها، وأتحمل كامل المسؤولية عن الإفصاح عن أي حساسية أو مشاكل هضمية.<br />
                • أقر بأن استخدام أو شراء أي مكملات غذائية يكون بناءً على رغبتي الشخصية وعلى مسؤوليّتي الخاصة.
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 800, color: '#C2410C' }}>3. الملكية الفكرية وحظر التسريب وإعادة الإنتاج:</div>
              <div style={{ paddingRight: '8px' }}>
                • أقر بأن جميع الجداول، والأنظمة الغذائية، والملفات المرفقة هي حقوق ملكية فكرية خاصة بالمدرب فقط ومخصصة لاستخدامي الشخصي.<br />
                • أتعهد بعدم مشاركة، أو إعادة نشر، أو تسريب، أو بيع أي جزء من المحتوى أو الجداول لأي شخص آخر أو عبر أي منصة.<br />
                • أعلم أنه في حال ثبوت تسريب أي محتوى، يحق للمدرب إلغاء اشتراكي فوراً دون استرجاع أي مبالغ، مع الاحتفاظ بحقه القانوني في المطالبة بالتعويض عن الأضرار.
              </div>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <div style={{ fontWeight: 800, color: '#C2410C' }}>4. سياسة الدفع، الاسترجاع، والنتائج:</div>
              <div style={{ paddingRight: '8px' }}>
                • أقر بأن الرسوم المدفوعة غير قابلة للاسترجاع بعد استلام الخطة والبرنامج التدريبي.<br />
                • أقر بأن النتائج تعتمد كلياً على مدى التزامي الشخصي بالتعليمات، والمدرب غير مسؤول عن عدم تحقيق النتائج في حال عدم الالتزام الكامل.
              </div>
            </div>
          </div>

          {/* Part 3: Official Signature Box in PDF */}
          <div
            style={{
              marginTop: '15px',
              border: '2px solid #EA580C',
              borderRadius: '12px',
              padding: '14px',
              backgroundColor: '#FFF7ED',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 900, color: '#C2410C', marginBottom: '4px' }}>
                  ثالثاً: الاعتماد والتوقيع الإلكتروني المعتمد
                </div>
                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                  اسم المشترك الموقع: {cleanSignature}
                </div>
                <div style={{ fontSize: '10px', color: '#64748B', marginTop: '2px' }}>
                  أقر بصحة جميع البيانات وبالموافقة الكاملة على كافة البنود أعلاه.
                </div>
              </div>

              {signatureDataUrl && (
                <img
                  src={signatureDataUrl}
                  alt="Digital Signature"
                  style={{ width: '130px', height: '45px', objectFit: 'contain' }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
