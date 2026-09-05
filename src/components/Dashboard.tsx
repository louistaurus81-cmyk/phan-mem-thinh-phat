import React, { useMemo } from 'react';
import { Product, SalesInvoice, RepairTicket, WarrantyCard } from '../types';
import { 
  TrendingUp, 
  Wrench, 
  ShieldCheck, 
  ShoppingBag, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  Users,
  Briefcase
} from 'lucide-react';
import { motion } from 'motion/react';

interface DashboardProps {
  products: Product[];
  invoices: SalesInvoice[];
  repairs: RepairTicket[];
  warranties: WarrantyCard[];
  onNavigate: (tab: string) => void;
  onQuickRepair: () => void;
  onQuickInvoice: () => void;
}

export default function Dashboard({
  products,
  invoices,
  repairs,
  warranties,
  onNavigate,
  onQuickRepair,
  onQuickInvoice
}: DashboardProps) {

  // Calculate statistics
  const stats = useMemo(() => {
    // Total sales revenue
    const totalSales = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    
    // Repair revenue (actual cost of completed & delivered tickets)
    const totalRepairs = repairs
      .filter(r => r.status === 'completed' || r.status === 'delivered')
      .reduce((sum, r) => sum + (r.actualCost || r.estimatedCost || 0), 0);
    
    // Active repair tickets (not delivered)
    const activeRepairsCount = repairs.filter(r => r.status !== 'delivered').length;
    const checkingCount = repairs.filter(r => r.status === 'checking').length;
    const repairingCount = repairs.filter(r => r.status === 'repairing').length;
    const completedCount = repairs.filter(r => r.status === 'completed').length;

    // Active warranties
    const activeWarrantiesCount = warranties.filter(w => w.status === 'active').length;

    // Calculate profit (Sales: price - cost, Repairs: actualCost - parts cost estimated at 40% value)
    const salesCost = invoices.reduce((sum, inv) => {
      return sum + inv.items.reduce((itemSum, item) => {
        const prod = products.find(p => p.id === item.productId);
        const costPrice = prod ? prod.cost : item.price * 0.75; // fallback cost
        return itemSum + (costPrice * item.quantity);
      }, 0);
    }, 0);

    const salesProfit = totalSales - salesCost;
    const repairProfit = totalRepairs * 0.6; // Assuming 60% profit margin on repair services (labor)
    const totalProfit = salesProfit + repairProfit;

    return {
      totalSales,
      totalRepairs,
      revenue: totalSales + totalRepairs,
      profit: totalProfit,
      activeRepairs: activeRepairsCount,
      activeWarranties: activeWarrantiesCount,
      repairDistribution: {
        checking: checkingCount,
        repairing: repairingCount,
        completed: completedCount
      }
    };
  }, [products, invoices, repairs, warranties]);

  // Format money to VND
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Generate monthly revenue trend for the last 6 days based on invoices + repairs
  const chartData = useMemo(() => {
    const days = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];
    const currentDayIdx = new Date().getDay(); // 0 is Sun, 1 is Mon...
    
    // Rotate days to show up to today
    const sortedDays = [...days.slice(currentDayIdx), ...days.slice(0, currentDayIdx)];
    
    // Generate realistic historical daily revenue heights for mock visual chart
    const salesValues = [12000000, 18500000, 8900000, 15000000, 22000000, stats.totalSales / 30 + 1000000, stats.totalSales / 15 + 500000];
    const repairValues = [1500000, 2400000, 1100000, 3200000, 1800000, stats.totalRepairs / 20 + 200000, stats.totalRepairs / 10 + 300000];

    return sortedDays.map((day, i) => ({
      day,
      sales: salesValues[i % salesValues.length],
      repairs: repairValues[i % repairValues.length],
      total: salesValues[i % salesValues.length] + repairValues[i % repairValues.length]
    }));
  }, [stats]);

  const maxChartValue = Math.max(...chartData.map(d => d.total), 10000000);

  return (
    <div id="dashboard-view" className="space-y-6">
      
      {/* 1. BENTO HERO BLOCK (Welcome Banner & Quick Action Cards) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Welcome Card (Col 1-2 or 1-3) */}
        <div className="lg:col-span-2 bg-slate-900 rounded-[2rem] border-2 border-slate-800 p-8 text-white relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-48 h-48 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />
          <div className="z-10">
            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full uppercase tracking-widest">
              LÀM VIỆC HIỆU QUẢ
            </span>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight mt-3 text-white">Chào mừng trở lại!</h1>
            <p className="text-slate-300 mt-2 text-xs md:text-sm leading-relaxed max-w-sm">
              Hệ thống giám sát cửa hàng đang vận hành tối ưu. Hôm nay có <span className="font-semibold text-emerald-400">{stats.activeRepairs} máy</span> trong hàng chờ sửa chữa và <span className="font-semibold text-blue-400">{stats.repairDistribution.completed} máy</span> chờ giao cho khách.
            </p>
          </div>
          <div className="z-10 pt-4 flex gap-2 text-xs text-slate-400">
            <span>Múi giờ hệ thống: <b>UTC-7</b></span>
          </div>
        </div>

        {/* Bento Quick Actions Box (Col 3-4) - matching Design HTML blue-600 style */}
        <div className="lg:col-span-2 bg-blue-600 rounded-[2rem] border-2 border-blue-700 p-8 flex items-center justify-around text-white min-h-[220px] shadow-lg relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
          
          <button 
            id="btn-quick-new-repair"
            onClick={onQuickRepair}
            className="flex flex-col items-center gap-3 text-white group cursor-pointer transition transform hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 border border-white/15 transition-colors shadow-sm">
              <Wrench className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Tạo Phiếu Sửa</span>
          </button>

          <button 
            id="btn-quick-new-invoice"
            onClick={onQuickInvoice}
            className="flex flex-col items-center gap-3 text-white group cursor-pointer transition transform hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 border border-white/15 transition-colors shadow-sm">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Bán Hàng Mới</span>
          </button>

          <button 
            id="btn-quick-warranty-check"
            onClick={() => onNavigate('warranties')}
            className="flex flex-col items-center gap-3 text-white group cursor-pointer transition transform hover:scale-105 active:scale-95"
          >
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center group-hover:bg-white/20 border border-white/15 transition-colors shadow-sm">
              <ShieldCheck className="w-7 h-7 text-white" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider">Tra Bảo Hành</span>
          </button>
        </div>

      </div>

      {/* 2. KPI METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Metric 1: Total Revenue */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => onNavigate('reports')}
          className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 flex flex-col justify-between min-h-[140px] bento-shadow cursor-pointer hover:border-emerald-300 transition group"
          title="Bấm để xem Báo cáo Doanh thu, Lợi nhuận & Công nợ"
        >
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Tổng Doanh Thu</p>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 group-hover:bg-emerald-100 px-2 py-0.5 rounded-full transition">Chi tiết →</span>
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1 text-emerald-600">{formatVND(stats.revenue)}</h2>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 w-fit px-2.5 py-0.5 rounded-full mt-2">
            <span>↑ 15.5%</span>
            <span className="text-slate-400 font-normal">so với tuần trước</span>
          </div>
        </motion.div>

        {/* Metric 2: Active Repairs */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 flex flex-col justify-between min-h-[140px] bento-shadow"
        >
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Đang Sửa Chữa</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1 text-blue-600">{stats.activeRepairs} máy</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {stats.repairDistribution.repairing} lỗi nguồn, {stats.repairDistribution.checking} chờ kiểm tra
          </p>
        </motion.div>

        {/* Metric 3: Sales Volume */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 flex flex-col justify-between min-h-[140px] bento-shadow"
        >
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Thanh Toán Bán Lẻ</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1 text-indigo-600">{formatVND(stats.totalSales)}</h2>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-medium">
            {invoices.length} hoá đơn giao dịch thành công
          </p>
        </motion.div>

        {/* Metric 4: Active Warranties */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 flex flex-col justify-between min-h-[140px] bento-shadow"
        >
          <div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Bảo Hành Thẻ</p>
            <h2 className="text-2xl md:text-3xl font-extrabold mt-1 text-purple-600">{stats.activeWarranties} Thẻ</h2>
          </div>
          <p className="text-xs text-emerald-600 mt-2 font-bold flex items-center gap-1">
            <span>● Đang kích hoạt hiệu lực</span>
          </p>
        </motion.div>

      </div>

      {/* 3. CORE ANALYTICAL BENTO ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Card: Sales Trend Chart (Col-span 2) */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">Xu Hướng Doanh Thu Tuần</h3>
                <p className="text-xs text-slate-500 mt-0.5">Doanh thu bán thiết bị phối hợp dịch vụ sửa chữa</p>
              </div>
              <div className="flex gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-indigo-500 rounded-xs" />Bán lẻ</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs" />Sửa chữa</span>
              </div>
            </div>

            {/* SVG Custom Interactive Chart */}
            <div className="h-56 flex items-end justify-between gap-3 pt-4 border-b border-slate-100 pb-1">
              {chartData.map((data, index) => {
                const salesPct = (data.sales / maxChartValue) * 100;
                const repairsPct = (data.repairs / maxChartValue) * 100;

                return (
                  <div key={index} className="flex-1 flex flex-col items-center h-full group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute -top-12 bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10 shadow-md text-nowrap">
                      <p className="font-bold text-slate-300">{data.day}</p>
                      <p>Bán lẻ: {formatVND(data.sales)}</p>
                      <p>Dịch vụ: {formatVND(data.repairs)}</p>
                      <p className="border-t border-slate-700 mt-0.5 pt-0.5 text-emerald-400 font-bold">Tổng: {formatVND(data.total)}</p>
                    </div>

                    {/* Stacked Bars */}
                    <div className="w-full flex flex-col justify-end h-full gap-0.5">
                      {/* Repairs Segment */}
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${repairsPct}%` }}
                        transition={{ delay: index * 0.04, duration: 0.4 }}
                        className="w-full bg-emerald-500 rounded-t-xs hover:bg-emerald-400 transition-colors"
                      />
                      {/* Sales Segment */}
                      <motion.div 
                        initial={{ height: 0 }}
                        animate={{ height: `${salesPct}%` }}
                        transition={{ delay: index * 0.04, duration: 0.4 }}
                        className="w-full bg-indigo-500 rounded-b-xs hover:bg-indigo-400 transition-colors"
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 mt-2">{data.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-3 font-semibold">
            <span>Khởi điểm: 0đ</span>
            <span>Mốc trần: {formatVND(maxChartValue)}</span>
          </div>
        </div>

        {/* Right Card: Status Distribution & Low Stocks (Col-span 1) */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 bento-shadow flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base mb-4">Trạng Thái Quy Trình</h3>
            <div className="space-y-4">
              
              <div>
                <div className="flex justify-between text-xs text-slate-600 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" /> Nhận thử đồ
                  </span>
                  <span>{stats.repairDistribution.checking} máy</span>
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-slate-400 rounded-full" 
                    style={{ width: `${(stats.repairDistribution.checking / (stats.activeRepairs || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-amber-700 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-amber-500" /> Kỹ thuật sửa
                  </span>
                  <span>{stats.repairDistribution.repairing} máy</span>
                </div>
                <div className="w-full h-2 bg-amber-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 rounded-full" 
                    style={{ width: `${(stats.repairDistribution.repairing / (stats.activeRepairs || 1)) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-emerald-700 font-bold mb-1">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Chờ bàn giao
                  </span>
                  <span>{stats.repairDistribution.completed} máy</span>
                </div>
                <div className="w-full h-2 bg-emerald-50 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full" 
                    style={{ width: `${(stats.repairDistribution.completed / (stats.activeRepairs || 1)) * 100}%` }}
                  />
                </div>
              </div>

            </div>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <button 
              id="btn-navigate-to-repairs"
              onClick={() => onNavigate('repairs')}
              className="w-full text-center text-xs font-bold text-blue-600 hover:text-blue-500 py-1 transition cursor-pointer"
            >
              Quản lý danh sách sửa chữa →
            </button>
          </div>
        </div>

      </div>

      {/* 4. ACTIVITY & REPORTING BENTO ROW: Data Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Col span 2: Recent Repairs Table (similar to Main Data Table in design mockup) */}
        <div className="col-span-1 lg:col-span-2 bg-white rounded-[2rem] border-2 border-slate-200 flex flex-col overflow-hidden bento-shadow">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-extrabold text-base text-slate-900">Danh sách sửa chữa gần đây</h3>
            <span 
              onClick={() => onNavigate('repairs')}
              className="text-xs text-blue-600 font-bold cursor-pointer hover:underline"
            >
              Xem tất cả →
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-6">Khách hàng / Mã phiếu</th>
                  <th className="py-3.5 px-6">Thiết bị</th>
                  <th className="py-3.5 px-6">Trạng thái</th>
                  <th className="py-3.5 px-6 text-right">Chi phí ước tính</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {repairs.slice().reverse().slice(0, 4).map((rep) => (
                  <tr key={rep.id} className="hover:bg-slate-50/75 transition-colors">
                    <td className="py-3 px-6">
                      <p className="font-bold text-slate-900">{rep.customerName}</p>
                      <span className="font-mono text-[9px] text-slate-400 mt-0.5 inline-block">{rep.ticketNumber}</span>
                    </td>
                    <td className="py-3 px-6 font-medium text-slate-700">{rep.deviceName}</td>
                    <td className="py-3 px-6">
                      <span className={`px-2.5 py-1 text-[9px] font-extrabold rounded-full ${
                        rep.status === 'checking' ? 'bg-slate-100 text-slate-700' :
                        rep.status === 'repairing' ? 'bg-amber-100 text-amber-800' :
                        rep.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        'bg-blue-50 text-blue-800' // delivered
                      }`}>
                        {rep.status === 'checking' ? 'MỚI TIẾP NHẬN' :
                         rep.status === 'repairing' ? 'ĐANG SỬA CHỮA' :
                         rep.status === 'completed' ? 'HOÀN THÀNH' :
                         'ĐÃ BÀN GIAO'}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right font-bold text-slate-900">
                      {formatVND(rep.status === 'delivered' || rep.status === 'completed' ? rep.actualCost || rep.estimatedCost : rep.estimatedCost)}
                    </td>
                  </tr>
                ))}
                {repairs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-400">
                      Chưa có phiếu máy sửa chữa kỹ thuật nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Col span 1: Recent Sales Invoice Card */}
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 p-6 flex flex-col justify-between bento-shadow">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-base text-slate-900">Giao dịch bán lẻ</h3>
              <span 
                onClick={() => onNavigate('sales')}
                className="text-xs text-blue-600 font-bold cursor-pointer hover:underline"
              >
                Chi tiết →
              </span>
            </div>
            
            <div className="divide-y divide-slate-100">
              {invoices.slice().reverse().slice(0, 3).map((inv) => (
                <div key={inv.id} className="py-3.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-xs text-slate-800">{inv.customerName}</p>
                      <p className="text-[10px] text-slate-400 mt-1 truncate max-w-[180px]">
                        {inv.items.map(item => `${item.productName} (x${item.quantity})`).join(', ')}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-600">{formatVND(inv.totalAmount)}</span>
                      <p className="text-[8px] font-mono font-bold text-slate-400 mt-1">{inv.invoiceNumber}</p>
                    </div>
                  </div>
                </div>
              ))}
              {invoices.length === 0 && (
                <div className="py-10 text-center text-slate-400 text-xs">
                  Chưa bán ra đơn sản phẩm nào.
                </div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center justify-between mt-4">
            <div>
              <p className="text-[11px] font-bold text-blue-400">TỔNG HỢP KIỂM KHO</p>
              <h4 className="text-xs font-bold text-slate-200 mt-1">Các mặt hàng cần kiểm đếm</h4>
            </div>
            <button 
              onClick={() => onNavigate('sales')}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold uppercase transition"
            >
              Kiểm tra
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
