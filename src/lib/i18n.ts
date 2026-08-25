export type Language = 'bn' | 'en';

export const translations = {
  bn: {
    appName: 'মসজিদলেজার',
    tagline: 'স্মার্ট মসজিদ ব্যবস্থাপনা ও হিসাবরক্ষণ',
    // Navigation
    dashboard: 'ড্যাশবোর্ড',
    financials: 'আর্থিক ব্যবস্থাপনা',
    income: 'আয় ও প্রাপ্তি',
    expense: 'ব্যয় ও পরিশোধ',
    donations: 'দান ও অনুদান',
    donationBox: 'দানবাক্স কালেকশন',
    cashbook: 'ক্যাশ বুক (নগদ হিসাব)',
    bankAccounts: 'ব্যাংক হিসাব',
    accountsList: 'হিসাবসমূহ',
    accountHeads: 'আয়-ব্যয় খাত (হেড)',
    committee: 'কমিটি ব্যবস্থাপনা',
    currentCommittee: 'বর্তমান কমিটি',
    committeeTerms: 'কমিটির মেয়াদকাল',
    members: 'সদস্যবৃন্দ',
    meetings: 'মিটিং ও কার্যবিবরণী',
    resolutions: 'সিদ্ধান্ত ও রেজোলিউশন',
    management: 'সাধারণ ব্যবস্থাপনা',
    staff: 'ইমাম ও স্টাফ',
    assets: 'সম্পদ ও সরঞ্জাম',
    property: 'ওয়াকফ ও জমিজমা',
    cemetery: 'কবরস্থান রেজিস্টার',
    notices: 'নোটিশ বোর্ড',
    reports: 'রিপোর্ট সেন্টার',
    admin: 'প্রশাসন ও সেটিংস',
    users: 'ব্যবহারকারী ও রোল',
    mosqueSettings: 'মসজিদ সেটিংস',
    qrSettings: 'অনলাইন ও কিউআর দান',
    auditLogs: 'অডিট লগ',
    aiAdvisor: 'এআই আর্থিক বিশ্লেষক',
    publicPortal: 'পাবলিক পেজ',

    // Financial Cards
    currentBalance: 'বর্তমান মোট স্থিতি',
    totalIncome: 'মোট আদায়/আয়',
    totalExpense: 'মোট খরচ/ব্যয়',
    netBalance: 'নিট ব্যালেন্স',
    todayIncome: 'আজকের আয়',
    todayExpense: 'আজকের ব্যয়',
    monthlyIncome: 'চলতি মাসের আয়',
    monthlyExpense: 'চলতি মাসের ব্যয়',
    cashBalance: 'নগদ ক্যাশ ব্যালেন্স',
    bankBalance: 'ব্যাংক ব্যালেন্স',
    pendingApprovals: 'অনুমোদনের অপেক্ষায়',

    // Actions & Buttons
    addIncome: 'নতুন আয় যোগ',
    addExpense: 'নতুন ব্যয় যোগ',
    addDonation: 'অনুদান গ্রহণ',
    newCollection: 'দানবাক্স কালেকশন',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    edit: 'সম্পাদনা',
    delete: 'মুছে ফেলুন',
    approve: 'অনুমোদন করুন',
    reject: 'প্রত্যাখ্যান করুন',
    reverse: 'রিভার্সাল/বাতিল করুন',
    viewDetails: 'বিস্তারিত দেখুন',
    printReceipt: 'রসিদ প্রিন্ট',
    printVoucher: 'ভাউচার প্রিন্ট',
    exportPdf: 'PDF ডাউনলোড',
    exportCsv: 'CSV এক্সপোর্ট',
    filter: 'ফিল্টার',
    search: 'অনুসন্ধান করুন...',
    reset: 'রিসেট',
    close: 'বন্ধ করুন',
    confirm: 'নিশ্চিত করুন',
    download: 'ডাউনলোড',
    copyLink: 'লিংক কপি করুন',

    // Form Labels
    voucherNumber: 'ভাউচার নম্বর',
    receiptNumber: 'রসিদ নম্বর',
    date: 'তারিখ',
    mainHead: 'প্রধান খাত (Main Head)',
    subHead: 'উপ-খাত (Sub Head)',
    amount: 'পরিমাণ (টাকা)',
    paymentMethod: 'পরিশোধের মাধ্যম',
    account: 'জমা/খরচের হিসাব (Account)',
    donorName: 'দাতার নাম',
    donorPhone: 'দাতার মোবাইল নম্বর',
    payeeName: 'প্রাপকের নাম',
    reference: 'রেফারেন্স / স্লিপ নং',
    description: 'বিবরণ ও মন্তব্য',
    status: 'অবস্থা',
    actions: 'অ্যাকশন',

    // Statuses
    DRAFT: 'খসড়া',
    PENDING: 'অপেক্ষমাণ',
    APPROVED: 'অনুমোদিত',
    REJECTED: 'প্রত্যাখ্যাত',
    CANCELLED: 'বাতিলকৃত',
    ACTIVE: 'সক্রিয়',
    INACTIVE: 'নিষ্ক্রিয়',
    UPCOMING: 'আসন্ন',
    EXPIRED: 'মেয়াদোত্তীর্ণ',

    // Payment Methods
    CASH: 'নগদ (Cash)',
    BANK: 'ব্যাংক চেক/ট্রান্সফার',
    BKASH: 'বিকাশ (bKash)',
    NAGAD: 'নগদ (Nagad)',
    ROCKET: 'রকেট (Rocket)',
    CARD: 'ডেবিট/ক্রেডিট কার্ড',
    ONLINE: 'অনলাইন পেমেন্ট',
    OTHER: 'অন্যান্য',

    // Roles
    SUPER_ADMIN: 'সুপার অ্যাডমিন',
    MOSQUE_ADMIN: 'মসজিদ অ্যাডমিন',
    ACCOUNTANT: 'হিসাবরক্ষক (Accountant)',
    COMMITTEE_ADMIN: 'কমিটি অ্যাডমিন',
    TREASURER: 'ক্যাশিয়ার / কোষাধ্যক্ষ',
    DATA_ENTRY_OPERATOR: 'ডাটা এন্ট্রি অপারেটর',
    AUDITOR: 'অডিটর',
    VIEWER: 'পর্যবেক্ষক (Viewer)',

    // Alerts and messages
    successSaved: 'সফলভাবে সংরক্ষিত হয়েছে।',
    successApproved: 'ভাউচার সফলভাবে অনুমোদিত হয়েছে।',
    successRejected: 'ভাউচার প্রত্যাখ্যান করা হয়েছে।',
    amountMustBePositive: 'এই পরিমাণ অবশ্যই শূন্যের চেয়ে বেশি হতে হবে।',
    requiredField: 'এই তথ্যটি দেওয়া আবশ্যক।',
    noDataFound: 'কোনো তথ্য পাওয়া যায়নি।',
  },
  en: {
    appName: 'MasjidLedger',
    tagline: 'Smart Mosque Management & Accounting',
    // Navigation
    dashboard: 'Dashboard',
    financials: 'Financial Management',
    income: 'Income & Receipts',
    expense: 'Expenses & Payments',
    donations: 'Donations & Grants',
    donationBox: 'Donation Box Collections',
    cashbook: 'Cashbook (Cash Ledger)',
    bankAccounts: 'Bank Accounts',
    accountsList: 'Accounts List',
    accountHeads: 'Account Heads (Chart)',
    committee: 'Committee Management',
    currentCommittee: 'Current Committee',
    committeeTerms: 'Committee Terms',
    members: 'Members',
    meetings: 'Meetings & Minutes',
    resolutions: 'Decisions & Resolutions',
    management: 'General Management',
    staff: 'Imam & Staff',
    assets: 'Assets & Equipment',
    property: 'Waqf & Properties',
    cemetery: 'Cemetery Register',
    notices: 'Notice Board',
    reports: 'Report Center',
    admin: 'Admin & Settings',
    users: 'Users & Roles',
    mosqueSettings: 'Mosque Settings',
    qrSettings: 'Online & QR Donation',
    auditLogs: 'Audit Logs',
    aiAdvisor: 'AI Financial Advisor',
    publicPortal: 'Public Page',

    // Financial Cards
    currentBalance: 'Current Total Balance',
    totalIncome: 'Total Income',
    totalExpense: 'Total Expenses',
    netBalance: 'Net Balance',
    todayIncome: "Today's Income",
    todayExpense: "Today's Expense",
    monthlyIncome: 'Monthly Income',
    monthlyExpense: 'Monthly Expense',
    cashBalance: 'Cash Balance',
    bankBalance: 'Bank Balance',
    pendingApprovals: 'Pending Approvals',

    // Actions & Buttons
    addIncome: 'Add Income',
    addExpense: 'Add Expense',
    addDonation: 'Receive Donation',
    newCollection: 'Collect Box Cash',
    save: 'Save Changes',
    cancel: 'Cancel',
    edit: 'Edit',
    delete: 'Delete',
    approve: 'Approve',
    reject: 'Reject',
    reverse: 'Reverse / Cancel',
    viewDetails: 'View Details',
    printReceipt: 'Print Receipt',
    printVoucher: 'Print Voucher',
    exportPdf: 'Export PDF',
    exportCsv: 'Export CSV',
    filter: 'Filter',
    search: 'Search...',
    reset: 'Reset',
    close: 'Close',
    confirm: 'Confirm',
    download: 'Download',
    copyLink: 'Copy Link',

    // Form Labels
    voucherNumber: 'Voucher No.',
    receiptNumber: 'Receipt No.',
    date: 'Date',
    mainHead: 'Main Head',
    subHead: 'Sub Head',
    amount: 'Amount (BDT)',
    paymentMethod: 'Payment Method',
    account: 'Deposit / Expense Account',
    donorName: 'Donor Name',
    donorPhone: 'Donor Phone',
    payeeName: 'Payee Name',
    reference: 'Reference / Slip No.',
    description: 'Description & Notes',
    status: 'Status',
    actions: 'Actions',

    // Statuses
    DRAFT: 'Draft',
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
    ACTIVE: 'Active',
    INACTIVE: 'Inactive',
    UPCOMING: 'Upcoming',
    EXPIRED: 'Expired',

    // Payment Methods
    CASH: 'Cash',
    BANK: 'Bank Check/Transfer',
    BKASH: 'bKash',
    NAGAD: 'Nagad',
    ROCKET: 'Rocket',
    CARD: 'Debit/Credit Card',
    ONLINE: 'Online Payment',
    OTHER: 'Other',

    // Roles
    SUPER_ADMIN: 'Super Admin',
    MOSQUE_ADMIN: 'Mosque Admin',
    ACCOUNTANT: 'Accountant',
    COMMITTEE_ADMIN: 'Committee Admin',
    TREASURER: 'Treasurer / Cashier',
    DATA_ENTRY_OPERATOR: 'Data Entry Operator',
    AUDITOR: 'Auditor',
    VIEWER: 'Viewer',

    // Alerts and messages
    successSaved: 'Successfully saved.',
    successApproved: 'Voucher approved successfully.',
    successRejected: 'Voucher rejected.',
    amountMustBePositive: 'Amount must be greater than zero.',
    requiredField: 'This field is required.',
    noDataFound: 'No records found.',
  },
};

export function formatCurrency(amount: number, lang: Language | string = 'bn'): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(amount || 0);

  if (lang === 'bn') {
    return `৳ ${formatted}`;
  }
  return `BDT ${formatted}`;
}

export function formatDate(dateString: string, lang: Language | string = 'bn'): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
}
