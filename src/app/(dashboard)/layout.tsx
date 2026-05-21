'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Film, 
  FolderOpen, 
  Heart, 
  Clock, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Play, 
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface SidebarLinkProps {
  href: string;
  icon: React.ComponentType<any>;
  label: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scanStatus, setScanStatus] = useState<any>({ isScanning: false });
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Check scanning status periodically
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch('/api/playback'); // Simple validation check
        // We will fetch status from worker directly if we expose it, but for now fetch from worker API or similar
      } catch (err) {}
    };
    fetchStatus();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Failed to log out:', err);
    }
  };

  const SidebarLink = ({ href, icon: Icon, label }: SidebarLinkProps) => {
    const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));
    return (
      <Link
        href={href}
        className={`flex items-center gap-3.5 px-4 py-3 rounded-xl font-medium transition-all ${
          isActive
            ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/30'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      >
        <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
        <span>{label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen flex bg-[#020205] text-[#f5f5f7]">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-72 border-r border-white/5 bg-[#05050a]/90 backdrop-blur-xl p-6 shrink-0 relative z-20">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-gradient-to-tr from-purple-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-950/50 ring-1 ring-white/10">
            <Film className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-white block leading-none">OneDrive</span>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-widest">Media Indexer</span>
          </div>
        </Link>

        {/* Links */}
        <nav className="flex-1 space-y-2">
          <SidebarLink href="/" icon={Play} label="Theater Home" />
          <SidebarLink href="/browse" icon={FolderOpen} label="Browse Files" />
          <SidebarLink href="/favorites" icon={Heart} label="My Favorites" />
        </nav>

        {/* Footer actions */}
        <div className="space-y-4 pt-6 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3.5 w-full px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded-xl font-medium transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
          
          <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-bold text-slate-300">Admin Mode</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar - Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 md:hidden animate-fadeIn">
          <aside className="w-72 h-full bg-[#05050a] p-6 flex flex-col border-r border-white/5 animate-slideRight">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Film className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-white">OneDrive Media</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              <SidebarLink href="/" icon={Play} label="Theater Home" />
              <SidebarLink href="/browse" icon={FolderOpen} label="Browse Files" />
              <SidebarLink href="/favorites" icon={Heart} label="My Favorites" />
            </nav>

            <div className="pt-6 border-t border-white/5 space-y-4">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3.5 w-full px-4 py-3 text-slate-400 hover:text-red-400 rounded-xl font-medium transition-all"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header - Mobile Menu Toggle */}
        <header className="md:hidden flex items-center justify-between p-4 border-b border-white/5 bg-[#05050a]/90 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Film className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">OneDrive Media</span>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:text-white border border-white/5"
          >
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
