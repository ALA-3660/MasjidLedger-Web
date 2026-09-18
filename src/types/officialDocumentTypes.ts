import { DocumentVisibility } from './index';

export type OfficialDocumentType =
  | 'NOTICE'              // নোটিশ
  | 'APPLICATION'         // দরখাস্ত / আবেদন
  | 'ANNOUNCEMENT'          // ঘোষণা
  | 'OUTGOING_LETTER'     // প্রেরিত পত্র
  | 'INCOMING_LETTER'     // প্রাপ্ত পত্র
  | 'OFFICE_ORDER'        // অফিস আদেশ
  | 'CERTIFICATE'         // প্রত্যয়নপত্র / সনদ
  | 'RECOMMENDATION'      // সুপারিশপত্র
  | 'MEMO_REGISTER'       // স্মারক / পত্র রেজিস্টার
  | 'OTHER';

export type OfficialDocumentStatus =
  | 'DRAFT'               // খসড়া
  | 'PREPARED'            // প্রস্তুত
  | 'UNDER_REVIEW'        // যাচাইাধীন
  | 'PENDING_APPROVAL'    // অনুমোদনের অপেক্ষায়
  | 'APPROVED'            // অনুমোদিত
  | 'SENT'                // প্রেরিত
  | 'REPLY_AWAITED'       // উত্তর অপেক্ষমাণ
  | 'IN_PROGRESS'         // কার্যক্রম চলমান
  | 'RESOLVED'            // নিষ্পত্তি
  | 'CANCELLED'           // বাতিল
  | 'ARCHIVED';           // সংরক্ষিত

export type OfficialDocumentPriority = 'NORMAL' | 'URGENT' | 'HIGH';
export type OfficialDocumentVisibility = DocumentVisibility;
export type DocumentAttachment = DocumentAttachmentItem;

export interface DocumentSignatory {
  id: string;
  title: string;          // e.g. 'সভাপতি', 'সাধারণ সম্পাদক', 'হিসাবরক্ষক', 'খতিব / পেশ ইমাম'
  name?: string;
  designation?: string;
  signed?: boolean;
  signedAt?: string;
}

export interface DocumentAuditEntry {
  action: string;
  performedBy: string;
  performedByName: string;
  timestamp: string;
  notes?: string;
  previousStatus?: OfficialDocumentStatus;
  newStatus?: OfficialDocumentStatus;
}

export interface DocumentAttachmentItem {
  id: string;
  name: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  googleDriveUrl?: string;
  uploadedAt: string;
  uploadedBy: string;
  uploadedByName?: string;
}

export interface OfficialDocument {
  id: string;
  mosqueId: string;
  docType: OfficialDocumentType;
  subType?: string;       // Specific template sub-category e.g. 'MEETING_NOTICE', 'LEAVE_APPLICATION'
  
  // Identifiers & Numbers
  documentNumber: string; // e.g. 'নোটিশ/২০২৬/০০১' or 'স্মারক/২০২৬/০১২'
  memoNumber?: string;    // স্মারক নং
  applicationNumber?: string; // আবেদন নং
  serialNumber?: number;  // ক্রমিক নং
  referenceNumber?: string;

  // Header & Core Content
  title: string;          // বিষয় / শিরোনাম
  documentDate: string;   // YYYY-MM-DD
  effectiveDate?: string; // কার্যকর তারিখ
  timeStr?: string;       // সময়
  venueStr?: string;      // স্থান

  // Sender & Recipient
  senderName?: string;
  senderDesignation?: string;
  senderOrg?: string;
  senderAddress?: string;

  recipientName?: string;
  recipientDesignation?: string;
  recipientOrg?: string;
  recipientAddress?: string;
  recipientType?: 'ALL' | 'MEMBERS' | 'STAFF' | 'PUBLIC' | 'INDIVIDUAL' | 'GOV_OFFICE' | 'ORGANIZATION';

  // Body
  body: string;           // Formatted HTML / Text
  summary?: string;       // সারসংক্ষেপ

  // Tracking & Status
  status: OfficialDocumentStatus;
  priority?: OfficialDocumentPriority;
  visibility: DocumentVisibility;

  // Official Linking
  committeeTermId?: string;
  meetingId?: string;
  meetingTitle?: string;
  resolutionId?: string;
  resolutionNumber?: string;
  memberId?: string;
  memberName?: string;
  staffId?: string;
  staffName?: string;
  actionPlanId?: string;
  financialAccountId?: string;

  // Correspondence Specific
  dispatchMethod?: 'HAND_DELIVERY' | 'POST' | 'COURIER' | 'EMAIL' | 'SMS' | 'WHATSAPP';
  dispatchedAt?: string;
  dispatchedBy?: string;
  replyRequired?: boolean;
  replyDeadline?: string;
  replyReceivedAt?: string;
  replyDocumentId?: string;
  actionTaken?: string;
  resolvedAt?: string;

  // Specific Sub-type metadata
  certificateFor?: string;       // যার নামে সনদ
  certificateSubject?: string;   // সনদের বিষয়
  certificateRecipientNid?: string;
  recommendationFor?: string;     // যাকে সুপারিশ করা হচ্ছে
  recommendationReason?: string;
  officeOrderSubject?: string;
  announcementCategory?: string;

  // Presentation & Letterhead
  includeLetterhead: boolean;    // Default: true
  signatories: DocumentSignatory[];
  attachments: DocumentAttachmentItem[];
  
  // Metadata & Audit
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  auditTrail: DocumentAuditEntry[];
}

export interface OfficialDocumentTemplate {
  id: string;
  mosqueId?: string;
  name: string;
  docType: OfficialDocumentType;
  subType: string;
  titleTemplate?: string;
  defaultTitle?: string;
  bodyTemplate: string;
  placeholders: string[];
  defaultSignatories?: DocumentSignatory[];
  isDefault?: boolean;
  description?: string;
}

export interface DocumentNumberingConfig {
  prefix: string;
  yearFormat: 'YYYY' | 'YY';
  separator: string;
  serialLength: number;
  nextSerial: number;
}
