import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Language, Theme } from '../types';
import { useOaoTheme } from '../lib/themeUtils';

export type BodyMetricKey = 'fat' | 'muscle' | 'weight';

export interface BodyCompositionPoint {
  fat: number;
  muscle: number;
  weight: number;
}

export interface BodyMetricConfig {
  labelAr: string;
  labelEn: string;
  unitAr: string;
  unitEn: string;
  color: string;
  lightColor: string;
  good: 'down' | 'up';
}

// ===== Editable Demo Data Config (12 Weeks, Presentational Only) =====
const DATA: BodyCompositionPoint[] = [
  { fat: 24.8, muscle: 31.2, weight: 84.5 },
  { fat: 24.1, muscle: 31.5, weight: 83.6 },
  { fat: 23.5, muscle: 31.9, weight: 82.9 },
  { fat: 22.6, muscle: 32.2, weight: 82.0 },
  { fat: 21.9, muscle: 32.8, weight: 81.2 },
  { fat: 21.2, muscle: 33.1, weight: 80.5 },
  { fat: 20.4, muscle: 33.5, weight: 79.8 },
  { fat: 19.7, muscle: 33.9, weight: 79.1 },
  { fat: 19.0, muscle: 34.3, weight: 78.5 },
  { fat: 18.2, muscle: 34.6, weight: 77.9 },
  { fat: 17.5, muscle: 35.0, weight: 77.3 },
  { fat: 16.9, muscle: 35.4, weight: 76.8 },
];

const METRICS: Record<BodyMetricKey, BodyMetricConfig> = {
  fat: {
    labelAr: 'نسبة الدهون',
    labelEn: 'Body Fat',
    unitAr: '%',
    unitEn: '%',
    color: '#f97316',
    lightColor: '#ea580c',
    good: 'down',
  },
  muscle: {
    labelAr: 'الكتلة العضلية',
    labelEn: 'Muscle Mass',
    unitAr: 'كجم',
    unitEn: 'kg',
    color: '#4d9bff',
    lightColor: '#1d4ed8',
    good: 'up',
  },
  weight: {
    labelAr: 'الوزن',
    labelEn: 'Weight',
    unitAr: 'كجم',
    unitEn: 'kg',
    color: '#e8e3d6',
    lightColor: '#1e293b',
    good: 'down',
  },
};
// =====================================================================

const SVG_W = 640;
const SVG_H = 260;
const PAD = { l: 16, r: 36, t: 16, b: 32 };
const X_TICKS = [0, 3, 6, 9, 11];

function buildSmoothPath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  if (points.length === 2) {
    return `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)} L ${points[1][0].toFixed(1)} ${points[1][1].toFixed(1)}`;
  }

  let d = `M ${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  const tension = 0.2;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];

    const cp1x = p1[0] + (p2[0] - p0[0]) * tension;
    const cp1y = p1[1] + (p2[1] - p0[1]) * tension;
    const cp2x = p2[0] - (p3[0] - p1[0]) * tension;
    const cp2y = p2[1] - (p3[1] - p1[1]) * tension;

    d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

interface BodyCompositionCardProps {
  language: Language;
  theme?: Theme;
}

export const BodyCompositionCard: React.FC<BodyCompositionCardProps> = ({
  language,
  theme: propTheme,
}) => {
  const { theme: hookTheme } = useOaoTheme();
  const isDark = (propTheme || hookTheme) === 'dark';

  const [activeKey, setActiveKey] = useState<BodyMetricKey>('fat');
  const [activeIdx, setActiveIdx] = useState<number>(DATA.length - 1);
  const [displayValue, setDisplayValue] = useState<number>(DATA[DATA.length - 1].fat);
  const [drawPhase, setDrawPhase] = useState<'idle' | 'drawing' | 'done'>('idle');
  const [cursorVisible, setCursorVisible] = useState<boolean>(false);

  const cardRef = useRef<HTMLElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const linePathRef = useRef<SVGPathElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const hasPlayedInitialRef = useRef<boolean>(false);

  const prefersReducedMotion = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const metric = METRICS[activeKey];
  const accentColor = isDark ? metric.color : metric.lightColor;
  const activeTabTextColor =
    activeKey === 'weight'
      ? isDark
        ? '#070b19'
        : '#ffffff'
      : isDark
      ? '#070b19'
      : '#ffffff';

  const { points, lineD, areaD, gridLines } = useMemo(() => {
    const values = DATA.map((d) => d[activeKey]);
    const lo = Math.floor(Math.min(...values) - 1);
    const hi = Math.ceil(Math.max(...values) + 1);

    const xFor = (i: number) => PAD.l + (i * (SVG_W - PAD.l - PAD.r)) / (values.length - 1);
    const yFor = (val: number) => PAD.t + ((hi - val) * (SVG_H - PAD.t - PAD.b)) / (hi - lo);

    const pts: Array<[number, number]> = values.map((val, i) => [xFor(i), yFor(val)]);
    const smoothD = buildSmoothPath(pts);
    const lastPt = pts[pts.length - 1];
    const firstPt = pts[0];
    const bottomY = SVG_H - PAD.b;
    const areaPath = `${smoothD} L ${lastPt[0].toFixed(1)} ${bottomY} L ${firstPt[0].toFixed(1)} ${bottomY} Z`;

    // 3 horizontal grid lines with value labels
    const lines = [0, 1, 2].map((step) => {
      const val = lo + ((hi - lo) * step) / 2;
      return {
        y: yFor(val),
        label: val.toFixed(0),
      };
    });

    return {
      points: pts,
      lineD: smoothD,
      areaD: areaPath,
      gridLines: lines,
    };
  }, [activeKey]);

  const cancelPendingAnimations = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startSequence = useCallback(
    (metricKey: BodyMetricKey, animate: boolean) => {
      cancelPendingAnimations();
      const targetIdx = DATA.length - 1;
      const startVal = DATA[0][metricKey];
      const targetVal = DATA[targetIdx][metricKey];
      setActiveIdx(targetIdx);

      if (!animate || prefersReducedMotion()) {
        setDrawPhase('done');
        setCursorVisible(true);
        setDisplayValue(targetVal);
        return;
      }

      setDrawPhase('idle');
      setCursorVisible(false);
      setDisplayValue(startVal);

      // Force layout reflow so stroke-dashoffset transition restarts cleanly
      if (linePathRef.current) {
        void linePathRef.current.getBoundingClientRect();
      }

      rafRef.current = requestAnimationFrame(() => {
        setDrawPhase('drawing');
        const duration = 1600;
        const t0 = performance.now();

        const step = (now: number) => {
          const p = Math.min((now - t0) / duration, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          setDisplayValue(startVal + (targetVal - startVal) * eased);
          if (p < 1) {
            rafRef.current = requestAnimationFrame(step);
          } else {
            setDisplayValue(targetVal);
            rafRef.current = null;
          }
        };

        rafRef.current = requestAnimationFrame(step);
      });

      timerRef.current = window.setTimeout(() => {
        setDrawPhase('done');
        setCursorVisible(true);
        setDisplayValue(targetVal);
        timerRef.current = null;
      }, 1630);
    },
    [cancelPendingAnimations, prefersReducedMotion]
  );

  // Trigger initial sequence once when card scrolls into view (30% threshold)
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    if (prefersReducedMotion()) {
      hasPlayedInitialRef.current = true;
      startSequence('fat', false);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !hasPlayedInitialRef.current) {
          hasPlayedInitialRef.current = true;
          startSequence(activeKey, true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelPendingAnimations();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectMetric = (nextKey: BodyMetricKey) => {
    setActiveKey(nextKey);
    hasPlayedInitialRef.current = true;
    startSequence(nextKey, true);
  };

  const handleReplay = () => {
    hasPlayedInitialRef.current = true;
    startSequence(activeKey, true);
  };

  const snapToWeek = useCallback(
    (nextIdx: number) => {
      cancelPendingAnimations();
      const clamped = Math.max(0, Math.min(DATA.length - 1, nextIdx));
      setDrawPhase('done');
      setCursorVisible(true);
      setActiveIdx(clamped);
      setDisplayValue(DATA[clamped][activeKey]);
    },
    [activeKey, cancelPendingAnimations]
  );

  const handlePointerInteract = (clientX: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const px = ((clientX - rect.left) / rect.width) * SVG_W;

    let nearest = 0;
    let bestDist = Infinity;
    points.forEach((pt, idx) => {
      const dist = Math.abs(pt[0] - px);
      if (dist < bestDist) {
        bestDist = dist;
        nearest = idx;
      }
    });
    snapToWeek(nearest);
  };

  const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    if (language === 'ar') {
      // In RTL, Right arrow goes to the earlier week
      if (e.key === 'ArrowRight') snapToWeek(activeIdx - 1);
      if (e.key === 'ArrowLeft') snapToWeek(activeIdx + 1);
    } else {
      if (e.key === 'ArrowLeft') snapToWeek(activeIdx - 1);
      if (e.key === 'ArrowRight') snapToWeek(activeIdx + 1);
    }
  };

  const baseVal = DATA[0][activeKey];
  const currentMetricVal = drawPhase === 'drawing' ? displayValue : DATA[activeIdx][activeKey];
  const deltaVal = DATA[activeIdx][activeKey] - baseVal;
  const isBaseline = activeIdx === 0 && drawPhase !== 'drawing';
  const isGoodDelta = metric.good === 'down' ? deltaVal <= 0 : deltaVal >= 0;

  const activePoint = points[activeIdx] || points[points.length - 1];
  const unitText = language === 'ar' ? metric.unitAr : metric.unitEn;

  const gradientId = `oao-bc-grad-${activeKey}`;

  return (
    <section
      ref={cardRef}
      aria-label={language === 'ar' ? 'تطور تركيبة الجسم' : 'Body Composition Progress'}
      className="w-full py-8 sm:py-10 px-4 sm:px-8 relative z-10 select-none"
    >
      <div
        style={{ ['--oao-bc-c' as string]: accentColor }}
        className={`max-w-[760px] mx-auto w-full rounded-3xl p-5 sm:p-6 border backdrop-blur-xl transition-colors duration-300 ${
          isDark
            ? 'bg-gradient-to-b from-[#1C2541]/80 via-[#0B132B]/90 to-[#070A14] border-orange-500/35 shadow-[0_0_50px_rgba(249,115,22,0.12)] text-white'
            : 'bg-[#FAFBFD] border-slate-300 shadow-[0_12px_36px_rgba(11,19,43,0.08)] text-[#0B132B]'
        }`}
      >
        {/* Header & Segmented Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3.5">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-[#0B132B] dark:text-white">
              {language === 'ar' ? 'تطور تركيبة الجسم' : 'Body Composition Progress'}
            </h2>
            <p className="text-xs sm:text-[13px] font-medium text-slate-600 dark:text-slate-400 mt-0.5">
              {language === 'ar'
                ? 'نتائج فحوصات InBody على 12 أسبوع'
                : '12-Week InBody Scan Results'}
            </p>
          </div>

          <div
            role="tablist"
            aria-label={language === 'ar' ? 'مؤشرات الجسم' : 'Body metrics'}
            className={`inline-flex flex-wrap sm:flex-nowrap gap-1 p-1 rounded-2xl border self-start ${
              isDark
                ? 'bg-[#070b19]/90 border-white/10'
                : 'bg-[#EEF2F6] border-slate-300'
            }`}
          >
            {(Object.keys(METRICS) as BodyMetricKey[]).map((key) => {
              const item = METRICS[key];
              const isSelected = activeKey === key;
              const tabColor = isDark ? item.color : item.lightColor;

              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  onClick={() => handleSelectMetric(key)}
                  style={isSelected ? { backgroundColor: tabColor, color: activeTabTextColor } : undefined}
                  className={`px-2.5 sm:px-3.5 py-1.5 rounded-xl text-xs sm:text-[13px] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2 ${
                    isSelected
                      ? 'font-black shadow-sm'
                      : 'font-semibold text-slate-600 dark:text-slate-300 hover:text-[#0B132B] dark:hover:text-white'
                  }`}
                >
                  {language === 'ar' ? item.labelAr : item.labelEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Large Readout Row */}
        <div className="flex items-baseline gap-2.5 sm:gap-3 mt-5 mb-2 flex-wrap">
          <span
            className="text-4xl sm:text-[46px] font-black leading-none tabular-nums"
            style={{ color: accentColor }}
          >
            {currentMetricVal.toFixed(1)}
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-600 dark:text-slate-400">
            {unitText}
          </span>

          <span
            className={`text-xs sm:text-sm font-black px-2.5 py-0.5 rounded-full ${
              isDark ? 'bg-white/10' : 'bg-slate-200/80'
            } ${
              isBaseline
                ? 'text-slate-600 dark:text-slate-400'
                : isGoodDelta
                ? 'text-emerald-700 dark:text-[#46d39a]'
                : 'text-rose-600 dark:text-[#ff6b6b]'
            }`}
          >
            {isBaseline
              ? language === 'ar'
                ? 'نقطة البداية'
                : 'Baseline'
              : `${deltaVal > 0 ? '+' : ''}${deltaVal.toFixed(1)} ${unitText}`}
          </span>

          <span className="text-xs sm:text-[13px] font-bold text-slate-600 dark:text-slate-400 ms-auto">
            {language === 'ar' ? `الأسبوع ${activeIdx + 1}` : `Week ${activeIdx + 1}`}
          </span>
        </div>

        {/* Hand-Drawn SVG Line Chart (Always LTR so time flows left -> right) */}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          tabIndex={0}
          role="img"
          aria-label={
            language === 'ar'
              ? 'رسم بياني لتطور تركيبة الجسم، استخدم الأسهم للتنقل بين الأسابيع'
              : 'Body composition chart, use left and right arrow keys to step through weeks'
          }
          onPointerMove={(e) => handlePointerInteract(e.clientX)}
          onPointerDown={(e) => handlePointerInteract(e.clientX)}
          onKeyDown={handleKeyDown}
          style={{ direction: 'ltr', touchAction: 'pan-y' }}
          className="w-full h-auto block cursor-crosshair rounded-xl focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-4"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accentColor} stopOpacity={isDark ? 0.34 : 0.24} />
              <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* 3 Horizontal Grid Lines + Value Labels */}
          <g>
            {gridLines.map((line, i) => (
              <g key={i}>
                <line
                  x1={PAD.l}
                  x2={SVG_W - PAD.r}
                  y1={line.y}
                  y2={line.y}
                  stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(11,19,43,0.12)'}
                  strokeWidth={1}
                />
                <text
                  x={SVG_W - PAD.r + 6}
                  y={line.y + 4}
                  textAnchor="start"
                  fill={isDark ? '#94a3b8' : '#475569'}
                  fontSize="11"
                  fontWeight="600"
                >
                  {line.label}
                </text>
              </g>
            ))}

            {/* X-axis Labels for Weeks 1, 4, 7, 10, 12 */}
            {X_TICKS.map((idx) => {
              const pt = points[idx];
              if (!pt) return null;
              return (
                <text
                  key={idx}
                  x={pt[0]}
                  y={SVG_H - 8}
                  textAnchor="middle"
                  fill={isDark ? '#94a3b8' : '#475569'}
                  fontSize="11"
                  fontWeight="600"
                >
                  {language === 'ar' ? `أسبوع ${idx + 1}` : `Week ${idx + 1}`}
                </text>
              );
            })}
          </g>

          {/* Area Gradient Fill */}
          <path
            d={areaD}
            fill={`url(#${gradientId})`}
            style={{
              opacity: drawPhase === 'idle' ? 0 : 1,
              transition:
                drawPhase === 'drawing' ? 'opacity 0.9s ease-out 0.85s' : 'none',
            }}
          />

          {/* Smooth Line Path */}
          <path
            ref={linePathRef}
            d={lineD}
            fill="none"
            stroke={accentColor}
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: drawPhase === 'idle' ? 1 : 0,
              transition:
                drawPhase === 'drawing'
                  ? 'stroke-dashoffset 1.6s cubic-bezier(0.3, 0.7, 0.2, 1)'
                  : 'none',
            }}
          />

          {/* Interactive Guide Line & Ringed Dot */}
          <g style={{ opacity: cursorVisible ? 1 : 0, transition: 'opacity 0.25s ease' }}>
            <line
              x1={activePoint[0]}
              x2={activePoint[0]}
              y1={PAD.t}
              y2={SVG_H - PAD.b}
              stroke={isDark ? '#94a3b8' : '#64748b'}
              strokeWidth={1.2}
              strokeDasharray="3 4"
            />
            <circle
              cx={activePoint[0]}
              cy={activePoint[1]}
              r={6}
              fill={isDark ? '#0B132B' : '#FAFBFD'}
              stroke={accentColor}
              strokeWidth={3}
            />
          </g>
        </svg>

        {/* Footer Hint & Replay Control */}
        <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-200 dark:border-white/10 text-xs text-slate-600 dark:text-slate-400">
          <span>
            {language === 'ar'
              ? 'حرّك إصبعك أو الماوس على الرسم لعرض كل أسبوع'
              : 'Hover or drag across the chart to inspect each week'}
          </span>

          <button
            type="button"
            onClick={handleReplay}
            className="px-3 py-1 rounded-full border border-slate-300 dark:border-white/20 text-[#0B132B] dark:text-white hover:border-orange-500 font-bold text-xs transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-orange-500 focus-visible:outline-offset-2"
          >
            {language === 'ar' ? 'إعادة التشغيل' : 'Replay'}
          </button>
        </div>
      </div>
    </section>
  );
};
