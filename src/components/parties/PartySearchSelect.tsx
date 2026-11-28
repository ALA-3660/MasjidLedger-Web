import React, { useEffect, useRef, useState } from 'react';
import { Building2, ChevronDown, Plus, Search, User as UserIcon, X } from 'lucide-react';
import { api } from '../../lib/api';
import { formatPartyAddressLine, getPartyRoleLabelBn } from '../../lib/partyCatalog';
import { PartyCustomRoleDef, PartyProfileType, PartyRecord } from '../../types/partyTypes';
import { PartyQuickCreateModal } from './PartyQuickCreateModal';

export interface PartySearchSelectProps {
  valuePartyId?: string;
  valuePartyCode?: string;
  selectedParty?: PartyRecord | null;
  selectedSnapshotName?: string;
  onSelectParty: (party: PartyRecord | null) => void;
  label?: string;
  placeholder?: string;
  categoryGroup?: 'ALL' | 'BUYER' | 'SELLER_SUPPLIER' | 'ARTISAN_LABOUR' | 'CONTRACTOR_PROVIDER' | 'LAND_PARTY';
  partyTypeFilter?: 'ALL' | 'INDIVIDUAL' | 'ORGANIZATION';
  defaultQuickCreateRoles?: string[];
  defaultQuickCreateType?: PartyProfileType;
  defaultQuickCreateTitle?: string;
  prefillName?: string;
  prefillPhone?: string;
  prefillAddress?: string;
  helperText?: string;
  disabled?: boolean;
  compact?: boolean;
  allowQuickCreate?: boolean;
}

export const PartySearchSelect: React.FC<PartySearchSelectProps> = ({
  valuePartyId,
  valuePartyCode,
  selectedParty,
  selectedSnapshotName,
  onSelectParty,
  label = 'কেন্দ্রীয় রেজিস্ট্রি থেকে ব্যক্তি/প্রতিষ্ঠান নির্বাচন করুন',
  placeholder = 'নাম, মোবাইল নম্বর বা পার্টি কোড (PTY-...) দিয়ে খুঁজুন...',
  categoryGroup = 'ALL',
  partyTypeFilter = 'ALL',
  defaultQuickCreateRoles = ['SUPPLIER'],
  defaultQuickCreateType = 'INDIVIDUAL',
  defaultQuickCreateTitle = 'নতুন ব্যক্তি বা প্রতিষ্ঠান নিবন্ধন',
  prefillName = '',
  prefillPhone = '',
  prefillAddress = '',
  helperText,
  disabled = false,
  compact = false,
  allowQuickCreate = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'SUGGESTED' | 'ALL'>(
    categoryGroup !== 'ALL' ? 'SUGGESTED' : 'ALL'
  );
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PartyRecord[]>([]);
  const [customRoles, setCustomRoles] = useState<PartyCustomRoleDef[]>([]);
  const [resolvedSelected, setResolvedSelected] = useState<PartyRecord | null>(
    selectedParty || null
  );
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);

  useEffect(() => {
    setFilterMode(categoryGroup !== 'ALL' ? 'SUGGESTED' : 'ALL');
  }, [categoryGroup]);

  useEffect(() => {
    if (selectedParty) {
      setResolvedSelected(selectedParty);
      return;
    }
    if (!valuePartyId) {
      setResolvedSelected(null);
      return;
    }
    if (resolvedSelected && resolvedSelected.partyId === valuePartyId) return;

    let cancelled = false;
    api
      .getPartyById(valuePartyId)
      .then((res) => {
        if (!cancelled) {
          setResolvedSelected(res.resolvedPrimaryParty || res.party);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [valuePartyId, selectedParty]);

  useEffect(() => {
    api
      .getPartyRoles()
      .then((res) => setCustomRoles(res.custom || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const list = await api.getParties({
          search: searchTerm.trim() || undefined,
          categoryGroup:
            filterMode === 'SUGGESTED' && categoryGroup !== 'ALL' ? categoryGroup : undefined,
          partyType: partyTypeFilter as PartyProfileType | 'ALL',
          status: 'ACTIVE',
        });
        if (!cancelled) setItems(list || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, searchTerm, filterMode, categoryGroup, partyTypeFilter]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const displayName = resolvedSelected?.name || selectedSnapshotName;
  const displayCode = resolvedSelected?.partyCode || valuePartyCode;

  return (
    <div ref={containerRef} className="relative space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-xs font-bold text-slate-700 font-siliguri">{label}</label>
        {allowQuickCreate && !disabled && (
          <button
            type="button"
            onClick={() => setQuickCreateOpen(true)}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            নতুন ব্যক্তি/প্রতিষ্ঠান যোগ করুন
          </button>
        )}
      </div>

      {valuePartyId && displayName ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 ${
            compact ? 'px-3 py-2' : 'px-3.5 py-2.5'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {resolvedSelected?.partyType === 'ORGANIZATION' ? (
              <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <UserIcon className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <div className="min-w-0 text-xs">
              <div className="font-bold text-slate-900 truncate">
                {displayName}{' '}
                {displayCode && (
                  <span className="font-baloo text-emerald-800 font-semibold">
                    ({displayCode})
                  </span>
                )}
              </div>
              {resolvedSelected && (
                <div className="text-[11px] text-slate-600 truncate">
                  <span className="font-baloo">{resolvedSelected.phone}</span>
                  {resolvedSelected.roles?.length > 0 && (
                    <>
                      {' · '}
                      {resolvedSelected.roles
                        .map((r) => getPartyRoleLabelBn(r, customRoles))
                        .join(' · ')}
                    </>
                  )}
                  {formatPartyAddressLine(resolvedSelected) && (
                    <> · {formatPartyAddressLine(resolvedSelected)}</>
                  )}
                </div>
              )}
            </div>
          </div>
          {!disabled && (
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setOpen((p) => !p)}
                className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-white text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50"
              >
                পরিবর্তন
              </button>
              <button
                type="button"
                onClick={() => {
                  setResolvedSelected(null);
                  onSelectParty(null);
                }}
                title="রেজিস্ট্রি সংযোগ সরান"
                className="p-1 rounded-lg text-slate-500 hover:text-rose-700 hover:bg-rose-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((p) => !p)}
          className={`w-full flex items-center justify-between gap-2 rounded-xl border border-slate-300 bg-white text-left transition hover:border-emerald-500 disabled:opacity-60 ${
            compact ? 'px-3 py-2 text-xs' : 'px-3.5 py-2.5 text-sm'
          }`}
        >
          <span className="flex items-center gap-2 text-slate-500 truncate">
            <Search className="w-3.5 h-3.5 shrink-0 text-slate-400" />
            <span className="truncate">{placeholder}</span>
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      )}

      {helperText && <p className="text-[11px] text-slate-500">{helperText}</p>}

      {open && !disabled && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="p-2.5 border-b border-slate-100 space-y-2 bg-slate-50/70">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="নাম, মোবাইল বা PTY কোড লিখুন..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-600/20 focus:border-emerald-600"
              />
            </div>

            {categoryGroup !== 'ALL' && (
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFilterMode('SUGGESTED')}
                    className={`px-2 py-0.5 rounded-md font-semibold ${
                      filterMode === 'SUGGESTED'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    সংশ্লিষ্ট ভূমিকা
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterMode('ALL')}
                    className={`px-2 py-0.5 rounded-md font-semibold ${
                      filterMode === 'ALL'
                        ? 'bg-emerald-700 text-white'
                        : 'bg-white border border-slate-200 text-slate-600'
                    }`}
                  >
                    সকল সক্রিয় পার্টি
                  </button>
                </div>
                {allowQuickCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuickCreateOpen(true);
                    }}
                    className="text-emerald-700 hover:underline font-bold inline-flex items-center gap-0.5"
                  >
                    <Plus className="w-3 h-3" /> নতুন যোগ
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500">খোঁজা হচ্ছে...</div>
            ) : items.length === 0 ? (
              <div className="py-5 px-3 text-center space-y-2">
                <p className="text-xs text-slate-500">মিলে যাওয়া কোনো সক্রিয় প্রোফাইল পাওয়া যায়নি।</p>
                {allowQuickCreate && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setQuickCreateOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold inline-flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    "{searchTerm.trim() || 'নতুন'}" হিসেবে রেজিস্ট্রিতে যোগ করুন
                  </button>
                )}
              </div>
            ) : (
              items.slice(0, 30).map((item) => {
                const isSelected = item.partyId === valuePartyId || item.id === valuePartyId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setResolvedSelected(item);
                      onSelectParty(item);
                      setOpen(false);
                    }}
                    className={`w-full px-3.5 py-2.5 text-left hover:bg-emerald-50/70 transition flex items-start justify-between gap-2 ${
                      isSelected ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                        {item.partyType === 'ORGANIZATION' ? (
                          <Building2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                        ) : (
                          <UserIcon className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="truncate">{item.name}</span>
                        <span className="font-baloo text-[11px] font-semibold text-emerald-800">
                          · {item.partyCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-600 mt-0.5 truncate">
                        <span className="font-baloo">{item.phone}</span>
                        {item.roles?.length > 0 && (
                          <>
                            {' · '}
                            {item.roles.map((r) => getPartyRoleLabelBn(r, customRoles)).join(' · ')}
                          </>
                        )}
                      </div>
                      {formatPartyAddressLine(item) && (
                        <div className="text-[11px] text-slate-500 truncate">
                          {formatPartyAddressLine(item)}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {allowQuickCreate && (
        <PartyQuickCreateModal
          isOpen={quickCreateOpen}
          onClose={() => setQuickCreateOpen(false)}
          onCreated={(created) => {
            setResolvedSelected(created);
            onSelectParty(created);
          }}
          defaultPartyType={defaultQuickCreateType}
          defaultRoles={defaultQuickCreateRoles}
          defaultName={searchTerm.trim() || prefillName}
          defaultPhone={prefillPhone}
          defaultAddress={prefillAddress}
          titleBn={defaultQuickCreateTitle}
        />
      )}
    </div>
  );
};
