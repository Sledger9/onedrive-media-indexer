import { NextResponse } from 'next/server';

const CLIENT_ID = process.env.MICROSOFT_CLIENT_ID;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/onedrive/callback` : 'http://localhost:3000/api/auth/onedrive/callback';

export async function GET() {
  if (!CLIENT_ID) {
    return NextResponse.json({ error: 'MICROSOFT_CLIENT_ID is not configured in .env' }, { status: 500 });
  }

  const scopes = ['Files.Read', 'Files.Read.All', 'offline_access'];
  
  const authUrl = new URL('https://login.microsoftonline.com/common/oauth2/v2.0/authorize');
  authUrl.searchParams.append('client_id', CLIENT_ID);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('response_mode', 'query');
  
  return NextResponse.redirect(authUrl.toString());
}
