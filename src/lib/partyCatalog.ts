import { User } from '../types';
import {
  BuiltInPartyRoleCode,
  PartyCustomRoleDef,
  PartyPermissionKey,
  PartyProfileType,
  PartyRecord,
  PartyRoleCategoryGroup,
} from '../types/partyTypes';

export interface PartyRoleDefinitionMeta {
  code: BuiltInPartyRoleCode;
  labelBn: string;
  labelEn: string;
  categoryGroup: PartyRoleCategoryGroup;
  isArtisanOrLabour: boolean;
}

export const BUILT_IN_PARTY_ROLES: PartyRoleDefinitionMeta[] = [
  { code: 'BUYER', labelBn: 'ক্রেতা', labelEn: 'Buyer', categoryGroup: 'BUYER', isArtisanOrLabour: false },
  { code: 'SELLER', labelBn: 'বিক্রেতা', labelEn: 'Seller', categoryGroup: 'SELLER_SUPPLIER', isArtisanOrLabour: false },
  { code: 'VENDOR', labelBn: 'ভেন্ডর / দোকানদার', labelEn: 'Vendor', categoryGroup: 'SELLER_SUPPLIER', isArtisanOrLabour: false },
  { code: 'SUPPLIER', labelBn: 'সরবরাহকারী', labelEn: 'Supplier', categoryGroup: 'SELLER_SUPPLIER', isArtisanOrLabour: false },
  { code: 'TECHNICIAN', labelBn: 'টেকনিশিয়ান', labelEn: 'Technician', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'ELECTRICIAN', labelBn: 'ইলেকট্রিশিয়ান', labelEn: 'Electrician', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'MASON', labelBn: 'রাজমিস্ত্রী', labelEn: 'Mason', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'PAINTER', labelBn: 'রঙমিস্ত্রী', labelEn: 'Painter', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'AC_MECHANIC', labelBn: 'এসি মেকানিক', labelEn: 'AC Mechanic', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'PLUMBER', labelBn: 'প্লাম্বার / স্যানিটারি', labelEn: 'Plumber', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'CARPENTER', labelBn: 'কাঠমিস্ত্রী', labelEn: 'Carpenter', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'LABOURER', labelBn: 'শ্রমিক / হেল্পার', labelEn: 'Labourer', categoryGroup: 'ARTISAN_LABOUR', isArtisanOrLabour: true },
  { code: 'CONTRACTOR', labelBn: 'ঠিকাদার', labelEn: 'Contractor', categoryGroup: 'CONTRACTOR_PROVIDER', isArtisanOrLabour: false },
  { code: 'SERVICE_PROVIDER', labelBn: 'সেবাদাতা', labelEn: 'Service Provider', categoryGroup: 'CONTRACTOR_PROVIDER', isArtisanOrLabour: false },
  { code: 'CONSULTANT', labelBn: 'পরামর্শদাতা / প্রকৌশলী', labelEn: 'Consultant', categoryGroup: 'CONTRACTOR_PROVIDER', isArtisanOrLabour: false },
  { code: 'OTHER', labelBn: 'অন্যান্য', labelEn: 'Other', categoryGroup: 'OTHER', isArtisanOrLabour: false },
];

export const PARTY_PROFILE_TYPE_LABELS: Record<PartyProfileType, string> = {
  INDIVIDUAL: 'ব্যক্তি (Individual)',
  ORGANIZATION: 'প্রতিষ্ঠান / ব্যবসায়িক সংস্থা (Organization)',
};

export const PARTY_CATEGORY_GROUP_LABELS: Record<PartyRoleCategoryGroup, string> = {
  BUYER: 'ক্রেতা',
  SELLER_SUPPLIER: 'বিক্রেতা ও সরবরাহকারী',
  ARTISAN_LABOUR: 'কারিগর ও শ্রমিক',
  CONTRACTOR_PROVIDER: 'ঠিকাদার ও সেবাদাতা',
  OTHER: 'অন্যান্য ভূমিকা',
};

export const SELLER_SUPPLIER_ROLES = new Set<string>(['SELLER', 'VENDOR', 'SUPPLIER']);
export const ARTISAN_LABOUR_ROLES = new Set<string>([
  'TECHNICIAN',
  'ELECTRICIAN',
  'MASON',
  'PAINTER',
  'AC_MECHANIC',
  'PLUMBER',
  'CARPENTER',
  'LABOURER',
]);
export const CONTRACTOR_PROVIDER_ROLES = new Set<string>(['CONTRACTOR', 'SERVICE_PROVIDER', 'CONSULTANT']);

export function getAllRoleDefinitions(customRoles: PartyCustomRoleDef[] = []): Array<{
  code: string;
  labelBn: string;
  labelEn: string;
  categoryGroup: PartyRoleCategoryGroup;
  isArtisanOrLabour: boolean;
  isCustom: boolean;
}> {
  const builtIn = BUILT_IN_PARTY_ROLES.map((r) => ({ ...r, isCustom: false }));
  const custom = customRoles.map((cr) => ({
    code: cr.code,
    labelBn: cr.labelBn,
    labelEn: cr.labelEn || cr.labelBn,
    categoryGroup: cr.categoryGroup || 'OTHER',
    isArtisanOrLabour: cr.categoryGroup === 'ARTISAN_LABOUR',
    isCustom: true,
  }));
  return [...builtIn, ...custom];
}

export function getPartyRoleLabelBn(code: string, customRoles: PartyCustomRoleDef[] = []): string {
  const builtIn = BUILT_IN_PARTY_ROLES.find((r) => r.code === code);
  if (builtIn) return builtIn.labelBn;
  const custom = customRoles.find((r) => r.code === code);
  if (custom) return custom.labelBn;
  return code;
}

export function partyHasArtisanRole(roles: string[], customRoles: PartyCustomRoleDef[] = []): boolean {
  return roles.some((code) => {
    if (ARTISAN_LABOUR_ROLES.has(code)) return true;
    const custom = customRoles.find((cr) => cr.code === code);
    return custom?.categoryGroup === 'ARTISAN_LABOUR';
  });
}

export function partyMatchesCategoryGroup(
  party: Pick<PartyRecord, 'partyType' | 'roles'>,
  group: 'ALL' | 'BUYER' | 'SELLER_SUPPLIER' | 'ARTISAN_LABOUR' | 'CONTRACTOR_PROVIDER' | 'ORGANIZATION',
  customRoles: PartyCustomRoleDef[] = []
): boolean {
  if (group === 'ALL') return true;
  if (group === 'ORGANIZATION') return party.partyType === 'ORGANIZATION';

  const roles = Array.isArray(party.roles) ? party.roles : [];
  if (group === 'BUYER') {
    return roles.some((code) => {
      if (code === 'BUYER') return true;
      return customRoles.find((cr) => cr.code === code)?.categoryGroup === 'BUYER';
    });
  }
  if (group === 'SELLER_SUPPLIER') {
    return roles.some((code) => {
      if (SELLER_SUPPLIER_ROLES.has(code)) return true;
      return customRoles.find((cr) => cr.code === code)?.categoryGroup === 'SELLER_SUPPLIER';
    });
  }
  if (group === 'ARTISAN_LABOUR') {
    return partyHasArtisanRole(roles, customRoles);
  }
  if (group === 'CONTRACTOR_PROVIDER') {
    return roles.some((code) => {
      if (CONTRACTOR_PROVIDER_ROLES.has(code)) return true;
      return customRoles.find((cr) => cr.code === code)?.categoryGroup === 'CONTRACTOR_PROVIDER';
    });
  }
  return true;
}

export function formatPartyAddressLine(p: Partial<PartyRecord>): string {
  if (p.fullAddress && p.fullAddress.trim()) return p.fullAddress.trim();
  return [p.villageOrMahalla, p.unionOrWard, p.upazila, p.district, p.division, p.postCode]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join(', ');
}

const ACCOUNTANT_TREASURER_PARTY_PERMS = new Set<PartyPermissionKey>([
  'party.view',
  'party.create',
  'party.edit',
  'party.manage_roles',
  'party.view_audit',
  'party.view_sensitive',
  'party.ocr',
]);

const OPERATOR_PARTY_PERMS = new Set<PartyPermissionKey>([
  'party.view',
  'party.create',
  'party.edit',
  'party.view_sensitive',
  'party.ocr',
]);

const AUDITOR_PARTY_PERMS = new Set<PartyPermissionKey>([
  'party.view',
  'party.view_audit',
  'party.view_sensitive',
]);

const VIEWER_PARTY_PERMS = new Set<PartyPermissionKey>(['party.view']);

export function hasClientPartyPermission(
  user: User | null | undefined,
  perm: PartyPermissionKey
): boolean {
  if (!user) return false;
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  if (perms.includes(perm)) return true;

  if (user.role === 'SUPER_ADMIN' || user.role === 'MOSQUE_ADMIN' || user.role === 'COMMITTEE_ADMIN') {
    return true;
  }
  if (user.role === 'ACCOUNTANT' || user.role === 'TREASURER') {
    return ACCOUNTANT_TREASURER_PARTY_PERMS.has(perm);
  }
  if (user.role === 'DATA_ENTRY_OPERATOR') {
    return OPERATOR_PARTY_PERMS.has(perm);
  }
  if (user.role === 'AUDITOR') {
    return AUDITOR_PARTY_PERMS.has(perm);
  }
  if (user.role === 'VIEWER') {
    return VIEWER_PARTY_PERMS.has(perm);
  }
  return false;
}
