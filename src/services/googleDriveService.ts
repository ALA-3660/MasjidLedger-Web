/**
 * Google Drive Service Layer
 * Handles authentication, secure file uploads (PDF reports and CSV exports),
 * listing, and downloading files via Google Drive REST API.
 */

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
  private tokenClient: any = null;
  private accessToken: string | null = null;

  private constructor() {}

  public static getInstance(): GoogleDriveService {
    if (!GoogleDriveService.instance) {
      GoogleDriveService.instance = new GoogleDriveService();
    }
    return GoogleDriveService.instance;
  }

  /**
   * Initialize Google Identity Services token client
   */
  public initClient(onSuccess: (token: string) => void, onError?: (err: any) => void): boolean {
    if (!(window as any).google || !(window as any).google.accounts) {
      console.warn('Google Identity Services script not loaded yet.');
      return false;
    }

    try {
      this.tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || 'DEFAULT_CLIENT_ID',
        scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (response && response.access_token) {
            this.accessToken = response.access_token;
            onSuccess(response.access_token);
          } else if (onError) {
            onError(response);
          }
        },
      });
      return true;
    } catch (err) {
      console.error('Failed to initialize Google token client:', err);
      if (onError) onError(err);
      return false;
    }
  }

  /**
   * Request access token interactively
   */
  public requestAccessToken(): void {
    if (this.tokenClient) {
      this.tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
      console.error('Google Drive token client not initialized.');
    }
  }

  public setAccessToken(token: string): void {
    this.accessToken = token;
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Upload PDF report or CSV export securely to Google Drive
   */
  public async uploadReport(
    fileContent: string | Blob | ArrayBuffer,
    fileName: string,
    mimeType: 'application/pdf' | 'text/csv' | 'application/json',
    folderId?: string
  ): Promise<DriveFileItem> {
    if (!this.accessToken) {
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

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: form,
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(errJson.error?.message || `Failed to upload file to Google Drive (${response.status})`);
    }

    return await response.json();
  }

  /**
   * List stored reports (PDFs, CSVs, or Backups) from Google Drive
   */
  public async listReports(searchQuery?: string): Promise<DriveFileItem[]> {
    if (!this.accessToken) {
      throw new Error('Google Drive access token is missing.');
    }

    const queryPart = searchQuery 
      ? `name contains '${searchQuery}' and trashed=false`
      : `(mimeType = 'application/pdf' or mimeType = 'text/csv' or name contains 'MasjidLedger') and trashed=false`;

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryPart)}&orderBy=createdTime desc&fields=files(id,name,mimeType,createdTime,size,webViewLink)`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to list files from Google Drive.');
    }

    const data = await response.json();
    return data.files || [];
  }

  /**
   * Download file content from Google Drive by File ID
   */
  public async downloadFile(fileId: string): Promise<Blob> {
    if (!this.accessToken) {
      throw new Error('Google Drive access token is missing.');
    }

    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download file from Google Drive.');
    }

    return await response.blob();
  }

  /**
   * Create a dedicated MasjidLedger folder in Google Drive if not exists
   */
  public async getOrCreateAppFolder(folderName: string = 'MasjidLedger_Reports'): Promise<string> {
    if (!this.accessToken) {
      throw new Error('Google Drive access token is missing.');
    }

    // Search for folder
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
    });
    const searchData = await searchRes.json();

    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    // Create folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
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
