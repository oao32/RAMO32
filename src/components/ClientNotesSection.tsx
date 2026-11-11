import React, { useState } from 'react';
import { ClientNote, ClientProfile, Language, Theme } from '../types';
import { Send, MessageSquare, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface ClientNotesSectionProps {
  notes: ClientNote[];
  onAddNote: (newNote: Omit<ClientNote, 'id' | 'timestamp' | 'isResolved'>) => void;
  language: Language;
  theme?: Theme;
  profile?: ClientProfile;
}

export const ClientNotesSection: React.FC<ClientNotesSectionProps> = ({
  notes,
  onAddNote,
  language,
  profile,
}) => {
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState<'exercise' | 'nutrition' | 'recovery' | 'general'>('nutrition');
  const [message, setMessage] = useState('');
  const [justSent, setJustSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    onAddNote({
      clientId: profile?.id || 'client_athlete',
      clientName: profile?.name || 'المشترك',
      clientEmail: profile?.email || '',
      subject: subject.trim() || (language === 'ar' ? 'استفسار للمدرب' : 'General Inquiry'),
      category,
      message: message.trim(),
    });

    setMessage('');
    setSubject('');
    setJustSent(true);
    setTimeout(() => setJustSent(false), 3000);
  };

  const categories = [
    { key: 'nutrition', labelAr: '🥩 التغذية والوجبات', labelEn: '🥩 Nutrition & Meals' },
    { key: 'exercise', labelAr: '🏋️ التمارين والأوزان', labelEn: '🏋️ Workouts & Weights' },
    { key: 'recovery', labelAr: '💤 الاستشفاء والمكملات', labelEn: '💤 Recovery & Supps' },
    { key: 'general', labelAr: '⚡ استفسار عام', labelEn: '⚡ General Question' },
  ];

  return (
    <div className="bg-[#FAFBFD] dark:bg-[#0b132b]/90 border border-slate-300/90 dark:border-orange-500/25 rounded-2xl p-5 shadow-[0_4px_25px_rgba(11,19,43,0.05)] dark:shadow-xl transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 border-b border-slate-200/90 dark:border-white/5 pb-2.5">
        <h3 className="text-orange-600 dark:text-orange-400 font-extrabold text-sm md:text-base flex items-center gap-2">
          {/* Vibrant Navy + Orange + White Badge */}
          <span className="p-1.5 rounded-xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] ring-2 ring-orange-500/30 text-orange-400 shadow-md flex items-center justify-center">
            <MessageSquare className="w-4 h-4 text-orange-400 stroke-[2.2]" />
          </span>
          <span>{language === 'ar' ? 'ملاحظات واستفسارات المشترك المباشرة' : 'Direct Coach Inquiries & Notes'}</span>
        </h3>
        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#0B132B] to-[#1C2541] text-orange-400 border border-orange-500/40 font-bold shadow-xs">
          Coach Omar Adnan
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Category Pills */}
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              type="button"
              key={cat.key}
              onClick={() => setCategory(cat.key as any)}
              className={`text-xs px-3 py-1 rounded-full font-bold border transition-all cursor-pointer ${
                category === cat.key
                  ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white border-orange-500 shadow-[0_0_12px_rgba(234,88,12,0.4)]'
                  : 'bg-[#EEF2F6] dark:bg-white/5 text-[#0B132B] dark:text-slate-300 border-slate-300 dark:border-white/10 hover:border-orange-500'
              }`}
            >
              {language === 'ar' ? cat.labelAr : cat.labelEn}
            </button>
          ))}
        </div>

        {/* Subject input */}
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder={
            language === 'ar'
              ? 'عنوان الملاحظة أو الاستفسار (مثال: بديل الكارب بعد التمرين)...'
              : 'Subject (e.g. Post-workout carb substitute)...'
          }
          className="w-full bg-[#EEF2F6] dark:bg-[#070a14] border border-slate-300 dark:border-white/10 focus:border-orange-500 rounded-xl px-3.5 py-2.5 text-xs md:text-sm text-[#0B132B] dark:text-white placeholder-slate-500 outline-none transition-colors font-medium"
        />

        {/* Message textarea */}
        <textarea
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            language === 'ar'
              ? 'اكتب رسالتك أو شعورك بالأوزان أو أي استفسار للكوتش عمر عدنان...'
              : 'Write your feedback, weight sensation or question for Coach Omar...'
          }
          className="w-full bg-[#EEF2F6] dark:bg-[#070a14] border border-slate-300 dark:border-white/10 focus:border-orange-500 rounded-xl p-3 text-xs md:text-sm text-[#0B132B] dark:text-white placeholder-slate-500 outline-none transition-colors resize-none font-medium"
        />

        {/* Submit button */}
        <div className="flex items-center justify-between pt-1">
          {justSent ? (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
              <CheckCircle className="w-3.5 h-3.5" />
              {language === 'ar' ? 'تم إرسال الملاحظة وحفظها بنجاح!' : 'Note sent and saved!'}
            </span>
          ) : (
            <span className="text-[11px] text-slate-600 dark:text-slate-400 font-semibold">
              {language === 'ar' ? 'يتم الحفظ الفوري تلقائياً ⚡' : 'Auto-saved instantly ⚡'}
            </span>
          )}

          <button
            type="submit"
            disabled={!message.trim()}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 disabled:opacity-50 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all active:scale-95 cursor-pointer"
          >
            <span>{language === 'ar' ? 'إرسال للكوتش' : 'Send to Coach'}</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {/* Inquiries / Conversation History (Filtered for current subscriber only) */}
      <div className="mt-5 space-y-3 pt-4 border-t border-slate-200/90 dark:border-white/10">
        <h4 className="text-xs font-black text-[#0B132B] dark:text-slate-300">
          {language === 'ar' ? 'سجل استفساراتك وردود الكوتش عمر عدنان:' : 'Your Inquiries & Coach Responses:'}
        </h4>

        {(() => {
          const myNotes = notes.filter((item) => {
            if (!profile) return true;
            const matchId = item.clientId && profile.id && item.clientId === profile.id;
            const matchName = item.clientName && profile.name && item.clientName.trim().toLowerCase() === profile.name.trim().toLowerCase();
            const matchEmail = item.clientEmail && profile.email && item.clientEmail.trim().toLowerCase() === profile.email.trim().toLowerCase();
            return matchId || matchName || matchEmail;
          });

          if (myNotes.length === 0) {
            return (
              <p className="text-xs text-slate-500 py-3 text-center">
                {language === 'ar'
                  ? 'لا توجد استفسارات مرسلة بعد. اكتب استفسارك للكوتش وسيصلك الرد هنا مباشرة.'
                  : 'No inquiries sent yet. Post your question and the coach response will appear here.'}
              </p>
            );
          }

          return myNotes.map((item) => (
            <div
              key={item.id}
              className="bg-[#EEF2F6] dark:bg-[#070a14] border border-slate-300/80 dark:border-white/10 rounded-xl p-3.5 space-y-2.5 transition-all hover:border-orange-500/40 shadow-xs"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-black text-orange-600 dark:text-orange-400">{item.subject}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-slate-400 font-bold">
                    {item.category}
                  </span>
                </div>
                <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold">{item.timestamp}</span>
              </div>

              {/* Client question text */}
              <p className="text-xs text-[#0B132B] dark:text-slate-200 leading-relaxed ps-2 border-s-2 border-orange-500/70 font-medium">
                "{item.message}"
              </p>

              {/* Coach response if available */}
              {item.reply ? (
                <div className="bg-emerald-50 dark:bg-[#0b132b] border border-emerald-500/40 rounded-lg p-2.5 mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-500" />
                      {language === 'ar' ? 'رد الكوتش عمر عدنان:' : 'Coach Omar Adnan reply:'}
                    </span>
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 font-mono font-bold">{item.replyTimestamp}</span>
                  </div>
                  <p className="text-xs text-slate-800 dark:text-slate-300 ps-1 font-semibold">{item.reply}</p>
                </div>
              ) : (
                <div className="text-[11px] text-amber-700 dark:text-amber-400/90 font-bold flex items-center gap-1 pt-1">
                  <Clock className="w-3 h-3 text-amber-500 animate-spin" />
                  <span>{language === 'ar' ? 'بانتظار رد الكوتش عمر عدنان...' : 'Awaiting coach reply...'}</span>
                </div>
              )}
            </div>
          ));
        })()}
      </div>
    </div>
  );
};
