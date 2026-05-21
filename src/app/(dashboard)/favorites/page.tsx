'use client';

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Heart, Film, Play, Info } from 'lucide-react';

interface MediaItem {
  id: string;
  name: string;
  size: number;
  duration?: number;
  resolution?: string;
}

export default function FavoritesPage() {
  const { data: favoritesData, isLoading } = useQuery({
    queryKey: ['playback-favorites-page'],
    queryFn: async () => {
      const res = await fetch('/api/playback?type=favorites');
      if (!res.ok) throw new Error('Failed to load favorites');
      return res.json() as Promise<{ items: MediaItem[] }>;
    },
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div>
        <div className="flex items-center gap-3">
          <Heart className="w-8 h-8 text-amber-500 fill-amber-500" />
          <h1 className="text-3xl font-extrabold tracking-tight text-white">My Favorites</h1>
        </div>
        <p className="text-slate-400 text-sm mt-1 font-medium">Your marked folders and files, saved in one fast dashboard</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array(8).fill(null).map((_, i) => (
            <div key={i} className="aspect-video rounded-xl bg-white/5 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : !favoritesData?.items || favoritesData.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/5 bg-white/2px p-12 text-center max-w-xl mx-auto mt-10">
          <Heart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">Your Favorites list is empty</h3>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Click the favorite heart icon next to any movie or folder in the Directory Browser to index them here for fast 1-click access!
          </p>
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
    </div>
  );
}
