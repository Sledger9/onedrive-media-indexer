import { db } from './db';

// Completely override ALL environment variables and hardcode rclone's known good credentials
const CLIENT_ID = 'b15665d9-eda6-4092-8539-0eec376afd59';
const CLIENT_SECRET = 'qtyfaBBYA403=unZUP40~_#';
const DRIVE_ID = 'b!pU5jbE08tEOljfeOSI0YEXN8cBbVbRNJkVAf_OmZuvmgn46YKAeEQaXBT1t3871G';

const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/onedrive/callback` : 'http://localhost:3000/api/auth/onedrive/callback';

export async function getOneDriveAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET is missing from .env');
  }

  // Retrieve the refresh token from the database
  const result = await db.execute("SELECT token_value FROM system_settings WHERE key = 'onedrive_refresh_token'");
  if (result.rows.length === 0) {
    throw new Error('No OneDrive refresh token found. Please connect your OneDrive in the dashboard.');
  }

  const refreshToken = result.rows[0].token_value as string;

  // Refresh the token via Microsoft OAuth
  const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: `client_id=${encodeURIComponent(CLIENT_ID)}&client_secret=${encodeURIComponent(CLIENT_SECRET)}&grant_type=refresh_token&refresh_token=${encodeURIComponent(refreshToken)}`,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Failed to refresh token: ${data.error_description || data.error}`);
  }

  // Update the refresh token if a new one was provided
  if (data.refresh_token && data.refresh_token !== refreshToken) {
    await db.execute({
      sql: "UPDATE system_settings SET token_value = ? WHERE key = 'onedrive_refresh_token'",
      args: [data.refresh_token],
    });
  }

  return data.access_token;
}

export async function getDirectDownloadUrl(driveItemId: string): Promise<string> {
  const accessToken = await getOneDriveAccessToken();

  const response = await fetch(`https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${driveItemId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch file from OneDrive');
  }

  const data = await response.json();
  const downloadUrl = data['@microsoft.graph.downloadUrl'];

  if (!downloadUrl) {
    throw new Error('OneDrive did not return a download URL');
  }

  return downloadUrl;
}

export interface OneDriveItem {
  id: string;
  name: string;
  size: number;
  folder?: any;
  file?: {
    mimeType: string;
  };
  lastModifiedDateTime: string;
  parentReference?: {
    path: string;
  };
  '@microsoft.graph.downloadUrl'?: string;
}

export async function getDriveItems(folderId: string = 'root'): Promise<OneDriveItem[]> {
  const accessToken = await getOneDriveAccessToken();
  let items: OneDriveItem[] = [];
  let nextLink = `https://graph.microsoft.com/v1.0/drives/${DRIVE_ID}/items/${folderId}/children?$top=200`;

  // Fetch all pages
  while (nextLink) {
    const response = await fetch(nextLink, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[ONEDRIVE] Microsoft Graph API Error:', errorText);
      throw new Error(`Failed to fetch items from OneDrive folder ${folderId}: ${errorText}`);
    }

    const data = await response.json();
    items = items.concat(data.value);
    nextLink = data['@odata.nextLink']; // Handle pagination
  }

  return items;
}
