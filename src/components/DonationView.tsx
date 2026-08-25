import React, { useState } from 'react';
import {
  HeartHandshake,
  Box,
  Plus,
  Search,
  Printer,
  QrCode,
  CheckCircle2,
  Users,
  Eye,
  DollarSign,
  AlertCircle,
  Calculator,
  MessageSquare,
  Calendar,
  Building2,
  Store,
  Phone,
  MapPin,
  Tag,
  Edit2,
  ShieldCheck,
  Smartphone,
  RotateCcw,
} from 'lucide-react';
import {
  Donation,
  DonationBox,
  DonationBoxCollection,
  FinancialAccount,
  PaymentMethod,
  Mosque,
} from '../types';
import { Language, translations, formatCurrency, formatDate } from '../lib/i18n';
import { ChangeCalculatorModal } from './ChangeCalculatorModal';
import { QRViewer, Barcode128 } from './BarcodeQRService';
import { SmsPreviewModal } from './SmsPreviewModal';
import { EditDonationBoxModal } from './EditModals';

interface DonationViewProps {
  donations: Donation[];
  donationBoxes: DonationBox[];
  boxCollections: DonationBoxCollection[];
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  language?: Language;
  onAddDonation: (data: any) => Promise<Donation>;
  onCollectBox: (data: any) => Promise<void>;
  onAddDonationBox?: (data: any) => Promise<void>;
  onUpdateDonationBox?: (id: string, data: any) => Promise<void>;
  onPrintReceipt: (donation: Donation) => void;
  onSendSms?: (phone: string, message: string, tokenUrl?: string) => Promise<any>;
}

export const DonationView: React.FC<DonationViewProps> = ({
  donations,
  donationBoxes,
  boxCollections,
  accounts,
  currentMosque,
  language = 'bn',
  onAddDonation,
  onCollectBox,
  onAddDonationBox,
  onUpdateDonationBox,
  onPrintReceipt,
  onSendSms,
}) => {
  const t = translations[language] || translations.bn;
  const [activeSubTab, setActiveSubTab] = useState<'donations' | 'boxes' | 'juma'>('donations');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals & Helpers
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [calculatorTarget, setCalculatorTarget] = useState<'DONATION' | 'BOX' | 'JUMA'>('DONATION');
  const [smsTarget, setSmsTarget] = useState<Donation | null>(null);
  const [qrTargetBox, setQrTargetBox] = useState<DonationBox | null>(null);
  const [editingBox, setEditingBox] = useState<DonationBox | null>(null);

  // New Donation Box Master Data Modal
  const [isAddBoxModalOpen, setIsAddBoxModalOpen] = useState(false);
  const [newBoxCode, setNewBoxCode] = useState('');
  const [newBoxLocation, setNewBoxLocation] = useState('');
  const [newShopName, setNewShopName] = useState('');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newWard, setNewWard] = useState('');
  const [newResponsiblePerson, setNewResponsiblePerson] = useState('');

  // Donation Modal
  const [isDonationModalOpen, setIsDonationModalOpen] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorPhone, setDonorPhone] = useState('');
  const [donorAddress, setDonorAddress] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [category, setCategory] = useState<Donation['category']>('GENERAL');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [reference, setReference] = useState('');
  const [donationDate, setDonationDate] = useState(new Date().toISOString().split('T')[0]);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Box Collection Modal
  const [isBoxModalOpen, setIsBoxModalOpen] = useState(false);
  const [selectedBoxId, setSelectedBoxId] = useState(donationBoxes[0]?.id || '');
  const [boxAmount, setBoxAmount] = useState('');
  const [countingTeam, setCountingTeam] = useState('');
  const [witnesses, setWitnesses] = useState('');
  const [boxDepositAccountId, setBoxDepositAccountId] = useState(accounts[0]?.id || '');
  const [boxCollectionDate, setBoxCollectionDate] = useState(new Date().toISOString().split('T')[0]);
  const [boxNotes, setBoxNotes] = useState('');

  // Juma Collection Modal
  const [isJumaModalOpen, setIsJumaModalOpen] = useState(false);
  const [jumaAmount, setJumaAmount] = useState('');
  const [jumaDate, setJumaDate] = useState(new Date().toISOString().split('T')[0]);
  const [jumaTeam, setJumaTeam] = useState('');
  const [jumaWitness, setJumaWitness] = useState('');
  const [jumaAccount, setJumaAccount] = useState(accounts[0]?.id || '');
  const [jumaNotes, setJumaNotes] = useState('পবিত্র জুমার সাধারণ কালেকশন');

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    const num = Number(amount);
    if (!num || num <= 0) {
      setErrorMessage(t.amountMustBePositive);
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await onAddDonation({
        donorName: isAnonymous ? 'আল্লাহর এক বান্দা (Anonymous)' : donorName,
        donorPhone,
        donorAddress,
        isAnonymous,
        category,
        amount: num,
        paymentMethod,
        accountId: accountId || accounts[0]?.id,
        reference,
        date: donationDate,
      });
      setIsDonationModalOpen(false);
      if (created) onPrintReceipt(created);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving donation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBoxSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(boxAmount);
    if (!num || num <= 0) {
      alert(t.amountMustBePositive);
      return;
    }

    try {
      await onCollectBox({
        boxId: selectedBoxId || donationBoxes[0]?.id,
        amount: num,
        countingTeam: countingTeam.split(',').map((s) => s.trim()).filter(Boolean),
        witnesses: witnesses.split(',').map((s) => s.trim()).filter(Boolean),
        depositAccountId: boxDepositAccountId || accounts[0]?.id,
        collectionDate: boxCollectionDate,
        notes: boxNotes,
      });
      setIsBoxModalOpen(false);
      setBoxAmount('');
      setCountingTeam('');
      setWitnesses('');
      setBoxNotes('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleJumaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(jumaAmount);
    if (!num || num <= 0) {
      alert(t.amountMustBePositive);
      return;
    }

    try {
      await onAddDonation({
        donorName: 'পবিত্র জুমার জামাত ও মুসল্লিগণ',
        donorPhone: '',
        isAnonymous: true,
        category: 'GENERAL',
        amount: num,
        paymentMethod: 'CASH',
        accountId: jumaAccount || accounts[0]?.id,
        reference: `জুমার কালেকশন - ${jumaDate}`,
        date: jumaDate,
        description: `${jumaNotes}. গণনা টিম: ${jumaTeam}. সাক্ষী: ${jumaWitness}`,
      });
      setIsJumaModalOpen(false);
      setJumaAmount('');
      setJumaTeam('');
      setJumaWitness('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddBoxMaster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBoxCode || !newBoxLocation) return;
    if (onAddDonationBox) {
      await onAddDonationBox({
        boxCode: newBoxCode,
        location: newBoxLocation,
        shopName: newShopName,
        ownerName: newOwnerName,
        ownerPhone: newOwnerPhone,
        address: newAddress,
        ward: newWard,
        responsiblePerson: newResponsiblePerson,
        status: 'ACTIVE',
      });
      setIsAddBoxModalOpen(false);
      setNewBoxCode('');
      setNewBoxLocation('');
      setNewShopName('');
      setNewOwnerName('');
      setNewOwnerPhone('');
      setNewAddress('');
      setNewWard('');
      setNewResponsiblePerson('');
    }
  };

  const handleApplyCalculatedTotal = (calculatedTotal: number) => {
    if (calculatorTarget === 'DONATION') {
      setAmount(calculatedTotal.toString());
    } else if (calculatorTarget === 'BOX') {
      setBoxAmount(calculatedTotal.toString());
    } else if (calculatorTarget === 'JUMA') {
      setJumaAmount(calculatedTotal.toString());
    }
  };

  const filteredDonations = donations.filter((d) => {
    return (
      d.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.donorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.donorPhone && d.donorPhone.includes(searchQuery))
    );
  });

  const jumaDonations = donations.filter(
    (d) =>
      d.donorName.includes('জুমা') ||
      (d.reference && d.reference.includes('জুমা')) ||
      (d.description && d.description.includes('জুমা'))
  );

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('donations')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'donations'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <HeartHandshake className="w-4 h-4" />
            <span>সাধারণ ও প্রকল্প অনুদান</span>
            <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {donations.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('boxes')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'boxes'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Box className="w-4 h-4" />
            <span>দানবাক্স ব্যবস্থাপনা ও কালেকশন</span>
            <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {donationBoxes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('juma')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all shrink-0 ${
              activeSubTab === 'juma'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>জুমার দিনের কালেকশন</span>
            <span className="ml-1 bg-white/20 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {jumaDonations.length}
            </span>
          </button>
        </div>

        {/* Dynamic Action Buttons */}
        <div className="flex items-center space-x-2">
          {activeSubTab === 'donations' && (
            <button
              onClick={() => {
                setDonorName('');
                setDonorPhone('');
                setDonorAddress('');
                setIsAnonymous(false);
                setCategory('GENERAL');
                setAmount('');
                setReference('');
                setErrorMessage('');
                setIsDonationModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন অনুদান গ্রহণ</span>
            </button>
          )}

          {activeSubTab === 'boxes' && (
            <>
              {onAddDonationBox && (
                <button
                  onClick={() => setIsAddBoxModalOpen(true)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>নতুন দানবাক্স তৈরি</span>
                </button>
              )}
              <button
                onClick={() => setIsBoxModalOpen(true)}
                className="bg-teal-700 hover:bg-teal-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>দানবাক্স কালেকশন এন্ট্রি</span>
              </button>
            </>
          )}

          {activeSubTab === 'juma' && (
            <button
              onClick={() => setIsJumaModalOpen(true)}
              className="bg-emerald-700 hover:bg-emerald-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>জুমার কালেকশন এন্ট্রি</span>
            </button>
          )}
        </div>
      </div>

      {/* ---------------- 1. DONATIONS TAB ---------------- */}
      {activeSubTab === 'donations' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="রসিদ নং, দাতার নাম বা মোবাইল নম্বর..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="text-xs text-slate-600 font-mono">
              মোট অনুদান সংগৃহীত:{' '}
              <strong className="text-blue-700 text-sm font-bold">
                ৳ {donations.reduce((s, d) => s + d.amount, 0).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">রসিদ নম্বর</th>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4">দানকারীর নাম ও ঠিকানা</th>
                    <th className="py-3 px-4">দানের খাত</th>
                    <th className="py-3 px-4">জমার মাধ্যম / হিসাব</th>
                    <th className="py-3 px-4 text-right">টাকা (৳)</th>
                    <th className="py-3 px-4 text-center">ডিজিটাল ও প্রিন্ট</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDonations.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        কোনো অনুদান রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredDonations.map((don) => (
                      <tr key={don.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-700 text-xs">
                          {don.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-600">{formatDate(don.date)}</td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">
                            {don.isAnonymous ? 'আল্লাহর এক বান্দা (Anonymous)' : don.donorName}
                          </div>
                          {don.donorPhone && (
                            <div className="text-[11px] font-mono text-slate-500">{don.donorPhone}</div>
                          )}
                          {don.donorAddress && (
                            <div className="text-[10px] text-slate-400 truncate max-w-xs">
                              {don.donorAddress}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-blue-50 text-blue-800 px-2 py-0.5 rounded-full text-[10px] font-bold border border-blue-200">
                            {don.category}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="text-slate-800 font-medium">{don.accountName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{don.paymentMethod}</div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          + ৳ {don.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => onPrintReceipt(don)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                              title="মানি রসিদ প্রিন্ট করুন"
                            >
                              <Printer className="w-3.5 h-3.5 text-slate-600" />
                              <span className="text-[11px]">রসিদ</span>
                            </button>

                            {onSendSms && don.donorPhone && (
                              <button
                                onClick={() => setSmsTarget(don)}
                                className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
                                title="দাতার মোবাইলে রসিদ এসএমএস পাঠান"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                                <span className="text-[11px]">SMS</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 2. DONATION BOXES TAB ---------------- */}
      {activeSubTab === 'boxes' && (
        <div className="space-y-6">
          {/* Master Boxes Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {donationBoxes.map((box) => (
              <div
                key={box.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3 hover:border-teal-300 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-teal-800 bg-teal-50 px-2.5 py-0.5 rounded-lg border border-teal-200">
                      {box.boxCode}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        box.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {box.status}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mt-2 flex items-center space-x-1.5">
                    <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>{box.location}</span>
                  </h3>

                  {box.shopName && (
                    <p className="text-xs text-slate-600 flex items-center space-x-1.5 mt-1">
                      <Store className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{box.shopName}</span>
                    </p>
                  )}

                  {box.ownerName && (
                    <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                      <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        মালিক: {box.ownerName} {box.ownerPhone ? `(${box.ownerPhone})` : ''}
                      </span>
                    </p>
                  )}

                  {box.address && (
                    <p className="text-[11px] text-slate-400 mt-1 truncate">ঠিকানা: {box.address}</p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">মোট কালেকশন</span>
                    <span className="text-base font-black text-teal-700 font-mono">
                      ৳ {box.totalCollected.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => setQrTargetBox(box)}
                      title="দানবাক্স QR কোড স্টিকার ভিউ ও প্রিন্ট"
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors"
                    >
                      <QrCode className="w-4 h-4 text-slate-700" />
                    </button>
                    <button
                      onClick={() => setEditingBox(box)}
                      title="দানবাক্স তথ্য সংশোধন"
                      className="p-2 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-xl transition-colors"
                    >
                      <Edit2 className="w-4 h-4 text-teal-700" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Collection History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">
                দানবাক্স গণনা ও জমাকৃত কালেকশন রেজিস্টার ({boxCollections.length} টি রেকর্ড)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100/80 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">দানবাক্স কোড</th>
                    <th className="py-3 px-4">গণনার তারিখ</th>
                    <th className="py-3 px-4">গণনা টিম (উপস্থিতি)</th>
                    <th className="py-3 px-4">সাক্ষীগণ</th>
                    <th className="py-3 px-4">জমার ফান্ড/অ্যাকাউন্ট</th>
                    <th className="py-3 px-4 text-right">আদায়কৃত টাকা</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {boxCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        কোনো কালেকশন এন্ট্রি নেই।
                      </td>
                    </tr>
                  ) : (
                    boxCollections.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-4 font-mono font-bold text-teal-800">{col.boxCode}</td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatDate(col.collectionDate)}
                        </td>
                        <td className="py-3 px-4 text-slate-800">{col.countingTeam.join(', ')}</td>
                        <td className="py-3 px-4 text-slate-600">{col.witnesses.join(', ')}</td>
                        <td className="py-3 px-4 text-slate-700 font-medium">{col.depositAccountName}</td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          ৳ {col.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- 3. JUMA COLLECTIONS TAB ---------------- */}
      {activeSubTab === 'juma' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                পবিত্র জুমার জামাত কালেকশন রেজিস্টার
              </h3>
              <p className="text-xs text-slate-500">
                প্রতি শুক্রবার জুমার নামাজে মুসল্লিদের দানকৃত টাকার হিসাব ও জামাতের বিবরণ
              </p>
            </div>
            <div className="text-xs font-mono text-slate-600">
              জুমার সর্বমোট আদায়:{' '}
              <strong className="text-emerald-700 text-sm font-bold">
                ৳ {jumaDonations.reduce((s, d) => s + d.amount, 0).toLocaleString('en-IN')}
              </strong>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-emerald-900 text-white font-bold border-b border-emerald-950">
                  <tr>
                    <th className="py-3 px-4">তারিখ</th>
                    <th className="py-3 px-4">রসিদ / রেফারেন্স</th>
                    <th className="py-3 px-4">বিবরণ ও গণনা টিম</th>
                    <th className="py-3 px-4">জমাকৃত অ্যাকাউন্ট</th>
                    <th className="py-3 px-4 text-right">আদায়কৃত টাকা (৳)</th>
                    <th className="py-3 px-4 text-center">মানি রসিদ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jumaDonations.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        কোনো জুমার কালেকশন এন্ট্রি নেই।
                      </td>
                    </tr>
                  ) : (
                    jumaDonations.map((jd) => (
                      <tr key={jd.id} className="hover:bg-slate-50">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          {formatDate(jd.date)}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-emerald-800 font-bold">
                          {jd.receiptNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-900">{jd.donorName}</div>
                          <div className="text-[11px] text-slate-500">{jd.description || jd.reference}</div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700 font-medium">{jd.accountName}</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                          ৳ {jd.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => onPrintReceipt(jd)}
                            className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                          >
                            রসিদ প্রিন্ট
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- NEW DONATION MODAL ---------------- */}
      {isDonationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-150 flex flex-col max-h-[92vh]">
            <div className="p-4 sm:p-5 bg-blue-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <HeartHandshake className="w-5 h-5" />
                <h3 className="font-bold text-base">নতুন অনুদান গ্রহণ ও মানি রসিদ</h3>
              </div>
              <button
                onClick={() => setIsDonationModalOpen(false)}
                className="text-white/80 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDonationSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Anonymous Toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs">
                  <span className="font-semibold text-slate-900">গোপন/বেনামী দান (Anonymous Donor)</span>
                  <p className="text-[11px] text-slate-500">নাম প্রকাশে অনিচ্ছুক হলে এটি টিক দিন</p>
                </div>
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">দাতার পূর্ণ নাম *</label>
                    <input
                      type="text"
                      placeholder="e.g. আলহাজ্ব মোঃ কায়েস"
                      value={donorName}
                      onChange={(e) => setDonorName(e.target.value)}
                      required={!isAnonymous}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">মোবাইল নম্বর</label>
                    <input
                      type="tel"
                      placeholder="017XXXXXXXX"
                      value={donorPhone}
                      onChange={(e) => setDonorPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Amount with Calculator Trigger */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">টাকার পরিমাণ (৳) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTarget('DONATION');
                      setIsCalculatorOpen(true);
                    }}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-bold flex items-center space-x-1"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>ভাংতি ও নোট হিসাব ক্যালকুলেটর</span>
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>

              {/* Category & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">দানের খাত *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="GENERAL">সাধারণ দান (General)</option>
                    <option value="CONSTRUCTION">মসজিদ নির্মাণ ও সংস্কার তহবিল</option>
                    <option value="WAQF">ওয়াকফ দান (Waqf)</option>
                    <option value="CEMETERY">কবরস্থান উন্নয়ন</option>
                    <option value="WUDU_KHANA">অজু খানা ও ওয়াশ ব্লক</option>
                    <option value="MADRASA">মক্তব ও কোরআন শিক্ষা</option>
                    <option value="SPECIAL_PROJECT">বিশেষ প্রকল্প</option>
                    <option value="OTHER">অন্যান্য শুভ অনুদান</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">তারিখ *</label>
                  <input
                    type="date"
                    value={donationDate}
                    onChange={(e) => setDonationDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              {/* Payment Method & Deposit Account */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">পেমেন্ট মাধ্যম</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    <option value="CASH">ক্যাশ / নগদ</option>
                    <option value="BANK">ব্যাংক ডিপোজিট / চেক</option>
                    <option value="BKASH">বিকাশ (bKash)</option>
                    <option value="NAGAD">নগদ (Nagad)</option>
                    <option value="ROCKET">রকেট (Rocket)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">জমার হিসাব</label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.nameBn}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">রেফারেন্স / স্লিপ / TRX</label>
                <input
                  type="text"
                  placeholder="e.g. TRX-987654 / চেক নং"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDonationModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-all"
                >
                  {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'দান গ্রহণ ও রসিদ তৈরি'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- BOX COLLECTION MODAL ---------------- */}
      {isBoxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150 flex flex-col max-h-[92vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-teal-700">
              <Box className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">দানবাক্স কালেকশন ও টাকা জমা</h3>
            </div>

            <form onSubmit={handleBoxSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">দানবাক্স নির্বাচন *</label>
                <select
                  value={selectedBoxId}
                  onChange={(e) => setSelectedBoxId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                >
                  {donationBoxes.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.boxCode} - {b.location} {b.shopName ? `(${b.shopName})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">গণনাকৃত মোট টাকা *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTarget('BOX');
                      setIsCalculatorOpen(true);
                    }}
                    className="text-[11px] text-teal-700 hover:text-teal-800 font-bold flex items-center space-x-1"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>নোট গণনা ক্যালকুলেটর</span>
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 15000"
                  value={boxAmount}
                  onChange={(e) => setBoxAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গণনা টিমের নামসমূহ</label>
                <input
                  type="text"
                  placeholder="e.g. রফিকুল ইসলাম, আব্দুল কাদির"
                  value={countingTeam}
                  onChange={(e) => setCountingTeam(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">উপস্থিত সাক্ষীগণের নাম</label>
                <input
                  type="text"
                  placeholder="e.g. আলহাজ্ব কামাল উদ্দিন, মোঃ শামসুল হুদা"
                  value={witnesses}
                  onChange={(e) => setWitnesses(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার হিসাব</label>
                <select
                  value={boxDepositAccountId}
                  onChange={(e) => setBoxDepositAccountId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBoxModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs"
                >
                  জমা নিশ্চিত করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- JUMA COLLECTION MODAL ---------------- */}
      {isJumaModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150 flex flex-col max-h-[92vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-emerald-700">
              <Calendar className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">জুমার দিনের কালেকশন এন্ট্রি</h3>
            </div>

            <form onSubmit={handleJumaSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জুমার তারিখ *</label>
                <input
                  type="date"
                  value={jumaDate}
                  onChange={(e) => setJumaDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700">সর্বমোট আদায়কৃত টাকা (৳) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCalculatorTarget('JUMA');
                      setIsCalculatorOpen(true);
                    }}
                    className="text-[11px] text-emerald-700 hover:text-emerald-800 font-bold flex items-center space-x-1"
                  >
                    <Calculator className="w-3.5 h-3.5" />
                    <span>ভাংতি ও নোট ক্যালকুলেটর</span>
                  </button>
                </div>
                <input
                  type="number"
                  placeholder="e.g. 25000"
                  value={jumaAmount}
                  onChange={(e) => setJumaAmount(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">গণনা টিমের সদস্যগণ</label>
                <input
                  type="text"
                  placeholder="e.g. ইমাম সাহেব, মুয়াজ্জিন, কোষাধ্যক্ষ"
                  value={jumaTeam}
                  onChange={(e) => setJumaTeam(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">উপস্থিত মুসল্লি / সাক্ষী</label>
                <input
                  type="text"
                  placeholder="e.g. আলহাজ্ব কবির হোসেন"
                  value={jumaWitness}
                  onChange={(e) => setJumaWitness(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">জমার হিসাব</label>
                <select
                  value={jumaAccount}
                  onChange={(e) => setJumaAccount(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:bg-white font-medium outline-hidden"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nameBn}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsJumaModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-xs"
                >
                  জুমার কালেকশন পোস্ট করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- ADD NEW BOX MASTER MODAL ---------------- */}
      {isAddBoxModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 p-5 space-y-4 animate-in fade-in duration-150 flex flex-col max-h-[92vh] overflow-y-auto">
            <div className="flex items-center space-x-2 text-teal-700">
              <Box className="w-5 h-5" />
              <h3 className="font-bold text-base text-slate-900">নতুন দানবাক্স মাস্টার তথ্য যুক্ত করুন</h3>
            </div>

            <form onSubmit={handleAddBoxMaster} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">দানবাক্স কোড *</label>
                  <input
                    type="text"
                    placeholder="e.g. BOX-003"
                    value={newBoxCode}
                    onChange={(e) => setNewBoxCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">স্থাপন স্থান *</label>
                  <input
                    type="text"
                    placeholder="e.g. মেইন গেইট / বাজার"
                    value={newBoxLocation}
                    onChange={(e) => setNewBoxLocation(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">দোকানের নাম (যদি থাকে)</label>
                  <input
                    type="text"
                    placeholder="e.g. বিসমিল্লাহ স্টোর"
                    value={newShopName}
                    onChange={(e) => setNewShopName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মালিকের নাম</label>
                  <input
                    type="text"
                    placeholder="e.g. মোঃ রফিক"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">মালিকের মোবাইল</label>
                  <input
                    type="tel"
                    placeholder="01XXXXXXXXX"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">ওয়ার্ড / ব্লক</label>
                  <input
                    type="text"
                    placeholder="e.g. ওয়ার্ড-০৭"
                    value={newWard}
                    onChange={(e) => setNewWard(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">দায়িত্বপ্রাপ্ত প্রতিনিধি</label>
                <input
                  type="text"
                  placeholder="e.g. কালেকশন কমিটির সদস্য"
                  value={newResponsiblePerson}
                  onChange={(e) => setNewResponsiblePerson(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-hidden"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBoxModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-xl shadow-xs"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- DENOMINATION CALCULATOR MODAL ---------------- */}
      <ChangeCalculatorModal
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
        onApplyTotal={handleApplyCalculatedTotal}
        language={language}
      />

      {/* ---------------- SMS PREVIEW MODAL ---------------- */}
      {smsTarget && onSendSms && (
        <SmsPreviewModal
          isOpen={!!smsTarget}
          onClose={() => setSmsTarget(null)}
          recipientPhone={smsTarget.donorPhone || ''}
          donorOrPayeeName={smsTarget.donorName}
          amount={smsTarget.amount}
          voucherNumber={smsTarget.receiptNumber}
          documentType="DONATION_RECEIPT"
          documentId={smsTarget.id}
          mosque={currentMosque}
          language={language}
          onSendSms={onSendSms}
        />
      )}

      {/* ---------------- QR CODE STICKER MODAL ---------------- */}
      {qrTargetBox && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-bold text-sm text-slate-900">দানবাক্স QR কোড স্টিকার</h3>
              <button
                onClick={() => setQrTargetBox(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <QRViewer
              value={`${window.location.origin}/donate?box=${qrTargetBox.boxCode}`}
              boxCode={qrTargetBox.boxCode}
              title={qrTargetBox.location}
              subtitle={qrTargetBox.shopName || 'স্থায়ী কালেকশন বক্স'}
              mosque={currentMosque}
            />
          </div>
        </div>
      )}

      {/* ---------------- EDIT DONATION BOX MASTER DATA MODAL ---------------- */}
      {editingBox && onUpdateDonationBox && (
        <EditDonationBoxModal
          isOpen={!!editingBox}
          onClose={() => setEditingBox(null)}
          box={editingBox}
          language={language}
          onSave={onUpdateDonationBox}
        />
      )}
    </div>
  );
};
