import React, { useState, useMemo } from 'react';
import { 
  Debt, 
  DebtPayment, 
  Customer, 
  Supplier, 
  User 
} from '../types';
import { 
  ReceiptText, 
  Search, 
  Plus, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  User as UserIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DebtViewProps {
  debts: Debt[];
  customers: Customer[];
  suppliers: Supplier[];
  currentUser: User;
  onUpdateDebts: (updatedDebts: Debt[]) => void;
  onUpdateSuppliers?: (suppliers: Supplier[]) => void;
}

export const DebtView: React.FC<DebtViewProps> = ({
  debts,
  customers,
  suppliers,
  currentUser,
  onUpdateDebts,
  onUpdateSuppliers
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Collect Debt Payment Modal State
  const [selectedDebtForPayment, setSelectedDebtForPayment] = useState<Debt | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<number>(0);
  const [paymentMethodInput, setPaymentMethodInput] = useState<'Tiền mặt' | 'Chuyển khoản' | 'Thẻ'>('Chuyển khoản');
  const [paymentNoteInput, setPaymentNoteInput] = useState('');

  // Manual Standalone Debt Creation Modal State
  const [showManualDebtModal, setShowManualDebtModal] = useState(false);
  const [manualDebtForm, setManualDebtForm] = useState({
    customerId: '',
    customerName: '',
    customerPhone: '',
    amount: 0,
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    note: ''
  });

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  const nowTime = new Date().getTime();

  // Filtered Customer Debts
  const filteredCustomerDebts = useMemo(() => {
    return debts.filter(d => {
      const q = searchQuery.trim().toLowerCase();
      const matchQuery = !q || 
        d.customerName.toLowerCase().includes(q) ||
        (d.customerPhone && d.customerPhone.includes(q)) ||
        (d.invoiceNumber && d.invoiceNumber.toLowerCase().includes(q));
      return matchQuery;
    });
  }, [debts, searchQuery]);

  // TOP 4 KPI DASHBOARD METRICS
  const kpiMetrics = useMemo(() => {
    let totalPrincipal = 0;
    let totalCollected = 0;
    let totalOverdue = 0;
    const debtorSet = new Set<string>();

    debts.forEach(d => {
      totalPrincipal += d.amount || 0;
      const collected = (d.amount || 0) - (d.remainingAmount || 0);
      totalCollected += Math.max(0, collected);

      // Check overdue if remainingAmount > 0 and dueDate passed
      if (d.remainingAmount > 0) {
        debtorSet.add(d.customerId || d.customerName);
        if (d.dueDate && new Date(d.dueDate).getTime() < nowTime) {
          totalOverdue += d.remainingAmount;
        }
      }
    });

    return {
      totalPrincipal,
      totalCollected,
      totalRemaining: totalPrincipal - totalCollected,
      totalOverdue,
      activeDebtorsCount: debtorSet.size
    };
  }, [debts, nowTime]);

  // Submit Debt Collection Installment Payment
  const handleCollectPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDebtForPayment) return;

    const amount = Number(paymentAmountInput);
    if (amount <= 0) {
      alert('Số tiền thu nợ phải lớn hơn 0.');
      return;
    }

    if (amount > selectedDebtForPayment.remainingAmount) {
      alert(`Số tiền thu (${formatVND(amount)}) vượt quá số nợ còn lại (${formatVND(selectedDebtForPayment.remainingAmount)}).`);
      return;
    }

    const newPayment: DebtPayment = {
      id: `pmt_${Date.now()}`,
      amount,
      paidAt: new Date().toISOString(),
      note: paymentNoteInput.trim() || 'Thu nợ đợt',
      collectedBy: currentUser.fullName,
      paymentMethod: paymentMethodInput
    };

    const existingPayments = selectedDebtForPayment.payments || [];
    const updatedPayments = [...existingPayments, newPayment];

    const newRemaining = Math.max(0, selectedDebtForPayment.remainingAmount - amount);
    const newStatus = newRemaining === 0 ? 'paid' : 'partial';

    const updatedDebt: Debt = {
      ...selectedDebtForPayment,
      remainingAmount: newRemaining,
      status: newStatus,
      payments: updatedPayments
    };

    const updatedDebtsList = debts.map(d => d.id === updatedDebt.id ? updatedDebt : d);
    onUpdateDebts(updatedDebtsList);

    alert(`✅ Đã ghi nhận thu thành công ${formatVND(amount)} từ ${selectedDebtForPayment.customerName}! Còn nợ: ${formatVND(newRemaining)}`);
    setSelectedDebtForPayment(null);
    setPaymentAmountInput(0);
    setPaymentNoteInput('');
  };

  // Submit Manual Standalone Debt
  const handleCreateManualDebtSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualDebtForm.customerName.trim();
    const amount = Number(manualDebtForm.amount);

    if (!name || amount <= 0) {
      alert('Vui lòng nhập Tên đối tác nợ và Số tiền nợ lớn hơn 0.');
      return;
    }

    const now = new Date();
    const randNum = Math.floor(100 + Math.random() * 900);
    const customDocNum = `NOCUST-${randNum}`;

    const newDebt: Debt = {
      id: `debt_${Date.now()}`,
      invoiceNumber: customDocNum,
      customerId: manualDebtForm.customerId || `cust_${Date.now()}`,
      customerName: name,
      customerPhone: manualDebtForm.customerPhone.trim() || '---',
      amount: amount,
      remainingAmount: amount,
      dueDate: manualDebtForm.dueDate,
      status: 'pending',
      createdAt: now.toISOString(),
      note: manualDebtForm.note.trim() || 'Ghi nợ thủ công độc lập',
      payments: []
    };

    onUpdateDebts([newDebt, ...debts]);
    setShowManualDebtModal(false);
    setManualDebtForm({
      customerId: '',
      customerName: '',
      customerPhone: '',
      amount: 0,
      dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
      note: ''
    });
    alert(`✅ Đã tạo thành công khoản nợ thủ công ${formatVND(amount)} cho Khách hàng ${name}!`);
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Manual Debt Button */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <ReceiptText className="w-5 h-5 text-indigo-600" />
            Quản Lý Công Nợ Khách Hàng & Nhà Cung Cấp
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Theo dõi khoản nợ quá hạn, ghi nhận thu nợ nhiều đợt và tạo sổ ghi nợ thủ công.
          </p>
        </div>

        <button
          onClick={() => setShowManualDebtModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          + Ghi Nợ Thủ Công
        </button>
      </div>

      {/* TOP 4 KPI DASHBOARD CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Tổng Nợ Tích Lũy</p>
            <h3 className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
              {formatVND(kpiMetrics.totalPrincipal)}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-rose-500 uppercase">Nợ Quá Hạn Cần Thu</p>
            <h3 className="text-base sm:text-lg font-black font-mono text-rose-600 mt-0.5">
              {formatVND(kpiMetrics.totalOverdue)}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-emerald-600 uppercase">Đã Thu Hồi Đợt</p>
            <h3 className="text-base sm:text-lg font-black font-mono text-emerald-600 mt-0.5">
              {formatVND(kpiMetrics.totalCollected)}
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Số Đối Tác Nợ</p>
            <h3 className="text-base sm:text-lg font-black font-mono text-slate-900 mt-0.5">
              {kpiMetrics.activeDebtorsCount} đối tác
            </h3>
          </div>
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <UserIcon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Debt Table Stage */}
      <div className="bg-white rounded-2xl border border-slate-200 bento-shadow p-4 space-y-3">
        
        {/* Search Bar */}
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Tìm tên khách nợ, SĐT hoặc mã chứng từ..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Debt List Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-3">Mã Đơn / Ngày Tạo</th>
                <th className="py-3 px-3">Khách Hàng Nợ</th>
                <th className="py-3 px-3 text-right">Tổng Nợ Ban Đầu</th>
                <th className="py-3 px-3 text-center">Số Tiền Đã Thu Hồi</th>
                <th className="py-3 px-3 text-right">Còn Nợ Lại</th>
                <th className="py-3 px-3 text-center">Hạn Trả</th>
                <th className="py-3 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomerDebts.map(debt => {
                const isPaid = debt.remainingAmount === 0;
                const isOverdue = !isPaid && debt.dueDate && new Date(debt.dueDate).getTime() < nowTime;
                const collectedAmount = Math.max(0, debt.amount - debt.remainingAmount);
                const paymentCount = debt.payments?.length || 0;

                return (
                  <tr key={debt.id} className={`hover:bg-slate-50/50 transition ${isOverdue ? 'bg-rose-50/30' : ''}`}>
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-slate-800">{debt.invoiceNumber || 'Ghi nợ thủ công'}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(debt.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-800">
                      <div>{debt.customerName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{debt.customerPhone}</div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                      {formatVND(debt.amount)}
                    </td>

                    {/* BADGE HIỂN THỊ SỐ TIỀN ĐÃ THU KÈM SỐ LẦN TRẢ (NÂNG CẤP) */}
                    <td className="py-3 px-3 text-center">
                      <div className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-mono font-extrabold text-[11px]">
                        <span>{formatVND(collectedAmount)}</span>
                        <span className="text-[9px] bg-emerald-200 text-emerald-900 px-1 py-0.2 rounded-full">
                          {paymentCount} lần
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-black text-rose-600">
                      {formatVND(debt.remainingAmount)}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isPaid ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Đã thanh toán đủ
                        </span>
                      ) : isOverdue ? (
                        <span className="text-[10px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-300">
                          Quá hạn ({new Date(debt.dueDate).toLocaleDateString('vi-VN')})
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                          {debt.dueDate ? new Date(debt.dueDate).toLocaleDateString('vi-VN') : 'Không quy định'}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      {!isPaid && (
                        <button
                          onClick={() => {
                            setSelectedDebtForPayment(debt);
                            setPaymentAmountInput(debt.remainingAmount);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-xl transition cursor-pointer shadow-xs"
                        >
                          Thu Nợ
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredCustomerDebts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                    Chưa có khoản công nợ nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THU CÔNG NỢ NHIỀU ĐỢT */}
      <AnimatePresence>
        {selectedDebtForPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 bento-shadow space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-black text-slate-900 text-sm">Thu Công Nợ Khách Hàng</h3>
                  <p className="text-slate-500 text-[11px]">KH: <strong>{selectedDebtForPayment.customerName}</strong></p>
                </div>
                <button onClick={() => setSelectedDebtForPayment(null)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCollectPaymentSubmit} className="space-y-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tổng nợ ban đầu:</span>
                    <span className="font-mono font-bold">{formatVND(selectedDebtForPayment.amount)}</span>
                  </div>
                  <div className="flex justify-between text-rose-600 font-bold">
                    <span>Còn nợ chưa trả:</span>
                    <span className="font-mono font-black">{formatVND(selectedDebtForPayment.remainingAmount)}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tiền thu nợ đợt này (VNĐ) *</label>
                  <input 
                    type="number"
                    min={1}
                    max={selectedDebtForPayment.remainingAmount}
                    value={paymentAmountInput || ''}
                    onChange={e => setPaymentAmountInput(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-emerald-600 text-sm"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hình thức thanh toán</label>
                  <select
                    value={paymentMethodInput}
                    onChange={e => setPaymentMethodInput(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold cursor-pointer"
                  >
                    <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Thẻ">Quẹt thẻ</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú phiếu thu</label>
                  <input 
                    type="text"
                    placeholder="e.g. Thu nợ đợt 1 tiền mặt..."
                    value={paymentNoteInput}
                    onChange={e => setPaymentNoteInput(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                  />
                </div>

                {/* History list */}
                {selectedDebtForPayment.payments && selectedDebtForPayment.payments.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="font-bold text-slate-700 mb-1">Lịch sử trả tiền đợt trước ({selectedDebtForPayment.payments.length} lần):</p>
                    <div className="max-h-28 overflow-y-auto space-y-1 divide-y divide-slate-100 text-[10px]">
                      {selectedDebtForPayment.payments.map((p, idx) => (
                        <div key={idx} className="pt-1 flex justify-between items-center text-slate-600">
                          <span>{new Date(p.paidAt).toLocaleDateString('vi-VN')} ({p.paymentMethod})</span>
                          <strong className="font-mono text-emerald-600">{formatVND(p.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setSelectedDebtForPayment(null)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl"
                  >
                    Xác Nhận Thu Tiền
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL GHI NỢ THỦ CÔNG */}
      <AnimatePresence>
        {showManualDebtModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-5 bento-shadow space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-sm">+ Tạo Khoản Nợ Thủ Công Độc Lập</h3>
                <button onClick={() => setShowManualDebtModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateManualDebtSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên đối tác nợ *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Anh Tuấn Cầu Giấy"
                    value={manualDebtForm.customerName}
                    onChange={e => setManualDebtForm({ ...manualDebtForm, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại liên hệ</label>
                  <input 
                    type="text"
                    placeholder="e.g. 0988776655"
                    value={manualDebtForm.customerPhone}
                    onChange={e => setManualDebtForm({ ...manualDebtForm, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-rose-600 mb-1">Số tiền nợ (VNĐ) *</label>
                    <input 
                      type="number"
                      required
                      min={1}
                      placeholder="e.g. 2000000"
                      value={manualDebtForm.amount || ''}
                      onChange={e => setManualDebtForm({ ...manualDebtForm, amount: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Hạn trả nợ *</label>
                    <input 
                      type="date"
                      required
                      value={manualDebtForm.dueDate}
                      onChange={e => setManualDebtForm({ ...manualDebtForm, dueDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ghi chú khoản nợ</label>
                  <textarea 
                    rows={2}
                    placeholder="e.g. Mượn tiền mặt nhập thêm linh kiện máy tính..."
                    value={manualDebtForm.note}
                    onChange={e => setManualDebtForm({ ...manualDebtForm, note: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowManualDebtModal(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                  >
                    Lưu Khoản Nợ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default DebtView;
