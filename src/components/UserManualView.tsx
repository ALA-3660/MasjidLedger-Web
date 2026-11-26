import React, { useState, useMemo, useRef } from 'react';
import {
  BookOpen,
  Search,
  Printer,
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  HeartHandshake,
  Box,
  Building,
  Crosshair,
  Users,
  Users2,
  UserCheck,
  Landmark,
  ShieldCheck,
  FileBarChart,
  HardDriveDownload,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  Wallet,
  Tv,
  Bell,
  FolderOpen,
  Smartphone,
  ShieldAlert,
  Camera,
  Send,
  Mic,
  MicOff,
  Bot,
  Loader2,
  GraduationCap,
  Settings,
  ChevronsDownUp,
  X,
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { printElement } from '../lib/printUtils';
import { api } from '../lib/api';

interface UserManualViewProps {
  onNavigate?: (tab: NavTab) => void;
}

interface ManualSection {
  id: string;
  category: string;
  title: string;
  icon: React.ElementType;
  targetTab?: NavTab;
  badge?: string;
  isNewOrUpdated?: boolean;
  summary: string;
  steps: string[];
  tips?: string[];
  warnings?: string[];
}

interface AiAssistantAnswer {
  question: string;
  answerBn: string;
  stepsBn: string[];
  tipBn: string;
  recommendedTab: string;
  recommendedTabLabelBn: string;
}

const VALID_NAV_TABS = new Set<string>([
  'dashboard',
  'income',
  'expense',
  'financialManagement',
  'accountHeads',
  'staff',
  'musalliDatabase',
  'committee',
  'notices',
  'cemetery',
  'assets',
  'knowledgeCenter',
  'prayerTimes',
  'live',
  'publicPortal',
  'reports',
  'documents',
  'mosqueManagement',
  'users',
  'qrManagement',
  'audit',
  'backupRestore',
  'smsGateway',
  'userManual',
]);

const AI_QUICK_QUESTIONS = [
  'POS প্রিন্টার দিয়ে রসিদ বা ভাউচার কীভাবে প্রিন্ট করব?',
  'ব্যাংক চার্জ ও মুনাফা মূল আয়-ব্যয়ে না মিশিয়ে কীভাবে সমন্বয় করব?',
  'ক্যামেরা দিয়ে ফাইল সেভ না করে রসিদ বা বিল স্ক্যান করার নিয়ম কী?',
  'বেতন ও সম্মানী এন্ট্রি এবং প্রোফাইল হিস্ট্রি কীভাবে কাজ করে?',
  'অটো-ব্যাকআপ, Google Drive ও পুরাতন ডেটা মাইগ্রেশন কীভাবে করব?',
  'মক্তব, হেফজখানা ও পাঠাগার মডিউল কীভাবে পরিচালনা করব?',
];

export const UserManualView: React.FC<UserManualViewProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  const [expandAllForView, setExpandAllForView] = useState(false);

  // Interactive AI Manual Assistant state
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<AiAssistantAnswer | null>(null);
  const [aiHistory, setAiHistory] = useState<Array<{ role: 'user' | 'model'; text: string }>>([]);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const aiPanelRef = useRef<HTMLDivElement | null>(null);

  const toBanglaDigits = (val: number | string) =>
    String(val).replace(/[0-9]/g, (d) => '০১২৩৪৫৬৭৮৯'[Number(d)] || d);

  const categories = [
    { id: 'ALL', label: 'সকল বিষয়' },
    { id: 'SETUP', label: 'শুরু, সেটিংস ও ইউজার' },
    { id: 'FINANCE', label: 'আয়, ব্যয়, দান ও খাত' },
    { id: 'BANKING', label: 'ব্যাংক, ক্যাশ ও সমন্বয়' },
    { id: 'STAFF', label: 'ইমাম, স্টাফ ও বেতন' },
    { id: 'MUSALLI', label: 'মুসল্লি ও দাতা' },
    { id: 'PROPERTY', label: 'সম্পত্তি, ওয়াকফ ও আইনি' },
    { id: 'KNOWLEDGE', label: 'পাঠাগার, মক্তব ও হেফজ' },
    { id: 'COMMITTEE', label: 'কমিটি, নোটিশ ও কবরস্থান' },
    { id: 'PRAYER', label: 'নামাজ, লাইভ ও পোর্টাল' },
    { id: 'TOOLS', label: 'ক্যামেরা, POS প্রিন্ট ও QR' },
    { id: 'REPORTS', label: 'রিপোর্ট, নথি ও SMS' },
    { id: 'SECURITY', label: 'ব্যাকআপ, অডিট ও PWA' },
  ];

  const sections: ManualSection[] = [
    {
      id: 'quick-start',
      category: 'SETUP',
      title: '১. পরিচিতি, প্রথম দিন শুরু ও AI সহায়তা ব্যবস্থা',
      icon: Sparkles,
      targetTab: 'dashboard',
      badge: 'অবশ্যই পঠনীয়',
      isNewOrUpdated: true,
      summary:
        'MasjidLedger Pro v2.6 একটি সম্পূর্ণ রিয়েল-টাইম মসজিদ পরিচালনা, আর্থিক অডিট, ওয়াকফ সংরক্ষণ ও শিক্ষা ব্যবস্থাপনা প্ল্যাটফর্ম। প্রতিটি এন্ট্রি কেবল মূল ডাটাবেজে সংরক্ষিত হয়—কোনো কাল্পনিক ডেটা নেই।',
      steps: [
        '১.১ মসজিদ পরিচিতি যাচাই: প্রথমে বাম সাইডবার থেকে "🏛️ মসজিদ পরিচিতি ও সেটিংস" মেনুতে গিয়ে মসজিদের নাম, ওয়াকফ EC নম্বর, ঠিকানা, লোগো ও সভাপতি/সম্পাদকের স্বাক্ষর যাচাই করুন।',
        '১.২ প্রারম্ভিক স্থিতি নির্ধারণ: দৈনন্দিন আয়-ব্যয় শুরুর আগে "📊 হিসাব ও লেনদেন" → "💰 প্রারম্ভিক স্থিতি" থেকে পূর্ববর্তী কমিটির নগদ ও ব্যাংক ব্যালেন্স এন্ট্রি দিন।',
        '১.৩ আয়-ব্যয়ের খাত যাচাই: "📑 আয়-ব্যয় খাত (হেড)" মেনুতে গিয়ে আপনার মসজিদের প্রয়োজন অনুযায়ী খাত ও উপ-খাত ঠিক করে নিন।',
        '১.৪ ড্যাশবোর্ড ও AI সহায়তা: ওপরের নেভবারের "এআই অডিটর" দিয়ে পুরো মাসের অডিট সারাংশ এবং নিচের ভাসমান "AI হিসাব সহকারী" দিয়ে যেকোনো বাংলা প্রশ্নের উত্তর পাবেন।',
        '১.৫ দ্রুত টুলস: সাইডবারের নিচে "📷 ক্যামেরা ও লাইভ স্ক্যান", "🖨️ অ্যাকশন QR প্রিন্ট সেন্টার" ও "🔢 নোট ও কয়েন কাউন্টার" যেকোনো সময় ব্যবহারযোগ্য।',
      ],
      tips: [
        'ওপরের ডান পাশে ভাষা সুইচার দিয়ে বাংলা/English পরিবর্তন করা যায় এবং সাইডবারের ওপরের রঙিন বাটন দিয়ে থিম পরিবর্তন করা যায়।',
        'যেকোনো ফর্মে লাল সতর্কবার্তা দেখা দিলে "✨ AI ফর্ম সহায়ক" বাটনে ক্লিক করে সহজ বাংলায় সমাধান দেখে নিতে পারবেন।',
      ],
    },
    {
      id: 'opening-balance-guide',
      category: 'BANKING',
      title: '২. প্রারম্ভিক স্থিতি (Opening Balance) ও হিসাব হস্তান্তর',
      icon: Wallet,
      targetTab: 'financialManagement',
      badge: 'প্রথম ধাপ',
      isNewOrUpdated: true,
      summary:
        'নতুন আর্থিক বছর বা নতুন কমিটির দায়িত্ব গ্রহণের সময় পূর্ববর্তী ক্যাশ ও ব্যাংক স্থিতি এবং পরবর্তী সমন্বয়ের ইতিহাস নিরাপদে সংরক্ষণের নিয়ম।',
      steps: [
        '২.১ বাম সাইডবার থেকে "📊 হিসাব ও লেনদেন" মেনুতে ক্লিক করুন এবং ভেতরের সাব-মেনু থেকে "💰 প্রারম্ভিক স্থিতি" নির্বাচন করুন।',
        '২.২ "➕ নতুন প্রারম্ভিক স্থিতি" বাটনে ক্লিক করে ক্যাশ ইন হ্যান্ড (ক্যাশ বাক্স) অথবা সংশ্লিষ্ট ব্যাংক অ্যাকাউন্ট নির্বাচন করুন।',
        '২.৩ শুরুর তারিখ, টাকার পরিমাণ এবং পূর্ববর্তী কমিটির হস্তান্তর বিবরণী/রেজুলেশন নম্বর লিখে সংরক্ষণ করুন।',
        '২.৪ "🏦 অ্যাকাউন্টভিত্তিক স্থিতি" এবং "🔄 সমন্বয় ইতিহাস" ট্যাবে পূর্বের সকল সমন্বয় ও পরিবর্তনের রেকর্ড দেখা যাবে।',
      ],
      warnings: [
        'প্রারম্ভিক স্থিতি দেওয়ার আগে মূল ব্যাংক স্টেটমেন্ট ও নগদ ক্যাশ গণনা মিলিয়ে নেবেন; এটি ভুল হলে পরবর্তী সব সমাপনী স্থিতি বদলে যাবে।',
      ],
    },
    {
      id: 'income-guide',
      category: 'FINANCE',
      title: '৩. আয় ও প্রাপ্তি (জিরো-স্টোরেজ ক্যামেরা স্ক্যান ও AI স্মার্ট এন্ট্রিসহ)',
      icon: ArrowDownLeft,
      targetTab: 'income',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        'জুমার কালেকশন, দান ও অনুদান, দানবাক্স, ওয়াকফ ভাড়া এবং বিবিধ আয় এন্ট্রি; পাশাপাশি ছবি সেভ না করেই সরাসরি ক্যামেরা বা রসিদ স্ক্যান ও বিকাশ/নগদ SMS থেকে অটো-ফিল।',
      steps: [
        '৩.১ সাইডবার থেকে "💵 আয় ও প্রাপ্তি" মেনুতে যান। ভেতরে ড্যাশবোর্ড, নতুন আয় গ্রহণ, জুমার কালেকশন, দান ও অনুদান, দানবাক্স, ওয়াকফ ভাড়া, অন্যান্য আয়, আয় রেজিস্টার ও বিশ্লেষণ পাবেন।',
        '৩.২ দ্রুত ফর্ম পূরণ (জিরো-স্টোরেজ ক্যামেরা ও AI স্ক্যান): ফর্মের ওপরের AI প্যানেলে ৩টি উপায় রয়েছে — (ক) "📷 ক্যামেরা দিয়ে রসিদ স্ক্যান করুন (ফাইল সেভ না করে)", (খ) "রসিদ / স্ক্রিনশট স্ক্যান" (গ্যালারি থেকে ছবি), (গ) বিকাশ/নগদ SMS বা বাংলা টেক্সট/ভয়েস।',
        '৩.৩ ক্যামেরা বা ছবি থেকে AI তথ্য পড়ার পর তা সরাসরি সেভ হয় না এবং কোনো ছবি সার্ভার/ডাটাবেসে জমা থাকে না; প্রিভিউ কার্ডে তারিখ, অঙ্ক ও খাত যাচাই করে "ফর্মে বসান / Apply" চাপলে ফর্মের ঘরে বসবে।',
        '৩.৪ তারিখ বা টাকার অঙ্ক অস্পষ্ট থাকলে বা আলো কম হলে AI অনুমান না করে সতর্কবার্তা দেখাবে—তখন হাতে সঠিক তথ্য লিখে দিন।',
        '৩.৫ জুমার কালেকশনে গণনা টিম, ২ জন সাক্ষী ও নোট-কয়েন কাউন্টারসহ এন্ট্রি দিয়ে "আয় সংরক্ষণ করুন" চাপুন এবং A4 মানি রিসিট অথবা POS থার্মাল স্লিপ প্রিন্ট করুন।',
      ],
      tips: [
        'দান ও অনুদান এন্ট্রিতে দাতার মোবাইল দিলে স্বয়ংক্রিয়ভাবে দাতার প্রোফাইলের সাথে যুক্ত হয় এবং চাইলে ধন্যবাদ SMS পাঠানো যায়।',
      ],
    },
    {
      id: 'expense-guide',
      category: 'FINANCE',
      title: '৪. ব্যয় ও পরিশোধ (বেতন পরিশোধ ফর্ম, বিল ক্যামেরা স্ক্যান ও বাজেট)',
      icon: ArrowUpRight,
      targetTab: 'expense',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        'সাধারণ ব্যয়, ইমাম-স্টাফ বেতন পরিশোধ, ইউটিলিটি বিল, মেরামত, নির্মাণ, ব্যয় রিকনসিলিয়েশন ও বাজেট নিয়ন্ত্রণ এবং জিরো-স্টোরেজ বিল/ক্যাশ মেমো স্ক্যান।',
      steps: [
        '৪.১ সাইডবার থেকে "💸 ব্যয় ও পরিশোধ" মেনুতে যান। এখান থেকে আলাদা আলাদা খতিয়ান (বেতন ও সম্মানী, বিদ্যুৎ/গ্যাস/পানি, পরিষ্কার-পরিচ্ছন্নতা, মেরামত, নির্মাণ, ক্রয়) দেখা ও এন্ট্রি দেওয়া যায়।',
        '৪.২ "💰 বেতন ও সম্মানী" ট্যাবে গিয়ে "+ বেতন পরিশোধ" বাটনে ক্লিক করলে সরাসরি "ইমাম ও স্টাফ মাসিক হাদিয়া/বেতন পরিশোধ" ফর্ম ওপেন হবে এবং মসজিদের প্রকৃত "বেতন-ভাতা প্রদান" প্রধান খাতে হিসাবভুক্ত হবে।',
        '৪.৩ বিল/ক্যাশ মেমো ক্যামেরা স্ক্যান: "নতুন ব্যয় এন্ট্রি" বা যেকোনো খাতে গিয়ে "📷 ক্যামেরা দিয়ে বিল/ক্যাশ মেমো স্ক্যান করুন (ফাইল সেভ না করে)" অথবা "বিল / ক্যাশ মেমো স্ক্যান" দিয়ে দোকানের মেমো স্ক্যান করুন—প্রিভিউ দেখে "ফর্মে বসান / Apply" চাপুন।',
        '৪.৪ বিদ্যুৎ/গ্যাস/পানি ট্যাবে আলাদা ইউটিলিটি বিল স্ক্যানার রয়েছে এবং ব্যয় এডিট (Edit) বাটনে ক্লিক করলে ঠিক মূল এন্ট্রি ফর্মটিই (যেমন বেতনের জন্য বেতন পরিশোধ ফর্ম) এডিট করার জন্য খুলবে।',
        '৪.৫ "📊 ব্যয় রিকনসিলিয়েশন" ও "🎯 বাজেট ও ব্যয় নিয়ন্ত্রণ" ট্যাবে ডাবল পেমেন্ট অডিট ও খাতভিত্তিক বাজেট সীমা যাচাই করতে পারবেন।',
      ],
      warnings: [
        'বেতন ছাড়া মিস্ত্রির মজুরি বা আপ্যায়ন খরচ "বেতন ও সম্মানী" খাতে দেবেন না—সংশ্লিষ্ট মেরামত, নির্মাণ বা ক্রয় খাতে এন্ট্রি দিন।',
      ],
    },
    {
      id: 'donation-boxes',
      category: 'FINANCE',
      title: '৫. দানবাক্স (Donation Box) পরিচালনা, QR ও নোট গণনা',
      icon: Box,
      targetTab: 'income',
      badge: 'অডিট বান্ধব',
      summary:
        'মসজিদের স্থায়ী দানবাক্স ও বাজার/দোকানের কালেকশন বক্সের QR ট্র্যাকিং, সাক্ষীসহ খোলা এবং নোট-কয়েন কাউন্টারে গণনার নিয়ম।',
      steps: [
        '৫.১ "💵 আয় ও প্রাপ্তি" মেনুর ভেতরে "📦 দানবাক্স কালেকশন" ট্যাবে যান।',
        '৫.২ "+ নতুন দানবাক্স" দিয়ে বাক্সের নম্বর, অবস্থান ও দায়িত্বশীলের নাম যোগ করুন; প্রতিটি বক্সের আলাদা QR কোড তৈরি হবে।',
        '৫.৩ বক্স খোলার দিন "গণনা ও সংগ্রহ" বাটনে ক্লিক করে গণনা টিম ও সাক্ষীদের নাম লিখুন।',
        '৫.৪ ১০০০ থেকে ১ টাকার নোট ও কয়েনের সংখ্যা বসালে মোট টাকা স্বয়ংক্রিয়ভাবে হিসাব হবে (চাইলে AI নোট কাউন্টার দিয়ে দ্রুত বসানো যায়)।',
        '৫.৫ নিশ্চিত করলে টাকাটি নির্বাচিত ক্যাশ/ব্যাংক অ্যাকাউন্টে যোগ হয়ে আয় ভাউচার ও প্রিন্টেবল গণনা স্লিপ তৈরি করবে।',
      ],
    },
    {
      id: 'account-heads-guide',
      category: 'FINANCE',
      title: '৬. আয়-ব্যয় খাত (Chart of Accounts) ও AI খাত অপ্টিমাইজার',
      icon: Layers,
      targetTab: 'accountHeads',
      badge: 'নতুন সংযুক্তি',
      isNewOrUpdated: true,
      summary:
        'আয় ও ব্যয়ের প্রধান খাত (Main Head) ও উপ-খাত (Sub-Head) তৈরি, কোড বিন্যাস, স্টাফ বেতন খাত সংযোগ এবং অপ্রয়োজনীয় খাত পরিচ্ছন্ন রাখার নিয়ম।',
      steps: [
        '৬.১ সাইডবার থেকে "📑 আয়-ব্যয় খাত (হেড)" মেনুতে যান।',
        '৬.২ আয়ের খাত এবং ব্যয়ের খাত আলাদা ট্যাবে দেখানো হয়; যেমন ব্যয়ের মধ্যে "বেতন-ভাতা প্রদান (EXP-100)" প্রধান খাত ও তার অধীনে স্টাফভিত্তিক উপ-খাত।',
        '৬.৩ "+ নতুন প্রধান খাত" বা খাতের ডানদিকে "+ উপ-খাত" বাটনে ক্লিক করে নতুন খাত যোগ বা সম্পাদনা করুন।',
        '৬.৪ AI টুলস দিয়ে আদর্শ মসজিদ খাত টেমপ্লেট, খাত প্রস্তাবনা ও অব্যবহৃত খাত বিশ্লেষণ ব্যবহার করতে পারবেন।',
      ],
      warnings: [
        'যে খাতে ইতোমধ্যে লেনদেন যুক্ত আছে সেটি মুছে না ফেলে নিষ্ক্রিয় রাখুন, এতে পুরাতন রিপোর্টের হিসাব অক্ষত থাকবে।',
      ],
    },
    {
      id: 'banking-reconciliation',
      category: 'BANKING',
      title: '৭. হিসাব, ক্যাশবুক, ব্যাংক লেনদেন ও ব্যাংক সমন্বয় (চার্জ ও মুনাফা)',
      icon: Landmark,
      targetTab: 'financialManagement',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        'ক্যাশ বুক, ব্যাংক অ্যাকাউন্ট, নগদ জমা/উত্তোলন, তহবিল স্থানান্তর এবং মূল আয়-ব্যয়ে না মিশিয়ে ব্যাংক সার্ভিস চার্জ ও ব্যাংক মুনাফা (ইন্টারেস্ট) সমন্বয়ের পূর্ণ নিয়ম।',
      steps: [
        '৭.১ সাইডবার থেকে "📊 হিসাব ও লেনদেন" মেনুতে যান। ভেতরে "দৈনিক লেনদেন", "প্রারম্ভিক স্থিতি", "ক্যাশ বুক" এবং "ব্যাংক অ্যাকাউন্ট" মডিউল রয়েছে।',
        '৭.২ ক্যাশ বুক: নগদ প্রাপ্তি ও প্রদান, নোট-কয়েন ভাংতি হিসাব ও "🔄 ক্যাশ সমন্বয় ও ভাংতি" এখান থেকে মেলাতে পারবেন।',
        '৭.৩ ব্যাংক লেনদেন: "🏦 ব্যাংক ও হিসাব" থেকে ব্যাংক অ্যাকাউন্ট যুক্ত করুন এবং "➕ টাকা জমা" (ক্যাশ→ব্যাংক), "➖ টাকা উত্তোলন" (ব্যাংক→ক্যাশ) বা "🔄 তহবিল স্থানান্তর" করুন।',
        '৭.৪ ব্যাংক চার্জ ও ব্যাংক মুনাফা (ইন্টারেস্ট) সমন্বয়: মূল আয়-ব্যয়ের খাত তৈরি করে এন্ট্রি না দিয়ে ব্যাংক মডিউলের "🔄 ব্যাংক সমন্বয়" (Bank Reconciliation) ট্যাবে যান। সেখানে "ব্যাংক চার্জ/ভ্যাট" বা "ব্যাংক মুনাফা/ইন্টারেস্ট" সমন্বয় এন্ট্রি দিলে মূল আয়-ব্যয়ে যোগ-বিয়োগ না হয়ে আলাদাভাবে ব্যাংকের প্রকৃত ব্যালেন্স মিলবে।',
        '৭.৫ "🧾 ব্যাংক স্টেটমেন্ট" ও "AI ব্যাংক সমন্বয়" দিয়ে ব্যাংক স্টেটমেন্টের সাথে সফটওয়্যারের লেনদেন মিলিয়ে নিন।',
      ],
      tips: [
        'ব্যাংক সমন্বয়ে করা চার্জ ও মুনাফার হিসাব আলাদাভাবে রিকনসিলিয়েশন রিপোর্টে থাকে, ফলে মসজিদের মূল দান ও খরচের হিসাব সম্পূর্ণ স্বচ্ছ থাকে।',
      ],
    },
    {
      id: 'staff-payroll',
      category: 'STAFF',
      title: '৮. ইমাম, স্টাফ, হাজিরা, বেতন, ব্যাংক ট্রান্সফার ও চূড়ান্ত নিষ্পত্তি',
      icon: UserCheck,
      targetTab: 'staff',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        'ইমাম, খতিব, মুয়াজ্জিন ও খাদেমদের প্রোফাইল, মাস্টার রেজিস্টার, হাজিরা, ছুটি, মাসিক বেতন (বাংলা মাস ফরম্যাটে), উৎসব ভাতা, অগ্রিম, ব্যাংক ট্রান্সফার লেটার ও আইডি কার্ড প্রিন্ট।',
      steps: [
        '৮.১ সাইডবার থেকে "👤 ইমাম, স্টাফ ও বেতন" মেনুতে যান।',
        '৮.২ জনবল ও প্রোফাইল: "👤 ইমাম ও স্টাফ" এবং "📋 মাস্টার রেজিস্টার" থেকে স্টাফ যুক্ত করুন; যেকোনো স্টাফের প্রোফাইলের "পেমেন্ট হিস্ট্রি" ট্যাবে সকল বেতন "জানুয়ারি-২০২৬" ফরম্যাটে দেখা যাবে।',
        '৮.৩ হাজিরা ও ছুটি: "📅 দৈনিক হাজিরা" ও "📝 ছুটি আবেদন" ট্যাবে নিয়মিত উপস্থিতি ও ছুটির অনুমোদন সংরক্ষণ করুন।',
        '৮.৪ বেতন, বোনাস ও অগ্রিম: "💵 মাসিক বেতন ও পরিশোধ", "🎁 উৎসব ভাতা" এবং "💰 অগ্রিম ও ঋণ" থেকে পরিশোধ করুন; অগ্রিম নিলে মাসিক বেতন থেকে ধাপে ধাপে সমন্বয় হবে।',
        '৮.৫ ব্যাংক ট্রান্সফার ও ডকুমেন্ট: "🏦 বেতন ব্যাংক ট্রান্সফার" থেকে একাধিক স্টাফের বেতন একত্রে ব্যাংকে পাঠানোর অফিসিয়াল লেটার ও ভাউচার তৈরি করুন; স্টাফের আইডি কার্ড, বার্ষিক স্টেটমেন্ট ও পে-স্লিপ প্রিন্ট করুন।',
      ],
      tips: [
        'ব্যয় ব্যবস্থাপনা থেকে বেতন পরিশোধ করলেও তা সরাসরি স্টাফের প্রোফাইলের পেমেন্ট হিস্ট্রিতে এবং মসজিদের "বেতন-ভাতা প্রদান" খাতে সমন্বিত হয়।',
      ],
    },
    {
      id: 'musalli-donor-guide',
      category: 'MUSALLI',
      title: '৯. মুসল্লি ও দাতা ডেটাবেস, পরিবার ও নিয়মিত দান সংগ্রহ',
      icon: HeartHandshake,
      targetTab: 'musalliDatabase',
      badge: 'নতুন সংযুক্তি',
      isNewOrUpdated: true,
      summary:
        'মহল্লার সকল মুসল্লি ও দাতার প্রোফাইল, পরিবার/বাড়ি তালিকা, এলাকা ভিত্তিক বিন্যাস, মাসিক/বাৎসরিক দান ওয়াদা (প্ল্যান) ও আদায়কারী কর্মীর ট্র্যাকিং।',
      steps: [
        '৯.১ সাইডবার থেকে "👥 মুসল্লি ও দাতা ডেটাবেস" মেনুতে যান।',
        '৯.২ প্রথমে "এলাকা / মহল্লা" ও "পরিবার / বাড়ি" তৈরি করে তারপর "মুসল্লি / ব্যক্তি" তালিকাভুক্ত করুন।',
        '৯.৩ কোনো দাতা নিয়মিত মাসিক বা বাৎসরিক চাঁদা দিতে চাইলে "দান পরিকল্পনা" ট্যাবে তাঁর প্রতিশ্রুতি সেট করুন।',
        '৯.৪ আদায়ের সময় "অনুদান সংগ্রহ" বা "অনুদান গ্রহণ ও রসিদ" থেকে এন্ট্রি দিলে তা সরাসরি কেন্দ্রীয় আয় লেজারে যুক্ত হবে এবং দাতার বকেয়া/পরিশোধের হিসাব হালনাগাদ হবে।',
        '৯.৫ দাতার প্রোফাইল বিস্তারিত উইন্ডো থেকে মানি রিসিট বা "থার্মাল স্লিপ (POS 80mm)" প্রিন্ট ও ডাউনলোড করা যায়।',
      ],
    },
    {
      id: 'committee-meetings',
      category: 'COMMITTEE',
      title: '১০. পরিচালনা কমিটি, উপদেষ্টা পরিষদ, কর্মপরিকল্পনা ও দায়িত্ব হস্তান্তর',
      icon: Users2,
      targetTab: 'committee',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        'কমিটির মেয়াদ ও সদস্য তালিকা, উপদেষ্টা পরিষদ, সাব-কমিটি, মিটিং ও AI কার্যবিবরণী, কর্মপরিকল্পনা অগ্রগতি, সদস্য মূল্যায়ন স্কোর ও মেয়াদ শেষে দায়িত্ব হস্তান্তর প্রটোকল।',
      steps: [
        '১০.১ সাইডবার থেকে "👥 কমিটি ব্যবস্থাপনা" মেনুতে যান। ভেতরে ১২টি সমন্বিত সাব-মডিউল রয়েছে।',
        '১০.২ "সদস্য তালিকা", "বর্তমান কমিটি" ও "উপদেষ্টা পরিষদ" ট্যাবে কমিটির মেয়াদ (শুরু-শেষ), পদবী ও প্রোফাইল সংরক্ষণ করুন এবং প্রয়োজন অনুযায়ী "সাব-কমিটি" গঠন করুন।',
        '১০.৩ "মিটিং ও কার্যবিবরণী": নতুন সভার নোটিশ তৈরি, আলোচ্যসূচি ও রেজুলেশন লিখুন—চাইলে AI দিয়ে সভার কার্যবিবরণী ড্রাফট করে প্রিন্ট নিন।',
        '১০.৪ "কর্মপরিকল্পনা ও অগ্রগতি" এবং "সদস্য মূল্যায়ন ও স্কোর" দিয়ে কাজের লক্ষ্যমাত্রা ট্র্যাক করুন।',
        '১০.৫ "কমিটি ভিত্তিক হিসাব" ও "হস্তান্তর (Handover)" ট্যাবে মেয়াদ শেষে পরবর্তী কমিটির কাছে পূর্ণাঙ্গ আর্থিক স্থিতি ও সম্পদ হস্তান্তরের প্রটোকল প্রিন্ট করুন।',
      ],
    },
    {
      id: 'notices-official-docs',
      category: 'COMMITTEE',
      title: '১১. নোটিশ বোর্ড ও দাপ্তরিক যোগাযোগ (লেটারহেড ও AI ড্রাফট)',
      icon: Bell,
      targetTab: 'notices',
      badge: 'নতুন সংযুক্তি',
      isNewOrUpdated: true,
      summary:
        'মসজিদের অফিসিয়াল প্যাডে জরুরি নোটিশ, সভার বিজ্ঞপ্তি, প্রত্যয়নপত্র, দাপ্তরিক চিঠি তৈরি, AI দিয়ে ভাষা ও বানান মার্জিত করা এবং প্রিন্ট/প্রকাশ।',
      steps: [
        '১১.১ সাইডবার থেকে "📢 নোটিশ ও দাপ্তরিক যোগাযোগ" মেনুতে যান।',
        '১১.২ সাধারণ নোটিশ, জরুরি ঘোষণা বা অফিসিয়াল চিঠির ধরন বেছে নিয়ে বিষয় ও মূল পয়েন্ট লিখুন।',
        '১১.৩ চাইলে "✨ AI দিয়ে ড্রাফট / বানান সংশোধন" ব্যবহার করে প্রমিত বাংলায় অফিসিয়াল চিঠি বা নোটিশ প্রস্তুত করে নিন।',
        '১১.৪ মসজিদের লোগো, স্মারক নম্বর, সভাপতি ও সাধারণ সম্পাদকের নাম-স্বাক্ষরসহ লেটারহেড প্রিন্ট করুন অথবা পাবলিক পোর্টালে প্রকাশ করুন।',
      ],
    },
    {
      id: 'waqf-assets-legal',
      category: 'PROPERTY',
      title: '১২. সম্পদ, ওয়াকফ এস্টেট, দলিল আর্কাইভ ও মামলা-আইনি রেজিস্টার',
      icon: Building,
      targetTab: 'assets',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        'মসজিদের অস্থাবর সরঞ্জাম ও সার্ভিসিং, ওয়াকফ জমি/দোকান/মার্কেট, ভাড়াটিয়া ও ইজারা চুক্তি, মৌজা-দাগ-খতিয়ান-খাজনা, মূল দলিল আর্কাইভ, GPS সীমানা ও মামলা-আইনি বিরোধ ব্যবস্থাপনা।',
      steps: [
        '১২.১ সাইডবার থেকে "🏢 সম্পদ ও ওয়াকফ ব্যবস্থাপনা" মেনুতে যান। এর বাম পাশের সাব-মেনুতে ১৭টি বিভাগ রয়েছে।',
        '১২.২ সরঞ্জাম ও ওয়াকফ সম্পত্তি: "মসজিদের সম্পদ ও সরঞ্জাম"-এ এসি/মাইক/ফ্যান ও সার্ভিসিং ইতিহাস এবং "ওয়াকফ সম্পত্তি ও জমিজমা"-তে জমি, দোকান ও মার্কেট নিবন্ধন করুন।',
        '১২.৩ ভাড়াটিয়া ও চুক্তি: "ভাড়াটিয়া / ইজারাদার" ও "চুক্তি ও ইজারা" ট্যাবে মাসিক ভাড়া, জামানত ও মেয়াদ সেট করুন; ভাড়া আদায়ের সাথে সাথে তা আয় রেজিস্টারে যুক্ত হয় এবং রসিদ প্রিন্ট হয়।',
        '১২.৪ ভূমি রেকর্ড ও মূল দলিল: "ভূমি ও ওয়াকফ রেকর্ড"-এ দাগ, CS/SA/RS/BS খতিয়ান ও খাজনা, এবং "ওয়াকফ দলিল ও নথি"-তে মূল দলিল ও নামজারি স্ক্যান আপলোড করুন; "চতুঃসীমানা ও অবস্থান"-এ GPS ও সীমানা লিখুন।',
        '১২.৫ মামলা ও আইনি বিষয়: জমি বা সম্পত্তি সংক্রান্ত কোনো মামলা থাকলে "মামলা ও আইনি বিষয়", আদালত, বাদী-বিবাদী, আইনজীবী, শুনানির ধার্য তারিখ, আদেশ/রায় ও A4 মামলা রেজিস্টার ব্যবহার করুন।',
      ],
      tips: [
        'মসজিদের নামজারিকৃত খতিয়ান ও মূল ওয়াকফনামার PDF/ছবি সবসময় "ওয়াকফ দলিল ও নথি" ও সেন্ট্রাল আর্কাইভে সংরক্ষণ করুন।',
      ],
    },
    {
      id: 'cemetery-register',
      category: 'COMMITTEE',
      title: '১৩. কবরস্থান ব্যবস্থাপনা, দাফন রেজিস্টার ও সনদ প্রিন্ট',
      icon: Crosshair,
      targetTab: 'cemetery',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        'দাফনকৃত মরহুমদের ডিজিটাল রেজিস্টার, ব্লক/সারি/প্লট ও কবর পুনর্ব্যবহার ট্র্যাকিং, AI তথ্য এক্সট্র্যাকশন ও শোকবার্তা, QR কোডযুক্ত A4 দাফন সনদ ও POS 80mm স্লিপ।',
      steps: [
        '১৩.১ সাইডবার থেকে "🪦 কবরস্থান ব্যবস্থাপনা" মেনুতে যান।',
        '১৩.২ "+ নতুন দাফন রেকর্ড" চাপুন; চাইলে বাংলা বিবরণ বা কাগজের নোট থেকে AI দিয়ে মরহুমের তথ্য অটো-ফিল করে নিতে পারবেন।',
        '১৩.৩ মরহুমের নাম, পিতা/স্বামীর নাম, মৃত্যুর ও দাফনের তারিখ, জানাজার সময়, কবর ব্লক/প্লট নম্বর এবং ওয়ারিশের মোবাইল এন্ট্রি দিন।',
        '১৩.৪ সংরক্ষণের পর যেকোনো রেকর্ডের "প্রিন্ট" অপশন থেকে QR কোডসহ "A4 দাফন সনদ / প্রত্যয়ন পত্র" অথবা "POS থার্মাল স্লিপ (80mm)" প্রিন্ট করুন।',
      ],
    },
    {
      id: 'knowledge-center-guide',
      category: 'KNOWLEDGE',
      title: '১৪. পাঠাগার, মক্তব ও হেফজখানা (জ্ঞানকেন্দ্র ও শিক্ষা ব্যবস্থাপনা)',
      icon: GraduationCap,
      targetTab: 'knowledgeCenter',
      badge: 'নতুন সংযুক্তি',
      isNewOrUpdated: true,
      summary:
        'মসজিদভিত্তিক ইসলামি পাঠাগার (১১টি বিভাগ), মক্তব শিক্ষা কার্যক্রম (১০টি বিভাগ) ও পূর্ণাঙ্গ হেফজখানা (সবক, সবকী, দাওর, আবাসন ও হাজিরা) পরিচালনার নিয়ম।',
      steps: [
        '১৪.১ সাইডবার থেকে "📚 পাঠাগার ও জ্ঞানকেন্দ্র" মেনুতে যান। ওপরের বা বাম প্যানেলে ৩টি প্রধান মডিউল পাবেন: পাঠাগার, মক্তব ও হেফজখানা।',
        '১৪.২ পাঠাগার (১১টি বিভাগ): কিতাব ও বই ক্যাটালগ, তাক/র‍্যাক-সেলফ লোকেশন, পাঠক সদস্য নিবন্ধন, বই ধার দেওয়া-ফেরত, বকেয়া রিমাইন্ডার ও AI কিতাব নোট তৈরি।',
        '১৪.৩ মক্তব (১০টি বিভাগ): শিক্ষার্থীদের প্রোফাইল, শ্রেণি ও সিলেবাস, উস্তাদ নির্ধারণ, দৈনিক হাজিরা, পড়াশোনার অগ্রগতি ও মাসিক মক্তব ফি আদায় (আয় খাতে সংযোগসহ)।',
        '১৪.৪ হেফজখানা (এইচ-১ ভিত্তি): হাফেজ ছাত্রদের ভর্তি, উস্তাদ বরাদ্দ, দৈনিক সবক, সবকী ও দাওর/রিভিশন রেকর্ড, হেফজ হাজিরা, আবাসিক ভবন-রুম-বেড বরাদ্দ ও পূর্ণাঙ্গ রিপোর্ট সেন্টার।',
      ],
    },
    {
      id: 'prayer-schedule-guide',
      category: 'PRAYER',
      title: '১৫. নামাজের সময়সূচি, আজান ও জামাত নির্ধারণ (১২-ঘণ্টা ফরম্যাট)',
      icon: Clock,
      targetTab: 'prayerTimes',
      badge: 'অত্যন্ত গুরুত্বপূর্ণ',
      summary:
        'মসজিদের জেলার অক্ষাংশ-দ্রাঘিমাংশ অনুযায়ী ৫ ওয়াক্তের শুরু ও শেষ স্বয়ংক্রিয়ভাবে হিসাব হয়; আর আজান ও জামাতের সময় কর্তৃপক্ষ নিজস্ব রুটিন অনুযায়ী ১২-ঘণ্টা AM/PM ফরম্যাটে সেট করেন।',
      steps: [
        '১৫.১ সাইডবার থেকে "🕌 নামাজের সময়সূচি" মেনুতে যান।',
        '১৫.২ আপনার মসজিদের জেলা নির্বাচন করুন—সূর্যোদয়, সূর্যাস্ত, সেহরি, ইফতার ও ৫ ওয়াক্তের শুরু-শেষ সময় স্বয়ংক্রিয়ভাবে হালনাগাদ হবে।',
        '১৫.৩ "সময়সূচি পরিবর্তন / কুইক এডিট" বাটনে ক্লিক করে প্রতিটি ওয়াক্ত ও জুমার আজান, বয়ান ও জামাতের সময় স্পষ্ট ১২-ঘণ্টা AM/PM ফরম্যাটে (যেমন 1:30 PM) সেট করুন।',
        '১৫.৪ প্রয়োজনে নির্দিষ্ট দিনের জন্য "দৈনিক বিশেষ পরিবর্তন (Override)" এবং নোটিশ বোর্ডের জন্য মাসিক/দৈনিক A4 ক্যালেন্ডার প্রিন্ট করুন।',
      ],
      warnings: [
        'আজান ও জামাতের সময় কখনো ২৪-ঘণ্টা ফরম্যাটে (যেমন 13:30) না লিখে সর্বদা ১২-ঘণ্টা AM/PM ফরম্যাটে (যেমন 1:30 PM) লিখবেন।',
      ],
    },
    {
      id: 'live-and-public-portal',
      category: 'PRAYER',
      title: '১৬. লাইভ টিভি কিয়স্ক স্ক্রিন (🔴 লাইভ) ও পাবলিক পোর্টাল',
      icon: Tv,
      targetTab: 'live',
      badge: 'ডিজিটাল ডিসপ্লে',
      isNewOrUpdated: true,
      summary:
        'মসজিদের দেয়ালে লাগানো স্মার্ট টিভিতে ফুলস্ক্রিন আজান-জামাত কাউন্টডাউন ডিসপ্লে (🔴 লাইভ) এবং সাধারণ মুসল্লিদের জন্য স্বচ্ছ পাবলিক ওয়েবপেজ ও QR কোড পরিচালনা।',
      steps: [
        '১৬.১ স্মার্ট টিভি মোড: সাইডবার থেকে "🔴 লাইভ" মেনুতে ক্লিক করে ফুলস্ক্রিন চালু করুন। এতে চলমান ওয়াক্তের কাউন্টডাউন, পরবর্তী জামাতের সময়, সূর্যোদয়-সূর্যাস্ত, নিষিদ্ধ সময় ও জামাতের আগে মোবাইল সাইলেন্ট সতর্কবার্তা দেখাবে।',
        '১৬.২ পাবলিক পোর্টাল: "🌐 পাবলিক পেজ" মেনুতে মসজিদের নামাজের সময়, নোটিশ ও সাধারণ মুসল্লিদের জন্য অনুমোদিত আয়-ব্যয়ের সারসংক্ষেপ প্রদর্শিত হয়।',
        '১৬.৩ পোর্টালের কোন তথ্যগুলো সাধারণ মুসল্লিরা দেখতে পারবেন তা "🏛️ মসজিদ পরিচিতি ও সেটিংস"-এর পাবলিক পোর্টাল সেটিংস থেকে নিয়ন্ত্রণ করা যায়।',
        '১৬.৪ পোর্টালের QR কোড প্রিন্ট করে মসজিদের নোটিশ বোর্ডে টানিয়ে দিলে মুসল্লিরা মোবাইল দিয়ে স্ক্যান করেই স্বচ্ছ হিসাব দেখতে পারবেন।',
      ],
      tips: [
        'ইন্টারনেট সংযোগ সাময়িক বিচ্ছিন্ন হলেও লাইভ ঘড়ি ও নামাজের ডিসপ্লে স্ক্রিন অফলাইনে সচল থাকে।',
      ],
    },
    {
      id: 'pos-printer-qr-camera-tools',
      category: 'TOOLS',
      title: '১৭. POS থার্মাল প্রিন্টার (80mm/58mm), QR কুইক এন্ট্রি ও লাইভ ক্যামেরা স্ক্যানার',
      icon: QrCode,
      targetTab: 'qrManagement',
      badge: 'নতুন ও জরুরি',
      isNewOrUpdated: true,
      summary:
        'কম্পিউটার বা মোবাইল ব্লুটুথ দিয়ে POS থার্মাল প্রিন্টার (80mm ও 58mm) সেটআপ, QR ও কুইক এন্ট্রি, অ্যাকশন QR কার্ড, ইউনিভার্সাল ক্যামেরা স্ক্যানার এবং নোট-কয়েন কাউন্টার ব্যবহারের নিয়ম।',
      steps: [
        '১৭.১ কম্পিউটারে POS প্রিন্টার সেটআপ: USB বা LAN থার্মাল প্রিন্টার যুক্ত করে প্রিন্টারের ড্রাইভার ইনস্টল করুন এবং Windows Control Panel → Devices and Printers-এ নিশ্চিত করুন।',
        '১৭.২ সফটওয়্যার থেকে POS প্রিন্ট: যেকোনো মানি রিসিট, ব্যয় ভাউচার, কুইক এন্ট্রি বা কবরস্থান স্লিপের প্রিন্ট উইন্ডোতে গিয়ে "POS 80mm" (৩ ইঞ্চি) বা "58mm" (২ ইঞ্চি) সিলেক্ট করে প্রিন্ট দিন।',
        '১৭.৩ ব্রাউজার প্রিন্ট সেটিংস (অত্যাবশ্যক): Chrome/Edge প্রিন্ট ডায়ালগে Destination-এ POS প্রিন্টার বেছে নিয়ে Paper size: 80mm/58mm, Margins: None, Scale: 100%, Headers & footers: বন্ধ (Uncheck) এবং Background graphics: চালু (Check) রাখুন।',
        '১৭.৪ Android মোবাইল Bluetooth POS প্রিন্ট: মোবাইলে ব্লুটুথ পেয়ার করে Play Store থেকে প্রিন্টারের Print Service Plugin অথবা RawBT অ্যাপ চালু রাখুন; Chrome থেকে POS 80mm/58mm প্রিন্ট চাপলেই ব্লুটুথ প্রিন্টার দেখাবে।',
        '১৭.৫ QR কুইক এন্ট্রি ও ক্যামেরা স্ক্যানার: "⚡ QR ও কুইক এন্ট্রি" থেকে তাৎক্ষণিক দান/ভাউচার এন্ট্রি ও অ্যাকশন QR কার্ড প্রিন্ট করা যায়, আর সাইডবারের "📷 ক্যামেরা ও লাইভ স্ক্যান" দিয়ে QR, বারকোড বা রসিদ স্ক্যান করে সরাসরি খসড়া তৈরি করা যায়।',
      ],
      tips: [
        'রসিদ বা বিল স্ক্যানার ছবি কেবল মেমোরিতে বিশ্লেষণ করে মুছে দেয়; আর নথিপত্র স্থায়ীভাবে রাখতে চাইলে মূল ফর্ম বা সেন্ট্রাল ডকুমেন্ট আপলোড ব্যবহার করুন।',
      ],
    },
    {
      id: 'reports-audit-print',
      category: 'REPORTS',
      title: '১৮. রিপোর্ট সেন্টার (A4 / POS প্রিন্ট, Excel, PDF ও AI সারসংক্ষেপ)',
      icon: FileBarChart,
      targetTab: 'reports',
      badge: 'আপডেটেড',
      isNewOrUpdated: true,
      summary:
        '২০টিরও বেশি অডিট-মানের আর্থিক ও প্রশাসনিক রিপোর্ট, তারিখ/মাস/খাত/অ্যাকাউন্ট ফিল্টার, A4 পোর্ট্রেট/ল্যান্ডস্কেপ ও POS প্রিন্ট, Excel/PDF এক্সপোর্ট এবং AI নির্বাহী সারসংক্ষেপ।',
      steps: [
        '১৮.১ সাইডবার থেকে "📊 রিপোর্ট সেন্টার" মেনুতে যান।',
        '১৮.২ আয়-ব্যয় যৌথ বিবরণী, খাতওয়ারি হিসাব, স্টাফ বেতন শিট, ওয়াকফ সম্পত্তি বা কবরস্থান রিপোর্টসহ প্রয়োজনীয় রিপোর্ট নির্বাচন করুন।',
        '১৮.৩ ওপরের ফিল্টার বার থেকে "তারিখ থেকে তারিখ", "মাস থেকে মাস", "বছর", "প্রধান/উপ-খাত" বা "অ্যাকাউন্ট" বেছে ফিল্টার করুন।',
        '১৮.৪ "প্রিন্ট প্রিভিউ / লেটারহেডসহ প্রিন্ট", "PDF তৈরি করুন" অথবা "Excel (.xlsx)" বাটনে ক্লিক করে ডাউনলোড বা প্রিন্ট নিন।',
        '১৮.৫ চাইলে AI দিয়ে ফিল্টার করা রিপোর্টের জন্য জুমার নোটিশ বোর্ড বা কমিটির সভার উপযোগী ৩–৪ লাইনের মার্জিত বাংলা মন্তব্য তৈরি করে নিতে পারেন।',
      ],
    },
    {
      id: 'central-documents-smart-migration',
      category: 'REPORTS',
      title: '১৯. সেন্ট্রাল ডকুমেন্ট আর্কাইভ, Google Drive ও AI স্মার্ট ডাটা মাইগ্রেশন',
      icon: FolderOpen,
      targetTab: 'documents',
      badge: 'নতুন সংযুক্তি',
      isNewOrUpdated: true,
      summary:
        'সকল মডিউলের দলিল-দস্তাবেজ এক জায়গায় অনুসন্ধান ও সংরক্ষণ, Google Drive সংযুক্তি এবং পুরাতন খাতা/ছবি/PDF/Excel থেকে ১-ক্লিকে AI স্মার্ট ডাটা মাইগ্রেশন।',
      steps: [
        '১৯.১ সাইডবার থেকে "📁 সেন্ট্রাল ডকুমেন্ট ও আর্কাইভ" মেনুতে যান।',
        '১৯.২ এখানে ওয়াকফ দলিল, আয় রসিদ, ব্যয় ভাউচার, স্টাফ নথি ও কমিটির কাগজপত্র ফিল্টার (শুধুমাত্র ফাইল / Google Drive / উভয়) করে দেখা যায়।',
        '১৯.৩ "+ নতুন নথি" দিয়ে সরাসরি স্ক্যান কপি আপলোড করা বা AI দিয়ে নথির শিরোনাম-ধরন স্বয়ংক্রিয়ভাবে পড়ে নেওয়া যায়।',
        '১৯.৪ স্মার্ট ডাটা মাইগ্রেশন: পুরাতন হাতের লেখা খাতার ছবি, PDF বা Excel ফাইল থেকে এক ক্লিকে দাতা তালিকা, ওয়াকফ ভাড়াটিয়া বা প্রারম্ভিক স্থিতি প্রিভিউসহ আমদানি (Import) করার সুবিধা রয়েছে।',
      ],
    },
    {
      id: 'sms-notifications-guide',
      category: 'REPORTS',
      title: '২০. এসএমএস গেটওয়ে ও অটো-নোটিফিকেশন ব্যবস্থাপনা',
      icon: Smartphone,
      targetTab: 'smsGateway',
      badge: 'নতুন সংযুক্তি',
      isNewOrUpdated: true,
      summary:
        'দাতাদের অনুদান রসিদ ধন্যবাদ SMS, স্টাফ বেতন পরিশোধ SMS, ওয়াকফ ভাড়া বকেয়া রিমাইন্ডার, AI টেমপ্লেট রচনা ও ডেলিভারি হিস্ট্রি।',
      steps: [
        '২০.১ সাইডবার থেকে "📱 এসএমএস ও নোটিফিকেশন" মেনুতে যান।',
        '২০.২ প্রয়োজনীয় SMS গেটওয়ে প্রোভাইডার সেটিংস ও অনুমোদিত টেমপ্লেটগুলো কনফিগার করুন।',
        '২০.৩ দাতা, ভাড়াটিয়া বা স্টাফদের জন্য কাস্টম অথবা AI-সাজেস্টেড মার্জিত বাংলা SMS ড্রাফট করে পাঠান (পাঠানোর আগে প্রিভিউ দেখে নিশ্চিত করুন)।',
        '২০.৪ ডেলিভারি লগ ও AI ডেলিভারি বিশ্লেষণে কোন নম্বরে কখন মেসেজ গেছে তার পূর্ণ হিসাব দেখতে পারবেন।',
      ],
    },
    {
      id: 'mosque-settings-users-rbac',
      category: 'SETUP',
      title: '২১. মসজিদ পরিচিতি সেটিংস ও ইউজার/রোল অনুমতি (RBAC) ব্যবস্থাপনা',
      icon: Settings,
      targetTab: 'mosqueManagement',
      badge: 'প্রশাসনিক',
      isNewOrUpdated: true,
      summary:
        'মসজিদের লোগো, লেটারহেড স্বাক্ষর, একাধিক মসজিদ (Multi-Tenant) পরিচালনা এবং ইউজার তৈরি ও ভূমিকা-ভিত্তিক (Super Admin, সভাপতি, সম্পাদক, হিসাবরক্ষক, অডিটর) অনুমতি নিয়ন্ত্রণ।',
      steps: [
        '২১.১ মসজিদ পরিচিতি ও সেটিংস ("🏛️ মসজিদ পরিচিতি ও সেটিংস"): মসজিদের নাম, ওয়াকফ তথ্য, লোগো আপলোড এবং রিপোর্টের নিচে প্রদর্শিত সভাপতি ও সাধারণ সম্পাদকের নাম-স্বাক্ষর সেট করুন।',
        '২১.২ ইউজার ব্যবস্থাপনা ("👤 ইউজার ব্যবস্থাপনা"): নতুন ইউজার (ক্যাশিয়ার, হিসাবরক্ষক, সম্পাদক, অডিটর) যোগ করুন এবং প্রতিজনের নির্দিষ্ট মডিউল অনুমতি (RBAC) ঠিক করে দিন।',
        '২১.৩ সুপার অ্যাডমিন হলে ওপরের নেভবারের মসজিদ ড্রপডাউন বা "🌐 সেন্ট্রাল SaaS এডমিন হাব" থেকে একাধিক মসজিদ পরিচালনা করতে পারবেন—প্রতিটি মসজিদের হিসাব সম্পূর্ণ পৃথক ও সুরক্ষিত থাকে।',
      ],
    },
    {
      id: 'backup-audit-pwa',
      category: 'SECURITY',
      title: '২২. অটো-ব্যাকআপ, Google Drive, সিস্টেম অডিট লগ ও মোবাইল অ্যাপ (PWA)',
      icon: HardDriveDownload,
      targetTab: 'backupRestore',
      badge: 'সুরক্ষা নিশ্চিত',
      isNewOrUpdated: true,
      summary:
        'নিয়মিত JSON ব্যাকআপ ও Google Drive ক্লাউড ব্যাকআপ, রিমাইন্ডার শিডিউল, প্রতিটি কাজের অডিট ট্রেইল এবং Android/iPhone/PC-তে PWA অ্যাপ ইনস্টল ও অফলাইন ব্যবহার।',
      steps: [
        '২২.১ অটো-ব্যাকআপ ও রিমাইন্ডার ("💾 অটো-ব্যাকআপ ও রিমাইন্ডার"): এক ক্লিকে সম্পূর্ণ ডাটাবেজ JSON ফাইল ডাউনলোড করুন, অটো-ব্যাকআপ শিডিউল ও রিমাইন্ডার চালু রাখুন অথবা Google Drive ব্যাকআপ যুক্ত করুন।',
        '২২.২ ব্যাকআপ রিস্টোর: নতুন ডিভাইসে স্থানান্তর বা জরুরি পুনরুদ্ধারের সময় সংরক্ষিত JSON ফাইল আপলোড করে নিখুঁতভাবে ডাটা ফিরিয়ে আনুন।',
        '২২.৩ সিস্টেম ও আর্থিক অডিট লগ ("🛡️ সিস্টেম ও আর্থিক অডিট লগ"): কে, কখন, কোন এন্ট্রি তৈরি, সংশোধন বা রিভার্স করেছে তার অপরিবর্তনীয় রেকর্ড ও AI অডিট সারসংক্ষেপ দেখুন।',
        '২২.৪ মোবাইল অ্যাপ (PWA): Chrome/Edge বা Android/iPhone ব্রাউজারে "অ্যাপ ইনস্টল করুন" বাটনে ক্লিক করে সরাসরি হোম স্ক্রিন অ্যাপ হিসেবে ব্যবহার করুন—নেট দুর্বল থাকলেও অফলাইনে পঠন ও এন্ট্রি সাপোর্ট পাবেন।',
      ],
      warnings: [
        'প্রতি সপ্তাহে অন্তত একবার JSON ব্যাকআপ কপি নিজের পেনড্রাইভ বা Google Drive-এ সংরক্ষণ করা সর্বোত্তম অভ্যাসের অংশ।',
      ],
    },
  ];

  const filteredSections = useMemo(() => {
    return sections.filter((sec) => {
      const matchCat = selectedCategory === 'ALL' || sec.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchCat;
      const matchQuery =
        sec.title.toLowerCase().includes(query) ||
        sec.summary.toLowerCase().includes(query) ||
        sec.steps.some((s) => s.toLowerCase().includes(query)) ||
        (sec.tips && sec.tips.some((t) => t.toLowerCase().includes(query))) ||
        (sec.warnings && sec.warnings.some((w) => w.toLowerCase().includes(query)));
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  const askAiManual = async (
    questionOverride?: string,
    sectionContext?: { id?: string; title?: string; summary?: string }
  ) => {
    const q = (questionOverride ?? aiQuestion).trim();
    if (!q || aiLoading) return;

    if (!questionOverride) {
      setAiQuestion('');
    } else {
      setAiQuestion(q);
      aiPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    setAiLoading(true);
    setAiError(null);
    try {
      const res = await api.askUserManualAssistant({
        question: q,
        sectionContext,
        history: aiHistory.slice(-4),
      });
      setAiAnswer({
        question: q,
        answerBn: res.answerBn,
        stepsBn: res.stepsBn || [],
        tipBn: res.tipBn || '',
        recommendedTab: res.recommendedTab || '',
        recommendedTabLabelBn: res.recommendedTabLabelBn || '',
      });
      setAiHistory((prev) => [
        ...prev.slice(-4),
        { role: 'user', text: q },
        { role: 'model', text: res.answerBn },
      ]);
    } catch (err: any) {
      setAiError(
        err?.message ||
          'AI ব্যবহার বিধি সহায়তা এখন উত্তর দিতে পারেনি। অনুগ্রহ করে নিচের নির্দেশিকা তালিকা বা সার্চ বক্স ব্যবহার করুন।'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleToggleVoice = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiError('আপনার ব্রাউজারে বাংলা ভয়েস ইনপুট সমর্থিত নয়। অনুগ্রহ করে প্রশ্ন টাইপ করুন।');
      return;
    }

    if (isListening && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
      return;
    }

    setAiError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'bn-BD';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      if (transcript.trim()) {
        setAiQuestion(transcript.trim());
      }
      setIsListening(false);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setAiError('ভয়েস গ্রহণ করা যায়নি। অনুগ্রহ করে মাইক্রোফোন অনুমতি যাচাই করুন অথবা টাইপ করে প্রশ্ন করুন।');
    };
    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  const handlePrintManual = () => {
    setExpandAllForView(true);
    setTimeout(() => {
      printElement('user-manual-print-container', {
        title: 'মসজিদলেজার_পূর্ণাঙ্গ_ব্যবহার_নির্দেশিকা',
        pageSize: 'A4',
        pageOrientation: 'portrait',
        margin: '10mm 12mm',
      });
    }, 120);
  };

  return (
    <div id="user-manual-print-container" className="space-y-6 pb-16 font-siliguri printable-content">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden print:bg-none print:text-black print:p-2">
        <div className="relative z-10 max-w-4xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-400/30 text-xs font-bold text-emerald-200 print:hidden">
            <BookOpen className="w-3.5 h-3.5" />
            পূর্ণাঙ্গ ব্যবহার বিধি ও AI সহায়িকা — MasjidLedger Pro v2.6
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            MasjidLedger মসজিদ পরিচালনা নির্দেশিকা
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed font-tiro print:text-slate-700">
            মসজিদের দৈনন্দিন আয়-ব্যয়, জিরো-স্টোরেজ ক্যামেরা স্ক্যান, POS থার্মাল প্রিন্টার, ব্যাংক সমন্বয়, দান সংগ্রহ, ওয়াকফ সম্পত্তি ও দলিল সংরক্ষণ, ইমাম-মুয়াজ্জিনের বেতন, পাঠাগার-মক্তব-হেফজখানা, কবরস্থান রেজিস্টার ও অডিট রিপোর্ট তৈরির সম্পূর্ণ নিয়মাবলী।
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
          <button
            type="button"
            onClick={handlePrintManual}
            className="px-4 py-2.5 bg-white text-slate-800 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            সম্পূর্ণ নির্দেশিকা প্রিন্ট করুন
          </button>
          <button
            type="button"
            onClick={() => setExpandAllForView((v) => !v)}
            className="px-4 py-2.5 bg-emerald-700/60 hover:bg-emerald-700 text-white border border-emerald-400/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
          >
            <ChevronsDownUp className="w-4 h-4" />
            {expandAllForView ? 'সব মডিউল সংক্ষিপ্ত করুন' : 'সব মডিউল একসাথে খুলুন'}
          </button>
          <div className="text-xs text-emerald-200/95 font-semibold font-baloo">
            সর্বমোট {toBanglaDigits(sections.length)}টি প্রধান নির্দেশিকা মডিউল ও AI সহায়তা অন্তর্ভুক্ত
          </div>
        </div>
      </div>

      {/* Interactive AI User Manual Assistant Panel */}
      <div
        ref={aiPanelRef}
        className="bg-gradient-to-br from-indigo-50 via-white to-emerald-50/70 p-5 sm:p-6 rounded-2xl border border-indigo-200/80 shadow-xs space-y-4 print:hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-extrabold text-slate-900">
                  AI ব্যবহার বিধি ও কার্যপদ্ধতি সহায়তা
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-bold">
                  তাৎক্ষণিক বাংলা গাইড
                </span>
              </div>
              <p className="text-xs text-slate-600 font-tiro mt-0.5">
                যেকোনো কাজের নিয়ম লিখুন বা মুখে বলুন — AI ধাপভিত্তিক সমাধান ও সঠিক মেনুর শর্টকাট বাটন দিয়ে সাহায্য করবে।
              </p>
            </div>
          </div>
          {aiAnswer && (
            <button
              type="button"
              onClick={() => {
                setAiAnswer(null);
                setAiError(null);
              }}
              className="self-start sm:self-center px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              উত্তর পরিষ্কার করুন
            </button>
          )}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            askAiManual();
          }}
          className="flex flex-col sm:flex-row gap-2"
        >
          <div className="relative flex-1">
            <Sparkles className="w-4 h-4 text-indigo-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={aiQuestion}
              onChange={(e) => setAiQuestion(e.target.value)}
              placeholder="উদাহরণ: POS প্রিন্টার দিয়ে রসিদ প্রিন্ট করব কীভাবে? বা ব্যাংক চার্জ কোথায় এন্ট্রি দেব?"
              className="w-full pl-10 pr-11 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isListening ? 'ভয়েস বন্ধ করুন' : 'বাংলায় মুখে বলে প্রশ্ন করুন'}
              className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors cursor-pointer ${
                isListening
                  ? 'bg-rose-100 text-rose-700 animate-pulse'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-indigo-700'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            disabled={aiLoading || !aiQuestion.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            {aiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>খুঁজছে...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>AI-কে জিজ্ঞাসা করুন</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Question Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-bold text-slate-500 mr-1">দ্রুত প্রশ্ন:</span>
          {AI_QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={aiLoading}
              onClick={() => askAiManual(q)}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg text-[11px] font-semibold text-slate-700 hover:text-indigo-800 transition-colors cursor-pointer text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {/* AI Error Alert */}
        {aiError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{aiError}</span>
          </div>
        )}

        {/* AI Answer Card */}
        {aiAnswer && (
          <div className="bg-white rounded-xl border border-indigo-200 p-4 sm:p-5 space-y-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-800">
                <Bot className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>প্রশ্ন: {aiAnswer.question}</span>
              </div>
              {aiAnswer.recommendedTab &&
                VALID_NAV_TABS.has(aiAnswer.recommendedTab) &&
                onNavigate && (
                  <button
                    type="button"
                    onClick={() => onNavigate(aiAnswer.recommendedTab as NavTab)}
                    className="self-start sm:self-center px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                  >
                    <span>
                      সরাসরি {aiAnswer.recommendedTabLabelBn || 'সংশ্লিষ্ট মডিউলে'} যান
                    </span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
            </div>

            <p className="text-sm text-slate-800 font-tiro leading-relaxed">{aiAnswer.answerBn}</p>

            {aiAnswer.stepsBn.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  করণীয় ধাপসমূহ:
                </div>
                <div className="space-y-1.5 pl-1">
                  {aiAnswer.stepsBn.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs sm:text-sm text-slate-700 leading-relaxed"
                    >
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-bold text-[10px] font-baloo shrink-0 mt-0.5">
                        {toBanglaDigits(i + 1)}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {aiAnswer.tipBn && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-lg text-xs text-emerald-900 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>পরামর্শ:</strong> {aiAnswer.tipBn}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="যেকোনো কাজের নিয়ম খুঁজুন (যেমন: POS প্রিন্টার, ক্যামেরা স্ক্যান, ব্যাংক চার্জ, দলিল, বেতন, মক্তব, ব্যাকআপ)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-emerald-700 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Guide Content Cards */}
      <div className="space-y-4">
        {filteredSections.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <div className="font-bold text-slate-800">কোনো নির্দেশিকা পাওয়া যায়নি</div>
            <p className="text-xs">
              ভিন্ন শব্দ দিয়ে সার্চ করুন, "সকল বিষয়" সিলেক্ট করুন অথবা ওপরের AI সহায়তায় প্রশ্ন করুন।
            </p>
            {searchQuery.trim() && (
              <button
                type="button"
                onClick={() => askAiManual(searchQuery.trim())}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>"{searchQuery.trim()}" বিষয়ে AI-কে জিজ্ঞাসা করুন</span>
              </button>
            )}
          </div>
        ) : (
          filteredSections.map((sec) => {
            const Icon = sec.icon;
            const isExpanded =
              expandAllForView ||
              expandedSectionId === sec.id ||
              searchQuery.trim().length > 0;

            return (
              <div
                key={sec.id}
                id={sec.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs overflow-hidden print:border print:border-slate-300 print:shadow-none print:break-inside-avoid"
              >
                {/* Header */}
                <div
                  onClick={() => {
                    if (expandAllForView) {
                      setExpandAllForView(false);
                    }
                    setExpandedSectionId(expandedSectionId === sec.id ? null : sec.id);
                  }}
                  className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none bg-slate-50/50 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5 border border-emerald-100">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-slate-900 leading-snug">
                          {sec.title}
                        </h3>
                        {sec.badge && (
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              sec.isNewOrUpdated
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {sec.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed font-tiro">
                        {sec.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sec.targetTab && onNavigate && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(sec.targetTab!);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                      >
                        সরাসরি যান <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg print:hidden cursor-pointer"
                      aria-label="Toggle details"
                    >
                      <ChevronRight
                        className={`w-4 h-4 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90 text-emerald-700' : ''
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Body / Steps */}
                {isExpanded && (
                  <div className="p-5 border-t border-slate-100 space-y-4 text-xs sm:text-sm">
                    {/* Steps list */}
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div className="font-bold text-slate-900 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ধাপভিত্তিক কাজের পদ্ধতি:
                        </div>
                        <button
                          type="button"
                          disabled={aiLoading}
                          onClick={() =>
                            askAiManual(
                              `"${sec.title}" মডিউলটি বাস্তব উদাহরণসহ সহজ বাংলায় বুঝিয়ে দিন ও জরুরি করণীয় বলুন।`,
                              { id: sec.id, title: sec.title, summary: sec.summary }
                            )
                          }
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors print:hidden cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-indigo-600" />
                          <span>AI-কে সহজ করে বুঝিয়ে দিতে বলুন</span>
                        </button>
                      </div>
                      <div className="space-y-2 pl-2">
                        {sec.steps.map((st, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 text-slate-700 leading-relaxed font-tiro"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tips */}
                    {sec.tips && sec.tips.length > 0 && (
                      <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-100 text-emerald-900 space-y-1">
                        <div className="font-bold text-xs flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                          বিশেষ পরামর্শ:
                        </div>
                        {sec.tips.map((tip, i) => (
                          <p key={i} className="text-xs leading-relaxed text-emerald-800 font-tiro">
                            • {tip}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Warnings */}
                    {sec.warnings && sec.warnings.length > 0 && (
                      <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-100 text-rose-900 space-y-1">
                        <div className="font-bold text-xs flex items-center gap-1.5 text-rose-700">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                          সতর্কতা:
                        </div>
                        {sec.warnings.map((w, i) => (
                          <p key={i} className="text-xs leading-relaxed text-rose-800 font-tiro">
                            • {w}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Support Banner */}
      <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left print:hidden">
        <div className="space-y-1">
          <h4 className="font-bold text-slate-900 text-sm">
            আরও কোনো প্রশ্ন বা তাৎক্ষণিক নির্দেশনার প্রয়োজন?
          </h4>
          <p className="text-xs text-slate-600 font-tiro">
            MasjidLedger Pro v2.6-এ নিয়মিত ব্যাকআপ নিশ্চিত করুন এবং যেকোনো নিয়ম জানতে ওপরের AI ব্যবহার বিধি সহায়তা ব্যবহার করুন।
          </p>
        </div>
        <button
          type="button"
          onClick={handlePrintManual}
          className="px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
        >
          <Printer className="w-4 h-4" />
          সম্পূর্ণ নির্দেশিকা প্রিন্ট নিন
        </button>
      </div>
    </div>
  );
};
