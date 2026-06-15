import React, { useState, useMemo } from 'react';
import { Debt, Customer } from '../types';
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
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebtManagerProps {
  debts: Debt[];
  onUpdateDebts: (updated: Debt[]) => void;
  customers: Customer[];
  invoices?: any[];
}

export default function DebtManager({ debts, onUpdateDebts, customers }: DebtManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'paid' | 'overdue'>('all');
  
  // Modals
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<number>(0);
  const [payNote, setPayNote] = useState('');

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

  // Compute stats
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    let totalOwed = 0;
    let totalOverdue = 0;
    let pendingCount = 0;

    debts.forEach(d => {
      if (d.status !== 'paid' && d.remainingAmount > 0) {
        totalOwed += d.remainingAmount;
        pendingCount += 1;
        if (d.dueDate < today) {
          totalOverdue += d.remainingAmount;
        }
      }
    });

    return { totalOwed, totalOverdue, pendingCount };
  }, [debts]);

  // Filter items
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
      return (
        d.customerName.toLowerCase().includes(query) ||
        (d.id && d.id.toLowerCase().includes(query)) ||
        d.dueDate.includes(query)
      );
    });
  }, [debts, filterTab, searchQuery]);

  // Debt payment action
  const handleCollectPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebt) return;

    if (payAmountInput <= 0 || payAmountInput > selectedDebt.remainingAmount) {
      alert('Số tiền thanh toán nợ không hợp lệ.');
      return;
    }

    const updatedDebts = debts.map(d => {
      if (d.id !== selectedDebt.id) return d;
      
      const nextRemaining = Math.max(0, d.remainingAmount - payAmountInput);
      const isCompleted = nextRemaining === 0;

      return {
        ...d,
        remainingAmount: nextRemaining,
        status: isCompleted ? 'paid' : 'partial' as any,
        note: (d.note || '') + ` [Thu nợ ${formatVND(payAmountInput)} - Ghi chú: ${payNote.trim() || 'Thanh toán'}]`
      };
    });

    onUpdateDebts(updatedDebts);
    setShowPayModal(false);
    setSelectedDebt(null);
    setPayAmountInput(0);
    setPayNote('');
    alert('Khấu trừ công nợ khách hàng thành công!');
  };

  // Manual debt register
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
      amount: Number(manualDebt.amount),
      remainingAmount: Number(manualDebt.amount),
      dueDate: typeof manualDebt.dueDate === 'function' ? manualDebt.dueDate() : (manualDebt.dueDate as any),
      status: 'pending',
      createdAt: new Date().toISOString(),
      note: manualDebt.note.trim() || 'Ghi nợ mở biên thủ công'
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

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border-2 border-slate-200 bento-shadow">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">💵</span> Sổ Ghi Nhận Công Nợ Khách Hàng
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">Theo dõi nợ đọng, báo cáo khoản quá hạn & thu hồi quyết toán nợ.</p>
        </div>
        <button 
          id="btn-add-manual-debt"
          onClick={() => setShowAddManualModal(true)}
          className="flex items-center gap-1 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition px-3.5 py-2 rounded-xl cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Ghi nợ thủ công
        </button>
      </div>

      {/* Bento analytics panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase font-mono">Tổng nợ phải thu</span>
            <div className="text-xl font-black mt-1 text-indigo-600">{formatVND(stats.totalOwed)}</div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase font-mono">Công nợ quá hạn ⚠️</span>
            <div className={`text-xl font-black mt-1 ${stats.totalOverdue > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-600'}`}>
              {formatVND(stats.totalOverdue)}
            </div>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase font-mono">Số khách còn nợ</span>
            <div className="text-xl font-black mt-1 text-slate-800">{stats.pendingCount} lượt nợ</div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="bg-white rounded-2xl border border-slate-150 bento-shadow overflow-hidden">
        
        {/* Navigation Filters & Search bar */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50">
          <div className="flex gap-1 bg-slate-200 p-1 rounded-lg">
            {(['all', 'pending', 'paid', 'overdue'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-bold uppercase transition cursor-pointer ${
                  filterTab === tab ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab === 'all' && 'Tất cả'}
                {tab === 'pending' && 'Đang nợ'}
                {tab === 'paid' && 'Đã trả'}
                {tab === 'overdue' && 'Quá hạn'}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Tìm theo ví dụ tên, kỳ hạn..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
            />
          </div>
        </div>

        {/* Debts list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-400 tracking-wider border-b border-slate-100">
                <th className="py-3 px-4">Mã Giao Dịch</th>
                <th className="py-3 px-4">Khách Hàng</th>
                <th className="py-3 px-4">Tổng Nợ Gốc</th>
                <th className="py-3 px-4">Nợ Còn Lại</th>
                <th className="py-3 px-4">Kỳ Hạn Thanh Toán</th>
                <th className="py-3 px-4">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Tác Vụ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDebts.map(debt => (
                <tr key={debt.id} className="hover:bg-slate-50/40 text-xs font-semibold">
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                    {debt.id.startsWith('manual') ? 'THỦ CÔNG' : 'GIAO DỊCH'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-800">{debt.customerName}</div>
                    {debt.note && <div className="text-[10px] text-slate-400 italic font-medium">{debt.note}</div>}
                  </td>
                  <td className="py-3 px-4 text-slate-600">{formatVND(debt.amount)}</td>
                  <td className="py-3 px-4 text-indigo-600 font-bold">{formatVND(debt.remainingAmount)}</td>
                  <td className="py-3 px-4 text-slate-500 font-mono">
                    {debt.dueDate}
                  </td>
                  <td className="py-3 px-4">
                    {debt.status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full border border-emerald-100">
                        <CheckCircle2 className="w-3 h-3" /> Đã Quyết Toán
                      </span>
                    ) : isOverdue(debt) ? (
                      <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full border border-rose-150 animate-pulse">
                        <AlertTriangle className="w-3 h-3 animate-ping" /> Quá Hạn Trả
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-100 animate-pulse">
                        <Clock className="w-3 h-3" /> Chờ Trả
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {debt.remainingAmount > 0 && (
                      <button
                        onClick={() => {
                          setSelectedDebt(debt);
                          setPayAmountInput(debt.remainingAmount);
                          setShowPayModal(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 transition text-white px-3 py-1.5 rounded-lg text-[10px] font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        Thu hồi nợ <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredDebts.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400 italic">
                    Không tìm thấy bản ghi nợ nào phù hợp với bộ lọc
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect / Pay Debt Modal Overlay */}
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
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase">Thu hồi nợ: {selectedDebt.customerName}</h3>
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
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Dư nợ hiện tại</label>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-lg font-black text-indigo-600">
                    {formatVND(selectedDebt.remainingAmount)}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Số tiền khách thanh toán lần này (VNĐ)</label>
                  <input 
                    type="number"
                    max={selectedDebt.remainingAmount}
                    min={1}
                    required
                    value={payAmountInput}
                    onChange={e => setPayAmountInput(Math.min(selectedDebt.remainingAmount, Number(e.target.value)))}
                    className="w-full text-sm font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden text-emerald-600"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Mặc định: Toàn bộ {formatVND(selectedDebt.remainingAmount)}</p>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Ghi chú thu nợ</label>
                  <textarea 
                    placeholder="e.g. Khách thanh toán mặt trực tiếp tại quầy..."
                    value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                    rows={2}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                  />
                </div>

                <div className="pt-4 border-t border-slate-150 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowPayModal(false);
                      setSelectedDebt(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Xác nhận thu nợ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Manual Add Debt Modal Overlay */}
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
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative"
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
                    className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
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
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden text-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Kỳ hạn phải trả nợ</label>
                  <input 
                    type="date"
                    required
                    value={typeof manualDebt.dueDate === 'function' ? manualDebt.dueDate() : (manualDebt.dueDate as any)}
                    onChange={e => setManualDebt({ ...manualDebt, dueDate: e.target.value as any })}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Lý do ghi nợ / Ghi chú</label>
                  <textarea 
                    placeholder="e.g. Nợ lại đợt sửa phần cứng, cam kết thanh toán..."
                    value={manualDebt.note}
                    onChange={e => setManualDebt({ ...manualDebt, note: e.target.value })}
                    rows={2}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                  />
                </div>

                <div className="pt-4 border-t border-slate-150 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowAddManualModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg cursor-pointer"
                  >
                    Tạo biên ghi nợ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
