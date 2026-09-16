import React, { useState, useMemo } from 'react';
import {
  Bell,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Calendar,
  Banknote,
  Users2,
  HardDrive,
  ArrowRight,
  ShieldAlert,
  Inbox,
  CheckCheck,
} from 'lucide-react';
import { Mosque, User, MosqueNotification } from '../types';

export interface GeneratedRealNotification {
  id: string;
  type: 'SALARY_DUE' | 'COMMITTEE_EXPIRING' | 'BOX_COLLECTION_PENDING' | 'BACKUP_ALERT' | 'NOTICE' | 'SYSTEM';
  title: string;
  message: string;
  timestamp: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  targetTab: string;
  targetRecordId?: string;
  isRead?: boolean;
}

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string, recordId?: string) => void;
  currentUser?: User | null;
  staff?: any[];
  staffPayments?: any[];
  committeeTerms?: any[];
  donationBoxes?: any[];
  notices?: any[];
  systemNotifications?: MosqueNotification[];
  onMarkAllRead?: () => void;
}

export const NotificationCenterModal: React.FC<NotificationCenterModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentUser,
  staff = [],
  staffPayments = [],
  committeeTerms = [],
  donationBoxes = [],
  notices = [],
  systemNotifications = [],
  onMarkAllRead,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'ACTION_REQUIRED'>('ALL');
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  // Generate real, non-fake notifications from actual database state
  const realNotifications = useMemo(() => {
    const list: GeneratedRealNotification[] = [];
    const now = new Date();
    const currentMonth = now.toISOString().slice(0, 7); // YYYY-MM

    // 1. Check Staff Salary Pending for current month
    const paidStaffIds = new Set(
      staffPayments
        .filter((p) => p.paymentMonth === currentMonth && p.status === 'PAID')
        .map((p) => p.staffId)
    );

    const unpaidStaff = staff.filter((s) => s.status === 'ACTIVE' && !paidStaffIds.has(s.id));
    if (unpaidStaff.length > 0) {
      list.push({
        id: `sal-due-${currentMonth}`,
        type: 'SALARY_DUE',
        title: `চলতি মাসের (${currentMonth}) স্টাফ বেতন বাকি`,
        message: `মোট ${unpaidStaff.length} জন সক্রিয় ইমাম ও স্টাফের চলতি মাসের বেতন এন্ট্রি এখনো সম্পন্ন হয়নি।`,
        timestamp: 'আজ',
        priority: 'HIGH',
        targetTab: 'salaryBankTransfer',
      });
    }

    // 2. Check Committee Term Expiration
    committeeTerms.forEach((term) => {
      if (term.status === 'ACTIVE' && term.endDate) {
        const end = new Date(term.endDate);
        const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays <= 0) {
          list.push({
            id: `term-exp-${term.id}`,
            type: 'COMMITTEE_EXPIRING',
            title: `কমিটির মেয়াদ সমাপ্ত হয়েছে`,
            message: `"${term.title}" কমিটির মেয়াদ ${term.endDate} তারিখে শেষ হয়ে গেছে। নতুন কমিটি গঠন বা নবায়ন প্রয়োজন।`,
            timestamp: term.endDate,
            priority: 'URGENT',
            targetTab: 'committee',
          });
        } else if (diffDays <= 30) {
          list.push({
            id: `term-exp-soon-${term.id}`,
            type: 'COMMITTEE_EXPIRING',
            title: `কমিটির মেয়াদ সমাপ্তির পূর্বাভাস`,
            message: `"${term.title}" কমিটির মেয়াদ আগামী ${diffDays} দিনের মধ্যে (${term.endDate}) শেষ হবে।`,
            timestamp: 'আসন্ন',
            priority: 'MEDIUM',
            targetTab: 'committee',
          });
        }
      }
    });

    // 3. System database notifications
    systemNotifications.forEach((sn) => {
      list.push({
        id: `sys-${sn.id}`,
        type: 'SYSTEM',
        title: sn.title,
        message: sn.message,
        timestamp: sn.createdAt ? new Date(sn.createdAt).toLocaleDateString('bn-BD') : 'সম্প্রতি',
        priority: (sn.type as any) === 'ERROR' ? 'HIGH' : 'LOW',
        targetTab: sn.linkUrl ? sn.linkUrl.replace('/', '') : 'dashboard',
        isRead: sn.isRead,
      });
    });

    // 4. Latest Mosque Notices
    notices.slice(0, 3).forEach((n) => {
      list.push({
        id: `notice-${n.id}`,
        type: 'NOTICE',
        title: `নোটিশ: ${n.title}`,
        message: n.content?.slice(0, 80) + '...',
        timestamp: n.publishDate || n.date || 'সম্প্রতি',
        priority: n.priority === 'HIGH' ? 'HIGH' : 'LOW',
        targetTab: 'notices',
        targetRecordId: n.id,
      });
    });

    return list;
  }, [staff, staffPayments, committeeTerms, systemNotifications, notices]);

  const filteredNotifications = useMemo(() => {
    return realNotifications.filter((n) => {
      const isRead = readIds.has(n.id) || n.isRead;
      if (filter === 'UNREAD') return !isRead;
      if (filter === 'ACTION_REQUIRED') return n.priority === 'HIGH' || n.priority === 'URGENT';
      return true;
    });
  }, [realNotifications, filter, readIds]);

  const unreadCount = realNotifications.filter((n) => !readIds.has(n.id) && !n.isRead).length;

  const handleNotificationClick = (item: GeneratedRealNotification) => {
    setReadIds((prev) => new Set([...prev, item.id]));
    onNavigate(item.targetTab, item.targetRecordId);
    onClose();
  };

  const handleMarkAll = () => {
    const all = new Set(realNotifications.map((n) => n.id));
    setReadIds(all);
    if (onMarkAllRead) onMarkAllRead();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-20 px-3 sm:px-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 font-siliguri flex items-center gap-2">
                <span>নোটিফিকেশন সেন্টার</span>
                {unreadCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono">
                    {unreadCount} নতুন
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-stone-500">প্রকৃত মসজিদ কার্যক্রম ও সতর্কবার্তা</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                className="text-xs text-emerald-700 hover:text-emerald-900 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1"
                title="সব পঠিত চিহ্নিত করুন"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>সব পঠিত</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-3 py-2 border-b border-stone-100 bg-white flex items-center gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              filter === 'ALL' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-600'
            }`}
          >
            সব ({realNotifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('UNREAD')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              filter === 'UNREAD' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-600'
            }`}
          >
            অপঠিত ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setFilter('ACTION_REQUIRED')}
            className={`px-3 py-1 rounded-full font-semibold transition ${
              filter === 'ACTION_REQUIRED' ? 'bg-emerald-700 text-white shadow-xs' : 'bg-stone-100 text-stone-600'
            }`}
          >
            গুরুত্বপূর্ণ অ্যাকশন
          </button>
        </div>

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-stone-100">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <Inbox className="w-8 h-8 mx-auto mb-2 text-stone-300" />
              <p className="text-xs font-bold text-stone-700 font-siliguri">কোনো নোটিফিকেশন নেই</p>
              <p className="text-[11px] text-stone-400 mt-0.5">সবকিছু আপ-টু-ডেট রয়েছে!</p>
            </div>
          ) : (
            filteredNotifications.map((item) => {
              const isRead = readIds.has(item.id) || item.isRead;
              const isUrgent = item.priority === 'URGENT' || item.priority === 'HIGH';

              return (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 rounded-xl transition cursor-pointer flex items-start gap-3 ${
                    isRead
                      ? 'bg-white opacity-70 hover:opacity-100 hover:bg-stone-50'
                      : isUrgent
                      ? 'bg-rose-50/60 border border-rose-200'
                      : 'bg-emerald-50/40 border border-emerald-100'
                  }`}
                >
                  <div
                    className={`p-2 rounded-xl flex-shrink-0 mt-0.5 ${
                      isUrgent ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {item.type === 'SALARY_DUE' ? (
                      <Banknote className="w-4 h-4" />
                    ) : item.type === 'COMMITTEE_EXPIRING' ? (
                      <Users2 className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-stone-900 truncate font-siliguri">
                        {item.title}
                      </h4>
                      <span className="text-[10px] text-stone-400 whitespace-nowrap">
                        {item.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-600 mt-0.5 leading-relaxed">{item.message}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-emerald-800 flex items-center gap-1">
                        <span>মডিউলে যান</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      {!isRead && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 text-center">
          <p className="text-[11px] text-stone-500">
            নোটিফিকেশনে ক্লিক করলে সরাসরি সংশ্লিষ্ট ম্যানেজমেন্ট পেজে নিয়ে যাওয়া হবে।
          </p>
        </div>
      </div>
    </div>
  );
};
