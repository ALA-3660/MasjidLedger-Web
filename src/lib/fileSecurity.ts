/**
 * Centralized File Security & Type Policy
 * 
 * Enforces allowed document formats and blocks executable or hazardous file payloads.
 */

export const MAX_DIRECT_FILE_SIZE_BYTES = 12 * 1024 * 1024; // 12 MB

export const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',
  // Images
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  // Spreadsheets
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  // Documents
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
];

export const FORBIDDEN_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'scr', 'vbs', 'js', 'mjs', 'jar', 'apk', 'bin', 'sh', 'app', 'msi', 'com', 'pif'
];

export interface FileValidationResult {
  isValid: boolean;
  errorMessageBn?: string;
  sanitizedFileName?: string;
  sizeBytes?: number;
}

/**
 * Validates a file before upload
 */
export function validateUploadedFile(file: File): FileValidationResult {
  if (!file) {
    return { isValid: false, errorMessageBn: 'কোনো ফাইল নির্বাচন করা হয়নি।' };
  }

  const nameParts = file.name.split('.');
  const ext = (nameParts.length > 1 ? nameParts[nameParts.length - 1] : '').toLowerCase();

  // 1. Forbidden Executable Check
  if (FORBIDDEN_EXTENSIONS.includes(ext)) {
    return {
      isValid: false,
      errorMessageBn: `.${ext} এক্সিকিউটেবল বা অনিরাপদ ফাইল আপলোড করা সম্পূর্ণ নিষিদ্ধ।`,
    };
  }

  // 2. Size limit check
  if (file.size > MAX_DIRECT_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      errorMessageBn: 'ফাইলের আকার সর্বোচ্চ ১২ মেগাবাইট (12MB) হতে পারবে। বড় ফাইলের ক্ষেত্রে Google Drive লিংক যুক্ত করুন।',
    };
  }

  // 3. Sanitized name
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_ \u0980-\u09FF]/g, '_');

  return {
    isValid: true,
    sanitizedFileName,
    sizeBytes: file.size,
  };
}

/**
 * Format bytes to readable Bengali string
 */
export function formatFileSizeBn(bytes?: number): string {
  if (!bytes || bytes === 0) return '০ B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
