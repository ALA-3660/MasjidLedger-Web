import React, { useState } from 'react';
import {
  BookOpen,
  GraduationCap,
  Sparkles,
  ChevronRight,
  Menu,
  X,
  Layers,
  Award,
  Users,
  Compass,
} from 'lucide-react';
import { LibraryManagementView } from './LibraryManagementView';
import { MaktabManagementView } from './MaktabManagementView';
import { HifzFoundationView } from './HifzFoundationView';
import { Language } from '../lib/i18n';
import { FinancialAccount } from '../types';
import { KnowledgeNoteAiSummaryModal } from './library/KnowledgeNoteAiSummaryModal';

export type KnowledgeCenterModule = 'library' | 'maktab' | 'hifz';

interface LibraryKnowledgeCenterViewProps {
  currentMosque?: any;
  currentUser?: any;
  accounts?: FinancialAccount[];
  language?: Language;
  initialModule?: KnowledgeCenterModule;
  onNavigateTab?: (tab: string) => void;
}

export const LibraryKnowledgeCenterView: React.FC<LibraryKnowledgeCenterViewProps> = ({
  currentMosque,
  currentUser,
  accounts = [],
  language = 'bn',
  initialModule = 'library',
  onNavigateTab,
}) => {
  const [activeModule, setActiveModule] = useState<KnowledgeCenterModule>(initialModule);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isKnowledgeNoteAiOpen, setIsKnowledgeNoteAiOpen] = useState(false);

  const modules = [
    {
      id: 'library' as KnowledgeCenterModule,
      title: language === 'bn' ? '📚 পাঠাগার' : 'Library',
      subtitle: language === 'bn' ? '১১টি বিভাগ • কিতাব ও ক্যাটালগ' : '11 Sections • Books & Catalog',
      icon: BookOpen,
      badge: language === 'bn' ? '১১টি বিভাগ' : '11 Sec',
      color: 'text-emerald-700',
      activeBg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
      tag: 'পাঠাগার',
    },
    {
      id: 'maktab' as KnowledgeCenterModule,
      title: language === 'bn' ? '🕌 মক্তব' : 'Maktab Subsystem',
      subtitle: language === 'bn' ? '১০টি বিভাগ • প্রাথমিক শিক্ষা' : '10 Sections • Primary Education',
      icon: GraduationCap,
      badge: language === 'bn' ? '১০টি বিভাগ' : '10 Sec',
      color: 'text-blue-700',
      activeBg: 'bg-blue-50 text-blue-800 border-blue-300',
      tag: 'মক্তব',
    },
    {
      id: 'hifz' as KnowledgeCenterModule,
      title: language === 'bn' ? '📖 হেফজখানা' : 'Hifz Foundation',
      subtitle: language === 'bn' ? 'এইচ-১ ভিত্তি • কুরআন মুখস্থকরণ' : 'H1 Foundation • Quran Memorization',
      icon: Award,
      badge: language === 'bn' ? 'এইচ-১' : 'H1',
      color: 'text-teal-700',
      activeBg: 'bg-teal-50 text-teal-800 border-teal-300',
      tag: 'হেফজখানা',
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 font-siliguri">
      {/* Mobile Secondary Navigation Toggle */}
      <div className="lg:hidden flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-emerald-700" />
          <span className="font-bold text-sm text-slate-800">
            {activeModule === 'library'
              ? '📚 পাঠাগার'
              : activeModule === 'maktab'
              ? '🕌 মক্তব শিক্ষা কার্যক্রম'
              : '📖 হেফজখানা (এইচ-১ ভিত্তি)'}
          </span>
        </div>
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setIsKnowledgeNoteAiOpen(true)}
            className="px-2.5 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>AI নোট</span>
          </button>
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Left Secondary Sidebar */}
      <div
        className={`${
          isMobileSidebarOpen ? 'block' : 'hidden'
        } lg:block w-full lg:w-72 shrink-0 space-y-4`}
      >
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2 px-1 pb-2 border-b border-slate-100">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-sm">পাঠাগার ও জ্ঞানকেন্দ্র</h2>
              <p className="text-[11px] text-slate-500">ইসলামী শিক্ষা ও কিতাব সম্ভার</p>
            </div>
          </div>

          <nav className="space-y-1.5">
            {modules.map((m) => {
              const Icon = m.icon;
              const isActive = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setActiveModule(m.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left cursor-pointer ${
                    isActive
                      ? `${m.activeBg} font-bold shadow-xs`
                      : 'border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? m.color : 'text-slate-400'}`} />
                    <div>
                      <p className="text-xs font-bold font-siliguri">{m.title}</p>
                      <p className="text-[10px] text-slate-500">{m.subtitle}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      isActive ? 'bg-white/80 text-slate-800 shadow-2xs' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {m.badge}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Quick Notice / Info Box & AI Knowledge Note Summarizer */}
          <div className="p-3.5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200/80 text-emerald-950 text-xs space-y-2.5">
            <div className="flex items-center space-x-1.5 font-bold text-emerald-900 text-[11px]">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              <span>জ্ঞানকেন্দ্র AI নোট সহায়ক</span>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-tiro">
              খুতবা, বয়ান বা আলোচনার কাঁচা নোট থেকে মূল পয়েন্ট ও পাঠযোগ্য বাংলা সারসংক্ষেপ খসড়া তৈরি করুন।
            </p>
            <button
              type="button"
              onClick={() => setIsKnowledgeNoteAiOpen(true)}
              className="w-full py-2 px-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
              <span>✨ AI বয়ান/নোট সারসংক্ষেপ</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Right Content Panel */}
      <div className="flex-1 min-w-0">
        {activeModule === 'library' && (
          <LibraryManagementView
            currentMosque={currentMosque}
            currentUser={currentUser}
            accounts={accounts}
            language={language}
            onNavigateTab={onNavigateTab}
          />
        )}

        {activeModule === 'maktab' && (
          <MaktabManagementView
            currentMosque={currentMosque}
            currentUser={currentUser}
            accounts={accounts}
            language={language}
            onNavigateTab={onNavigateTab}
          />
        )}

        {activeModule === 'hifz' && (
          <HifzFoundationView
            currentMosque={currentMosque}
            currentUser={currentUser}
            language={language}
            onNavigateTab={onNavigateTab}
          />
        )}
      </div>

      {/* Knowledge Center Khutbah/Bayan/Study Note AI Summarizer Modal */}
      <KnowledgeNoteAiSummaryModal
        isOpen={isKnowledgeNoteAiOpen}
        onClose={() => setIsKnowledgeNoteAiOpen(false)}
        mosque={currentMosque}
      />
    </div>
  );
};
