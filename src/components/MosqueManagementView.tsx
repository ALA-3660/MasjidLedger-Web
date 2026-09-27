import React from 'react';
import { MosqueProfileSettingsView } from './MosqueProfileSettingsView';
import { Mosque, User } from '../types';
import { Language } from '../lib/i18n';

export interface MosqueManagementViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
  onSaveMosque: (updated: Partial<Mosque>) => Promise<void>;
  onNavigateTab?: (tab: any) => void;
  onOpenLivePortal?: () => void;
  initialSubTab?: any;
}

/**
 * Consolidated Mosque Management & Settings View
 * Forwarding to authoritative MosqueProfileSettingsView
 */
export const MosqueManagementView: React.FC<MosqueManagementViewProps> = (props) => {
  return <MosqueProfileSettingsView {...props} />;
};
