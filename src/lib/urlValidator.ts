/**
 * Google Drive and Cloud Storage URL Validator & Parser
 * 
 * Validates links from Google Drive, Google Docs, Sheets, Slides, and Forms.
 * Provides clear Bangla error messages for invalid formats.
 */

export interface GoogleDriveValidationResult {
  isValid: boolean;
  fileId?: string;
  linkType?: 'file' | 'folder' | 'document' | 'spreadsheet' | 'presentation' | 'form' | 'unknown';
  previewUrl?: string;
  errorMessageBn?: string;
}

const GOOGLE_DRIVE_PATTERNS = [
  /https?:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
  /https?:\/\/drive\.google\.com\/drive\/folders\/([a-zA-Z0-9_-]+)/i,
  /https?:\/\/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
  /https?:\/\/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/i,
  /https?:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/i,
  /https?:\/\/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/i,
  /https?:\/\/docs\.google\.com\/presentation\/d\/([a-zA-Z0-9_-]+)/i,
  /https?:\/\/docs\.google\.com\/forms\/d\/([a-zA-Z0-9_-]+)/i,
];

/**
 * Validates a Google Drive / Google Docs URL
 */
export function validateGoogleDriveUrl(url: string): GoogleDriveValidationResult {
  if (!url || !url.trim()) {
    return {
      isValid: false,
      errorMessageBn: 'অনুগ্রহ করে একটি গুগল ড্রাইভ লিংক প্রদান করুন।',
    };
  }

  const cleanUrl = url.trim();

  // Basic URL structure check
  try {
    const parsed = new URL(cleanUrl);
    if (!parsed.protocol.startsWith('http')) {
      return {
        isValid: false,
        errorMessageBn: 'লিংকটি অবশ্যই http:// বা https:// দিয়ে শুরু হতে হবে।',
      };
    }
  } catch (err) {
    return {
      isValid: false,
      errorMessageBn: 'একটি বৈধ ইন্টারনেট লিংক (URL) লিখুন।',
    };
  }

  // Google Host Check
  const isGoogleHost =
    cleanUrl.includes('drive.google.com') ||
    cleanUrl.includes('docs.google.com');

  if (!isGoogleHost) {
    return {
      isValid: false,
      errorMessageBn: 'লিংকটি drive.google.com অথবা docs.google.com ডোমেইনের হতে হবে।',
    };
  }

  let fileId: string | undefined;
  let linkType: GoogleDriveValidationResult['linkType'] = 'unknown';

  if (cleanUrl.includes('/folders/')) {
    linkType = 'folder';
    const match = cleanUrl.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  } else if (cleanUrl.includes('/document/d/')) {
    linkType = 'document';
    const match = cleanUrl.match(/\/document\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  } else if (cleanUrl.includes('/spreadsheets/d/')) {
    linkType = 'spreadsheet';
    const match = cleanUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  } else if (cleanUrl.includes('/presentation/d/')) {
    linkType = 'presentation';
    const match = cleanUrl.match(/\/presentation\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  } else if (cleanUrl.includes('/forms/d/')) {
    linkType = 'form';
    const match = cleanUrl.match(/\/forms\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
  } else {
    linkType = 'file';
    for (const pattern of GOOGLE_DRIVE_PATTERNS) {
      const match = cleanUrl.match(pattern);
      if (match && match[1]) {
        fileId = match[1];
        break;
      }
    }
  }

  const previewUrl = fileId
    ? `https://drive.google.com/file/d/${fileId}/preview`
    : cleanUrl;

  return {
    isValid: true,
    fileId,
    linkType,
    previewUrl,
  };
}
