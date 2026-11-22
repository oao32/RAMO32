import { ClientProfile, Language } from '../types';

export interface DateSpanBreakdown {
  startDate: string;
  endDate: string;
  totalDays: number;
  rawDaysDiff: number;
  months: number;
  remainderDays: number;
  formattedAr: string;
  formattedEn: string;
  formattedWithTotalAr: string;
  formattedWithTotalEn: string;
}

export interface SubscriptionDetails {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  hasExplicitEndDate: boolean;
  daysRemaining: number;
  rawDaysRemaining: number;
  totalDays: number;
  daysElapsed: number;
  progressPercent: number; // 0 to 100
  isExpired: boolean;
  isSuspended: boolean;
  isExpiringSoon: boolean;
  status: 'active' | 'expiring' | 'expired';
  totalMonths: number;
  totalRemainderDays: number;
  formattedTotalDurationAr: string;
  formattedTotalDurationEn: string;
  remainingMonths: number;
  remainingRemainderDays: number;
  formattedRemainingDurationAr: string;
  formattedRemainingDurationEn: string;
  formattedStartDateAr: string;
  formattedEndDateAr: string;
  formattedStartDateEn: string;
  formattedEndDateEn: string;
}

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

const ENGLISH_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function normalizeIsoDateOnly(value?: string | null): string {
  if (!value || typeof value !== 'string') return '';
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
}

function parseLocalMidnight(isoDateStr: string): Date | null {
  const clean = normalizeIsoDateOnly(isoDateStr);
  if (!clean) return null;
  const [y, m, d] = clean.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function addCalendarMonthsAnchored(anchor: Date, monthsToAdd: number): Date {
  const targetMonthIndex = anchor.getMonth() + monthsToAdd;
  const targetYear = anchor.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
  const clampedDay = Math.min(anchor.getDate(), lastDayOfTargetMonth);
  return new Date(targetYear, normalizedMonth, clampedDay);
}

export function getTodayIsoString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateReadable(isoDateStr?: string, language: Language = 'ar'): string {
  const clean = normalizeIsoDateOnly(isoDateStr);
  if (!clean) return language === 'ar' ? 'غير محدد' : 'Not specified';
  const parts = clean.split('-');

  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return clean;
  }

  if (language === 'ar') {
    return `${day} ${ARABIC_MONTHS[monthIdx]} ${year}`;
  }
  return `${ENGLISH_MONTHS[monthIdx]} ${day}, ${year}`;
}

export function addDaysToDate(baseDateIso: string, days: number): string {
  try {
    const parsed = parseLocalMidnight(baseDateIso);
    const date = parsed || new Date();
    date.setDate(date.getDate() + days);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    const now = new Date();
    now.setDate(now.getDate() + days);
    return now.toISOString().slice(0, 10);
  }
}

export function addMonthsToDate(baseDateIso: string, months: number): string {
  try {
    const parsed = parseLocalMidnight(baseDateIso);
    if (!parsed) return addDaysToDate(baseDateIso, months * 30);
    const result = addCalendarMonthsAnchored(parsed, months);
    const year = result.getFullYear();
    const month = String(result.getMonth() + 1).padStart(2, '0');
    const day = String(result.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return addDaysToDate(baseDateIso, months * 30);
  }
}

function formatMonthsUnitAr(months: number): string {
  if (months === 1) return 'شهر';
  if (months === 2) return 'شهران';
  if (months >= 3 && months <= 10) return `${months} شهور`;
  return `${months} شهراً`;
}

function formatDaysUnitAr(days: number): string {
  if (days === 0) return '0 يوم';
  if (days === 1) return 'يوم واحد';
  if (days === 2) return 'يومان';
  if (days >= 3 && days <= 10) return `${days} أيام`;
  return `${days} يوماً`;
}

export function formatMonthsAndDaysAr(months: number, remainderDays: number, totalDays: number): string {
  if (totalDays <= 0) return '0 يوم';
  if (months <= 0) return formatDaysUnitAr(totalDays);
  if (remainderDays <= 0) return formatMonthsUnitAr(months);
  return `${formatMonthsUnitAr(months)} و ${formatDaysUnitAr(remainderDays)}`;
}

export function formatMonthsAndDaysEn(months: number, remainderDays: number, totalDays: number): string {
  if (totalDays <= 0) return '0 days';
  if (months <= 0) return `${totalDays} ${totalDays === 1 ? 'day' : 'days'}`;
  const mLabel = `${months} ${months === 1 ? 'month' : 'months'}`;
  if (remainderDays <= 0) return mLabel;
  const dLabel = `${remainderDays} ${remainderDays === 1 ? 'day' : 'days'}`;
  return `${mLabel}, ${dLabel}`;
}

/**
 * Calculates calendar-accurate months + remainder days + total days between two YYYY-MM-DD dates.
 */
export function calculateDateSpanBreakdown(
  startDateIso: string,
  endDateIso: string
): DateSpanBreakdown {
  const cleanStart = normalizeIsoDateOnly(startDateIso) || getTodayIsoString();
  const cleanEnd = normalizeIsoDateOnly(endDateIso) || cleanStart;
  const startDateObj = parseLocalMidnight(cleanStart) || new Date();
  const endDateObj = parseLocalMidnight(cleanEnd) || new Date();

  const rawDaysDiff = Math.round((endDateObj.getTime() - startDateObj.getTime()) / MS_PER_DAY);
  if (rawDaysDiff <= 0) {
    return {
      startDate: cleanStart,
      endDate: cleanEnd,
      totalDays: 0,
      rawDaysDiff,
      months: 0,
      remainderDays: 0,
      formattedAr: '0 يوم',
      formattedEn: '0 days',
      formattedWithTotalAr: '0 يوم',
      formattedWithTotalEn: '0 days',
    };
  }

  let months = 0;
  let cursor = startDateObj;
  while (months < 120) {
    const nextAnchor = addCalendarMonthsAnchored(startDateObj, months + 1);
    if (nextAnchor.getTime() <= endDateObj.getTime()) {
      months += 1;
      cursor = nextAnchor;
    } else {
      break;
    }
  }

  const remainderDays = Math.max(0, Math.round((endDateObj.getTime() - cursor.getTime()) / MS_PER_DAY));
  const formattedAr = formatMonthsAndDaysAr(months, remainderDays, rawDaysDiff);
  const formattedEn = formatMonthsAndDaysEn(months, remainderDays, rawDaysDiff);
  const formattedWithTotalAr =
    months > 0 ? `${formattedAr} (${rawDaysDiff} يوم)` : formattedAr;
  const formattedWithTotalEn =
    months > 0 ? `${formattedEn} (${rawDaysDiff} days)` : formattedEn;

  return {
    startDate: cleanStart,
    endDate: cleanEnd,
    totalDays: rawDaysDiff,
    rawDaysDiff,
    months,
    remainderDays,
    formattedAr,
    formattedEn,
    formattedWithTotalAr,
    formattedWithTotalEn,
  };
}

/**
 * Calculates live subscription dates, remaining days & months, progress and expiration status.
 * Authoritative single check used across MainPortal, StandardDashboard, VipDashboard, and /s/:token.
 */
export function calculateSubscriptionDetails(
  profile?: Partial<ClientProfile> | null
): SubscriptionDetails {
  const todayIso = getTodayIsoString();
  const todayObj = parseLocalMidnight(todayIso) || new Date();
  const todayMidnight = todayObj.getTime();

  const explicitStart = normalizeIsoDateOnly(profile?.subscriptionStartDate);
  const explicitEnd = normalizeIsoDateOnly(profile?.subscriptionEndDate);
  const joinedNormalized = normalizeIsoDateOnly(profile?.joinedDate);

  // Start Date
  const startDate = explicitStart || joinedNormalized || todayIso;

  // End Date
  const hasExplicitEndDate = Boolean(explicitEnd);
  let endDate = explicitEnd;
  if (!endDate) {
    const fallbackDays =
      typeof profile?.subscriptionDaysLeft === 'number' && profile.subscriptionDaysLeft > 0
        ? profile.subscriptionDaysLeft
        : 60;
    endDate = addDaysToDate(startDate, fallbackDays);
  }

  const startMs = (parseLocalMidnight(startDate) || todayObj).getTime();
  const endMs = (parseLocalMidnight(endDate) || todayObj).getTime();

  const totalBreakdown = calculateDateSpanBreakdown(startDate, endDate);
  const totalDays = Math.max(1, Math.round((endMs - startMs) / MS_PER_DAY));
  const rawDaysRemaining = Math.round((endMs - todayMidnight) / MS_PER_DAY);

  const isForcedExpired = profile?.subscriptionStatus === 'expired';
  const isSuspended = profile?.subscriptionStatus === 'suspended';
  const isExpired = isForcedExpired || (hasExplicitEndDate && rawDaysRemaining <= 0);
  const daysRemaining = isExpired ? 0 : Math.max(0, rawDaysRemaining);
  const isExpiringSoon = !isExpired && daysRemaining <= 7;

  const remainingBreakdown = calculateDateSpanBreakdown(todayIso, isExpired ? todayIso : endDate);

  const daysElapsed = Math.max(0, Math.min(totalDays, totalDays - rawDaysRemaining));
  const progressPercent = isExpired
    ? 100
    : Math.min(100, Math.max(0, Math.round((daysElapsed / totalDays) * 100)));

  const status: 'active' | 'expiring' | 'expired' = isExpired
    ? 'expired'
    : isExpiringSoon
    ? 'expiring'
    : 'active';

  return {
    startDate,
    endDate,
    hasExplicitEndDate,
    daysRemaining,
    rawDaysRemaining,
    totalDays,
    daysElapsed,
    progressPercent,
    isExpired,
    isSuspended,
    isExpiringSoon,
    status,
    totalMonths: totalBreakdown.months,
    totalRemainderDays: totalBreakdown.remainderDays,
    formattedTotalDurationAr: totalBreakdown.formattedWithTotalAr,
    formattedTotalDurationEn: totalBreakdown.formattedWithTotalEn,
    remainingMonths: remainingBreakdown.months,
    remainingRemainderDays: remainingBreakdown.remainderDays,
    formattedRemainingDurationAr: isExpired ? 'منتهي' : remainingBreakdown.formattedAr,
    formattedRemainingDurationEn: isExpired ? 'Expired' : remainingBreakdown.formattedEn,
    formattedStartDateAr: formatDateReadable(startDate, 'ar'),
    formattedEndDateAr: formatDateReadable(endDate, 'ar'),
    formattedStartDateEn: formatDateReadable(startDate, 'en'),
    formattedEndDateEn: formatDateReadable(endDate, 'en'),
  };
}

export function isSubscriptionExpiredOrLocked(profile?: Partial<ClientProfile> | null): boolean {
  if (!profile) return false;
  if (profile.subscriptionStatus === 'suspended') return true;
  return calculateSubscriptionDetails(profile).isExpired;
}
