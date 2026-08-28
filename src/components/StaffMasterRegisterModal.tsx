import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Users, Building, Filter, CheckCircle2, AlertCircle } from 'lucide-react';
import { Staff, Mosque } from '../types';
import { Language, formatDate } from '../lib/i18n';
import { numberToBanglaWords } from '../lib/banglaNumberToWords';

interface StaffMasterRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  currentMosque?: Mosque | null;
  language: Language;
}

export const StaffMasterRegisterModal: React.FC<StaffMasterRegisterModalProps> = ({
  isOpen,
  onClose,
  staffList,
  currentMosque,
  language,
}) => {
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active', 'print-landscape-active');
    } else {
      document.body.classList.remove('print-modal-active', 'print-landscape-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active', 'print-landscape-active');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handlePrint = () => {
    document.body.classList.add('print-modal-active', 'print-landscape-active');
    window.print();
  };

  // Filter staff
  const filteredStaff = staffList.filter((s) => {
    if (statusFilter === 'ACTIVE' && s.status !== 'ACTIVE') return false;
    if (statusFilter === 'INACTIVE' && s.status === 'ACTIVE') return false;

    if (categoryFilter !== 'ALL') {
      if (categoryFilter === 'IMAM_KHATIB' && s.designation !== 'IMAM' && s.designation !== 'KHATIB') return false;
      if (categoryFilter === 'MUEZZIN' && s.designation !== 'MUEZZIN') return false;
      if (categoryFilter === 'TEACHER' && s.designation !== 'TEACHER') return false;
      if (categoryFilter === 'CLEANER' && s.designation !== 'CLEANER' && s.designation !== 'SECURITY') return false;
    }

    return true;
  });

  const totalFilteredCount = filteredStaff.length;
  const activeCount = filteredStaff.filter((s) => s.status === 'ACTIVE').length;
  const inactiveCount = filteredStaff.filter((s) => s.status !== 'ACTIVE').length;
  const totalMonthlyLiability = filteredStaff
    .filter((s) => s.status === 'ACTIVE')
    .reduce((sum, s) => sum + (s.monthlySalary || 0), 0);

  const liabilityInWords = numberToBanglaWords(totalMonthlyLiability);

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 sm:py-6 overflow-y-auto print-modal-portal">
      {/* Landscape A4 Print Stylesheet Injection */}
      <style>{`
        @page {
          size: A4 landscape !important;
          margin: 8mm 10mm !important;
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-6xl w-full shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150 print-modal-card print:max-h-none print:my-0 print:border-none print:shadow-none print:rounded-none">
        {/* Modal Top Toolbar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 py-3 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-sm font-siliguri">ইমাম ও স্টাফ মাস্টার রেজিস্টার প্রিন্ট (Staff Register)</h3>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Status Filter */}
            <div className="flex items-center bg-slate-800 rounded-lg p-0.5 border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold font-siliguri transition-colors cursor-pointer ${
                  statusFilter === 'ALL' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                সকল
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-2.5 py-1 rounded-md font-semibold font-siliguri transition-colors cursor-pointer ${
                  statusFilter === 'ACTIVE' ? 'bg-emerald-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                সক্রিয়
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('INACTIVE')}
                className={`px-2.5 py-1 rounded-md font-semibold font-siliguri transition-colors cursor-pointer ${
                  statusFilter === 'INACTIVE' ? 'bg-rose-600 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                নিষ্ক্রিয়
              </button>
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-semibold font-baloo focus:ring-0 cursor-pointer"
            >
              <option value="ALL">সকল পদবি</option>
              <option value="IMAM_KHATIB">ইমাম ও খতিব</option>
              <option value="MUEZZIN">মুয়াজ্জিন</option>
              <option value="TEACHER">শিক্ষক</option>
              <option value="CLEANER">খাদেম / পরিচ্ছন্নতা</option>
            </select>

            {/* Letterhead Toggle */}
            <label className="flex items-center space-x-1.5 text-xs font-semibold font-siliguri text-slate-200 cursor-pointer bg-slate-800 hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-700 select-none">
              <input
                id="toggle-master-register-letterhead"
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer"
              />
              <span>লেটারহেড অন</span>
            </label>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Master Register Paper (A4 Landscape) */}
        <div id="master-register-printable" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-5 text-slate-900 bg-white font-baloo text-xs print-modal-paper print:p-0 print:overflow-visible print:space-y-4">
          {/* Header Block with Horizontally Centered Mosque Name & Left Logo */}
          {showLetterhead ? (
            <div className="relative pb-4 border-b-2 border-slate-900 text-center">
              {/* Logo Anchored to Left */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center">
                {currentMosque?.logoUrl ? (
                  <img
                    src={currentMosque.logoUrl}
                    alt="Mosque Logo"
                    className="w-14 h-14 object-contain rounded-full border border-slate-200 p-0.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Building className="w-6 h-6" />
                  </div>
                )}
              </div>

              {/* Centered Mosque Information (100% horizontally centered on the page) */}
              <div className="w-full text-center px-16 sm:px-20 space-y-1">
                <h1 className="text-xl sm:text-2xl font-black font-siliguri text-slate-950 tracking-tight leading-tight">
                  {currentMosque?.nameBn || currentMosque?.name || 'মসজিদ ও ইসলামিক সেন্টার'}
                </h1>
                <p className="text-xs text-slate-600 font-baloo font-medium">
                  {currentMosque?.address || 'ঠিকানা: মসজিদ কমপ্লেক্স'}
                  {currentMosque?.phone ? ` | মোবাইল: ${currentMosque.phone}` : ''}
                  {currentMosque?.registrationNumber ? ` | রেজিঃ নং: ${currentMosque.registrationNumber}` : ''}
                </p>
                <div className="pt-1">
                  <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-md tracking-wider font-siliguri">
                    ইমাম ও স্টাফ মাস্টার রেজিস্টার (STAFF MASTER REGISTER)
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="pt-12 pb-3 text-center border-b border-dashed border-slate-300">
              <div className="inline-block bg-slate-900 text-white text-xs font-bold px-5 py-1 rounded-md tracking-wider font-siliguri">
                ইমাম ও স্টাফ মাস্টার রেজিস্টার (STAFF MASTER REGISTER)
              </div>
            </div>
          )}

          {/* Meta Info Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center space-x-4">
              <div>
                <span className="text-slate-500 font-baloo">প্রিন্ট তারিখ: </span>
                <strong className="text-slate-900 font-siliguri">{formatDate(new Date().toISOString(), language)}</strong>
              </div>
              <div>
                <span className="text-slate-500 font-baloo">ফিল্টার: </span>
                <span className="font-semibold text-slate-800 font-siliguri">
                  {statusFilter === 'ACTIVE' ? 'সক্রিয় জনবল' : statusFilter === 'INACTIVE' ? 'নিষ্ক্রিয়/সাবেক' : 'সকল জনবল'}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-right">
              <span className="text-slate-600 font-baloo">
                মোট তালিকাভুক্ত: <strong className="font-siliguri">{totalFilteredCount}</strong> জন (সক্রিয়: {activeCount}, সাবেক: {inactiveCount})
              </span>
            </div>
          </div>

          {/* Master Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300 font-siliguri">
                <tr>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center w-10">ক্র.নং</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">স্টাফের নাম ও পরিচয়</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">পদবি</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">মোবাইল নম্বর</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">জাতীয় পরিচয়পত্র (NID)</th>
                  <th className="py-2.5 px-3 border-r border-slate-300">যোগদানের তারিখ</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-right">মাসিক হাদিয়া</th>
                  <th className="py-2.5 px-3 border-r border-slate-300 text-center">স্ট্যাটাস</th>
                  <th className="py-2.5 px-3 text-center">মন্তব্য / স্বাক্ষর</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-baloo">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500 font-medium">
                      কোনো স্টাফ রেকর্ড পাওয়া যায়নি।
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((stf, idx) => {
                    const isActive = stf.status === 'ACTIVE';
                    return (
                      <tr key={stf.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center font-mono font-bold text-slate-700">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-semibold text-slate-950 font-siliguri">
                          <div>{stf.name}</div>
                          {stf.address && <div className="text-[10px] text-slate-500 font-normal font-baloo">{stf.address}</div>}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-medium text-slate-800">
                          {stf.designationBn}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-800">
                          {stf.phone}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 font-mono text-slate-700">
                          {stf.nid || '—'}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                          {formatDate(stf.joiningDate, language)}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-right font-mono font-bold text-slate-900">
                          ৳ {stf.monthlySalary?.toLocaleString('en-IN')}
                        </td>
                        <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                          <span
                            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full font-siliguri ${
                              isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center text-[10px] text-slate-400">
                          {stf.notes || ''}
                        </td>
                      </tr>
                    );
                  })
                )}

                {/* Footer Total Summary Row */}
                {filteredStaff.length > 0 && (
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-300 text-slate-950">
                    <td colSpan={6} className="py-3 px-3 text-right font-siliguri">
                      সক্রিয় স্টাফদের সর্বমোট মাসিক বাজেট ও দায়:
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-black text-emerald-900 text-sm">
                      ৳ {totalMonthlyLiability.toLocaleString('en-IN')}
                    </td>
                    <td colSpan={2} className="py-3 px-3 text-center text-slate-600 text-[11px] font-siliguri">
                      {activeCount} জন সক্রিয় স্টাফ
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Liability in Bangla Words */}
          {totalMonthlyLiability > 0 && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs flex items-center space-x-2">
              <span className="font-bold whitespace-nowrap font-siliguri">মাসিক পে-রোল কথায়:</span>
              <span className="font-siliguri font-semibold text-emerald-900">{liabilityInWords}</span>
            </div>
          )}

          {/* Signatures Section */}
          <div className="pt-8 grid grid-cols-3 gap-6 text-center text-slate-800 text-xs">
            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center"></div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                প্রস্তুতকারী / হিসাবরক্ষক
              </div>
              <div className="text-[11px] text-slate-600 font-baloo">মসজিদ কার্যালয়</div>
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center"></div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                কোষাধ্যক্ষ
              </div>
              <div className="text-[11px] text-slate-600 font-baloo">মসজিদ পরিচালনা কমিটি</div>
            </div>

            <div className="flex flex-col justify-end space-y-1">
              <div className="h-10 flex items-end justify-center">
                {currentMosque?.presidentSignatureUrl ? (
                  <img
                    src={currentMosque.presidentSignatureUrl}
                    alt="President Signature"
                    className="max-h-10 object-contain mx-auto"
                  />
                ) : currentMosque?.secretarySignatureUrl ? (
                  <img
                    src={currentMosque.secretarySignatureUrl}
                    alt="Secretary Signature"
                    className="max-h-10 object-contain mx-auto"
                  />
                ) : null}
              </div>
              <div className="border-t border-slate-400 pt-1 font-bold font-siliguri text-slate-900">
                সাধারণ সম্পাদক / সভাপতি
              </div>
              <div className="text-[11px] text-slate-600 font-baloo">মসজিদ পরিচালনা কমিটি</div>
            </div>
          </div>

          {/* Footer Watermark */}
          <div className="text-center text-[10px] text-slate-400 pt-4 border-t border-slate-100 flex items-center justify-between font-baloo">
            <span>MasjidLedger ডিজিটাল মসজিদ ব্যবস্থাপনা সিস্টেম</span>
            <span>প্রিন্ট সময়: {new Date().toLocaleString('bn-BD')}</span>
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0 print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-2 text-xs">
            <span className="text-slate-400 font-baloo">মোট স্টাফ:</span>
            <span className="font-bold text-white font-siliguri">{totalFilteredCount} জন</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 font-baloo">সক্রিয় মাসিক বাজেট:</span>
            <span className="font-mono font-bold text-emerald-400">৳{totalMonthlyLiability.toLocaleString('en-IN')}</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold font-siliguri transition-colors cursor-pointer"
            >
              বাতিল / বন্ধ করুন
            </button>
            <button
              type="button"
              id="btn-print-master-register"
              onClick={handlePrint}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold font-siliguri rounded-xl text-xs flex items-center space-x-2 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট করুন (A4 Landscape)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
