import React, { useState, useRef } from 'react';
import {
  FileText,
  Printer,
  Download,
  X,
  Building,
  DollarSign,
  User,
  Shield,
  Calendar,
  AlertTriangle,
  Scale,
  Landmark,
  Layers,
  Wrench,
  Archive,
  TrendingUp,
  Search,
  Filter,
  CheckCircle2,
  Receipt
} from 'lucide-react';
import { MosqueProperty, MosqueProfile, Mosque } from '../types';
import { Language, formatCurrency, formatDate } from '../lib/i18n';
import { PROPERTY_CATEGORIES, POSSESSION_STATUSES, PROPERTY_STATUSES } from './PropertyFormModal';

export type PropertyReportType =
  | 'PROPERTY_REGISTER'
  | 'LAND_REGISTER'
  | 'COMMERCIAL_REGISTER'
  | 'TENANT_DIRECTORY'
  | 'LEASE_MONITORING'
  | 'RENT_COLLECTION_LEDGER'
  | 'DUE_OUTSTANDING_REPORT'
  | 'PROPERTY_INCOME_STATEMENT'
  | 'PROPERTY_EXPENSE_BREAKDOWN'
  | 'NET_INCOME_ANALYSIS'
  | 'KHAJNA_TAX_REPORT'
  | 'LEGAL_CASES_REPORT'
  | 'DOCUMENT_INDEX'
  | 'INSPECTION_HISTORY'
  | 'COMMITTEE_SUMMARY'
  | 'ANNUAL_FINANCIAL_STATEMENT'
  | 'WAQF_CERTIFICATE';

interface PropertyReportsModalProps {
  properties: MosqueProperty[];
  mosque: MosqueProfile | Mosque | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const PropertyReportsModal: React.FC<PropertyReportsModalProps> = ({
  properties,
  mosque,
  isOpen,
  onClose,
  language
}) => {
  const [selectedReport, setSelectedReport] = useState<PropertyReportType>('PROPERTY_REGISTER');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('2026');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [includeLetterhead, setIncludeLetterhead] = useState<boolean>(true);
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const reportList: { id: PropertyReportType; titleBn: string; category: string; icon: any }[] = [
    { id: 'PROPERTY_REGISTER', titleBn: '১. ওয়াকফ সম্পত্তি প্রধান রেজিস্টার', category: 'রেজিস্টার', icon: Building },
    { id: 'LAND_REGISTER', titleBn: '২. ওয়াকফ ভূমি ও দাগ-খতিয়ান রেজিস্টার', category: 'রেজিস্টার', icon: Landmark },
    { id: 'COMMERCIAL_REGISTER', titleBn: '৩. মার্কেট ও বাণিজ্যিক দোকান রেজিস্টার', category: 'রেজিস্টার', icon: Layers },
    { id: 'TENANT_DIRECTORY', titleBn: '৪. ভাড়াটিয়া ও ইজারাদার ডিরেক্টরি', category: 'ভাড়াটিয়া ও ইজারা', icon: User },
    { id: 'LEASE_MONITORING', titleBn: '৫. ইজারা চুক্তি ও মেয়াদ মনিটরিং', category: 'ভাড়াটিয়া ও ইজারা', icon: Calendar },
    { id: 'RENT_COLLECTION_LEDGER', titleBn: '৬. মাসিক ভাড়া ও কিস্তি আদায় লেজার', category: 'আর্থিক হিসাব', icon: Receipt },
    { id: 'DUE_OUTSTANDING_REPORT', titleBn: '৭. বকেয়া ভাড়া ও রিকভারি স্টেটমেন্ট', category: 'আর্থিক হিসাব', icon: AlertTriangle },
    { id: 'PROPERTY_INCOME_STATEMENT', titleBn: '৮. সম্পত্তিভিত্তিক ভাড়া আয় বিবরণী', category: 'আর্থিক হিসাব', icon: DollarSign },
    { id: 'PROPERTY_EXPENSE_BREAKDOWN', titleBn: '৯. সম্পত্তি মেরামত ও পরিচালন ব্যয়', category: 'আর্থিক হিসাব', icon: Wrench },
    { id: 'NET_INCOME_ANALYSIS', titleBn: '১০. সম্পত্তিভিত্তিক নিট আয় ও লাভ-ক্ষতি', category: 'আর্থিক হিসাব', icon: TrendingUp },
    { id: 'KHAJNA_TAX_REPORT', titleBn: '১১. ভূমি উন্নয়ন কর ও খাজনা রিপোর্ট', category: 'আইনি ও কর', icon: Landmark },
    { id: 'LEGAL_CASES_REPORT', titleBn: '১২. আইনি মামলা ও বিরোধ স্টেটমেন্ট', category: 'আইনি ও কর', icon: Scale },
    { id: 'DOCUMENT_INDEX', titleBn: '১৩. দলিল ও রেকর্ডপত্র আর্কাইভ ইনডেক্স', category: 'দলিল ও অডিট', icon: Archive },
    { id: 'INSPECTION_HISTORY', titleBn: '১৪. সম্পত্তি পরিদর্শন ও পর্যবেক্ষণ লগ', category: 'দলিল ও অডিট', icon: CheckCircle2 },
    { id: 'COMMITTEE_SUMMARY', titleBn: '১৫. ওয়াকফ পোর্টফোলিও কমিটি সারাংশ', category: 'কমিটি ও বাৎসরিক', icon: Layers },
    { id: 'ANNUAL_FINANCIAL_STATEMENT', titleBn: '১৬. বাৎসরিক ওয়াকফ এস্টেট আর্থিক বিবরণী', category: 'কমিটি ও বাৎসরিক', icon: FileText },
    { id: 'WAQF_CERTIFICATE', titleBn: '১৭. ওয়াকফ এস্টেট সার্টিফিকেট ও প্রত্যয়ন', category: 'কমিটি ও বাৎসরিক', icon: Shield }
  ];

  const filteredProperties = properties.filter(p => {
    if (selectedPropertyId !== 'ALL' && p.id !== selectedPropertyId) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (p.name || '').toLowerCase().includes(term);
      const matchBn = (p.nameBn || '').toLowerCase().includes(term);
      const matchCode = (p.propertyCode || '').toLowerCase().includes(term);
      const matchMouza = (p.mouza || '').toLowerCase().includes(term);
      const matchPlot = (p.bsPlotNo || p.plotNo || '').toLowerCase().includes(term);
      if (!matchName && !matchBn && !matchCode && !matchMouza && !matchPlot) return false;
    }
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    let headers = ['Property Code', 'Property Name', 'Category', 'Area', 'Possession', 'Monthly Income'];
    let rows: string[][] = [];

    if (selectedReport === 'PROPERTY_REGISTER') {
      headers = ['Property Code', 'Name', 'Category', 'Area', 'Location', 'Possession', 'Est. Value', 'Monthly Income'];
      rows = filteredProperties.map(p => [
        p.propertyCode || '',
        p.name || p.nameBn || '',
        p.category || '',
        p.area || `${p.areaAmount} Decimal`,
        p.location || '',
        p.possessionStatus || '',
        String(p.estimatedValue || 0),
        String(p.monthlyIncome || p.monthlyRent || 0)
      ]);
    } else if (selectedReport === 'TENANT_DIRECTORY') {
      headers = ['Property Code', 'Property Name', 'Tenant Name', 'Shop/Unit', 'Mobile', 'NID', 'Monthly Rent', 'Status'];
      filteredProperties.forEach(p => {
        (p.tenants || []).forEach(t => {
          rows.push([
            p.propertyCode,
            p.name || '',
            t.name,
            t.unitOrShopNo || '',
            t.mobile,
            t.nid || '',
            String(t.monthlyRent || 0),
            t.status
          ]);
        });
      });
    } else if (selectedReport === 'RENT_COLLECTION_LEDGER') {
      headers = ['Receipt No', 'Property', 'Tenant', 'Month', 'Total Due', 'Paid Amount', 'Remaining Due', 'Date', 'Method'];
      filteredProperties.forEach(p => {
        (p.rentCollections || []).forEach(c => {
          rows.push([
            c.receiptNumber,
            c.propertyName || p.name,
            c.tenantName,
            c.billingMonth,
            String(c.totalDue),
            String(c.paidAmount),
            String(c.remainingDue),
            c.paymentDate,
            c.paymentMethod
          ]);
        });
      });
    } else {
      headers = ['Property Code', 'Name', 'Category', 'Status', 'Monthly Income'];
      rows = filteredProperties.map(p => [
        p.propertyCode,
        p.name || '',
        p.category,
        p.status,
        String(p.monthlyIncome || 0)
      ]);
    }

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Waqf_Report_${selectedReport}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static report-modal-print-wrapper">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl overflow-hidden flex flex-col h-[94vh] print:h-auto print:max-h-none print:shadow-none print:border-none print:rounded-none report-modal-print-card">
        
        {/* Top Action & Navigation Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/30 border border-blue-400/40 rounded-xl">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-base font-bold">ওয়াকফ সম্পত্তি রিপোর্ট সেন্টার (Waqf Report Center)</h3>
              <p className="text-xs text-slate-300">১৭টি স্ট্যান্ডার্ড ওয়াকফ ও এস্টেট অডিট প্রতিবেদন</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none text-slate-200">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              লেটারহেড প্যাড ON/OFF
            </label>

            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 text-white rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              CSV এক্সপোর্ট
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট / PDF সেভ
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workspace Body: Sidebar + Report Canvas */}
        <div className="flex-1 flex overflow-hidden report-modal-print-body">
          
          {/* Left Navigation Bar (Report Selector & Filters) - Hidden in Print */}
          <div className="w-80 bg-slate-50 border-r border-slate-200 flex flex-col print:hidden shrink-0">
            
            {/* Filter Bar */}
            <div className="p-3 border-b border-slate-200 space-y-2 bg-white text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">সম্পত্তি ফিল্টার</label>
                <select
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="ALL">সকল সম্পত্তি (সব ওয়াকফ এস্টেট)</option>
                  {properties.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.propertyCode} - {p.name || p.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="নাম, দাগ বা মৌজা খুঁজুন..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* List of 17 Reports */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {reportList.map((rep) => {
                const IconComponent = rep.icon;
                const isSelected = selectedReport === rep.id;
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-sm font-bold'
                        : 'text-slate-700 hover:bg-slate-200/70'
                    }`}
                  >
                    <IconComponent className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{rep.titleBn}</span>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Right Printable Canvas Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
            <div
              ref={printRef}
              className="report-print-root w-full max-w-[210mm] mx-auto bg-white p-8 sm:p-10 shadow-lg print:shadow-none print:p-4 border border-slate-200 print:border-none text-slate-900 font-sans"
              style={{ minHeight: '297mm' }}
            >
              
              {/* Software Letterhead Header */}
              {includeLetterhead && (
                <div className="text-center pb-4 border-b-2 border-slate-900 mb-6">
                  <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                    {mosque?.nameBn || mosque?.name || 'মসজিদ ওয়াকফ এস্টেট'}
                  </h1>
                  <p className="text-xs text-slate-600 mt-1">
                    {mosque?.address || 'ঠিকানা: মসজিদ চত্বর'} | মোবাইল: {mosque?.phone || '০১৭XXXXXXXX'} | ইমেইল: {mosque?.email || 'info@masjid.org'}
                  </p>
                  <div className="inline-block mt-2 px-3 py-0.5 bg-slate-100 rounded-full border border-slate-300 text-[11px] font-bold text-slate-800">
                    ওয়াকফ সম্পত্তি ও জমি ব্যবস্থাপনা শাখা (Waqf Estate Directorate)
                  </div>
                </div>
              )}

              {/* Report Title & Metadata Header */}
              <div className="flex justify-between items-center bg-slate-50 border border-slate-200 p-3 rounded-xl mb-6 text-xs">
                <div>
                  <h2 className="text-sm font-bold text-blue-900">
                    {reportList.find(r => r.id === selectedReport)?.titleBn}
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    মোট তালিকাভুক্ত সম্পত্তি: <strong className="text-slate-800">{filteredProperties.length} টি</strong>
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>প্রতিবেদন প্রকাশের তারিখ: <strong className="text-slate-800">{formatDate(new Date().toISOString(), language)}</strong></div>
                  <div>পরিসংখ্যান বছর: <strong className="text-slate-800">{selectedYear}</strong></div>
                </div>
              </div>

              {/* ========================================================================= */}
              {/* REPORT 1: PROPERTY_REGISTER (ওয়াকফ সম্পত্তি প্রধান রেজিস্টার) */}
              {/* ========================================================================= */}
              {selectedReport === 'PROPERTY_REGISTER' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">কোড ও নাম</th>
                        <th className="border border-slate-300 p-2">শ্রেণি ও ব্যবহার</th>
                        <th className="border border-slate-300 p-2">জমির পরিমাণ</th>
                        <th className="border border-slate-300 p-2">দাগ ও খতিয়ান</th>
                        <th className="border border-slate-300 p-2">দখল অবস্থা</th>
                        <th className="border border-slate-300 p-2 text-right">মাসিক আয়</th>
                        <th className="border border-slate-300 p-2 text-right">বাজারমূল্য</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((p, idx) => (
                        <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{p.name || p.nameBn}</div>
                            <div className="font-mono text-[10px] text-blue-700">{p.propertyCode}</div>
                          </td>
                          <td className="border border-slate-300 p-2">
                            <div>{p.category}</div>
                            <div className="text-[10px] text-slate-500">{p.currentUse || p.type}</div>
                          </td>
                          <td className="border border-slate-300 p-2 font-semibold">
                            {p.area || `${p.areaAmount} শতাংশ`}
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div>দাগ: {p.bsPlotNo || p.plotNo || p.rsPlotNo || '-'}</div>
                            <div>খতিয়ান: {p.bsKhatianNo || p.khatianNo || p.mutationKhatianNo || '-'}</div>
                          </td>
                          <td className="border border-slate-300 p-2">
                            <span className="font-bold text-slate-800">{p.possessionStatus}</span>
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">
                            {formatCurrency(p.monthlyIncome || p.monthlyRent || 0, language)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-semibold text-slate-900">
                            {formatCurrency(p.estimatedValue || 0, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800">
                      <tr>
                        <td colSpan={6} className="border border-slate-300 p-2 text-right text-slate-900">সর্বমোট:</td>
                        <td className="border border-slate-300 p-2 text-right text-emerald-800">
                          {formatCurrency(filteredProperties.reduce((sum, p) => sum + (p.monthlyIncome || p.monthlyRent || 0), 0), language)}
                        </td>
                        <td className="border border-slate-300 p-2 text-right text-slate-900">
                          {formatCurrency(filteredProperties.reduce((sum, p) => sum + (p.estimatedValue || 0), 0), language)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 2: LAND_REGISTER (ওয়াকফ ভূমি ও দাগ-খতিয়ান রেজিস্টার) */}
              {/* ========================================================================= */}
              {selectedReport === 'LAND_REGISTER' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">সম্পত্তি ও মৌজা</th>
                        <th className="border border-slate-300 p-2">সিএস/এসএ দাগ ও খতিয়ান</th>
                        <th className="border border-slate-300 p-2">আরএস/বিএস দাগ ও খতিয়ান</th>
                        <th className="border border-slate-300 p-2">নামজারি / মিউটেশন</th>
                        <th className="border border-slate-300 p-2">জমির পরিমাণ</th>
                        <th className="border border-slate-300 p-2">চতুঃসীমানা</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((p, idx) => (
                        <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{p.name || p.nameBn}</div>
                            <div className="text-[10px] text-blue-700 font-mono">কোড: {p.propertyCode}</div>
                            <div className="text-[11px] text-slate-600">মৌজা: {p.mouza || '-'}, জেএল: {p.jlNumber || '-'}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div>CS দাগ: {p.csPlotNo || '-'} | খতিয়ান: {p.csKhatianNo || '-'}</div>
                            <div>SA দাগ: {p.saPlotNo || '-'} | খতিয়ান: {p.saKhatianNo || '-'}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div>RS দাগ: {p.rsPlotNo || '-'} | খতিয়ান: {p.rsKhatianNo || '-'}</div>
                            <div className="font-bold text-slate-900">BS দাগ: {p.bsPlotNo || p.plotNo || '-'} | খতিয়ান: {p.bsKhatianNo || p.khatianNo || '-'}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div className="font-semibold text-emerald-800">{p.mutationKhatianNo || 'হাল মিউটেশন সম্পন্ন'}</div>
                            <div className="text-slate-500">সাব-রেজিস্ট্রি: {p.subRegistryOffice || 'স্থানীয় অফিস'}</div>
                          </td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">
                            {p.area || `${p.areaAmount} শতাংশ`}
                          </td>
                          <td className="border border-slate-300 p-2 text-[10px] text-slate-600">
                            <div>উ: {p.boundaryNorth || '-'}</div>
                            <div>দ: {p.boundarySouth || '-'}</div>
                            <div>পূ: {p.boundaryEast || '-'}</div>
                            <div>প: {p.boundaryWest || '-'}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 3: COMMERCIAL_REGISTER (মার্কেট ও বাণিজ্যিক দোকান) */}
              {/* ========================================================================= */}
              {selectedReport === 'COMMERCIAL_REGISTER' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">মার্কেট / বাণিজ্যিক সম্পত্তি</th>
                        <th className="border border-slate-300 p-2">মোট দোকান/ইউনিট</th>
                        <th className="border border-slate-300 p-2">ভাড়াটিয়ার নাম ও ব্যবসা</th>
                        <th className="border border-slate-300 p-2 text-right">মাসিক ভাড়া</th>
                        <th className="border border-slate-300 p-2 text-right">জামানত</th>
                        <th className="border border-slate-300 p-2 text-center">চুক্তি মেয়াদ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.flatMap((p, pIdx) =>
                        (p.tenants || []).map((t, tIdx) => (
                          <tr key={`${p.id}-${t.id}`} className={tIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-300 p-2 text-center font-bold">{tIdx + 1}</td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-bold text-slate-900">{p.name || p.nameBn}</div>
                              <div className="text-[10px] text-blue-700">{t.unitOrShopNo || 'দোকান'}</div>
                            </td>
                            <td className="border border-slate-300 p-2 font-semibold text-slate-700">
                              {t.unitOrShopNo || `দোকান নং- ০${tIdx + 1}`}
                            </td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-bold text-slate-900">{t.name}</div>
                              <div className="text-[11px] text-slate-600">{t.businessName || t.businessType || 'ব্যবসা প্রতিষ্ঠান'}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{t.mobile}</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">
                              {formatCurrency(t.monthlyRent || 0, language)}
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-semibold text-slate-800">
                              {formatCurrency(t.securityDeposit || 0, language)}
                            </td>
                            <td className="border border-slate-300 p-2 text-center text-[11px]">
                              {t.startDate} হতে {t.endDate || 'অনির্দিষ্ট'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 4: TENANT_DIRECTORY (ভাড়াটিয়া ও ইজারাদার ডিরেক্টরি) */}
              {/* ========================================================================= */}
              {selectedReport === 'TENANT_DIRECTORY' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">ভাড়াটিয়ার নাম ও কোড</th>
                        <th className="border border-slate-300 p-2">পিতা/স্বামীর নাম ও ঠিকানা</th>
                        <th className="border border-slate-300 p-2">মোবাইল ও এনআইডি</th>
                        <th className="border border-slate-300 p-2">বরাদ্দকৃত সম্পত্তি ও ইউনিট</th>
                        <th className="border border-slate-300 p-2 text-right">নির্ধারিত মাসিক ভাড়া</th>
                        <th className="border border-slate-300 p-2 text-center">স্ট্যাটাস</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.flatMap((p, pIdx) =>
                        (p.tenants || []).map((t, tIdx) => (
                          <tr key={`${p.id}-${t.id}`} className={tIdx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-300 p-2 text-center font-bold">{tIdx + 1}</td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-bold text-slate-900">{t.name}</div>
                              <div className="font-mono text-[10px] text-blue-700">{t.tenantCode}</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-[11px]">
                              <div>{t.fatherOrSpouseName || 'পিতা: তথ্য সংরক্ষিত নেই'}</div>
                              <div className="text-slate-500">{t.address || '-'}</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-[11px] font-mono">
                              <div className="text-slate-900 font-bold">{t.mobile}</div>
                              <div className="text-slate-500">NID: {t.nid || 'সংরক্ষিত'}</div>
                            </td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-semibold text-slate-800">{p.name || p.propertyCode}</div>
                              <div className="text-[10px] text-slate-500">{t.unitOrShopNo}</div>
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">
                              {formatCurrency(t.monthlyRent || 0, language)}
                            </td>
                            <td className="border border-slate-300 p-2 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {t.status === 'ACTIVE' ? 'সক্রিয়' : t.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 6: RENT_COLLECTION_LEDGER (মাসিক ভাড়া ও কিস্তি আদায় লেজার) */}
              {/* ========================================================================= */}
              {selectedReport === 'RENT_COLLECTION_LEDGER' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">রসিদ ও ভাউচার</th>
                        <th className="border border-slate-300 p-2">সম্পত্তি ও ভাড়াটিয়া</th>
                        <th className="border border-slate-300 p-2">ভাড়ার মাস</th>
                        <th className="border border-slate-300 p-2 text-right">মোট প্রদেয়</th>
                        <th className="border border-slate-300 p-2 text-right">আদায়কৃত টাকা</th>
                        <th className="border border-slate-300 p-2 text-right">বকেয়া ব্যালেন্স</th>
                        <th className="border border-slate-300 p-2">তারিখ ও মাধ্যম</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.flatMap((p) => (p.rentCollections || [])).map((c, idx) => (
                        <tr key={c.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-mono font-bold text-slate-900">{c.receiptNumber}</div>
                            {c.incomeVoucherNumber && (
                              <div className="font-mono text-[10px] text-blue-700">হিসাব: {c.incomeVoucherNumber}</div>
                            )}
                          </td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{c.tenantName}</div>
                            <div className="text-[10px] text-slate-500">{c.propertyName || c.propertyCode} ({c.shopOrUnitNo || 'প্রধান'})</div>
                          </td>
                          <td className="border border-slate-300 p-2 font-bold text-blue-800">
                            {c.billingMonth}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-semibold text-slate-700">
                            {formatCurrency(c.totalDue, language)}
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-bold text-emerald-800">
                            {formatCurrency(c.paidAmount, language)}
                          </td>
                          <td className={`border border-slate-300 p-2 text-right font-bold ${c.remainingDue > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                            {formatCurrency(c.remainingDue, language)}
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div>{formatDate(c.paymentDate, language)}</div>
                            <div className="text-slate-500 font-semibold">{c.paymentMethod} ({c.accountName || 'প্রধান ক্যাশ'})</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800">
                      <tr>
                        <td colSpan={5} className="border border-slate-300 p-2 text-right text-slate-900">মোট আদায়:</td>
                        <td className="border border-slate-300 p-2 text-right text-emerald-800">
                          {formatCurrency(
                            filteredProperties.flatMap(p => p.rentCollections || []).reduce((sum, c) => sum + c.paidAmount, 0),
                            language
                          )}
                        </td>
                        <td className="border border-slate-300 p-2 text-right text-rose-700">
                          {formatCurrency(
                            filteredProperties.flatMap(p => p.rentCollections || []).reduce((sum, c) => sum + c.remainingDue, 0),
                            language
                          )}
                        </td>
                        <td className="border border-slate-300 p-2"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 9: PROPERTY_EXPENSE_BREAKDOWN (সম্পত্তি মেরামত ও পরিচালন ব্যয়) */}
              {/* ========================================================================= */}
              {selectedReport === 'PROPERTY_EXPENSE_BREAKDOWN' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">ভাউচার নম্বর</th>
                        <th className="border border-slate-300 p-2">সম্পত্তি কোড ও নাম</th>
                        <th className="border border-slate-300 p-2">ব্যয়ের খাত / ক্যাটাগরি</th>
                        <th className="border border-slate-300 p-2">প্রাপক ও বিবরণ</th>
                        <th className="border border-slate-300 p-2">তারিখ ও মাধ্যম</th>
                        <th className="border border-slate-300 p-2 text-right">ব্যয়ের পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.flatMap((p) => (p.expenses || [])).map((e, idx) => (
                        <tr key={e.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-mono font-bold text-slate-900">{e.voucherNumber}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{e.propertyName || e.propertyCode}</div>
                            <div className="font-mono text-[10px] text-blue-700">{e.propertyCode}</div>
                          </td>
                          <td className="border border-slate-300 p-2 font-semibold text-slate-800">
                            {e.expenseCategoryBn || e.expenseCategory}
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div className="font-bold text-slate-800">{e.payeeName}</div>
                            <div className="text-slate-600">{e.description}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div>{formatDate(e.date, language)}</div>
                            <div className="text-slate-500">{e.paymentMethod}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-bold text-rose-700">
                            {formatCurrency(e.amount, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800">
                      <tr>
                        <td colSpan={6} className="border border-slate-300 p-2 text-right text-slate-900">মোট সম্পত্তি ব্যয়:</td>
                        <td className="border border-slate-300 p-2 text-right text-rose-800 font-bold">
                          {formatCurrency(
                            filteredProperties.flatMap(p => p.expenses || []).reduce((sum, e) => sum + e.amount, 0),
                            language
                          )}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 10: NET_INCOME_ANALYSIS (সম্পত্তিভিত্তিক নিট আয় ও লাভ-ক্ষতি) */}
              {/* ========================================================================= */}
              {selectedReport === 'NET_INCOME_ANALYSIS' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">সম্পত্তি কোড ও বিবরণ</th>
                        <th className="border border-slate-300 p-2">শ্রেণি</th>
                        <th className="border border-slate-300 p-2 text-right">মোট ভাড়া আদায় (Income)</th>
                        <th className="border border-slate-300 p-2 text-right">মোট ব্যয় ও সংস্কার (Expense)</th>
                        <th className="border border-slate-300 p-2 text-right">নিট লাভ / উদ্বৃত্ত (Net Surplus)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((p, idx) => {
                        const totalIncome = (p.rentCollections || []).reduce((sum, c) => sum + c.paidAmount, 0);
                        const totalExpense = (p.expenses || []).reduce((sum, e) => sum + e.amount, 0);
                        const netSurplus = totalIncome - totalExpense;

                        return (
                          <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                            <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                            <td className="border border-slate-300 p-2">
                              <div className="font-bold text-slate-900">{p.name || p.nameBn}</div>
                              <div className="font-mono text-[10px] text-blue-700">{p.propertyCode}</div>
                            </td>
                            <td className="border border-slate-300 p-2 font-medium text-slate-700">
                              {p.category}
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">
                              {formatCurrency(totalIncome, language)}
                            </td>
                            <td className="border border-slate-300 p-2 text-right font-bold text-rose-700">
                              {formatCurrency(totalExpense, language)}
                            </td>
                            <td className={`border border-slate-300 p-2 text-right font-bold text-sm ${netSurplus >= 0 ? 'text-blue-900 bg-blue-50/50' : 'text-rose-700 bg-rose-50/50'}`}>
                              {formatCurrency(netSurplus, language)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-800">
                      {(() => {
                        const grandIncome = filteredProperties.reduce((sum, p) => sum + (p.rentCollections || []).reduce((s, c) => s + c.paidAmount, 0), 0);
                        const grandExpense = filteredProperties.reduce((sum, p) => sum + (p.expenses || []).reduce((s, e) => s + e.amount, 0), 0);
                        const grandNet = grandIncome - grandExpense;
                        return (
                          <tr>
                            <td colSpan={3} className="border border-slate-300 p-2 text-right text-slate-900">এস্টেট সর্বমোট নিট ব্যালেন্স:</td>
                            <td className="border border-slate-300 p-2 text-right text-emerald-800">{formatCurrency(grandIncome, language)}</td>
                            <td className="border border-slate-300 p-2 text-right text-rose-800">{formatCurrency(grandExpense, language)}</td>
                            <td className={`border border-slate-300 p-2 text-right text-sm ${grandNet >= 0 ? 'text-blue-900' : 'text-rose-800'}`}>{formatCurrency(grandNet, language)}</td>
                          </tr>
                        );
                      })()}
                    </tfoot>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 11: KHAJNA_TAX_REPORT (ভূমি উন্নয়ন কর ও খাজনা রিপোর্ট) */}
              {/* ========================================================================= */}
              {selectedReport === 'KHAJNA_TAX_REPORT' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">সম্পত্তি ও দাগ-খতিয়ান</th>
                        <th className="border border-slate-300 p-2">কর বছর (Tax Year)</th>
                        <th className="border border-slate-300 p-2">দাখিলা নং ও অফিস</th>
                        <th className="border border-slate-300 p-2">পরিশোধের তারিখ</th>
                        <th className="border border-slate-300 p-2 text-right">পরিশোধিত অর্থ</th>
                        <th className="border border-slate-300 p-2 text-center">পরবর্তী প্রদেয় তারিখ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.flatMap((p) => (p.khajnaRecords || [])).map((k, idx) => (
                        <tr key={k.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{k.propertyId}</div>
                            <div className="text-[10px] text-slate-500">{k.holdingNo || 'হোল্ডিং সংরক্ষিত'}</div>
                          </td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">{k.taxYear}</td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div className="font-mono font-bold text-blue-700">{k.receiptNumber}</div>
                            <div className="text-slate-500">{k.paidToOffice}</div>
                          </td>
                          <td className="border border-slate-300 p-2">{formatDate(k.paymentDate, language)}</td>
                          <td className="border border-slate-300 p-2 text-right font-bold text-slate-900">
                            {formatCurrency(k.amount, language)}
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-semibold text-emerald-800">
                            {k.nextDueDate || '৩১ মার্চ ২০২৭'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 12: LEGAL_CASES_REPORT (আইনি মামলা ও বিরোধ স্টেটমেন্ট) */}
              {/* ========================================================================= */}
              {selectedReport === 'LEGAL_CASES_REPORT' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">মামলা নম্বর ও আদালত</th>
                        <th className="border border-slate-300 p-2">সম্পত্তি কোড ও নাম</th>
                        <th className="border border-slate-300 p-2">বাদী ও বিবাদী</th>
                        <th className="border border-slate-300 p-2">আইনজীবী ও যোগাযোগ</th>
                        <th className="border border-slate-300 p-2">মামলার বিষয়বস্তু ও অবস্থা</th>
                        <th className="border border-slate-300 p-2 text-center">পরবর্তী শুনানির তারিখ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.flatMap((p) => (p.legalCases || []).map(c => ({ ...c, propertyRef: p.name || p.propertyCode }))).map((c, idx) => (
                        <tr key={c.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-mono font-bold text-slate-900">{c.caseNumber}</div>
                            <div className="text-[11px] text-blue-700">{c.courtName}</div>
                          </td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-semibold text-slate-800">{c.propertyRef}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div>{c.parties || 'মসজিদ কমিটি বনাম পক্ষগণ'}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div className="font-semibold text-slate-800">{c.lawyerName || '—'}</div>
                            <div className="text-slate-500 font-mono">{c.lawyerContact}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div className="font-bold text-rose-700">{c.status}</div>
                            <div className="text-slate-600">{c.caseSubject || (c as any).disputeDetails}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-center font-bold text-blue-900">
                            {c.nextHearingDate || 'তারিখ ধার্য হয়নি'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 13: DOCUMENT_INDEX (দলিল ও রেকর্ডপত্র আর্কাইভ ইনডেক্স) */}
              {/* ========================================================================= */}
              {selectedReport === 'DOCUMENT_INDEX' && (
                <div className="space-y-4">
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2 text-center w-10">নং</th>
                        <th className="border border-slate-300 p-2">দলিল / নথির শিরোনাম</th>
                        <th className="border border-slate-300 p-2">নথির ধরন</th>
                        <th className="border border-slate-300 p-2">সম্পত্তি কোড ও নাম</th>
                        <th className="border border-slate-300 p-2">জারির তারিখ</th>
                        <th className="border border-slate-300 p-2">বিবরণ ও সংযুক্তি</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.flatMap((p) => (p.documents || [])).map((d, idx) => (
                        <tr key={d.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 text-center font-bold">{idx + 1}</td>
                          <td className="border border-slate-300 p-2 font-bold text-slate-900">{d.title}</td>
                          <td className="border border-slate-300 p-2 font-semibold text-blue-800">{d.documentTypeBn || d.documentType}</td>
                          <td className="border border-slate-300 p-2">{d.propertyId}</td>
                          <td className="border border-slate-300 p-2">{d.issueDate || 'অনির্দিষ্ট'}</td>
                          <td className="border border-slate-300 p-2 text-[11px] text-slate-600">{d.description || d.fileName}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ========================================================================= */}
              {/* REPORT 15 & 16: COMMITTEE_SUMMARY & ANNUAL_FINANCIAL_STATEMENT */}
              {/* ========================================================================= */}
              {(selectedReport === 'COMMITTEE_SUMMARY' || selectedReport === 'ANNUAL_FINANCIAL_STATEMENT' || selectedReport === 'WAQF_CERTIFICATE') && (
                <div className="space-y-6">
                  {/* Executive Summary Cards */}
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 block">মোট তালিকাভুক্ত জমি</span>
                      <strong className="text-slate-900 text-sm">
                        {filteredProperties.reduce((sum, p) => sum + (p.areaAmount || 0), 0)} শতাংশ
                      </strong>
                    </div>
                    <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <span className="text-emerald-700 block font-semibold">মাসিক প্রাক্কলিত আয়</span>
                      <strong className="text-emerald-900 text-sm">
                        {formatCurrency(filteredProperties.reduce((sum, p) => sum + (p.monthlyIncome || p.monthlyRent || 0), 0), language)}
                      </strong>
                    </div>
                    <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200">
                      <span className="text-blue-700 block font-semibold">মোট বাজারমূল্য (আনুমানিক)</span>
                      <strong className="text-blue-900 text-sm">
                        {formatCurrency(filteredProperties.reduce((sum, p) => sum + (p.estimatedValue || 0), 0), language)}
                      </strong>
                    </div>
                  </div>

                  {/* Complete Schedule Overview */}
                  <table className="w-full text-xs text-left border-collapse border border-slate-300">
                    <thead className="bg-slate-800 text-white font-bold">
                      <tr>
                        <th className="border border-slate-300 p-2">সম্পত্তি কোড</th>
                        <th className="border border-slate-300 p-2">ওয়াকিফ ও এস্টেট নাম</th>
                        <th className="border border-slate-300 p-2">জমির তফসিল ও দাগ</th>
                        <th className="border border-slate-300 p-2">দখল ও ব্যবহারের ধরন</th>
                        <th className="border border-slate-300 p-2 text-right">বার্ষিক আয়</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.map((p, idx) => (
                        <tr key={p.id} className={idx % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 p-2 font-mono font-bold text-blue-700">{p.propertyCode}</td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-900">{p.waqifName || 'মরহুম ওয়াকিফ'}</div>
                            <div className="text-[10px] text-slate-500">{p.waqfEstateName || 'ওয়াকফ এস্টেট'} (দলিল: {p.waqfDeedNo || 'সংরক্ষিত'})</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-[11px]">
                            <div>মৌজা: {p.mouza || '-'}, দাগ: {p.bsPlotNo || p.plotNo || '-'}</div>
                            <div>পরিমাণ: <strong className="text-slate-900">{p.area || `${p.areaAmount} শতাংশ`}</strong></div>
                          </td>
                          <td className="border border-slate-300 p-2">
                            <div className="font-bold text-slate-800">{p.possessionStatus}</div>
                            <div className="text-[10px] text-slate-500">{p.currentUse}</div>
                          </td>
                          <td className="border border-slate-300 p-2 text-right font-bold text-emerald-700">
                            {formatCurrency((p.monthlyIncome || p.monthlyRent || 0) * 12, language)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Official Signatures Block - Print Safe */}
              <div className="pt-12 grid grid-cols-3 gap-6 text-center text-xs text-slate-700">
                <div>
                  <div className="border-t border-slate-400 pt-2 font-bold">ওয়াকফ এস্টেট ম্যানেজার / হিসাবরক্ষক</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">প্রতিবেদন প্রস্তুতকারীর স্বাক্ষর</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2 font-bold">ওয়াকফ ও সম্পদ সাব-কমিটি আহ্বায়ক</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">যাচাই ও সুপারিশ</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 pt-2 font-bold">মোতাওয়াল্লি / সাধারণ সম্পাদক</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">চূড়ান্ত অনুমোদন ও এস্টেট সিল</p>
                </div>
              </div>

              {/* System Footer Notice */}
              <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
                MasjidLedger ওয়াকফ সম্পত্তি ও এস্টেট অডিট সিস্টেম কর্তৃক স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত অফিসিয়াল রেকর্ড। (Mosque Waqf Register & Estate Directorate)
              </div>

            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
