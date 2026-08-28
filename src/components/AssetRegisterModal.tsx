import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Printer, Download, Package, ShieldCheck } from 'lucide-react';
import { MosqueAsset, MosqueProfile } from '../types';
import { Language, translations } from '../lib/i18n';
import { ASSET_CATEGORIES, ASSET_CONDITIONS } from './AssetFormModal';

interface AssetRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  assets: MosqueAsset[];
  currentMosque?: MosqueProfile | null;
  language: Language;
}

export const AssetRegisterModal: React.FC<AssetRegisterModalProps> = ({
  isOpen,
  onClose,
  assets,
  currentMosque,
  language
}) => {
  const t = translations[language];

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('print-modal-active');
    } else {
      document.body.classList.remove('print-modal-active');
    }
    return () => {
      document.body.classList.remove('print-modal-active');
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const safeAssets = Array.isArray(assets) ? assets : [];
  const totalPurchase = safeAssets.reduce((sum, a) => sum + (Number(a.purchaseValue) || 0), 0);
  const totalCurrent = safeAssets.reduce(
    (sum, a) => sum + (Number(a.currentValue ?? a.purchaseValue) || 0),
    0
  );

  const handlePrint = () => {
    document.body.classList.add('print-modal-active');
    window.print();
  };

  const modalContent = (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 print-modal-portal">
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print-modal-card">
        {/* Modal Controls Bar (Hidden during print) */}
        <div className="px-6 py-3 bg-slate-900 text-white flex items-center justify-between print:hidden print-controls-bar no-print">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm font-siliguri">মসজিদ সম্পদ রেজিস্ট্রি ও নিরীক্ষা রিপোর্ট (Asset Register)</h3>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center space-x-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF ডাউনলোড</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-xs text-slate-800 font-sans print-modal-paper print:p-0 print:overflow-visible">
          {/* Header */}
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <h1 className="text-xl font-bold text-slate-900 font-siliguri">
              {currentMosque?.nameBn || currentMosque?.name || 'মসজিদুল ফেরদৌস কমপ্লেক্স'}
            </h1>
            <p className="text-xs text-slate-600">
              {currentMosque?.address?.street || 'ধানমন্ডি'}, {currentMosque?.address?.district || 'ঢাকা'}
            </p>
            <div className="inline-block px-3 py-1 bg-slate-100 rounded-full font-bold text-slate-800 text-xs mt-1">
              সম্পদ ও সরঞ্জাম রেজিস্ট্রি বই (Official Asset Register)
            </div>
            <div className="flex justify-between text-[11px] text-slate-500 pt-2">
              <span>প্রিন্টের তারিখ: {new Date().toLocaleDateString('bn-BD')}</span>
              <span>মোট রেকর্ড: {safeAssets.length} টি</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                <tr>
                  <th className="p-2 border-r border-slate-300 text-center w-8">ক্রম</th>
                  <th className="p-2 border-r border-slate-300">আইডি কোড</th>
                  <th className="p-2 border-r border-slate-300">সম্পদের নাম ও স্পেক</th>
                  <th className="p-2 border-r border-slate-300">ক্যাটাগরি</th>
                  <th className="p-2 border-r border-slate-300">ক্রয়ের তারিখ</th>
                  <th className="p-2 border-r border-slate-300 text-right">ক্রয়মূল্য (৳)</th>
                  <th className="p-2 border-r border-slate-300 text-right">বর্তমান মূল্য (৳)</th>
                  <th className="p-2 border-r border-slate-300">অবস্থান</th>
                  <th className="p-2 border-r border-slate-300">অবস্থা</th>
                  <th className="p-2">দায়িত্বপ্রাপ্ত</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {safeAssets.map((ast, idx) => {
                  const catObj = ASSET_CATEGORIES.find((c) => c.key === ast.category);
                  const condObj = ASSET_CONDITIONS.find((c) => c.key === ast.condition);
                  return (
                    <tr key={ast.id} className="hover:bg-slate-50">
                      <td className="p-2 border-r border-slate-200 text-center font-medium">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-800">
                        {ast.assetCode}
                      </td>
                      <td className="p-2 border-r border-slate-200">
                        <strong className="text-slate-900">{ast.name}</strong>
                        {ast.brand && <span className="text-slate-500 block text-[10px]">ব্র্যান্ড: {ast.brand}</span>}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700">
                        {catObj?.labelBn || ast.category}
                      </td>
                      <td className="p-2 border-r border-slate-200 font-mono text-slate-600">
                        {ast.purchaseDate || 'N/A'}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold font-siliguri">
                        ৳{(ast.purchaseValue || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-right font-bold text-blue-700 font-siliguri">
                        ৳{(ast.currentValue ?? ast.purchaseValue ?? 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-2 border-r border-slate-200 text-slate-700">{ast.location || 'মূল ভবন'}</td>
                      <td className="p-2 border-r border-slate-200">
                        <span className="font-semibold text-slate-800">{condObj?.labelBn || ast.condition}</span>
                      </td>
                      <td className="p-2 text-slate-700">{ast.responsiblePerson || 'কর্তৃপক্ষ'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900">
                <tr>
                  <td colSpan={5} className="p-2 text-right border-r border-slate-300">
                    সর্বমোট মূল্যায়ন:
                  </td>
                  <td className="p-2 text-right border-r border-slate-300 font-siliguri">
                    ৳{totalPurchase.toLocaleString('en-IN')}
                  </td>
                  <td className="p-2 text-right border-r border-slate-300 text-blue-800 font-siliguri">
                    ৳{totalCurrent.toLocaleString('en-IN')}
                  </td>
                  <td colSpan={3} className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Signatures Section */}
          <div className="pt-12 grid grid-cols-4 gap-4 text-center text-xs font-semibold text-slate-700 border-t border-slate-200 mt-8">
            <div>
              <div className="border-t border-dashed border-slate-400 pt-1">দায়িত্বপ্রাপ্ত কর্মকর্তা</div>
            </div>
            <div>
              <div className="border-t border-dashed border-slate-400 pt-1">কোষাধ্যক্ষ</div>
            </div>
            <div>
              <div className="border-t border-dashed border-slate-400 pt-1">সাধারণ সম্পাদক</div>
            </div>
            <div>
              <div className="border-t border-dashed border-slate-400 pt-1">সভাপতি / মুতাওয়াল্লী</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
