/**
 * Google Drive Service Layer
 * Handles authentication via Firebase Auth (GoogleAuthProvider with Workspace OAuth scopes),
 * secure file uploads (encrypted backups, PDF reports, and CSV exports),
 * listing, and downloading files via Google Drive REST API.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const SCOPES = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
];

const DRIVE_AUTH_APP_NAME = 'masjidledger-drive-oauth';

function getDriveFirebaseAuth() {
  const existing = getApps().find((a) => a.name === DRIVE_AUTH_APP_NAME);
  const app = existing || initializeApp(firebaseConfig, DRIVE_AUTH_APP_NAME);
  return getAuth(app);
}

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));
provider.setCustomParameters({ prompt: 'select_account' });

// Flag to indicate if we are in the middle of a sign-in flow.
let isSigningIn = false;
// Cache the access token in memory (never in localStorage/sessionStorage).
let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  const auth = getDriveFirebaseAuth();
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      cachedUser = user;
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedUser = null;
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const auth = getDriveFirebaseAuth();
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('গুগল অ্যাকাউন্ট থেকে অ্যাক্সেস টোকেন পাওয়া যায়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }

    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Drive Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logoutDriveAuth = async () => {
  const auth = getDriveFirebaseAuth();
  await auth.signOut();
  cachedAccessToken = null;
  cachedUser = null;
};

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  webViewLink?: string;
}

export class GoogleDriveService {
  private static instance: GoogleDriveService;
  private onSuccessCallback: ((token: string, user?: User | null) => void) | null = null;
  private onErrorCallback: ((err: any) => void) | null = null;

  private constructor() {}

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Register callbacks for interactive Google Drive sign-in
   */
  public initClient(
    onSuccess: (token: string, user?: User | null) => void,
    onError?: (err: any) => void
  ): boolean {
    this.onSuccessCallback = onSuccess;
    this.onErrorCallback = onError || null;
    return true;
  }

  /**
   * Request access token interactively via Firebase GoogleAuthProvider popup
   */
  public async requestAccessToken(): Promise<void> {
    try {
      const res = await googleSignIn();
      if (res && res.accessToken) {
        if (this.onSuccessCallback) {
          this.onSuccessCallback(res.accessToken, res.user);
        }
      }
    } catch (err) {
      if (this.onErrorCallback) {
        this.onErrorCallback(err);
      }
    }
  }

  public setAccessToken(token: string | null): void {
    cachedAccessToken = token;
  }

  public getAccessToken(): string | null {
    return cachedAccessToken;
  }

  public getConnectedUser(): User | null {
    return cachedUser;
  }

  public async signOut(): Promise<void> {
    await logoutDriveAuth();
  }

  /**
   * Upload encrypted backup, PDF report, or CSV export securely to Google Drive
   */
  public async uploadReport(
    fileContent: string | Blob | ArrayBuffer,
    fileName: string,
    mimeType: 'application/pdf' | 'text/csv' | 'application/json',
    folderId?: string
  ): Promise<DriveFileItem> {
    if (!cachedAccessToken) {
      throw new Error('Google Drive access token is missing. Please authenticate first.');
    }

    const metadata: any = {
      name: fileName,
      mimeType,
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: mimeType }));

    const response = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
        },
        body: form,
      }
    );

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error?.message || `Failed to upload file to Google Drive (${response.status})`
      );
    }

    return await response.json();
  }

  /**
   * List stored reports (PDFs, CSVs, or Backups) from Google Drive
   */
  public async listReports(searchQuery?: string): Promise<DriveFileItem[]> {
    if (!cachedAccessToken) {
      throw new Error('Google Drive access token is missing.');
    }

    const queryPart = searchQuery
      ? `name contains '${searchQuery}' and trashed=false`
      : `(mimeType = 'application/pdf' or mimeType = 'text/csv' or name contains 'MasjidLedger') and trashed=false`;

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      queryPart
    )}&orderBy=createdTime desc&fields=files(id,name,mimeType,createdTime,size,webViewLink)`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(
        errJson.error?.message || 'Failed to list files from Google Drive.'
      );
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Download file content from Google Drive by File ID
   */
  public async downloadFile(fileId: string): Promise<Blob> {
    if (!cachedAccessToken) {
      throw new Error('Google Drive access token is missing.');
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${cachedAccessToken}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to download file from Google Drive.');
    }

    return await response.blob();
  }

  /**
   * Create a dedicated MasjidLedger folder in Google Drive if not exists
   */
  public async getOrCreateAppFolder(
    folderName: string = 'MasjidLedger_Reports'
  ): Promise<string> {
    if (!cachedAccessToken) {
      throw new Error('Google Drive access token is missing.');
    }

    // Search for folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${cachedAccessToken}` },
    });
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    const createData = await createRes.json();
    if (!createRes.ok) {
      throw new Error('Failed to create app folder in Google Drive.');
    }

    return createData.id;
  }
}

export const googleDriveService = GoogleDriveService.getInstance();
