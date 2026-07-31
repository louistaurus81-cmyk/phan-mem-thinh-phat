import React, { useState, useMemo } from 'react';
import { Debt, DebtPayment, Customer, SalesInvoice, PrintSettings, User } from '../types';
import { 
  Search, 
  DollarSign, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  X,
  TrendingDown,
  ChevronRight,
  Sparkles,
  FileText,
  Printer,
  Receipt,
  History,
  User as UserIcon,
  CreditCard,
  ArrowRight,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import TPLogo from './TPLogo';

interface DebtManagerProps {
  debts: Debt[];
  onUpdateDebts: (updated: Debt[]) => void;
  customers: Customer[];
  invoices?: SalesInvoice[];
  printSettings?: PrintSettings;
  currentUser?: User | null;
}

export default function DebtManager({ 
  debts, 
  onUpdateDebts, 
  customers, 
  invoices = [], 
  printSettings,
  currentUser 
}: DebtManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  
  // Modals state
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<number>(0);
  const [payNote, setPayNote] = useState('');
  const [payPaymentMethod, setPayPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản' | 'Thẻ'>('Tiền mặt');

  // History modal state
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDebtForHistory, setSelectedDebtForHistory] = useState<Debt | null>(null);
  const [historyScope, setHistoryScope] = useState<'current_debt' | 'customer_all'>('current_debt');

  // Invoice detail modal state
  const [viewingInvoiceDetails, setViewingInvoiceDetails] = useState<SalesInvoice | null>(null);

  // Print Payment Receipt state
  const [printingPaymentReceipt, setPrintingPaymentReceipt] = useState<{
    debt: Debt;
    payment: DebtPayment;
    paymentIndex: number;
    remainingAfter: number;
  } | null>(null);

  // Manual Add Debt Modal state
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [manualDebt, setManualDebt] = useState({
    customerId: '',
    amount: 0,
    dueDate: () => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toISOString().slice(0, 10);
    },
    note: ''
  });

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  const formatFullDateTime = (isoStr?: string) => {
    if (!isoStr) return '--';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const datePart = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timePart = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
      return `${datePart} ${timePart}`;
    } catch {
      return isoStr;
    }
  };

  // Helper to find associated invoice for a debt record
  const getInvoiceForDebt = (debt: Debt): SalesInvoice | undefined => {
    if (debt.invoiceId && invoices) {
      const inv = invoices.find(i => i.id === debt.invoiceId);
      if (inv) return inv;
    }
    if (debt.invoiceNumber && invoices) {
      const inv = invoices.find(i => i.invoiceNumber === debt.invoiceNumber);
      if (inv) return inv;
    }
    if (invoices && invoices.length > 0) {
      return invoices.find(i => 
        (i.customerId === debt.customerId && i.createdAt === debt.createdAt) ||
        (debt.note && debt.note.includes(i.invoiceNumber))
      );
    }
    return undefined;
  };

  // Compute overall stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let totalOwed = 0;
    let totalOverdue = 0;
    let pendingCount = 0;
    let totalCollected = 0;

    debts.forEach(d => {
      const paid = (d.amount || 0) - (d.remainingAmount || 0);
      if (paid > 0) totalCollected += paid;

      if (d.status !== 'paid' && d.remainingAmount > 0) {
        totalOwed += d.remainingAmount;
        pendingCount += 1;
        if (d.dueDate < today) {
          totalOverdue += d.remainingAmount;
        }
      }
    });

    return { totalOwed, totalOverdue, pendingCount, totalCollected };
  }, [debts]);

  // Filter debts list
  const filteredDebts = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return debts.filter(d => {
      // Tab filter
      if (filterTab === 'pending' && d.status === 'paid') return false;
      if (filterTab === 'paid' && d.status !== 'paid') return false;
      if (filterTab === 'overdue' && (d.status === 'paid' || d.dueDate >= today)) return false;

      // Search match
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      const inv = getInvoiceForDebt(d);
      const itemsStr = inv ? inv.items.map(i => i.productName).join(' ').toLowerCase() : '';

      return (
        d.customerName.toLowerCase().includes(query) ||
        (d.customerPhone && d.customerPhone.includes(query)) ||
        (d.invoiceNumber && d.invoiceNumber.toLowerCase().includes(query)) ||
        (inv && inv.invoiceNumber.toLowerCase().includes(query)) ||
        (d.id && d.id.toLowerCase().includes(query)) ||
        (d.note && d.note.toLowerCase().includes(query)) ||
        d.dueDate.includes(query) ||
        itemsStr.includes(query)
      );
    });
  }, [debts, filterTab, searchQuery, invoices]);

  // Handle debt collection submission
  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    if (payAmountInput <= 0 || payAmountInput > selectedDebt.remainingAmount) {
      alert('Số tiền thanh toán nợ không hợp lệ.');
      return;
    }

    const newPayment: DebtPayment = {
      id: `pay_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      amount: payAmountInput,
      paidAt: new Date().toISOString(),
      note: payNote.trim() || 'Thanh toán công nợ',
      collectedBy: currentUser?.fullName || 'Nhân viên',
      paymentMethod: payPaymentMethod
    };

    let newRemainingAfter = 0;

    const updatedDebts = debts.map(d => {
      if (d.id !== selectedDebt.id) return d;
      
      const nextRemaining = Math.max(0, d.remainingAmount - payAmountInput);
      newRemainingAfter = nextRemaining;
      const isCompleted = nextRemaining === 0;
      const currentPayments = d.payments || [];

      return {
        ...d,
        remainingAmount: nextRemaining,
        status: isCompleted ? ('paid' as const) : ('partial' as const),
        payments: [...currentPayments, newPayment],
        note: (d.note || '') + ` [Thu ${formatVND(payAmountInput)} (${payPaymentMethod}) ngày ${new Date().toLocaleDateString('vi-VN')}]`
      };
    });

    onUpdateDebts(updatedDebts);

    const updatedDebt = updatedDebts.find(d => d.id === selectedDebt.id);

    setShowPayModal(false);
    setSelectedDebt(null);
    setPayAmountInput(0);
    setPayNote('');

    if (updatedDebt) {
      const pIdx = (updatedDebt.payments || []).length;
      if (window.confirm(`Khấu trừ ${formatVND(payAmountInput)} công nợ thành công!\n\nBạn có muốn xem hoặc in PHIẾU THU CÔNG NỢ ngay bây giờ không?`)) {
        setPrintingPaymentReceipt({
          debt: updatedDebt,
          payment: newPayment,
          paymentIndex: pIdx,
          remainingAfter: newRemainingAfter
        });
      }
    }
  };

  // Handle Manual Debt submission
  const handleAddManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === manualDebt.customerId);
    if (!cust) {
      alert('Vui lòng chọn khách hàng.');
      return;
    }
    if (manualDebt.amount <= 0) {
      alert('Số tiền nợ phải lớn hơn 0.');
      return;
    }

    const newDebt: Debt = {
      id: `manual_debt_${Date.now()}`,
      customerId: cust.id,
      customerName: cust.name,
      customerPhone: cust.phone,
      amount: Number(manualDebt.amount),
      remainingAmount: Number(manualDebt.amount),
      dueDate: typeof manualDebt.dueDate === 'function' ? manualDebt.dueDate() : (manualDebt.dueDate as any),
      status: 'pending',
      createdAt: new Date().toISOString(),
      note: manualDebt.note.trim() || 'Ghi nợ mở biên thủ công',
      payments: []
    };

    onUpdateDebts([...debts, newDebt]);
    setShowAddManualModal(false);
    setManualDebt({
      customerId: '',
      amount: 0,
      dueDate: () => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().slice(0, 10);
      },
      note: ''
    });
    alert('Ghi nhận số dư nợ thủ công thành công!');
  };

  const isOverdue = (debt: Debt) => {
    if (debt.status === 'paid') return false;
    const today = new Date().toISOString().slice(0, 10);
    return debt.dueDate < today;
  };

  // Helper to build complete chronological payment timeline including initial down payment
  const getFullDebtPayments = (d: Debt) => {
    const paymentsList = d.payments || [];
    const inv = getInvoiceForDebt(d);

    const sumRecorded = paymentsList.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalPaidSoFar = (d.amount || 0) - (d.remainingAmount || 0);
    const initialAmount = Math.max(0, totalPaidSoFar - sumRecorded);

    const result: {
      payment: DebtPayment;
      indexNumber?: number;
      indexLabel: string;
      remainingAfter: number;
      isInitial?: boolean;
    }[] = [];

    let runningRemaining = d.amount;

    if (initialAmount > 0) {
      runningRemaining -= initialAmount;
      const initialPayment: DebtPayment = {
        id: `initial_${d.id}`,
        amount: initialAmount,
        paidAt: inv?.createdAt || d.createdAt || new Date().toISOString(),
        note: inv 
          ? `Thanh toán ban đầu cho HĐ #${inv.invoiceNumber}` 
          : 'Thanh toán 1 phần lúc tạo công nợ',
        collectedBy: inv?.processedBy || 'Thu ngân / POS',
        paymentMethod: (inv?.paymentMethod as any) || 'Tiền mặt'
      };

      result.push({
        payment: initialPayment,
        indexNumber: 1,
        indexLabel: 'Lần 1',
        remainingAfter: Math.max(0, runningRemaining),
        isInitial: true
      });
    }

    const startIdx = initialAmount > 0 ? 2 : 1;
    paymentsList.forEach((p, idx) => {
      runningRemaining -= p.amount;
      const seq = startIdx + idx;
      result.push({
        payment: p,
        indexNumber: seq,
        indexLabel: `Lần ${seq}`,
        remainingAfter: Math.max(0, runningRemaining),
        isInitial: false
      });
    });

    return result;
  };

  // Compute customer level history payments across all debts
  const customerAllPayments = useMemo(() => {
    if (!selectedDebtForHistory) return [];
    const custId = selectedDebtForHistory.customerId;
    const custDebts = debts.filter(d => d.customerId === custId);

    const list: {
      debt: Debt;
      payment: DebtPayment;
      indexNumber?: number;
      indexLabel: string;
      remainingAfter: number;
      isInitial?: boolean;
    }[] = [];

    custDebts.forEach(d => {
      const fullList = getFullDebtPayments(d);
      fullList.forEach(item => {
        list.push({
          debt: d,
          payment: item.payment,
          indexNumber: item.indexNumber,
          indexLabel: item.indexLabel,
          remainingAfter: item.remainingAfter,
          isInitial: item.isInitial
        });
      });
    });

    return list.sort((a, b) => new Date(b.payment.paidAt).getTime() - new Date(a.payment.paidAt).getTime());
  }, [selectedDebtForHistory, debts, invoices]);

  // Compute current debt chronological running balance
  const currentDebtPayments = useMemo(() => {
    if (!selectedDebtForHistory) return [];
    const fullList = getFullDebtPayments(selectedDebtForHistory);
    return fullList.reverse(); // Show newest payment first
  }, [selectedDebtForHistory, invoices]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200 bento-shadow">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">💵</span> Sổ Quản Lý & Thu Hồi Công Nợ Khách Hàng
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Theo dõi chi tiết các khoản nợ, kỳ hạn, lịch sử từng đợt thu nợ & in phiếu thu nợ.</p>
        </div>
        <button 
          id="btn-add-manual-debt"
          onClick={() => setShowAddManualModal(true)}
          className="flex items-center gap-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition px-4 py-2.5 rounded-xl cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Ghi nợ thủ công
        </button>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng Nợ Phải Thu</span>
            <div className="text-xl font-black mt-1 text-indigo-600">{formatVND(stats.totalOwed)}</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Công Nợ Quá Hạn ⚠️</span>
            <div className={`text-xl font-black mt-1 ${stats.totalOverdue > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>
              {formatVND(stats.totalOverdue)}
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đã Thu Hồi Tổng Cộng</span>
            <div className="text-xl font-black mt-1 text-emerald-600">{formatVND(stats.totalCollected)}</div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Số Khách Đang Còn Nợ</span>
            <div className="text-xl font-black mt-1 text-slate-800">{stats.pendingCount} khoản nợ</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Table Section */}
      <div className="bg-white rounded-2xl border border-slate-200 bento-shadow overflow-hidden">
        
        {/* Navigation Filters & Search bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex gap-1 bg-slate-200/80 p-1 rounded-xl">
            {(['all', 'pending', 'paid', 'overdue'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  filterTab === tab ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'all' && 'Tất cả'}
                {tab === 'pending' && 'Đang nợ'}
                {tab === 'paid' && 'Đã trả đủ'}
                {tab === 'overdue' && 'Quá hạn'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm tên, SĐT, mã HĐ (#HD-...), sản phẩm..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>
        </div>

        {/* Debts Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Hóa Đơn / Mã GD</th>
                <th className="py-3 px-4">Khách Hàng</th>
                <th className="py-3 px-4">Nợ Ban Đầu</th>
                <th className="py-3 px-4">Đã Thu Hồi</th>
                <th className="py-3 px-4">Nợ Còn Lại</th>
                <th className="py-3 px-4">Kỳ Hạn</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Tác Vụ & Lịch Sử</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.map(debt => {
                const inv = getInvoiceForDebt(debt);
                const paymentCount = debt.payments?.length || 0;
                const paidAmount = (debt.amount || 0) - (debt.remainingAmount || 0);

                return (
                  <tr key={debt.id} className="hover:bg-slate-50/60 text-xs font-semibold">
                    <td className="py-3.5 px-4">
                      {inv ? (
                        <button
                          type="button"
                          onClick={() => setViewingInvoiceDetails(inv)}
                          className="inline-flex items-center gap-1 font-mono font-extrabold text-[11px] text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg border border-indigo-200 cursor-pointer transition shadow-2xs"
                          title="Bấm để xem chi tiết hóa đơn bán hàng"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          #{inv.invoiceNumber}
                        </button>
                      ) : debt.invoiceNumber ? (
                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                          #{debt.invoiceNumber}
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          THỦ CÔNG
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{debt.customerName}</div>
                      {(debt.customerPhone || inv?.customerPhone) && (
                        <div className="text-[10px] text-slate-500 font-mono">📞 {debt.customerPhone || inv?.customerPhone}</div>
                      )}
                      {debt.note && <div className="text-[10px] text-slate-400 italic font-medium truncate max-w-[180px]">{debt.note}</div>}
                    </td>

                    <td className="py-3.5 px-4 text-slate-600 font-mono">{formatVND(debt.amount)}</td>

                    <td className="py-3.5 px-4 text-emerald-600 font-mono font-bold">
                      {paidAmount > 0 ? (
                        <div className="flex items-center gap-1">
                          <span>{formatVND(paidAmount)}</span>
                          {paymentCount > 0 && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-sans">
                              {paymentCount} lần
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-normal">Chưa thu</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                      {debt.remainingAmount > 0 ? formatVND(debt.remainingAmount) : <span className="text-emerald-600">0 ₫</span>}
                    </td>

                    <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                      {debt.dueDate}
                    </td>

                    <td className="py-3.5 px-4">
                      {debt.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200 text-[11px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Tất Toán
                        </span>
                      ) : isOverdue(debt) ? (
                        <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2.5 py-0.5 rounded-full border border-rose-200 text-[11px] font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Quá Hạn
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px] font-bold">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Đang Nợ
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* History button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDebtForHistory(debt);
                            setHistoryScope('current_debt');
                            setShowHistoryModal(true);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition border border-slate-200"
                          title="Xem lịch sử thanh toán công nợ"
                        >
                          <History className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Lịch Sử</span>
                          {paymentCount > 0 && (
                            <span className="ml-0.5 bg-indigo-600 text-white text-[9px] px-1.5 py-0.2 rounded-full">
                              {paymentCount}
                            </span>
                          )}
                        </button>

                        {/* Collect Debt button */}
                        {debt.remainingAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDebt(debt);
                              setPayAmountInput(debt.remainingAmount);
                              setPayPaymentMethod('Tiền mặt');
                              setPayNote('');
                              setShowPayModal(true);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 transition text-white px-3 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <span>Thu nợ</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredDebts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400 italic">
                    Không tìm thấy bản ghi công nợ nào phù hợp với từ khóa tìm kiếm.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 1. LỊCH SỬ THANH TOÁN CÔNG NỢ MODAL */}
      <AnimatePresence>
        {showHistoryModal && selectedDebtForHistory && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowHistoryModal(false);
                setSelectedDebtForHistory(null);
              }}
              className="fixed inset-0 bg-black"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-4xl z-10 relative flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-start pb-4 border-b border-slate-150">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <History className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">
                      Lịch Sử Thanh Toán Công Nợ: {selectedDebtForHistory.customerName}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      📞 {selectedDebtForHistory.customerPhone || 'Không có SĐT'} • Mã GD: #{selectedDebtForHistory.invoiceNumber || selectedDebtForHistory.id}
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedDebtForHistory(null);
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* History Scope Selector */}
              <div className="flex gap-2 my-4 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setHistoryScope('current_debt')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    historyScope === 'current_debt' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  📄 Đợt Nợ Này (#{selectedDebtForHistory.invoiceNumber || 'Thủ công'})
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryScope('customer_all')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    historyScope === 'customer_all' ? 'bg-white text-indigo-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👤 Tất Cả Lịch Sử Khách Hàng Này ({customerAllPayments.length} lượt thu)
                </button>
              </div>

              {/* Debt Progress & Stats Banner */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 shrink-0 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">Nợ Ban Đầu</span>
                  <div className="font-mono font-bold text-slate-800 text-sm">{formatVND(selectedDebtForHistory.amount)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">Đã Thanh Toán</span>
                  <div className="font-mono font-bold text-emerald-600 text-sm">
                    {formatVND(selectedDebtForHistory.amount - selectedDebtForHistory.remainingAmount)}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-extrabold">Dư Nợ Còn Lại</span>
                  <div className="font-mono font-black text-indigo-600 text-sm">
                    {formatVND(selectedDebtForHistory.remainingAmount)}
                  </div>
                </div>
              </div>

              {/* Payments Timeline / List */}
              <div className="overflow-y-auto flex-1 pr-1">
                {historyScope === 'current_debt' ? (
                  currentDebtPayments.length > 0 ? (
                    <div className="pb-1">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                            <th className="py-2.5 px-2 text-center w-16">Lần Thu</th>
                            <th className="py-2.5 px-2">Ngày Giờ Thanh Toán</th>
                            <th className="py-2.5 px-2">Số Tiền Thu</th>
                            <th className="py-2.5 px-2">Hình Thức</th>
                            <th className="py-2.5 px-2">Nợ Còn Lại</th>
                            <th className="py-2.5 px-2">Người Thu</th>
                            <th className="py-2.5 px-2">Ghi Chú</th>
                            <th className="py-2.5 px-2 text-right w-12">In</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {currentDebtPayments.map((item) => (
                            <tr key={item.payment.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-2 text-center">
                                <span 
                                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                    item.isInitial 
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80' 
                                      : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                                  }`}
                                  title={item.isInitial ? "Thanh toán khi tạo đơn" : undefined}
                                >
                                  {item.indexLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 font-mono font-medium text-slate-800 text-[11px] whitespace-nowrap">
                                {formatFullDateTime(item.payment.paidAt)}
                              </td>
                              <td className="py-2.5 px-2 font-mono font-bold text-emerald-600 text-xs whitespace-nowrap">
                                +{formatVND(item.payment.amount)}
                              </td>
                              <td className="py-2.5 px-2 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {item.payment.paymentMethod || 'Tiền mặt'}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 font-mono text-indigo-600 font-bold text-xs whitespace-nowrap">
                                {formatVND(item.remainingAfter)}
                              </td>
                              <td className="py-2.5 px-2 text-slate-700 text-[11px] font-semibold whitespace-nowrap">
                                👤 {item.payment.collectedBy || 'Nhân viên'}
                              </td>
                              <td className="py-2.5 px-2 text-slate-500 italic max-w-[140px] truncate text-[11px]" title={item.payment.note}>
                                {item.payment.note || '--'}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintingPaymentReceipt({
                                      debt: selectedDebtForHistory,
                                      payment: item.payment,
                                      paymentIndex: item.indexNumber,
                                      remainingAfter: item.remainingAfter
                                    });
                                  }}
                                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                  title="In phiếu thu nợ đợt này"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 space-y-2">
                      <Receipt className="w-8 h-8 mx-auto opacity-40 text-slate-400" />
                      <p className="text-xs italic">Chưa có lịch sử thu nợ nào cho bản ghi này.</p>
                    </div>
                  )
                ) : (
                  /* ALL CUSTOMER DEBT PAYMENTS */
                  customerAllPayments.length > 0 ? (
                    <div className="pb-1">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                            <th className="py-2.5 px-2">Đơn Hàng</th>
                            <th className="py-2.5 px-2 text-center w-16">Lần Thu</th>
                            <th className="py-2.5 px-2">Ngày Giờ Thanh Toán</th>
                            <th className="py-2.5 px-2">Số Tiền Thu</th>
                            <th className="py-2.5 px-2">Hình Thức</th>
                            <th className="py-2.5 px-2">Nợ Còn Lại</th>
                            <th className="py-2.5 px-2">Người Thu</th>
                            <th className="py-2.5 px-2 text-right w-12">In</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {customerAllPayments.map((item) => (
                            <tr key={item.payment.id} className="hover:bg-slate-50/80">
                              <td className="py-2.5 px-2 font-mono font-bold text-indigo-600 text-[11px] whitespace-nowrap">
                                #{item.debt.invoiceNumber || item.debt.id}
                              </td>
                              <td className="py-2.5 px-2 text-center">
                                <span 
                                  className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                    item.isInitial 
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80' 
                                      : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                                  }`}
                                  title={item.isInitial ? "Thanh toán khi tạo đơn" : undefined}
                                >
                                  {item.indexLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 font-mono text-slate-800 text-[11px] font-medium whitespace-nowrap">
                                {formatFullDateTime(item.payment.paidAt)}
                              </td>
                              <td className="py-2.5 px-2 font-mono font-bold text-emerald-600 text-xs whitespace-nowrap">
                                +{formatVND(item.payment.amount)}
                              </td>
                              <td className="py-2.5 px-2 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                                  {item.payment.paymentMethod || 'Tiền mặt'}
                                </span>
                              </td>
                              <td className="py-2.5 px-2 font-mono text-indigo-600 font-bold text-xs whitespace-nowrap">
                                {formatVND(item.remainingAfter)}
                              </td>
                              <td className="py-2.5 px-2 text-slate-700 text-[11px] font-semibold whitespace-nowrap">
                                👤 {item.payment.collectedBy || 'Nhân viên'}
                              </td>
                              <td className="py-2.5 px-2 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintingPaymentReceipt({
                                      debt: item.debt,
                                      payment: item.payment,
                                      paymentIndex: item.indexNumber,
                                      remainingAfter: item.remainingAfter
                                    });
                                  }}
                                  className="p-1 text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                                  title="In phiếu thu"
                                >
                                  <Printer className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400 italic text-xs">
                      Khách hàng chưa thực hiện giao dịch thu hồi nợ nào.
                    </div>
                  )
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 mt-3 border-t border-slate-150 flex justify-between items-center shrink-0">
                {selectedDebtForHistory.remainingAmount > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      const d = selectedDebtForHistory;
                      setShowHistoryModal(false);
                      setSelectedDebtForHistory(null);
                      setSelectedDebt(d);
                      setPayAmountInput(d.remainingAmount);
                      setPayPaymentMethod('Tiền mặt');
                      setPayNote('');
                      setShowPayModal(true);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-4 h-4" /> Thu Thêm Công Nợ
                  </button>
                ) : (
                  <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Đã tất toán hoàn toàn đợt nợ này
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowHistoryModal(false);
                    setSelectedDebtForHistory(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. THU HỒI NỢ MODAL (WITH PREVIOUS PAYMENTS PREVIEW) */}
      <AnimatePresence>
        {showPayModal && selectedDebt && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowPayModal(false);
                setSelectedDebt(null);
              }}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-lg z-10 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 uppercase">Thu Hồi Nợ: {selectedDebt.customerName}</h3>
                  <p className="text-[11px] text-slate-500 font-mono">Hóa đơn/Mã GD: #{selectedDebt.invoiceNumber || selectedDebt.id}</p>
                </div>
                <button 
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedDebt(null);
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCollectPayment} className="space-y-4">
                {/* Balance Stats */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Dư nợ gốc</span>
                    <div className="font-mono font-bold text-slate-700 text-xs">{formatVND(selectedDebt.amount)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-indigo-500 uppercase font-bold">Dư nợ hiện tại</span>
                    <div className="font-mono font-black text-indigo-600 text-sm">{formatVND(selectedDebt.remainingAmount)}</div>
                  </div>
                </div>

                {/* Amount Input & Presets */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-500">Số tiền khách thanh toán lần này (VNĐ) *</label>
                    <button
                      type="button"
                      onClick={() => setPayAmountInput(selectedDebt.remainingAmount)}
                      className="text-[10px] text-indigo-600 font-bold hover:underline cursor-pointer"
                    >
                      [Tất cả: {formatVND(selectedDebt.remainingAmount)}]
                    </button>
                  </div>
                  
                  <input 
                    type="number"
                    max={selectedDebt.remainingAmount}
                    min={1}
                    required
                    value={payAmountInput}
                    onChange={e => setPayAmountInput(Math.min(selectedDebt.remainingAmount, Number(e.target.value)))}
                    className="w-full text-base font-black bg-slate-50 border border-slate-300 rounded-xl p-3 focus:outline-hidden text-emerald-600 font-mono"
                  />

                  {/* Preset Buttons */}
                  <div className="flex gap-2 mt-2">
                    {[0.25, 0.5, 1].map((ratio) => {
                      const calculated = Math.round((selectedDebt.remainingAmount * ratio) / 1000) * 1000;
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setPayAmountInput(calculated)}
                          className="flex-1 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200 cursor-pointer transition"
                        >
                          {ratio === 1 ? 'Thu Hết (100%)' : `${ratio * 100}% (${formatVND(calculated)})`}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Hình thức thanh toán</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Tiền mặt', 'Chuyển khoản', 'Thẻ'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPayPaymentMethod(method)}
                        className={`py-2 text-xs font-bold rounded-xl border cursor-pointer transition flex items-center justify-center gap-1 ${
                          payPaymentMethod === method 
                            ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs' 
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {method === 'Tiền mặt' && '💵'}
                        {method === 'Chuyển khoản' && '🏦'}
                        {method === 'Thẻ' && '💳'}
                        {method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ghi chú thu nợ</label>
                  <textarea 
                    placeholder="e.g. Khách thanh toán mặt trực tiếp tại quầy, chuyển khoản VCB..."
                    value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                    rows={2}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden"
                  />
                </div>

                {/* Previous Payments History Preview */}
                {selectedDebt.payments && selectedDebt.payments.length > 0 && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                    <div className="text-[10px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <History className="w-3.5 h-3.5 text-indigo-600" />
                      Lịch sử {selectedDebt.payments.length} lần thu trước đó:
                    </div>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1 text-xs">
                      {selectedDebt.payments.map((p, idx) => (
                        <div key={p.id || idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-150">
                          <div>
                            <span className="font-mono font-bold text-emerald-600">+{formatVND(p.amount)}</span>
                            <span className="text-[10px] text-slate-400 ml-1 font-mono">({new Date(p.paidAt).toLocaleDateString('vi-VN')})</span>
                          </div>
                          <span className="text-[10px] text-slate-600 font-medium">👤 {p.collectedBy || 'NV'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Form Footer */}
                <div className="pt-3 border-t border-slate-150 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPayModal(false);
                      setSelectedDebt(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" /> Xác nhận thu nợ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. PRINT PAYMENT RECEIPT SLIP MODAL */}
      <AnimatePresence>
        {printingPaymentReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xs" 
              onClick={() => setPrintingPaymentReceipt(null)} 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 relative w-full max-w-lg z-10 border border-slate-200 flex flex-col max-h-[90vh]"
            >
              {/* Printable Receipt Area */}
              <div id="print-debt-receipt-section" className="overflow-y-auto pr-1 space-y-4 flex-1">
                {/* Store Header */}
                <div className="text-center border-b pb-4 border-slate-200">
                  <div className="flex justify-center mb-2">
                    <TPLogo className="w-10 h-10" />
                  </div>
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {printSettings?.storeName || 'THỊNH PHÁT COMPUTER'}
                  </h2>
                  <p className="text-[10px] text-slate-500">{printSettings?.storeAddress || 'Chuyên Laptop, PC, Máy Tính & Thiết Bị Văn Phòng'}</p>
                  <p className="text-[10px] font-mono text-slate-500">Hotline: {printSettings?.storePhone || '0900.000.000'}</p>
                </div>

                {/* Receipt Title */}
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider">PHIẾU THU TIỀN CÔNG NỢ</h3>
                  <p className="text-[11px] font-mono text-slate-500">Mã phiếu: #PT-{printingPaymentReceipt.payment.id}</p>
                  <p className="text-[11px] text-slate-400">
                    Ngày thu: {formatFullDateTime(printingPaymentReceipt.payment.paidAt)}
                  </p>
                </div>

                {/* Customer Details */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Họ & tên khách hàng:</span>
                    <span className="font-bold text-slate-900">{printingPaymentReceipt.debt.customerName}</span>
                  </div>
                  <div className="flex justify-between font-mono">
                    <span className="text-slate-500">Số điện thoại:</span>
                    <span className="font-bold text-slate-900">{printingPaymentReceipt.debt.customerPhone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Nợ hóa đơn / Mã GD:</span>
                    <span className="font-mono font-bold text-indigo-600">#{printingPaymentReceipt.debt.invoiceNumber || printingPaymentReceipt.debt.id}</span>
                  </div>
                </div>

                {/* Payment Summary Box */}
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl text-center space-y-1">
                  <span className="text-[10px] uppercase font-bold text-emerald-800">SỐ TIỀN THU LẦN NÀY</span>
                  <div className="text-2xl font-black text-emerald-600 font-mono">
                    {formatVND(printingPaymentReceipt.payment.amount)}
                  </div>
                  <p className="text-[10px] text-emerald-700 font-medium italic">
                    Hình thức: {printingPaymentReceipt.payment.paymentMethod || 'Tiền mặt'} • {printingPaymentReceipt.payment.note || 'Thanh toán công nợ'}
                  </p>
                </div>

                {/* Remaining Balance Summary */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tổng khoản nợ ban đầu:</span>
                    <span className="font-mono font-bold text-slate-700">{formatVND(printingPaymentReceipt.debt.amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-indigo-600">
                    <span>Dư nợ còn lại sau lần thu này:</span>
                    <span className="font-mono">{formatVND(printingPaymentReceipt.remainingAfter)}</span>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 text-center pt-4 text-xs">
                  <div>
                    <p className="font-bold text-slate-800">Người Nộp Tiền</p>
                    <p className="text-[9px] text-slate-400 italic">(Ký & ghi rõ họ tên)</p>
                    <div className="h-14"></div>
                    <p className="font-bold text-slate-700">{printingPaymentReceipt.debt.customerName}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-800">Người Thu Tiền</p>
                    <p className="text-[9px] text-slate-400 italic">(Ký & ghi rõ họ tên)</p>
                    <div className="h-14"></div>
                    <p className="font-bold text-slate-700">{printingPaymentReceipt.payment.collectedBy || 'Nhân viên cửa hàng'}</p>
                  </div>
                </div>
              </div>

              {/* Print Modal Actions */}
              <div className="pt-4 mt-2 border-t border-slate-150 flex justify-between items-center shrink-0">
                <button 
                  type="button"
                  onClick={() => {
                    const printC = document.getElementById('print-debt-receipt-section')?.innerHTML;
                    const originalC = document.body.innerHTML;
                    if (printC) {
                      document.body.innerHTML = printC;
                      window.print();
                      document.body.innerHTML = originalC;
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" /> In Phiếu Thu Nợ
                </button>

                <button
                  type="button"
                  onClick={() => setPrintingPaymentReceipt(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. MANUAL ADD DEBT MODAL OVERLAY */}
      <AnimatePresence>
        {showAddManualModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddManualModal(false)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-md z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase">Mở Biên Ghi Nợ Thủ Công</h3>
                <button 
                  onClick={() => setShowAddManualModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddManualSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Chọn Khách Hàng *</label>
                  <select
                    required
                    value={manualDebt.customerId}
                    onChange={e => setManualDebt({ ...manualDebt, customerId: e.target.value })}
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden cursor-pointer"
                  >
                    <option value="">-- Click để chọn khách hàng --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Số tiền ghi nợ *</label>
                  <input 
                    type="number"
                    min={1}
                    required
                    value={manualDebt.amount}
                    onChange={e => setManualDebt({ ...manualDebt, amount: Number(e.target.value) })}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden text-indigo-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kỳ hạn phải trả nợ</label>
                  <input 
                    type="date"
                    required
                    value={typeof manualDebt.dueDate === 'function' ? manualDebt.dueDate() : (manualDebt.dueDate as any)}
                    onChange={e => setManualDebt({ ...manualDebt, dueDate: e.target.value as any })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Lý do ghi nợ / Ghi chú</label>
                  <textarea 
                    placeholder="e.g. Nợ đợt sửa chữa phần cứng, mua thêm linh kiện..."
                    value={manualDebt.note}
                    onChange={e => setManualDebt({ ...manualDebt, note: e.target.value })}
                    rows={2}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 focus:outline-hidden"
                  />
                </div>

                <div className="pt-4 border-t border-slate-150 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowAddManualModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-xl cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl cursor-pointer"
                  >
                    Tạo biên ghi nợ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. INVOICE DETAIL MODAL OVERLAY */}
      <AnimatePresence>
        {viewingInvoiceDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-xs" 
              onClick={() => setViewingInvoiceDetails(null)} 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl p-6 relative w-full max-w-2xl z-10 border border-slate-100 flex flex-col max-h-[90vh]"
            >
              {/* Printable container */}
              <div id="print-debt-invoice-section" className="overflow-y-auto pr-1 space-y-4 flex-1">
                {/* Header */}
                <div className="flex justify-between items-start pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Chi Tiết Hóa Đơn Bán Hàng</h2>
                      <p className="text-xs font-mono font-bold text-indigo-600">Mã HĐ: #{viewingInvoiceDetails.invoiceNumber}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewingInvoiceDetails(null)} 
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Customer & Info Grid */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Khách hàng:</span>
                    <span className="font-bold text-slate-900">{viewingInvoiceDetails.customerName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Số điện thoại:</span>
                    <span className="font-mono font-bold text-slate-900">{viewingInvoiceDetails.customerPhone || 'Không có'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Ngày lập hóa đơn:</span>
                    <span className="font-mono font-medium text-slate-700">{new Date(viewingInvoiceDetails.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  {viewingInvoiceDetails.processedBy && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Nhân viên phục vụ:</span>
                      <span className="font-bold text-indigo-700">👤 {viewingInvoiceDetails.processedBy}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-medium">Phương thức:</span>
                    <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">💳 {viewingInvoiceDetails.paymentMethod}</span>
                  </div>
                </div>

                {/* Items table */}
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-600 mb-2">Danh Sách Mặt Hàng Đã Mua</h3>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-3">Sản phẩm</th>
                          <th className="py-2.5 px-3 text-right">Đơn giá</th>
                          <th className="py-2.5 px-3 text-center">SL</th>
                          <th className="py-2.5 px-3 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {viewingInvoiceDetails.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900">{item.productName}</div>
                              {item.imeis && item.imeis.length > 0 && (
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex flex-wrap gap-1">
                                  {item.imeis.map(im => (
                                    <span key={im} className="bg-slate-100 px-1 py-0.5 rounded border border-slate-200">
                                      IMEI: {im}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-600">{formatVND(item.price)}</td>
                            <td className="py-2.5 px-3 text-center font-bold font-mono">{item.quantity}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {formatVND(item.price * item.quantity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Payment Breakdown */}
                <div className="bg-indigo-50/60 border border-indigo-100 p-3.5 rounded-2xl text-xs space-y-1.5">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-600">Tổng giá trị đơn hàng:</span>
                    <span className="font-black text-slate-900 text-sm">{formatVND(viewingInvoiceDetails.totalAmount)}</span>
                  </div>
                  {viewingInvoiceDetails.debtAmount ? (
                    <>
                      <div className="flex justify-between items-center text-emerald-700">
                        <span className="font-medium">Đã thanh toán:</span>
                        <span className="font-bold">{formatVND(viewingInvoiceDetails.totalAmount - viewingInvoiceDetails.debtAmount)}</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-600 font-bold">
                        <span>Số tiền ghi nợ đọng:</span>
                        <span className="text-sm font-black">{formatVND(viewingInvoiceDetails.debtAmount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-center text-emerald-700 font-bold">
                      <span>Trạng thái:</span>
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px]">Đã thanh toán đủ</span>
                    </div>
                  )}
                </div>

                {viewingInvoiceDetails.note && (
                  <div className="text-xs text-slate-600 bg-amber-50/80 p-3 rounded-xl border border-amber-200">
                    <span className="font-bold text-amber-900">📝 Ghi chú:</span> {viewingInvoiceDetails.note}
                  </div>
                )}
              </div>

              {/* Modal Actions Footer */}
              <div className="pt-4 mt-2 border-t border-slate-100 flex justify-between items-center">
                <button 
                  type="button"
                  onClick={() => {
                    const printC = document.getElementById('print-debt-invoice-section')?.innerHTML;
                    const originalC = document.body.innerHTML;
                    if (printC) {
                      document.body.innerHTML = printC;
                      window.print();
                      document.body.innerHTML = originalC;
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl cursor-pointer flex items-center gap-1.5 transition"
                >
                  <Printer className="w-4 h-4" /> In Hóa Đơn
                </button>

                <button
                  type="button"
                  onClick={() => setViewingInvoiceDetails(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer transition"
                >
                  Đóng
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
