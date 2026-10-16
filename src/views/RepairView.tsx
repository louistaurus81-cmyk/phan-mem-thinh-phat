import React, { useState, useMemo } from 'react';
import { 
  RepairTicket, 
  RepairStatus, 
  Product, 
  ProductIMEI, 
  WarrantyCard, 
  SalesInvoice, 
  User 
} from '../types';
import { 
  Wrench, 
  Search, 
  Plus, 
  Sparkles, 
  X, 
  Cpu 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RepairViewProps {
  repairs: RepairTicket[];
  products: Product[];
  imeis: ProductIMEI[];
  warranties: WarrantyCard[];
  invoices: SalesInvoice[];
  users: User[];
  currentUser: User;
  onAddRepair: (repair: RepairTicket) => void;
  onUpdateRepair: (repair: RepairTicket) => void;
  onDeleteRepair?: (id: string) => void;
}

export const RepairView: React.FC<RepairViewProps> = ({
  repairs,
  products,
  imeis,
  warranties,
  invoices,
  users,
  currentUser,
  onAddRepair,
  onUpdateRepair,
  onDeleteRepair
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Repair Ticket Modal State
  const [showAddTicketModal, setShowAddTicketModal] = useState(false);
  const [crmAutofilled, setCrmAutofilled] = useState(false);

  const [ticketForm, setTicketForm] = useState({
    customerName: '',
    customerPhone: '',
    deviceName: '',
    deviceSerial: '',
    issueDescription: '',
    technician: currentUser.fullName,
    estimatedCost: 0
  });

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  // Filter repairs by status and search query
  const filteredRepairs = useMemo(() => {
    return repairs.filter(r => {
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery = !q || 
        r.ticketNumber.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.customerPhone.includes(q) ||
        r.deviceName.toLowerCase().includes(q) ||
        (r.deviceSerial && r.deviceSerial.toLowerCase().includes(q));
      return matchStatus && matchQuery;
    });
  }, [repairs, statusFilter, searchQuery]);

  // AUTO CRM AUTOFILL ON IMEI/SERIAL TYPING OR SCAN
  const handleSerialChange = (serial: string) => {
    setTicketForm(prev => ({ ...prev, deviceSerial: serial }));

    if (!serial.trim() || serial.trim().length < 3) {
      setCrmAutofilled(false);
      return;
    }

    const clean = serial.trim().toLowerCase();

    // 1. Search Warranties
    const matchedWarranty = warranties.find(w => w.serialNumber && w.serialNumber.toLowerCase() === clean);
    if (matchedWarranty) {
      setTicketForm(prev => ({
        ...prev,
        customerName: matchedWarranty.customerName,
        customerPhone: matchedWarranty.customerPhone,
        deviceName: matchedWarranty.productName
      }));
      setCrmAutofilled(true);
      return;
    }

    // 2. Search Invoices
    for (const inv of invoices) {
      for (const item of inv.items) {
        if (item.imeis && item.imeis.some(im => im.toLowerCase() === clean)) {
          setTicketForm(prev => ({
            ...prev,
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            deviceName: item.productName
          }));
          setCrmAutofilled(true);
          return;
        }
      }
    }

    setCrmAutofilled(false);
  };

  // Submit New Repair Ticket
  const handleAddTicketSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.customerName.trim() || !ticketForm.deviceName.trim()) {
      alert('Vui lòng nhập Tên khách hàng và Tên thiết bị.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(100 + Math.random() * 900);
    const ticketNumber = `REP${dateStr}-${randCode}`;

    const newTicket: RepairTicket = {
      id: `rep_${Date.now()}`,
      ticketNumber,
      customerId: `cust_${Date.now()}`,
      customerName: ticketForm.customerName.trim(),
      customerPhone: ticketForm.customerPhone.trim() || '---',
      deviceName: ticketForm.deviceName.trim(),
      deviceSerial: ticketForm.deviceSerial.trim(),
      issueDescription: ticketForm.issueDescription.trim() || 'Lỗi khách hàng báo',
      status: 'checking',
      estimatedCost: Number(ticketForm.estimatedCost) || 0,
      actualCost: Number(ticketForm.estimatedCost) || 0,
      technician: ticketForm.technician,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      processedBy: currentUser.fullName
    };

    onAddRepair(newTicket);
    setShowAddTicketModal(false);
    setTicketForm({
      customerName: '',
      customerPhone: '',
      deviceName: '',
      deviceSerial: '',
      issueDescription: '',
      technician: currentUser.fullName,
      estimatedCost: 0
    });
    setCrmAutofilled(false);
    alert(`✅ Đã tiếp nhận thành công phiếu sửa chữa ${ticketNumber}!`);
  };

  // Update Status & Deliver Ticket
  const handleUpdateTicketStatus = (ticket: RepairTicket, newStatus: RepairStatus) => {
    const now = new Date().toISOString();
    const isDelivering = newStatus === 'delivered';

    const updated: RepairTicket = {
      ...ticket,
      status: newStatus,
      updatedAt: now,
      deliveredAt: isDelivering ? now : ticket.deliveredAt
    };

    onUpdateRepair(updated);
    alert(`Đã cập nhật trạng thái phiếu ${ticket.ticketNumber} sang "${getStatusBadge(newStatus).label}"!`);
  };

  // Helper for Status Badge styling
  const getStatusBadge = (status: RepairStatus) => {
    switch (status) {
      case 'checking':
        return { label: 'Đang kiểm tra máy', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'repairing':
        return { label: 'Đang kỹ thuật xử lý', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'completed':
        return { label: 'Xử lý xong (Chờ giao)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'delivered':
        return { label: 'Đã bàn giao khách', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: status, color: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Action Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-indigo-600" />
            Tiếp Nhận Sửa Chữa & Bảo Hành Thiết Bị
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Quản lý nhật ký kỹ thuật, tự động truy vấn CRM từ IMEI, phân công kỹ thuật và gạch tồn linh kiện.
          </p>
        </div>

        <button
          onClick={() => setShowAddTicketModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          + Tiếp Nhận Máy Hỏng Mới
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow space-y-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Tìm theo mã phiếu, tên KH, SĐT, tên máy hoặc Serial/IMEI..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'checking', label: 'Đang kiểm tra' },
              { id: 'repairing', label: 'Đang sửa' },
              { id: 'completed', label: 'Xong/Chờ giao' },
              { id: 'delivered', label: 'Đã giao' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                  statusFilter === st.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Repair Cards Grid Stage */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {filteredRepairs.map(ticket => {
            const stInfo = getStatusBadge(ticket.status);

            return (
              <div key={ticket.id} className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3 hover:bg-white hover:shadow-md transition">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-mono font-black text-slate-900 text-sm">{ticket.ticketNumber}</span>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {new Date(ticket.createdAt).toLocaleDateString('vi-VN')} {new Date(ticket.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${stInfo.color}`}>
                    {stInfo.label}
                  </span>
                </div>

                <div className="space-y-1 text-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{ticket.deviceName}</span>
                  </div>
                  {ticket.deviceSerial && (
                    <div className="text-[10px] font-mono text-slate-500">
                      Serial/IMEI: {ticket.deviceSerial}
                    </div>
                  )}
                  <div className="text-[11px] text-slate-600 font-medium">
                    Khách: <strong>{ticket.customerName}</strong> ({ticket.customerPhone})
                  </div>
                </div>

                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                  <p className="text-[10px] font-bold text-rose-600 uppercase">Lỗi khách báo:</p>
                  <p className="text-slate-700 italic font-medium">{ticket.issueDescription}</p>
                  {ticket.solution && (
                    <div className="pt-1 border-t border-slate-100">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Giải pháp kỹ thuật:</p>
                      <p className="text-slate-800 font-semibold">{ticket.solution}</p>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs pt-1">
                  <div>
                    <span className="text-slate-400 text-[10px]">Kỹ thuật: </span>
                    <span className="font-bold text-slate-700">{ticket.technician || 'Chưa phân công'}</span>
                  </div>
                  <div className="font-mono font-black text-rose-600 text-sm">
                    {formatVND(ticket.actualCost || ticket.estimatedCost || 0)}
                  </div>
                </div>

                {/* Status Action Transition Buttons */}
                <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200/60">
                  {ticket.status === 'checking' && (
                    <button
                      onClick={() => handleUpdateTicketStatus(ticket, 'repairing')}
                      className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-[11px] transition cursor-pointer text-center"
                    >
                      Bắt đầu sửa
                    </button>
                  )}
                  {ticket.status === 'repairing' && (
                    <button
                      onClick={() => handleUpdateTicketStatus(ticket, 'completed')}
                      className="flex-1 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-[11px] transition cursor-pointer text-center"
                    >
                      Xong (Báo khách)
                    </button>
                  )}
                  {ticket.status === 'completed' && (
                    <button
                      onClick={() => handleUpdateTicketStatus(ticket, 'delivered')}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-[11px] transition cursor-pointer text-center"
                    >
                      Bàn giao & Thu tiền
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {filteredRepairs.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
              Chưa có phiếu sửa chữa nào trong danh mục này.
            </div>
          )}
        </div>
      </div>

      {/* MODAL TIẾP NHẬN SỬA CHỮA MỚI (WITH AUTO CRM AUTOFILL) */}
      <AnimatePresence>
        {showAddTicketModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-5 bento-shadow space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-indigo-600" />
                  Tiếp Nhận Sửa Chữa Thiết Bị
                </h3>
                <button onClick={() => setShowAddTicketModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddTicketSubmit} className="space-y-3 text-xs">
                
                {/* Serial / IMEI Input with CRM Trigger */}
                <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-100 space-y-1">
                  <label className="block font-extrabold text-indigo-900 mb-1 flex items-center justify-between">
                    <span>Mã Serial / IMEI Máy Hỏng</span>
                    {crmAutofilled && (
                      <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-emerald-600" /> Tìm thấy CRM!
                      </span>
                    )}
                  </label>
                  <input 
                    type="text"
                    placeholder="Gõ hoặc quét mã Serial/IMEI để tự động nhận dạng khách cũ..."
                    value={ticketForm.deviceSerial}
                    onChange={e => handleSerialChange(e.target.value)}
                    className="w-full bg-white border border-indigo-200 rounded-xl p-2 font-mono font-bold text-slate-900 focus:outline-hidden focus:border-indigo-500"
                  />
                  <p className="text-[10px] text-slate-500">
                    * Nếu máy từng mua tại cửa hàng, hệ thống tự động điền Tên KH, SĐT và Tên thiết bị!
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tên khách hàng *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. Nguyễn Văn A"
                      value={ticketForm.customerName}
                      onChange={e => setTicketForm({ ...ticketForm, customerName: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                    <input 
                      type="text"
                      required
                      placeholder="e.g. 0901234567"
                      value={ticketForm.customerPhone}
                      onChange={e => setTicketForm({ ...ticketForm, customerPhone: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên thiết bị sửa chữa *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. PC Gaming i5-12400F, Laptop Dell XPS 15..."
                    value={ticketForm.deviceName}
                    onChange={e => setTicketForm({ ...ticketForm, deviceName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Mô tả tình trạng lỗi khách báo *</label>
                  <textarea 
                    rows={2}
                    required
                    placeholder="e.g. Máy bật không lên nguồn, quạt kêu to, bật 5 phút tự tắt..."
                    value={ticketForm.issueDescription}
                    onChange={e => setTicketForm({ ...ticketForm, issueDescription: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phân công kỹ thuật</label>
                    <select
                      value={ticketForm.technician}
                      onChange={e => setTicketForm({ ...ticketForm, technician: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold cursor-pointer"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.fullName}>{u.fullName} ({u.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Dự kiến chi phí (VNĐ)</label>
                    <input 
                      type="number"
                      min={0}
                      value={ticketForm.estimatedCost || ''}
                      onChange={e => setTicketForm({ ...ticketForm, estimatedCost: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-rose-600"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddTicketModal(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                  >
                    Tạo Phiếu Sửa Chữa
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

export default RepairView;
