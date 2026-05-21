'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  Film, 
  RefreshCw, 
  Clock, 
  Heart, 
  FolderOpen, 
  ArrowRight,
  Database,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  path: string;
  mimeType: string;
  size: number;
  duration?: number;
  resolution?: string;
  playbackPosition?: number;
  isFavorite?: boolean;
}

export default function DashboardHome() {
  const queryClient = useQueryClient();
  const [pollingStatus, setPollingStatus] = useState(false);

  // Fetch Playback / Continue Watching
  const { data: playbackData, isLoading: loadingPlayback } = useQuery({
    queryKey: ['playback-continue'],
    queryFn: async () => {
      const res = await fetch('/api/playback?type=continue');
      if (!res.ok) throw new Error('Failed to load playback data');
      return res.json() as Promise<{ items: MediaItem[] }>;
    },
  });

  // Fetch Favorites
  const { data: favoritesData, isLoading: loadingFavorites } = useQuery({
    queryKey: ['playback-favorites'],
    queryFn: async () => {
      const res = await fetch('/api/playback?type=favorites');
      if (!res.ok) throw new Error('Failed to load favorites');
      return res.json() as Promise<{ items: MediaItem[] }>;
    },
  });

  // Fetch Background Scan Status
  const { data: scanState, refetch: refetchScanStatus } = useQuery({
    queryKey: ['scan-status'],
    queryFn: async () => {
      const res = await fetch('/api/scan');
      if (!res.ok) throw new Error('Failed to fetch scanner status');
      return res.json();
    },
    refetchInterval: pollingStatus ? 2000 : false, // Poll every 2 seconds during scan
  });

  // Poll controller
  useEffect(() => {
    if (scanState?.isScanning) {
      setPollingStatus(true);
    } else {
      setPollingStatus(false);
      // Refresh library list when scan finishes
      queryClient.invalidateQueries({ queryKey: ['playback-continue'] });
      queryClient.invalidateQueries({ queryKey: ['playback-favorites'] });
    }
  }, [scanState?.isScanning, queryClient]);

  // Mutation to Trigger Scan
  const triggerScanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/scan', { method: 'POST' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to trigger scan');
      }
      return res.json();
    },
    onSuccess: () => {
      setPollingStatus(true);
      refetchScanStatus();
    },
  });

  const handleStartScan = () => {
    triggerScanMutation.mutate();
  };

  const getProgressPercentage = (processed: number, total: number) => {
    if (!total) return 0;
    return Math.round((processed / total) * 100);
  };

  const formatDuration = (secs?: number) => {
    if (!secs) return '00:00';
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainingSecs = Math.floor(secs % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isScanning = scanState?.isScanning || triggerScanMutation.isPending;

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border-white/5 p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 plex-glow">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-950/20 to-indigo-900/10 -z-10" />
        
        <div className="space-y-4 max-w-xl text-center md:text-left">
          <h2 className="text-4xl font-extrabold tracking-tight text-white md:text-5xl leading-tight">
            Welcome to the <br className="hidden sm:inline" />
            <span className="text-gradient">Theater Mode</span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg font-medium leading-relaxed">
            High-fidelity video streaming directly from your Microsoft OneDrive library. Free, fast, and secure.
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
            <Link 
              href="/browse"
              className="px-6 py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 font-bold shadow-lg shadow-purple-900/30 active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <FolderOpen className="w-5 h-5" />
              <span>Browse Catalog</span>
            </Link>
          </div>
        </div>

        {/* Sync Status Card */}
        <div className="w-full max-w-sm rounded-2xl bg-black/40 border border-white/5 p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/5">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wider">Library Index</span>
            </div>
            {isScanning && (
              <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />
            )}
          </div>

          {isScanning ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider">
                <span className="text-purple-400">Indexing Files...</span>
                <span className="text-white">
                  {scanState?.processedItems || 0} / {scanState?.totalItems || 0} ({getProgressPercentage(scanState?.processedItems || 0, scanState?.totalItems || 0)}%)
                </span>
              </div>
              <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-300"
                  style={{ width: `${getProgressPercentage(scanState?.processedItems || 0, scanState?.totalItems || 0)}%` }}
                />
              </div>
              <p className="text-xs text-slate-400 font-medium truncate">
                {scanState?.currentFile || 'Scanning directory logs...'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-10 h-10 text-emerald-500 shrink-0" />
                <div>
                  <h4 className="text-sm font-extrabold text-white">Library Synced</h4>
                  <p className="text-xs text-slate-400 font-medium">Ready to play media files</p>
                </div>
              </div>
              
              {triggerScanMutation.isError && (
                <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/20 text-red-200 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{triggerScanMutation.error.message}</span>
                </div>
              )}

              <button
                onClick={handleStartScan}
                disabled={isScanning}
                className="w-full py-3 bg-white/5 hover:bg-white/10 hover:border-purple-500/20 border border-white/5 rounded-xl text-sm font-bold text-slate-200 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sync Library Now</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Continue Watching Section */}
      <section className="space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-purple-400" />
            <h3 className="text-xl font-extrabold text-white tracking-tight">Continue Watching</h3>
          </div>
        </div>

        {loadingPlayback ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(null).map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-white/5 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : !playbackData?.items || playbackData.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/5 bg-white/2px p-8 text-center">
            <Film className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-300">No played items yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Videos you watch will appear here so you can easily resume playback.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {playbackData.items.map((item) => {
              const playedPercent = item.duration && item.playbackPosition 
                ? Math.min(Math.round((item.playbackPosition / item.duration) * 100), 100) 
                : 0;

              return (
                <div key={item.id} className="group relative rounded-xl overflow-hidden glass-panel border-white/5 glass-panel-hover flex flex-col shadow-lg">
                  {/* Aspect ratio frame with mock/generic thumbnail styling */}
                  <Link href={`/watch/${item.id}`} className="aspect-video relative overflow-hidden bg-black/60 flex items-center justify-center group/card cursor-pointer">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20 z-10" />
                    <Film className="w-12 h-12 text-purple-600/40 group-hover/card:scale-110 transition-transform duration-300" />
                    
                    {/* Floating Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/40 z-20">
                      <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-950/50 transform scale-90 group-hover/card:scale-100 transition-transform duration-300">
                        <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Progress Bar overlay */}
                    <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10 z-20">
                      <div className="h-full bg-purple-500" style={{ width: `${playedPercent}%` }} />
                    </div>
                  </Link>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <p className="text-xs text-slate-500 font-semibold uppercase mt-0.5 tracking-wider">
                        {formatDuration(item.playbackPosition)} left of {formatDuration(item.duration)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Favorites Section */}
      <section className="space-y-5">
        <div className="flex items-center gap-2.5">
          <Heart className="w-5 h-5 text-amber-500 fill-amber-500" />
          <h3 className="text-xl font-extrabold text-white tracking-tight">Your Favorites</h3>
        </div>

        {loadingFavorites ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array(4).fill(null).map((_, i) => (
              <div key={i} className="aspect-video rounded-xl bg-white/5 border border-white/5 animate-pulse" />
            ))}
          </div>
        ) : !favoritesData?.items || favoritesData.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/5 bg-white/2px p-8 text-center">
            <Heart className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-300">No favorites selected</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">Tag folders or files as favorite, and they will display here instantly.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {favoritesData.items.map((item) => (
              <div key={item.id} className="group relative rounded-xl overflow-hidden glass-panel border-white/5 glass-panel-hover flex flex-col shadow-lg">
                <Link href={`/watch/${item.id}`} className="aspect-video relative overflow-hidden bg-black/60 flex items-center justify-center group/card cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/20 z-10" />
                  <Film className="w-12 h-12 text-purple-600/40 group-hover/card:scale-110 transition-transform duration-300" />
                  
                  {/* Floating Play Button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/40 z-20">
                    <div className="w-12 h-12 rounded-full bg-purple-600 flex items-center justify-center shadow-lg transform scale-90 group-hover/card:scale-100 transition-transform duration-300">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </Link>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h4 className="text-sm font-bold text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                      {item.name}
                    </h4>
                    <div className="flex items-center justify-between mt-1 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                      <span>{item.resolution || 'Resolution N/A'}</span>
                      <span>{formatBytes(item.size)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
