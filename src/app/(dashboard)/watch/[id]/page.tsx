import React from 'react';
import { db } from '@/lib/db';
import VideoPlayer from '@/components/video-player';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getDirectDownloadUrl } from '@/lib/onedrive';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function WatchPage({ params }: PageProps) {
  // Await params promise for Next.js 15 compliance
  const resolvedParams = await params;
  const { id } = resolvedParams;

  // 1. Fetch file properties directly from the Turso database
  const fileResult = await db.execute({
    sql: 'SELECT * FROM media_items WHERE id = ? AND is_directory = 0',
    args: [id],
  });

  if (fileResult.rows.length === 0) {
    redirect('/browse');
  }

  const row = fileResult.rows[0];

  // 2. Fetch user state (playback position and favorites)
  const userStateResult = await db.execute({
    sql: 'SELECT playback_position, is_favorite FROM user_states WHERE user_id = ? AND media_id = ?',
    args: ['admin', id],
  });

  const userState = userStateResult.rows[0] || { playback_position: 0, is_favorite: 0 };

  // Parse JSON tracks safely
  const audioTracks = row.audio_tracks ? JSON.parse(row.audio_tracks as string) : [];
  const subtitleTracks = row.subtitle_tracks ? JSON.parse(row.subtitle_tracks as string) : [];

  // Fetch Direct Download Link directly from Microsoft Graph API
  const streamUrl = await getDirectDownloadUrl(row.id as string);
  const downloadUrl = streamUrl; // The direct link can also be used to download

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <VideoPlayer
        fileId={row.id as string}
        fileName={row.name as string}
        initialPlaybackPosition={Number(userState.playback_position || 0)}
        audioTracks={audioTracks}
        subtitleTracks={subtitleTracks}
        isFavorite={Number(userState.is_favorite) === 1}
        directLink={row.direct_link as string}
        streamUrl={streamUrl}
        playlistUrl={streamUrl}
        downloadUrl={downloadUrl}
      />
    </div>
  );
}
