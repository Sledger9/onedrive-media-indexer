'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Folder, 
  Film, 
  File, 
  Search, 
  Grid, 
  List, 
  ChevronRight, 
  Heart, 
  Download, 
  ArrowUpDown, 
  Play, 
  Loader2,
  FileVideo
} from 'lucide-react';

interface FileBrowserProps {
  folderId?: string; // If undefined, loads root
}

interface MediaItem {
  id: string;
  name: string;
  path: string;
  parentId: string | null;
  mimeType: string;
  size: number;
  modifiedAt: string;
  isDirectory: boolean;
  duration?: number;
  resolution?: string;
  videoCodec?: string;
  isFavorite?: boolean;
}

export default function FileBrowser({ folderId = 'root' }: FileBrowserProps) {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'date'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch Folder Contents & Breadcrumbs
  const { data: folderData, isLoading: loadingFolder } = useQuery({
    queryKey: ['folder', folderId],
    queryFn: async () => {
      const res = await fetch(`/api/folders?id=${folderId}`);
      if (!res.ok) throw new Error('Failed to load folder');
      return res.json() as Promise<{ items: MediaItem[]; breadcrumbs: Array<{ id: string; name: string }> }>;
    },
  });

  // Fetch Search Results (if query exists)
  const { data: searchData, isLoading: loadingSearch } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/search?q=${searchQuery}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json() as Promise<{ items: MediaItem[] }>;
    },
    enabled: searchQuery.trim().length > 0,
  });

  // Toggle Favorite Mutation
  const favoriteMutation = useMutation({
    mutationFn: async ({ mediaId, isFav }: { mediaId: string; isFav: boolean }) => {
      const res = await fetch('/api/playback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaId, isFavorite: isFav }),
      });
      if (!res.ok) throw new Error('Failed to toggle favorite');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder', folderId] });
      queryClient.invalidateQueries({ queryKey: ['playback-favorites'] });
    },
  });

  const handleToggleFavorite = (mediaId: string, currentFav?: boolean) => {
    favoriteMutation.mutate({ mediaId, isFav: !currentFav });
  };

  const handleSort = (field: 'name' | 'size' | 'date') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Get displayed items (either search results or folder contents)
  let items = folderData?.items || [];
  if (searchQuery.trim().length > 0) {
    items = searchData?.items || [];
  }

  // Apply sorting
  const sortedItems = [...items].sort((a, b) => {
    // Directories always go first
    if (a.isDirectory && !b.isDirectory) return -1;
    if (!a.isDirectory && b.isDirectory) return 1;

    let valA: any = a.name;
    let valB: any = b.name;

    if (sortBy === 'size') {
      valA = a.size;
      valB = b.size;
    } else if (sortBy === 'date') {
      valA = new Date(a.modifiedAt).getTime();
      valB = new Date(b.modifiedAt).getTime();
    }

    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const isLoading = loadingFolder || (searchQuery.trim().length > 0 && loadingSearch);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* File Browser Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Media Library</h1>
          
          {/* Breadcrumbs */}
          {searchQuery.trim().length === 0 && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-sm font-semibold text-slate-400">
              <Link href="/browse" className="hover:text-purple-400 transition-colors">
                Root
              </Link>
              {folderData?.breadcrumbs && folderData.breadcrumbs.length > 0 && (
                <>
                  {folderData.breadcrumbs.map((crumb) => (
                    <React.Fragment key={crumb.id}>
                      <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                      <Link href={`/browse/${crumb.id}`} className="hover:text-purple-400 transition-colors line-clamp-1">
                        {crumb.name}
                      </Link>
                    </React.Fragment>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        {/* View toggles & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Search bar */}
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search library files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/5 focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 transition-all outline-none text-sm text-white font-medium placeholder-slate-500"
            />
          </div>

          {/* Grid/List togglers */}
          <div className="p-1 rounded-xl bg-white/5 border border-white/5 flex gap-1 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Sorting bar */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <div className="flex items-center gap-4">
          <span>Sort By:</span>
          <button onClick={() => handleSort('name')} className={`flex items-center gap-1 hover:text-white transition-colors ${sortBy === 'name' ? 'text-purple-400' : ''}`}>
            <span>Name</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => handleSort('size')} className={`flex items-center gap-1 hover:text-white transition-colors ${sortBy === 'size' ? 'text-purple-400' : ''}`}>
            <span>Size</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
          <button onClick={() => handleSort('date')} className={`flex items-center gap-1 hover:text-white transition-colors ${sortBy === 'date' ? 'text-purple-400' : ''}`}>
            <span>Date</span>
            <ArrowUpDown className="w-3 h-3" />
          </button>
        </div>
        <span>{sortedItems.length} Items</span>
      </div>

      {/* Main Files Display */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
          <span className="text-sm font-semibold text-slate-400 mt-4">Loading media catalog...</span>
        </div>
      ) : sortedItems.length === 0 ? (
        <div className="text-center py-24 glass-panel rounded-2xl border-white/5 max-w-xl mx-auto">
          <Folder className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-300">This directory is empty</h3>
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">Make sure to trigger a library sync on the dashboard if you recently added files to OneDrive.</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {sortedItems.map((item) => (
            <div key={item.id} className="group relative rounded-xl overflow-hidden glass-panel border-white/5 glass-panel-hover flex flex-col justify-between shadow-lg aspect-[5/6]">
              {/* Action Overlay */}
              <div className="absolute top-2.5 right-2.5 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {!item.isDirectory && (
                  <button 
                    onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                    disabled={favoriteMutation.isPending}
                    className="p-2 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-amber-500 transition-all border border-white/5 shadow"
                  >
                    <Heart className={`w-3.5 h-3.5 ${item.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`} />
                  </button>
                )}
              </div>

              {/* Item Body Link */}
              <Link 
                href={item.isDirectory ? `/browse/${item.id}` : `/watch/${item.id}`}
                className="flex-1 flex flex-col justify-center items-center p-6 text-center cursor-pointer relative"
              >
                {item.isDirectory ? (
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform duration-300 shadow shadow-amber-950/20">
                    <Folder className="w-8 h-8 text-amber-500 fill-amber-500" />
                  </div>
                ) : item.mimeType.startsWith('video/') ? (
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 group-hover:scale-105 transition-transform duration-300 shadow shadow-purple-950/20">
                    <FileVideo className="w-8 h-8 text-purple-400" />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-slate-500/10 flex items-center justify-center border border-slate-500/20 group-hover:scale-105 transition-transform duration-300 shadow">
                    <File className="w-8 h-8 text-slate-400" />
                  </div>
                )}

                {/* Duration overlay for probed movies */}
                {!item.isDirectory && item.duration && (
                  <span className="absolute bottom-4 px-2 py-0.5 rounded bg-black/70 text-[10px] font-bold text-slate-300 border border-white/5">
                    {Math.floor(item.duration / 60)} min
                  </span>
                )}
              </Link>

              {/* Footer info */}
              <div className="p-4 bg-black/40 border-t border-white/5 space-y-1">
                <Link 
                  href={item.isDirectory ? `/browse/${item.id}` : `/watch/${item.id}`}
                  className="font-bold text-sm text-white group-hover:text-purple-400 transition-colors line-clamp-1 block"
                >
                  {item.name}
                </Link>
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <span>{item.isDirectory ? 'Directory' : item.resolution || 'File'}</span>
                  <span>{item.isDirectory ? '' : formatBytes(item.size)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW */
        <div className="glass-panel border-white/5 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/2px">
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6 hidden sm:table-cell">Resolution</th>
                <th className="py-4 px-6">Size</th>
                <th className="py-4 px-6 hidden md:table-cell">Last Modified</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item) => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/2px transition-colors group">
                  <td className="py-3.5 px-6 font-bold text-sm text-white">
                    <Link 
                      href={item.isDirectory ? `/browse/${item.id}` : `/watch/${item.id}`}
                      className="flex items-center gap-3.5 hover:text-purple-400 transition-colors"
                    >
                      {item.isDirectory ? (
                        <Folder className="w-5 h-5 text-amber-500 fill-amber-500" />
                      ) : item.mimeType.startsWith('video/') ? (
                        <Film className="w-5 h-5 text-purple-400" />
                      ) : (
                        <File className="w-5 h-5 text-slate-400" />
                      )}
                      <span className="line-clamp-1">{item.name}</span>
                    </Link>
                  </td>
                  <td className="py-3.5 px-6 text-sm text-slate-400 font-semibold hidden sm:table-cell">
                    {item.isDirectory ? '—' : item.resolution || '—'}
                  </td>
                  <td className="py-3.5 px-6 text-sm text-slate-400 font-semibold">
                    {item.isDirectory ? '—' : formatBytes(item.size)}
                  </td>
                  <td className="py-3.5 px-6 text-sm text-slate-400 font-semibold hidden md:table-cell">
                    {formatDate(item.modifiedAt)}
                  </td>
                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {!item.isDirectory && (
                        <button
                          onClick={() => handleToggleFavorite(item.id, item.isFavorite)}
                          className={`p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-amber-500 transition-all ${item.isFavorite ? 'text-amber-500 fill-amber-500' : ''}`}
                        >
                          <Heart className="w-4 h-4" />
                        </button>
                      )}
                      {!item.isDirectory && (
                        <a
                          href={`/api/download/${item.id}`} // Proxied directly from next.js route
                          className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white transition-all"
                          title="Download Direct"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
