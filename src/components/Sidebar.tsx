import React from 'react';
import { User } from '../types';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Wrench, 
  ShieldCheck, 
  Users, 
  UserCog, 
  Cpu, 
  Printer, 
  Building2, 
  Crown, 
  ReceiptText, 
  BarChart3,
  LogOut
} from 'lucide-react';
import TPLogo from './TPLogo';

interface SidebarProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  currentUser: User | null;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onNavigate,
  currentUser,
  onLogout
}) => {
  const isOwnerAdmin = currentUser?.role === 'admin';

  const navItems = [
    ...(isOwnerAdmin ? [
      { id: 'owner', label: 'Bảng Chủ Shop', icon: Crown, badge: '👑 Realtime', color: 'text-amber-400' }
    ] : []),
    { id: 'dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
    ...(isOwnerAdmin ? [
      { id: 'reports', label: 'Báo Cáo Doanh Thu', icon: BarChart3 }
    ] : []),
    { id: 'sales', label: 'Quản Lý Bán Hàng & Kho', icon: ShoppingBag },
    { id: 'buildpc', label: 'Tự Build Cấu Hình PC', icon: Cpu },
    { id: 'repairs', label: 'Tiếp Nhận Sửa Chữa', icon: Wrench },
    { id: 'warranties', label: 'Bảo Hành Điện Tử', icon: ShieldCheck },
    { id: 'suppliers', label: 'Nhà Cung Cấp', icon: Building2 },
    { id: 'debts', label: 'Quản Lý Công Nợ', icon: ReceiptText },
    { id: 'customers', label: 'Quản Lý Khách Hàng', icon: Users },
    { id: 'printSettings', label: 'Cấu Hình Mẫu In', icon: Printer },
    ...(isOwnerAdmin ? [
      { id: 'accounts', label: 'Quản Lý Nhân Viên', icon: UserCog }
    ] : []),
  ];

  return (
    <aside className="w-64 bg-[#0B1120] border-r border-slate-800/50 h-screen flex flex-col justify-between select-none shrink-0">
      <div className="flex flex-col h-full overflow-hidden">
        
        {/* Top Branding Logo */}
        <div className="p-4 border-b border-slate-800/50 flex items-center gap-3 shrink-0">
          <TPLogo className="w-9 h-9 shrink-0 text-indigo-500" />
          <div>
            <span className="font-black text-white tracking-tight text-sm block">THỊNH PHÁT</span>
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">SaaS Modern Edition</span>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="p-2 space-y-1 flex-1 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full text-left px-3 py-2.5 text-xs flex items-center justify-between transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/20 to-transparent text-white font-medium border-l-4 border-indigo-500 rounded-r-lg'
                    : 'text-slate-300 hover:bg-slate-800/50 hover:text-white rounded-lg'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-400' : item.color || 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                    isActive ? 'bg-indigo-500/20 text-indigo-300' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom User Profile Footer Details */}
        <div className="p-3 border-t border-slate-800/50 space-y-2 shrink-0">
          <div className="flex items-center gap-2 bg-transparent border border-slate-800 rounded-xl p-2 hover:bg-slate-800/30 transition-all duration-200">
            <div className="w-8 h-8 rounded-lg bg-indigo-600/80 text-white font-black flex items-center justify-center text-xs shrink-0 shadow-inner">
              {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-200 truncate">{currentUser?.fullName || 'Người Dùng'}</p>
              <p className="text-[10px] text-slate-400 font-mono capitalize">{currentUser?.role || 'Nhân viên'}</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded-xl font-medium text-xs text-slate-400 hover:text-red-400 hover:bg-slate-800/30 transition-all duration-200 cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng Xuất</span>
          </button>
        </div>

      </div>
    </aside>
  );
};

export default Sidebar;
