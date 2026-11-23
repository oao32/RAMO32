import React from 'react';
import { X, Play, AlertTriangle, Clock, Target } from 'lucide-react';
import { Exercise, Language } from '../types';
import { toYouTubeEmbedUrl } from '../lib/youtube';

const DEFAULT_COACH_WARNING_AR =
  'لا تضحِّ بالتكنيك والمدى الحركي الكامل من أجل زيادة الوزن. الأولوية لعصر العضلة وحمايتك من الإصابات.';
const DEFAULT_COACH_WARNING_EN =
  'Never compromise full range of motion for heavier weight. Prioritize mind-muscle connection and joint longevity.';

interface VideoModalProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  exercise,
  isOpen,
  onClose,
  language,
}) => {
  if (!isOpen || !exercise) return null;

  const embedUrl = toYouTubeEmbedUrl(exercise.videoUrl);
  const coachWarningText =
    exercise.coachWarning?.trim() ||
    (language === 'ar' ? DEFAULT_COACH_WARNING_AR : DEFAULT_COACH_WARNING_EN);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 dark:bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#FAFBFD] dark:bg-[#0b132b] border border-orange-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 md:p-6 shadow-2xl dark:shadow-[0_0_50px_rgba(0,0,0,0.9)] text-[#0B132B] dark:text-white relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rtl:left-4 rtl:right-auto ltr:right-4 ltr:left-auto text-slate-600 dark:text-slate-400 hover:text-[#0B132B] dark:hover:text-white p-2 rounded-full bg-slate-200/80 dark:bg-white/5 hover:bg-slate-300/80 dark:hover:bg-white/10 transition-colors z-20 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pe-8">
          <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-600 dark:text-orange-400">
            <Play className="w-5 h-5 fill-orange-500 dark:fill-orange-400" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-[#0B132B] dark:text-white">
              {language === 'ar' ? exercise.nameAr : exercise.nameEn}
            </h3>
            <div className="flex items-center gap-3 text-xs text-orange-600 dark:text-orange-400 mt-0.5">
              <span className="flex items-center gap-1 font-bold">
                <Target className="w-3.5 h-3.5" />
                {language === 'ar' ? exercise.targetMuscleAr : exercise.targetMuscleEn}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                <Clock className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                {exercise.tempo || '2-0-1-0'}
              </span>
            </div>
          </div>
        </div>

        {/* Video Player Box */}
        {embedUrl ? (
          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/95 border border-slate-300 dark:border-white/10 mb-4 shadow-inner">
            <iframe
              src={embedUrl}
              title={exercise.nameEn}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="w-full rounded-2xl bg-slate-100 dark:bg-[#070a14] border border-slate-300 dark:border-white/10 p-6 mb-4 text-center">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
              {language === 'ar' ? 'الفيديو غير متوفر' : 'Video unavailable'}
            </p>
          </div>
        )}

        {/* Coach's Warning */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-500/30 p-3 rounded-2xl text-xs text-amber-900 dark:text-amber-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">{language === 'ar' ? 'تنبيه الكوتش: ' : "Coach's Warning: "}</span>
            <span>{coachWarningText}</span>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-transform active:scale-95 cursor-pointer"
          >
            {language === 'ar' ? 'فهمت التكنيك، العودة للتمرين 💪' : 'Got the form, back to workout 💪'}
          </button>
        </div>
      </div>
    </div>
  );
};
