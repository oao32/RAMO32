import React from 'react';
import { SubscriptionAgreement, Language, Theme } from '../types';
import { BrandLogo } from './BrandLogo';
import {
  ShieldCheck,
  FileText,
  User,
  Phone,
  Mail,
  Activity,
  CheckCircle2,
  Printer,
  X,
  Lock,
  Calendar,
  AlertTriangle,
} from 'lucide-react';

interface SignedDeclarationModalProps {
  isOpen: boolean;
  onClose: () => void;
  agreement: SubscriptionAgreement | null;
  language: Language;
  theme?: Theme;
}

export const SignedDeclarationModal: React.FC<SignedDeclarationModalProps> = ({
  isOpen,
  onClose,
  agreement,
  language,
}) => {
  if (!isOpen || !agreement) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-gradient-to-b from-[#0B132B] via-[#070E24] to-[#030712] border-2 border-orange-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_80px_rgba(255,87,34,0.35)] backdrop-blur-2xl text-white select-none overflow-y-auto">
        {/* Top Rim */}
        <div className="absolute top-0 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-[#FF7043] to-transparent shadow-[0_0_15px_#FF5722]" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-orange-500/20 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" showText={false} />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#FF7043] uppercase">
                  {language === 'ar' ? 'سجل الإقرارات والعقود الرسمية' : 'OFFICIAL DECLARATION ARCHIVE'}
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                  {language === 'ar' ? 'معتمد وموثق 100%' : 'Certified 100%'}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white">
                {language === 'ar'
                  ? 'وثيقة إقرار وإخلاء مسؤولية وشروط الاشتراك (معتمدة)'
                  : 'Certified Declaration & Service Terms Document'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
            >
              <Printer className="w-4 h-4 text-orange-400" />
              <span className="hidden sm:inline">{language === 'ar' ? 'طباعة الوثيقة' : 'Print'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/30 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Contract ID Bar */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-orange-400" />
            <span className="text-slate-400">{language === 'ar' ? 'رقم التوثيق المرجعي:' : 'Reference ID:'}</span>
            <strong className="text-orange-400 font-mono text-sm">{agreement.id}</strong>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">{language === 'ar' ? 'تاريخ التوقيع والاعتماد:' : 'Signed Date:'}</span>
            <strong className="text-slate-200">{agreement.signedTimestamp}</strong>
          </div>
        </div>

        {/* Document Sections */}
        <div className="space-y-6 text-right rtl:text-right ltr:text-left">
          {/* SECTION 1: Personal & Health */}
          <div className="bg-[#0B132B]/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-orange-400 flex items-center gap-2 border-b border-white/10 pb-2">
              <User className="w-4 h-4" />
              <span>{language === 'ar' ? 'الجزء الأول: البيانات الشخصية والحالة الصحية للمشترك' : 'Part 1: Personal & Health Disclosures'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] mb-1">{language === 'ar' ? 'الاسم الثلاثي المعتمد:' : 'Full Name:'}</span>
                <span className="text-white font-black text-sm">{agreement.fullName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-1">{language === 'ar' ? 'رقم الجوال / الواتساب:' : 'Phone / WhatsApp:'}</span>
                <span className="text-white font-mono font-bold" dir="ltr">{agreement.phoneWhatsapp}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px] mb-1">{language === 'ar' ? 'البريد الإلكتروني:' : 'Email:'}</span>
                <span className="text-white font-mono font-bold">{agreement.email}</span>
              </div>
            </div>

            {/* Health Disclosure */}
            <div className="pt-2 border-t border-white/5">
              <span className="text-slate-400 block text-[11px] mb-1.5">{language === 'ar' ? 'الإفصاح عن الحالة الصحية والإصابات:' : 'Health Disclosures:'}</span>
              {agreement.hasHealthIssues ? (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-black mb-1">{language === 'ar' ? 'نعم، يوجد ملاحظات صحية / إصابات مفصح عنها:' : 'Disclosed health conditions / injuries:'}</strong>
                    <p className="leading-relaxed">{agreement.healthIssuesDetails || (language === 'ar' ? 'تم الإفصاح عن إصابات سابقة' : 'Prior injury reported')}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{language === 'ar' ? 'لا يوجد أي مشاكل صحية - المشترك سليم ولائق بدنياً لممارسة التدريب 100%' : 'No health issues reported - 100% physically fit'}</span>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 2: Verified Legal Clauses */}
          <div className="bg-[#0B132B]/80 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-orange-400 flex items-center gap-2 border-b border-white/10 pb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>{language === 'ar' ? 'الجزء الثاني: بنود الإقرار وإخلاء المسؤولية المعتمدة' : 'Part 2: Certified Declaration Clauses'}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start justify-between gap-3">
                <div>
                  <strong className="text-white block mb-0.5">1. {language === 'ar' ? 'الحالة الصحية والمسؤولية التدريبية عن بُعد' : 'Health & Remote Coaching Responsibility'}</strong>
                  <span className="text-slate-400 text-[11px]">{language === 'ar' ? 'أقر بلياقته البدنية وأن المقاطع للاسترشاد وهو المسؤول الأول عن الأداء والأوزان دون مسؤولية على المدرب.' : 'Acknowledged remote guidance and personal liability for exercise execution.'}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-black border border-emerald-500/30 shrink-0">
                  {language === 'ar' ? 'موافق ومتعهد ☑' : 'Agreed ☑'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start justify-between gap-3">
                <div>
                  <strong className="text-white block mb-0.5">2. {language === 'ar' ? 'النظام الغذائي والمكملات' : 'Nutrition & Supplements'}</strong>
                  <span className="text-slate-400 text-[11px]">{language === 'ar' ? 'أقر بالمسؤولية الكاملة عن الإفصاح عن الحساسية، وأن شراء واستخدام المكملات برغبته ومسؤوليته الخاصة.' : 'Full accountability for allergy disclosure and voluntary supplement usage.'}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-black border border-emerald-500/30 shrink-0">
                  {language === 'ar' ? 'موافق ومتعهد ☑' : 'Agreed ☑'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start justify-between gap-3">
                <div>
                  <strong className="text-white block mb-0.5">3. {language === 'ar' ? 'الملكية الفكرية وحظر التسريب وإعادة الإنتاج' : 'IP & Non-Leakage Agreement'}</strong>
                  <span className="text-slate-400 text-[11px]">{language === 'ar' ? 'أقر بحقوق الملكية الفكرية الخاصة بالمدرب وتعهد بعدم نشر أو تسريب أي جداول مع علمه بحق المدرب في التعويض.' : 'Pledged against leakage with awareness of coach legal rights.'}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-black border border-emerald-500/30 shrink-0">
                  {language === 'ar' ? 'موافق ومتعهد ☑' : 'Agreed ☑'}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start justify-between gap-3">
                <div>
                  <strong className="text-white block mb-0.5">4. {language === 'ar' ? 'سياسة الدفع، الاسترجاع، والنتائج' : 'Payment & Results Policy'}</strong>
                  <span className="text-slate-400 text-[11px]">{language === 'ar' ? 'أقر بأن الرسوم غير قابلة للاسترجاع بعد استلام الخطة، وأن النتائج تعتمد كلياً على التزامه الشخصي.' : 'Non-refundable fee and outcome adherence acknowledged.'}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-black border border-emerald-500/30 shrink-0">
                  {language === 'ar' ? 'موافق ومتعهد ☑' : 'Agreed ☑'}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 3: Signature Verification */}
          <div className="bg-[#0B132B]/80 border border-emerald-500/30 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black text-emerald-400 flex items-center gap-2 border-b border-white/10 pb-2">
              <Lock className="w-4 h-4" />
              <span>{language === 'ar' ? 'الجزء الثالث: التوقيع الإلكتروني والاعتماد الرسمي' : 'Part 3: Electronic Execution & Legal Seal'}</span>
            </h3>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-black/50 p-4 rounded-xl border border-white/10">
              <div>
                <span className="text-slate-400 block text-[11px]">{language === 'ar' ? 'نص التوقيع الإلكتروني للمشترك:' : 'Signee Name:'}</span>
                <span className="text-white font-black text-base mt-0.5 block">{agreement.digitalSignature}</span>
                <span className="text-[10px] text-slate-500 font-mono mt-1 block">SHA-256 Validated • Timestamp: {agreement.signedTimestamp}</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{language === 'ar' ? 'توقيع إلكتروني موثق ونافذ نظاماً' : 'Legally Binding Signature'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-8 pt-4 border-t border-white/10 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {language === 'ar' ? 'أكاديمية Own Aura Outcome للتدريب الرياضي' : 'Own Aura Outcome Training Academy'}
          </span>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition-all cursor-pointer"
          >
            {language === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
