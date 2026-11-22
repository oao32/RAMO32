import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ClientProfile,
  WorkoutDay,
  ClientNote,
  Exercise,
  Language,
  Theme,
  SubscriptionAgreement,
  AIGenerationLog,
} from '../../types';
import {
  INITIAL_WORKOUT_DAYS,
  createNeutralClientProfile,
} from '../../data/initialData';
import { BrandLogo } from '../../components/BrandLogo';
import { SignedDeclarationModal } from '../../components/SignedDeclarationModal';
import { SubscriptionQRModal } from '../../components/SubscriptionQRModal';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  testSupabaseConnection,
  checkSupabaseTablesStatus,
  SupabaseTableHealth,
  SUPABASE_SQL_SCHEMA,
  SUPABASE_RLS_FIX_SQL,
  fetchAILogs,
  fetchDeclarationsFromSupabase,
  fetchNotesFromSupabase,
  getCanonicalClientKey,
  loadClientWorkspaceFromSupabase,
  syncClientProfileToSupabase,
  syncWorkoutDaysToSupabase,
  syncNoteToSupabase,
  deleteNoteFromSupabase,
  syncAdminTargetClientToSupabase,
  fetchAdminTargetClientFromSupabase,
} from '../../lib/supabase';
import {
  fetchSubscribersFromSupabase,
  getAllSubscribersWithCredentials,
  isCoachAuthenticated,
  clearCurrentUserSession,
  UserCredentialRecord,
} from '../../lib/authStore';
import { AdminSubscribersManager } from '../../components/admin/AdminSubscribersManager';
import { AdminDietEditor } from '../../components/admin/AdminDietEditor';
import { AdminAssessmentEditor } from '../../components/admin/AdminAssessmentEditor';
import {
  AdminTargetClientSelector,
  getSubscriberSelectorKey,
} from '../../components/admin/AdminTargetClientSelector';
import { CoachAnalyticsView } from '../../components/CoachAnalyticsView';
import {
  getWorkoutTemplates,
  fetchWorkoutTemplatesFromSupabase,
  saveWorkoutTemplate,
  WorkoutTemplate,
} from '../../lib/templateStore';
import { toYouTubeEmbedUrl } from '../../lib/youtube';
import { normalizeExerciseSets, normalizeWorkoutDays } from '../../lib/workoutUtils';
import {
  Users,
  Dumbbell,
  MessageSquare,
  Database,
  TrendingUp,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  Copy,
  ShieldCheck,
  RefreshCw,
  QrCode,
  Crown,
  Shield,
  Home,
  LogOut,
  Share2,
  AlertCircle,
  Edit3,
  Scale,
  Utensils,
  Activity,
  Bookmark,
  Layers,
  X,
  RotateCcw,
} from 'lucide-react';

export const AdminPanel: React.FC = () => {
  const navigate = useNavigate();

  // Load language & theme
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('oao_lang') as Language) || 'ar';
  });
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('oao_theme') as Theme) || 'dark';
  });

  const [activeTab, setActiveTab] = useState<
    'subscribers' | 'revenue' | 'assessment' | 'workouts' | 'biometrics' | 'analytics' | 'diet' | 'inquiries' | 'database'
  >('subscribers');

  // Workout templates state
  const [workoutTemplates, setWorkoutTemplates] = useState<WorkoutTemplate[]>(() =>
    getWorkoutTemplates()
  );
  const [isSaveWorkoutTemplateModalOpen, setIsSaveWorkoutTemplateModalOpen] = useState(false);
  const [isApplyWorkoutTemplateModalOpen, setIsApplyWorkoutTemplateModalOpen] = useState(false);
  const [newWorkoutTemplateName, setNewWorkoutTemplateName] = useState('');
  const [workoutTemplateNotice, setWorkoutTemplateNotice] = useState<string | null>(null);

  // Real Subscribers & Declarations (Hydrated strictly from Supabase)
  const [declarations, setDeclarations] = useState<SubscriptionAgreement[]>([]);

  const [selectedDeclaration, setSelectedDeclaration] = useState<SubscriptionAgreement | null>(null);
  const [isDeclarationModalOpen, setIsDeclarationModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Client Profile & Biometrics State (Hydrated per selected subscriber from Supabase)
  const [profile, setProfile] = useState<ClientProfile>(() => createNeutralClientProfile());
  const [savedProfileMessage, setSavedProfileMessage] = useState(false);

  // Workouts State (Hydrated per selected subscriber from Supabase)
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[]>(INITIAL_WORKOUT_DAYS);
  const [selectedDayKey, setSelectedDayKey] = useState<string>('upper');
  const [newExerciseModalOpen, setNewExerciseModalOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [newExNameAr, setNewExNameAr] = useState('');
  const [newExNameEn, setNewExNameEn] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [newExSets, setNewExSets] = useState(3);
  const [newExReps, setNewExReps] = useState('10 - 12');
  const [newExVideo, setNewExVideo] = useState('');
  const [newExCoachWarning, setNewExCoachWarning] = useState('');

  // Day Rename / Customize & Add Day Modals
  const [isEditDayModalOpen, setIsEditDayModalOpen] = useState(false);
  const [editDayTitleAr, setEditDayTitleAr] = useState('');
  const [editDaySubtitleAr, setEditDaySubtitleAr] = useState('');
  const [isAddDayModalOpen, setIsAddDayModalOpen] = useState(false);
  const [newDayTitleAr, setNewDayTitleAr] = useState('');
  const [newDaySubtitleAr, setNewDaySubtitleAr] = useState('');
  const [confirmDeleteDayKey, setConfirmDeleteDayKey] = useState<string | null>(null);

  // Inquiries & Notes State (Hydrated strictly from Supabase)
  const [notes, setNotes] = useState<ClientNote[]>([]);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [editingReplyNoteId, setEditingReplyNoteId] = useState<string | null>(null);
  const [editReplyText, setEditReplyText] = useState('');
  const [isAddInquiryOpen, setIsAddInquiryOpen] = useState(false);
  const [newInquiryClientName, setNewInquiryClientName] = useState('');
  const [newInquirySubject, setNewInquirySubject] = useState('');
  const [newInquiryMessage, setNewInquiryMessage] = useState('');
  const [confirmDeleteNoteId, setConfirmDeleteNoteId] = useState<string | null>(null);

  // Database & AI Logs State
  const currentConfig = getSupabaseConfig();
  const [supabaseUrl, setSupabaseUrl] = useState(currentConfig.url);
  const [supabaseKey, setSupabaseKey] = useState(currentConfig.key);
  const [connStatus, setConnStatus] = useState<{
    testing: boolean;
    message: string;
    success?: boolean;
    isLocalMode?: boolean;
    tables?: SupabaseTableHealth[];
  }>({
    testing: false,
    message: '',
  });
  const [dbTablesHealth, setDbTablesHealth] = useState<SupabaseTableHealth[]>([]);
  const [savedConfigMessage, setSavedConfigMessage] = useState(false);
  const [copiedSchema, setCopiedSchema] = useState(false);
  const [copiedRlsFix, setCopiedRlsFix] = useState(false);
  const [aiLogs, setAiLogs] = useState<AIGenerationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Target Subscriber Directory & Cloud Binding State
  const [subscribers, setSubscribers] = useState<UserCredentialRecord[]>(() =>
    getAllSubscribersWithCredentials()
  );
  const [selectedTargetClientKey, setSelectedTargetClientKey] = useState<string>('');
  const selectedTargetKeyRef = useRef<string>(selectedTargetClientKey);
  selectedTargetKeyRef.current = selectedTargetClientKey;

  const [isLoadingTargetClient, setIsLoadingTargetClient] = useState(false);
  const [isRefreshingSubscribers, setIsRefreshingSubscribers] = useState(false);
  const loadRequestIdRef = useRef(0);

  const selectedTargetClient =
    subscribers.find(
      (s) =>
        getSubscriberSelectorKey(s) === selectedTargetClientKey ||
        s.email.toLowerCase() === selectedTargetClientKey.toLowerCase()
    ) || null;

  const selectAndLoadTargetClient = useCallback(
    async (clientKey: string, subsOverride?: UserCredentialRecord[]) => {
      setSelectedTargetClientKey(clientKey);
      selectedTargetKeyRef.current = clientKey;
      void syncAdminTargetClientToSupabase(clientKey);

      const pool = subsOverride || subscribers;
      const target = pool.find(
        (s) =>
          getSubscriberSelectorKey(s) === clientKey ||
          s.email.toLowerCase() === clientKey.toLowerCase()
      );
      if (!target) {
        setProfile(createNeutralClientProfile());
        setWorkoutDays(INITIAL_WORKOUT_DAYS);
        return;
      }

      const requestId = ++loadRequestIdRef.current;
      setIsLoadingTargetClient(true);
      try {
        const workspace = await loadClientWorkspaceFromSupabase({
          clientId: target.id || target.email,
          email: target.email,
          fallbackName: target.clientName,
          fallbackPlan: target.plan,
        });
        if (requestId !== loadRequestIdRef.current) return;

        const canonicalKey = getCanonicalClientKey(workspace.profile.id, target.email);
        setProfile(workspace.profile);
        setWorkoutDays(workspace.workoutDays);
        setSelectedDayKey((prev) =>
          workspace.workoutDays.some((d) => d.key === prev)
            ? prev
            : workspace.workoutDays[0]?.key || 'upper'
        );

        window.dispatchEvent(new CustomEvent('oao_profile_updated', { detail: workspace.profile }));
        window.dispatchEvent(
          new CustomEvent('oao_streak_updated', {
            detail: { ...workspace.streakData, clientId: canonicalKey, email: target.email },
          })
        );
        window.dispatchEvent(
          new CustomEvent('oao_rank_updated', {
            detail: { ...workspace.athleteRank, clientId: canonicalKey, email: target.email },
          })
        );
      } finally {
        if (requestId === loadRequestIdRef.current) {
          setIsLoadingTargetClient(false);
        }
      }
    },
    [subscribers]
  );

  const refreshSubscribersDirectory = useCallback(
    async (reloadSelected = false) => {
      setIsRefreshingSubscribers(true);
      try {
        const remoteSubs = await fetchSubscribersFromSupabase();
        setSubscribers(remoteSubs);

        if (remoteSubs.length > 0) {
          const currentKey = selectedTargetKeyRef.current;
          const existing = remoteSubs.find(
            (s) =>
              getSubscriberSelectorKey(s) === currentKey ||
              s.email.toLowerCase() === currentKey.toLowerCase()
          );
          if (existing) {
            if (reloadSelected) {
              await selectAndLoadTargetClient(getSubscriberSelectorKey(existing), remoteSubs);
            }
          } else {
            const firstActive = remoteSubs.find((s) => s.status !== 'suspended') || remoteSubs[0];
            await selectAndLoadTargetClient(getSubscriberSelectorKey(firstActive), remoteSubs);
          }
        } else {
          loadRequestIdRef.current += 1;
          setSelectedTargetClientKey('');
          selectedTargetKeyRef.current = '';
          setProfile(createNeutralClientProfile());
          setWorkoutDays(INITIAL_WORKOUT_DAYS);
        }
      } finally {
        setIsRefreshingSubscribers(false);
      }
    },
    [selectAndLoadTargetClient]
  );

  const coachAuthed = isCoachAuthenticated();

  // Refresh declarations, subscribers, templates, and live notes on load exclusively from Supabase
  useEffect(() => {
    if (!coachAuthed) return;
    let mounted = true;
    fetchDeclarationsFromSupabase().then((remoteDecls) => {
      if (mounted) setDeclarations(remoteDecls);
    });
    fetchNotesFromSupabase().then((remoteNotes) => {
      if (mounted) setNotes(remoteNotes);
    });
    fetchWorkoutTemplatesFromSupabase().then((tmpls) => {
      if (mounted && Array.isArray(tmpls)) setWorkoutTemplates(tmpls);
    });
    void (async () => {
      const savedTargetKey = await fetchAdminTargetClientFromSupabase();
      if (mounted && savedTargetKey && !selectedTargetKeyRef.current) {
        setSelectedTargetClientKey(savedTargetKey);
        selectedTargetKeyRef.current = savedTargetKey;
      }
      await refreshSubscribersDirectory(true);
      const tableHealth = await checkSupabaseTablesStatus();
      if (mounted && tableHealth.length > 0) setDbTablesHealth(tableHealth);
    })();

    const syncLiveDeclarations = () => {
      void fetchDeclarationsFromSupabase().then((remoteDecls) => {
        if (mounted) setDeclarations(remoteDecls);
      });
    };

    const syncLiveNotes = () => {
      void fetchNotesFromSupabase().then((remoteNotes) => {
        if (mounted) setNotes(remoteNotes);
      });
    };

    const syncLiveCredentials = () => {
      const latestSubs = getAllSubscribersWithCredentials();
      setSubscribers(latestSubs);
      const currentKey = selectedTargetKeyRef.current;
      if (
        currentKey &&
        !latestSubs.some(
          (s) =>
            getSubscriberSelectorKey(s) === currentKey ||
            s.email.toLowerCase() === currentKey.toLowerCase()
        )
      ) {
        if (latestSubs.length > 0) {
          const firstActive = latestSubs.find((s) => s.status !== 'suspended') || latestSubs[0];
          void selectAndLoadTargetClient(getSubscriberSelectorKey(firstActive), latestSubs);
        } else {
          setSelectedTargetClientKey('');
          selectedTargetKeyRef.current = '';
          setProfile(createNeutralClientProfile());
          setWorkoutDays(INITIAL_WORKOUT_DAYS);
        }
      }
    };

    window.addEventListener('oao_declarations_updated', syncLiveDeclarations);
    window.addEventListener('oao_notes_updated', syncLiveNotes);
    window.addEventListener('oao_credentials_updated', syncLiveCredentials);
    return () => {
      mounted = false;
      window.removeEventListener('oao_declarations_updated', syncLiveDeclarations);
      window.removeEventListener('oao_notes_updated', syncLiveNotes);
      window.removeEventListener('oao_credentials_updated', syncLiveCredentials);
    };
  }, []);

  const refreshAILogs = async () => {
    setLoadingLogs(true);
    const records = await fetchAILogs();
    setAiLogs(records);
    setLoadingLogs(false);
  };

  useEffect(() => {
    if (!coachAuthed) return;
    if (activeTab === 'database') {
      refreshAILogs();
    } else if (activeTab === 'inquiries') {
      fetchNotesFromSupabase().then((remoteNotes) => setNotes(remoteNotes));
    } else if (
      activeTab === 'workouts' ||
      activeTab === 'biometrics' ||
      activeTab === 'assessment' ||
      activeTab === 'analytics' ||
      activeTab === 'diet'
    ) {
      void refreshSubscribersDirectory(true);
    }
  }, [activeTab, coachAuthed]);

  const handleCopySubscribeLink = () => {
    const url = `${window.location.origin}/subscribe`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleOpenDeclaration = (decl: SubscriptionAgreement) => {
    setSelectedDeclaration(decl);
    setIsDeclarationModalOpen(true);
  };

  // Reply to note
  const handleSendReply = (noteId: string) => {
    const text = replyTexts[noteId]?.trim();
    if (!text) return;
    let modifiedNote: ClientNote | undefined;
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        modifiedNote = {
          ...n,
          reply: text,
          replyTimestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isResolved: true,
        };
        return modifiedNote;
      }
      return n;
    });
    setNotes(updated);
    if (modifiedNote) {
      void syncNoteToSupabase(modifiedNote).then(() => {
        window.dispatchEvent(new CustomEvent('oao_notes_updated'));
      });
    }
    setReplyTexts((prev) => ({ ...prev, [noteId]: '' }));
  };

  // Edit an existing reply
  const handleSaveEditedReply = (noteId: string) => {
    const trimmed = editReplyText.trim();
    if (!trimmed) return;
    let modifiedNote: ClientNote | undefined;
    const updated = notes.map((n) => {
      if (n.id === noteId) {
        modifiedNote = {
          ...n,
          reply: trimmed,
          replyTimestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          isResolved: true,
        };
        return modifiedNote;
      }
      return n;
    });
    setNotes(updated);
    if (modifiedNote) {
      void syncNoteToSupabase(modifiedNote).then(() => {
        window.dispatchEvent(new CustomEvent('oao_notes_updated'));
      });
    }
    setEditingReplyNoteId(null);
    setEditReplyText('');
  };

  // Add a new admin note / inquiry
  const handleAddAdminNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInquirySubject.trim() || !newInquiryMessage.trim()) return;
    const targetEmail = selectedTargetClient?.email || profile.email;
    const targetId = getCanonicalClientKey(selectedTargetClient?.id || profile.id, targetEmail);
    const newNote: ClientNote = {
      id: `note_${Date.now()}`,
      clientId: targetId,
      clientName: newInquiryClientName.trim() || selectedTargetClient?.clientName || profile.name,
      clientEmail: targetEmail,
      subject: newInquirySubject.trim(),
      category: 'general',
      message: newInquiryMessage.trim(),
      timestamp: new Date().toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      isResolved: false,
    };
    const updated = [newNote, ...notes];
    setNotes(updated);
    void syncNoteToSupabase(newNote).then(() => {
      window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    });
    setNewInquiryClientName('');
    setNewInquirySubject('');
    setNewInquiryMessage('');
    setIsAddInquiryOpen(false);
  };

  // Delete an inquiry / note (verifies Supabase deletion; reverts UI if DB rejected)
  const handleDeleteNote = (noteId: string) => {
    const previousNotes = notes;
    const updated = notes.filter((n) => n.id !== noteId);
    setNotes(updated);
    setConfirmDeleteNoteId(null);
    void deleteNoteFromSupabase(noteId).then((ok) => {
      if (!ok) {
        setNotes(previousNotes);
        return;
      }
      window.dispatchEvent(new CustomEvent('oao_notes_updated'));
    });
  };

  // Resolve active target client identifiers for Supabase writes
  const targetClientEmail = selectedTargetClient?.email || profile.email;
  const targetCanonicalKey = getCanonicalClientKey(
    selectedTargetClient?.id || profile.id,
    targetClientEmail
  );

  // Save Profile measurements (Weight, Height, Body Fat, Muscle Mass, etc.)
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: ClientProfile = {
      ...profile,
      id: targetCanonicalKey,
      email: targetClientEmail || profile.email,
    };
    setProfile(updatedProfile);
    void syncClientProfileToSupabase(targetCanonicalKey, updatedProfile);
    window.dispatchEvent(new CustomEvent('oao_profile_updated', { detail: updatedProfile }));
    setSavedProfileMessage(true);
    setTimeout(() => setSavedProfileMessage(false), 3000);
  };

  // Reset Profile measurements to neutral defaults
  const handleResetProfile = () => {
    const resetProfile = createNeutralClientProfile({
      id: targetCanonicalKey || '',
      name: selectedTargetClient?.clientName || profile.name || 'مشترك',
      nameEn: profile.nameEn || selectedTargetClient?.clientName || 'Athlete',
      email: targetClientEmail || profile.email,
      subscription_plan: selectedTargetClient?.plan || profile.subscription_plan,
    });
    setProfile(resetProfile);
    void syncClientProfileToSupabase(targetCanonicalKey, resetProfile);
    window.dispatchEvent(new CustomEvent('oao_profile_updated', { detail: resetProfile }));
    setSavedProfileMessage(true);
    setTimeout(() => setSavedProfileMessage(false), 3000);
  };

  // Open Edit Day Modal (Rename day to "يوم صدر فقط" etc.)
  const handleOpenEditDay = (day: WorkoutDay) => {
    setEditDayTitleAr(day.titleAr);
    setEditDaySubtitleAr(day.subtitleAr || '');
    setIsEditDayModalOpen(true);
  };

  // Save Day Title & Subtitle
  const handleSaveDayDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editDayTitleAr.trim()) return;
    const updated = workoutDays.map((d) =>
      d.key === selectedDayKey
        ? {
            ...d,
            titleAr: editDayTitleAr.trim(),
            titleEn: editDayTitleAr.trim(),
            subtitleAr: editDaySubtitleAr.trim(),
          }
        : d
    );
    setWorkoutDays(updated);
    void syncWorkoutDaysToSupabase(targetCanonicalKey, updated, targetClientEmail);
    setIsEditDayModalOpen(false);
  };

  // Add a New Workout Day
  const handleAddWorkoutDay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDayTitleAr.trim()) return;
    const dayKey = `day_${Date.now()}`;
    const newDay: WorkoutDay = {
      id: dayKey,
      key: dayKey,
      titleAr: newDayTitleAr.trim(),
      titleEn: newDayTitleAr.trim(),
      subtitleAr: newDaySubtitleAr.trim() || 'تمارين مخصصة لهذا اليوم',
      subtitleEn: newDaySubtitleAr.trim() || 'Custom workout day',
      isRestDay: false,
      iconName: 'Dumbbell',
      exercises: [],
    };
    const updated = [...workoutDays, newDay];
    setWorkoutDays(updated);
    setSelectedDayKey(dayKey);
    void syncWorkoutDaysToSupabase(targetCanonicalKey, updated, targetClientEmail);
    setNewDayTitleAr('');
    setNewDaySubtitleAr('');
    setIsAddDayModalOpen(false);
    setWorkoutTemplateNotice(`تمت إضافة يوم "${newDay.titleAr}" إلى جدول التمارين بنجاح!`);
    setTimeout(() => setWorkoutTemplateNotice(null), 3000);
  };

  // Delete a Workout Day
  const handleDeleteWorkoutDay = (dayKey: string) => {
    if (workoutDays.length <= 1) {
      setWorkoutTemplateNotice('يجب أن يحتوي الجدول على يوم تدريبي واحد على الأقل.');
      setTimeout(() => setWorkoutTemplateNotice(null), 3000);
      setConfirmDeleteDayKey(null);
      return;
    }
    const updated = workoutDays.filter((d) => d.key !== dayKey);
    setWorkoutDays(updated);
    if (selectedDayKey === dayKey && updated.length > 0) {
      setSelectedDayKey(updated[0].key);
    }
    void syncWorkoutDaysToSupabase(targetCanonicalKey, updated, targetClientEmail);
    setConfirmDeleteDayKey(null);
    setWorkoutTemplateNotice('تم حذف يوم التمرين وتحديث الجدول بنجاح.');
    setTimeout(() => setWorkoutTemplateNotice(null), 3000);
  };

  // Open Exercise Modal for Editing
  const handleOpenEditExercise = (ex: Exercise) => {
    setEditingExercise(ex);
    setNewExNameAr(ex.nameAr);
    setNewExNameEn(ex.nameEn || ex.nameAr);
    setNewExMuscle(ex.targetMuscleAr);
    setNewExSets(ex.setsCount);
    setNewExReps(ex.repsRange);
    setNewExVideo(ex.videoUrl || '');
    setNewExCoachWarning(ex.coachWarning || '');
    setNewExerciseModalOpen(true);
  };

  // Add or Edit Exercise
  const handleSaveExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExNameAr.trim()) return;

    const normalizedVideoUrl = toYouTubeEmbedUrl(newExVideo) || undefined;
    const normalizedCoachWarning = newExCoachWarning.trim() || undefined;

    const targetSetsCount = Math.max(1, Math.round(Number(newExSets) || 3));

    if (editingExercise) {
      // Editing existing exercise — resize sets array to match setsCount while keeping logged weights/reps & subscriberGoal
      const updated = workoutDays.map((day) => {
        if (day.key !== selectedDayKey) return day;
        return {
          ...day,
          exercises: day.exercises.map((ex) => {
            if (ex.id !== editingExercise.id) return ex;
            return normalizeExerciseSets({
              ...ex,
              nameAr: newExNameAr.trim(),
              nameEn: newExNameEn.trim() || newExNameAr.trim(),
              targetMuscleAr: newExMuscle.trim() || 'العضلات المستهدفة',
              targetMuscleEn: newExMuscle.trim() || 'Target Muscle',
              setsCount: targetSetsCount,
              repsRange: newExReps.trim() || '10 - 12',
              videoUrl: normalizedVideoUrl,
              coachWarning: normalizedCoachWarning,
            });
          }),
        };
      });
      setWorkoutDays(updated);
      void syncWorkoutDaysToSupabase(targetCanonicalKey, updated, targetClientEmail);
    } else {
      // Adding new exercise
      const newEx: Exercise = normalizeExerciseSets({
        id: `ex_${Date.now()}`,
        nameAr: newExNameAr.trim(),
        nameEn: newExNameEn.trim() || newExNameAr.trim(),
        targetMuscleAr: newExMuscle.trim() || 'العضلات المستهدفة',
        targetMuscleEn: newExMuscle.trim() || 'Target Muscle',
        setsCount: targetSetsCount,
        repsRange: newExReps.trim() || '10 - 12',
        recommendedRestSeconds: 90,
        videoUrl: normalizedVideoUrl,
        coachWarning: normalizedCoachWarning,
        formTipsAr: ['أداء منضبط وتحكم كامل في المدى الحركي'],
        formTipsEn: ['Controlled cadence and full range of motion'],
        subscriberGoal: '',
        sets: Array.from({ length: targetSetsCount }, (_, idx) => ({
          setNumber: idx + 1,
          targetReps: '',
          completedWeightKg: '',
          completedReps: '',
          isCompleted: false,
        })),
      });

      const updated = workoutDays.map((day) =>
        day.key === selectedDayKey ? { ...day, exercises: [...day.exercises, newEx] } : day
      );
      setWorkoutDays(updated);
      void syncWorkoutDaysToSupabase(targetCanonicalKey, updated, targetClientEmail);
    }

    setEditingExercise(null);
    setNewExNameAr('');
    setNewExNameEn('');
    setNewExMuscle('');
    setNewExVideo('');
    setNewExCoachWarning('');
    setNewExerciseModalOpen(false);
  };

  // Delete exercise
  const handleDeleteExercise = (dayKey: string, exId: string) => {
    const updated = workoutDays.map((day) =>
      day.key === dayKey ? { ...day, exercises: day.exercises.filter((e) => e.id !== exId) } : day
    );
    setWorkoutDays(updated);
    void syncWorkoutDaysToSupabase(targetCanonicalKey, updated, targetClientEmail);
  };

  const handleLogout = () => {
    clearCurrentUserSession();
    navigate('/', { replace: true });
  };

  if (!coachAuthed) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-[#030712] text-white selection:bg-orange-500 selection:text-white font-['Alexandria',sans-serif]">
      {/* Background Ambience */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-blue-700/10 rounded-full blur-[180px] pointer-events-none" />

      {/* ADMIN TOP NAVIGATION BAR */}
      <header className="sticky top-0 z-40 bg-[#070e24]/95 backdrop-blur-xl border-b border-blue-500/30 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-[0_4px_30px_rgba(30,58,138,0.2)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 cursor-pointer transition-transform hover:scale-105"
            title="العودة للرئيسية"
          >
            <BrandLogo size="sm" showText={false} />
            <div className="flex flex-col text-start">
              <span className="text-sm font-black tracking-wider text-white flex items-center gap-1">
                <span>OWN</span>
                <span className="text-orange-500">AURA</span>
                <span>OUTCOME</span>
              </span>
              <span className="text-[10px] text-blue-400 font-mono font-bold tracking-widest">
                COACH ADMIN PANEL
              </span>
            </div>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-300 text-xs font-black">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>لوحة تحكم الكوتش (عمر عدنان)</span>
          </div>
        </div>

        {/* Quick Tools & Session Controls */}
        <div className="flex items-center gap-2">
          {/* Share / Copy Subscribe link */}
          <button
            onClick={handleCopySubscribeLink}
            className="px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/40 text-orange-300 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
            title="نسخ رابط صفحة الاشتراك المستقلة"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {copiedLink ? 'تم نسخ الرابط!' : 'رابط الاشتراك'}
            </span>
          </button>

          {/* QR Code Modal Button */}
          <button
            onClick={() => setIsQRModalOpen(true)}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="باركود الاشتراكات"
          >
            <QrCode className="w-4 h-4 text-orange-400" />
          </button>

          {/* View VIP Portal */}
          <button
            onClick={() => navigate('/vip')}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
            title="معاينة بوابة VIP"
          >
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">بوابة VIP</span>
          </button>

          {/* View Standard Portal */}
          <button
            onClick={() => navigate('/standard')}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all"
            title="معاينة البوابة القياسية"
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">القياسية</span>
          </button>

          {/* Return Home */}
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="الرئيسية"
          >
            <Home className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer"
            title="تسجيل الخروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* ADMIN TABS & CONTENT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#070e24]/80 border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('subscribers')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'subscribers'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>المشتركون والعقود المعتمدة</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono">
              {declarations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('revenue')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'revenue'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>لوحة التحليلات والإيرادات</span>
          </button>

          <button
            onClick={() => setActiveTab('workouts')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'workouts'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span>محرر جداول التمارين</span>
          </button>

          <button
            onClick={() => setActiveTab('biometrics')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'biometrics'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>محرر القياسات والوزن</span>
          </button>

          <button
            onClick={() => setActiveTab('assessment')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'assessment' || activeTab === 'analytics'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>التقييم والتحليل الشامل</span>
          </button>

          <button
            onClick={() => setActiveTab('diet')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'diet'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>الأنظمة الغذائية</span>
          </button>

          <button
            onClick={() => setActiveTab('inquiries')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'inquiries'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>استفسارات المشتركين</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-mono">
              {notes.filter((n) => !n.isResolved).length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('database')}
            className={`px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'database'
                ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>قاعدة البيانات و Supabase</span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: SUBSCRIBERS & CERTIFIED CONTRACTS & CREDENTIALS
            ========================================================================= */}
        {activeTab === 'subscribers' && (
          <AdminSubscribersManager
            declarations={declarations}
            onOpenDeclaration={handleOpenDeclaration}
            onCopySubscribeLink={handleCopySubscribeLink}
            copiedLink={copiedLink}
            language={language}
          />
        )}

        {/* =========================================================================
            TAB 2: WORKOUTS EDITOR
            ========================================================================= */}
        {/* =========================================================================
            TAB 2: WORKOUTS EDITOR (تعديل الأيام، تعديل التمارين، وتسمية يوم صدر فقط)
            ========================================================================= */}
        {activeTab === 'workouts' && (
          <div className="space-y-6">
            <AdminTargetClientSelector
              subscribers={subscribers}
              selectedClientKey={selectedTargetClientKey}
              onSelectClient={selectAndLoadTargetClient}
              onRefreshSubscribers={() => refreshSubscribersDirectory(true)}
              isLoadingClient={isLoadingTargetClient}
              isRefreshingList={isRefreshingSubscribers}
            />

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10">
              <div>
                <h2 className="text-xl font-black text-white">إدارة وتحديث جدول التمارين</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تعديل مسميات الأيام (مثلاً: يوم الصدر فقط)، تعديل التمارين والجلسات، أو إضافة تمارين جديدة
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setIsApplyWorkoutTemplateModalOpen(true)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Bookmark className="w-4 h-4 text-amber-400" />
                  <span>تطبيق قالب تمارين ({workoutTemplates.length})</span>
                </button>

                <button
                  onClick={() => {
                    setNewWorkoutTemplateName(`جدول تمارين مخصص - ${new Date().toLocaleDateString('ar-SA')}`);
                    setIsSaveWorkoutTemplateModalOpen(true);
                  }}
                  className="px-3.5 py-2.5 rounded-2xl bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Layers className="w-4 h-4" />
                  <span>حفظ الجدول كقالب</span>
                </button>

                <button
                  onClick={() => {
                    const activeDay = workoutDays.find((d) => d.key === selectedDayKey);
                    if (activeDay) handleOpenEditDay(activeDay);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                >
                  <Edit3 className="w-4 h-4 text-orange-400" />
                  <span>تعديل مسمى هذا اليوم (مثلاً: يوم صدر فقط)</span>
                </button>

                <button
                  onClick={() => {
                    setNewDayTitleAr('');
                    setNewDaySubtitleAr('');
                    setIsAddDayModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة يوم جديد</span>
                </button>

                <button
                  onClick={() => {
                    setEditingExercise(null);
                    setNewExNameAr('');
                    setNewExNameEn('');
                    setNewExMuscle('');
                    setNewExSets(3);
                    setNewExReps('10 - 12');
                    setNewExVideo('');
                    setNewExCoachWarning('');
                    setNewExerciseModalOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة تمرين جديد</span>
                </button>
              </div>
            </div>

            {/* Template Action Notice */}
            {workoutTemplateNotice && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/50 text-white text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{workoutTemplateNotice}</span>
              </div>
            )}

            {/* Split Days Switcher */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {workoutDays.map((day) => (
                <button
                  key={day.key}
                  onClick={() => setSelectedDayKey(day.key)}
                  className={`p-4 rounded-2xl border text-right transition-all cursor-pointer flex flex-col justify-between ${
                    selectedDayKey === day.key
                      ? 'bg-orange-500/15 border-orange-500 text-white ring-1 ring-orange-500/40'
                      : 'bg-black/40 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <div>
                    <span className="text-xs font-black block text-white">{day.titleAr}</span>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      {day.exercises.length} تمارين مخصصة
                    </span>
                  </div>
                  {day.subtitleAr && (
                    <span className="text-[10px] text-orange-400/80 line-clamp-1 mt-2">
                      {day.subtitleAr}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Selected Day Header */}
            {workoutDays
              .filter((day) => day.key === selectedDayKey)
              .map((day) => (
                <div
                  key={day.key}
                  className="p-5 rounded-2xl bg-[#071329] border border-orange-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-white">{day.titleAr}</h3>
                      <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 font-mono text-[10px] font-bold">
                        {day.key.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      {day.subtitleAr || 'تمارين الجدول المعتمدة لهذا اليوم'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <button
                      onClick={() => handleOpenEditDay(day)}
                      className="px-3.5 py-1.5 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-300 text-xs font-bold hover:bg-orange-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>تغيير اسم ووصف اليوم</span>
                    </button>

                    {workoutDays.length > 1 && (
                      confirmDeleteDayKey === day.key ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteWorkoutDay(day.key)}
                            className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-black cursor-pointer hover:bg-red-500 transition-all"
                          >
                            تأكيد الحذف
                          </button>
                          <button
                            onClick={() => setConfirmDeleteDayKey(null)}
                            className="px-2.5 py-1.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer hover:bg-white/20 transition-all"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteDayKey(day.key)}
                          className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold hover:bg-red-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف اليوم</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}

            {/* Exercises List for Selected Day */}
            {workoutDays
              .filter((day) => day.key === selectedDayKey)
              .map((day) => (
                <div key={day.key} className="space-y-3">
                  {day.exercises.length === 0 ? (
                    <div className="p-8 text-center rounded-2xl bg-[#0B132B]/60 border border-white/5 text-xs text-slate-400">
                      لا توجد تمارين مضافة لهذا اليوم حتى الآن. اضغط على زر &quot;إضافة تمرين جديد&quot; بالأعلى.
                    </div>
                  ) : (
                    day.exercises.map((ex, exIdx) => (
                      <div
                        key={ex.id}
                        className="p-5 rounded-2xl bg-[#0B132B]/80 border border-white/10 flex items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-mono font-black text-sm">
                            {exIdx + 1}
                          </span>
                          <div>
                            <h4 className="text-sm font-black text-white">{ex.nameAr}</h4>
                            <span className="text-xs text-slate-400">
                              {ex.targetMuscleAr} • {ex.setsCount} جلسات × {ex.repsRange}
                              {ex.videoUrl && ' • يحتوي على فيديو'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditExercise(ex)}
                            className="p-2 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-400 transition-all cursor-pointer"
                            title="تعديل بيانات التمرين"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteExercise(day.key, ex.id)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer"
                            title="حذف التمرين"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ))}
          </div>
        )}

        {/* =========================================================================
            TAB 2.5: ATHLETE BIOMETRICS & MEASUREMENTS EDITOR (الوزن، الطول، الدهون، العضلات)
            ========================================================================= */}
        {activeTab === 'biometrics' && (
          <div className="space-y-6">
            <AdminTargetClientSelector
              subscribers={subscribers}
              selectedClientKey={selectedTargetClientKey}
              onSelectClient={selectAndLoadTargetClient}
              onRefreshSubscribers={() => refreshSubscribersDirectory(true)}
              isLoadingClient={isLoadingTargetClient}
              isRefreshingList={isRefreshingSubscribers}
            />

            <div className="bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-orange-400" />
                  <span>محرر قياسات المشترك والوزن (Athlete Biometrics)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تعديل الوزن، نسبة الدهون، الكتلة العضلية، والهدف اليومي للمشترك وتحديثها فوراً في حسابه
                </p>
              </div>

              {savedProfileMessage && (
                <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>تم حفظ القياسات وتحديث حساب المشترك بنجاح!</span>
                </div>
              )}
            </div>

            {/* Quick Live Preview Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-5 rounded-3xl bg-[#070e24] border border-orange-500/30">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">المشترك</span>
                <span className="text-sm font-black text-white truncate block">{profile.name}</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">الوزن الحالي</span>
                <span className="text-base font-black text-orange-400 font-mono">{profile.weight} كجم</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">الطول</span>
                <span className="text-base font-black text-white font-mono">{profile.height} سم</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">الكتلة العضلية</span>
                <span className="text-base font-black text-emerald-400 font-mono">{profile.muscleMass} كجم</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-black/40 border border-white/10 text-center">
                <span className="text-[11px] text-slate-400 block mb-1">نسبة الدهون</span>
                <span className="text-base font-black text-rose-400 font-mono">{profile.bodyFat}%</span>
              </div>
            </div>

            {/* Edit Form */}
            <form onSubmit={handleSaveProfile} className="bg-[#0B132B]/80 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
              <h3 className="text-base font-black text-white flex items-center gap-2 border-b border-white/10 pb-3">
                <Activity className="w-4 h-4 text-orange-400" />
                <span>القيم والقياسات المعتمدة للمتدرب:</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">اسم المشترك:</label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">الوزن الحالي (كجم):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.weight}
                    onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">الطول (سم):</label>
                  <input
                    type="number"
                    value={profile.height}
                    onChange={(e) => setProfile({ ...profile, height: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">الكتلة العضلية (كجم):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.muscleMass}
                    onChange={(e) => setProfile({ ...profile, muscleMass: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">نسبة الدهون (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.bodyFat}
                    onChange={(e) => setProfile({ ...profile, bodyFat: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">الوزن المستهدف (كجم):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.targetWeight}
                    onChange={(e) => setProfile({ ...profile, targetWeight: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">السعرات اليومية المستهدفة (Kcal):</label>
                  <input
                    type="number"
                    value={profile.dailyCalories}
                    onChange={(e) => setProfile({ ...profile, dailyCalories: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">الهدف اليومي للماء (لتر):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={profile.dailyWaterGoal}
                    onChange={(e) => setProfile({ ...profile, dailyWaterGoal: Number(e.target.value) })}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-slate-400">
                  💡 عند الضغط على الحفظ، ستتحدث بيانات المشترك وشريط القياسات ومؤشر BMI تلقائياً في حسابه.
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetProfile}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-300 hover:text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-400" />
                    <span>إعادة ضبط</span>
                  </button>

                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Save className="w-4 h-4" />
                    <span>حفظ القياسات وتحديث حساب المتدرب</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            TAB 2.6: REAL REVENUE & ACADEMY ANALYTICS (لوحة التحليلات والإيرادات)
            ========================================================================= */}
        {activeTab === 'revenue' && (
          <CoachAnalyticsView
            language={language}
            theme={theme}
            onOpenClientProfile={() => setActiveTab('biometrics')}
          />
        )}

        {/* =========================================================================
            TAB 2.7: DYNAMIC ASSESSMENT & ANALYTICS (التقييم والتحليل الشامل)
            ========================================================================= */}
        {(activeTab === 'assessment' || activeTab === 'analytics') && (
          <AdminAssessmentEditor
            profile={profile}
            onUpdateProfile={(updated) => {
              setProfile(updated);
            }}
            language={language}
            subscribers={subscribers}
            selectedClientKey={selectedTargetClientKey}
            onSelectClient={selectAndLoadTargetClient}
            targetClient={selectedTargetClient}
            isLoadingClient={isLoadingTargetClient}
            onRefreshSubscribers={() => refreshSubscribersDirectory(true)}
          />
        )}

        {/* =========================================================================
            TAB 2.8: ADVANCED NUTRITION & MEAL PLAN EDITOR (الأنظمة الغذائية CRUD)
            ========================================================================= */}
        {activeTab === 'diet' && (
          <AdminDietEditor
            language={language}
            subscribers={subscribers}
            selectedClientKey={selectedTargetClientKey}
            onSelectClient={selectAndLoadTargetClient}
            targetClient={selectedTargetClient}
            isLoadingClient={isLoadingTargetClient}
            onRefreshSubscribers={() => refreshSubscribersDirectory(true)}
          />
        )}

        {/* =========================================================================
            TAB 3: INQUIRIES & NOTES
            ========================================================================= */}
        {activeTab === 'inquiries' && (
          <div className="space-y-6">
            <div className="bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">صندوق استفسارات المشتركين</h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تواصل مباشر مع المتدربين، الرد على ملاحظاتهم اليومية، أو إضافة توجيهات جديدة
                </p>
              </div>

              <button
                onClick={() => setIsAddInquiryOpen((prev) => !prev)}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs flex items-center gap-2 cursor-pointer shadow-lg self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>{isAddInquiryOpen ? 'إغلاق النموذج' : 'إضافة ملاحظة / استفسار جديد'}</span>
              </button>
            </div>

            {isAddInquiryOpen && (
              <form
                onSubmit={handleAddAdminNote}
                className="p-6 rounded-3xl bg-[#070e24] border border-orange-500/40 space-y-4 text-start"
              >
                <h3 className="text-sm font-black text-white">إضافة ملاحظة أو رسالة متابعة جديدة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">اسم المشترك:</label>
                    <input
                      type="text"
                      value={newInquiryClientName}
                      onChange={(e) => setNewInquiryClientName(e.target.value)}
                      placeholder={profile.name || 'اسم المتدرب'}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">عنوان الموضوع:</label>
                    <input
                      type="text"
                      required
                      value={newInquirySubject}
                      onChange={(e) => setNewInquirySubject(e.target.value)}
                      placeholder="مثال: تحديث جدول التمارين أو ملاحظة غذائية"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">نص الرسالة:</label>
                  <textarea
                    required
                    rows={3}
                    value={newInquiryMessage}
                    onChange={(e) => setNewInquiryMessage(e.target.value)}
                    placeholder="اكتب الملاحظة أو الاستفسار هنا..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs outline-none resize-none"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddInquiryOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs cursor-pointer shadow-md"
                  >
                    حفظ وإرسال الملاحظة
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-4">
              {notes.length === 0 ? (
                <div className="p-12 text-center rounded-3xl bg-[#0B132B]/60 border border-white/10 space-y-3">
                  <MessageSquare className="w-10 h-10 text-orange-400/40 mx-auto" />
                  <p className="text-sm font-bold text-slate-300">
                    لا توجد استفسارات مرسلة من المشتركين حالياً.
                  </p>
                  <p className="text-xs text-slate-500">
                    عندما يقوم أي مشترك بكتابة استفسار من حسابه، سيصلك فورياً هنا للرد عليه مباشرة.
                  </p>
                </div>
              ) : (
                notes.map((note) => (
                <div
                  key={note.id}
                  className="p-6 rounded-3xl bg-[#0B132B]/90 border border-white/10 space-y-4"
                >
                  <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3">
                    <div>
                      <span className="text-sm font-black text-white">{note.clientName}</span>
                      <span className="text-xs text-slate-400 mx-2">•</span>
                      <span className="text-xs text-orange-400 font-bold">{note.subject}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">{note.timestamp}</span>
                      {confirmDeleteNoteId === note.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[11px] font-black cursor-pointer hover:bg-red-500 transition-all"
                          >
                            تأكيد
                          </button>
                          <button
                            onClick={() => setConfirmDeleteNoteId(null)}
                            className="px-2 py-1 rounded-lg bg-white/10 text-slate-300 text-[11px] font-bold cursor-pointer hover:bg-white/20 transition-all"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteNoteId(note.id)}
                          className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 transition-all cursor-pointer"
                          title="حذف الاستفسار"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-black/40 p-4 rounded-2xl border border-white/5">
                    {note.message}
                  </p>

                  {note.reply ? (
                    <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/30 text-xs space-y-2">
                      <div className="flex items-center justify-between text-orange-400 font-bold">
                        <span>رد الكوتش عمر:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-400">{note.replyTimestamp}</span>
                          {editingReplyNoteId !== note.id && (
                            <button
                              onClick={() => {
                                setEditingReplyNoteId(note.id);
                                setEditReplyText(note.reply || '');
                              }}
                              className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Edit3 className="w-3 h-3 text-orange-400" />
                              <span>تعديل الرد</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {editingReplyNoteId === note.id ? (
                        <div className="flex items-center gap-2 pt-1">
                          <input
                            type="text"
                            value={editReplyText}
                            onChange={(e) => setEditReplyText(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-xl bg-black/50 border border-orange-500/40 text-white text-xs outline-none"
                          />
                          <button
                            onClick={() => handleSaveEditedReply(note.id)}
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs cursor-pointer"
                          >
                            حفظ
                          </button>
                          <button
                            onClick={() => {
                              setEditingReplyNoteId(null);
                              setEditReplyText('');
                            }}
                            className="px-3 py-2 rounded-xl bg-white/10 text-slate-300 font-bold text-xs cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <p className="text-slate-200">{note.reply}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="text"
                        value={replyTexts[note.id] || ''}
                        onChange={(e) =>
                          setReplyTexts((prev) => ({ ...prev, [note.id]: e.target.value }))
                        }
                        placeholder="اكتب رد الكوتش هنا..."
                        className="flex-1 px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs outline-none"
                      />
                      <button
                        onClick={() => handleSendReply(note.id)}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white font-black text-xs transition-transform hover:scale-105 cursor-pointer"
                      >
                        إرسال الرد
                      </button>
                    </div>
                  )}
                </div>
              )))}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 4: DATABASE STATUS, SUPABASE CLOUD SYNC & AI LOGS
            ========================================================================= */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* System Operational Mode Banner */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-[#0B132B] via-[#071329] to-[#040817] border border-emerald-500/40 shadow-xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-black text-white">المزامنة السحابية المباشرة عبر Supabase (Cloud-Only Database Sync)</h2>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold">
                        CLOUD SYNC ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-0.5">
                      جميع بيانات المنصة (حسابات المشتركين، التمارين، الأنظمة الغذائية، التقييمات، مؤشرات الجسم، والاستفسارات) تقرأ وتُحفظ مباشرة في جداول Supabase السحابية. إذا ظهر خطأ أمان الصفوف (RLS 42501)، استخدم زر &laquo;نسخ كود إصلاح RLS للجداول&raquo; أدناه وشغّله في Supabase SQL Editor.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Supabase Cloud Connection Settings */}
            <div className="bg-[#0B132B]/80 p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div>
                  <h3 className="text-xl font-black text-white flex items-center gap-2">
                    <Database className="w-5 h-5 text-orange-400" />
                    <span>إعدادات ربط قاعدة البيانات السحابية Supabase &amp; سياسات RLS</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    اربط مشروعك عبر <span className="text-orange-400 font-mono">.env</span> أو أدخل رابط المشروع ومفتاح <span className="text-orange-400 font-mono">anon</span> هنا. في حال وجود قيود Row Level Security على جدول <span className="text-orange-400 font-mono">clients</span> أو <span className="text-orange-400 font-mono">subscribers</span>، انسخ كود إصلاح RLS ونفذه مرة واحدة في لوحة Supabase.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={async () => {
                      setConnStatus({ testing: true, message: 'جاري فحص الاتصال...' });
                      const res = await testSupabaseConnection(supabaseUrl, supabaseKey);
                      if (res.tables && res.tables.length > 0) setDbTablesHealth(res.tables);
                      setConnStatus({
                        testing: false,
                        message: res.message,
                        success: res.success,
                        isLocalMode: res.isLocalMode,
                        tables: res.tables,
                      });
                    }}
                    disabled={connStatus.testing}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-md disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${connStatus.testing ? 'animate-spin' : ''}`} />
                    <span>فحص الاتصال بقاعدة البيانات</span>
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {connStatus.message && (
                <div
                  className={`p-4 rounded-2xl border text-xs font-bold flex items-start gap-3 transition-all ${
                    connStatus.success
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : connStatus.isLocalMode
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-200 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                      : 'bg-red-500/15 border-red-500/50 text-red-300'
                  }`}
                >
                  {connStatus.success ? (
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400 mt-0.5" />
                  ) : connStatus.isLocalMode ? (
                    <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <span className="block leading-relaxed">{connStatus.message}</span>
                    {connStatus.isLocalMode && (
                      <p className="text-[11px] text-slate-300 font-normal">
                        ملاحظة: يجب إدخال بيانات مشروع Supabase صالحة (Project URL و Anon Key) لحفظ واسترجاع بيانات المشتركين سحابياً عبر الأجهزة.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Live 7-Table Schema Diagnostics */}
              {dbTablesHealth.length > 0 && (
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200">
                      حالة جداول Supabase المطلوبة ({dbTablesHealth.filter((t) => t.exists && !t.rlsBlocked).length}/{dbTablesHealth.length} جاهز):
                    </span>
                    {dbTablesHealth.some((t) => !t.exists || t.rlsBlocked) && (
                      <span className="text-[11px] text-amber-300 font-semibold">
                        انسخ كود SQL لتهيئة الجداول وشغّله في Supabase SQL Editor لإنشاء الجداول المفقودة
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {dbTablesHealth.map((t) => (
                      <span
                        key={t.table}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border flex items-center gap-1.5 ${
                          !t.exists
                            ? 'bg-red-500/15 border-red-500/40 text-red-300'
                            : t.rlsBlocked
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        <span>{t.table}</span>
                        <span>{!t.exists ? '✕ مفقود' : t.rlsBlocked ? '⚠ RLS' : '✓'}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Inputs for Supabase credentials */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    رابط مشروع Supabase (Project URL):
                  </label>
                  <input
                    type="text"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    placeholder="https://your-project-id.supabase.co"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    من لوحة تحكم Supabase &gt; Project Settings &gt; API
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">
                    مفتاح الربط العام (Anon Public Key):
                  </label>
                  <input
                    type="password"
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white text-xs font-mono outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    مفتاح anon العام المخصص لتطبيقات الويب
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      saveSupabaseConfig(supabaseUrl, supabaseKey);
                      setSavedConfigMessage(true);
                      setTimeout(() => setSavedConfigMessage(false), 3000);
                    }}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs transition-all cursor-pointer flex items-center gap-2 shadow-md"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>تطبيق بيانات الربط للجلسة الحالية</span>
                  </button>

                  {savedConfigMessage && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>تم الحفظ بنجاح!</span>
                    </span>
                  )}
                </div>

                {/* Copy SQL Schema & RLS Fix Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_RLS_FIX_SQL);
                      setCopiedRlsFix(true);
                      setTimeout(() => setCopiedRlsFix(false), 3000);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{copiedRlsFix ? 'تم نسخ كود إصلاح RLS بنجاح!' : 'نسخ كود إصلاح RLS للجداول'}</span>
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
                      setCopiedSchema(true);
                      setTimeout(() => setCopiedSchema(false), 3000);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-slate-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-orange-400" />
                    <span>{copiedSchema ? 'تم نسخ كود SQL بنجاح!' : 'نسخ كود SQL لتهيئة الجداول'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* AI Generation Logs Section */}
            <div className="bg-[#0B132B]/80 p-6 rounded-3xl border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">
                    سجلات توليد الخطط الذكية (AI Generation Logs)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    تتبع الخطط التدريبية والغذائية المولدة بالذكاء الاصطناعي والمزامنة مع Supabase
                  </p>
                </div>
                <button
                  onClick={refreshAILogs}
                  className="text-xs text-orange-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer transition-all"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingLogs ? 'animate-spin' : ''}`} />
                  <span>تحديث السجلات</span>
                </button>
              </div>

              {aiLogs.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-white/5 rounded-2xl bg-black/20">
                  لا توجد سجلات توليد مسجلة حالياً (يتم تسجيلها تلقائياً عند توليد أي برنامج تدريبي أو غذائي)
                </div>
              ) : (
                <div className="space-y-3">
                  {aiLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1.5">
                      <div className="flex justify-between text-slate-400 font-mono text-[10px]">
                        <span>{log.id}</span>
                        <span>{new Date(log.created_at).toLocaleString('ar-SA')}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white">{log.client_name} • {log.plan_type === 'nutrition' ? 'خطة غذائية' : 'خطة تمارين'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-[10px] font-mono">
                          {log.model_name}
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] line-clamp-2 leading-relaxed bg-black/30 p-2.5 rounded-xl">{log.ai_output}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Exercise Modal */}
      {newExerciseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0B132B] border border-orange-500/40 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg font-black text-white">
              {editingExercise ? 'تعديل بيانات التمرين المعتمد' : 'إضافة تمرين جديد لجدول التدريب'}
            </h3>
            <form onSubmit={handleSaveExercise} className="space-y-4 text-start">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اسم التمرين بالعربي:</label>
                <input
                  type="text"
                  required
                  value={newExNameAr}
                  onChange={(e) => setNewExNameAr(e.target.value)}
                  placeholder="مثال: ضغط صدر علوي بالبار"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">العضلة المستهدفة:</label>
                <input
                  type="text"
                  value={newExMuscle}
                  onChange={(e) => setNewExMuscle(e.target.value)}
                  placeholder="الصدر العلوي"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">عدد الجلسات:</label>
                  <input
                    type="number"
                    value={newExSets}
                    onChange={(e) => setNewExSets(Number(e.target.value))}
                    min={1}
                    max={10}
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">نطاق التكرارات:</label>
                  <input
                    type="text"
                    value={newExReps}
                    onChange={(e) => setNewExReps(e.target.value)}
                    placeholder="10 - 12"
                    className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">رابط فيديو التمرين (يوتيوب اختياري):</label>
                <input
                  type="text"
                  value={newExVideo}
                  onChange={(e) => setNewExVideo(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500 font-mono text-start"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">تنبيه الكوتش:</label>
                <textarea
                  rows={3}
                  value={newExCoachWarning}
                  onChange={(e) => setNewExCoachWarning(e.target.value)}
                  placeholder="لا تضحِّ بالتكنيك والمدى الحركي الكامل من أجل زيادة الوزن. الأولوية لعصر العضلة وحمايتك من الإصابات."
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingExercise(null);
                    setNewExerciseModalOpen(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  {editingExercise ? 'حفظ التعديلات' : 'إضافة التمرين'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Day Title & Subtitle Modal (e.g. rename to "يوم صدر فقط") */}
      {isEditDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0B132B] border border-orange-500/40 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg font-black text-white">تعديل مسمى ووصف يوم التمرين</h3>
            <p className="text-xs text-slate-400">
              يمكنك تخصيص مسمى اليوم ليكون مثلاً: &quot;يوم الصدر فقط (Chest Day)&quot; أو &quot;يوم الأرجل والبطات&quot;
            </p>

            <form onSubmit={handleSaveDayDetails} className="space-y-4 text-start">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اسم اليوم بالعربي:</label>
                <input
                  type="text"
                  required
                  value={editDayTitleAr}
                  onChange={(e) => setEditDayTitleAr(e.target.value)}
                  placeholder="مثال: يوم الصدر فقط (CHEST DAY)"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">وصف العضلات المستهدفة:</label>
                <input
                  type="text"
                  value={editDaySubtitleAr}
                  onChange={(e) => setEditDaySubtitleAr(e.target.value)}
                  placeholder="مثال: تركيز كامل على عضلات الصدر العلوي والسفلي والوسط"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditDayModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  حفظ مسمى اليوم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Workout Day Modal */}
      {isAddDayModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-lg bg-[#0B132B] border border-emerald-500/40 rounded-3xl p-6 sm:p-8 space-y-5">
            <h3 className="text-lg font-black text-white">إضافة يوم تدريبي جديد</h3>
            <p className="text-xs text-slate-400">
              أضف يوماً جديداً إلى جدول التمارين (مثلاً: يوم الكارديو والبطن، أو يوم الذراعين والأكتاف)
            </p>

            <form onSubmit={handleAddWorkoutDay} className="space-y-4 text-start">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اسم اليوم بالعربي:</label>
                <input
                  type="text"
                  required
                  value={newDayTitleAr}
                  onChange={(e) => setNewDayTitleAr(e.target.value)}
                  placeholder="مثال: يوم الأكتاف والذراعين"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-emerald-500 font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">وصف العضلات المستهدفة (اختياري):</label>
                <input
                  type="text"
                  value={newDaySubtitleAr}
                  onChange={(e) => setNewDaySubtitleAr(e.target.value)}
                  placeholder="مثال: تركيز على الأكتاف الجانبية والبايسبس والترايسبس"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDayModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white text-xs font-black shadow-md cursor-pointer"
                >
                  إضافة اليوم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Signed Declaration PDF Viewer Modal */}
      {selectedDeclaration && (
        <SignedDeclarationModal
          isOpen={isDeclarationModalOpen}
          onClose={() => {
            setIsDeclarationModalOpen(false);
            setSelectedDeclaration(null);
          }}
          agreement={selectedDeclaration}
          language={language}
        />
      )}

      {/* Save Workout Template Modal */}
      {isSaveWorkoutTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setIsSaveWorkoutTemplateModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">حفظ جدول التمارين كقالب</h3>
                <p className="text-xs text-slate-400 font-medium">
                  احفظ هذا التقسيم والتمارين لإعادة تطبيقها على أي مشترك بنقرة واحدة
                </p>
              </div>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newWorkoutTemplateName.trim()) return;
                const newTmpl: WorkoutTemplate = {
                  id: `wt_${Date.now()}`,
                  nameAr: newWorkoutTemplateName.trim(),
                  nameEn: newWorkoutTemplateName.trim(),
                  category: 'hypertrophy',
                  descriptionAr: `قالب تمارين (${workoutDays.length} أيام تدريبية)`,
                  createdAt: new Date().toISOString(),
                  workoutDays: JSON.parse(JSON.stringify(workoutDays)),
                };
                await saveWorkoutTemplate(newTmpl);
                setWorkoutTemplates(getWorkoutTemplates());
                setIsSaveWorkoutTemplateModalOpen(false);
                setNewWorkoutTemplateName('');
                setWorkoutTemplateNotice('تم حفظ جدول التمارين كقالب سحابي جاهز بنجاح!');
                setTimeout(() => setWorkoutTemplateNotice(null), 3000);
              }}
              className="space-y-4 text-xs"
            >
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">اسم القالب:</label>
                <input
                  type="text"
                  required
                  value={newWorkoutTemplateName}
                  onChange={(e) => setNewWorkoutTemplateName(e.target.value)}
                  placeholder="مثال: جدول دفع/سحب/أرجل تضخيم مكثف"
                  className="w-full px-4 py-2.5 rounded-xl bg-black/50 border border-white/15 focus:border-orange-500 text-white outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-black/40 border border-white/10 text-xs">
                <span className="text-slate-400 block mb-1">عدد الأيام المشمولة:</span>
                <span className="font-mono text-orange-400 font-bold">
                  {workoutDays.length} أيام ({workoutDays.reduce((sum, d) => sum + d.exercises.length, 0)} تمرين معتمد)
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsSaveWorkoutTemplateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shadow-lg cursor-pointer"
                >
                  حفظ القالب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Workout Template Modal */}
      {isApplyWorkoutTemplateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0B132B] border-2 border-orange-500/40 rounded-3xl w-full max-w-lg p-6 shadow-2xl relative text-white space-y-5">
            <button
              onClick={() => setIsApplyWorkoutTemplateModalOpen(false)}
              className="absolute top-5 left-5 text-slate-400 hover:text-white p-2 rounded-xl bg-white/5"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <Bookmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">تطبيق قالب تمارين جاهز</h3>
                <p className="text-xs text-slate-400 font-medium">
                  اختر من القوالب المحفوظة لتطبيقها فوراً على جدول المتدرب
                </p>
              </div>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {workoutTemplates.map((tmpl) => (
                <div
                  key={tmpl.id}
                  className="p-4 rounded-2xl bg-black/40 border border-white/10 hover:border-orange-500/40 transition-all flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-xs font-black text-white">{tmpl.nameAr}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">{tmpl.descriptionAr}</p>
                    <span className="text-[10px] text-orange-400 font-bold block mt-1">
                      {tmpl.workoutDays?.length ? `${tmpl.workoutDays.length} أيام تدريبية` : 'قالب أساسي'}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      if (tmpl.workoutDays && tmpl.workoutDays.length > 0) {
                        const normalizedTemplateDays = normalizeWorkoutDays(tmpl.workoutDays);
                        setWorkoutDays(normalizedTemplateDays);
                        void syncWorkoutDaysToSupabase(
                          targetCanonicalKey,
                          normalizedTemplateDays,
                          targetClientEmail
                        );
                      }
                      setIsApplyWorkoutTemplateModalOpen(false);
                      setWorkoutTemplateNotice(`تم تطبيق قالب التمارين (${tmpl.nameAr}) ومزامنته في Supabase بنجاح!`);
                      setTimeout(() => setWorkoutTemplateNotice(null), 3000);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-xs shrink-0 cursor-pointer shadow-md"
                  >
                    تطبيق 🚀
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Sharing Modal */}
      <SubscriptionQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        onPreviewDirectPage={() => navigate('/subscribe')}
        language={language}
      />
    </div>
  );
};
