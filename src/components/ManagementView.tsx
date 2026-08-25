import React, { useState } from 'react';
import {
  UserCheck,
  Package,
  Building,
  Crosshair,
  Bell,
  Plus,
  DollarSign,
  Phone,
  Calendar,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  Staff,
  StaffPayment,
  MosqueAsset,
  MosqueProperty,
  CemeteryRecord,
  MosqueNotice,
  FinancialAccount
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';

interface ManagementViewProps {
  initialTab?: 'staff' | 'assets' | 'property' | 'cemetery' | 'notices';
  staff: Staff[];
  staffPayments: StaffPayment[];
  assets: MosqueAsset[];
  properties: MosqueProperty[];
  cemetery: CemeteryRecord[];
  notices: MosqueNotice[];
  accounts: FinancialAccount[];
  language: Language;
  onPayStaff: (data: any) => Promise<void>;
  onAddCemeteryRecord: (data: any) => Promise<void>;
  onAddNotice: (data: any) => Promise<void>;
}

export const ManagementView: React.FC<ManagementViewProps> = ({
  initialTab = 'staff',
  staff,
  staffPayments,
  assets,
  properties,
  cemetery,
  notices,
  accounts,
  language,
  onPayStaff,
  onAddCemeteryRecord,
  onAddNotice,
}) => {
  const t = translations[language];
  const [activeTab, setActiveTab] = useState<'staff' | 'assets' | 'property' | 'cemetery' | 'notices'>(initialTab);

  // Pay Salary Modal
  const [isPaySalaryOpen, setIsPaySalaryOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(staff[0]?.id || '');
  const [salaryMonth, setSalaryMonth] = useState('2026-08');
  const [payAccountId, setPayAccountId] = useState(accounts[0]?.id || '');
  const [payNotes, setPayNotes] = useState('');

  // Cemetery Modal
  const [isCemeteryModalOpen, setIsCemeteryModalOpen] = useState(false);
  const [plotNumber, setPlotNumber] = useState('');
  const [deceasedName, setDeceasedName] = useState('');
  const [fatherOrSpouse, setFatherOrSpouse] = useState('');
  const [burialDate, setBurialDate] = useState(new Date().toISOString().split('T')[0]);
  const [graveLoc, setGraveLoc] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [cemeteryNotes, setCemeteryNotes] = useState('');

  // Notice Modal
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeDesc, setNoticeDesc] = useState('');
  const [noticePriority, setNoticePriority] = useState<MosqueNotice['priority']>('NORMAL');
  const [isPublicNotice, setIsPublicNotice] = useState(true);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onPayStaff({
        staffId: selectedStaffId || staff[0]?.id,
        month: salaryMonth,
        accountId: payAccountId || accounts[0]?.id,
        paymentMethod: 'BANK',
        notes: payNotes,
      });
      setIsPaySalaryOpen(false);
      setPayNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCemeterySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plotNumber || !deceasedName) return;
    try {
      await onAddCemeteryRecord({
        plotNumber,
        deceasedName,
        fatherOrSpouseName: fatherOrSpouse,
        burialDate,
        graveLocation: graveLoc,
        contactPersonName: contactName,
        contactPersonPhone: contactPhone,
        notes: cemeteryNotes,
      });
      setIsCemeteryModalOpen(false);
      setPlotNumber('');
      setDeceasedName('');
      setFatherOrSpouse('');
      setGraveLoc('');
      setContactName('');
      setContactPhone('');
      setCemeteryNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleNoticeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle || !noticeDesc) return;
    try {
      await onAddNotice({
        title: noticeTitle,
        description: noticeDesc,
        priority: noticePriority,
        isPublic: isPublicNotice,
      });
      setIsNoticeModalOpen(false);
      setNoticeTitle('');
      setNoticeDesc('');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-10">
      {/* Navigation Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            id="tab-btn-staff"
            onClick={() => setActiveTab('staff')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'staff' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>ইমাম ও স্টাফ</span>
            <span className="ml-1 bg-blue-700 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {staff.length}
            </span>
          </button>

          <button
            id="tab-btn-assets"
            onClick={() => setActiveTab('assets')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'assets' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>সম্পদ ও সরঞ্জাম</span>
          </button>

          <button
            id="tab-btn-property"
            onClick={() => setActiveTab('property')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'property' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>ওয়াকফ ও জমিজমা</span>
          </button>

          <button
            id="tab-btn-cemetery"
            onClick={() => setActiveTab('cemetery')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'cemetery' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>কবরস্থান রেজিস্টার</span>
          </button>

          <button
            id="tab-btn-notices"
            onClick={() => setActiveTab('notices')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'notices' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>নোটিশ বোর্ড</span>
          </button>
        </div>

        <div>
          {activeTab === 'staff' && (
            <button
              id="btn-open-pay-salary"
              onClick={() => setIsPaySalaryOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <DollarSign className="w-4 h-4" />
              <span>মাসিক বেতন/হাদিয়া পরিশোধ</span>
            </button>
          )}
          {activeTab === 'cemetery' && (
            <button
              id="btn-open-add-cemetery"
              onClick={() => setIsCemeteryModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন দাফন রেকর্ড সংযোজন</span>
            </button>
          )}
          {activeTab === 'notices' && (
            <button
              id="btn-open-add-notice"
              onClick={() => setIsNoticeModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন নোটিশ প্রকাশ</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. STAFF SECTION */}
      {activeTab === 'staff' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {staff.map((stf) => (
              <div
                key={stf.id}
                className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-900 font-bold text-sm flex items-center justify-center border-2 border-blue-200">
                    {stf.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{stf.name}</h3>
                    <span className="text-xs text-blue-700 font-semibold">{stf.designationBn}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-2 border-t border-slate-100">
                  <div>মোবাইল: <strong>{stf.phone}</strong></div>
                  <div>যোগদানের তারিখ: {formatDate(stf.joiningDate, language)}</div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500">মাসিক হাদিয়া/বেতন:</span>
                  <span className="font-bold text-slate-900 text-sm">
                    {formatCurrency(stf.monthlySalary + (stf.allowance || 0), language)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Salary History Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">সাম্প্রতিক বেতন ও হাদিয়া পরিশোধের রেকর্ড</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">ভাউচার নং</th>
                    <th className="py-3 px-4">পরিশোধের তারিখ</th>
                    <th className="py-3 px-4">স্টাফের নাম ও পদবি</th>
                    <th className="py-3 px-4">মাস</th>
                    <th className="py-3 px-4 text-right">পরিশোধিত টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staffPayments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-rose-700">{pay.expenseVoucherNumber}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(pay.paymentDate, language)}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {pay.staffName} ({pay.designationBn})
                      </td>
                      <td className="py-3 px-4 text-slate-600">{pay.month}</td>
                      <td className="py-3 px-4 text-right font-bold text-rose-700">
                        {formatCurrency(pay.netPaid, language)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. ASSETS SECTION */}
      {activeTab === 'assets' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assets.map((ast) => (
            <div
              key={ast.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {ast.assetCode}
                </span>
                <span className="text-[11px] font-semibold text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                  {ast.condition}
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{ast.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">অবস্থান: {ast.location}</p>
                {ast.warrantyInfo && (
                  <p className="text-[11px] text-amber-700 font-medium mt-1">{ast.warrantyInfo}</p>
                )}
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">ক্রয়মূল্য: {formatCurrency(ast.purchaseValue, language)}</span>
                <span className="font-bold text-slate-900">
                  বর্তমান মূল্য: {formatCurrency(ast.currentValue, language)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. PROPERTY SECTION */}
      {activeTab === 'property' && (
        <div className="space-y-4">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                  {prop.propertyCode}
                </span>
                <span className="text-xs text-blue-800 font-semibold bg-blue-100 px-2.5 py-0.5 rounded-full">
                  {prop.ownershipType} ({prop.waqfEnrollmentNo})
                </span>
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">{prop.description}</h3>
                <p className="text-xs text-slate-600 mt-1">অবস্থান: {prop.location} | আয়তন: <strong>{prop.area}</strong></p>
                <p className="text-xs text-slate-700 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  বর্তমান ব্যবহার: {prop.currentUse}
                </p>
              </div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">দলিল ও নথিপত্র: {prop.documentsCount || 0} টি সংরক্ষিত</span>
                <span className="font-bold text-emerald-700">
                  মাসিক ভাড়া আয়: {formatCurrency(prop.monthlyIncome || 0, language)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. CEMETERY SECTION */}
      {activeTab === 'cemetery' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-slate-900">কবরস্থান রেজিস্টার ও প্লট তালিকা</h2>
                <p className="text-xs text-slate-500">ওয়াকফ কবরস্থানে দাফনকৃত মরহুমগণের পূর্ণাঙ্গ বিবরণ</p>
              </div>
              <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                মোট দাফন: {cemetery.length} টি
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">প্লট নং</th>
                    <th className="py-3 px-4">মরহুমের নাম</th>
                    <th className="py-3 px-4">পিতা / স্বামী</th>
                    <th className="py-3 px-4">দাফনের তারিখ</th>
                    <th className="py-3 px-4">কবরের অবস্থান</th>
                    <th className="py-3 px-4">পরিবারের যোগাযোগ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cemetery.map((cem) => (
                    <tr key={cem.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono font-bold text-blue-900">{cem.plotNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{cem.deceasedName}</td>
                      <td className="py-3 px-4 text-slate-600">{cem.fatherOrSpouseName}</td>
                      <td className="py-3 px-4 text-slate-600">{formatDate(cem.burialDate, language)}</td>
                      <td className="py-3 px-4 text-slate-700">{cem.graveLocation}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{cem.contactPersonName}</div>
                        <div className="text-[11px] text-slate-500">{cem.contactPersonPhone}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. NOTICES SECTION */}
      {activeTab === 'notices' && (
        <div className="space-y-4">
          {notices.map((not) => (
            <div
              key={not.id}
              className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    not.priority === 'HIGH' ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {not.priority === 'HIGH' ? 'জরুরি নোটিশ' : 'সাধারণ নোটিশ'}
                  </span>
                  {not.isPublic && (
                    <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full border border-slate-200 font-semibold">
                      পাবলিক পেজে প্রকাশিত
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-500">{formatDate(not.publishDate, language)}</span>
              </div>

              <div>
                <h3 className="font-bold text-slate-900 text-base">{not.title}</h3>
                <p className="text-xs text-slate-700 mt-2 leading-relaxed whitespace-pre-line">
                  {not.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                প্রকাশক: <strong>{not.publishedByName}</strong>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PAY SALARY MODAL */}
      {isPaySalaryOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">ইমাম ও স্টাফ মাসিক হাদিয়া/বেতন পরিশোধ</h3>
            <form onSubmit={handlePaySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">স্টাফ নির্বাচন *</label>
                <select
                  id="select-staff-id"
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {staff.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.designationBn} - {formatCurrency(st.monthlySalary + (st.allowance || 0), language)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মাস (YYYY-MM) *</label>
                <input
                  id="input-salary-month"
                  type="month"
                  value={salaryMonth}
                  onChange={(e) => setSalaryMonth(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পরিশোধের হিসাব *</label>
                <select
                  id="select-salary-account"
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:bg-white focus:ring-1 focus:ring-blue-500 font-medium"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn} (স্থিতি: {formatCurrency(a.currentBalance, language)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মন্তব্য</label>
                <input
                  id="input-salary-notes"
                  type="text"
                  placeholder="e.g. ব্যাংক চেকের মাধ্যমে পরিশোধ"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaySalaryOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-confirm-salary-pay"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  বেতন পরিশোধ নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CEMETERY RECORD MODAL */}
      {isCemeteryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">কবরস্থানে নতুন দাফন রেকর্ড</h3>
            <form onSubmit={handleCemeterySubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">প্লট নম্বর *</label>
                  <input
                    id="input-cemetery-plot"
                    type="text"
                    placeholder="e.g. PLOT-C-04"
                    value={plotNumber}
                    onChange={(e) => setPlotNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">দাফনের তারিখ *</label>
                  <input
                    id="input-cemetery-burial-date"
                    type="date"
                    value={burialDate}
                    onChange={(e) => setBurialDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">মরহুমের পূর্ণ নাম *</label>
                <input
                  id="input-cemetery-deceased"
                  type="text"
                  placeholder="মরহুম..."
                  value={deceasedName}
                  onChange={(e) => setDeceasedName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">পিতা বা স্বামীর নাম</label>
                <input
                  id="input-cemetery-father"
                  type="text"
                  value={fatherOrSpouse}
                  onChange={(e) => setFatherOrSpouse(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পরিবারের অভিভাবক</label>
                  <input
                    id="input-cemetery-contact-name"
                    type="text"
                    placeholder="ওয়ারিশের নাম"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
                  <input
                    id="input-cemetery-contact-phone"
                    type="tel"
                    placeholder="017XXXXXXXX"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCemeteryModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-cemetery-record"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NOTICE MODAL */}
      {isNoticeModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-base text-slate-900">নতুন নোটিশ প্রকাশ</h3>
            <form onSubmit={handleNoticeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">নোটিশের শিরোনাম *</label>
                <input
                  id="input-notice-title"
                  type="text"
                  placeholder="e.g. আগামী জুমার বিশেষ ঘোষণা"
                  value={noticeTitle}
                  onChange={(e) => setNoticeTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">বিস্তারিত ঘোষণা *</label>
                <textarea
                  id="input-notice-desc"
                  rows={4}
                  placeholder="সম্মানিত মুসল্লিবৃন্দের সদয় অবগতির জন্য..."
                  value={noticeDesc}
                  onChange={(e) => setNoticeDesc(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:bg-white focus:ring-1 focus:ring-blue-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-xs font-semibold text-slate-700">পাবলিক ওয়েবসাইটে প্রকাশ করুন</span>
                <input
                  id="chk-notice-public"
                  type="checkbox"
                  checked={isPublicNotice}
                  onChange={(e) => setIsPublicNotice(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  id="btn-save-notice"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  প্রকাশ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
