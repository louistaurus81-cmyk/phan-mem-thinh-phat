import React from 'react';
import { User, StaffActivityLog, PrintSettings } from '../types';
import { 
  Bell, 
  LogOut, 
  RefreshCw, 
  Server, 
  User as UserIcon,
  Crown,
  Shield,
  Wrench,
  ShoppingBag,
  Store
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HeaderProps {
  currentUser: User | null;
  activeTab: string;
  dbLoading: boolean;
  isSyncing: boolean;
  activities: StaffActivityLog[];
  showNotifDropdown: boolean;
  onToggleNotifDropdown: () => void;
  onMarkLogRead: (logId?: string) => void;
  onReloadData: () => void;
  onNavigate: (tab: string) => void;
  onLogout: () => void;
  printSettings?: PrintSettings;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeTab,
  dbLoading,
  isSyncing,
  activities,
  showNotifDropdown,
  onToggleNotifDropdown,
  onMarkLogRead,
  onReloadData,
  onNavigate,
  onLogout,
  printSettings
}) => {
  const unreadCount = activities.filter(a => !a.readByOwner).length;

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Crown className="w-3 h-3 text-amber-500 fill-amber-400" /> Quản trị viên (Admin)
          </span>
        );
      case 'manager':
        return (
          <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Shield className="w-3 h-3 text-indigo-500" /> Cửa hàng trưởng
          </span>
        );
      case 'technician':
        return (
          <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Wrench className="w-3 h-3 text-blue-500" /> Kỹ thuật viên
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
            <ShoppingBag className="w-3 h-3 text-emerald-500" /> Nhân viên bán hàng
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-zinc-200/60 px-4 py-2.5 flex items-center justify-between gap-3 transition-all">
      
      {/* Store & Active Context */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center font-black shadow-md shadow-indigo-200">
          <Store className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-sm font-black text-slate-900 tracking-tight leading-snug flex items-center gap-1.5">
            {printSettings?.storeName || 'THỊNH PHÁT COMPUTER'}
          </h1>
          <p className="text-[11px] text-slate-500 font-medium truncate max-w-[200px] sm:max-w-xs">
            {printSettings?.storePhone ? `Hotline: ${printSettings.storePhone}` : 'Hệ thống máy tính & thiết bị văn phòng'}
          </p>
        </div>
      </div>

      {/* Action Controls & User Account */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Realtime Staff Notification Bell (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <div className="relative">
            <button
              id="btn-header-notification-bell"
              onClick={onToggleNotifDropdown}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center gap-2 border border-slate-700 shadow-xs relative"
              title="Thông báo thao tác nhân viên realtime"
            >
              <div className="relative">
                <Bell className="w-4 h-4 text-amber-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                )}
              </div>
              <span className="hidden md:inline text-xs font-bold text-slate-100">Thông báo Staff</span>
              {unreadCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] font-black px-1.5 py-0.2 rounded-full font-mono">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Realtime Staff Activity Dropdown */}
            <AnimatePresence>
              {showNotifDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 overflow-hidden"
                >
                  <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <h4 className="font-extrabold text-xs uppercase tracking-wider">Thao tác nhân viên</h4>
                    </div>
                    {unreadCount > 0 && (
                      <button
                        onClick={() => onMarkLogRead()}
                        className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                      >
                        Đánh dấu đã đọc ({unreadCount})
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                    {activities.length === 0 ? (
                      <div className="p-6 text-center text-xs text-slate-400 font-medium">
                        Chưa có thao tác mới nào từ nhân viên
                      </div>
                    ) : (
                      activities.slice(0, 10).map(act => (
                        <div
                          key={act.id}
                          onClick={() => onMarkLogRead(act.id)}
                          className={`p-3 rounded-xl transition cursor-pointer text-xs space-y-1 ${
                            !act.readByOwner ? 'bg-amber-50/80 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-black text-slate-900 truncate">{act.userName}</span>
                            <span className="text-[10px] text-slate-400 font-mono shrink-0">
                              {new Date(act.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800">{act.title}</p>
                          <p className="text-[11px] text-slate-500 leading-snug truncate">{act.details}</p>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                    <button
                      onClick={() => {
                        onNavigate('owner');
                        onToggleNotifDropdown();
                      }}
                      className="text-xs font-bold text-indigo-600 hover:underline w-full cursor-pointer"
                    >
                      Xem toàn bộ nhật ký tại Bảng Chủ Shop 👑
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Server Connection Indicator & Refresh Button */}
        <div className="hidden sm:flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-xl border border-zinc-200/80">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dbLoading ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${dbLoading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
          </span>
          <div className="text-left">
            <p className="text-[10px] font-extrabold text-slate-700 leading-none">MÁY CHỦ MẠNG LAN</p>
            <p className="text-[8px] font-bold text-emerald-600 mt-0.5 leading-none">Safe JSON Mutex Connected</p>
          </div>
          <button
            onClick={onReloadData}
            disabled={isSyncing}
            className={`p-1 rounded-lg border border-slate-200 hover:bg-white active:scale-95 transition text-[10px] font-extrabold flex items-center gap-1 cursor-pointer select-none ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
            title="Tải lại & Đồng bộ dữ liệu mạng LAN"
          >
            <RefreshCw className={`w-3 h-3 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* User Info & Role Badge */}
        {currentUser && (
          <div className="flex items-center gap-2 bg-slate-100/70 p-1 pr-2.5 rounded-xl border border-zinc-200/60">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-black text-slate-800 leading-tight">{currentUser.fullName}</div>
              <div className="mt-0.5">{getRoleBadge(currentUser.role)}</div>
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={onLogout}
          className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200/60 rounded-xl transition cursor-pointer flex items-center gap-1 font-bold text-xs"
          title="Đăng xuất khỏi hệ thống"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Thoát</span>
        </button>

      </div>
    </header>
  );
};

export default Header;
