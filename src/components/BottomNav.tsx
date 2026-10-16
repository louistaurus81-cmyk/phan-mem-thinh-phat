import React from 'react';
import { User } from '../types';
import { 
  ShoppingBag, 
  Wrench, 
  Plus, 
  ReceiptText, 
  BarChart3, 
  ShieldCheck, 
  Building2 
} from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  onNavigate: (tab: string) => void;
  currentUser: User | null;
  onQuickAction?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onNavigate,
  currentUser,
  onQuickAction
}) => {
  return (
    <nav className="md:hidden fixed bottom-3 left-3 right-3 z-40">
      <div className="backdrop-blur-xl bg-white/85 border border-zinc-200/80 shadow-2xl rounded-2xl p-1.5 flex items-center justify-around relative">
        
        {/* POS Tab */}
        <button
          onClick={() => onNavigate('sales')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[44px] cursor-pointer transition ${
            activeTab === 'sales' ? 'text-indigo-600 font-black' : 'text-slate-500 font-semibold'
          }`}
        >
          <ShoppingBag className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Bán Hàng</span>
        </button>

        {/* Repair Tab */}
        <button
          onClick={() => onNavigate('repairs')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[44px] cursor-pointer transition ${
            activeTab === 'repairs' ? 'text-indigo-600 font-black' : 'text-slate-500 font-semibold'
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Sửa Chữa</span>
        </button>

        {/* Prominent Center FAB (+ Create Action) */}
        <button
          onClick={onQuickAction || (() => onNavigate('sales'))}
          className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-lg shadow-indigo-300 font-black active:scale-90 transition transform -translate-y-2 border-2 border-white cursor-pointer"
          title="Tạo đơn hàng / Thao tác nhanh"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
        </button>

        {/* Debt Tab */}
        <button
          onClick={() => onNavigate('debts')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[44px] cursor-pointer transition ${
            activeTab === 'debts' ? 'text-indigo-600 font-black' : 'text-slate-500 font-semibold'
          }`}
        >
          <ReceiptText className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Công Nợ</span>
        </button>

        {/* Reports or Warranty Tab */}
        <button
          onClick={() => onNavigate(currentUser?.role === 'admin' ? 'reports' : 'warranties')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl min-h-[44px] cursor-pointer transition ${
            activeTab === 'reports' || activeTab === 'warranties' ? 'text-indigo-600 font-black' : 'text-slate-500 font-semibold'
          }`}
        >
          {currentUser?.role === 'admin' ? (
            <>
              <BarChart3 className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Báo Cáo</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">Bảo Hành</span>
            </>
          )}
        </button>

      </div>
    </nav>
  );
};

export default BottomNav;
