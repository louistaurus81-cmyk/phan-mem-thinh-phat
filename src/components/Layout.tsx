import React from 'react';
import { User, StaffActivityLog, PrintSettings } from '../types';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onNavigate: (tab: string) => void;
  currentUser: User | null;
  dbLoading: boolean;
  isSyncing: boolean;
  activities: StaffActivityLog[];
  showNotifDropdown: boolean;
  onToggleNotifDropdown: () => void;
  onMarkLogRead: (logId?: string) => void;
  onReloadData: () => void;
  onLogout: () => void;
  printSettings?: PrintSettings;
  onQuickAction?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  onNavigate,
  currentUser,
  dbLoading,
  isSyncing,
  activities,
  showNotifDropdown,
  onToggleNotifDropdown,
  onMarkLogRead,
  onReloadData,
  onLogout,
  printSettings,
  onQuickAction
}) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-sans text-slate-800 antialiased selection:bg-indigo-100 selection:text-indigo-700 flex-col md:flex-row">
      
      {/* 1. PC Sidebar (Desktop - Fixed h-full) */}
      <div className="hidden md:block h-full shrink-0">
        <Sidebar 
          activeTab={activeTab}
          onNavigate={onNavigate}
          currentUser={currentUser}
          onLogout={onLogout}
        />
      </div>

      {/* 2. Right Viewport Area (Topbar + Main Stage Container) */}
      <div className="flex flex-1 flex-col h-full min-h-0 overflow-hidden">
        
        {/* Top Header Bar */}
        <Header 
          currentUser={currentUser}
          activeTab={activeTab}
          dbLoading={dbLoading}
          isSyncing={isSyncing}
          activities={activities}
          showNotifDropdown={showNotifDropdown}
          onToggleNotifDropdown={onToggleNotifDropdown}
          onMarkLogRead={onMarkLogRead}
          onReloadData={onReloadData}
          onNavigate={onNavigate}
          onLogout={onLogout}
          printSettings={printSettings}
        />

        {/* Main Content Viewport with custom macOS scrollbar */}
        <main className="flex-1 overflow-y-auto custom-mac-scrollbar p-3 sm:p-4 pb-20 md:pb-4 flex flex-col">
          {children}
        </main>

        {/* 3. Mobile iOS Floating Bottom Navigation */}
        <BottomNav 
          activeTab={activeTab}
          onNavigate={onNavigate}
          currentUser={currentUser}
          onQuickAction={onQuickAction}
        />

      </div>

    </div>
  );
};

export default Layout;
