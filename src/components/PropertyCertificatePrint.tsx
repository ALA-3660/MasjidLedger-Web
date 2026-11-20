import React, { useRef, useState } from 'react';
import {
  Printer,
  X,
  Building,
  MapPin,
  FileText,
  User,
  Shield,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { MosqueProperty, MosqueProfile } from '../types';
import { Language, formatCurrency } from '../lib/i18n';
import { PROPERTY_CATEGORIES, POSSESSION_STATUSES } from './PropertyFormModal';
import { printElement } from '../lib/printUtils';
import { MosqueOfficialLetterhead } from './common/MosqueOfficialLetterhead';
import { OfficialReportSignatures } from './common/OfficialReportSignatures';
import { getGlobalMosque } from '../lib/mosqueStore';

interface PropertyCertificatePrintProps {
  property: MosqueProperty | null;
  mosque: MosqueProfile | null;
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const PropertyCertificatePrint: React.FC<PropertyCertificatePrintProps> = ({
  property,
  mosque: propMosque,
  isOpen,
  onClose,
  language
}) => {
  const [includeLetterhead, setIncludeLetterhead] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  const globalMosque = getGlobalMosque();
  const mosque = (propMosque && (propMosque.nameBn || propMosque.name || propMosque.address || (propMosque as any).secretarySignatureUrl)
    ? { ...globalMosque, ...propMosque }
    : globalMosque || propMosque) as any;

  if (!isOpen || !property) return null;

  const categoryObj = PROPERTY_CATEGORIES.find(c => c.id === property.category);
  const possessionObj = POSSESSION_STATUSES.find(p => p.id === property.possessionStatus);

  const handlePrint = () => {
    printElement('printable-property-certificate', {
      title: `${mosque?.nameBn || mosque?.name || 'মসজিদ'}_ওয়াকফ_সম্পত্তি_সনদ_${property?.propertyCode || ''}`,
      pageSize: 'A4',
      pageOrientation: 'portrait',
      margin: '10mm 12mm',
    });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white print:static">
      {/* Controls Bar - Hidden during print */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold">ওয়াকফ সম্পত্তি রেজিস্টার ও প্রত্যয়ন প্রিন্ট</h3>
              <p className="text-xs text-slate-300">এ৪ সাইজ অফিসিয়াল ফরম্যাট (Mosque Waqf Register Sheet)</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeLetterhead}
                onChange={(e) => setIncludeLetterhead(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
              />
              মসজিদ প্যাড / লেটারহেড যুক্ত রাখুন
            </label>

            <button
              onClick={handlePrint}
              className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Printer className="w-4 h-4" />
              প্রিন্ট করুন / PDF সেভ করুন
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* A4 Printable Sheet */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 print:bg-white print:p-0">
          <div
            id="printable-property-certificate"
            ref={printRef}
            className="w-full max-w-[210mm] mx-auto bg-white p-8 sm:p-10 shadow-lg print:shadow-none print:p-6 border border-slate-200 print:border-none text-slate-900 font-sans printable-content"
            style={{ minHeight: '297mm' }}
          >
            {/* Mosque Header */}
            {includeLetterhead && (
              <MosqueOfficialLetterhead
                mosque={mosque}
                documentTitle="ওয়াকফ সম্পত্তি রেজিস্টার ও ভূমি বিবরণী পত্র"
                subTitle="ওয়াকফ এস্টেট ও ভূমি ব্যবস্থাপনা দপ্তর"
                refNumber={property.propertyCode}
              />
            )}

            {/* Document Title */}
            <div className="text-center mb-6">
              <span className="inline-block px-4 py-1 text-xs font-bold tracking-wider uppercase bg-slate-100 border border-slate-300 rounded-md text-slate-800">
                ওয়াকফ সম্পত্তি রেজিস্টার ও ভূমি বিবরণী পত্র
              </span>
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                সম্পত্তি কোড: {property.propertyCode || 'PROP-MASTER'} | তৈরির তারিখ: {new Date().toLocaleDateString('bn-BD')}
              </p>
            </div>

            {/* General Property Profile */}
            <div className="mb-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300 flex justify-between items-center">
                <span>১. সম্পত্তির সাধারণ পরিচিতি ও অবস্থান</span>
                <span className="font-mono text-[11px]">{property.ownershipType === 'WAQF' ? 'ওয়াকফকৃত' : 'মসজিদের স্বত্ব'}</span>
              </div>
              <div className="grid grid-cols-2 p-3 gap-y-2 gap-x-4">
                <div>
                  <span className="text-slate-500 block text-[11px]">সম্পত্তির নাম:</span>
                  <strong className="text-slate-900">{property.name || property.description}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">ক্যাটাগরি ও শ্রেণি:</span>
                  <strong className="text-slate-900">{categoryObj?.labelBn || property.category} ({property.type})</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">জমির পরিমাণ:</span>
                  <strong className="text-slate-900 font-bold">{property.area || `${property.areaAmount || 0} শতাংশ`}</strong>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">বর্তমান বাজারমূল্য (আনুমানিক):</span>
                  <strong className="text-slate-900">{formatCurrency(property.estimatedValue || 0, language)}</strong>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-500 block text-[11px]">অবস্থান ও ঠিকানা:</span>
                  <span className="text-slate-800 font-medium">{property.fullAddress || property.location || '—'}</span>
                </div>
              </div>
            </div>

            {/* Land Schedule & Plot/Khatian Table */}
            <div className="mb-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300">
                ২. ভূমি তফসিল ও রেকর্ড (দাগ-খতিয়ান বিবরণী)
              </div>
              <div className="p-3 space-y-2">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="text-slate-500 text-[11px] block">মৌজা:</span>
                    <strong>{property.mouza || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">জে.এল. নং:</span>
                    <strong>{property.jlNumber || '—'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">সাব-রেজিস্ট্রি অফিস:</span>
                    <strong>{property.subRegistryOffice || '—'}</strong>
                  </div>
                </div>

                <table className="w-full text-left border-collapse border border-slate-300 mt-2">
                  <thead>
                    <tr className="bg-slate-50 text-[11px] font-bold text-slate-700">
                      <th className="border border-slate-300 p-1.5 text-center">রেকর্ড টাইপ</th>
                      <th className="border border-slate-300 p-1.5 text-center">দাগ নম্বর (Plot No)</th>
                      <th className="border border-slate-300 p-1.5 text-center">খতিয়ান নম্বর (Khatian No)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 p-1.5 font-semibold text-center">সি.এস. (CS)</td>
                      <td className="border border-slate-300 p-1.5 text-center">{property.csPlotNo || '—'}</td>
                      <td className="border border-slate-300 p-1.5 text-center">{property.csKhatianNo || '—'}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1.5 font-semibold text-center">এস.এ. (SA)</td>
                      <td className="border border-slate-300 p-1.5 text-center">{property.saPlotNo || '—'}</td>
                      <td className="border border-slate-300 p-1.5 text-center">{property.saKhatianNo || '—'}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1.5 font-semibold text-center">আর.এস. (RS)</td>
                      <td className="border border-slate-300 p-1.5 text-center">{property.rsPlotNo || '—'}</td>
                      <td className="border border-slate-300 p-1.5 text-center">{property.rsKhatianNo || '—'}</td>
                    </tr>
                    <tr className="bg-slate-50/60 font-bold">
                      <td className="border border-slate-300 p-1.5 text-center text-blue-900">বি.এস. / সিটি (হাল)</td>
                      <td className="border border-slate-300 p-1.5 text-center text-blue-900">{property.bsPlotNo || property.plotNo || '—'}</td>
                      <td className="border border-slate-300 p-1.5 text-center text-blue-900">{property.bsKhatianNo || property.khatianNo || '—'}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 p-1.5 font-semibold text-center text-emerald-800">নামজারি (মিউটেশন)</td>
                      <td className="border border-slate-300 p-1.5 text-center" colSpan={2}>
                        খতিয়ান নং: <strong>{property.mutationKhatianNo || 'নামজারি প্রক্রিয়াধীন / নেই'}</strong>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Boundaries Table */}
            <div className="mb-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300">
                ৩. চতুঃসীমানা বিবরণী
              </div>
              <div className="grid grid-cols-2 p-3 gap-2">
                <div><strong>উত্তরে:</strong> {property.boundaryNorth || 'উল্লেখ নেই'}</div>
                <div><strong>দক্ষিণে:</strong> {property.boundarySouth || 'উল্লেখ নেই'}</div>
                <div><strong>পূর্বে:</strong> {property.boundaryEast || 'উল্লেখ নেই'}</div>
                <div><strong>পশ্চিমে:</strong> {property.boundaryWest || 'উল্লেখ নেই'}</div>
              </div>
            </div>

            {/* Waqif & Deed Details */}
            <div className="mb-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
              <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300">
                ৪. ওয়াকফ দলিল ও ওয়াকিফের পরিচিতি
              </div>
              <div className="p-3 space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  <div><strong>ওয়াকিফের নাম:</strong> {property.waqifName || '—'}</div>
                  <div><strong>পিতা/স্বামী:</strong> {property.waqifFatherName || '—'}</div>
                  <div><strong>ওয়াকফ ইসি / এনরোলমেন্ট:</strong> {property.waqfEnrollmentNo || '—'}</div>
                  <div><strong>ওয়াকফ দলিল নং ও সাল:</strong> {property.waqfDeedNo || '—'} {property.waqfYear ? `(${property.waqfYear})` : ''}</div>
                </div>
                {property.waqfPurpose && (
                  <p className="pt-1 text-slate-700"><strong>ওয়াকফের উদ্দেশ্য:</strong> {property.waqfPurpose}</p>
                )}
                {property.currentUse && (
                  <p className="text-slate-700"><strong>বর্তমান ব্যবহার:</strong> {property.currentUse} ({possessionObj?.labelBn || property.possessionStatus})</p>
                )}
              </div>
            </div>

            {/* Tenants Summary if any */}
            {property.tenants && property.tenants.length > 0 && (
              <div className="mb-5 border border-slate-300 rounded-lg overflow-hidden text-xs">
                <div className="bg-slate-100 px-3 py-1.5 font-bold border-b border-slate-300">
                  ৫. বর্তমান ভাড়াটিয়া ও ইজারা চুক্তি তালিকা
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold text-slate-700 border-b border-slate-300">
                      <th className="p-1.5">দোকান/ইউনিট</th>
                      <th className="p-1.5">ভাড়াটিয়ার নাম</th>
                      <th className="p-1.5">মোবাইল</th>
                      <th className="p-1.5">মেয়াদকাল</th>
                      <th className="p-1.5 text-right">মাসিক ভাড়া</th>
                      <th className="p-1.5 text-right">জামানত</th>
                    </tr>
                  </thead>
                  <tbody>
                    {property.tenants.map(t => (
                      <tr key={t.id} className="border-b border-slate-200 text-[11px]">
                        <td className="p-1.5 font-mono">{t.unitOrShopNo || '—'}</td>
                        <td className="p-1.5 font-semibold">{t.name}</td>
                        <td className="p-1.5 font-mono">{t.mobile}</td>
                        <td className="p-1.5">{t.startDate} - {t.endDate}</td>
                        <td className="p-1.5 text-right font-bold">{formatCurrency(t.monthlyRent, language)}</td>
                        <td className="p-1.5 text-right">{formatCurrency(t.securityDeposit || 0, language)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Official Signatures Box */}
            <OfficialReportSignatures
              currentMosque={mosque}
              preparerTitle="ওয়াকফ ও সম্পত্তি সম্পাদক"
              preparerSubtitle="পরিচালনা পরিষদ"
              secretaryTitle="মোতাওয়াল্লী / সাধারণ সম্পাদক"
              secretarySubtitle="স্বাক্ষর ও সীল"
              presidentTitle="সভাপতি"
              presidentSubtitle="স্বাক্ষর ও সীল"
              showAuditFooter={false}
            />

            {/* Security Footer */}
            <div className="mt-8 pt-2 border-t border-slate-200 text-center text-[10px] text-slate-400 font-mono">
              MasjidLedger Permanent Waqf Master Record • System Verified • Document Hash: {property.id?.substring(0, 10).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
