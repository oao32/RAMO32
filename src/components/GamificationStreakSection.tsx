import React, { useState } from 'react';
import {
  Flame,
  Award,
  Zap,
  Trophy,
  Shield,
  Target,
  Droplet,
  Sunrise,
  Crown,
  Dumbbell,
  CheckCircle2,
  Lock,
  Sparkles,
  Share2,
  Calendar,
  ChevronRight,
  Info,
  X,
  Snowflake,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Badge, StreakData, AthleteRank, Language, Theme } from '../types';

interface GamificationStreakSectionProps {
  streakData: StreakData;
  badges: Badge[];
  athleteRank: AthleteRank;
  onLogTodayWorkout: () => void;
  onUseStreakFreeze: () => void;
  onOpenShareCard: () => void;
  language: Language;
  theme: Theme;
}

export const GamificationStreakSection: React.FC<GamificationStreakSectionProps> = ({
  streakData,
  badges,
  athleteRank,
  onLogTodayWorkout,
  onUseStreakFreeze,
  onOpenShareCard,
  language,
  theme,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'streak' | 'strength' | 'nutrition' | 'special'>('all');
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null);

  const isAr = language === 'ar';

  const triggerBadgeCelebration = (badge: Badge) => {
    setSelectedBadge(badge);
    if (badge.isUnlocked) {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ea580c', '#f97316', '#38bdf8', '#fbbf24', '#ffffff'],
      });
    }
  };

  const filteredBadges = badges.filter((b) => {
    if (selectedCategory === 'all') return true;
    return b.category === selectedCategory;
  });

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;
  const xpPercentage = Math.min(100, Math.round((athleteRank.currentXp / athleteRank.nextLevelXp) * 100));

  const getBadgeIcon = (iconName: string) => {
    const props = { className: 'w-6 h-6' };
    switch (iconName) {
      case 'Flame': return <Flame {...props} />;
      case 'Shield': return <Shield {...props} />;
      case 'Zap': return <Zap {...props} />;
      case 'Dumbbell': return <Dumbbell {...props} />;
      case 'Droplet': return <Droplet {...props} />;
      case 'Target': return <Target {...props} />;
      case 'Award': return <Award {...props} />;
      case 'Crown': return <Crown {...props} />;
      case 'Trophy': return <Trophy {...props} />;
      case 'Sunrise': return <Sunrise {...props} />;
      default: return <Sparkles {...props} />;
    }
  };

  const getRarityBadgeStyle = (rarity: string) => {
    switch (rarity) {
      case 'legendary':
        return 'from-amber-500/20 via-orange-500/30 to-amber-600/30 border-amber-500/70 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.35)]';
      case 'epic':
        return 'from-purple-500/20 via-indigo-500/30 to-purple-600/30 border-purple-500/60 text-purple-300 shadow-[0_0_18px_rgba(168,85,247,0.3)]';
      case 'rare':
        return 'from-blue-500/20 via-cyan-500/30 to-blue-600/30 border-blue-500/60 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.25)]';
      default:
        return 'from-slate-700/30 via-slate-800/40 to-slate-900/40 border-slate-600/40 text-slate-300';
    }
  };

  const getRarityLabel = (rarity: string) => {
    if (isAr) {
      switch (rarity) {
        case 'legendary': return 'أسطوري (Legendary)';
        case 'epic': return 'ملحمي (Epic)';
        case 'rare': return 'نادر (Rare)';
        default: return 'شائع (Common)';
      }
    }
    return rarity.toUpperCase();
  };

  return (
    <section className="space-y-6">
      {/* 1. TOP STREAK & XP HERO BANNER */}
      <div
        className={`relative rounded-3xl p-6 sm:p-8 border overflow-hidden transition-all duration-300 shadow-2xl ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-[#101b33] via-[#070b19] to-[#04060d] border-orange-500/30'
            : 'bg-gradient-to-br from-[#FAFBFD] via-[#F3F6FA] to-[#E9EEF5] border-slate-300 shadow-[0_12px_40px_rgba(11,19,43,0.08)]'
        }`}
      >
        {/* Ambient Backlight Aura */}
        <div className="absolute -top-20 -left-20 w-80 h-80 bg-orange-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-cyan-600/15 rounded-full blur-[100px] pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Col 1: Big Streak Flame Counter */}
          <div className="lg:col-span-5 flex flex-col items-center lg:items-start text-center lg:text-start">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-400 font-extrabold text-[11px] uppercase tracking-wider mb-3 shadow-[0_0_15px_rgba(249,115,22,0.3)]">
              <Flame className="w-3.5 h-3.5 animate-bounce text-orange-400" />
              <span>{isAr ? 'سلسلة الالتزام الرياضي (Workout Streak)' : 'Workout Streak System'}</span>
            </div>

            <div className="flex items-baseline gap-3 my-1">
              <span className="text-5xl sm:text-6xl md:text-7xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500 drop-shadow-[0_2px_15px_rgba(249,115,22,0.6)]">
                {streakData.currentStreak}
              </span>
              <div className="flex flex-col items-start">
                <span className={`text-xl sm:text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#0B132B]'}`}>
                  {isAr ? 'يوماً متواصلاً' : 'Days Streak'}
                </span>
                <span className="text-xs text-orange-400 font-bold">
                  {isAr ? `🔥 الرقم القياسي: ${streakData.longestStreak} يوماً` : `🔥 Record: ${streakData.longestStreak} Days`}
                </span>
              </div>
            </div>

            <p className={`text-xs sm:text-sm mt-2 max-w-md ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {isAr
                ? 'استمرارك اليومي يحمي السلسلة ويرفع نقاط خبرتك نحو رتبة الأساطير في Own Aura Outcome.'
                : 'Consistent daily training protects your streak and accelerates your rank to Legend status.'}
            </p>

            {/* Quick Action CTA Buttons */}
            <div className="flex flex-wrap items-center gap-3 mt-5">
              <button
                onClick={() => {
                  onLogTodayWorkout();
                  confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 },
                    colors: ['#ea580c', '#38bdf8', '#ffffff'],
                  });
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(249,115,22,0.6)] transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Flame className="w-4 h-4" />
                <span>{isAr ? 'تسجيل تمرين اليوم (+50 XP) 🔥' : 'Log Today Workout (+50 XP)'}</span>
              </button>

              <button
                onClick={onOpenShareCard}
                className={`px-4 py-2.5 rounded-xl border font-bold text-xs sm:text-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2 ${
                  theme === 'dark'
                    ? 'bg-blue-950/60 hover:bg-blue-900/60 border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : 'bg-white hover:bg-slate-100 border-slate-300 text-[#0B132B] shadow-xs'
                }`}
              >
                <Share2 className="w-4 h-4 text-cyan-400" />
                <span>{isAr ? 'تصدير كرت الإنجاز 📲' : 'Export Progress Card 📲'}</span>
              </button>
            </div>
          </div>

          {/* Col 2: Athlete Rank, Level, XP & 7-Day Flame Track */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5">
            {/* Athlete Level & XP Progress Card */}
            <div
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                theme === 'dark'
                  ? 'bg-black/40 border-white/10 backdrop-blur-md'
                  : 'bg-white border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white flex items-center justify-center font-black text-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-400/40">
                    LV.{athleteRank.level}
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                      {isAr ? 'الرتبة الرياضية الحالية' : 'CURRENT ATHLETE TIER'}
                    </span>
                    <span className={`text-base font-black ${theme === 'dark' ? 'text-white' : 'text-[#0B132B]'}`}>
                      {athleteRank.nameAr}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-bold font-mono text-orange-400 block">
                    {athleteRank.currentXp} / {athleteRank.nextLevelXp} XP
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {isAr ? `متبقي ${athleteRank.nextLevelXp - athleteRank.currentXp} XP للرتبة التالية` : `${athleteRank.nextLevelXp - athleteRank.currentXp} XP to next level`}
                  </span>
                </div>
              </div>

              {/* XP Progress Bar */}
              <div className="w-full bg-slate-800/80 rounded-full h-3 overflow-hidden p-0.5 border border-white/10 relative">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400 shadow-[0_0_12px_rgba(249,115,22,0.8)] transition-all duration-700 relative"
                  style={{ width: `${xpPercentage}%` }}
                >
                  <div className="absolute inset-0 bg-white/20 animate-pulse" />
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2">
                <span>{isAr ? 'البلاتينيوم (Titan)' : 'Platinum'}</span>
                <span className="font-bold text-cyan-400">{xpPercentage}%</span>
                <span className="text-amber-400 font-bold">{isAr ? 'الأسطوري (Legend Aura)' : 'Legend Aura'}</span>
              </div>
            </div>

            {/* 7-Day Flame Calendar */}
            <div
              className={`p-4 rounded-2xl border ${
                theme === 'dark'
                  ? 'bg-black/30 border-white/10'
                  : 'bg-white border-slate-300 shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  <span className={`text-xs font-black uppercase tracking-wider ${theme === 'dark' ? 'text-white' : 'text-[#0B132B]'}`}>
                    {isAr ? 'جدول التزام الأسبوع الحالي' : 'Weekly Streak Track'}
                  </span>
                </div>

                {/* Freeze Status Pill */}
                <button
                  onClick={onUseStreakFreeze}
                  className={`text-[10px] px-2.5 py-1 rounded-full border flex items-center gap-1 font-bold transition-all cursor-pointer ${
                    streakData.freezesRemaining > 0
                      ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 hover:bg-cyan-500/20'
                      : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                  title={isAr ? 'تجميد السلسلة ليوم راحة أو سفر' : 'Freeze streak for rest day'}
                >
                  <Snowflake className="w-3 h-3 text-cyan-400" />
                  <span>
                    {isAr
                      ? `حماية السلسلة: ${streakData.freezesRemaining} متوفر`
                      : `Freeze: ${streakData.freezesRemaining} Left`}
                  </span>
                </button>
              </div>

              {/* 7 Days Row */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {streakData.weeklyActivity.map((day, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      day.isToday
                        ? 'border-orange-500 ring-2 ring-orange-500/40 bg-orange-500/10'
                        : day.isCompleted
                        ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                        : day.isRestDay
                        ? 'border-slate-700/60 bg-slate-800/40 text-slate-400'
                        : 'border-white/5 bg-black/20 text-slate-500'
                    }`}
                  >
                    <span className="text-[10px] font-bold block mb-1">
                      {isAr ? day.shortNameAr : day.shortNameEn}
                    </span>

                    <div className="w-7 h-7 rounded-full flex items-center justify-center my-0.5">
                      {day.isCompleted ? (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-[0_0_10px_rgba(249,115,22,0.8)] animate-pulse">
                          <Flame className="w-4 h-4 fill-white" />
                        </div>
                      ) : day.isRestDay ? (
                        <div className="w-7 h-7 rounded-full bg-slate-700/70 flex items-center justify-center text-slate-300">
                          <Shield className="w-3.5 h-3.5" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border border-dashed border-slate-600 flex items-center justify-center text-slate-500 text-[9px]">
                          —
                        </div>
                      )}
                    </div>

                    <span className="text-[9px] font-semibold truncate max-w-full block text-slate-400 mt-1">
                      {day.isRestDay ? (isAr ? 'راحة' : 'Rest') : day.isCompleted ? (isAr ? 'أُنجز' : 'Done') : (isAr ? 'قادم' : 'Pending')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. BADGES & ACHIEVEMENTS SHOWCASE */}
      <div
        className={`rounded-3xl p-6 sm:p-8 border transition-all ${
          theme === 'dark'
            ? 'bg-[#0b132b]/80 border-orange-500/25 shadow-xl'
            : 'bg-[#FAFBFD] border-slate-300 shadow-[0_8px_30px_rgba(11,19,43,0.06)]'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-500" />
              <h2 className={`text-xl sm:text-2xl font-black ${theme === 'dark' ? 'text-white' : 'text-[#0B132B]'}`}>
                {isAr ? 'لوحة الأوسمة والإنجازات (Badges & Trophies)' : 'Badges & Achievements'}
              </h2>
            </div>
            <p className={`text-xs sm:text-sm mt-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
              {isAr
                ? `لقد فتحت ${unlockedCount} من أصل ${badges.length} وساماً معتمداً في برنامجك الرياضي`
                : `You have unlocked ${unlockedCount} of ${badges.length} official badges in your program`}
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-md">
            {[
              { key: 'all', labelAr: 'الكل', labelEn: 'All' },
              { key: 'streak', labelAr: 'سلاسل الالتزام', labelEn: 'Streaks' },
              { key: 'strength', labelAr: 'الأوزان والقوة', labelEn: 'Strength' },
              { key: 'nutrition', labelAr: 'التغذية والماء', labelEn: 'Nutrition' },
              { key: 'special', labelAr: 'شرف النادي', labelEn: 'Elite' },
            ].map((cat) => (
              <button
                key={cat.key}
                onClick={() => setSelectedCategory(cat.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat.key
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isAr ? cat.labelAr : cat.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {filteredBadges.map((badge) => {
            const isUnlocked = badge.isUnlocked;
            return (
              <div
                key={badge.id}
                onClick={() => triggerBadgeCelebration(badge)}
                className={`relative rounded-2xl p-4 border transition-all duration-300 cursor-pointer group flex flex-col items-center text-center select-none ${
                  isUnlocked
                    ? `bg-gradient-to-b ${getRarityBadgeStyle(badge.rarity)} hover:scale-105 hover:-translate-y-1`
                    : 'bg-black/20 border-white/5 opacity-60 hover:opacity-80'
                }`}
              >
                {/* Unlocked / Locked Icon Badge */}
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 group-hover:scale-110 shadow-lg ${
                    isUnlocked
                      ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-orange-500/40'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {isUnlocked ? getBadgeIcon(badge.iconName) : <Lock className="w-5 h-5" />}
                </div>

                {/* Badge Title */}
                <h3
                  className={`font-black text-xs sm:text-sm line-clamp-1 mb-1 ${
                    isUnlocked ? (theme === 'dark' ? 'text-white' : 'text-[#0B132B]') : 'text-slate-400'
                  }`}
                >
                  {isAr ? badge.titleAr : badge.titleEn}
                </h3>

                {/* Short Rarity & XP */}
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-black/40 border border-white/10 text-orange-400">
                    +{badge.xpReward} XP
                  </span>
                </div>

                {/* Progress bar if locked with progress */}
                {!isUnlocked && badge.progress && (
                  <div className="w-full mt-auto pt-2">
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold mb-1">
                      <span>{isAr ? 'التقدم' : 'Progress'}</span>
                      <span>
                        {badge.progress.current} / {badge.progress.target}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full bg-orange-500 rounded-full"
                        style={{ width: `${(badge.progress.current / badge.progress.target) * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Checkmark indicator for unlocked */}
                {isUnlocked && (
                  <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <CheckCircle2 className="w-3 h-3" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BADGE DETAIL MODAL WITH CELEBRATION */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className={`relative w-full max-w-md rounded-3xl p-6 sm:p-8 border shadow-2xl overflow-hidden transition-all text-center ${
              theme === 'dark'
                ? 'bg-gradient-to-b from-[#1c2541] to-[#070b19] border-orange-500/40 text-white'
                : 'bg-white border-slate-300 text-[#0B132B]'
            }`}
          >
            {/* Ambient Background Aura */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-orange-500/20 rounded-full blur-3xl pointer-events-none" />

            <button
              onClick={() => setSelectedBadge(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Glowing Icon */}
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-orange-500 via-amber-400 to-orange-600 text-white flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.8)] border-2 border-white/40 mb-4 animate-bounce">
              {getBadgeIcon(selectedBadge.iconName)}
            </div>

            <span className="text-[10px] font-black tracking-widest uppercase px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/40 text-orange-400 mb-2 inline-block">
              {getRarityLabel(selectedBadge.rarity)}
            </span>

            <h3 className="text-xl sm:text-2xl font-black mb-2">
              {isAr ? selectedBadge.titleAr : selectedBadge.titleEn}
            </h3>

            <p className={`text-xs sm:text-sm mb-5 leading-relaxed ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
              {isAr ? selectedBadge.descriptionAr : selectedBadge.descriptionEn}
            </p>

            {/* Badge Metadata Pill Grid */}
            <div className="grid grid-cols-2 gap-3 mb-6 text-xs">
              <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                <span className="text-slate-400 block text-[10px] mb-1">{isAr ? 'مكافأة نقاط الخبرة' : 'XP Reward'}</span>
                <span className="font-black text-orange-400">+{selectedBadge.xpReward} XP</span>
              </div>
              <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                <span className="text-slate-400 block text-[10px] mb-1">{isAr ? 'تاريخ الإنجاز' : 'Date Unlocked'}</span>
                <span className="font-bold">
                  {selectedBadge.unlockedDate ? selectedBadge.unlockedDate : isAr ? 'قيد الإنجاز' : 'In Progress'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedBadge(null);
                  onOpenShareCard();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_20px_rgba(249,115,22,0.6)] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>{isAr ? 'شارك الإنجاز في كرتك الخاص 🔥' : 'Share on Progress Card'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
