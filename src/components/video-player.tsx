'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Heart,
  Loader2,
  Copy,
  Check,
  MonitorPlay,
  Download,
  Wifi,
  WifiOff,
  Radio,
  Languages,
  Subtitles,
  Info,
  ExternalLink,
} from 'lucide-react';

interface AudioTrack {
  index: number;
  language: string;
  codec: string;
  title?: string;
}

interface SubtitleTrack {
  index: number;
  language: string;
  codec: string;
  title?: string;
}

interface VideoPlayerProps {
  fileId: string;
  fileName: string;
  initialPlaybackPosition?: number;
  audioTracks: AudioTrack[];
  subtitleTracks: SubtitleTrack[];
  isFavorite?: boolean;
  directLink?: string;
  streamUrl: string;
  playlistUrl: string;
  downloadUrl: string;
}

export default function VideoPlayer({
  fileId,
  fileName,
  initialPlaybackPosition = 0,
  audioTracks = [],
  subtitleTracks = [],
  isFavorite = false,
  directLink,
  streamUrl,
  playlistUrl,
  downloadUrl,
}: VideoPlayerProps) {
  const router = useRouter();

  const [isFav, setIsFav] = useState(isFavorite);
  const [workerOnline, setWorkerOnline] = useState<boolean | null>(null);
  const [copiedStream, setCopiedStream] = useState(false);
  const [copiedDirect, setCopiedDirect] = useState(false);

  const WORKER_URL = process.env.NEXT_PUBLIC_WORKER_URL || 'http://localhost:3001';

  // Probe local worker health
  useEffect(() => {
    const checkWorker = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${WORKER_URL}/health`, { signal: controller.signal, mode: 'cors' });
        clearTimeout(timeoutId);
        setWorkerOnline(res.ok);
      } catch {
        setWorkerOnline(false);
      }
    };
    checkWorker();
  }, [WORKER_URL]);

  const getLanguageLabel = (langCode: string, title?: string) => {
    const langNames: Record<string, string> = {
      eng: 'English', spa: 'Spanish', fre: 'French', ger: 'German',
      ita: 'Italian', jpn: 'Japanese', chi: 'Chinese', kor: 'Korean',
      hin: 'Hindi', tel: 'Telugu', tam: 'Tamil', und: 'Unknown',
    };
    const name = langNames[langCode] || langCode.toUpperCase();
    return title ? `${name} — ${title}` : name;
  };

  const copyToClipboard = async (text: string, type: 'stream' | 'direct') => {
    await navigator.clipboard.writeText(text);
    if (type === 'stream') {
      setCopiedStream(true);
      setTimeout(() => setCopiedStream(false), 2000);
    } else {
      setCopiedDirect(true);
      setTimeout(() => setCopiedDirect(false), 2000);
    }
  };

  const handleToggleFavorite = async () => {
    try {
      await fetch('/api/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId: fileId, isFavorite: !isFav }),
      });
      setIsFav(!isFav);
    } catch (err) {
      console.error(err);
    }
  };

  // Open in VLC via vlc:// protocol (desktop only)
  const openInVLC = () => {
    // Build a vlc:// URL pointing to the raw stream endpoint (stripping http/https)
    const rawPath = streamUrl.replace(/^https?:\/\//, '');
    window.location.href = `vlc://${rawPath}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all font-semibold border border-white/5"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Worker status badge */}
          {workerOnline === null && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-xs font-bold text-yellow-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Checking Worker...
            </span>
          )}
          {workerOnline === true && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Worker Online — Stream Ready
            </span>
          )}
          {workerOnline === false && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
              <WifiOff className="w-3.5 h-3.5" />
              Worker Offline
            </span>
          )}

          <button
            onClick={handleToggleFavorite}
            className={`p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-slate-400 hover:text-amber-500 ${isFav ? 'text-amber-500 bg-amber-500/5' : ''}`}
          >
            <Heart className={`w-5 h-5 ${isFav ? 'fill-amber-500' : ''}`} />
          </button>
        </div>
      </div>

      {/* Hero card */}
      <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-gradient-to-br from-slate-900 via-slate-900/95 to-purple-950/40 shadow-2xl">
        {/* Background decorative glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 via-transparent to-blue-600/5 pointer-events-none" />

        <div className="relative p-8 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 mt-0.5 shrink-0">
                <MonitorPlay className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight leading-tight break-all">
                  {fileName}
                </h1>
                <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mt-1">
                  VLC Network Stream
                </p>
              </div>
            </div>
          </div>

          {/* VLC tip */}
          {audioTracks.length > 1 && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-purple-500/5 border border-purple-500/15 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
              <span>
                This file has <strong className="text-slate-300">{audioTracks.length} audio tracks</strong>.
                In VLC use <strong className="text-slate-300">Audio → Audio Track</strong> to switch between them.
              </span>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Stream URL section */}
          {workerOnline === true ? (
            <div className="space-y-4">
              {/* VLC stream URL */}
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <Radio className="w-3.5 h-3.5 text-green-400" />
                  VLC Network Stream URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-slate-300 overflow-hidden">
                    <Wifi className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="truncate">{streamUrl}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(streamUrl, 'stream')}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold shrink-0"
                    title="Copy stream URL"
                  >
                    {copiedStream ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Paste this into VLC → Media → Open Network Stream
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <a
                  href={playlistUrl}
                  download
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm transition-all shadow-lg hover:shadow-purple-500/25 border border-purple-500/30"
                >
                  <Download className="w-4 h-4" />
                  Download M3U for VLC
                </a>
                <button
                  onClick={openInVLC}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white font-bold text-sm transition-all border border-white/10"
                >
                  <MonitorPlay className="w-4 h-4" />
                  Open in VLC (Desktop)
                </button>
                <a
                  href={downloadUrl}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 hover:text-blue-200 font-bold text-sm transition-all border border-blue-500/30"
                >
                  <Download className="w-4 h-4" />
                  Download Original File
                </a>
              </div>

              {/* Instructions */}
              <div className="p-4 rounded-xl bg-black/30 border border-white/5 space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Info className="w-3.5 h-3.5 text-purple-400" />
                  How to stream in VLC
                </p>
                <ol className="space-y-1.5 text-xs text-slate-400">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">1.</span>
                    <span>Click <span className="text-white font-semibold">Download M3U for VLC</span> and open the downloaded file, <em>or</em></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">2.</span>
                    <span>Open VLC → <span className="text-white font-semibold">Media → Open Network Stream</span> → paste the URL above</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 font-bold shrink-0">3.</span>
                    <span>VLC will instantly start streaming with full audio track and subtitle support</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : workerOnline === false ? (
            <div className="space-y-4">
              {/* Worker offline — show direct link fallback */}
              <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <WifiOff className="w-4 h-4" />
                  Local Worker is Offline
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Start your local worker (<code className="text-purple-300">cd worker && npm run dev</code>) to enable VLC network streaming with audio track selection.
                </p>
              </div>

              {directLink && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    Direct OneDrive Link (Open in VLC)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-black/40 border border-white/10 font-mono text-xs text-slate-300 overflow-hidden">
                      <span className="truncate">{directLink}</span>
                    </div>
                    <button
                      onClick={() => copyToClipboard(directLink, 'direct')}
                      className="flex items-center gap-1.5 px-3 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all text-xs font-bold shrink-0"
                    >
                      {copiedDirect ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    This direct link plays the original file in VLC. No audio track selection — the worker is needed for that.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-semibold">Probing local worker connection...</span>
            </div>
          )}
        </div>
      </div>

      {/* Metadata panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Audio Tracks Info */}
        <div className="glass-panel border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Languages className="w-4 h-4 text-purple-400" />
            <h4 className="font-extrabold text-sm uppercase tracking-wider">Audio Tracks</h4>
          </div>
          {audioTracks.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium">No track metadata — sync library to scan</p>
          ) : (
            <div className="space-y-1.5">
              {audioTracks.map((track) => (
                <div
                  key={track.index}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs border bg-white/3 border-white/5 text-slate-400"
                >
                  <span className="font-semibold">{getLanguageLabel(track.language, track.title)}</span>
                  <span className="font-mono text-slate-500 bg-black/40 px-1.5 py-0.5 rounded">
                    {track.codec.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Subtitle Tracks Info */}
        <div className="glass-panel border-white/5 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 text-slate-300">
            <Subtitles className="w-4 h-4 text-purple-400" />
            <h4 className="font-extrabold text-sm uppercase tracking-wider">Subtitle Tracks</h4>
          </div>
          {subtitleTracks.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium">No embedded subtitles found</p>
          ) : (
            <div className="space-y-1.5">
              {subtitleTracks.map((track) => (
                <div
                  key={track.index}
                  className="flex items-center justify-between px-3 py-2 rounded-lg text-xs bg-white/3 border border-white/5 text-slate-400"
                >
                  <span className="font-semibold">{getLanguageLabel(track.language, track.title)}</span>
                  <span className="font-mono text-slate-500 bg-black/40 px-1.5 py-0.5 rounded">
                    {track.codec.toUpperCase()}
                  </span>
                </div>
              ))}
              <p className="text-[10px] text-slate-600 pt-1">
                VLC will load all embedded subtitle tracks automatically from the stream.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
