import React, { useState, useMemo } from 'react';
import { 
  Product, 
  SalesInvoice, 
  RepairTicket, 
  Debt, 
  Customer, 
  User, 
  PrintSettings 
} from '../types';
import { 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  ReceiptText, 
  Calendar, 
  CalendarRange, 
  Printer, 
  Download, 
  Search, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  ChevronRight, 
  Clock, 
  User as UserIcon, 
  Phone, 
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Wrench, 
  Sparkles, 
  PieChart, 
  Eye, 
  X, 
  CreditCard, 
  FileText,
  ChevronDown,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TPLogo from './TPLogo';

interface ReportManagerProps {
  products: Product[];
  invoices: SalesInvoice[];
  repairs: RepairTicket[];
  debts: Debt[];
  customers: Customer[];
  users: User[];
  printSettings: PrintSettings;
  onNavigate?: (tab: string) => void;
}

type ReportSubTab = 'revenue' | 'profit' | 'debts' | 'history';

type PresetTime = 
  | 'today' 
  | 'yesterday' 
  | '7days' 
  | '30days' 
  | 'this_month' 
  | 'last_month' 
  | 'month_select' 
  | 'q1' 
  | 'q2' 
  | 'q3' 
  | 'q4' 
  | 'this_year' 
  | 'custom';

export default function ReportManager({
  products,
  invoices,
  repairs,
  debts,
  customers,
  users,
  printSettings,
  onNavigate
}: ReportManagerProps) {
  // Current date constants
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<ReportSubTab>('revenue');

  // Time selection states
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [preset, setPreset] = useState<PresetTime>('month_select');

  // Custom date inputs (YYYY-MM-DD)
  const defaultMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
  const defaultMonthEnd = new Date(currentYear, currentMonth, 0).toISOString().slice(0, 10);
  
  const [customStartDate, setCustomStartDate] = useState<string>(defaultMonthStart);
  const [customEndDate, setCustomEndDate] = useState<string>(defaultMonthEnd);

  // Search & Filters in Sales History
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyPaymentFilter, setHistoryPaymentFilter] = useState<string>('all');
  const [historyDebtOnly, setHistoryDebtOnly] = useState<boolean>(false);

  // Modal for Viewing Full Invoice Detail
  const [viewingInvoice, setViewingInvoice] = useState<SalesInvoice | null>(null);

  // Modal for Print Preview of Full Report
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Format currency
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  // Quick preset helper
  const handleSelectMonth = (month: number, year = selectedYear) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setPreset('month_select');
    const start = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const handleSelectPreset = (p: PresetTime) => {
    setPreset(p);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (p === 'today') {
      setCustomStartDate(todayStr);
      setCustomEndDate(todayStr);
    } else if (p === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().slice(0, 10);
      setCustomStartDate(yStr);
      setCustomEndDate(yStr);
    } else if (p === '7days') {
      const s = new Date();
      s.setDate(s.getDate() - 6);
      setCustomStartDate(s.toISOString().slice(0, 10));
      setCustomEndDate(todayStr);
    } else if (p === '30days') {
      const s = new Date();
      s.setDate(s.getDate() - 29);
      setCustomStartDate(s.toISOString().slice(0, 10));
      setCustomEndDate(todayStr);
    } else if (p === 'this_month') {
      handleSelectMonth(currentMonth, currentYear);
    } else if (p === 'last_month') {
      const lastM = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastY = currentMonth === 1 ? currentYear - 1 : currentYear;
      handleSelectMonth(lastM, lastY);
    } else if (p === 'q1') {
      setCustomStartDate(`${selectedYear}-01-01`);
      setCustomEndDate(`${selectedYear}-03-31`);
    } else if (p === 'q2') {
      setCustomStartDate(`${selectedYear}-04-01`);
      setCustomEndDate(`${selectedYear}-06-30`);
    } else if (p === 'q3') {
      setCustomStartDate(`${selectedYear}-07-01`);
      setCustomEndDate(`${selectedYear}-09-30`);
    } else if (p === 'q4') {
      setCustomStartDate(`${selectedYear}-10-01`);
      setCustomEndDate(`${selectedYear}-12-31`);
    } else if (p === 'this_year') {
      setCustomStartDate(`${selectedYear}-01-01`);
      setCustomEndDate(`${selectedYear}-12-31`);
    }
  };

  // Compute effective date bounds [startDate, endDate]
  const { startDate, endDate, dateRangeLabel } = useMemo(() => {
    let start = customStartDate;
    let end = customEndDate;
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }

    let label = '';
    if (preset === 'month_select') {
      label = `Tháng ${selectedMonth}/${selectedYear}`;
    } else if (preset === 'today') {
      label = 'Hôm nay';
    } else if (preset === 'yesterday') {
      label = 'Hôm qua';
    } else if (preset === '7days') {
      label = '7 ngày qua';
    } else if (preset === '30days') {
      label = '30 ngày qua';
    } else if (preset === 'this_month') {
      label = `Tháng này (${currentMonth}/${currentYear})`;
    } else if (preset === 'last_month') {
      const lastM = currentMonth === 1 ? 12 : currentMonth - 1;
      const lastY = currentMonth === 1 ? currentYear - 1 : currentYear;
      label = `Tháng trước (${lastM}/${lastY})`;
    } else if (preset === 'q1') {
      label = `Quý 1/${selectedYear}`;
    } else if (preset === 'q2') {
      label = `Quý 2/${selectedYear}`;
    } else if (preset === 'q3') {
      label = `Quý 3/${selectedYear}`;
    } else if (preset === 'q4') {
      label = `Quý 4/${selectedYear}`;
    } else if (preset === 'this_year') {
      label = `Cả năm ${selectedYear}`;
    } else {
      label = `Tùy chọn`;
    }

    return {
      startDate: start,
      endDate: end,
      dateRangeLabel: label
    };
  }, [customStartDate, customEndDate, preset, selectedMonth, selectedYear, currentMonth, currentYear]);

  // Helper to extract date string YYYY-MM-DD safely
  const getDateStr = (dateVal?: string) => {
    if (!dateVal) return '';
    if (dateVal.includes('T')) return dateVal.split('T')[0];
    return dateVal.slice(0, 10);
  };

  // ===================== DATA FILTERING IN RANGE =====================

  // 1. Invoices in range
  const rangeInvoices = useMemo(() => {
    return invoices.filter(inv => {
      const d = getDateStr(inv.createdAt);
      return d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, startDate, endDate]);

  // 2. Repairs in range (completed or delivered)
  const rangeRepairs = useMemo(() => {
    return repairs.filter(r => {
      const d = getDateStr(r.deliveredAt || r.updatedAt || r.createdAt);
      const isFin = r.status === 'completed' || r.status === 'delivered';
      return isFin && d >= startDate && d <= endDate;
    }).sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  }, [repairs, startDate, endDate]);

  // 3. Debts incurred in range
  const rangeDebtsCreated = useMemo(() => {
    return debts.filter(d => {
      const createdDate = getDateStr(d.createdAt);
      return createdDate >= startDate && createdDate <= endDate;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [debts, startDate, endDate]);

  // 4. Debt payments collected in range (from all debts, looking at payment dates)
  const rangeDebtPaymentsCollected = useMemo(() => {
    const list: { debt: Debt; payment: any }[] = [];
    debts.forEach(d => {
      (d.payments || []).forEach(p => {
        const pDate = getDateStr(p.paidAt);
        if (pDate >= startDate && pDate <= endDate) {
          list.push({ debt: d, payment: p });
        }
      });
    });
    return list;
  }, [debts, startDate, endDate]);

  // ===================== COMPREHENSIVE STATS CALCULATION =====================

  const stats = useMemo(() => {
    // A. Revenue
    let salesTotal = 0;
    let salesCostTotal = 0;
    let cashSales = 0;
    let bankSales = 0;
    let debtSalesAmount = 0;

    // Item profit analysis map
    const productStatsMap = new Map<string, {
      name: string;
      category: string;
      quantity: number;
      revenue: number;
      cost: number;
      profit: number;
    }>();

    rangeInvoices.forEach(inv => {
      salesTotal += inv.totalAmount;

      if (inv.paymentMethod === 'Tiền mặt') cashSales += (inv.totalAmount - (inv.debtAmount || 0));
      else if (inv.paymentMethod === 'Chuyển khoản' || inv.paymentMethod === 'Thẻ' || inv.paymentMethod === 'Quẹt thẻ') {
        bankSales += (inv.totalAmount - (inv.debtAmount || 0));
      }

      if (inv.debtAmount && inv.debtAmount > 0) {
        debtSalesAmount += inv.debtAmount;
      }

      // Cost & Profit per invoice item
      inv.items.forEach(item => {
        const cleanName = item.productName.replace(/^\[PC Build - [^\]]+\]\s*/i, '').trim();
        const prod = products.find(p => 
          p.id === item.productId || 
          (p.sku && p.sku === item.productId) || 
          p.name === item.productName ||
          p.name === cleanName
        );

        const unitCost = prod && prod.cost > 0 ? prod.cost : item.price * 0.75;
        const totalItemCost = unitCost * item.quantity;
        const totalItemRevenue = item.price * item.quantity;
        const totalItemProfit = totalItemRevenue - totalItemCost;

        salesCostTotal += totalItemCost;

        // Group by product
        const key = prod ? prod.id : cleanName;
        const existing = productStatsMap.get(key) || {
          name: cleanName || item.productName,
          category: prod?.category || 'Linh kiện PC',
          quantity: 0,
          revenue: 0,
          cost: 0,
          profit: 0
        };

        existing.quantity += item.quantity;
        existing.revenue += totalItemRevenue;
        existing.cost += totalItemCost;
        existing.profit += totalItemProfit;
        productStatsMap.set(key, existing);
      });
    });

    const salesProfit = salesTotal - salesCostTotal;

    // B. Repairs Revenue & Profit
    let repairsRevenueTotal = 0;
    let repairsPartsCost = 0;

    rangeRepairs.forEach(rep => {
      const rev = rep.actualCost || rep.estimatedCost || 0;
      repairsRevenueTotal += rev;

      if (rep.usedParts && rep.usedParts.length > 0) {
        rep.usedParts.forEach(pt => {
          const prod = products.find(p => p.id === pt.productId || p.name === pt.name);
          const c = prod && prod.cost > 0 ? prod.cost : pt.price * 0.75;
          repairsPartsCost += c * pt.quantity;
        });
      }
    });

    // Repair profit is (Revenue - Parts Cost) * 0.85 (labor/profit margin) or at least 60%
    const repairsProfit = Math.max(0, repairsRevenueTotal - repairsPartsCost) * 0.8 + (repairsPartsCost * 0.25);

    // Grand Totals
    const totalRevenue = salesTotal + repairsRevenueTotal;
    const totalCost = salesCostTotal + repairsPartsCost;
    const grossProfit = salesProfit + repairsProfit;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    // C. Debts
    const totalNewDebts = rangeDebtsCreated.reduce((sum, d) => sum + d.amount, 0);
    const totalNewDebtsRemaining = rangeDebtsCreated.reduce((sum, d) => sum + d.remainingAmount, 0);
    const totalDebtsCollected = rangeDebtPaymentsCollected.reduce((sum, p) => sum + p.payment.amount, 0);

    // Top Profit Products array
    const topProducts = Array.from(productStatsMap.values())
      .sort((a, b) => b.profit - a.profit);

    return {
      salesTotal,
      salesCostTotal,
      salesProfit,
      repairsRevenueTotal,
      repairsPartsCost,
      repairsProfit,
      totalRevenue,
      totalCost,
      grossProfit,
      profitMargin,
      cashSales,
      bankSales,
      debtSalesAmount,
      totalNewDebts,
      totalNewDebtsRemaining,
      totalDebtsCollected,
      invoiceCount: rangeInvoices.length,
      repairCount: rangeRepairs.length,
      topProducts
    };
  }, [rangeInvoices, rangeRepairs, rangeDebtsCreated, rangeDebtPaymentsCollected, products]);

  // ===================== DAILY TIMELINE CHART DATA =====================
  const dailyTimeline = useMemo(() => {
    // Generate dates between start and end
    const startObj = new Date(startDate);
    const endObj = new Date(endDate);
    const diffDays = Math.ceil((endObj.getTime() - startObj.getTime()) / (1000 * 3600 * 24)) + 1;

    // If range is large (more than 45 days), group by month instead
    const isGroupByMonth = diffDays > 45;

    const dataPoints: {
      label: string;
      dateKey: string;
      sales: number;
      repairs: number;
      profit: number;
    }[] = [];

    if (isGroupByMonth) {
      // Group by YYYY-MM
      const monthMap = new Map<string, { sales: number; repairs: number; profit: number }>();
      
      rangeInvoices.forEach(inv => {
        const mKey = inv.createdAt.slice(0, 7);
        const curr = monthMap.get(mKey) || { sales: 0, repairs: 0, profit: 0 };
        curr.sales += inv.totalAmount;
        // estimate profit
        let invCost = 0;
        inv.items.forEach(it => {
          const prod = products.find(p => p.id === it.productId || p.name === it.productName);
          invCost += (prod && prod.cost > 0 ? prod.cost : it.price * 0.75) * it.quantity;
        });
        curr.profit += (inv.totalAmount - invCost);
        monthMap.set(mKey, curr);
      });

      rangeRepairs.forEach(rep => {
        const mKey = (rep.deliveredAt || rep.updatedAt || rep.createdAt).slice(0, 7);
        const curr = monthMap.get(mKey) || { sales: 0, repairs: 0, profit: 0 };
        const rev = rep.actualCost || rep.estimatedCost || 0;
        curr.repairs += rev;
        curr.profit += rev * 0.65;
        monthMap.set(mKey, curr);
      });

      const sortedMonths = Array.from(monthMap.keys()).sort();
      sortedMonths.forEach(m => {
        const item = monthMap.get(m)!;
        const [y, mm] = m.split('-');
        dataPoints.push({
          label: `T${parseInt(mm)}/${y}`,
          dateKey: m,
          sales: item.sales,
          repairs: item.repairs,
          profit: item.profit
        });
      });
    } else {
      // Group by individual days
      const cur = new Date(startDate);
      while (cur <= endObj) {
        const dStr = cur.toISOString().slice(0, 10);
        const dayLabel = `${cur.getDate()}/${cur.getMonth() + 1}`;

        // Sales for this day
        let daySales = 0;
        let daySalesCost = 0;
        rangeInvoices.forEach(inv => {
          if (getDateStr(inv.createdAt) === dStr) {
            daySales += inv.totalAmount;
            inv.items.forEach(it => {
              const prod = products.find(p => p.id === it.productId || p.name === it.productName);
              daySalesCost += (prod && prod.cost > 0 ? prod.cost : it.price * 0.75) * it.quantity;
            });
          }
        });

        // Repairs for this day
        let dayRepairs = 0;
        rangeRepairs.forEach(rep => {
          const rD = getDateStr(rep.deliveredAt || rep.updatedAt || rep.createdAt);
          if (rD === dStr) {
            dayRepairs += (rep.actualCost || rep.estimatedCost || 0);
          }
        });

        const dayProfit = (daySales - daySalesCost) + (dayRepairs * 0.65);

        dataPoints.push({
          label: dayLabel,
          dateKey: dStr,
          sales: daySales,
          repairs: dayRepairs,
          profit: dayProfit
        });

        cur.setDate(cur.getDate() + 1);
      }
    }

    const maxVal = Math.max(
      1000000,
      ...dataPoints.map(d => Math.max(d.sales + d.repairs, d.profit))
    );

    return {
      points: dataPoints,
      maxVal,
      isGroupByMonth
    };
  }, [startDate, endDate, rangeInvoices, rangeRepairs, products]);

  // ===================== SALES HISTORY FILTERED LIST =====================
  const filteredSalesHistory = useMemo(() => {
    return rangeInvoices.filter(inv => {
      // Payment method
      if (historyPaymentFilter !== 'all') {
        if (historyPaymentFilter === 'debt' && (!inv.debtAmount || inv.debtAmount <= 0)) return false;
        if (historyPaymentFilter !== 'debt' && inv.paymentMethod !== historyPaymentFilter) return false;
      }

      if (historyDebtOnly && (!inv.debtAmount || inv.debtAmount <= 0)) {
        return false;
      }

      // Keyword
      if (historySearch.trim()) {
        const query = historySearch.toLowerCase().trim();
        const matchInvoiceNum = inv.invoiceNumber.toLowerCase().includes(query);
        const matchCustomer = inv.customerName.toLowerCase().includes(query) || (inv.customerPhone && inv.customerPhone.includes(query));
        const matchItems = inv.items.some(it => 
          it.productName.toLowerCase().includes(query) || 
          (it.imeis && it.imeis.some(im => im.toLowerCase().includes(query)))
        );
        const matchSeller = (inv.processedBy || '').toLowerCase().includes(query);

        if (!matchInvoiceNum && !matchCustomer && !matchItems && !matchSeller) {
          return false;
        }
      }

      return true;
    });
  }, [rangeInvoices, historyPaymentFilter, historyDebtOnly, historySearch]);

  // Export to CSV Function
  const exportToCSV = () => {
    const header = [
      'STT',
      'Mã Hoá Đơn',
      'Thời Gian',
      'Khách Hàng',
      'Số Điện Thoại',
      'Sản Phẩm Đã Bán',
      'Hình Thức',
      'Tổng Tiền (VNĐ)',
      'Nợ Lại (VNĐ)',
      'Người Bán'
    ];

    const rows = filteredSalesHistory.map((inv, idx) => {
      const itemsStr = inv.items.map(i => `${i.productName} (SL: ${i.quantity})`).join('; ');
      return [
        idx + 1,
        `"${inv.invoiceNumber}"`,
        `"${new Date(inv.createdAt).toLocaleString('vi-VN')}"`,
        `"${inv.customerName}"`,
        `"${inv.customerPhone}"`,
        `"${itemsStr}"`,
        `"${inv.paymentMethod}"`,
        inv.totalAmount,
        inv.debtAmount || 0,
        `"${inv.processedBy || 'Nhân viên'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Bao_Cao_Ban_Hang_${startDate}_den_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-4">
      
      {/* 1. TOP HEADER & TIME SELECTION CONTROL CENTER */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3 shrink-0">
        
        {/* Row 1: Title, Quick Presets, Print & Export */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                  Báo Cáo Doanh Thu, Công Nợ & Lợi Nhuận
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                  {dateRangeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Khoảng thời gian: <span className="font-bold text-slate-700">{startDate}</span> đến <span className="font-bold text-slate-700">{endDate}</span>
                {' '}• <span className="text-blue-600 font-bold">{rangeInvoices.length} đơn bán</span> • <span className="text-emerald-600 font-bold">{rangeRepairs.length} đơn sửa chữa</span>
              </p>
            </div>
          </div>

          {/* Action buttons: Print & CSV Export */}
          <div className="flex items-center gap-2 self-start lg:self-center">
            <button
              id="btn-print-report-modal"
              onClick={() => setIsPrintModalOpen(true)}
              className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>In Báo Cáo</span>
            </button>
            <button
              id="btn-export-report-csv"
              onClick={exportToCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Xuất Excel/CSV</span>
            </button>
          </div>
        </div>

        {/* Row 2: 12-Month Quick Selector + Year Selector Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 shrink-0">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Chọn Tháng:</span>
            <select
              id="select-report-year"
              value={selectedYear}
              onChange={(e) => {
                const yr = parseInt(e.target.value);
                setSelectedYear(yr);
                handleSelectMonth(selectedMonth, yr);
              }}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027, 2028].map(yr => (
                <option key={yr} value={yr}>Năm {yr}</option>
              ))}
            </select>
          </div>

          {/* 12 Month Quick Buttons */}
          <div className="flex-1 flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => {
              const isSelected = preset === 'month_select' && selectedMonth === m;
              return (
                <button
                  key={m}
                  id={`btn-select-month-${m}`}
                  onClick={() => handleSelectMonth(m)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition cursor-pointer shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-xs scale-102 ring-2 ring-blue-400'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  Tháng {m}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 3: Presets & Custom Date Range Pickers */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-slate-500 font-bold mr-1">Phạm vi:</span>
            {[
              { id: 'today', label: 'Hôm nay' },
              { id: 'yesterday', label: 'Hôm qua' },
              { id: '7days', label: '7 ngày' },
              { id: '30days', label: '30 ngày' },
              { id: 'this_month', label: 'Tháng này' },
              { id: 'last_month', label: 'Tháng trước' },
              { id: 'q1', label: 'Quý 1' },
              { id: 'q2', label: 'Quý 2' },
              { id: 'q3', label: 'Quý 3' },
              { id: 'q4', label: 'Quý 4' },
              { id: 'this_year', label: `Cả năm ${selectedYear}` },
            ].map(item => (
              <button
                key={item.id}
                id={`btn-preset-${item.id}`}
                onClick={() => handleSelectPreset(item.id as PresetTime)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-extrabold transition cursor-pointer ${
                  preset === item.id 
                    ? 'bg-slate-900 text-white shadow-2xs' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
            <span className="text-[11px] font-bold text-slate-500">Từ:</span>
            <input 
              id="input-report-start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => {
                setCustomStartDate(e.target.value);
                setPreset('custom');
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-slate-800"
            />
            <span className="text-[11px] font-bold text-slate-500">Đến:</span>
            <input 
              id="input-report-end-date"
              type="date"
              value={customEndDate}
              onChange={(e) => {
                setCustomEndDate(e.target.value);
                setPreset('custom');
              }}
              className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs font-bold text-slate-800"
            />
          </div>
        </div>

      </div>

      {/* 2. SUB-NAVIGATION TABS (4 TRỌNG TÂM: DOANH THU - LỢI NHUẬN - CÔNG NỢ - LỊCH SỬ BÁN HÀNG) */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-1 shrink-0 overflow-x-auto">
        {[
          { id: 'revenue', label: '1. Doanh Thu & Cơ Cấu', icon: DollarSign, badge: formatVND(stats.totalRevenue) },
          { id: 'profit', label: '2. Lợi Nhuận & Giá Vốn', icon: TrendingUp, badge: formatVND(stats.grossProfit) },
          { id: 'debts', label: '3. Báo Cáo Công Nợ', icon: ReceiptText, badge: `${stats.totalNewDebts > 0 ? formatVND(stats.totalNewDebtsRemaining) : '0 ₫'}` },
          { id: 'history', label: '4. Lịch Sử Bán Hàng', icon: ShoppingBag, badge: `${rangeInvoices.length} HĐ` },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              id={`tab-report-sub-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id as ReportSubTab)}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl font-bold text-xs transition uppercase tracking-wide cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                isActive ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-700'
              }`}>
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN CONTENT PANELS ACCORDING TO ACTIVE SUB-TAB */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">

        {/* ===================== TAB 1: DOANH THU & CƠ CẤU ===================== */}
        {activeSubTab === 'revenue' && (
          <div className="space-y-4">
            
            {/* 4 KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Grand Total Revenue */}
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-blue-100">Tổng Doanh Thu</span>
                  <div className="p-2 bg-white/10 rounded-xl">
                    <DollarSign className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black tracking-tight">{formatVND(stats.totalRevenue)}</h3>
                  <p className="text-[11px] text-blue-100 mt-1">
                    Bán hàng: <span className="font-bold text-white">{formatVND(stats.salesTotal)}</span> • Sửa chữa: <span className="font-bold text-white">{formatVND(stats.repairsRevenueTotal)}</span>
                  </p>
                </div>
              </div>

              {/* Hardware Sales Revenue */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Doanh Số Bán Hàng</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(stats.salesTotal)}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Từ <span className="font-bold text-slate-700">{rangeInvoices.length} hóa đơn</span> xuất trong kỳ
                  </p>
                </div>
              </div>

              {/* Service & Repairs Revenue */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Dịch Vụ Sửa Chữa</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(stats.repairsRevenueTotal)}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Từ <span className="font-bold text-emerald-600">{rangeRepairs.length} phiếu</span> hoàn tất bàn giao
                  </p>
                </div>
              </div>

              {/* Payment Flow: Real Money Collected vs Debts */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Thực Thu vs Công Nợ</span>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                    <CreditCard className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-xl font-black text-purple-900 tracking-tight">
                    {formatVND(stats.cashSales + stats.bankSales + stats.repairsRevenueTotal)}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Ghi nợ phát sinh: <span className="font-bold text-rose-600">{formatVND(stats.debtSalesAmount)}</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Daily Timeline Revenue Chart */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    Biến Động Doanh Thu & Lợi Nhuận {dailyTimeline.isGroupByMonth ? 'Theo Tháng' : 'Theo Ngày'}
                  </h4>
                  <p className="text-xs text-slate-500">
                    Phân bổ tiến độ doanh thu bán linh kiện, dịch vụ kỹ thuật trong kỳ {dateRangeLabel}
                  </p>
                </div>

                <div className="flex items-center gap-3 text-xs font-bold">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-blue-600 inline-block" />
                    Bán hàng
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-emerald-500 inline-block" />
                    Sửa chữa
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-xs bg-amber-500 inline-block" />
                    Lợi nhuận
                  </span>
                </div>
              </div>

              {/* Responsive SVG / CSS Bar Chart */}
              {dailyTimeline.points.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs font-medium">
                  Không có dữ liệu giao dịch trong khoảng thời gian đã chọn
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="h-56 flex items-end gap-1 sm:gap-2 pt-6 pb-2 border-b border-slate-100 overflow-x-auto scrollbar-thin">
                    {dailyTimeline.points.map((pt, idx) => {
                      const totalRev = pt.sales + pt.repairs;
                      const salesHeight = Math.round((pt.sales / dailyTimeline.maxVal) * 100);
                      const repairsHeight = Math.round((pt.repairs / dailyTimeline.maxVal) * 100);
                      const profitHeight = Math.round((pt.profit / dailyTimeline.maxVal) * 100);

                      return (
                        <div 
                          key={idx} 
                          className="flex-1 min-w-[28px] sm:min-w-[36px] max-w-[48px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                        >
                          {/* Hover Tooltip */}
                          <div className="absolute -top-16 bg-slate-900 text-white text-[10px] font-bold p-2 rounded-lg opacity-0 group-hover:opacity-100 transition pointer-events-none z-30 whitespace-nowrap shadow-xl">
                            <p className="font-extrabold text-amber-300">{pt.dateKey}</p>
                            <p>Bán hàng: {formatVND(pt.sales)}</p>
                            <p>Sửa chữa: {formatVND(pt.repairs)}</p>
                            <p className="text-emerald-300 border-t border-slate-700 mt-0.5 pt-0.5">Lợi nhuận: {formatVND(pt.profit)}</p>
                          </div>

                          {/* Stacked Bars */}
                          <div className="w-full flex items-end justify-center gap-0.5 h-full">
                            {/* Revenue Bar */}
                            <div className="w-1/2 flex flex-col justify-end h-full">
                              <div 
                                style={{ height: `${repairsHeight}%` }} 
                                className="w-full bg-emerald-500 rounded-t-xs transition-all duration-300"
                              />
                              <div 
                                style={{ height: `${salesHeight}%` }} 
                                className="w-full bg-blue-600 rounded-b-xs transition-all duration-300"
                              />
                            </div>
                            {/* Profit Bar */}
                            <div className="w-1/2 flex flex-col justify-end h-full">
                              <div 
                                style={{ height: `${profitHeight}%` }} 
                                className="w-full bg-amber-500/90 rounded-t-xs transition-all duration-300"
                              />
                            </div>
                          </div>

                          {/* X-axis label */}
                          <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-600 transition truncate mt-1">
                            {pt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold px-1">
                    <span>Mốc bắt đầu: {startDate}</span>
                    <span>Đỉnh cao nhất kỳ: {formatVND(dailyTimeline.maxVal)}</span>
                    <span>Mốc kết thúc: {endDate}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Row: Breakdown by Payment Method & Top Products by Revenue */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              
              {/* Payment Methods Breakdown */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-600" />
                  Cơ Cấu Nguồn Tiền Thanh Toán
                </h4>
                
                <div className="space-y-2.5 text-xs">
                  {/* Cash */}
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Tiền mặt</span>
                      <span>{formatVND(stats.cashSales)} ({stats.salesTotal > 0 ? Math.round((stats.cashSales / stats.salesTotal) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${stats.salesTotal > 0 ? (stats.cashSales / stats.salesTotal) * 100 : 0}%` }}
                        className="h-full bg-emerald-500 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Bank Transfer */}
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Chuyển khoản ngân hàng / Quẹt thẻ</span>
                      <span>{formatVND(stats.bankSales)} ({stats.salesTotal > 0 ? Math.round((stats.bankSales / stats.salesTotal) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${stats.salesTotal > 0 ? (stats.bankSales / stats.salesTotal) * 100 : 0}%` }}
                        className="h-full bg-blue-600 rounded-full"
                      />
                    </div>
                  </div>

                  {/* Debts */}
                  <div>
                    <div className="flex justify-between font-bold text-slate-700 mb-1">
                      <span>Ghi nợ (Chưa thu ngay)</span>
                      <span>{formatVND(stats.debtSalesAmount)} ({stats.salesTotal > 0 ? Math.round((stats.debtSalesAmount / stats.salesTotal) * 100) : 0}%)</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${stats.salesTotal > 0 ? (stats.debtSalesAmount / stats.salesTotal) * 100 : 0}%` }}
                        className="h-full bg-rose-500 rounded-full"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl text-[11px] text-slate-600 font-medium">
                  💡 <span className="font-bold">Mẹo quản lý:</span> Cân đối tỷ lệ tiền mặt và chuyển khoản để duy trì dòng tiền nhập hàng ổn định trong kỳ.
                </div>
              </div>

              {/* Top Revenue Products */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  Top 5 Linh Kiện Đóng Góp Doanh Số Cao Nhất
                </h4>

                <div className="divide-y divide-slate-100">
                  {stats.topProducts.slice(0, 5).map((p, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-2">
                          <span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-800 truncate">{p.name}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium ml-6">
                          Đã bán: <b className="text-slate-600">{p.quantity}</b> • Danh mục: {p.category}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black text-slate-900">{formatVND(p.revenue)}</p>
                        <p className="text-[10px] text-emerald-600 font-bold">Lãi: {formatVND(p.profit)}</p>
                      </div>
                    </div>
                  ))}

                  {stats.topProducts.length === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Chưa có phát sinh bán linh kiện trong kỳ
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ===================== TAB 2: LỢI NHUẬN & GIÁ VỐN ===================== */}
        {activeSubTab === 'profit' && (
          <div className="space-y-4">
            
            {/* Profit KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Gross Profit */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100">Tổng Lợi Nhuận Gộp</span>
                  <div className="p-2 bg-white/10 rounded-xl">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black tracking-tight">{formatVND(stats.grossProfit)}</h3>
                  <p className="text-[11px] text-emerald-100 mt-1">
                    Tỷ suất lợi nhuận: <span className="font-black text-white">{stats.profitMargin.toFixed(1)}%</span>
                  </p>
                </div>
              </div>

              {/* Total COGS (Giá vốn hàng bán) */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Tổng Tiền Vốn Nhập (COGS)</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <Layers className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(stats.totalCost)}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Vốn linh kiện bán: {formatVND(stats.salesCostTotal)}
                  </p>
                </div>
              </div>

              {/* Retail Sales Profit */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Lãi Từ Bán Hàng & PC</span>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(stats.salesProfit)}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Biên lợi nhuận bán: <span className="font-bold text-blue-600">{stats.salesTotal > 0 ? ((stats.salesProfit / stats.salesTotal) * 100).toFixed(1) : 0}%</span>
                  </p>
                </div>
              </div>

              {/* Service Repairs Profit */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Lãi Dịch Vụ Sửa Chữa</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <Wrench className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{formatVND(stats.repairsProfit)}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Biên lợi nhuận dịch vụ: <span className="font-bold text-emerald-600">{stats.repairsRevenueTotal > 0 ? ((stats.repairsProfit / stats.repairsRevenueTotal) * 100).toFixed(1) : 0}%</span>
                  </p>
                </div>
              </div>

            </div>

            {/* Profit Analysis Table by Product */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Bảng Kê Chi Tiết Lợi Nhuận Từng Sản Phẩm Trong Kỳ ({stats.topProducts.length} mặt hàng)
                  </h4>
                  <p className="text-xs text-slate-500">
                    Thống kê doanh số, tiền vốn nhập kho và mức sinh lời thực tế của từng linh kiện đã xuất bán
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-3">#</th>
                      <th className="p-3">Tên Sản Phẩm / Linh Kiện</th>
                      <th className="p-3">Nhóm</th>
                      <th className="p-3 text-center">SL Đã Bán</th>
                      <th className="p-3 text-right">Doanh Thu</th>
                      <th className="p-3 text-right">Giá Vốn Nhập</th>
                      <th className="p-3 text-right">Lợi Nhuận Gộp</th>
                      <th className="p-3 text-right">Tỷ Suất (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {stats.topProducts.map((item, idx) => {
                      const margin = item.revenue > 0 ? (item.profit / item.revenue) * 100 : 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 font-bold text-slate-400">{idx + 1}</td>
                          <td className="p-3 font-black text-slate-800">{item.name}</td>
                          <td className="p-3 text-slate-500">{item.category}</td>
                          <td className="p-3 text-center font-bold text-slate-700">{item.quantity}</td>
                          <td className="p-3 text-right font-bold text-slate-900">{formatVND(item.revenue)}</td>
                          <td className="p-3 text-right text-slate-500">{formatVND(item.cost)}</td>
                          <td className="p-3 text-right font-black text-emerald-600">+{formatVND(item.profit)}</td>
                          <td className="p-3 text-right font-extrabold">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                              margin >= 30 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : margin >= 15 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {margin.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                    {stats.topProducts.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                          Không có sản phẩm nào phát sinh lợi nhuận trong kỳ
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {stats.topProducts.length > 0 && (
                    <tfoot>
                      <tr className="bg-slate-100/70 font-black text-slate-900 border-t-2 border-slate-200">
                        <td colSpan={3} className="p-3 uppercase text-right">Tổng Cộng:</td>
                        <td className="p-3 text-center font-black">
                          {stats.topProducts.reduce((sum, p) => sum + p.quantity, 0)}
                        </td>
                        <td className="p-3 text-right">{formatVND(stats.salesTotal)}</td>
                        <td className="p-3 text-right">{formatVND(stats.salesCostTotal)}</td>
                        <td className="p-3 text-right text-emerald-700">+{formatVND(stats.salesProfit)}</td>
                        <td className="p-3 text-right">
                          {stats.salesTotal > 0 ? ((stats.salesProfit / stats.salesTotal) * 100).toFixed(1) : 0}%
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ===================== TAB 3: BÁO CÁO CÔNG NỢ ===================== */}
        {activeSubTab === 'debts' && (
          <div className="space-y-4">
            
            {/* Debt KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* New Debts Incurred */}
              <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white rounded-2xl p-4 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-rose-100">Nợ Phát Sinh Mới</span>
                  <div className="p-2 bg-white/10 rounded-xl">
                    <ReceiptText className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black tracking-tight">{formatVND(stats.totalNewDebts)}</h3>
                  <p className="text-[11px] text-rose-100 mt-1">
                    Ghi nợ từ <span className="font-bold text-white">{rangeDebtsCreated.length} hóa đơn</span> trong kỳ
                  </p>
                </div>
              </div>

              {/* Debt Collected In Range */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Đã Thu Hồi Trong Kỳ</span>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-emerald-600 tracking-tight">{formatVND(stats.totalDebtsCollected)}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Từ <span className="font-bold text-slate-700">{rangeDebtPaymentsCollected.length} lần trả tiền</span> của khách
                  </p>
                </div>
              </div>

              {/* Remaining Debt In Range */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Nợ Kỳ Này Chưa Thu</span>
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-2">
                  <h3 className="text-2xl font-black text-amber-700 tracking-tight">{formatVND(stats.totalNewDebtsRemaining)}</h3>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Tỷ lệ thu hồi: <span className="font-bold text-slate-700">
                      {stats.totalNewDebts > 0 ? (((stats.totalNewDebts - stats.totalNewDebtsRemaining) / stats.totalNewDebts) * 100).toFixed(1) : 100}%
                    </span>
                  </p>
                </div>
              </div>

              {/* Quick Jump to Debts Tab */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Quản Lý Sổ Nợ</span>
                  <p className="text-xs text-slate-500 mt-1">
                    Xem toàn bộ lịch sử thanh toán, nhắc nợ và in phiếu thu nợ chuyên nghiệp
                  </p>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('debts')}
                    className="mt-3 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Mở Sổ Công Nợ Chi Tiết</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

            </div>

            {/* Debts Table in Range */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <ReceiptText className="w-4 h-4 text-rose-600" />
                Danh Sách Các Khoản Nợ Phát Sinh Trong Kỳ {dateRangeLabel} ({rangeDebtsCreated.length} khoản)
              </h4>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-3">Mã HĐ / Nợ</th>
                      <th className="p-3">Khách Hàng</th>
                      <th className="p-3">Số Điện Thoại</th>
                      <th className="p-3">Ngày Lập Nợ</th>
                      <th className="p-3">Hạn Thanh Toán</th>
                      <th className="p-3 text-right">Tổng Nợ Gốc</th>
                      <th className="p-3 text-right">Còn Nợ</th>
                      <th className="p-3 text-center">Trạng Thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rangeDebtsCreated.map((d, idx) => {
                      const isOverdue = d.remainingAmount > 0 && d.dueDate && d.dueDate < new Date().toISOString().slice(0, 10);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-black text-blue-600">{d.invoiceNumber || d.id}</td>
                          <td className="p-3 font-bold text-slate-800">{d.customerName}</td>
                          <td className="p-3 font-mono text-slate-600">{d.customerPhone || 'N/A'}</td>
                          <td className="p-3 text-slate-500">{getDateStr(d.createdAt)}</td>
                          <td className="p-3">
                            <span className={isOverdue ? 'font-bold text-rose-600' : 'text-slate-600'}>
                              {d.dueDate || 'Không có'}
                            </span>
                            {isOverdue && <span className="text-[10px] font-black text-rose-600 block">Quá hạn</span>}
                          </td>
                          <td className="p-3 text-right font-bold text-slate-800">{formatVND(d.amount)}</td>
                          <td className="p-3 text-right font-black text-rose-600">{formatVND(d.remainingAmount)}</td>
                          <td className="p-3 text-center">
                            {d.status === 'paid' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Đã tất toán
                              </span>
                            ) : d.status === 'partial' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-200">
                                Trả một phần
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
                                Chưa trả
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {rangeDebtsCreated.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                          Không có khoản nợ nào phát sinh trong khoảng thời gian này!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Payments Collected in Range */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Các Khoản Thu Nợ Thực Tế Trong Kỳ ({rangeDebtPaymentsCollected.length} lần thu)
              </h4>

              <div className="divide-y divide-slate-100">
                {rangeDebtPaymentsCollected.map((item, idx) => (
                  <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{item.debt.customerName}</span>
                      <span className="text-slate-400 ml-2 font-mono">({item.debt.invoiceNumber || item.debt.id})</span>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Ngày thu: <b className="text-slate-700">{new Date(item.payment.paidAt).toLocaleString('vi-VN')}</b>
                        {item.payment.collectedBy && ` • Người thu: ${item.payment.collectedBy}`}
                        {item.payment.paymentMethod && ` • Phương thức: ${item.payment.paymentMethod}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-emerald-600">+{formatVND(item.payment.amount)}</span>
                      <span className="text-[10px] text-slate-400 block">Nợ còn lại: {formatVND(item.debt.remainingAmount)}</span>
                    </div>
                  </div>
                ))}

                {rangeDebtPaymentsCollected.length === 0 && (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    Chưa có khoản thu hồi nợ nào trong khoảng thời gian này
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ===================== TAB 4: LỊCH SỬ BÁN HÀNG CHI TIẾT ===================== */}
        {activeSubTab === 'history' && (
          <div className="space-y-4">
            
            {/* Search & Quick Filters Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-search-sales-history"
                  type="text"
                  placeholder="Tìm theo mã HĐ, tên khách, số điện thoại, tên linh kiện, IMEI..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="select-history-payment-filter"
                  value={historyPaymentFilter}
                  onChange={(e) => setHistoryPaymentFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 cursor-pointer"
                >
                  <option value="all">Tất cả hình thức</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="debt">Đơn có nợ lại</option>
                </select>

                <button
                  onClick={() => setHistoryDebtOnly(!historyDebtOnly)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    historyDebtOnly 
                      ? 'bg-rose-600 text-white' 
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Chỉ đơn còn nợ</span>
                </button>
              </div>
            </div>

            {/* Sales Invoices Table */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-blue-600" />
                  Danh Sách Hóa Đơn Bán Hàng Trong Kỳ ({filteredSalesHistory.length} hóa đơn)
                </h4>
                <div className="text-xs font-black text-slate-700">
                  Tổng tiền: <span className="text-blue-600 font-extrabold">{formatVND(filteredSalesHistory.reduce((s, i) => s + i.totalAmount, 0))}</span>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-black uppercase text-[10px] tracking-wider">
                      <th className="p-3">Mã Đơn</th>
                      <th className="p-3">Thời Gian</th>
                      <th className="p-3">Khách Hàng & SĐT</th>
                      <th className="p-3">Chi Tiết Mặt Hàng</th>
                      <th className="p-3 text-center">Hình Thức</th>
                      <th className="p-3 text-right">Tổng Tiền</th>
                      <th className="p-3 text-right">Lãi Ước Tính</th>
                      <th className="p-3 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSalesHistory.map((inv, idx) => {
                      // calculate order profit
                      let orderCost = 0;
                      inv.items.forEach(it => {
                        const cleanName = it.productName.replace(/^\[PC Build - [^\]]+\]\s*/i, '').trim();
                        const p = products.find(prod => prod.id === it.productId || prod.name === cleanName || prod.name === it.productName);
                        orderCost += (p && p.cost > 0 ? p.cost : it.price * 0.75) * it.quantity;
                      });
                      const orderProfit = inv.totalAmount - orderCost;

                      return (
                        <tr key={idx} className="hover:bg-slate-50 transition">
                          <td className="p-3 font-mono font-black text-blue-600">
                            #{inv.invoiceNumber}
                          </td>
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            <span className="font-bold text-slate-700 block">
                              {new Date(inv.createdAt).toLocaleDateString('vi-VN')}
                            </span>
                            <span className="text-[10px]">
                              {new Date(inv.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-black text-slate-800 block">{inv.customerName}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{inv.customerPhone}</span>
                          </td>
                          <td className="p-3 max-w-xs">
                            <div className="space-y-1">
                              {inv.items.map((it, iIdx) => (
                                <div key={iIdx} className="text-[11px] text-slate-700 flex items-start gap-1">
                                  <span className="font-bold text-slate-900">• {it.quantity}x</span>
                                  <span className="truncate">{it.productName}</span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {inv.paymentMethod}
                            </span>
                            {inv.debtAmount && inv.debtAmount > 0 ? (
                              <span className="block text-[10px] text-rose-600 font-black mt-0.5">
                                Nợ {formatVND(inv.debtAmount)}
                              </span>
                            ) : null}
                          </td>
                          <td className="p-3 text-right font-black text-slate-900 whitespace-nowrap">
                            {formatVND(inv.totalAmount)}
                          </td>
                          <td className="p-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                            +{formatVND(orderProfit)}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => setViewingInvoice(inv)}
                              className="p-1.5 hover:bg-blue-50 text-blue-600 rounded-lg transition cursor-pointer"
                              title="Xem chi tiết hóa đơn"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {filteredSalesHistory.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                          Không tìm thấy hóa đơn nào trong khoảng thời gian này!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </div>

      {/* ===================== MODAL: VIEW INVOICE DETAIL ===================== */}
      <AnimatePresence>
        {viewingInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-slate-900">
                      Chi Tiết Hóa Đơn #{viewingInvoice.invoiceNumber}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">
                      Thời gian lập: {new Date(viewingInvoice.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-700 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Khách Hàng:</span>
                    <p className="font-black text-slate-800 text-sm">{viewingInvoice.customerName}</p>
                    <p className="text-slate-600 font-mono mt-0.5">{viewingInvoice.customerPhone}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Hình Thức Thanh Toán:</span>
                    <p className="font-black text-slate-800 text-sm">{viewingInvoice.paymentMethod}</p>
                    <p className="text-slate-500 mt-0.5">Người lập: {viewingInvoice.processedBy || 'Nhân viên bán hàng'}</p>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <h4 className="font-bold text-slate-700 uppercase tracking-wide mb-2 text-[11px]">
                    Danh Sách Sản Phẩm ({viewingInvoice.items.length} mặt hàng):
                  </h4>
                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                    {viewingInvoice.items.map((it, idx) => (
                      <div key={idx} className="p-3 flex items-start justify-between bg-white">
                        <div className="min-w-0 pr-2">
                          <p className="font-black text-slate-900">{it.productName}</p>
                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                            <span>SL: <b>{it.quantity}</b></span>
                            <span>• Đơn giá: <b>{formatVND(it.price)}</b></span>
                            {it.warrantyMonths && (
                              <span>• BH: <b className="text-blue-600">{it.warrantyMonths} tháng</b></span>
                            )}
                          </div>
                          {it.imeis && it.imeis.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {it.imeis.map((im, iIdx) => (
                                <span key={iIdx} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-mono font-bold">
                                  S/N: {im}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-black text-slate-900 text-sm whitespace-nowrap">
                          {formatVND(it.price * it.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Summary */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-300">
                    <span>Tổng tiền hóa đơn:</span>
                    <span className="text-sm font-black text-white">{formatVND(viewingInvoice.totalAmount)}</span>
                  </div>
                  {viewingInvoice.debtAmount && viewingInvoice.debtAmount > 0 ? (
                    <div className="flex justify-between text-xs font-bold text-rose-300 border-t border-slate-800 pt-1.5">
                      <span>Số tiền ghi nợ:</span>
                      <span className="font-black text-rose-400">{formatVND(viewingInvoice.debtAmount)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-xs font-bold text-emerald-400 border-t border-slate-800 pt-1.5">
                      <span>Trạng thái:</span>
                      <span>Đã thanh toán đủ 100%</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex justify-end">
                <button
                  onClick={() => setViewingInvoice(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ===================== MODAL: PRINT PREVIEW OF REPORT ===================== */}
      <AnimatePresence>
        {isPrintModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl max-w-3xl w-full p-6 shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-sm text-slate-900 uppercase">
                  Bản In Báo Cáo Kế Toán & Kinh Doanh
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-do-print-report"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Printer className="w-4 h-4" />
                    <span>In Ngay</span>
                  </button>
                  <button
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Body Content */}
              <div id="printable-report-container" className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800 text-xs bg-white">
                
                {/* Store Header */}
                <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-black text-slate-900 uppercase">{printSettings.storeName || "THỊNH PHÁT COMPUTER"}</h2>
                    <p className="text-[11px] text-slate-600 font-medium">{printSettings.storeAddress}</p>
                    <p className="text-[11px] text-slate-600 font-medium">Hotline: {printSettings.storePhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Thời điểm xuất báo cáo</span>
                    <span className="font-mono text-slate-700 font-bold">{new Date().toLocaleString('vi-VN')}</span>
                  </div>
                </div>

                {/* Report Title */}
                <div className="text-center space-y-1">
                  <h1 className="text-lg font-black uppercase text-slate-900 tracking-wide">
                    BÁO CÁO DOANH THU - LỢI NHUẬN & CÔNG NỢ
                  </h1>
                  <p className="text-xs font-bold text-blue-700">
                    Kỳ báo cáo: {dateRangeLabel} ({startDate} đến {endDate})
                  </p>
                </div>

                {/* KPI Summary Grid */}
                <div className="grid grid-cols-3 gap-3 border border-slate-300 rounded-xl p-3 bg-slate-50 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Tổng Doanh Thu</span>
                    <p className="text-base font-black text-slate-900 mt-0.5">{formatVND(stats.totalRevenue)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Tổng Vốn Hàng Bán</span>
                    <p className="text-base font-black text-slate-900 mt-0.5">{formatVND(stats.totalCost)}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Lợi Nhuận Gộp</span>
                    <p className="text-base font-black text-emerald-700 mt-0.5">+{formatVND(stats.grossProfit)}</p>
                  </div>
                </div>

                {/* Detailed Indicators */}
                <div className="space-y-1 border border-slate-200 rounded-xl p-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>1. Doanh thu bán lẻ & cấu hình máy ({rangeInvoices.length} đơn):</span>
                    <span className="font-bold">{formatVND(stats.salesTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>2. Doanh thu dịch vụ kỹ thuật sửa chữa ({rangeRepairs.length} đơn):</span>
                    <span className="font-bold">{formatVND(stats.repairsRevenueTotal)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>3. Lợi nhuận từ bán hàng phần cứng:</span>
                    <span className="font-bold text-emerald-600">+{formatVND(stats.salesProfit)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>4. Lợi nhuận từ dịch vụ sửa chữa:</span>
                    <span className="font-bold text-emerald-600">+{formatVND(stats.repairsProfit)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-100">
                    <span>5. Công nợ khách hàng phát sinh trong kỳ:</span>
                    <span className="font-bold text-rose-600">{formatVND(stats.totalNewDebts)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>6. Công nợ đã thu hồi thành công trong kỳ:</span>
                    <span className="font-bold text-emerald-600">{formatVND(stats.totalDebtsCollected)}</span>
                  </div>
                </div>

                {/* Top 5 Products Table */}
                <div>
                  <h4 className="font-black text-xs uppercase text-slate-800 mb-1.5">Top 5 Mặt Hàng Hiệu Quả Nhất Trong Kỳ:</h4>
                  <table className="w-full text-left text-xs border border-slate-200 border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold text-[10px]">
                        <th className="p-2 border border-slate-200">#</th>
                        <th className="p-2 border border-slate-200">Tên Linh Kiện / Thiết Bị</th>
                        <th className="p-2 border border-slate-200 text-center">SL</th>
                        <th className="p-2 border border-slate-200 text-right">Doanh Thu</th>
                        <th className="p-2 border border-slate-200 text-right">Lợi Nhuận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.topProducts.slice(0, 5).map((p, idx) => (
                        <tr key={idx}>
                          <td className="p-2 border border-slate-200 text-center">{idx + 1}</td>
                          <td className="p-2 border border-slate-200 font-bold">{p.name}</td>
                          <td className="p-2 border border-slate-200 text-center">{p.quantity}</td>
                          <td className="p-2 border border-slate-200 text-right">{formatVND(p.revenue)}</td>
                          <td className="p-2 border border-slate-200 text-right font-bold text-emerald-600">+{formatVND(p.profit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-3 gap-4 pt-10 text-center font-bold">
                  <div>
                    <p className="text-xs uppercase">Người Lập Biểu</p>
                    <p className="text-[10px] text-slate-400 font-normal">(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase">Kế Toán Cửa Hàng</p>
                    <p className="text-[10px] text-slate-400 font-normal">(Ký, ghi rõ họ tên)</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase">Chủ Cửa Hàng</p>
                    <p className="text-[10px] text-slate-400 font-normal">(Ký, đóng dấu xác nhận)</p>
                  </div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
