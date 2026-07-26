import React, { useState, useMemo } from 'react';
import { Product, SalesInvoice, RepairTicket, Debt, User, ProductIMEI, StaffActivityLog, ActivityType } from '../types';
import { 
  Crown, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Clock, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  ReceiptText, 
  Calendar, 
  ArrowUpRight, 
  Package, 
  Sparkles,
  CreditCard,
  Building2,
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Wrench,
  ShieldCheck,
  UserCog,
  Search,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface OwnerDashboardProps {
  products: Product[];
  invoices: SalesInvoice[];
  repairs: RepairTicket[];
  debts: Debt[];
  users: User[];
  imeis: ProductIMEI[];
  activities?: StaffActivityLog[];
  onMarkLogRead?: (id?: string) => void;
  onClearLogs?: () => void;
  onNavigate: (tab: string) => void;
}

export default function OwnerDashboard({
  products,
  invoices,
  repairs,
  debts,
  users,
  imeis,
  activities = [],
  onMarkLogRead,
  onClearLogs,
  onNavigate
}: OwnerDashboardProps) {
  const [timeRange, setTimeRange] = useState<'today' | 'yesterday' | '7days' | 'month'>('today');
  
  // Activity Log Filters
  const [logFilterCategory, setLogFilterCategory] = useState<'all' | 'unread' | ActivityType>('all');
  const [selectedStaffName, setSelectedStaffName] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [confirmingClearLogs, setConfirmingClearLogs] = useState<boolean>(false);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const yesterdayStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }, []);

  const sevenDaysAgoStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const firstDayOfMonthStr = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  }, []);

  // Filter invoices based on selected time range
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const invDate = inv.createdAt.slice(0, 10);
      if (timeRange === 'today') return invDate === todayStr;
      if (timeRange === 'yesterday') return invDate === yesterdayStr;
      if (timeRange === '7days') return invDate >= sevenDaysAgoStr;
      if (timeRange === 'month') return invDate >= firstDayOfMonthStr;
      return true;
    });
  }, [invoices, timeRange, todayStr, yesterdayStr, sevenDaysAgoStr, firstDayOfMonthStr]);

  // Today's specific invoices for notification feed
  const todayInvoices = useMemo(() => {
    return invoices.filter(inv => inv.createdAt.slice(0, 10) === todayStr);
  }, [invoices, todayStr]);

  // Format currency
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Calculations for current selected range
  const rangeStats = useMemo(() => {
    let totalSales = 0;
    let totalSalesCost = 0;

    filteredInvoices.forEach(inv => {
      totalSales += inv.totalAmount;
      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const itemCost = prod ? prod.cost : item.price * 0.75;
        totalSalesCost += itemCost * item.quantity;
      });
    });

    const salesProfit = totalSales - totalSalesCost;

    // Filter repairs completed in time range
    const rangeRepairs = repairs.filter(r => {
      const rDate = (r.deliveredAt || r.updatedAt || r.createdAt).slice(0, 10);
      if (r.status !== 'completed' && r.status !== 'delivered') return false;
      if (timeRange === 'today') return rDate === todayStr;
      if (timeRange === 'yesterday') return rDate === yesterdayStr;
      if (timeRange === '7days') return rDate >= sevenDaysAgoStr;
      if (timeRange === 'month') return rDate >= firstDayOfMonthStr;
      return true;
    });

    const totalRepairRevenue = rangeRepairs.reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0);
    const totalRepairProfit = totalRepairRevenue * 0.6; // estimated 60% margin for service labor

    const grandRevenue = totalSales + totalRepairRevenue;
    const grandProfit = salesProfit + totalRepairProfit;

    return {
      totalSales,
      salesProfit,
      totalRepairRevenue,
      grandRevenue,
      grandProfit,
      orderCount: filteredInvoices.length,
      repairCount: rangeRepairs.length
    };
  }, [filteredInvoices, products, repairs, timeRange, todayStr, yesterdayStr, sevenDaysAgoStr, firstDayOfMonthStr]);

  // Total Inventory Capital Value
  const inventoryMetrics = useMemo(() => {
    let totalValueCost = 0;
    let totalValuePrice = 0;
    let totalItemsInStock = 0;

    products.forEach(p => {
      const realStock = p.hasImei 
        ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length 
        : p.stock;

      totalItemsInStock += realStock;
      totalValueCost += p.cost * realStock;
      totalValuePrice += p.price * realStock;
    });

    const lowStockItems = products.filter(p => {
      const realStock = p.hasImei 
        ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length 
        : p.stock;
      return realStock <= 2;
    });

    return {
      totalValueCost,
      totalValuePrice,
      totalItemsInStock,
      lowStockItems
    };
  }, [products, imeis]);

  // Sales breakdown by Employee for selected time range
  const staffSalesData = useMemo(() => {
    const staffMap: Record<string, { name: string; role: string; orderCount: number; totalRevenue: number; profit: number }> = {};

    // Initialize all users
    users.forEach(u => {
      staffMap[u.fullName] = {
        name: u.fullName,
        role: u.role,
        orderCount: 0,
        totalRevenue: 0,
        profit: 0
      };
    });

    filteredInvoices.forEach(inv => {
      const staffName = inv.processedBy || 'Chưa rõ';
      if (!staffMap[staffName]) {
        staffMap[staffName] = { name: staffName, role: 'sales', orderCount: 0, totalRevenue: 0, profit: 0 };
      }

      let invCost = 0;
      inv.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        invCost += (prod ? prod.cost : item.price * 0.75) * item.quantity;
      });

      staffMap[staffName].orderCount += 1;
      staffMap[staffName].totalRevenue += inv.totalAmount;
      staffMap[staffName].profit += (inv.totalAmount - invCost);
    });

    return Object.values(staffMap).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredInvoices, products, users]);

  // Outstanding Debt metrics
  const totalPendingDebt = useMemo(() => {
    return debts
      .filter(d => d.status !== 'paid')
      .reduce((sum, d) => sum + d.remainingAmount, 0);
  }, [debts]);

  return (
    <div className="space-y-6">
      
      {/* 1. Header Hero Banner */}
      <div className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 p-8 text-white relative overflow-hidden bento-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-amber-400 bg-amber-400/10 border border-amber-500/20 px-3 py-1 rounded-full flex items-center gap-1">
              <Crown className="w-3 h-3 text-amber-400" /> QUẢN TRỊ VIÊN BẢNG CHỦ CỬA HÀNG
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">Bảng Giám Sát Cửa Hàng</h2>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            Góc theo dõi thời gian thực dành cho Chủ Shop: Kiểm soát doanh thu, lợi nhuận thực tế, danh sách đơn bán hàng trong ngày & hiệu suất làm việc nhân viên.
          </p>
        </div>

        {/* Time Range Switcher */}
        <div className="relative z-10 shrink-0 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 flex items-center gap-1">
          <button 
            onClick={() => setTimeRange('today')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              timeRange === 'today' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hôm nay ({todayInvoices.length})
          </button>
          <button 
            onClick={() => setTimeRange('yesterday')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              timeRange === 'yesterday' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Hôm qua
          </button>
          <button 
            onClick={() => setTimeRange('7days')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              timeRange === '7days' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            7 Ngày
          </button>
          <button 
            onClick={() => setTimeRange('month')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
              timeRange === 'month' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tháng này
          </button>
        </div>
      </div>

      {/* 2. Top Financial KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Doanh Thu */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 bento-shadow space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">TỔNG DOANH THU</span>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(rangeStats.grandRevenue)}</h3>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1 font-medium">
              <span>Bán hàng: <b>{formatVND(rangeStats.totalSales)}</b></span>
            </p>
          </div>
        </div>

        {/* Card 2: Lợi Nhuận Thực Tế */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-emerald-200 bg-emerald-50/20 bento-shadow space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">LỢI NHUẬN THỰC TẾ</span>
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-emerald-700 tracking-tight">{formatVND(rangeStats.grandProfit)}</h3>
            <p className="text-xs text-emerald-600 mt-1 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> Biên lợi nhuận xấp xỉ {rangeStats.grandRevenue > 0 ? ((rangeStats.grandProfit / rangeStats.grandRevenue) * 100).toFixed(1) : 0}%
            </p>
          </div>
        </div>

        {/* Card 3: Số Đơn Hàng Đã Xuất */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 bento-shadow space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ĐƠN HÀNG ĐÃ BÁN</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{rangeStats.orderCount} Đơn bán</h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              + {rangeStats.repairCount} Đơn dịch vụ sửa chữa
            </p>
          </div>
        </div>

        {/* Card 4: Tổng Giá Trị Vốn Kho */}
        <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 bento-shadow space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">VỐN HÀNG TỒN KHO</span>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl border border-purple-100">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(inventoryMetrics.totalValueCost)}</h3>
            <p className="text-xs text-purple-700 mt-1 font-medium">
              {inventoryMetrics.totalItemsInStock} sản phẩm đang có trong kho
            </p>
          </div>
        </div>
      </div>

      {/* 2.5. STAFF AUDIT & ACTIVITY NOTIFICATIONS PANEL FOR STORE OWNER */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-6 md:p-8 bento-shadow space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl shadow-sm relative">
              <Bell className="w-6 h-6" />
              {activities.filter(a => !a.readByOwner).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse border-2 border-white">
                  {activities.filter(a => !a.readByOwner).length > 99 ? '99+' : activities.filter(a => !a.readByOwner).length}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-lg md:text-xl">
                  Nhật Ký Thao Tác & Thông Báo Nhân Viên Realtime
                </h3>
                <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-0.5 rounded-full border border-indigo-200">
                  {activities.length} nhật ký
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Chủ cửa hàng nhận thông báo tự động cho toàn bộ hành động tạo đơn, tiếp nhận máy sửa, điều chỉnh kho, thay đổi công nợ & cấp quyền của nhân viên.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 self-start md:self-center">
            {activities.filter(a => !a.readByOwner).length > 0 && (
              <button
                id="btn-owner-mark-all-read"
                onClick={() => onMarkLogRead?.()}
                className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
            {activities.length > 0 && (
              <div className="relative">
                {confirmingClearLogs ? (
                  <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 p-1 rounded-xl shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        onClearLogs?.();
                        setConfirmingClearLogs(false);
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer transition whitespace-nowrap"
                    >
                      Xác nhận xóa
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingClearLogs(false)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold rounded-lg cursor-pointer transition"
                    >
                      Hủy
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-owner-clear-logs"
                    onClick={() => setConfirmingClearLogs(true)}
                    className="px-3 py-2 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    title="Xóa lịch sử nhật ký"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Xóa lịch sử
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filters Bar: Category Chips, Staff Dropdown & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-150">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {[
              { id: 'all', label: 'Tất cả', icon: Filter },
              { id: 'unread', label: `Chưa đọc (${activities.filter(a => !a.readByOwner).length})`, icon: Bell },
              { id: 'sale', label: 'Bán hàng', icon: ShoppingBag },
              { id: 'repair', label: 'Sửa chữa', icon: Wrench },
              { id: 'inventory', label: 'Kho hàng', icon: Package },
              { id: 'debt', label: 'Công nợ', icon: ReceiptText },
              { id: 'user', label: 'Tài khoản', icon: UserCog },
            ].map(cat => {
              const Icon = cat.icon;
              const isActive = logFilterCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setLogFilterCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-slate-900 text-white shadow-xs' 
                      : 'bg-white text-slate-600 hover:bg-slate-200/80 border border-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>

          {/* Staff Filter Dropdown & Search Input */}
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <select
              value={selectedStaffName}
              onChange={(e) => setSelectedStaffName(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="all"> Tất cả nhân viên</option>
              {users.map(u => (
                <option key={u.id} value={u.fullName}>
                  👤 {u.fullName} ({u.role === 'admin' ? 'Chủ Shop' : u.role === 'sales' ? 'Bán Hàng' : 'Kỹ Thuật'})
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm từ khóa..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Activity Feed Grid */}
        {activities.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
            <Info className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-700 text-sm">Chưa có thông báo nhật ký nào được ghi nhận</p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Khi nhân viên tạo hóa đơn bán hàng, tiếp nhận sửa máy, điều chỉnh tồn kho hoặc cập nhật công nợ, toàn bộ thao tác sẽ xuất hiện tự động tại đây.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
            {activities
              .filter(act => {
                if (logFilterCategory === 'unread' && act.readByOwner) return false;
                if (logFilterCategory !== 'all' && logFilterCategory !== 'unread' && act.type !== logFilterCategory) return false;
                if (selectedStaffName !== 'all' && act.userName !== selectedStaffName) return false;
                if (logSearchQuery.trim()) {
                  const q = logSearchQuery.toLowerCase();
                  return act.userName.toLowerCase().includes(q) || act.title.toLowerCase().includes(q) || act.details.toLowerCase().includes(q);
                }
                return true;
              })
              .map(act => {
                const isUnread = !act.readByOwner;
                
                // Icon & badge mapping
                let badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
                let Icon = Info;
                if (act.type === 'sale') {
                  badgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  Icon = ShoppingBag;
                } else if (act.type === 'repair') {
                  badgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  Icon = Wrench;
                } else if (act.type === 'inventory') {
                  badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  Icon = Package;
                } else if (act.type === 'debt') {
                  badgeColor = 'bg-purple-50 text-purple-700 border-purple-200';
                  Icon = ReceiptText;
                } else if (act.type === 'user') {
                  badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
                  Icon = UserCog;
                }

                // Format relative time string
                let formattedTime = act.timestamp;
                try {
                  const d = new Date(act.timestamp);
                  const diffMins = Math.floor((Date.now() - d.getTime()) / (1000 * 60));
                  if (diffMins < 1) formattedTime = 'Vừa xong';
                  else if (diffMins < 60) formattedTime = `${diffMins} phút trước`;
                  else if (diffMins < 1440) formattedTime = `${Math.floor(diffMins / 60)} giờ trước (${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`;
                  else formattedTime = d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                } catch (err) {}

                return (
                  <div
                    key={act.id}
                    onClick={() => onMarkLogRead?.(act.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                      isUnread
                        ? 'bg-amber-50/60 border-amber-300/80 shadow-xs ring-1 ring-amber-300/50'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl border shrink-0 ${badgeColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{act.userName}</span>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
                            {act.userRole === 'admin' ? 'Chủ Shop' : act.userRole === 'sales' ? 'Bán Hàng' : 'Kỹ Thuật'}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-xs font-bold text-slate-800">{act.title}</span>
                          {isUnread && (
                            <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-extrabold rounded-full">
                              MỚI
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed font-medium">{act.details}</p>
                      </div>
                    </div>

                    {/* Right Info: Time & Amount */}
                    <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 pt-2 md:pt-0 border-slate-100 shrink-0 text-right">
                      {act.amount !== undefined && (
                        <p className="font-extrabold text-sm text-slate-900">
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(act.amount)}
                        </p>
                      )}
                      <p className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formattedTime}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* 3. Main Split Section: Real-time Today's Orders Notification Feed vs Staff Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Realtime Orders Stream for Today ("Đơn hàng đã bán trong ngày") */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">
                  Thông Báo Đơn Hàng Đã Bán Trong Ngày
                </h3>
                <p className="text-xs text-slate-500">Cập nhật ngay lập tức mỗi khi nhân viên tạo đơn hàng mới tại cửa hàng</p>
              </div>
            </div>
            <span className="text-xs font-extrabold bg-amber-100 text-amber-800 px-3 py-1 rounded-full border border-amber-200">
              {todayInvoices.length} đơn hôm nay
            </span>
          </div>

          {todayInvoices.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
              <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-600">Chưa có đơn bán hàng nào được phát sinh hôm nay!</p>
              <p className="text-xs text-slate-400">Khi nhân viên xuất hóa đơn, danh sách và lợi nhuận đơn sẽ tự động nhảy tại đây.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {todayInvoices.map((inv) => {
                const invTime = inv.createdAt.includes('T') ? inv.createdAt.split('T')[1].slice(0, 8) : inv.createdAt.slice(11, 19) || 'Mới đây';
                
                // Calculate item profit
                let invCost = 0;
                inv.items.forEach(item => {
                  const prod = products.find(p => p.id === item.productId);
                  invCost += (prod ? prod.cost : item.price * 0.75) * item.quantity;
                });
                const estProfit = inv.totalAmount - invCost;

                return (
                  <motion.div 
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={inv.id} 
                    className="p-4 bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-2xl transition space-y-2"
                  >
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-1 rounded-lg">
                          #{inv.invoiceNumber}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" /> {invTime}
                        </span>
                        <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                          Khách: {inv.customerName} ({inv.customerPhone})
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-sm font-black text-emerald-600">{formatVND(inv.totalAmount)}</span>
                        {estProfit > 0 && (
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200 ml-2">
                            + {formatVND(estProfit)} Lời
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100 space-y-1">
                      <p className="font-semibold text-slate-700">Chi tiết sản phẩm đã bán:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-[11px]">
                        {inv.items.map((it, idx) => (
                          <li key={idx}>
                            <span className="font-bold text-slate-800">{it.productName}</span> x {it.quantity} chiếc @ {formatVND(it.price)}
                            {it.imeis && it.imeis.length > 0 && (
                              <span className="text-[10px] font-mono text-indigo-600 ml-1">
                                [IMEI: {it.imeis.join(', ')}]
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1">
                      <span>Thanh toán: <b className="text-slate-700">{inv.paymentMethod}</b></span>
                      <span>Nhân viên tạo đơn: <b className="text-indigo-600">{inv.processedBy || 'Quản trị viên'}</b></span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right 1 Col: Employee Sales Performance Table */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" />
              Doanh Số Nhân Viên
            </h3>
            <span className="text-xs text-slate-400 font-bold uppercase">
              {timeRange === 'today' ? 'Hôm nay' : timeRange === 'month' ? 'Tháng này' : 'Thời gian lọc'}
            </span>
          </div>

          <div className="space-y-3">
            {staffSalesData.map((staff, idx) => {
              const salesPercent = rangeStats.totalSales > 0 
                ? Math.min(100, Math.round((staff.totalRevenue / rangeStats.totalSales) * 100))
                : 0;

              return (
                <div key={idx} className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                          {idx + 1}
                        </span>
                        {staff.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-semibold uppercase">
                        {staff.role === 'admin' ? 'Chủ Shop' : staff.role === 'sales' ? 'Bán Hàng' : 'Kỹ Thuật'}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="font-extrabold text-slate-900 text-xs">{formatVND(staff.totalRevenue)}</p>
                      <p className="text-[10px] text-slate-500 font-semibold">{staff.orderCount} hóa đơn</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${salesPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400">
                    <span>Đóng góp: <b>{salesPercent}%</b> tổng doanh số</span>
                    <span className="text-emerald-600 font-bold">+ {formatVND(staff.profit)} lời</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Bottom Grid: Low Stock Alert & Outstanding Debt Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Box 1: Low Stock Warning */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              Cảnh Báo Sản Phẩm Sắp Hết Hàng (≤ 2 chiếc)
            </h3>
            <button 
              onClick={() => onNavigate('sales')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Nhập hàng ngay <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {inventoryMetrics.lowStockItems.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-1" />
              Tất cả mặt hàng trong kho đều đang duy trì mức tồn an toàn!
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
              {inventoryMetrics.lowStockItems.map(p => {
                const stockAmt = p.hasImei 
                  ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length 
                  : p.stock;

                return (
                  <div key={p.id} className="py-2.5 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku || '---'} | Giá bán: {formatVND(p.price)}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold ${stockAmt === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
                      {stockAmt === 0 ? 'HẾT HÀNG' : `Còn ${stockAmt} chiếc`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Box 2: Outstanding Debts */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2 text-amber-600">
              <ReceiptText className="w-5 h-5" />
              Tổng Công Nợ Của Khách Hàng
            </h3>
            <button 
              onClick={() => onNavigate('debts')}
              className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              Thu nợ ngay <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-amber-800 uppercase">Tổng tiền nợ chưa thu hồi</p>
              <p className="text-2xl font-black text-amber-900 mt-1">{formatVND(totalPendingDebt)}</p>
            </div>
            <div className="p-3 bg-amber-200 text-amber-900 rounded-xl">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>

          <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto pr-1">
            {debts.filter(d => d.status !== 'paid').slice(0, 5).map(d => (
              <div key={d.id} className="py-2 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">{d.customerName}</p>
                  <p className="text-[10px] text-slate-400">Hạn trả: {d.dueDate}</p>
                </div>
                <span className="font-bold text-rose-600">
                  {formatVND(d.remainingAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
