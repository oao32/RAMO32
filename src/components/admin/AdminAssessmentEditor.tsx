import React, { useState } from 'react';
import {
  ClientProfile,
  ComprehensiveAnalysisData,
  StreakData,
  AthleteRank,
} from '../../types';
import {
  INITIAL_STREAK_DATA,
  INITIAL_ATHLETE_RANK,
} from '../../data/initialData';
import {
  Activity,
  Sparkles,
  Save,
  CheckCircle2,
  Flame,
  Crown,
  Dumbbell,
  Utensils,
  HeartPulse,
  Plus,
  Trash2,
  Edit3,
  ShieldCheck,
} from 'lucide-react';

interface AdminAssessmentEditorProps {
  profile: ClientProfile;
  onUpdateProfile: (updated: ClientProfile) => void;
  language: 'ar' | 'en';
}

export const AdminAssessmentEditor: React.FC<AdminAssessmentEditorProps> = ({
  profile,
  onUpdateProfile,
  language,
}) => {
  // Analysis Data state
  const [analysisData, setAnalysisData] = useState<ComprehensiveAnalysisData>(() => {
    return (
      profile.analysisData || {
        muscleAnalysis: {
          strengthsTitleAr: 'نقاط القوة والكتلة المكتسبة',
          strengthsItems: [
            { labelAr: 'عضلات الظهر والمجنص', valueAr: 'ممتاز (V-Taper واضح)' },
            { labelAr: 'الصدر الأوسط والسفلي', valueAr: 'كثافة جيدة جداً' },
          ],
          focusTitleAr: 'التركيز الأساسي في الخطة الحالية',
          focusItems: [
            'تكثيف تمارين الصدر العلوي (Incline Angle 30°) لسد الفجوة العلوية.',
            'الرأس الجانبي للكتف بحجم تدريبي 14-16 جلسة أسبوعية لتوسيع العرض.',
            'الرأس الطويل للترايسبس لزيادة سماكة الذراع من الخلف.',
          ],
        },
        nutritionEngineering: {
          goalTitleAr: 'الهدف: تنشيف ذكي مع الحفاظ على القوة العضلية',
          preWorkoutNotesAr: '• وجبة قبل التمرين: 40 جم كارب معقد + 30 جم بروتين سريع قبل التمرين بـ 90 دقيقة.',
          postWorkoutNotesAr: '• وجبة بعد التمرين: 50 جم كارب سريع (موز/أرز أبيض) + 35 جم واي بروتين.',
        },
        trainingProtocol: {
          splitNameAr: 'Push / Pull / Legs / Rest / Upper Body Split',
          overloadNotesAr: 'عند تحقيق الحد الأقصى للتكرارات المستهدفة (مثال: 12 تكرار) في جلستين متتاليتين، يتم زيادة الوزن بمقدار 2.5 كجم إلى 5 كجم تلقائياً.',
          rpeNotesAr: 'جميع الجولات الأساسية تُنفّذ عند RIR 1-2 (أي يتبقى تكرار أو تكراران قبل الفشل العضلي التام) لحماية الجهاز العصبي والاستشفاء السريع.',
        },
        recoveryFramework: {
          sleepNotesAr: '7.5 إلى 8.5 ساعات نوم متواصل في غرفة مظلمة وباردة لتحفيز هرمون النمو البنائي (GH) وتقليل الكورتيزول.',
          supplementItems: [
            '• كرياتين مونوهيدرات: 5 جم',
            '• أوميغا 3 عالي EPA: 2000 ملغ',
            '• مغنيسيوم جلايسينات: 400 ملغ',
            '• فيتامين D3 + K2: 5000 وحدة',
          ],
        },
        customCoachNotes: 'المتدرب ملتزم ولديه استجابة عصبية ممتازة للأوزان الحرة.',
      }
    );
  });

  // Streak & Rank State
  const [streakData, setStreakData] = useState<StreakData>(() => {
    try {
      const saved = localStorage.getItem('oao_streak_data');
      return saved ? JSON.parse(saved) : profile.streakData || INITIAL_STREAK_DATA;
    } catch {
      return INITIAL_STREAK_DATA;
    }
  });

  const [athleteRank, setAthleteRank] = useState<AthleteRank>(() => {
    try {
      const saved = localStorage.getItem('oao_athlete_rank');
      return saved ? JSON.parse(saved) : profile.athleteRank || INITIAL_ATHLETE_RANK;
    } catch {
      return INITIAL_ATHLETE_RANK;
    }
  });

  const [savedNotice, setSavedNotice] = useState(false);

  // Form field helpers
  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProfile: ClientProfile = {
      ...profile,
      analysisData,
      streakData,
      athleteRank,
    };

    onUpdateProfile(updatedProfile);

    // Also mirror to global storage keys
    localStorage.setItem('oao_client_profile', JSON.stringify(updatedProfile));
    localStorage.setItem('oao_streak_data', JSON.stringify(streakData));
    localStorage.setItem('oao_athlete_rank', JSON.stringify(athleteRank));

    window.dispatchEvent(new CustomEvent('oao_profile_updated', { detail: updatedProfile }));
    window.dispatchEvent(new CustomEvent('oao_streak_updated', { detail: streakData }));
    window.dispatchEvent(new CustomEvent('oao_rank_updated', { detail: athleteRank }));
    window.dispatchEvent(new Event('storage'));

    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  // Strength Items helper
  const handleAddStrengthItem = () => {
    const current = analysisData.muscleAnalysis?.strengthsItems || [];
    setAnalysisData({
      ...analysisData,
      muscleAnalysis: {
        ...analysisData.muscleAnalysis,
        strengthsItems: [...current, { labelAr: 'عضلة جديدة', valueAr: 'تطور ممتاز' }],
      },
    });
  };

  const handleRemoveStrengthItem = (index: number) => {
    const current = [...(analysisData.muscleAnalysis?.strengthsItems || [])];
    current.splice(index, 1);
    setAnalysisData({
      ...analysisData,
      muscleAnalysis: {
        ...analysisData.muscleAnalysis,
        strengthsItems: current,
      },
    });
  };

  // Focus Items helper
  const handleAddFocusItem = () => {
    const current = analysisData.muscleAnalysis?.focusItems || [];
    setAnalysisData({
      ...analysisData,
      muscleAnalysis: {
        ...analysisData.muscleAnalysis,
        focusItems: [...current, 'توجيه جديد للتركيز التدريبي في هذه المرحلة.'],
      },
    });
  };

  const handleRemoveFocusItem = (index: number) => {
    const current = [...(analysisData.muscleAnalysis?.focusItems || [])];
    current.splice(index, 1);
    setAnalysisData({
      ...analysisData,
      muscleAnalysis: {
        ...analysisData.muscleAnalysis,
        focusItems: current,
      },
    });
  };

  return (
    <form onSubmit={handleSaveAll} className="space-y-6">
      {/* Header */}
      <div className="bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-orange-400" />
            <span>محرر التقييم العام والتحليل الشامل للمشترك (Dynamic Assessment)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            إدارة بطاقات التحليل العضلي، نقاط القوة، التوجيه الغذائي، خطة الاستشفاء، ورتبة المتدرب وسلسلة الالتزام
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedNotice && (
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              <span>تم حفظ التقييم فورياً!</span>
            </div>
          )}

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ التقييم الشامل</span>
          </button>
        </div>
      </div>

      {/* 1. التحليل المقطعي والبنية العضلية */}
      <div className="p-6 rounded-3xl bg-[#0B132B]/90 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-orange-400" />
            <h3 className="text-base font-black text-white">1. التحليل المقطعي والبنية العضلية</h3>
          </div>
          <span className="text-xs text-orange-400 font-bold">بطاقة التحليل العضلي</span>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">عنوان نقاط القوة:</label>
            <input
              type="text"
              value={analysisData.muscleAnalysis?.strengthsTitleAr || ''}
              onChange={(e) =>
                setAnalysisData({
                  ...analysisData,
                  muscleAnalysis: {
                    ...analysisData.muscleAnalysis,
                    strengthsTitleAr: e.target.value,
                  },
                })
              }
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
            />
          </div>

          {/* Strengths Items List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">عناصر نقاط القوة والكتلة المكتسبة:</span>
              <button
                type="button"
                onClick={handleAddStrengthItem}
                className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة نقطة قوة</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(analysisData.muscleAnalysis?.strengthsItems || []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-2xl bg-black/40 border border-white/10 flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={item.labelAr}
                    onChange={(e) => {
                      const updated = [...(analysisData.muscleAnalysis?.strengthsItems || [])];
                      updated[idx] = { ...updated[idx], labelAr: e.target.value };
                      setAnalysisData({
                        ...analysisData,
                        muscleAnalysis: { ...analysisData.muscleAnalysis, strengthsItems: updated },
                      });
                    }}
                    placeholder="اسم العضلة"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-white font-bold text-xs outline-none"
                  />
                  <input
                    type="text"
                    value={item.valueAr}
                    onChange={(e) => {
                      const updated = [...(analysisData.muscleAnalysis?.strengthsItems || [])];
                      updated[idx] = { ...updated[idx], valueAr: e.target.value };
                      setAnalysisData({
                        ...analysisData,
                        muscleAnalysis: { ...analysisData.muscleAnalysis, strengthsItems: updated },
                      });
                    }}
                    placeholder="التقييم"
                    className="w-32 px-3 py-1.5 rounded-lg bg-black/60 border border-white/15 text-emerald-400 font-bold text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveStrengthItem(idx)}
                    className="p-1.5 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Focus Points List */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-300">نقاط التركيز الأساسي في الخطة الحالية:</span>
              <button
                type="button"
                onClick={handleAddFocusItem}
                className="px-2.5 py-1 rounded-lg bg-orange-500/20 text-orange-400 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>إضافة نقطة تركيز</span>
              </button>
            </div>

            <div className="space-y-2">
              {(analysisData.muscleAnalysis?.focusItems || []).map((point, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={point}
                    onChange={(e) => {
                      const updated = [...(analysisData.muscleAnalysis?.focusItems || [])];
                      updated[idx] = e.target.value;
                      setAnalysisData({
                        ...analysisData,
                        muscleAnalysis: { ...analysisData.muscleAnalysis, focusItems: updated },
                      });
                    }}
                    className="flex-1 px-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveFocusItem(idx)}
                    className="p-2 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Custom Coach Note */}
          <div className="pt-2">
            <label className="text-slate-300 font-bold block mb-1">
              ملاحظة خاصة واستثنائية من الكوتش عمر للمتدرب:
            </label>
            <textarea
              rows={2}
              value={analysisData.customCoachNotes || ''}
              onChange={(e) =>
                setAnalysisData({ ...analysisData, customCoachNotes: e.target.value })
              }
              placeholder="اكتب ملاحظة أو توجيهاً خاصاً يظهر في نافذة التحليل للمشترك..."
              className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
            />
          </div>
        </div>
      </div>

      {/* 2. الهندسة الغذائية وبروتوكول التدريب */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* الهندسة الغذائية */}
        <div className="p-6 rounded-3xl bg-[#0B132B]/90 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Utensils className="w-5 h-5 text-blue-400" />
            <h3 className="text-base font-black text-white">2. الهندسة الغذائية وتوزيع الماكروز</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">عنوان الهدف الغذائي:</label>
              <input
                type="text"
                value={analysisData.nutritionEngineering?.goalTitleAr || ''}
                onChange={(e) =>
                  setAnalysisData({
                    ...analysisData,
                    nutritionEngineering: {
                      ...analysisData.nutritionEngineering,
                      goalTitleAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">توجيه وجبة قبل التمرين:</label>
              <input
                type="text"
                value={analysisData.nutritionEngineering?.preWorkoutNotesAr || ''}
                onChange={(e) =>
                  setAnalysisData({
                    ...analysisData,
                    nutritionEngineering: {
                      ...analysisData.nutritionEngineering,
                      preWorkoutNotesAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">توجيه وجبة بعد التمرين:</label>
              <input
                type="text"
                value={analysisData.nutritionEngineering?.postWorkoutNotesAr || ''}
                onChange={(e) =>
                  setAnalysisData({
                    ...analysisData,
                    nutritionEngineering: {
                      ...analysisData.nutritionEngineering,
                      postWorkoutNotesAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none"
              />
            </div>
          </div>
        </div>

        {/* بروتوكول التدريب والاستشفاء */}
        <div className="p-6 rounded-3xl bg-[#0B132B]/90 border border-white/10 space-y-4">
          <div className="flex items-center gap-2 border-b border-white/10 pb-3">
            <Dumbbell className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-black text-white">3. بروتوكول التدريب والاستشفاء</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-300 font-bold block mb-1">مسمى نظام التقسيم (Split):</label>
              <input
                type="text"
                value={analysisData.trainingProtocol?.splitNameAr || ''}
                onChange={(e) =>
                  setAnalysisData({
                    ...analysisData,
                    trainingProtocol: {
                      ...analysisData.trainingProtocol,
                      splitNameAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">قاعدة الزيادة التدريجية:</label>
              <input
                type="text"
                value={analysisData.trainingProtocol?.overloadNotesAr || ''}
                onChange={(e) =>
                  setAnalysisData({
                    ...analysisData,
                    trainingProtocol: {
                      ...analysisData.trainingProtocol,
                      overloadNotesAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-slate-300 font-bold block mb-1">إرشادات النوم والاستشفاء:</label>
              <input
                type="text"
                value={analysisData.recoveryFramework?.sleepNotesAr || ''}
                onChange={(e) =>
                  setAnalysisData({
                    ...analysisData,
                    recoveryFramework: {
                      ...analysisData.recoveryFramework,
                      sleepNotesAr: e.target.value,
                    },
                  })
                }
                className="w-full px-4 py-2 rounded-xl bg-black/50 border border-white/15 text-white outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. رتبة المتدرب وسلسلة الالتزام (Streak & Rank Gamification) */}
      <div className="p-6 rounded-3xl bg-[#0B132B]/90 border border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-black text-white">
              4. رتبة المتدرب ومؤشرات سلسلة الالتزام (Gamification)
            </h3>
          </div>
          <span className="text-xs text-orange-400 font-bold">نقاط الـ XP والـ Streak</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1.5">رتبة المتدرب:</label>
            <select
              value={athleteRank.tier}
              onChange={(e) =>
                setAthleteRank({
                  ...athleteRank,
                  tier: e.target.value as any,
                  nameAr:
                    e.target.value === 'legend'
                      ? 'الأسطورة الذهبي (Legend)'
                      : e.target.value === 'platinum'
                      ? 'البلاتينيوم الجبار (Titan)'
                      : e.target.value === 'gold'
                      ? 'الذهبي المتقدم (Gold)'
                      : 'الفضي الصاعد (Silver)',
                })
              }
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white font-bold outline-none"
            >
              <option value="bronze">برونزي (Bronze)</option>
              <option value="silver">فضي (Silver)</option>
              <option value="gold">ذهبي (Gold)</option>
              <option value="platinum">بلاتينيوم (Platinum Titan)</option>
              <option value="legend">أسطورة (Legend)</option>
            </select>
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">المستوى الحالي (Level):</label>
            <input
              type="number"
              value={athleteRank.level}
              onChange={(e) => setAthleteRank({ ...athleteRank, level: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white font-mono font-bold outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">أيام الستريك الحالية:</label>
            <input
              type="number"
              value={streakData.currentStreak}
              onChange={(e) =>
                setStreakData({ ...streakData, currentStreak: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-orange-400 font-mono font-bold outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">أعلى ستريك قياسي:</label>
            <input
              type="number"
              value={streakData.longestStreak}
              onChange={(e) =>
                setStreakData({ ...streakData, longestStreak: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-amber-400 font-mono font-bold outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">نقاط الـ XP الحالية:</label>
            <input
              type="number"
              value={athleteRank.currentXp}
              onChange={(e) =>
                setAthleteRank({ ...athleteRank, currentXp: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-cyan-400 font-mono font-bold outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">نقاط المستوى التالي:</label>
            <input
              type="number"
              value={athleteRank.nextLevelXp}
              onChange={(e) =>
                setAthleteRank({ ...athleteRank, nextLevelXp: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-slate-300 font-mono font-bold outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">رصيد تجميد الستريك:</label>
            <input
              type="number"
              value={streakData.freezesRemaining}
              onChange={(e) =>
                setStreakData({ ...streakData, freezesRemaining: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-blue-400 font-mono font-bold outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1.5">إجمالي الأوزان المرفوعة (كجم):</label>
            <input
              type="number"
              value={streakData.totalVolumeLiftedKg}
              onChange={(e) =>
                setStreakData({ ...streakData, totalVolumeLiftedKg: Number(e.target.value) })}
              className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/15 text-emerald-400 font-mono font-bold outline-none"
            />
          </div>
        </div>
      </div>

      {/* Bottom Save Bar */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-[#0B132B]/80 border border-white/10">
        <span className="text-xs text-slate-400">
          💡 تنعكس جميع التعديلات المحفوظة هنا مباشرة داخل بوابات المشتركين وبطاقات التحليل الشامل.
        </span>

        <button
          type="submit"
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-lg cursor-pointer"
        >
          حفظ التقييم وتحديث حساب المشترك
        </button>
      </div>
    </form>
  );
};
