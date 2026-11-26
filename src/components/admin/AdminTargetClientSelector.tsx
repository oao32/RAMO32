import React, { useState, useMemo } from 'react';
import { UserCredentialRecord } from '../../lib/authStore';
import {
  Users,
  RefreshCw,
  Crown,
  Shield,
  Loader2,
  CheckCircle2,
  Mail,
  KeyRound,
  Search,
  X,
} from 'lucide-react';

interface AdminTargetClientSelectorProps {
  subscribers: UserCredentialRecord[];
  selectedClientKey: string;
  onSelectClient: (clientKey: string) => void;
  onRefreshSubscribers?: () => void;
  isLoadingClient?: boolean;
  isRefreshingList?: boolean;
}

export function getSubscriberSelectorKey(sub: UserCredentialRecord): string {
  return (sub.id || sub.email || '').trim();
}

export const AdminTargetClientSelector: React.FC<AdminTargetClientSelectorProps> = ({
  subscribers,
  selectedClientKey,
  onSelectClient,
  onRefreshSubscribers,
  isLoadingClient = false,
  isRefreshingList = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const activeSubscribers = subscribers.filter((s) => s.status !== 'suspended');
  const suspendedSubscribers = subscribers.filter((s) => s.status === 'suspended');
  const orderedSubscribers = [...activeSubscribers, ...suspendedSubscribers];

  const showSearchInput = orderedSubscribers.length > 8;

  const filteredSubscribers = useMemo(() => {
    try {
      if (!showSearchInput) return orderedSubscribers;
      const q = searchQuery.trim().toLowerCase();
      if (!q) return orderedSubscribers;
      return orderedSubscribers.filter((sub) => {
        const name = (sub?.clientName || '').toLowerCase();
        const email = (sub?.email || '').toLowerCase();
        const code = (sub?.clientCode || '').toLowerCase();
        return name.includes(q) || email.includes(q) || code.includes(q);
      });
    } catch {
      return orderedSubscribers;
    }
  }, [orderedSubscribers, searchQuery, showSearchInput]);

  const selectedSub = orderedSubscribers.find(
    (s) =>
      getSubscriberSelectorKey(s) === selectedClientKey ||
      s.email.toLowerCase() === selectedClientKey.toLowerCase()
  );

  const selectedInFiltered = filteredSubscribers.some(
    (s) => getSubscriberSelectorKey(s) === selectedClientKey
  );

  return (
    <div className="bg-white dark:bg-[#070e24]/95 border-2 border-orange-500/35 dark:border-orange-500/40 rounded-3xl p-4 sm:p-5 shadow-md dark:shadow-[0_8px_30px_rgba(234,88,12,0.12)] space-y-3 transition-colors">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Prominent Label & Dropdown */}
        <div className="flex-1 space-y-2">
          <label
            htmlFor="oao-target-subscriber-select"
            className="text-xs sm:text-sm font-black text-orange-600 dark:text-orange-400 flex items-center gap-2"
          >
            <span className="p-1.5 rounded-xl bg-orange-500/15 dark:bg-orange-500/20 border border-orange-500/35 dark:border-orange-500/40 text-orange-600 dark:text-orange-400">
              <Users className="w-4 h-4" />
            </span>
            <span>اختر المشترك المستهدف (Select Target Subscriber)</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-black/50 border border-slate-200 dark:border-white/10 text-[10px] font-mono text-slate-700 dark:text-slate-300">
              {activeSubscribers.length} نشط
            </span>
          </label>

          {showSearchInput && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 right-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم أو البريد أو الكود..."
                aria-label="بحث في قائمة المشتركين"
                className="w-full pr-9 pl-8 py-2 rounded-xl bg-slate-50 dark:bg-[#030712] border border-slate-300 dark:border-white/15 focus:border-[#FF5722] focus:ring-1 focus:ring-orange-500/30 text-[#0B132B] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs font-medium outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute top-1/2 -translate-y-1/2 left-2.5 text-slate-400 hover:text-[#0B132B] dark:hover:text-white cursor-pointer"
                  aria-label="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select
              id="oao-target-subscriber-select"
              value={selectedClientKey}
              onChange={(e) => onSelectClient(e.target.value)}
              className="oao-target-select flex-1 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#030712] border-2 border-orange-500/35 dark:border-orange-500/40 focus:border-[#FF5722] focus:ring-2 focus:ring-orange-500/20 text-[#0B132B] dark:text-white text-xs sm:text-sm font-black outline-none cursor-pointer transition-all"
            >
              {orderedSubscribers.length === 0 ? (
                <option value="">لا يوجد مشتركون مسجلون في Supabase بعد</option>
              ) : filteredSubscribers.length === 0 ? (
                <>
                  {selectedClientKey && (
                    <option value={selectedClientKey} hidden disabled>
                      {selectedSub?.clientName || selectedClientKey}
                    </option>
                  )}
                  <option value="" disabled>
                    لا توجد نتائج مطابقة للبحث
                  </option>
                </>
              ) : (
                <>
                  {selectedClientKey && !selectedInFiltered && (
                    <option value={selectedClientKey} hidden disabled>
                      {selectedSub?.clientName || selectedClientKey}
                    </option>
                  )}
                  {filteredSubscribers.map((sub) => {
                    const key = getSubscriberSelectorKey(sub);
                    const planLabel = sub.plan === 'VIP' ? 'VIP بلاتينيوم' : 'Standard قياسي';
                    const statusSuffix = sub.status === 'suspended' ? ' [موقوف]' : '';
                    return (
                      <option key={key} value={key}>
                        {sub.clientName} — {planLabel} — {sub.email}
                        {statusSuffix}
                      </option>
                    );
                  })}
                </>
              )}
            </select>

            {onRefreshSubscribers && (
              <button
                type="button"
                onClick={onRefreshSubscribers}
                disabled={isRefreshingList}
                className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/15 text-[#0B132B] dark:text-slate-200 dark:hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                title="تحديث قائمة المشتركين من قاعدة البيانات السحابية"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-orange-500 dark:text-orange-400 ${isRefreshingList ? 'animate-spin' : ''}`} />
                <span>تحديث القائمة من السحابة</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Subscriber Summary Pill */}
        {selectedSub && (
          <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 lg:max-w-md shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              {selectedSub.plan === 'VIP' ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-100 dark:bg-amber-500/20 border border-amber-400/60 dark:border-amber-400/50 text-amber-800 dark:text-amber-300 text-[11px] font-black shrink-0">
                  <Crown className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>VIP</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-200 text-[11px] font-black shrink-0">
                  <Shield className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                  <span>Standard</span>
                </span>
              )}

              <div className="min-w-0 text-start">
                <div className="text-xs font-black text-[#0B132B] dark:text-white truncate flex items-center gap-1.5">
                  <span>{selectedSub.clientName}</span>
                  {isLoadingClient ? (
                    <Loader2 className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400 animate-spin shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600 dark:text-slate-400 font-mono mt-0.5">
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="w-3 h-3 text-orange-500 dark:text-orange-400" />
                    {selectedSub.email}
                  </span>
                  {selectedSub.clientCode && (
                    <span className="flex items-center gap-1 text-amber-700 dark:text-amber-300">
                      <KeyRound className="w-3 h-3" />
                      {selectedSub.clientCode}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {isLoadingClient && (
        <div className="text-[11px] text-orange-600 dark:text-orange-300 font-bold flex items-center gap-1.5 px-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>جاري تحميل ومزامنة بيانات المشترك من قاعدة البيانات السحابية Supabase...</span>
        </div>
      )}
    </div>
  );
};
