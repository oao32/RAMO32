import React, { createContext, useContext, useMemo } from 'react';
import {
  SubscriptionPlanTier,
  UserSession,
  VIPFeatureKey,
} from '../types';
import { normalizeSubscriptionPlan } from '../lib/supabase';

export interface PlanPermissions {
  interactiveNutrition: boolean;
  directCoachChat: boolean;
  customAIWorkouts: boolean;
  gamificationRewards: boolean;
}

export interface SubscriptionAuthContextValue {
  userSession: UserSession;
  subscriptionPlan: SubscriptionPlanTier;
  isVIP: boolean;
  isStandard: boolean;
  permissions: PlanPermissions;
  canAccessFeature: (feature: VIPFeatureKey) => boolean;
  updateSubscriptionPlan: (plan: SubscriptionPlanTier) => void;
  openUpgradeToVIP: () => void;
}

const SubscriptionAuthContext = createContext<SubscriptionAuthContextValue | null>(null);

interface SubscriptionAuthProviderProps {
  userSession: UserSession;
  rawSubscriptionPlan?: string | null;
  onUpdatePlan: (plan: SubscriptionPlanTier) => void;
  onOpenUpgradeModal: () => void;
  children: React.ReactNode;
}

export const SubscriptionAuthProvider: React.FC<SubscriptionAuthProviderProps> = ({
  userSession,
  rawSubscriptionPlan,
  onUpdatePlan,
  onOpenUpgradeModal,
  children,
}) => {
  const subscriptionPlan: SubscriptionPlanTier = useMemo(
    () => normalizeSubscriptionPlan(rawSubscriptionPlan),
    [rawSubscriptionPlan]
  );

  // Coach Admin and VIP subscribers enjoy full VIP privileges; Standard subscribers do not.
  const isVIP = userSession === 'admin' || (userSession === 'client' && subscriptionPlan === 'VIP');
  const isStandard = userSession === 'client' && subscriptionPlan === 'standard';

  const permissions: PlanPermissions = useMemo(
    () => ({
      interactiveNutrition: isVIP,
      directCoachChat: isVIP,
      customAIWorkouts: isVIP,
      gamificationRewards: isVIP,
    }),
    [isVIP]
  );

  const canAccessFeature = (feature: VIPFeatureKey): boolean => {
    if (userSession === 'admin') return true;
    if (userSession !== 'client') return false;
    switch (feature) {
      case 'interactive_nutrition':
        return permissions.interactiveNutrition;
      case 'direct_coach_chat':
        return permissions.directCoachChat;
      case 'custom_ai_workouts':
        return permissions.customAIWorkouts;
      case 'gamification_rewards':
        return permissions.gamificationRewards;
      default:
        return false;
    }
  };

  const value: SubscriptionAuthContextValue = {
    userSession,
    subscriptionPlan,
    isVIP,
    isStandard,
    permissions,
    canAccessFeature,
    updateSubscriptionPlan: onUpdatePlan,
    openUpgradeToVIP: onOpenUpgradeModal,
  };

  return (
    <SubscriptionAuthContext.Provider value={value}>
      {children}
    </SubscriptionAuthContext.Provider>
  );
};

export function useSubscriptionAuth(): SubscriptionAuthContextValue {
  const ctx = useContext(SubscriptionAuthContext);
  if (!ctx) {
    // Safe fallback if a component renders outside provider
    return {
      userSession: 'guest',
      subscriptionPlan: 'standard',
      isVIP: false,
      isStandard: false,
      permissions: {
        interactiveNutrition: false,
        directCoachChat: false,
        customAIWorkouts: false,
        gamificationRewards: false,
      },
      canAccessFeature: () => false,
      updateSubscriptionPlan: () => {},
      openUpgradeToVIP: () => {},
    };
  }
  return ctx;
}
