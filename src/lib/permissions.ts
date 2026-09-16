import { User, UserRole, Permission } from '../types';

/**
 * MasjidLedger Central Permission & Data Visibility Engine
 * 
 * Enforces role-based access control (RBAC), protects sensitive personal data
 * (NID, bank accounts, salaries, advance, dues, private documents), and ensures
 * unauthorized or public users cannot access restricted information.
 */

export interface PermissionContext {
  currentUser?: User | null;
  isPublicView?: boolean;
}

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  SUPER_ADMIN: 100,
  MOSQUE_ADMIN: 90,
  ACCOUNTANT: 80,
  TREASURER: 75,
  COMMITTEE_ADMIN: 70,
  AUDITOR: 60,
  DATA_ENTRY_OPERATOR: 50,
  VIEWER: 10,
};

export const ROLE_LABELS_BN: Record<UserRole, string> = {
  SUPER_ADMIN: 'সুপার অ্যাডমিন',
  MOSQUE_ADMIN: 'মসজিদ অ্যাডমিন',
  ACCOUNTANT: 'হিসাবরক্ষক (Accountant)',
  TREASURER: 'কোষাধ্যক্ষ (Treasurer)',
  COMMITTEE_ADMIN: 'কমিটি অ্যাডমিন',
  AUDITOR: 'অভ্যন্তরীণ নিরীক্ষক (Auditor)',
  DATA_ENTRY_OPERATOR: 'ডাটা এন্ট্রি অপারেটর',
  VIEWER: 'সাধারণ পর্যবেক্ষক (Viewer)',
};

/**
 * Check if the user has a specific permission or administrative override
 */
export function hasPermission(
  user: User | null | undefined,
  requiredPermission: Permission
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'MOSQUE_ADMIN') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(requiredPermission);
}

/**
 * Check if the user is a full administrator
 */
export function isAdmin(user: User | null | undefined): boolean {
  if (!user) return false;
  return user.role === 'SUPER_ADMIN' || user.role === 'MOSQUE_ADMIN';
}

/**
 * Check if the user has financial management access
 */
export function canManageFinances(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'MOSQUE_ADMIN' ||
    user.role === 'ACCOUNTANT' ||
    user.role === 'TREASURER'
  );
}

/**
 * Check if user can view sensitive personal data (NID, personal phone, bank details, salary)
 */
export function canViewSensitiveData(user: User | null | undefined, isPublicView = false): boolean {
  if (isPublicView) return false;
  if (!user) return false;
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'MOSQUE_ADMIN' ||
    user.role === 'ACCOUNTANT' ||
    user.role === 'AUDITOR' ||
    user.role === 'COMMITTEE_ADMIN'
  );
}

/**
 * Check if user can manage central documents
 */
export function canManageDocuments(user: User | null | undefined): boolean {
  if (!user) return false;
  return (
    user.role === 'SUPER_ADMIN' ||
    user.role === 'MOSQUE_ADMIN' ||
    user.role === 'ACCOUNTANT' ||
    user.role === 'COMMITTEE_ADMIN'
  );
}

/**
 * Check if a document is visible to the given user context
 */
export function isDocumentVisible(
  visibility: 'PRIVATE' | 'RESTRICTED' | 'PUBLIC',
  user: User | null | undefined,
  isPublicView = false
): boolean {
  if (visibility === 'PUBLIC') return true;
  if (isPublicView) return false;
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN' || user.role === 'MOSQUE_ADMIN') return true;
  if (visibility === 'RESTRICTED') {
    return user.role !== 'VIEWER';
  }
  if (visibility === 'PRIVATE') {
    return user.role === 'ACCOUNTANT';
  }
  return false;
}

/**
 * Masks sensitive NID or phone for public or unauthorized displays
 */
export function maskSensitiveValue(value?: string | number, preserveLastDigits = 4): string {
  if (!value) return '';
  const str = String(value);
  if (str.length <= preserveLastDigits) return '••••';
  const visible = str.slice(-preserveLastDigits);
  const masked = '•'.repeat(Math.min(str.length - preserveLastDigits, 8));
  return `${masked}${visible}`;
}

/**
 * Safely format bank account number for display
 */
export function formatProtectedBankAccount(
  accountNo?: string,
  user?: User | null,
  isPublicView = false
): string {
  if (!accountNo) return '—';
  if (canViewSensitiveData(user, isPublicView)) {
    return accountNo;
  }
  return maskSensitiveValue(accountNo, 4);
}
