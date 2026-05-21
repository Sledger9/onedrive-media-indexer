import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const CLIENT_SECRET = process.env.MICROSOFT_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/onedrive/callback` : 'http://localhost:3000/api/auth/onedrive/callback';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return NextResponse.json({ error: 'MICROSOFT_CLIENT_ID or MICROSOFT_CLIENT_SECRET is missing' }, { status: 500 });
  }

  try {
    // Exchange the authorization code for access & refresh tokens
    const response = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error_description || data.error);
    }

    // Save the refresh token to the database
    if (data.refresh_token) {
      await db.execute({
        sql: `INSERT INTO system_settings (key, token_value) VALUES ('onedrive_refresh_token', ?) 
              ON CONFLICT(key) DO UPDATE SET token_value = ?`,
        args: [data.refresh_token, data.refresh_token],
      });
    }

    // Redirect the user back to the dashboard with a success message
    return NextResponse.redirect(new URL('/?onedrive=connected', request.url));
  } catch (err: any) {
    console.error('[ONEDRIVE OAUTH]', err);
    return NextResponse.json({ error: 'Failed to connect OneDrive', details: err.message }, { status: 500 });
  }
}
