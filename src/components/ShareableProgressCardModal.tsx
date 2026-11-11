import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Share2,
  Copy,
  Check,
  Sparkles,
  Flame,
  Award,
  Shield,
  Dumbbell,
  CheckCircle2,
  QrCode,
  Smartphone,
  Square,
  CreditCard,
  Palette,
  Zap,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { ClientProfile, StreakData, AthleteRank, Badge, Language, Theme } from '../types';

interface ShareableProgressCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: ClientProfile;
  streakData: StreakData;
  athleteRank: AthleteRank;
  badges: Badge[];
  language: Language;
  theme: Theme;
}

export const ShareableProgressCardModal: React.FC<ShareableProgressCardModalProps> = ({
  isOpen,
  onClose,
  profile,
  streakData,
  athleteRank,
  badges,
  language,
  theme,
}) => {
  const [format, setFormat] = useState<'story' | 'square' | 'card'>('story');
  const [cardTheme, setCardTheme] = useState<'aura' | 'titan' | 'gold'>('aura');
  const [highlightStat, setHighlightStat] = useState<'streak' | 'pr' | 'transformation' | 'level'>('streak');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const cardRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen) return null;

  const isAr = language === 'ar';

  // High-Resolution Direct Canvas Render for flawless PNG export
  const handleExportPNG = async () => {
    setIsExporting(true);
    try {
      // Define canvas dimensions based on chosen format
      const width = format === 'story' ? 1080 : format === 'square' ? 1080 : 1200;
      const height = format === 'story' ? 1920 : format === 'square' ? 1080 : 700;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) return;

      // 1. Draw Background Gradient
      if (cardTheme === 'aura') {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#040711');
        bgGrad.addColorStop(0.4, '#07152e');
        bgGrad.addColorStop(1, '#0a0502');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Ambient glow
        const glow = ctx.createRadialGradient(width / 2, height * 0.35, 50, width / 2, height * 0.35, width * 0.55);
        glow.addColorStop(0, 'rgba(237, 101, 27, 0.28)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      } else if (cardTheme === 'titan') {
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#0b0f19');
        bgGrad.addColorStop(0.5, '#1e293b');
        bgGrad.addColorStop(1, '#020617');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(width / 2, height * 0.4, 50, width / 2, height * 0.4, width * 0.55);
        glow.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Gold
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#0f0c05');
        bgGrad.addColorStop(0.5, '#1f1607');
        bgGrad.addColorStop(1, '#050301');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        const glow = ctx.createRadialGradient(width / 2, height * 0.4, 50, width / 2, height * 0.4, width * 0.55);
        glow.addColorStop(0, 'rgba(245, 158, 11, 0.28)');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, width, height);
      }

      // Outer border frame
      ctx.lineWidth = 4;
      ctx.strokeStyle = cardTheme === 'aura' ? 'rgba(237, 101, 27, 0.5)' : cardTheme === 'titan' ? 'rgba(56, 189, 248, 0.5)' : 'rgba(245, 158, 11, 0.5)';
      ctx.strokeRect(30, 30, width - 60, height - 60);

      // 2. Load & Draw Logo
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      logoImg.src = '/logo.png';

      await new Promise((resolve) => {
        logoImg.onload = resolve;
        logoImg.onerror = resolve;
      });

      const logoSize = format === 'story' ? 240 : 180;
      const logoX = (width - logoSize) / 2;
      const logoY = format === 'story' ? 140 : format === 'square' ? 90 : 60;
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
      }

      // 3. Draw Typography: Brand Name
      ctx.textAlign = 'center';
      ctx.font = '900 48px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      const titleY = logoY + logoSize + 60;
      ctx.fillText('OWN AURA OUTCOME', width / 2, titleY);

      ctx.font = '700 24px Arial, sans-serif';
      ctx.fillStyle = cardTheme === 'aura' ? '#ea580c' : cardTheme === 'titan' ? '#38bdf8' : '#f59e0b';
      ctx.fillText('OFFICIAL ATHLETE PROGRESS CARD', width / 2, titleY + 38);

      // 4. Athlete Name & Rank Pill
      const athleteY = titleY + 110;
      ctx.font = '900 56px Arial, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(profile.name, width / 2, athleteY);

      ctx.font = '700 26px Arial, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(`🏆 ${athleteRank.nameAr} • LV.${athleteRank.level}`, width / 2, athleteY + 45);

      // 5. Center Big Highlight Banner
      const highlightY = athleteY + 100;
      const boxW = width - 160;
      const boxH = format === 'story' ? 220 : 160;
      const boxX = 80;

      // Highlight Box background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      ctx.fillRect(boxX, highlightY, boxW, boxH);
      ctx.lineWidth = 2;
      ctx.strokeStyle = cardTheme === 'aura' ? '#ea580c' : cardTheme === 'titan' ? '#38bdf8' : '#f59e0b';
      ctx.strokeRect(boxX, highlightY, boxW, boxH);

      ctx.textAlign = 'center';
      if (highlightStat === 'streak') {
        ctx.font = '900 76px Arial, sans-serif';
        ctx.fillStyle = cardTheme === 'aura' ? '#f97316' : cardTheme === 'titan' ? '#38bdf8' : '#fbbf24';
        ctx.fillText(`🔥 ${streakData.currentStreak} DAYS STREAK`, width / 2, highlightY + (boxH / 2) + 10);
        ctx.font = '700 24px Arial, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText('انضباط رياضي متواصل بدون انقطاع', width / 2, highlightY + (boxH / 2) + 55);
      } else if (highlightStat === 'pr') {
        ctx.font = '900 68px Arial, sans-serif';
        ctx.fillStyle = '#f97316';
        ctx.fillText(`🏋️ ${streakData.bestPRWeightKg} KG RECORD`, width / 2, highlightY + (boxH / 2) + 10);
        ctx.font = '700 24px Arial, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(streakData.bestPRExerciseAr, width / 2, highlightY + (boxH / 2) + 55);
      } else {
        ctx.font = '900 68px Arial, sans-serif';
        ctx.fillStyle = '#38bdf8';
        ctx.fillText(`⚡ ${streakData.totalWorkoutsCompleted} WORKOUTS`, width / 2, highlightY + (boxH / 2) + 10);
        ctx.font = '700 24px Arial, sans-serif';
        ctx.fillStyle = '#cbd5e1';
        ctx.fillText(`${streakData.totalVolumeLiftedKg.toLocaleString()} KG TOTAL VOLUME`, width / 2, highlightY + (boxH / 2) + 55);
      }

      // 6. Metrics Grid
      const gridY = highlightY + boxH + 60;
      const stats = [
        { label: 'الوزن الحالي', val: `${profile.weight} KG`, sub: '-5.6 كجم دهون' },
        { label: 'الكتلة العضلية', val: `${profile.muscleMass} KG`, sub: '+2.1 كجم عضل' },
        { label: 'إجمالي التمارين', val: `${streakData.totalWorkoutsCompleted}`, sub: 'جلسة تدريب' },
        { label: 'الأوسمة المنجزة', val: `${badges.filter((b) => b.isUnlocked).length} أوسمة`, sub: 'معتمدة رسمياً' },
      ];

      const colW = (width - 160) / 2;
      stats.forEach((st, i) => {
        const rx = 80 + (i % 2) * colW;
        const ry = gridY + Math.floor(i / 2) * (format === 'story' ? 160 : 120);
        const cardW = colW - 20;
        const cardH = format === 'story' ? 130 : 100;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.fillRect(rx, ry, cardW, cardH);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.strokeRect(rx, ry, cardW, cardH);

        ctx.textAlign = 'center';
        ctx.font = '700 20px Arial, sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText(st.label, rx + cardW / 2, ry + 36);

        ctx.font = '900 36px Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(st.val, rx + cardW / 2, ry + 78);

        ctx.font = '600 18px Arial, sans-serif';
        ctx.fillStyle = '#f97316';
        ctx.fillText(st.sub, rx + cardW / 2, ry + 108);
      });

      // 7. Footer: Coach Verification & Signature
      const footerY = height - 140;
      ctx.textAlign = 'center';
      ctx.font = '700 26px Arial, sans-serif';
      ctx.fillStyle = '#cbd5e1';
      ctx.fillText(`معتمد رسمياً من الكوتش: ${profile.coachName}`, width / 2, footerY);

      ctx.font = '600 20px Arial, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('JOIN THE REVOLUTION • OWN AURA OUTCOME', width / 2, footerY + 40);

      // Trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `oao-progress-card-${profile.name}-${format}.png`;
      link.href = dataUrl;
      link.click();

      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#38bdf8', '#fbbf24'],
      });
    } catch (err) {
      console.error('Error generating card image:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Native Web Share API or fallback copy
  const handleNativeShare = async () => {
    const shareData = {
      title: `${profile.name} - إنجاز Own Aura Outcome`,
      text: `🔥 حققت ${streakData.currentStreak} يوماً من الالتزام المتواصل و ${streakData.totalWorkoutsCompleted} تمريناً في برنامج Own Aura Outcome مع الكوتش ${profile.coachName}! انضم للثورة الرياضية.`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const unlockedBadges = badges.filter((b) => b.isUnlocked);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl overflow-y-auto animate-in fade-in duration-200">
      <div
        className={`relative w-full max-w-4xl my-auto rounded-3xl border shadow-2xl overflow-hidden transition-all flex flex-col max-h-[92vh] ${
          theme === 'dark'
            ? 'bg-[#070b19] border-orange-500/35 text-white'
            : 'bg-white border-slate-300 text-[#0B132B]'
        }`}
      >
        {/* Top Header Controls */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(249,115,22,0.6)]">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-black">
                {isAr ? 'تصدير كرت الإنجاز الرياضي (Shareable Progress Card)' : 'Shareable Progress Card'}
              </h2>
              <p className="text-xs text-slate-400">
                {isAr ? 'صمّم كرتك الفاخر بجودة عالية لمشاركته على انستقرام وواتساب وتيك توك' : 'Export your high-resolution athletic achievement card for social stories'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Left controls & Right live preview */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-5 space-y-5">
            {/* 1. Format Selector */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">
                {isAr ? '1. مقاس كرت المشاركة (Card Format)' : '1. Card Format'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setFormat('story')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    format === 'story'
                      ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 border-orange-500 text-orange-400 shadow-md ring-2 ring-orange-500/30'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-5 h-5" />
                  <span className="text-xs font-bold">{isAr ? 'ستوري (9:16)' : 'Story 9:16'}</span>
                  <span className="text-[9px] text-slate-400">Snap / Insta</span>
                </button>

                <button
                  onClick={() => setFormat('square')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    format === 'square'
                      ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 border-orange-500 text-orange-400 shadow-md ring-2 ring-orange-500/30'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-5 h-5" />
                  <span className="text-xs font-bold">{isAr ? 'مربع (1:1)' : 'Post 1:1'}</span>
                  <span className="text-[9px] text-slate-400">Feed / X</span>
                </button>

                <button
                  onClick={() => setFormat('card')}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center gap-1 ${
                    format === 'card'
                      ? 'bg-gradient-to-br from-orange-500/20 to-orange-600/30 border-orange-500 text-orange-400 shadow-md ring-2 ring-orange-500/30'
                      : 'bg-black/30 border-white/10 text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  <span className="text-xs font-bold">{isAr ? 'بطاقة VIP' : 'VIP Card'}</span>
                  <span className="text-[9px] text-slate-400">Member Pass</span>
                </button>
              </div>
            </div>

            {/* 2. Theme / Color Mood */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">
                {isAr ? '2. النمط اللوني الفاخر (Color Theme)' : '2. Color Theme'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setCardTheme('aura')}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    cardTheme === 'aura'
                      ? 'border-orange-500 bg-orange-500/15 text-orange-300 ring-2 ring-orange-500/30 font-bold'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]" />
                  <span className="text-xs font-bold">{isAr ? 'لهب الأورا' : 'Aura Flame'}</span>
                </button>

                <button
                  onClick={() => setCardTheme('titan')}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    cardTheme === 'titan'
                      ? 'border-cyan-500 bg-cyan-500/15 text-cyan-300 ring-2 ring-cyan-500/30 font-bold'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-cyan-400 shadow-[0_0_8px_#38bdf8]" />
                  <span className="text-xs font-bold">{isAr ? 'تيتانيوم' : 'Titan Carbon'}</span>
                </button>

                <button
                  onClick={() => setCardTheme('gold')}
                  className={`p-2.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    cardTheme === 'gold'
                      ? 'border-amber-500 bg-amber-500/15 text-amber-300 ring-2 ring-amber-500/30 font-bold'
                      : 'border-white/10 bg-black/30 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24]" />
                  <span className="text-xs font-bold">{isAr ? 'ذهب الأبطال' : 'Royal Gold'}</span>
                </button>
              </div>
            </div>

            {/* 3. Highlight Stat to Feature */}
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-slate-400 block mb-2">
                {isAr ? '3. الإحصائية الرئيسية البارزة (Highlight)' : '3. Featured Stat'}
              </span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setHighlightStat('streak')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    highlightStat === 'streak'
                      ? 'bg-orange-500 text-white border-orange-400'
                      : 'bg-black/20 border-white/10 text-slate-400'
                  }`}
                >
                  🔥 {isAr ? 'سلسلة الأيام' : 'Streak Days'}
                </button>

                <button
                  onClick={() => setHighlightStat('pr')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    highlightStat === 'pr'
                      ? 'bg-orange-500 text-white border-orange-400'
                      : 'bg-black/20 border-white/10 text-slate-400'
                  }`}
                >
                  🏋️ {isAr ? 'الرقم القياسي' : 'Best PR'}
                </button>

                <button
                  onClick={() => setHighlightStat('transformation')}
                  className={`p-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    highlightStat === 'transformation'
                      ? 'bg-orange-500 text-white border-orange-400'
                      : 'bg-black/20 border-white/10 text-slate-400'
                  }`}
                >
                  ⚡ {isAr ? 'إجمالي الجلسات' : 'Total Workouts'}
                </button>
              </div>
            </div>

            {/* 4. Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                onClick={handleExportPNG}
                disabled={isExporting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-orange-600 via-orange-500 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm tracking-wider uppercase shadow-[0_0_25px_rgba(249,115,22,0.6)] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />
                <span>{isExporting ? (isAr ? 'جارِ إنشاء الصورة بدقة عالية...' : 'Rendering Card...') : (isAr ? 'تحميل الصورة عالية الدقة (PNG) 📥' : 'Download High-Res PNG 📥')}</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleNativeShare}
                  className="py-3 rounded-xl bg-blue-950/70 hover:bg-blue-900 border border-cyan-500/40 text-cyan-300 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-cyan-400" />
                  <span>{isAr ? 'مشاركة مباشرة 📲' : 'Share Card'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`🔥 بطل Own Aura Outcome: ${profile.name}\nسلسلة الالتزام: ${streakData.currentStreak} يوماً متواصلاً\nالرتبة: ${athleteRank.nameAr}\nالكوتش: ${profile.coachName}`);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }}
                  className="py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? (isAr ? 'تم النسخ!' : 'Copied!') : (isAr ? 'نسخ النص 📋' : 'Copy Text')}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Live Card Interactive Preview */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              {isAr ? 'معاينة حية للكرت (Live Interactive Preview)' : 'Live Interactive Preview'}
            </span>

            {/* PREVIEW CONTAINER */}
            <div
              ref={cardRef}
              className={`relative overflow-hidden transition-all duration-500 select-none border-2 shadow-2xl flex flex-col justify-between ${
                format === 'story'
                  ? 'w-[320px] sm:w-[350px] min-h-[580px] sm:min-h-[620px] rounded-[36px] p-6'
                  : format === 'square'
                  ? 'w-[320px] sm:w-[400px] h-[320px] sm:h-[400px] rounded-[32px] p-5'
                  : 'w-full max-w-[500px] min-h-[290px] rounded-[28px] p-5'
              } ${
                cardTheme === 'aura'
                  ? 'bg-gradient-to-b from-[#07152e] via-[#040711] to-[#0c0502] border-orange-500/60 shadow-[0_0_50px_rgba(249,115,22,0.25)]'
                  : cardTheme === 'titan'
                  ? 'bg-gradient-to-b from-[#1e293b] via-[#0b0f19] to-[#020617] border-cyan-500/50 shadow-[0_0_50px_rgba(6,182,212,0.25)]'
                  : 'bg-gradient-to-b from-[#1f1607] via-[#0f0c05] to-[#050301] border-amber-500/60 shadow-[0_0_50px_rgba(245,158,11,0.25)]'
              }`}
            >
              {/* Card Ambient Glow Elements */}
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

              {/* Card Top: Logo + Brand + Official Athlete Seal */}
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-black/50 border border-white/20 p-1 flex items-center justify-center">
                    <img src="/logo.png" alt="OAO" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <span className="text-xs font-black tracking-wider uppercase block text-white">
                      OWN <span className="text-orange-500">AURA</span> OUTCOME
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest block">
                      ATHLETE PORTAL
                    </span>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-[10px] font-black flex items-center gap-1 shadow-xs">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{isAr ? 'بطل معتمد' : 'VERIFIED'}</span>
                </div>
              </div>

              {/* Card Middle: Athlete Name, Tier & Highlight */}
              <div className="relative z-10 my-4 text-center">
                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 block mb-1">
                  {athleteRank.nameAr} • LV.{athleteRank.level}
                </span>

                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-wide mb-3">
                  {profile.name}
                </h3>

                {/* Big Highlight Box */}
                <div
                  className={`p-3.5 sm:p-4 rounded-2xl border backdrop-blur-md transition-all ${
                    cardTheme === 'aura'
                      ? 'bg-black/50 border-orange-500/50 shadow-[0_0_25px_rgba(249,115,22,0.3)]'
                      : cardTheme === 'titan'
                      ? 'bg-black/50 border-cyan-500/50 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
                      : 'bg-black/50 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                  }`}
                >
                  {highlightStat === 'streak' ? (
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <Flame className="w-7 h-7 text-orange-400 fill-orange-400 animate-bounce" />
                        <span className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">
                          {streakData.currentStreak}
                        </span>
                        <span className="text-sm font-bold text-white uppercase">
                          {isAr ? 'يوماً متواصلاً' : 'Days Streak'}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-300 block mt-1">
                        {isAr ? '🔥 انضباط رياضي استثنائي دون انقطاع' : '🔥 Unbroken athletic consistency'}
                      </span>
                    </div>
                  ) : highlightStat === 'pr' ? (
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <Dumbbell className="w-6 h-6 text-orange-400" />
                        <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                          {streakData.bestPRWeightKg} KG
                        </span>
                      </div>
                      <span className="text-[10px] text-orange-400 font-bold block mt-1">
                        {streakData.bestPRExerciseAr} (رقم قياسي جديد)
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-center gap-2">
                        <Zap className="w-6 h-6 text-cyan-400" />
                        <span className="text-3xl sm:text-4xl font-black font-mono text-white">
                          {streakData.totalWorkoutsCompleted}
                        </span>
                        <span className="text-sm font-bold text-slate-300">
                          {isAr ? 'تمرين منجز' : 'Workouts Done'}
                        </span>
                      </div>
                      <span className="text-[10px] text-cyan-400 font-bold block mt-1">
                        {streakData.totalVolumeLiftedKg.toLocaleString()} كجم إجمالي الأحمال
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Stats Grid (Visible in story & square formats) */}
              {format !== 'card' && (
                <div className="relative z-10 grid grid-cols-2 gap-2 my-2 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[9px] text-slate-400 block">{isAr ? 'الوزن الحالي' : 'Weight'}</span>
                    <span className="font-black text-sm font-mono text-white">{profile.weight} كجم</span>
                    <span className="text-[8px] text-emerald-400 block font-bold">-5.6 كجم دهون</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[9px] text-slate-400 block">{isAr ? 'الكتلة العضلية' : 'Muscle'}</span>
                    <span className="font-black text-sm font-mono text-white">{profile.muscleMass} كجم</span>
                    <span className="text-[8px] text-orange-400 block font-bold">+2.1 كجم عضل</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[9px] text-slate-400 block">{isAr ? 'أوسمة الإنجاز' : 'Badges'}</span>
                    <span className="font-black text-sm font-mono text-white">
                      {unlockedBadges.length} / {badges.length}
                    </span>
                    <span className="text-[8px] text-cyan-400 block font-bold">{isAr ? 'أوسمة معتمدة' : 'Official'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                    <span className="text-[9px] text-slate-400 block">{isAr ? 'معدل الحضور' : 'Attendance'}</span>
                    <span className="font-black text-sm font-mono text-white">96%</span>
                    <span className="text-[8px] text-amber-400 block font-bold">{isAr ? 'ممتاز جداً' : 'Elite'}</span>
                  </div>
                </div>
              )}

              {/* Card Footer: Coach verification & QR Code mockup */}
              <div className="relative z-10 pt-3 border-t border-white/10 flex items-center justify-between text-[10px]">
                <div>
                  <span className="text-slate-400 block text-[9px]">
                    {isAr ? 'الكوتش المشرف والمعتمد' : 'Head Coach'}
                  </span>
                  <span className="font-bold text-white block">
                    {profile.coachName}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-black/40 border border-white/10 font-mono text-[9px] text-orange-400">
                  <QrCode className="w-3.5 h-3.5 text-orange-400" />
                  <span>OAO-VERIFIED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
