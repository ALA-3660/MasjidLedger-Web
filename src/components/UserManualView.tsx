import React, { useState, useMemo } from 'react';
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
  Users2,
  CalendarCheck,
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
  ExternalLink,
  Layers,
  Wallet,
  Tv
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { printElement } from '../lib/printUtils';

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
  summary: string;
  steps: string[];
  tips?: string[];
  warnings?: string[];
}

export const UserManualView: React.FC<UserManualViewProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'সকল বিষয়' },
    { id: 'SETUP', label: 'শুরু ও বেসিক' },
    { id: 'PRAYER', label: 'নামাজের সময় ও আজান' },
    { id: 'FINANCE', label: 'আয়, ব্যয় ও দান' },
    { id: 'BANKING', label: 'ব্যাংক ও ক্যাশবুক' },
    { id: 'PROPERTY', label: 'সম্পত্তি ও দলিলপত্র' },
    { id: 'STAFF', label: 'স্টাফ ও বেতন' },
    { id: 'CEMETERY', label: 'কবরস্থান রেজিস্টার' },
    { id: 'COMMITTEE', label: 'কমিটি ও রেজুলেশন' },
    { id: 'PORTAL', label: 'পাবলিক পোর্টাল ও টিভি' },
    { id: 'REPORTS', label: 'রিপোর্ট ও প্রিন্ট' },
    { id: 'SECURITY', label: 'ব্যাকআপ ও নিরাপত্তা' }
  ];

  const sections: ManualSection[] = [
    {
      id: 'quick-start',
      category: 'SETUP',
      title: '১. সফটওয়্যারের পরিচিতি ও প্রথম দিন শুরু করার নিয়ম',
      icon: Sparkles,
      targetTab: 'dashboard',
      badge: 'অবশ্যই পঠনীয়',
      summary: 'MasjidLedger একটি সম্পূর্ণ রিয়েল-টাইম মসজিদ পরিচালনা ও আর্থিক অডিট ব্যবস্থা। সফটওয়্যারটিতে কোনো ডেমো বা কাল্পনিক ডাটা নেই; প্রতিটি এন্ট্রি আপনার ডাটাবেজে চিরস্থায়ীভাবে সংরক্ষিত হয়।',
      steps: [
        '১.১ মসজিদ পরিচিতি ও তথ্য পরীক্ষা: সর্বপ্রথমে বাম পাশের "মসজিদ সেটিংস" (Settings) মেনুতে গিয়ে আপনার মসজিদের নাম, ঠিকানা, ওয়াকফ ইসি নম্বর এবং যোগাযোগ নম্বর যাচাই করুন।',
        '১.২ আর্থিক হিসাব শুরুর আগে "প্রারম্ভিক স্থিতি" (Opening Balance) নির্ধারণ করুন: পূর্ববর্তী কমিটির কাছ থেকে প্রাপ্ত নগদ টাকা ও ব্যাংকের জমার পরিমাণ এন্ট্রি দিয়ে শুরু করুন।',
        '১.৩ প্রধান মেনু নেভিগেশন: বাম পাশের সাইডবারে প্রতিটি বিভাগের জন্য আলাদা মডিউল রাখা হয়েছে। মোবাইল স্ক্রিনে উপরে বামে ৩-দাগের মেনু বাটনে চাপ দিলে সাইডবার দেখা যাবে।'
      ],
      tips: [
        'উপরে ডানে দ্রুত কিউআর কোড (Action Hub), ক্যালকুলেটর ও সার্চ বার রয়েছে যা দিয়ে তাৎক্ষণিক হিসাব মেলানো যায়।',
        'সফটওয়্যারটি বাংলা এবং ইংরেজি উভয় ভাষাতেই সম্পূর্ণ কার্যকর।'
      ]
    },
    {
      id: 'opening-balance-guide',
      category: 'FINANCE',
      title: '২. প্রারম্ভিক স্থিতি (Opening Balance) ও কমিটি হস্তান্তর এন্ট্রি',
      icon: Wallet,
      targetTab: 'openingBalance',
      badge: 'প্রথম ধাপ',
      summary: 'নতুন আর্থিক বছর বা নতুন কমিটির দায়িত্ব গ্রহণের সময় পূর্ববর্তী ব্যালেন্স সঠিকভাবে সিস্টেমে যুক্ত করতে এই মডিউল ব্যবহার করুন।',
      steps: [
        '২.১ সাইডবার থেকে "প্রারম্ভিক স্থিতি" (Opening Balance) মেনুতে যান।',
        '২.২ "নতুন প্রারম্ভিক স্থিতি যোগ করুন" বাটনে ক্লিক করুন।',
        '২.৩ খাত (Account Head) নির্বাচন করুন (যেমন: সাধারণ তহবিল, মসজিদ উন্নয়ন তহবিল ইত্যাদি)।',
        '২.৪ ক্যাশ ইন হ্যান্ড (নগদ টাকা) অথবা ব্যাংক অ্যাকাউন্টের ব্যালেন্স ও তারিখ উল্লেখ করুন।',
        '২.৫ পূর্ববর্তী কমিটির হস্তান্তর বিবরণী ও রেজুলেশন রেফারেন্স নোট লিখে "সংরক্ষণ করুন" চাপুন।'
      ],
      warnings: [
        'প্রারম্ভিক স্থিতি একবার নিশ্চিত (Lock) করে ফেললে সাধারণ এডিট করা যায় না, তাই সঠিক ব্যাংক স্টেটমেন্ট দেখে এন্ট্রি দিন।'
      ]
    },
    {
      id: 'income-guide',
      category: 'FINANCE',
      title: '৩. নিয়মিত আয় (Income) ও চাঁদা এন্ট্রি পদ্ধতি',
      icon: ArrowDownLeft,
      targetTab: 'income',
      badge: 'দৈনন্দিন কাজ',
      summary: 'জুমার কালেকশন, মাসিক চাঁদা, অনুদান, দোকান ভাড়া ও বিবিধ আয় রসিদসহ এন্ট্রি করার নিয়ম।',
      steps: [
        '৩.১ সাইডবার থেকে "আয়" (Income) মেনুতে যান।',
        '৩.২ উপরে ডানে "+ নতুন আয় এন্ট্রি" বাটনে ক্লিক করুন।',
        '৩.৩ আয়ের খাত (Category/Head) নির্বাচন করুন (উদা: জুমার কালেকশন, আজীবন সদস্য চাঁদা, মাইক অনুদান)।',
        '৩.৪ টাকার পরিমাণ লিখুন এবং পেমেন্ট মেথড (ক্যাশ, ব্যাংক ডিপোজিট, বিকাশ/নগদ) নির্বাচন করুন।',
        '৩.৫ প্রদানকারীর নাম ও মোবাইল নম্বর দিন (ঐচ্ছিক হলেও রসিদের জন্য উত্তম)।',
        '৩.৬ মানি রিসিট বা জমার ভাউচার ফাইল থাকলে "ভাউচার আপলোড" এ স্ক্যান কপি বা ছবি সংযুক্ত করুন।',
        '৩.৭ "আয় সংরক্ষণ করুন" চাপুন। তাৎক্ষণিক "রসিদ প্রিন্ট" বা "POS স্লিপ প্রিন্ট" করার উইন্ডো আসবে।'
      ],
      tips: [
        'দাতা যদি তাৎক্ষণিক রসিদ চান, তবে "প্রিন্ট রসিদ" বাটনে ক্লিক করে সাথে সাথে ৩-কপি বিশিষ্ট স্ট্যান্ডার্ড এ৪ অথবা থার্মাল পিওএস রসিদ প্রিন্ট করতে পারবেন।'
      ]
    },
    {
      id: 'expense-guide',
      category: 'FINANCE',
      title: '৪. ব্যয় (Expense) ও বিল পরিশোধ এন্ট্রি পদ্ধতি',
      icon: ArrowUpRight,
      targetTab: 'expense',
      badge: 'দৈনন্দিন কাজ',
      summary: 'বিদ্যুৎ বিল, ইমাম-মোয়াজ্জিনের বেতন, মসজিদ সংস্কার, পরিচ্ছন্নতা ও ক্রয় সংক্রান্ত ভাউচার এন্ট্রি।',
      steps: [
        '৪.১ সাইডবার থেকে "ব্যয়" (Expense) মেনুতে ক্লিক করুন।',
        '৪.২ "+ নতুন ব্যয় এন্ট্রি" বাটনে ক্লিক করুন।',
        '৪.৩ খরচের খাত (Expense Head) নির্বাচন করুন (উদা: বিদ্যুৎ বিল, পরিচ্ছন্নতা সামগ্রী, মেরামত ও রক্ষণাবেক্ষণ)।',
        '৪.৪ মোট খরচের টাকা এবং কোন ব্যাংক বা ক্যাশ বক্স থেকে টাকাটি দেওয়া হয়েছে তা সিলেক্ট করুন।',
        '৪.৫ বিক্রেতা/দোকানের নাম (Payee) ও অনুমোদনের রেফারেন্স (সভাপতি/সম্পাদকের অনুমোদন) লিখুন।',
        '৪.৬ দোকানের ক্যাশমেমো বা খরচের রসিদের ছবি/পিডিএফ আপলোড করুন।',
        '৪.৭ "ব্যয় ভাউচার সংরক্ষণ" চাপুন। ভাউচার নম্বর স্বয়ংক্রিয়ভাবে তৈরি হবে যা আপনি প্রিন্ট করে ফাইলে রাখতে পারবেন।'
      ],
      warnings: [
        'কমিটির অনুমোদন ছাড়া কোনো ব্যয় এন্ট্রি করবেন না। ভাউচারের সাথে দোকানের মূল ক্যাশমেমোর ছবি আপলোড রাখা অডিটের জন্য বাধ্যতামূলক।'
      ]
    },
    {
      id: 'donation-boxes',
      category: 'FINANCE',
      title: '৫. দানবাক্স (Donation Box) পরিচালনা ও গণনার নিয়ম',
      icon: Box,
      targetTab: 'donationBox',
      badge: 'অডিট বান্ধব',
      summary: 'মসজিদের স্থায়ী দানবাক্স ও বাইরের দোকানগুলোতে স্থাপিত কালেকশন বক্সের হিসাব ও গণনার রেজুলেশন।',
      steps: [
        '৫.১ সাইডবার থেকে "দানবাক্স" (Donation Boxes) অপশনে যান।',
        '৫.২ নতুন দানবাক্স যুক্ত করতে "+ নতুন দানবাক্স যোগ" বাটনে বক্স নম্বর ও অবস্থান (যেমন: গেট-১, বাজার মোড়) দিন। প্রতিটি বক্সের নিজস্ব QR কোড জেনারেট হবে।',
        '৫.৩ বক্স খোলার দিন "বাক্স গণনা ও সংগ্রহ" বাটনে ক্লিক করুন।',
        '৫.৪ উপস্থিত অন্তত ২ বা ৩ জন সাক্ষীর (ইমাম/কমিটি সদস্য) নাম ও সাক্ষ্য নোট লিখুন।',
        '৫.৫ বিভিন্ন নোটের গণনা (১০০০, ৫০০, ১০০, ৫০, ২০, ১০, ৫, ২, ১ টাকার নোট ও কয়েন) ইনপুট দিলে স্বয়ংক্রিয়ভাবে মোট হিসাব তৈরি হবে।',
        '৫.৬ "সংগ্রহ নিশ্চিত করুন" চাপলে সরাসরি আয়ের সাধারণ তহবিলে টাকাটি যুক্ত হবে এবং অডিট স্লিপ প্রিন্ট হবে।'
      ]
    },
    {
      id: 'waqf-properties',
      category: 'PROPERTY',
      title: '৬. ওয়াকফ সম্পত্তি, দাগ-খতিয়ান ও মূল দলিল সংরক্ষণ',
      icon: Building,
      targetTab: 'property',
      badge: 'দলিল আর্কাইভ',
      summary: 'মসজিদের জমি, দোকান, মার্কেট, পুকুর ও বাগান পরিচালনা এবং মূল দলিল, পর্চা ও নামজারি ডিসিআর সংরক্ষণ।',
      steps: [
        '৬.১ সাইডবার থেকে "সম্পত্তি" (Property) মেনুতে যান।',
        '৬.২ নতুন সম্পত্তি এন্ট্রি করতে "+ নতুন সম্পত্তি নিবন্ধন" চাপুন। জমির দাগ নম্বর, খতিয়ান (CS, SA, RS, BS), মৌজা, জেএল নম্বর ও দখল অবস্থা লিখুন।',
        '৬.৩ ভাড়ার দোকান বা মার্কেট থাকলে মাসিক ভাড়া ও ভাড়াটিয়া চুক্তি যোগ করুন।',
        '৬.৪ **মূল দলিল ও রেকর্ডপত্র সংরক্ষণ**: যে কোনো সম্পত্তির কার্ডে "বিস্তারিত ও দলিল" বাটনে ক্লিক করুন।',
        '৬.৫ ড্রয়ারে "ওয়াকফ ও রেকর্ড দলিলপত্র" ট্যাবে যান।',
        '৬.৬ "+ নতুন দলিল / নথি যোগ করুন" বাটনে ক্লিক করে দলিলের শিরোনাম (যেমন: মূল ওয়াকফনামা ১৯৫২, আরএস পর্চা দাগ ১২৪, নামজারি ডিসিআর) সিলেক্ট করুন।',
        '৬.৭ স্ক্যান কপি (PDF বা ছবি) নির্বাচন করে আপলোড করুন।',
        '৬.৮ যে কোনো সময় "নথি দেখুন" বাটনে ক্লিক করে মূল দলিল ডাউনলোড বা ভিউ করা যাবে।'
      ],
      tips: [
        'সকল দলিল ক্লাউড ডাটাবেজে স্থায়ীভাবে সুরক্ষিত থাকে। হার্ডকপি নষ্ট হলেও ডিজিটাল আর্কাইভ থেকে অবিলম্বে পাওয়া যাবে।'
      ]
    },
    {
      id: 'staff-payroll',
      category: 'STAFF',
      title: '৭. স্টাফ ও ইমাম-মুয়াজ্জিনদের বেতন (Payroll) বণ্টন',
      icon: UserCheck,
      targetTab: 'staff',
      badge: 'বেতন স্লিপ',
      summary: 'মসজিদের ইমাম, খতিব, মুয়াজ্জিন, খাদেম ও শিক্ষকদের প্রোফাইল এবং মাসিক বেতন বিতরণ রসিদ।',
      steps: [
        '৭.১ সাইডবার থেকে "স্টাফ" (Staff) ট্যাবে যান।',
        '৭.২ "+ নতুন স্টাফ যোগ করুন" এ নাম, পদবী, মোবাইল, জাতীয় পরিচয়পত্র ও মূল বেতন নির্ধারণ করুন।',
        '৭.৩ প্রতি মাসের শুরুতে "মাসিক বেতন বিতরণ" বাটনে ক্লিক করুন।',
        '৭.৪ মূল বেতন, বোনাস/ভাতা বা কোনো কর্তন থাকলে তা সমন্বয় করুন।',
        '৭.৫ ক্যাশ বা ব্যাংকের মাধ্যমে বেতন পরিশোধ নিশ্চিত করুন।',
        '৭.৬ বেতন প্রদানের পর স্বয়ংক্রিয় "বেতন রসিদ" (Payslip) প্রিন্ট করে স্টাফকে প্রদান ও স্বাক্ষর গ্রহণ করুন।'
      ]
    },
    {
      id: 'cemetery-register',
      category: 'CEMETERY',
      title: '৮. কবরস্থান ব্যবস্থাপনা ও দাফন রেজিস্টার',
      icon: Crosshair,
      targetTab: 'cemetery',
      badge: 'রেকর্ড সনদ',
      summary: 'মসজিদের আওতাধীন কবরস্থানে দাফনকৃত মরহুমদের রেজিস্টার, প্লট ট্র্যাকিং ও দাফন প্রত্যয়ন পত্র।',
      steps: [
        '৮.১ সাইডবার থেকে "কবরস্থান" (Cemetery) মেনুতে যান।',
        '৮.২ "+ নতুন দাফন রেকর্ড" এ ক্লিক করুন।',
        '৮.৩ মরহুমের নাম, পিতার নাম, মৃত্যুর তারিখ, দাফনের সময় ও জানাজার স্থান এন্ট্রি করুন।',
        '৮.৪ কবর ব্লকের নাম (যেমন: ব্লক-ক, সারি-৩, প্লট-১২) এবং কবরের ধরন (সাধারণ/স্থায়ী) নির্বাচন করুন।',
        '৮.৫ ওয়ারিশ বা আবেদনকারীর নাম ও মোবাইল নম্বর লিখুন।',
        '৮.৬ রেকর্ড সংরক্ষণের পর "দাফন সনদ / প্রত্যয়ন পত্র" প্রিন্ট করা যাবে কিউআর কোডসহ।'
      ]
    },
    {
      id: 'committee-meetings',
      category: 'COMMITTEE',
      title: '৯. পরিচালনা কমিটি ও সভার রেজুলেশন (Meetings)',
      icon: Users2,
      targetTab: 'committee',
      badge: 'প্রশাসনিক',
      summary: 'মসজিদের বর্তমান ও সাবেক কমিটির মেয়াদ, সদস্য তালিকা এবং কার্যনির্বাহী সভার রেজুলেশন নথিভুক্তকরণ।',
      steps: [
        '৯.১ সাইডবার থেকে "পরিচালনা কমিটি" (Committee) মেনুতে যান।',
        '৯.২ বর্তমান কমিটির মেয়াদ (শুরু ও সমাপ্তির তারিখ) ও পদবী অনুযায়ী সদস্যদের তালিকা তৈরি করুন।',
        '৯.৩ সভার কার্যবিবরণীর জন্য "কমিটি সভা ও মিটিং" (Meetings) ট্যাবে যান।',
        '৯.৪ "+ নতুন মিটিং আয়োজন" এ সভার বিষয়, তারিখ, সময় ও আলোচ্যসূচি (Agenda) যুক্ত করুন।',
        '৯.৫ সভা শেষে গৃহীত সিদ্ধান্তসমূহ (Resolutions) টাইপ করুন এবং উপস্থিত সদস্যদের স্বাক্ষর করা খাতার স্ক্যান কপি আপলোড করুন।',
        '৯.৬ প্রিন্ট অপশন দিয়ে সম্পূর্ণ সভার কার্যবিবরণী কমিটির ফাইলে সংরক্ষণের জন্য প্রিন্ট করুন।'
      ]
    },
    {
      id: 'banking-cashbook',
      category: 'BANKING',
      title: '১০. ব্যাংক অ্যাকাউন্ট ও ক্যাশবুক ব্যবস্থাপনা',
      icon: Landmark,
      targetTab: 'bank',
      badge: 'ট্রেজারি',
      summary: 'মসজিদের ব্যাংক অ্যাকাউন্ট পরিচালনা, ডিপোজিট, চেক উইথড্রয়াল ও ক্যাশ ট্রান্সফার।',
      steps: [
        '১০.১ সাইডবার থেকে "ব্যাংক অ্যাকাউন্ট" (Bank Accounts) এ গিয়ে মসজিদের ব্যাংকগুলোর নাম, অ্যাকাউন্ট নম্বর ও শাখা যোগ করুন।',
        '১০.২ ক্যাশ থেকে ব্যাংকে জমা দিলে "ক্যাশ ডিপোজিট" বাটনে এন্ট্রি দিন (ক্যাশ কমবে, ব্যাংক ব্যালেন্স বাড়বে)।',
        '১০.৩ ব্যাংক থেকে চেক দিয়ে টাকা তুললে "ব্যাংক উত্তোলন" এন্ট্রি দিন।',
        '১০.৪ "ক্যাশবুক" (Cashbook) মেনুতে প্রতিদিনের সার্বিক নগদ টাকা ও ব্যাংকের স্থিতির তুলনামূলক লেজার এক নজরে দেখুন।'
      ]
    },
    {
      id: 'reports-audit',
      category: 'REPORTS',
      title: '১১. আর্থিক রিপোর্ট, ব্যালেন্স শিট ও নিরীক্ষা (Audit)',
      icon: FileBarChart,
      targetTab: 'reports',
      badge: 'স্বচ্ছতা',
      summary: 'মাসিক ও বাৎসরিক আয়-ব্যয়ের হিসাব বিবরণী, ট্রায়াল ব্যালেন্স, নিরীক্ষা রিপোর্ট ও সাধারণ মুসল্লীদের জন্য নোটিশ শিট।',
      steps: [
        '১১.১ সাইডবার থেকে "রিপোর্টস" (Reports) মেনুতে যান।',
        '১১.২ ২০টিরও বেশি স্ট্যান্ডার্ড হিসাব বিবরণী থেকে আপনার কাঙ্ক্ষিত রিপোর্টটি নির্বাচন করুন (যেমন: মাসিক আয়-ব্যয় বিবরণী, বার্ষিক অডিট শিট, খাতওয়ারি হিসাব)।',
        '১১.৩ নির্দিষ্ট তারিখ বা মাস সিলেক্ট করে "ফিল্টার" করুন।',
        '১১.৪ "প্রিন্ট করুন" বা "পিডিএফ ডাউনলোড" বাটনে ক্লিক করে জুমার দিনে নোটিশ বোর্ডে টানানোর জন্য পরিষ্কার বাংলা রিপোর্ট প্রিন্ট করুন।'
      ]
    },
    {
      id: 'backup-security',
      category: 'SECURITY',
      title: '১২. ডাটা ব্যাকআপ, রিস্টোর ও নিরাপত্তা বিধি',
      icon: HardDriveDownload,
      targetTab: 'admin',
      badge: 'সুরক্ষা নিশ্চিত',
      summary: 'মসজিদের সমস্ত হিসাব ও নথির ব্যাকআপ নিজের কম্পিউটারে বা গুগল ড্রাইভে সংরক্ষণ করার নিয়ম।',
      steps: [
        '১২.১ সাইডবার থেকে "মসজিদ সেটিংস" (Settings) মেনুতে যান।',
        '১২.২ নিচে "ডাটা ব্যাকআপ ও সুরক্ষা" সেকশনে স্ক্রল করুন।',
        '১২.৩ "সম্পূর্ণ ডাটাবেজ ব্যাকআপ ডাউনলোড (JSON)" বাটনে ক্লিক করুন। এক ক্লিকেই সম্পূর্ণ সিস্টেমের একটি ফাইল আপনার ডিভাইসে সেভ হবে।',
        '১২.৪ প্রতি সপ্তাহে অন্তত একবার বা মাসের শেষে একটি ব্যাকআপ ফাইল ডাউনলোড করে মসজিদের সংরক্ষিত পেনড্রাইভে বা ইমেইলে রাখুন।',
        '১২.৫ কোনো কারণে ডিভাইস পরিবর্তন করতে হলে "ব্যাকআপ রিস্টোর" বাটনে ক্লিক করে ফাইলটি আপলোড করলেই পূর্বের সকল ডাটা নিখুঁতভাবে ফেরত আসবে।'
      ],
      tips: [
        'ব্যাকআপ ফাইলে কোনো পাসওয়ার্ড বা গোপনীয় কী সরাসরি থাকে না, এটি সম্পূর্ণরূপে সুরক্ষিত ও ইনক্রিপ্টেড।'
      ]
    },
    {
      id: 'prayer-schedule-guide',
      category: 'PRAYER',
      title: '১৩. নামাজের সময়সূচি, আজান ও জামাত নির্ধারণ (১২-ঘণ্টা ফরম্যাট)',
      icon: Clock,
      targetTab: 'prayerTimes',
      badge: 'অত্যন্ত গুরুত্বপূর্ণ',
      summary: 'ওয়াক্ত শুরু ও ওয়াক্ত শেষ ইসলামিক জ্যোতির্বিজ্ঞান ও ভৌগোলিক স্থানাঙ্ক অনুযায়ী স্বয়ংক্রিয়ভাবে নির্ধারিত হয়; তবে আজান ও জামাতের সময় কোনো কাল্পনিক নিয়মে নয়, বরং মসজিদ কর্তৃপক্ষ নিজস্ব এলাকার রুটিন অনুযায়ী হাতে (Manual) ১২-ঘণ্টা ফরম্যাটে (AM/PM) সেট করেন।',
      steps: [
        '১৩.১ সাইডবার থেকে "নামাজের সময়" (Prayer Times) অথবা "নামাজের সময়সূচি" (Prayer Schedule) মেনুতে যান।',
        '১৩.২ মসজিদের সঠিক জেলা নির্বাচন করুন (যেমন: ঢাকা, চট্টগ্রাম, সিলেট, খুলনা, রাজশাহী ইত্যাদি)। জেলা ভিত্তিক সূর্যোদয় ও সূর্যাস্তের নিখুঁত জ্যোতির্বৈজ্ঞানিক হিসাব অনুযায়ী ৫ ওয়াক্ত নামাজের শুরু ও সমাপ্তির সঠিক সময় স্বয়ংক্রিয়ভাবে স্ক্রিনে ফুটে উঠবে।',
        '১৩.৩ "সময়সূচি পরিবর্তন / কুইক এডিট" বাটনে ক্লিক করুন।',
        '১৩.৪ আজান ও জামাতের সময় হাতে ১২-ঘণ্টা সময় ফরম্যাটে (AM/PM) সেট করুন: প্রতিটি ওয়াক্তের আজানের নির্ধারিত সময় (যেমন: 4:30 AM, 12:30 PM, 4:21 PM, 6:05 PM, 7:21 PM) এবং জামাত শুরুর সময় (যেমন: 5:15 AM, 1:30 PM, 4:45 PM, 6:30 PM, 8:15 PM) আপনার মসজিদের প্রচলিত সময় অনুযায়ী লিখুন।',
        '১৩.৫ জুমার নামাজের জন্য ১ম আজান (12:30 PM), বয়ান/খুতবা (1:00 PM) এবং জুমার জামাতের সময় (1:30 PM) ইনপুট দিন।',
        '১৩.৬ "সংরক্ষণ করুন" চাপলেই সাথে সাথে সিস্টেমের সকল ডিসপ্লে স্ক্রিন, পাবলিক পোর্টাল ও প্রিন্ট কপিতে ১২-ঘণ্টা ফরম্যাটে সময়সূচি হালনাগাদ হবে।'
      ],
      tips: [
        'ওয়াক্ত শুরু ও ওয়াক্ত শেষ ঋতুভেদে প্রতিদিন স্বয়ংক্রিয়ভাবে সমন্বয় হবে; শুধুমাত্র জামাত পরিবর্তনের মৌসুমে আপনারা এই পেজ থেকে জামাতের সময় পরিবর্তন করে দেবেন।',
        'নোটিশ বোর্ডে লাগানোর জন্য "মাসিক ক্যালেন্ডার প্রিন্ট" বা "দৈনিক নামাজের শিট প্রিন্ট" বাটনে ক্লিক করে এক ক্লিকেই সুদৃশ্য এ৪ ফরম্যাটে প্রিন্ট বের করতে পারবেন।'
      ],
      warnings: [
        'আজান ও জামাতের সময়সূচি কখনো ২৪-ঘণ্টা ফরম্যাটে (যেমন 13:30) নয়, সর্বদা ১২-ঘণ্টা স্পষ্ট AM/PM ফরম্যাটে (যেমন 1:30 PM) লিখবেন।'
      ]
    },
    {
      id: 'public-portal-guide',
      category: 'PORTAL',
      title: '১৪. পাবলিক পোর্টাল ও স্মার্ট টিভি ডিসপ্লে স্ক্রিন (Smart TV Mode)',
      icon: Tv,
      targetTab: 'publicPortal',
      badge: 'ডিজিটাল ডিসপ্লে',
      summary: 'মসজিদের ভেতরে বড় স্মার্ট টিভি স্ক্রিনে ডিজিটাল ক্লক, কাউন্টডাউন, পরবর্তী আজান ও জামাতের নোটিশ এবং মুসল্লিদের জন্য স্বচ্ছ পাবলিক ওয়েবসাইট পরিচালনার নিয়ম।',
      steps: [
        '১৪.১ সাইডবার থেকে "পাবলিক পোর্টাল" (Public Portal) মেনুতে যান।',
        '১৪.২ মসজিদের দেয়ালে লাগানো অ্যান্ড্রয়েড স্মার্ট টিভি বা মনিটরে উপরে ডানে "ডিসপ্লে স্ক্রিন / ফুলস্ক্রিন" বাটনে চাপুন।',
        '১৪.৩ ডিসপ্লে স্ক্রিনে স্বয়ংক্রিয়ভাবে চলমান ওয়াক্তের কাউন্টডাউন, পরবর্তী ওয়াক্ত ও জামাতের সময় (১২-ঘণ্টা ফরম্যাট), সূর্যোদয় ও সূর্যাস্ত, এবং তাহাজ্জুদ ও নিষিদ্ধ সময়ের সতর্কবার্তা ভেসে উঠবে।',
        '১৪.৪ জুমার দিন বা জামাতের ১০ মিনিট আগে স্ক্রিনে স্বয়ংক্রিয়ভাবে "মোবাইল ফোন বন্ধ রাখুন বা সাইলেন্ট করুন" সতর্কবার্তা প্রদর্শিত হবে।',
        '১৪.৫ সাধারণ মুসল্লিরা যাতে তাদের মোবাইল থেকেই মসজিদের আয়-ব্যয়ের স্বচ্ছতা ও নামাজের সময় দেখতে পারেন, সেজন্য পোর্টালের কিউআর কোড প্রিন্ট করে মসজিদে টানিয়ে দিন।'
      ],
      tips: [
        'স্মার্ট টিভিতে কোনো মাউস বা কিবোর্ড ছাড়াই পোর্টালটি সারাদিন ফুলস্ক্রিনে চালু রাখা যায় এবং ইন্টারনেট বন্ধ থাকলেও অফলাইনে রিয়েল-টাইম সময় দেখায়।'
      ]
    }
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
        (sec.tips && sec.tips.some((t) => t.toLowerCase().includes(query)));
      return matchCat && matchQuery;
    });
  }, [selectedCategory, searchQuery]);

  const handlePrintManual = () => {
    printElement('user-manual-print-container', {
      title: 'মসজিদলেজার_ব্যবহার_নির্দেশিকা',
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '10mm 12mm',
    });
  };

  return (
    <div id="user-manual-print-container" className="space-y-6 pb-16 font-siliguri printable-content">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden print:bg-none print:text-black print:p-2">
        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-400/30 text-xs font-bold text-emerald-200">
            <BookOpen className="w-3.5 h-3.5" />
            পূর্ণাঙ্গ ব্যবহার বিধি ও সহায়িকা সহায়তাকারক
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            MasjidLedger মসজিদ পরিচালনা নির্দেশিকা
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 leading-relaxed">
            মসজিদের দৈনন্দিন আয়-ব্যয়, দান সংগ্রহ, ওয়াকফ সম্পত্তি ও মূল দলিলের ডিজিটাল সংরক্ষণ, ইমাম-মুয়াজ্জিনের বেতন, কবরস্থান রেজিস্টার ও অডিট রিপোর্ট তৈরির সম্পূর্ণ নিয়মাবলী।
          </p>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 print:hidden">
          <button
            onClick={handlePrintManual}
            className="px-4 py-2.5 bg-white text-slate-800 hover:bg-emerald-50 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-emerald-700" />
            নির্দেশিকা প্রিন্ট করুন
          </button>
          <div className="text-xs text-emerald-200/90 font-medium">
            সর্বমোট {sections.length}টি প্রধান নির্দেশিকা মডিউল অন্তর্ভুক্ত
          </div>
        </div>
      </div>

      {/* Search & Category Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3 print:hidden">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="যেকোনো কাজের নিয়ম খুঁজুন (যেমন: দলিল আপলোড, জুমার চাঁদা, বেতন রসিদ, ব্যাকআপ, দানবাক্স)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
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
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500 space-y-2">
            <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
            <div className="font-bold text-slate-800">কোনো নির্দেশিকা পাওয়া যায়নি</div>
            <p className="text-xs">অনুগ্রহ করে ভিন্ন কোনো শব্দ দিয়ে সার্চ করুন অথবা "সকল বিষয়" সিলেক্ট করুন।</p>
          </div>
        ) : (
          filteredSections.map((sec) => {
            const Icon = sec.icon;
            const isExpanded = expandedSectionId === sec.id || searchQuery.trim().length > 0;

            return (
              <div
                key={sec.id}
                id={sec.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 transition-all shadow-xs overflow-hidden print:border-none print:shadow-none print:break-inside-avoid"
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
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
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md text-[10px] font-bold">
                            {sec.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {sec.summary}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sec.targetTab && onNavigate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate(sec.targetTab!);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors print:hidden"
                      >
                        সরাসরি যান <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
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
                      <div className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ধাপভিত্তিক কাজের পদ্ধতি:
                      </div>
                      <div className="space-y-2 pl-2">
                        {sec.steps.map((st, idx) => (
                          <div key={idx} className="flex items-start gap-2.5 text-slate-700 leading-relaxed">
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
                          <p key={i} className="text-xs leading-relaxed text-emerald-800">
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
                          <p key={i} className="text-xs leading-relaxed text-rose-800">
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
            আরও কোনো প্রশ্ন বা প্রযুক্তিগত সহায়তার প্রয়োজন?
          </h4>
          <p className="text-xs text-slate-600">
            MasjidLedger সফটওয়্যারটিতে নিয়মিত ব্যাকআপ রাখা নিশ্চিত করুন এবং অডিট কমিটির সাথে সাপ্তাহিক রিপোর্ট শেয়ার করুন।
          </p>
        </div>
        <button
          onClick={handlePrintManual}
          className="px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5 shrink-0 shadow-xs"
        >
          <Printer className="w-4 h-4" />
          সম্পূর্ণ নির্দেশিকা প্রিন্ট নিন
        </button>
      </div>
    </div>
  );
};
