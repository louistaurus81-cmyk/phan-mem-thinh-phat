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
  LogOut,
  Sparkles
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
      { id: 'owner', label: 'Bảng Chủ Shop', icon: Crown, badge: '👑 Realtime', color: 'text-amber-500' }
    ] : []),
    { id: 'dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
    ...(isOwnerAdmin ? [
      { id: 'reports', label: 'Báo Cáo Doanh Thu', icon: BarChart3 }
    ] : []),
    { id: 'sales', label: 'Bán Hàng & Kho', icon: ShoppingBag },
    { id: 'buildpc', label: 'Build Cấu Hình PC', icon: Cpu },
    { id: 'repairs', label: 'Tiếp Nhận Sửa Chữa', icon: Wrench },
    { id: 'warranties', label: 'Bảo Hành Điện Tử', icon: ShieldCheck },
    { id: 'suppliers', label: 'Nhà Cung Cấp', icon: Building2 },
    { id: 'debts', label: 'Quản Lý Công Nợ', icon: ReceiptText },
    { id: 'customers', label: 'Khách Hàng (CRM)', icon: Users },
    { id: 'printSettings', label: 'Cấu Hình Bản In', icon: Printer },
    ...(isOwnerAdmin ? [
      { id: 'accounts', label: 'Quản Lý Nhân Viên', icon: UserCog }
    ] : []),
  ];

  return (
    <aside className="w-64 backdrop-blur-md bg-white/70 border-r border-zinc-200/60 h-screen flex flex-col justify-between p-3 select-none shrink-0">
      
      {/* Top Branding Logo */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2 py-1.5 border-b border-zinc-200/50 pb-3">
          <TPLogo className="w-8 h-8 shrink-0 text-indigo-600" />
          <div>
            <span className="font-black text-slate-900 tracking-tight text-sm block">THỊNH PHÁT</span>
            <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider block">Computer macOS UI</span>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <nav className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full px-3 py-2.5 rounded-xl font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200/80'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : item.color || 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md ${
                    isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Details */}
      <div className="space-y-2 pt-3 border-t border-zinc-200/50">
        <div className="p-2.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-center">
          <p className="text-[10px] font-extrabold text-indigo-900 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-600" /> THỊNH PHÁT v1.2 LAN
          </p>
          <p className="text-[9px] text-slate-500 font-medium mt-0.5">An toàn dữ liệu tuyệt đối</p>
        </div>

        <button
          onClick={onLogout}
          className="w-full px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition flex items-center gap-2 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng Xuất</span>
        </button>
      </div>

    </aside>
  );
};

export default Sidebar;
