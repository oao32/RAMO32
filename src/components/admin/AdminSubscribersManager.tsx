import React, { useState } from 'react';
import { SubscriptionAgreement, SubscriptionPlanTier } from '../../types';
import {
  getAllSubscribersWithCredentials,
  assignSubscriberPassword,
  generateWhatsAppWelcomeMessage,
  UserCredentialRecord,
} from '../../lib/authStore';
import {
  Users,
  ShieldCheck,
  Share2,
  KeyRound,
  Eye,
  Crown,
  Shield,
  Plus,
  Copy,
  CheckCircle2,
  X,
  Lock,
  RefreshCw,
  Phone,
  Mail,
  User,
  Sparkles,
} from 'lucide-react';

interface AdminSubscribersManagerProps {
  declarations: SubscriptionAgreement[];
  onOpenDeclaration: (decl: SubscriptionAgreement) => void;
  onCopySubscribeLink: () => void;
  copiedLink: boolean;
  language: 'ar' | 'en';
}

export const AdminSubscribersManager: React.FC<AdminSubscribersManagerProps> = ({
  declarations,
  onOpenDeclaration,
  onCopySubscribeLink,
  copiedLink,
  language,
}) => {
  // Credentials list
  const [credentialsList, setCredentialsList] = useState<UserCredentialRecord[]>(() =>
    getAllSubscribersWithCredentials()
  );

  // Quick Password Reset Modal State
  const [resetModalUser, setResetModalUser] = useState<UserCredentialRecord | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  // Manual Add Subscriber Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addPlan, setAddPlan] = useState<SubscriptionPlanTier>('VIP');
  const [addPhone, setAddPhone] = useState('');
  const [addMessage, setAddMessage] = useState<string | null>(null);

  // WhatsApp share notification
  const [whatsappCopiedFor, setWhatsappCopiedFor] = useState<string | null>(null);

  const refreshList = () => {
    setCredentialsList(getAllSubscribersWithCredentials());
  };

  const handleGenerateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'OAO-';
    for (let i = 0; i < 4; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleOpenResetModal = (user: UserCredentialRecord) => {
    setResetModalUser(user);
    setNewPasswordVal(user.password || handleGenerateRandomPassword());
    setResetMessage(null);
  };

  const handleSaveResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser || !newPasswordVal.trim()) return;

    await assignSubscriberPassword({
      email: resetModalUser.email,
      password: newPasswordVal.trim(),
      clientName: resetModalUser.clientName,
      clientCode: resetModalUser.clientCode,
      plan: resetModalUser.plan,
      phone: resetModalUser.phone,
    });

    refreshList();
    setResetMessage('تم تعيين كلمة المرور وتحديث الحساب بنجاح!');
    setTimeout(() => {
      setResetModalUser(null);
      setResetMessage(null);
    }, 1500);
  };

  const handleSaveNewSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim() || !addName.trim() || !addPassword.trim()) return;

    await assignSubscriberPassword({
      email: addEmail.trim(),
      password: addPassword.trim(),
      clientName: addName.trim(),
      plan: addPlan,
      phone: addPhone.trim() || undefined,
    });

    refreshList();
    setAddMessage('تم إنشاء حساب المشترك واعتماد كلمة المرور بنجاح!');
    setTimeout(() => {
      setIsAddModalOpen(false);
      setAddMessage(null);
      setAddName('');
      setAddEmail('');
      setAddPassword('');
      setAddPhone('');
    }, 1200);
  };

  const handleCopyWhatsAppMessage = (user: {
    clientName: string;
    email: string;
    password?: string;
    plan: SubscriptionPlanTier;
    clientCode?: string;
    phone?: string;
  }) => {
    const msg = generateWhatsAppWelcomeMessage({
      clientName: user.clientName,
      email: user.email,
      password: user.password,
      plan: user.plan,
      clientCode: user.clientCode,
      phone: user.phone,
    });

    navigator.clipboard.writeText(msg);
    setWhatsappCopiedFor(user.email);
    setTimeout(() => setWhatsappCopiedFor(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header and Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10 shadow-lg">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-orange-400" />
            <span>إدارة المشتركين وكلمات المرور والاعتمادات</span>
          </h2>
          <p className="text-xs text-slate-400 font-medium mt-1">
            إدارة كلمات مرور المشتركين المخصصة، مشاركة بيانات الدخول عبر الواتساب بنقرة واحدة، واستعراض العقود المعتمدة
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAddPassword(handleGenerateRandomPassword());
              setIsAddModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة وتفعيل مشترك جديد</span>
          </button>

          <button
            onClick={onCopySubscribeLink}
            className="px-4 py-2.5 rounded-xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>{copiedLink ? 'تم نسخ الرابط!' : 'رابط التسجيل (/subscribe)'}</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Toast Notice */}
      {whatsappCopiedFor && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-white text-xs font-bold flex items-center justify-between shadow-xl animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              تم نسخ رسالة الترحيب وبيانات الدخول المجهزة للواتساب بنجاح! الصقها الآن في محادثة المشترك. 📲
            </span>
          </div>
          <button
            onClick={() => setWhatsappCopiedFor(null)}
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ACTIVE SUBSCRIBERS WITH CREDENTIALS TABLE */}
      <div className="rounded-3xl bg-[#0B132B]/90 border border-white/10 overflow-hidden shadow-xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-black text-white">
              قائمة المشتركين وبيانات الدخول المعتمدة ({credentialsList.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            تسجيل دخول مباشر بالإيميل وكلمة المرور أو برمز الاشتراك
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-[#070e24] text-slate-400 border-b border-white/10">
              <tr>
                <th className="p-3.5 font-bold">اسم المتدرب</th>
                <th className="p-3.5 font-bold">البريد الإلكتروني</th>
                <th className="p-3.5 font-bold">نوع الباقة</th>
                <th className="p-3.5 font-bold">رمز الدخول البديل</th>
                <th className="p-3.5 font-bold">كلمة المرور</th>
                <th className="p-3.5 font-bold text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {credentialsList.map((user) => (
                <tr key={user.email} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-3.5 font-black text-white flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold">
                      {user.clientName.charAt(0)}
                    </span>
                    <span>{user.clientName}</span>
                  </td>
                  <td className="p-3.5 font-mono text-slate-300">{user.email}</td>
                  <td className="p-3.5">
                    {user.plan === 'VIP' ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 font-bold">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span>VIP بلاتينيوم</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-600 font-bold">
                        <Shield className="w-3 h-3 text-slate-300" />
                        <span>Standard قياسية</span>
                      </span>
                    )}
                  </td>
                  <td className="p-3.5 font-mono font-bold text-orange-400">
                    {user.clientCode || '—'}
                  </td>
                  <td className="p-3.5 font-mono text-slate-200">
                    <span className="px-2 py-1 rounded-md bg-black/50 border border-white/10 font-bold">
                      {user.password}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <div className="flex items-center justify-center gap-2">
                      {/* WhatsApp Quick Share Button */}
                      <button
                        onClick={() => handleCopyWhatsAppMessage(user)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                        title="نسخ رسالة الترحيب المجهزة بالكامل للواتساب"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>نسخ للواتساب</span>
                      </button>

                      {/* Password Reset Modal Button */}
                      <button
                        onClick={() => handleOpenResetModal(user)}
                        className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                        title="تعديل أو إعادة تعيين كلمة المرور فورياً"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>كلمة المرور</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SIGNED CONTRACTS SECTION (If any contracts exist) */}
      {declarations.length > 0 && (
        <div className="rounded-3xl bg-[#0B132B]/90 border border-white/10 overflow-hidden shadow-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-400" />
              <h3 className="text-base font-black text-white">
                العقود الرقمية الموقعة والإقرارات ({declarations.length})
              </h3>
            </div>
            <span className="text-xs text-slate-400">وثائق PDF معتمدة إلكترونياً</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-[#070e24] text-slate-400 border-b border-white/10">
                <tr>
                  <th className="p-3 font-bold">رقم العقد</th>
                  <th className="p-3 font-bold">اسم المتدرب</th>
                  <th className="p-3 font-bold">الباقة والمدة</th>
                  <th className="p-3 font-bold">الجوال</th>
                  <th className="p-3 font-bold">تاريخ التوقيع</th>
                  <th className="p-3 font-bold text-center">الوثيقة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {declarations.map((decl) => (
                  <tr key={decl.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3 font-mono font-bold text-orange-400">{decl.id}</td>
                    <td className="p-3 font-bold text-white">{decl.fullName}</td>
                    <td className="p-3 text-slate-300">
                      {decl.subscription_plan === 'VIP' ? 'VIP' : 'Standard'} (
                      {decl.durationLabelAr || '3 شهور'})
                    </td>
                    <td className="p-3 font-mono text-slate-400">{decl.phoneWhatsapp}</td>
                    <td className="p-3 text-slate-400">{decl.signedTimestamp}</td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onOpenDeclaration(decl)}
                        className="px-3 py-1 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs inline-flex items-center gap-1 cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>عرض العقد PDF</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QUICK PASSWORD RESET MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setResetModalUser(null)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">إعادة تعيين كلمة المرور</h3>
                <p className="text-xs text-orange-400 font-bold">
                  {resetModalUser.clientName} ({resetModalUser.email})
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  كلمة المرور الجديدة المخصصة:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    value={newPasswordVal}
                    onChange={(e) => setNewPasswordVal(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white font-mono text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setNewPasswordVal(handleGenerateRandomPassword())}
                    className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    title="توليد كلمة مرور جديدة"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>توليد</span>
                  </button>
                </div>
              </div>

              {resetMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{resetMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() =>
                    handleCopyWhatsAppMessage({
                      ...resetModalUser,
                      password: newPasswordVal,
                    })
                  }
                  className="px-3.5 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>نسخ للواتساب</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-md cursor-pointer"
                >
                  حفظ وتحديث كلمة المرور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL ADD SUBSCRIBER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">إضافة وتفعيل مشترك جديد</h3>
                <p className="text-xs text-slate-400 font-medium">
                  تسجيل بيانات المشترك وتعيين كلمة مرور مخصصة تمكنه من الدخول مباشرة
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewSubscriber} className="space-y-4 text-xs">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اسم المشترك الثلاثي:</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="مثال: فيصل خالد العتيبي"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">البريد الإلكتروني:</label>
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="faisal@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">رقم الواتساب:</label>
                  <input
                    type="text"
                    value={addPhone}
                    onChange={(e) => setAddPhone(e.target.value)}
                    placeholder="05XXXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">نوع الباقة التدريبية:</label>
                  <select
                    value={addPlan}
                    onChange={(e) => setAddPlan(e.target.value as SubscriptionPlanTier)}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none font-bold"
                  >
                    <option value="VIP">الباقة البلاتينية النخبوية (VIP)</option>
                    <option value="standard">الباقة القياسية (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">كلمة المرور المخصصة:</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      required
                      value={addPassword}
                      onChange={(e) => setAddPassword(e.target.value)}
                      className="flex-1 px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none font-mono font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setAddPassword(handleGenerateRandomPassword())}
                      className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300"
                      title="توليد كلمة سر"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {addMessage && (
                <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{addMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-lg cursor-pointer"
                >
                  تفعيل الحساب واعتماد كلمة المرور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
