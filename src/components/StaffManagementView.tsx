import React, { useState } from 'react';
import { StaffSecondarySidebar, StaffSubSection } from './StaffSecondarySidebar';
import { StaffDirectorySection } from './StaffDirectorySection';
import { StaffMasterRegisterSection } from './StaffMasterRegisterSection';
import { StaffAttendanceSection } from './StaffAttendanceSection';
import { StaffLeaveSection } from './StaffLeaveSection';
import { StaffSalaryDisbursementSection } from './StaffSalaryDisbursementSection';
import { StaffFestivalAllowanceSection } from './StaffFestivalAllowanceSection';
import { StaffAdvanceLoanSection } from './StaffAdvanceLoanSection';
import { StaffBankTransferSection } from './StaffBankTransferSection';
import { StaffBankLetterSection } from './StaffBankLetterSection';
import { StaffReportsSection } from './StaffReportsSection';

import { StaffPersonnelProfileModal } from './StaffPersonnelProfileModal';
import { StaffFormModal } from './StaffFormModal';
import { StaffPaymentModal } from './StaffPaymentModal';
import { StaffAdvanceModal } from './StaffAdvanceModal';
import { StaffLeaveModal } from './StaffLeaveModal';
import { StaffSalarySlipModal } from './StaffSalarySlipModal';
import { CashSalaryResolutionModal } from './CashSalaryResolutionModal';

import { Staff, StaffPayment, FinancialAccount, Mosque, StaffAttendanceStatus, StaffLeaveStatus } from '../types';
import { Language } from '../lib/i18n';

interface StaffManagementViewProps {
  staffList: Staff[];
  staffPayments: StaffPayment[];
  accounts: FinancialAccount[];
  currentMosque?: Mosque | null;
  onAddStaff: (data: Partial<Staff>) => Promise<void>;
  onUpdateStaff: (id: string, data: Partial<Staff>) => Promise<void>;
  onDeleteStaff: (id: string) => Promise<void>;
  onPayStaff: (data: any) => Promise<void>;
  onLogAttendance?: (data: {
    staffId: string;
    date: string;
    status: StaffAttendanceStatus;
    inTime?: string;
    outTime?: string;
    prayersAttended?: ('FAJR' | 'DHUHR' | 'ASR' | 'MAGHRIB' | 'ISHA' | 'JUMA')[];
    remarks?: string;
  }) => Promise<void>;
  onApplyLeave?: (data: any) => Promise<void>;
  onUpdateLeaveStatus?: (leaveId: string, status: StaffLeaveStatus) => Promise<void>;
  onAddAdvance?: (data: any) => Promise<void>;
  language: Language;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  staffList = [],
  staffPayments = [],
  accounts = [],
  currentMosque,
  onAddStaff,
  onUpdateStaff,
  onDeleteStaff,
  onPayStaff,
  onLogAttendance,
  onApplyLeave,
  onUpdateLeaveStatus,
  onAddAdvance,
  language = 'bn',
}) => {
  const [activeSection, setActiveSection] = useState<StaffSubSection>('staff-directory');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [selectedProfileStaff, setSelectedProfileStaff] = useState<Staff | null>(null);

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [payStaffId, setPayStaffId] = useState<string | undefined>(undefined);

  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advanceStaffId, setAdvanceStaffId] = useState<string | undefined>(undefined);

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveStaffId, setLeaveStaffId] = useState<string | undefined>(undefined);

  const [isSalarySlipModalOpen, setIsSalarySlipModalOpen] = useState(false);
  const [selectedSlipPayment, setSelectedSlipPayment] = useState<StaffPayment | null>(null);
  const [selectedSlipStaff, setSelectedSlipStaff] = useState<Staff | null>(null);

  const [isResolutionModalOpen, setIsResolutionModalOpen] = useState(false);
  const [resolutionPaymentId, setResolutionPaymentId] = useState<string | undefined>(undefined);
  const [resolutionMonth, setResolutionMonth] = useState<string | undefined>(undefined);

  const handleOpenResolution = (paymentId?: string, month?: string) => {
    setResolutionPaymentId(paymentId);
    setResolutionMonth(month);
    setIsResolutionModalOpen(true);
  };

  // Counts for secondary sidebar badges
  const totalStaffCount = staffList.length;
  const activeStaffCount = staffList.filter((s) => s.status === 'ACTIVE').length;
  const pendingLeavesCount = staffList.reduce((sum, s) => {
    return sum + (s.leaveRecords || []).filter((l) => l.status === 'PENDING').length;
  }, 0);
  const activeAdvancesCount = staffList.reduce((sum, s) => {
    return sum + (s.advanceRecords || []).filter((a) => a.status === 'ACTIVE').length;
  }, 0);

  // Handlers
  const handleAddNewStaff = () => {
    setEditingStaff(null);
    setIsFormModalOpen(true);
  };

  const handleEditStaff = (staff: Staff) => {
    setEditingStaff(staff);
    setIsFormModalOpen(true);
  };

  const handleViewProfile = (staff: Staff) => {
    setSelectedProfileStaff(staff);
    setIsProfileModalOpen(true);
  };

  const handleOpenPay = (staffId: string) => {
    setPayStaffId(staffId);
    setIsPaymentModalOpen(true);
  };

  const handleOpenAdvance = (staffId?: string) => {
    setAdvanceStaffId(staffId);
    setIsAdvanceModalOpen(true);
  };

  const handleOpenLeave = (staffId?: string) => {
    setLeaveStaffId(staffId);
    setIsLeaveModalOpen(true);
  };

  const handlePrintSlip = (payment: StaffPayment, staff: Staff) => {
    setSelectedSlipPayment(payment);
    setSelectedSlipStaff(staff);
    setIsSalarySlipModalOpen(true);
  };

  // Safe wrapper for logging attendance
  const handleAttendanceLog = async (data: any) => {
    if (onLogAttendance) {
      await onLogAttendance(data);
    } else {
      const target = staffList.find((s) => s.id === data.staffId);
      if (target) {
        const existingRecords = target.attendanceRecords || [];
        const existingIdx = existingRecords.findIndex((r) => r.date === data.date);
        let updatedRecords;
        if (existingIdx >= 0) {
          updatedRecords = existingRecords.map((r, idx) => (idx === existingIdx ? { ...r, ...data } : r));
        } else {
          updatedRecords = [...existingRecords, { id: `att_${Date.now()}`, ...data }];
        }
        await onUpdateStaff(target.id, { attendanceRecords: updatedRecords });
      }
    }
  };

  // Safe wrapper for leave status change
  const handleLeaveStatusUpdate = async (leaveId: string, status: StaffLeaveStatus) => {
    if (onUpdateLeaveStatus) {
      await onUpdateLeaveStatus(leaveId, status);
    } else {
      for (const s of staffList) {
        const hasLeave = (s.leaveRecords || []).some((l) => l.id === leaveId);
        if (hasLeave) {
          const updated = (s.leaveRecords || []).map((l) =>
            l.id === leaveId ? { ...l, status, approvedAt: new Date().toISOString() } : l
          );
          await onUpdateStaff(s.id, { leaveRecords: updated });
          break;
        }
      }
    }
  };

  // Submit new leave
  const handleLeaveSubmit = async (data: any) => {
    if (onApplyLeave) {
      await onApplyLeave(data);
    } else {
      const target = staffList.find((s) => s.id === data.staffId);
      if (target) {
        const newRecord = {
          id: `leave_${Date.now()}`,
          staffId: data.staffId,
          staffName: target.fullNameBn || target.name,
          designationBn: target.designationBn,
          leaveType: data.leaveType,
          leaveTypeBn:
            data.leaveType === 'CASUAL'
              ? 'নৈমিত্তিক ছুটি'
              : data.leaveType === 'SICK'
              ? 'অসুস্থতাজনিত ছুটি'
              : data.leaveType === 'EMERGENCY'
              ? 'জরুরি ছুটি'
              : 'বার্ষিক ছুটি',
          startDate: data.startDate,
          endDate: data.endDate,
          daysCount: data.daysCount,
          reason: data.reason || '',
          emergencyContact: data.emergencyContact || '',
          appliedDate: new Date().toISOString().split('T')[0],
          status: data.autoApprove ? 'APPROVED' : 'PENDING',
        };
        const updated = [...(target.leaveRecords || []), newRecord];
        await onUpdateStaff(target.id, { leaveRecords: updated });
      }
    }
    setIsLeaveModalOpen(false);
  };

  // Submit new advance
  const handleAdvanceSubmit = async (data: any) => {
    if (onAddAdvance) {
      await onAddAdvance(data);
    } else {
      const target = staffList.find((s) => s.id === data.staffId);
      if (target) {
        const newRecord = {
          id: `adv_${Date.now()}`,
          staffId: data.staffId,
          staffName: target.fullNameBn || target.name,
          designationBn: target.designationBn,
          amount: Number(data.amount),
          advanceDate: data.advanceDate,
          reason: data.reason || '',
          outstandingAmount: Number(data.amount),
          adjustedAmount: 0,
          status: 'ACTIVE' as const,
          voucherNumber: `ADV-${Date.now().toString().substring(7)}`,
        };
        const updated = [...(target.advanceRecords || []), newRecord];
        const newBalance = (target.advanceBalance || 0) + Number(data.amount);
        await onUpdateStaff(target.id, {
          advanceRecords: updated,
          advanceBalance: newBalance,
        });
      }
    }
    setIsAdvanceModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 w-full max-w-7xl mx-auto px-2 sm:px-4 py-4">
      {/* 1. Left Secondary Sidebar */}
      <div className="w-full lg:w-64 shrink-0">
        <div className="lg:sticky lg:top-20">
          <StaffSecondarySidebar
            activeSection={activeSection}
            onSelectSection={setActiveSection}
            staffList={staffList}
            totalStaffCount={totalStaffCount}
            activeStaffCount={activeStaffCount}
            pendingLeavesCount={pendingLeavesCount}
            activeAdvancesCount={activeAdvancesCount}
            language={language}
          />
        </div>
      </div>

      {/* 2. Main Work Area according to active sub-tab */}
      <div className="flex-1 min-w-0">
        {activeSection === 'staff-directory' && (
          <StaffDirectorySection
            staffList={staffList}
            staffPayments={staffPayments}
            onAddNewStaff={handleAddNewStaff}
            onViewStaffProfile={handleViewProfile}
            onEditStaff={handleEditStaff}
            onPaySalary={handleOpenPay}
            onOpenAdvance={handleOpenAdvance}
            onOpenLeave={handleOpenLeave}
            onOpenAttendance={(id) => setActiveSection('attendance')}
            language={language}
          />
        )}

        {activeSection === 'master-register' && (
          <StaffMasterRegisterSection
            staffList={staffList}
            currentMosque={currentMosque}
            onViewStaffProfile={handleViewProfile}
            language={language}
          />
        )}

        {activeSection === 'attendance' && (
          <StaffAttendanceSection
            staffList={staffList}
            currentMosque={currentMosque}
            onLogAttendance={handleAttendanceLog}
            language={language}
          />
        )}

        {activeSection === 'leaves' && (
          <StaffLeaveSection
            staffList={staffList}
            onOpenNewLeaveModal={() => handleOpenLeave()}
            onUpdateLeaveStatus={handleLeaveStatusUpdate}
            language={language}
          />
        )}

        {activeSection === 'salary-disbursement' && (
          <StaffSalaryDisbursementSection
            staffList={staffList}
            staffPayments={staffPayments}
            accounts={accounts}
            currentMosque={currentMosque}
            onOpenPayModal={handleOpenPay}
            onPrintSlip={handlePrintSlip}
            onOpenResolutionModal={handleOpenResolution}
            language={language}
          />
        )}

        {activeSection === 'festival-allowance' && (
          <StaffFestivalAllowanceSection
            staffList={staffList}
            staffPayments={staffPayments}
            accounts={accounts}
            onOpenFestivalModal={() => handleOpenPay(staffList[0]?.id || '')}
            language={language}
          />
        )}

        {activeSection === 'advance-loans' && (
          <StaffAdvanceLoanSection
            staffList={staffList}
            accounts={accounts}
            onOpenAdvanceModal={handleOpenAdvance}
            language={language}
          />
        )}

        {activeSection === 'bank-transfer' && (
          <StaffBankTransferSection
            staffList={staffList}
            staffPayments={staffPayments}
            accounts={accounts}
            currentMosque={currentMosque}
            onOpenPayModal={handleOpenPay}
            onNavigateToLetter={() => setActiveSection('bank-letter')}
            language={language}
          />
        )}

        {activeSection === 'bank-letter' && (
          <StaffBankLetterSection
            staffList={staffList}
            currentMosque={currentMosque}
            language={language}
          />
        )}

        {activeSection === 'reports' && (
          <StaffReportsSection
            staffList={staffList}
            staffPayments={staffPayments}
            currentMosque={currentMosque}
            language={language}
          />
        )}
      </div>

      {/* 3. Central Modals */}

      {/* Central Employee 360 Profile Modal */}
      <StaffPersonnelProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setSelectedProfileStaff(null);
        }}
        staff={selectedProfileStaff}
        staffPayments={staffPayments}
        onEditStaff={(s) => {
          setIsProfileModalOpen(false);
          handleEditStaff(s);
        }}
        onPaySalary={(sId) => {
          setIsProfileModalOpen(false);
          handleOpenPay(sId);
        }}
        onUpdateStaff={onUpdateStaff}
        language={language}
      />

      {/* Create / Edit Staff Form Modal */}
      <StaffFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingStaff(null);
        }}
        staff={editingStaff}
        staffList={staffList}
        onSubmit={async (data) => {
          if (editingStaff) {
            await onUpdateStaff(editingStaff.id, data);
          } else {
            await onAddStaff(data);
          }
          setIsFormModalOpen(false);
          setEditingStaff(null);
        }}
        language={language}
      />

      {/* Salary Payment Modal */}
      <StaffPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => {
          setIsPaymentModalOpen(false);
          setPayStaffId(undefined);
        }}
        staffList={staffList}
        staffPayments={staffPayments}
        accounts={accounts}
        initialStaffId={payStaffId}
        onPayStaff={async (data) => {
          await onPayStaff(data);
          setIsPaymentModalOpen(false);
          setPayStaffId(undefined);
        }}
        language={language}
      />

      {/* Advance Modal */}
      <StaffAdvanceModal
        isOpen={isAdvanceModalOpen}
        onClose={() => {
          setIsAdvanceModalOpen(false);
          setAdvanceStaffId(undefined);
        }}
        staffList={staffList}
        preselectedStaffId={advanceStaffId}
        accounts={accounts}
        onSubmit={handleAdvanceSubmit}
        language={language}
      />

      {/* Leave Modal */}
      <StaffLeaveModal
        isOpen={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          setLeaveStaffId(undefined);
        }}
        staffList={staffList}
        preselectedStaffId={leaveStaffId}
        onSubmit={handleLeaveSubmit}
        language={language}
      />

      {/* Salary Slip Modal */}
      {selectedSlipPayment && selectedSlipStaff && (
        <StaffSalarySlipModal
          isOpen={isSalarySlipModalOpen}
          onClose={() => {
            setIsSalarySlipModalOpen(false);
            setSelectedSlipPayment(null);
            setSelectedSlipStaff(null);
          }}
          payment={selectedSlipPayment}
          staff={selectedSlipStaff}
          mosque={currentMosque}
          language={language}
        />
      )}

      {/* Cash Salary Resolution Modal with Letterhead Toggle */}
      <CashSalaryResolutionModal
        isOpen={isResolutionModalOpen}
        onClose={() => {
          setIsResolutionModalOpen(false);
          setResolutionPaymentId(undefined);
          setResolutionMonth(undefined);
        }}
        staffList={staffList}
        staffPayments={staffPayments}
        accounts={accounts}
        initialPaymentId={resolutionPaymentId}
        initialMonth={resolutionMonth}
        currentMosque={currentMosque}
        onPayStaff={onPayStaff}
        language={language}
      />
    </div>
  );
};
