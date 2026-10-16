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
    <div className="min-h-screen bg-zinc-50 font-sans text-slate-800 flex flex-col md:flex-row antialiased selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* 1. PC macOS Glassmorphism Sidebar (Desktop) */}
      <div className="hidden md:block shrink-0">
        <Sidebar 
          activeTab={activeTab}
          onNavigate={onNavigate}
          currentUser={currentUser}
          onLogout={onLogout}
        />
      </div>

      {/* 2. Main Stage Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Header */}
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

        {/* Dynamic Page Stage Content */}
        <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 pb-20 md:pb-4 flex flex-col">
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
