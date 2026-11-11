import React from 'react';
import { X, Play, CheckCircle2, AlertTriangle, Clock, Target } from 'lucide-react';
import { Exercise, Language } from '../types';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0b132b] border border-orange-500/40 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 md:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 rtl:left-4 rtl:right-auto ltr:right-4 ltr:left-auto text-slate-400 hover:text-white p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pe-8">
          <div className="p-2.5 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-orange-400">
            <Play className="w-5 h-5 fill-orange-400" />
          </div>
          <div>
            <h3 className="text-lg md:text-xl font-black text-white">
              {language === 'ar' ? exercise.nameAr : exercise.nameEn}
            </h3>
            <div className="flex items-center gap-3 text-xs text-orange-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                {language === 'ar' ? exercise.targetMuscleAr : exercise.targetMuscleEn}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Clock className="w-3.5 h-3.5 text-orange-400" />
                {exercise.tempo || '2-0-1-0'}
              </span>
            </div>
          </div>
        </div>

        {/* Video Player Box */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/90 border border-white/10 mb-4 shadow-inner flex items-center justify-center group">
          {exercise.videoUrl ? (
            <iframe
              src={exercise.videoUrl}
              title={exercise.nameEn}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <Play className="w-12 h-12 text-orange-400/80 mb-2 group-hover:scale-110 transition-transform" />
              <p className="text-sm font-bold text-white">
                {language === 'ar' ? 'عرض توضيحي ثلاثي الأبعاد للتمرين' : '3D Form Demonstration'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                {language === 'ar'
                  ? 'يتم تشغيل الفيديو المعتمد من قبل الكوتش عمر عدنان لشرح التكنيك الصحيح بدقة'
                  : 'Approved form demonstration verified by Coach Omar Adnan'}
              </p>
            </div>
          )}
        </div>

        {/* Coaching Form Tips */}
        <div className="space-y-3">
          <div className="bg-[#070a14] p-4 rounded-2xl border border-orange-500/20">
            <h4 className="font-bold text-orange-400 text-xs md:text-sm mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{language === 'ar' ? 'تعليمات الأداء والتكنيك المعتمد' : 'Coaching Cues & Proper Execution'}</span>
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200">
              {(language === 'ar' ? exercise.formTipsAr : exercise.formTipsEn).map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-orange-400 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-amber-950/20 border border-amber-500/30 p-3 rounded-2xl text-xs text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">{language === 'ar' ? 'تنبيه الكوتش: ' : "Coach's Warning: "}</span>
              <span>
                {language === 'ar'
                  ? 'لا تضحِّ بالتكنيك والمدى الحركي الكامل من أجل زيادة الوزن. الأولوية لعصر العضلة وحمايتك من الإصابات.'
                  : 'Never compromise full range of motion for heavier weight. Prioritize mind-muscle connection and joint longevity.'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-5 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold text-xs shadow-[0_0_15px_rgba(249,115,22,0.5)] transition-transform active:scale-95"
          >
            {language === 'ar' ? 'فهمت التكنيك، العودة للتمرين 💪' : 'Got the form, back to workout 💪'}
          </button>
        </div>
      </div>
    </div>
  );
};
