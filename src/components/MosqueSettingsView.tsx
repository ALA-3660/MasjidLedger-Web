import React from 'react';
import { MosqueProfileSettingsView } from './MosqueProfileSettingsView';
import { Mosque, User } from '../types';
import { Language } from '../lib/i18n';

export interface MosqueSettingsViewProps {
  currentMosque: Mosque | null;
  currentUser: User | null;
  language?: Language;
  onSaveSettings?: (updated: Partial<Mosque>) => Promise<void>;
  onSaveMosque?: (updated: Partial<Mosque>) => Promise<void>;
  onNavigateTab?: (tab: any) => void;
  onOpenLivePortal?: () => void;
  initialSubTab?: any;
}

/**
 * Consolidated Mosque Settings View
 * Forwarding to authoritative MosqueProfileSettingsView
 */
export const MosqueSettingsView: React.FC<MosqueSettingsViewProps> = ({
  onSaveSettings,
  onSaveMosque,
  ...rest
}) => {
  const handleSave = onSaveMosque || onSaveSettings || (async () => {});
  return <MosqueProfileSettingsView onSaveMosque={handleSave} {...rest} />;
};
