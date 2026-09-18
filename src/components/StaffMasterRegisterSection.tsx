import React, { useState, useMemo } from 'react';
import {
  ClipboardList,
  Search,
  Filter,
  Printer,
  Download,
  Eye,
  FileSpreadsheet,
  FolderOpen,
  UserCheck,
  CheckCircle2,
  ExternalLink,
  ShieldCheck
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Staff, Mosque } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';

interface StaffMasterRegisterSectionProps {
  staffList: Staff[];
  currentMosque?: Mosque | null;
  onViewStaffProfile: (staff: Staff) => void;
  language: Language;
}

export const StaffMasterRegisterSection: React.FC<StaffMasterRegisterSectionProps> = ({
  staffList = [],
  currentMosque,
  onViewStaffProfile,
  language = 'bn',
}) => {
  const isBn = language === 'bn';

  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const filteredStaff = useMemo(() => {
    return staffList.filter((staff) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        staff.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (staff.fullNameBn && staff.fullNameBn.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (staff.phone && staff.phone.includes(searchQuery)) ||
        (staff.designationBn && staff.designationBn.includes(searchQuery)) ||
        (staff.staffCode && staff.staffCode.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && staff.status === 'ACTIVE') ||
        (statusFilter === 'INACTIVE' && staff.status !== 'ACTIVE');

      const matchesDesignation =
        designationFilter === 'ALL' || staff.designation === designationFilter || staff.designationBn.includes(designationFilter);

      return matchesSearch && matchesStatus && matchesDesignation;
    });
  }, [staffList, searchQuery, designationFilter, statusFilter]);

  // Export to Excel
  const handleExportExcel = () => {
    const data = filteredStaff.map((s, idx) => ({
      'ক্রমিক': idx + 1,
      'কর্মী আইডি': s.staffCode || s.id,
      'পূর্ণ নাম (বাংলা)': s.fullNameBn || s.name,
      'ইংরেজি নাম': s.name,
      'পদবী': s.designationBn,
      'মোবাইল নম্বর': s.phone,
      'NID নম্বর': s.nid || '',
      'যোগদানের তারিখ': s.joiningDate,
      'মাসিক মূল বেতন': s.monthlySalary || s.basicSalary || 0,
      'স্থায়ী ভাতা': s.allowance || 0,
      'সর্বমোট বেতন': (s.monthlySalary || s.basicSalary || 0) + (s.allowance || 0),
      'ব্যাংক হিসাব': s.accountNumber || 'তথ্য নেই',
      'ব্যাংক নাম': s.bankName || '',
      'Google Drive নথি সংখ্যা': s.documents?.length || 0,
      'স্ট্যাটাস': s.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'StaffMasterRegister');
    XLSX.writeFile(wb, `MasjidLedger_Staff_Master_Register_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Print Handlers
  const handlePrint = () => {
    printElement('printable-staff-master-register', {
      title: 'মসজিদলেজার_কর্মী_মাস্টার_রেজিস্টার',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            <span>ইমাম ও কর্মী মাস্টার রেজিস্টার</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            সকল কর্মকর্তা ও কর্মচারীর কেন্দ্রীয় তথ্যাবলী, পদবী, বেতন ও নথি রেজিস্টার
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mandatory Letterhead Toggle */}
          <label className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 cursor-pointer select-none transition">
            <input
              type="checkbox"
              checked={includeLetterhead}
              onChange={(e) => setIncludeLetterhead(e.target.checked)}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-0 cursor-pointer"
            />
            <span>{includeLetterhead ? '☑ লেটারহেডসহ প্রিন্ট' : '☐ লেটারহেড ছাড়া প্রিন্ট'}</span>
          </label>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট রেজিস্টার</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম, আইডি, মোবাইল বা পদবী খুঁজুন..."
            className="w-full pl-10 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={designationFilter}
            onChange={(e) => setDesignationFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">সকল পদবী</option>
            <option value="ইমাম">ইমাম</option>
            <option value="খতিব">খতিব</option>
            <option value="মুয়াজ্জিন">মুয়াজ্জিন</option>
            <option value="খাদেম">খাদেম</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700"
          >
            <option value="ALL">সকল কর্মী</option>
            <option value="ACTIVE">শুধুমাত্র সক্রিয়</option>
            <option value="INACTIVE">নিষ্ক্রিয় / সাবেক</option>
          </select>
        </div>
      </div>

      {/* Master Register Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-3 text-center">ক্রমিক</th>
                <th className="p-3">কর্মী ও আইডি</th>
                <th className="p-3">পদবী</th>
                <th className="p-3">যোগদান তারিখ</th>
                <th className="p-3">মোবাইল</th>
                <th className="p-3">মাসিক বেতন</th>
                <th className="p-3">ব্যাংক হিসাব</th>
                <th className="p-3 text-center">Google Drive নথি</th>
                <th className="p-3 text-center">স্ট্যাটাস</th>
                <th className="p-3 text-right">পদক্ষেপ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    কোনো কর্মী রেকর্ড মেলেনি।
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff, idx) => {
                  const hasDriveDocs = (staff.documents && staff.documents.length > 0) || (staff.documentLinks && staff.documentLinks.length > 0);
                  const totalMonthly = (staff.monthlySalary || staff.basicSalary || 0) + (staff.allowance || 0);
                  return (
                    <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center overflow-hidden shrink-0">
                            {staff.photoUrl ? (
                              <img src={staff.photoUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="font-bold text-indigo-700">{staff.name.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block font-siliguri">{staff.fullNameBn || staff.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">#{staff.staffCode || staff.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 font-bold text-indigo-900 font-siliguri">{staff.designationBn}</td>
                      <td className="p-3 text-slate-500">{formatDate(staff.joiningDate, language)}</td>
                      <td className="p-3 font-mono text-slate-700">{staff.phone}</td>
                      <td className="p-3 font-bold text-slate-900 font-siliguri">{formatCurrency(totalMonthly, language)}</td>
                      <td className="p-3 text-slate-600">
                        {staff.accountNumber ? (
                          <div>
                            <span className="font-mono font-medium block">{staff.accountNumber}</span>
                            <span className="text-[10px] text-slate-400">{staff.bankName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">নগদ / MFS</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                          hasDriveDocs ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-400'
                        }`}>
                          <FolderOpen className="w-3 h-3" />
                          <span>{hasDriveDocs ? `${staff.documents?.length || 1}টি নথি` : 'নেই'}</span>
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          staff.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {staff.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => onViewStaffProfile(staff)}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>প্রোফাইল</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Printable Master Register for clean print output */}
      <div id="printable-staff-master-register" className="hidden print:block p-8 bg-white text-slate-900 font-sans">
        {includeLetterhead ? (
          <MosqueOfficialLetterhead
            mosque={currentMosque}
            documentTitle="কর্মকর্তা ও কর্মচারী মাস্টার রেজিস্টার"
            dateStr={formatDate(new Date().toISOString().split('T')[0], language)}
          />
        ) : (
          <div className="text-center pb-4 border-b border-slate-300 mb-6">
            <h1 className="text-xl font-bold font-siliguri">কর্মকর্তা ও কর্মচারী মাস্টার রেজিস্টার</h1>
            <p className="text-xs text-slate-600 mt-1">ইসলামিক ও সাধারণ কর্মী কেন্দ্রীয় মাস্টার তালিকা</p>
          </div>
        )}

        <table className="w-full text-xs text-left border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-slate-300">
              <th className="p-2 border border-slate-300">ক্রমিক</th>
              <th className="p-2 border border-slate-300">কর্মী আইডি</th>
              <th className="p-2 border border-slate-300">নাম (বাংলা)</th>
              <th className="p-2 border border-slate-300">পদবী</th>
              <th className="p-2 border border-slate-300">মোবাইল নম্বর</th>
              <th className="p-2 border border-slate-300">যোগদান তারিখ</th>
              <th className="p-2 border border-slate-300">মাসিক বেতন</th>
              <th className="p-2 border border-slate-300">ব্যাংক ও হিসাব</th>
              <th className="p-2 border border-slate-300 text-center">স্ট্যাটাস</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.map((staff, idx) => (
              <tr key={staff.id} className="border-b border-slate-200">
                <td className="p-2 border border-slate-300 text-center">{idx + 1}</td>
                <td className="p-2 border border-slate-300 font-mono">#{staff.staffCode || staff.id}</td>
                <td className="p-2 border border-slate-300 font-bold font-siliguri">{staff.fullNameBn || staff.name}</td>
                <td className="p-2 border border-slate-300">{staff.designationBn}</td>
                <td className="p-2 border border-slate-300 font-mono">{staff.phone}</td>
                <td className="p-2 border border-slate-300">{formatDate(staff.joiningDate, language)}</td>
                <td className="p-2 border border-slate-300 font-bold">{formatCurrency((staff.monthlySalary || 0) + (staff.allowance || 0), language)}</td>
                <td className="p-2 border border-slate-300">{staff.accountNumber || 'নগদ'}</td>
                <td className="p-2 border border-slate-300 text-center">{staff.status === 'ACTIVE' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-16 pt-6 border-t border-slate-300 flex justify-between text-xs text-center">
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">হিসাবরক্ষক</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">সাধারণ সম্পাদক</div>
          </div>
          <div>
            <div className="w-36 border-t border-slate-600 pt-1 font-bold">সভাপতি / মোতওয়াল্লী</div>
          </div>
        </div>
      </div>
    </div>
  );
};
