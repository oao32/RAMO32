import { ClientProfile, Language } from '../types';

export interface SubscriptionDetails {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  daysRemaining: number;
  totalDays: number;
  daysElapsed: number;
  progressPercent: number; // 0 to 100
  isExpired: boolean;
  isExpiringSoon: boolean;
  status: 'active' | 'expiring' | 'expired';
  formattedStartDateAr: string;
  formattedEndDateAr: string;
  formattedStartDateEn: string;
  formattedEndDateEn: string;
}

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

export function getTodayIsoString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateReadable(isoDateStr?: string, language: Language = 'ar'): string {
  if (!isoDateStr) return language === 'ar' ? 'غير محدد' : 'Not specified';
  const parts = isoDateStr.split('-');
  if (parts.length < 3) return isoDateStr;

  const year = parseInt(parts[0], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(monthIdx) || isNaN(day) || monthIdx < 0 || monthIdx > 11) {
    return isoDateStr;
  }

  if (language === 'ar') {
    return `${day} ${ARABIC_MONTHS[monthIdx]} ${year}`;
  }
  return `${ENGLISH_MONTHS[monthIdx]} ${day}, ${year}`;
}

export function addDaysToDate(baseDateIso: string, days: number): string {
  try {
    const parts = baseDateIso.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
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
    const parts = baseDateIso.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    date.setMonth(date.getMonth() + months);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return addDaysToDate(baseDateIso, months * 30);
  }
}

/**
 * Calculates live subscription dates, remaining days, progress and expiration status.
 * Evaluates whether the subscriber's portal must be locked ('isExpired').
 */
export function calculateSubscriptionDetails(
  profile?: Partial<ClientProfile> | null
): SubscriptionDetails {
  const todayIso = getTodayIsoString();
  const todayParts = todayIso.split('-').map(Number);
  const todayMidnight = new Date(todayParts[0], todayParts[1] - 1, todayParts[2]).getTime();

  // Start Date
  let startDate = profile?.subscriptionStartDate || profile?.joinedDate || todayIso;
  if (!startDate || startDate.length < 10) startDate = todayIso;

  // End Date
  let endDate = profile?.subscriptionEndDate;
  if (!endDate || endDate.length < 10) {
    const fallbackDays = profile?.subscriptionDaysLeft ?? 60;
    endDate = addDaysToDate(startDate, fallbackDays);
  }

  const startParts = startDate.split('-').map(Number);
  const endParts = endDate.split('-').map(Number);

  const startMs = new Date(startParts[0], startParts[1] - 1, startParts[2]).getTime();
  const endMs = new Date(endParts[0], endParts[1] - 1, endParts[2]).getTime();

  const totalDays = Math.max(1, Math.round((endMs - startMs) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.round((endMs - todayMidnight) / (1000 * 60 * 60 * 24));

  // If coach explicitly forced status to 'expired', or if days remaining is 0 or less
  const isForcedExpired = profile?.subscriptionStatus === 'expired';
  const isExpired = isForcedExpired || daysRemaining <= 0;
  const isExpiringSoon = !isExpired && daysRemaining <= 7;

  const daysElapsed = Math.max(0, Math.min(totalDays, totalDays - daysRemaining));
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
    daysRemaining: Math.max(0, daysRemaining),
    totalDays,
    daysElapsed,
    progressPercent,
    isExpired,
    isExpiringSoon,
    status,
    formattedStartDateAr: formatDateReadable(startDate, 'ar'),
    formattedEndDateAr: formatDateReadable(endDate, 'ar'),
    formattedStartDateEn: formatDateReadable(startDate, 'en'),
    formattedEndDateEn: formatDateReadable(endDate, 'en'),
  };
}
