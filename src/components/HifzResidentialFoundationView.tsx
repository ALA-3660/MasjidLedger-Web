import React, { useState, useEffect } from 'react';
import {
  Building2,
  Home,
  DoorOpen,
  BedDouble,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Edit2,
  CheckCircle2,
  XCircle,
  Archive,
  Layers,
  ChevronRight,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { api } from '../lib/api';
import {
  Mosque,
  HifzResidence,
  HifzResidenceBuilding,
  HifzResidenceRoom,
  HifzResidenceBed,
  HifzResidentialStatus,
} from '../types';

interface HifzResidentialFoundationViewProps {
  currentMosque: Mosque;
}

type ActiveSection = 'residences' | 'buildings' | 'rooms' | 'beds';

export const HifzResidentialFoundationView: React.FC<HifzResidentialFoundationViewProps> = ({ currentMosque }) => {
  const [activeSection, setActiveSection] = useState<ActiveSection>('residences');

  // Data states
  const [residences, setResidences] = useState<HifzResidence[]>([]);
  const [buildings, setBuildings] = useState<HifzResidenceBuilding[]>([]);
  const [rooms, setRooms] = useState<HifzResidenceRoom[]>([]);
  const [beds, setBeds] = useState<HifzResidenceBed[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters & search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResidenceId, setSelectedResidenceId] = useState<string>('ALL');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('ALL');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal states
  const [modalType, setModalType] = useState<'NONE' | 'RESIDENCE' | 'BUILDING' | 'ROOM' | 'BED'>('NONE');
  const [editItem, setEditItem] = useState<any | null>(null);
  const [modalSubmitting, setModalSubmitting] = useState(false);

  // Form states
  const [formData, setFormData] = useState<any>({});

  useEffect(() => {
    loadAllData();
  }, [currentMosque.id]);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [resList, bldList, romList, bedList] = await Promise.all([
        api.getHifzResidences().catch(() => []),
        api.getHifzResidenceBuildings().catch(() => []),
        api.getHifzResidenceRooms().catch(() => []),
        api.getHifzResidenceBeds().catch(() => []),
      ]);
      setResidences(resList || []);
      setBuildings(bldList || []);
      setRooms(romList || []);
      setBeds(bedList || []);
    } catch (err: any) {
      setError(err.message || 'আবাসিক তথ্য লোড করতে ব্যর্থ হয়েছে');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = (type: 'RESIDENCE' | 'BUILDING' | 'ROOM' | 'BED') => {
    setEditItem(null);
    setModalType(type);
    if (type === 'RESIDENCE') {
      setFormData({ name: '', nameBn: '', type: 'HOSTEL', address: '', remarks: '', status: 'ACTIVE' });
    } else if (type === 'BUILDING') {
      setFormData({
        residenceId: selectedResidenceId !== 'ALL' ? selectedResidenceId : residences[0]?.id || '',
        name: '',
        nameBn: '',
        code: '',
        floorCount: 1,
        remarks: '',
        status: 'ACTIVE',
      });
    } else if (type === 'ROOM') {
      const bld = buildings.find(b => b.id === selectedBuildingId) || buildings[0];
      setFormData({
        buildingId: bld?.id || '',
        roomNumber: '',
        name: '',
        floorNumber: 1,
        capacity: 4,
        remarks: '',
        status: 'ACTIVE',
      });
    } else if (type === 'BED') {
      const rom = rooms.find(r => r.id === selectedRoomId) || rooms[0];
      setFormData({
        roomId: rom?.id || '',
        bedNumber: '',
        code: '',
        remarks: '',
        status: 'ACTIVE',
      });
    }
  };

  const handleOpenEditModal = (type: 'RESIDENCE' | 'BUILDING' | 'ROOM' | 'BED', item: any) => {
    setEditItem(item);
    setModalType(type);
    setFormData({ ...item });
  };

  const handleCloseModal = () => {
    setModalType('NONE');
    setEditItem(null);
    setFormData({});
  };

  const handleSaveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalSubmitting(true);
    setError(null);
    try {
      if (modalType === 'RESIDENCE') {
        if (editItem) {
          await api.updateHifzResidence(editItem.id, formData);
          setSuccessMsg('আবাসিক কেন্দ্র সফলভাবে হালনাগাদ করা হয়েছে।');
        } else {
          await api.createHifzResidence(formData);
          setSuccessMsg('আবাসিক কেন্দ্র সফলভাবে তৈরি হয়েছে।');
        }
      } else if (modalType === 'BUILDING') {
        if (editItem) {
          await api.updateHifzResidenceBuilding(editItem.id, formData);
          setSuccessMsg('ভবন/ব্লক সফলভাবে হালনাগাদ করা হয়েছে।');
        } else {
          await api.createHifzResidenceBuilding(formData);
          setSuccessMsg('ভবন/ব্লক সফলভাবে তৈরি হয়েছে।');
        }
      } else if (modalType === 'ROOM') {
        if (editItem) {
          await api.updateHifzResidenceRoom(editItem.id, formData);
          setSuccessMsg('কক্ষ সফলভাবে হালনাগাদ করা হয়েছে।');
        } else {
          await api.createHifzResidenceRoom(formData);
          setSuccessMsg('কক্ষ সফলভাবে তৈরি হয়েছে।');
        }
      } else if (modalType === 'BED') {
        if (editItem) {
          await api.updateHifzResidenceBed(editItem.id, formData);
          setSuccessMsg('বেড সফলভাবে হালনাগাদ করা হয়েছে।');
        } else {
          await api.createHifzResidenceBed(formData);
          setSuccessMsg('বেড সফলভাবে তৈরি হয়েছে।');
        }
      }
      handleCloseModal();
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || 'সংরক্ষণ ব্যর্থ হয়েছে');
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleStatusChange = async (type: 'RESIDENCE' | 'BUILDING' | 'ROOM' | 'BED', item: any, newStatus: HifzResidentialStatus) => {
    setError(null);
    try {
      if (type === 'RESIDENCE') {
        await api.updateHifzResidence(item.id, { status: newStatus });
      } else if (type === 'BUILDING') {
        await api.updateHifzResidenceBuilding(item.id, { status: newStatus });
      } else if (type === 'ROOM') {
        await api.updateHifzResidenceRoom(item.id, { status: newStatus });
      } else if (type === 'BED') {
        await api.updateHifzResidenceBed(item.id, { status: newStatus });
      }
      setSuccessMsg(`স্ট্যাটাস সফলভাবে ${newStatus === 'ACTIVE' ? 'সক্রিয়' : newStatus === 'INACTIVE' ? 'নিষ্ক্রিয়' : 'আর্কাইভ'} করা হয়েছে।`);
      await loadAllData();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'স্ট্যাটাস পরিবর্তনে ব্যর্থ হয়েছে');
    }
  };

  const getStatusBadge = (status: HifzResidentialStatus) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">সক্রিয়</span>;
      case 'INACTIVE':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">নিষ্ক্রিয়</span>;
      case 'ARCHIVED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">আর্কাইভড</span>;
      default:
        return null;
    }
  };

  // Filtered lists
  const filteredResidences = residences.filter(r => {
    const matchSearch = !searchTerm || r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.nameBn.includes(searchTerm) || r.residenceId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const filteredBuildings = buildings.filter(b => {
    const matchRes = selectedResidenceId === 'ALL' || b.residenceId === selectedResidenceId;
    const matchSearch = !searchTerm || b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.code.toLowerCase().includes(searchTerm.toLowerCase()) || b.buildingId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchRes && matchSearch && matchStatus;
  });

  const filteredRooms = rooms.filter(r => {
    const matchRes = selectedResidenceId === 'ALL' || r.residenceId === selectedResidenceId;
    const matchBld = selectedBuildingId === 'ALL' || r.buildingId === selectedBuildingId;
    const matchSearch = !searchTerm || r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) || (r.name && r.name.toLowerCase().includes(searchTerm.toLowerCase())) || r.roomId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchRes && matchBld && matchSearch && matchStatus;
  });

  const filteredBeds = beds.filter(b => {
    const matchRes = selectedResidenceId === 'ALL' || b.residenceId === selectedResidenceId;
    const matchBld = selectedBuildingId === 'ALL' || b.buildingId === selectedBuildingId;
    const matchRom = selectedRoomId === 'ALL' || b.roomId === selectedRoomId;
    const matchSearch = !searchTerm || b.bedNumber.toLowerCase().includes(searchTerm.toLowerCase()) || b.code.toLowerCase().includes(searchTerm.toLowerCase()) || b.bedId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchRes && matchBld && matchRom && matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-100 border border-emerald-500/40">
                Hifz H6-A Foundation
              </span>
              <span className="text-xs text-emerald-200">কাঠামো ও অবকাঠামো ব্যবস্থাপনা</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight font-['Hind_Siliguri']">
              🏠 আবাসিক ব্যবস্থাপনা ফাউন্ডেশন (Residential Management)
            </h1>
            <p className="text-sm text-emerald-100/90 mt-1 font-['Tiro_Bangla']">
              হেফজখানার আবাসিক কেন্দ্র (হোস্টেল), ভবন/ব্লক, কক্ষ ও বেডের ক্যানোনিক্যাল কাঠামো সংরক্ষণ।
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={loadAllData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-emerald-700/60 hover:bg-emerald-700 text-white rounded-lg transition-colors border border-emerald-600/50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              রিফ্রেশ
            </button>
            <button
              onClick={() => {
                if (activeSection === 'residences') handleOpenCreateModal('RESIDENCE');
                else if (activeSection === 'buildings') handleOpenCreateModal('BUILDING');
                else if (activeSection === 'rooms') handleOpenCreateModal('ROOM');
                else handleOpenCreateModal('BED');
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 rounded-lg shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              {activeSection === 'residences' ? 'নতুন আবাসিক কেন্দ্র' : activeSection === 'buildings' ? 'নতুন ভবন/ব্লক' : activeSection === 'rooms' ? 'নতুন কক্ষ' : 'নতুন বেড'}
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-600 hover:text-rose-800 text-xs font-bold">×</button>
        </div>
      )}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 text-xs font-bold">×</button>
        </div>
      )}

      {/* Secondary Structural Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setActiveSection('residences')}
          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
            activeSection === 'residences'
              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${activeSection === 'residences' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Home className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ধাপ ১</div>
            <div className="text-sm font-bold text-slate-800 font-['Baloo_Da_2']">আবাসিক কেন্দ্র</div>
            <div className="text-xs text-slate-600 font-semibold">{residences.length} টি কেন্দ্র</div>
          </div>
        </button>

        <button
          onClick={() => setActiveSection('buildings')}
          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
            activeSection === 'buildings'
              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${activeSection === 'buildings' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ধাপ ২</div>
            <div className="text-sm font-bold text-slate-800 font-['Baloo_Da_2']">ভবন / ব্লক</div>
            <div className="text-xs text-slate-600 font-semibold">{buildings.length} টি ভবন</div>
          </div>
        </button>

        <button
          onClick={() => setActiveSection('rooms')}
          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
            activeSection === 'rooms'
              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${activeSection === 'rooms' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ধাপ ৩</div>
            <div className="text-sm font-bold text-slate-800 font-['Baloo_Da_2']">কক্ষসমূহ</div>
            <div className="text-xs text-slate-600 font-semibold">{rooms.length} টি কক্ষ</div>
          </div>
        </button>

        <button
          onClick={() => setActiveSection('beds')}
          className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
            activeSection === 'beds'
              ? 'bg-emerald-50/80 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
        >
          <div className={`p-2.5 rounded-lg ${activeSection === 'beds' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
            <BedDouble className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">ধাপ ৪</div>
            <div className="text-sm font-bold text-slate-800 font-['Baloo_Da_2']">বেডসমূহ</div>
            <div className="text-xs text-slate-600 font-semibold">{beds.length} টি বেড</div>
          </div>
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="নাম, কোড বা আইডি দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {(activeSection === 'buildings' || activeSection === 'rooms' || activeSection === 'beds') && (
            <select
              value={selectedResidenceId}
              onChange={e => {
                setSelectedResidenceId(e.target.value);
                setSelectedBuildingId('ALL');
                setSelectedRoomId('ALL');
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-['Hind_Siliguri']"
            >
              <option value="ALL">সকল আবাসিক কেন্দ্র</option>
              {residences.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          )}

          {(activeSection === 'rooms' || activeSection === 'beds') && (
            <select
              value={selectedBuildingId}
              onChange={e => {
                setSelectedBuildingId(e.target.value);
                setSelectedRoomId('ALL');
              }}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-['Hind_Siliguri']"
            >
              <option value="ALL">সকল ভবন</option>
              {buildings
                .filter(b => selectedResidenceId === 'ALL' || b.residenceId === selectedResidenceId)
                .map(b => (
                  <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                ))}
            </select>
          )}

          {activeSection === 'beds' && (
            <select
              value={selectedRoomId}
              onChange={e => setSelectedRoomId(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-['Hind_Siliguri']"
            >
              <option value="ALL">সকল কক্ষ</option>
              {rooms
                .filter(r => selectedBuildingId === 'ALL' || r.buildingId === selectedBuildingId)
                .map(r => (
                  <option key={r.id} value={r.id}>কক্ষ {r.roomNumber}</option>
                ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-['Hind_Siliguri']"
          >
            <option value="ALL">সকল স্ট্যাটাস</option>
            <option value="ACTIVE">সক্রিয় (Active)</option>
            <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
            <option value="ARCHIVED">আর্কাইভড (Archived)</option>
          </select>
        </div>
      </div>

      {/* Main Table Views */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {/* SECTION 1: RESIDENCES */}
        {activeSection === 'residences' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">কেন্দ্র আইডি</th>
                  <th className="px-4 py-3">নাম</th>
                  <th className="px-4 py-3">ধরন</th>
                  <th className="px-4 py-3">ঠিকানা</th>
                  <th className="px-4 py-3">ভবন সংখ্যা</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredResidences.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      কোনো আবাসিক কেন্দ্র পাওয়া যায়নি। "নতুন আবাসিক কেন্দ্র" বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  filteredResidences.map(item => {
                    const bCount = buildings.filter(b => b.residenceId === item.id).length;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{item.residenceId}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 font-['Hind_Siliguri']">{item.name}</div>
                          {item.nameBn && item.nameBn !== item.name && (
                            <div className="text-[11px] text-slate-400">{item.nameBn}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">{item.type || 'HOSTEL'}</td>
                        <td className="px-4 py-3 max-w-[200px] truncate">{item.address || '—'}</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{bCount} টি</td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditModal('RESIDENCE', item)}
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleStatusChange('RESIDENCE', item, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                              className={`p-1 rounded ${item.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={item.status === 'ACTIVE' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            >
                              {item.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 2: BUILDINGS */}
        {activeSection === 'buildings' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">ভবন আইডি</th>
                  <th className="px-4 py-3">ভবনের নাম ও কোড</th>
                  <th className="px-4 py-3">আবাসিক কেন্দ্র</th>
                  <th className="px-4 py-3">ফ্লোর সংখ্যা</th>
                  <th className="px-4 py-3">কক্ষ সংখ্যা</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBuildings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      কোনো ভবন পাওয়া যায়নি। "নতুন ভবন/ব্লক" বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  filteredBuildings.map(item => {
                    const resParent = residences.find(r => r.id === item.residenceId);
                    const rCount = rooms.filter(r => r.buildingId === item.id).length;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{item.buildingId}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800 font-['Hind_Siliguri']">{item.name}</div>
                          <div className="text-[11px] font-mono text-emerald-700">কোড: {item.code}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700 font-['Hind_Siliguri']">{resParent?.name || '—'}</td>
                        <td className="px-4 py-3">{item.floorCount} তলা</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{rCount} টি</td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditModal('BUILDING', item)}
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleStatusChange('BUILDING', item, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                              className={`p-1 rounded ${item.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={item.status === 'ACTIVE' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            >
                              {item.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 3: ROOMS */}
        {activeSection === 'rooms' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">কক্ষ আইডি</th>
                  <th className="px-4 py-3">কক্ষ নম্বর / নাম</th>
                  <th className="px-4 py-3">ভবন ও কেন্দ্র</th>
                  <th className="px-4 py-3">ফ্লোর নম্বর</th>
                  <th className="px-4 py-3">ধারণক্ষমতা</th>
                  <th className="px-4 py-3">বেড সংখ্যা</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRooms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      কোনো কক্ষ পাওয়া যায়নি। "নতুন কক্ষ" বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  filteredRooms.map(item => {
                    const bldParent = buildings.find(b => b.id === item.buildingId);
                    const resParent = residences.find(r => r.id === item.residenceId);
                    const bdCount = beds.filter(b => b.roomId === item.id).length;
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{item.roomId}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">কক্ষ {item.roomNumber}</div>
                          {item.name && item.name !== `কক্ষ ${item.roomNumber}` && (
                            <div className="text-[11px] text-slate-400">{item.name}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800 font-medium">{bldParent?.name || '—'}</div>
                          <div className="text-[11px] text-slate-400">{resParent?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3">{item.floorNumber} তলা</td>
                        <td className="px-4 py-3 font-semibold text-slate-700">{item.capacity} জন</td>
                        <td className="px-4 py-3 font-semibold text-emerald-700">{bdCount} টি</td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditModal('ROOM', item)}
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleStatusChange('ROOM', item, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                              className={`p-1 rounded ${item.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={item.status === 'ACTIVE' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            >
                              {item.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* SECTION 4: BEDS */}
        {activeSection === 'beds' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-700 uppercase font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">বেড আইডি</th>
                  <th className="px-4 py-3">বেড নম্বর ও কোড</th>
                  <th className="px-4 py-3">কক্ষ ও ভবন</th>
                  <th className="px-4 py-3">আবাসিক কেন্দ্র</th>
                  <th className="px-4 py-3">স্ট্যাটাস</th>
                  <th className="px-4 py-3 text-right">কার্যক্রম</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBeds.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      কোনো বেড পাওয়া যায়নি। "নতুন বেড" বাটনে ক্লিক করে যোগ করুন।
                    </td>
                  </tr>
                ) : (
                  filteredBeds.map(item => {
                    const romParent = rooms.find(r => r.id === item.roomId);
                    const bldParent = buildings.find(b => b.id === item.buildingId);
                    const resParent = residences.find(r => r.id === item.residenceId);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-mono font-medium text-slate-900">{item.bedId}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-800">বেড {item.bedNumber}</div>
                          <div className="text-[11px] font-mono text-emerald-700">কোড: {item.code}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-800 font-medium">কক্ষ {romParent?.roomNumber || '—'}</div>
                          <div className="text-[11px] text-slate-400">{bldParent?.name || '—'}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{resParent?.name || '—'}</td>
                        <td className="px-4 py-3">{getStatusBadge(item.status)}</td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                            onClick={() => handleOpenEditModal('BED', item)}
                            className="p-1 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded"
                            title="সম্পাদনা"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {item.status !== 'ARCHIVED' && (
                            <button
                              onClick={() => handleStatusChange('BED', item, item.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE')}
                              className={`p-1 rounded ${item.status === 'ACTIVE' ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                              title={item.status === 'ACTIVE' ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            >
                              {item.status === 'ACTIVE' ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {modalType !== 'NONE' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm font-['Hind_Siliguri']">
                {editItem ? 'সম্পাদনা করুন' : 'নতুন সংযোজন'}:{' '}
                {modalType === 'RESIDENCE' ? 'আবাসিক কেন্দ্র' : modalType === 'BUILDING' ? 'ভবন/ব্লক' : modalType === 'ROOM' ? 'কক্ষ' : 'বেড'}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 text-lg font-bold">×</button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-4 text-xs">
              {/* RESIDENCE FORM */}
              {modalType === 'RESIDENCE' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">কেন্দ্রের নাম (ইংরেজি/বাংলা) *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Al-Falah Hifz Hostel"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">নাম (বাংলা)</label>
                    <input
                      type="text"
                      value={formData.nameBn || ''}
                      onChange={e => setFormData({ ...formData, nameBn: e.target.value })}
                      placeholder="e.g. আল-ফালাহ হিফজ ছাত্রাবাস"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-['Hind_Siliguri']"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">ঠিকানা / অবস্থান</label>
                    <input
                      type="text"
                      value={formData.address || ''}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      placeholder="e.g. মসজিদ প্রাঙ্গণ, ২য় তলা"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {/* BUILDING FORM */}
              {modalType === 'BUILDING' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">আবাসিক কেন্দ্র *</label>
                    <select
                      required
                      disabled={!!editItem}
                      value={formData.residenceId || ''}
                      onChange={e => setFormData({ ...formData, residenceId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">কেন্দ্র নির্বাচন করুন</option>
                      {residences.map(r => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">ভবনের নাম *</label>
                      <input
                        type="text"
                        required
                        value={formData.name || ''}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. মেইন ব্লক"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-['Hind_Siliguri']"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">ভবন কোড *</label>
                      <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. BLD-A"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-mono uppercase"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">ফ্লোর সংখ্যা</label>
                    <input
                      type="number"
                      min={1}
                      value={formData.floorCount || 1}
                      onChange={e => setFormData({ ...formData, floorCount: parseInt(e.target.value, 10) || 1 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {/* ROOM FORM */}
              {modalType === 'ROOM' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">ভবন / ব্লক *</label>
                    <select
                      required
                      disabled={!!editItem}
                      value={formData.buildingId || ''}
                      onChange={e => setFormData({ ...formData, buildingId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">ভবন নির্বাচন করুন</option>
                      {buildings.map(b => (
                        <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">কক্ষ নম্বর *</label>
                      <input
                        type="text"
                        required
                        value={formData.roomNumber || ''}
                        onChange={e => setFormData({ ...formData, roomNumber: e.target.value })}
                        placeholder="e.g. 101"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">ধারণক্ষমতা (জন) *</label>
                      <input
                        type="number"
                        min={1}
                        required
                        value={formData.capacity || 4}
                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value, 10) || 1 })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">ফ্লোর নম্বর</label>
                    <input
                      type="number"
                      min={0}
                      value={formData.floorNumber !== undefined ? formData.floorNumber : 1}
                      onChange={e => setFormData({ ...formData, floorNumber: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              {/* BED FORM */}
              {modalType === 'BED' && (
                <>
                  <div>
                    <label className="block text-slate-700 font-medium mb-1">কক্ষ *</label>
                    <select
                      required
                      disabled={!!editItem}
                      value={formData.roomId || ''}
                      onChange={e => setFormData({ ...formData, roomId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="">কক্ষ নির্বাচন করুন</option>
                      {rooms.map(r => (
                        <option key={r.id} value={r.id}>কক্ষ {r.roomNumber}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">বেড নম্বর *</label>
                      <input
                        type="text"
                        required
                        value={formData.bedNumber || ''}
                        onChange={e => setFormData({ ...formData, bedNumber: e.target.value })}
                        placeholder="e.g. 01"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-700 font-medium mb-1">বেড কোড</label>
                      <input
                        type="text"
                        value={formData.code || ''}
                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                        placeholder="e.g. 101-B1"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">মন্তব্য (ঐচ্ছিক)</label>
                <textarea
                  rows={2}
                  value={formData.remarks || ''}
                  onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                  placeholder="অতিরিক্ত তথ্য..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-slate-700 font-medium mb-1">স্ট্যাটাস</label>
                <select
                  value={formData.status || 'ACTIVE'}
                  onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE">সক্রিয় (Active)</option>
                  <option value="INACTIVE">নিষ্ক্রিয় (Inactive)</option>
                  <option value="ARCHIVED">আর্কাইভড (Archived)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                >
                  {modalSubmitting ? 'সংরক্ষণ হচ্ছে...' : editItem ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
