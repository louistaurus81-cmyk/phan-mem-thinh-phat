import React, { useState, useMemo } from 'react';
import { Customer, SalesInvoice, RepairTicket, Debt, getPartWarrantyInfo } from '../types';
import { 
  Search, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Plus, 
  X, 
  Receipt, 
  Wrench, 
  Sparkles,
  Calendar,
  Trash2,
  ReceiptText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomerManagerProps {
  customers: Customer[];
  invoices: SalesInvoice[];
  repairs: RepairTicket[];
  debts?: Debt[];
  onAddCustomer: (customer: Customer) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer?: (id: string) => void;
}

export default function CustomerManager({
  customers,
  invoices,
  repairs,
  debts = [],
  onAddCustomer,
  onEditCustomer,
  onDeleteCustomer
}: CustomerManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal toggle state
  const [showAddModal, setShowAddModal] = useState(false);
  
  // Selected Profile side state
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [deletingCustomer, setDeletingCustomer] = useState<Customer | null>(null);

  // Selected details view modal states
  const [selectedInvoiceForModal, setSelectedInvoiceForModal] = useState<SalesInvoice | null>(null);
  const [selectedRepairForModal, setSelectedRepairForModal] = useState<RepairTicket | null>(null);

  // New Customer form properties
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');

  // Find active customer
  const activeCustomer = useMemo(() => {
    return customers.find(c => c.id === activeCustomerId) || null;
  }, [customers, activeCustomerId]);

  // Retrieve matching invoices
  const customerInvoices = useMemo(() => {
    if (!activeCustomerId) return [];
    return invoices.filter(inv => inv.customerId === activeCustomerId);
  }, [invoices, activeCustomerId]);

  // Retrieve matching repair tickets
  const customerRepairs = useMemo(() => {
    if (!activeCustomerId) return [];
    return repairs.filter(rep => rep.customerId === activeCustomerId);
  }, [repairs, activeCustomerId]);

  // Retrieve matching debts
  const customerDebts = useMemo(() => {
    if (!activeCustomer) return [];
    return debts.filter(d => 
      (activeCustomer.id && d.customerId === activeCustomer.id) ||
      (activeCustomer.phone && d.customerPhone && d.customerPhone === activeCustomer.phone) ||
      (activeCustomer.name && d.customerName && d.customerName.toLowerCase() === activeCustomer.name.toLowerCase())
    );
  }, [debts, activeCustomer]);

  // Filter main list
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone.includes(searchQuery) ||
      (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [customers, searchQuery]);

  // Money format
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Create or Edit customer submit
  const handleSubmitCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Vui lòng điền họ tên và số điện thoại!');
      return;
    }

    const customerData: Customer = {
      id: editingCustomer ? editingCustomer.id : `c_${Date.now()}`,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      createdAt: editingCustomer ? editingCustomer.createdAt : new Date().toISOString()
    };

    if (editingCustomer) {
        onEditCustomer(customerData);
    } else {
        onAddCustomer(customerData);
    }

    setShowAddModal(false);
    setEditingCustomer(null);

    // reset fields
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
  };

  return (
    <div className="space-y-6">
      
      {/* Search Header */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 bento-shadow flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            id="search-customers"
            type="text"
            placeholder="Tra cứu danh sách khách hàng theo tên, SĐT, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs md:text-sm bg-slate-50 border border-slate-100 pl-10 pr-4 py-3 rounded-xl focus:border-indigo-500 focus:outline-hidden transition-colors"
          />
        </div>
        
        <button 
          id="btn-add-customer-modal"
          onClick={() => setShowAddModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Khách Hàng
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Master Directory Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow overflow-hidden">
            <div className="divide-y divide-slate-100">
              {filteredCustomers.map(cust => {
                const isActive = activeCustomerId === cust.id;
                return (
                  <div 
                    key={cust.id}
                    id={`customer-row-${cust.id}`}
                    onClick={() => setActiveCustomerId(cust.id)}
                    className={`p-5 hover:bg-slate-50/50 transition duration-150 cursor-pointer flex justify-between items-center ${
                      isActive ? 'bg-indigo-50/30' : ''
                    }`}
                  >
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">{cust.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" /> {cust.phone}
                      </p>
                      {cust.email && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 leading-normal">
                          <Mail className="w-3.5 h-3.5 text-slate-300" /> {cust.email}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id={`btn-delete-customer-${cust.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingCustomer(cust);
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                        title="Xóa khách hàng"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full uppercase shrink-0">
                        Hồ Sơ Chi Tiết
                      </span>
                    </div>
                  </div>
                );
              })}
              {filteredCustomers.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <User className="w-12 h-12 stroke-1 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm">Không tìm thấy khách hàng nào khớp với từ khoá.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Activity History Panel (Side detail view) */}
        <div className="lg:col-span-1">
          {activeCustomer ? (
            <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 space-y-6 sticky top-4">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div className="flex gap-3 items-center">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold">
                    {activeCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm uppercase leading-tight">{activeCustomer.name}</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Khách hàng thành viên</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => {
                        setEditingCustomer(activeCustomer);
                        setName(activeCustomer.name);
                        setPhone(activeCustomer.phone);
                        setEmail(activeCustomer.email || '');
                        setAddress(activeCustomer.address || '');
                        setShowAddModal(true);
                    }}
                    className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 p-2 rounded-xl cursor-pointer text-xs font-semibold transition"
                  >
                    Chỉnh sửa
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      setDeletingCustomer(activeCustomer);
                    }}
                    className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 p-2 rounded-xl cursor-pointer text-xs font-semibold transition flex items-center gap-1"
                    title="Xóa hồ sơ khách hàng"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Xóa
                  </button>
                  <button 
                    onClick={() => setActiveCustomerId(null)}
                    className="text-slate-400 hover:text-slate-600 p-2 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* CRM Info fields */}
              <div className="space-y-3.5 text-xs">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LÝ LỊCH LIÊN HỆ</p>
                <div className="space-y-2.5">
                  <p className="flex items-center gap-2 text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-800">{activeCustomer.phone}</span>
                  </p>
                  {activeCustomer.email && (
                    <p className="flex items-center gap-2 text-slate-600">
                      <Mail className="w-4 h-4 text-slate-400" /> <span className="font-semibold text-slate-800">{activeCustomer.email}</span>
                    </p>
                  )}
                  {activeCustomer.address && (
                    <p className="flex items-start gap-2 text-slate-600 leading-normal">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" /> <span className="font-semibold text-slate-800">{activeCustomer.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Customer Debt Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <ReceiptText className="w-3.5 h-3.5 text-amber-600" /> CÔNG NỢ KHÁCH HÀNG ({customerDebts.length})
                  </p>
                  {customerDebts.filter(d => d.status !== 'paid' && d.remainingAmount > 0).length > 0 && (
                    <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                      Dư nợ: {formatVND(customerDebts.reduce((sum, d) => sum + (d.status !== 'paid' ? d.remainingAmount : 0), 0))}
                    </span>
                  )}
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {customerDebts.map(d => {
                    const matchedInv = invoices.find(i => (d.invoiceId && i.id === d.invoiceId) || (d.invoiceNumber && i.invoiceNumber === d.invoiceNumber));
                    const matchedRep = repairs.find(r => (d.invoiceNumber && d.invoiceNumber.includes(r.ticketNumber)) || (d.note && d.note.includes(r.ticketNumber)));
                    return (
                      <div 
                        key={d.id} 
                        onClick={() => {
                          if (matchedInv) setSelectedInvoiceForModal(matchedInv);
                          else if (matchedRep) setSelectedRepairForModal(matchedRep);
                        }}
                        className="p-2.5 bg-amber-50/70 hover:bg-amber-100/80 border border-amber-200/80 rounded-xl flex justify-between items-center text-xs cursor-pointer transition shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-extrabold text-amber-900">
                              #{d.invoiceNumber || d.id}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full ${
                              d.status === 'paid' ? 'bg-emerald-100 text-emerald-800' :
                              d.status === 'partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {d.status === 'paid' ? 'Đã thanh toán' : d.status === 'partial' ? 'Trả 1 phần' : 'Chưa trả'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium mt-1">Hạn trả: {d.dueDate || 'Chưa hẹn'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-red-600">{formatVND(d.remainingAmount)}</p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Nợ gốc: {formatVND(d.amount)}</p>
                        </div>
                      </div>
                    );
                  })}
                  {customerDebts.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">Khách hàng không có khoản nợ tồn đọng nào.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">HÓA ĐƠN MUA HÀNG ({customerInvoices.length})</p>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {customerInvoices.map(inv => (
                    <div 
                      key={inv.id} 
                      onClick={() => setSelectedInvoiceForModal(inv)}
                      className="p-2.5 bg-slate-50 hover:bg-indigo-50/50 border border-slate-100 hover:border-indigo-100/50 rounded-lg flex justify-between items-center text-xs cursor-pointer transition"
                    >
                      <div>
                        <span className="font-mono font-bold text-indigo-700 hover:underline">{inv.invoiceNumber}</span>
                        <p className="text-[10px] text-slate-400 mt-1">{new Date(inv.createdAt).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-slate-800">{formatVND(inv.totalAmount)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{inv.paymentMethod}</p>
                      </div>
                    </div>
                  ))}
                  {customerInvoices.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">Chưa mua sắm thiết bị nào tại quầy.</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">LỊCH SỬ KÝ SỬA CHỮA ({customerRepairs.length})</p>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {customerRepairs.map(rep => (
                    <div 
                      key={rep.id} 
                      onClick={() => setSelectedRepairForModal(rep)}
                      className="p-2.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-100 hover:border-emerald-100/50 rounded-lg flex justify-between items-center text-xs cursor-pointer transition"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-700 hover:underline">{rep.ticketNumber}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full ${
                            rep.status === 'checking' ? 'bg-slate-200 text-slate-700' :
                            rep.status === 'repairing' ? 'bg-amber-100 text-amber-800' :
                            rep.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-200 text-slate-500' // delivered
                          }`}>
                            {rep.status === 'checking' ? 'Nhận máy' :
                             rep.status === 'repairing' ? 'Đang sửa' :
                             rep.status === 'completed' ? 'Xong' :
                             'Bàn giao'}
                          </span>
                        </div>
                        <p className="font-semibold text-slate-800 mt-1">{rep.deviceName}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-slate-900">{formatVND(rep.actualCost || rep.estimatedCost)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">KT: {rep.technician}</p>
                      </div>
                    </div>
                  ))}
                  {customerRepairs.length === 0 && (
                    <p className="text-[11px] text-slate-400 italic">Chưa ký gởi máy sửa thiết bị nào.</p>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 py-16 h-fit">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs">Chọn hồ sơ khách hàng để mở xem hồ sơ giao dịch, lịch sử biên nhận sửa ngoại phạm và thẻ bảo hành liên thuộc.</p>
            </div>
          )}
        </div>

      </div>

      {/* Add customer Modal dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900">{editingCustomer ? 'Chỉnh Sửa Hồ Sơ Khách Hàng' : 'Đăng Ký Hồ Sơ Khách Hàng'}</h3>
                <button 
                  onClick={() => { setShowAddModal(false); setEditingCustomer(null); }}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitCustomer} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Họ Tên Khách Hàng *</label>
                  <input 
                    id="input-customer-name"
                    type="text"
                    required
                    placeholder="e.g. Nguyễn Văn Bình"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Số Điện Thoại Di Động *</label>
                  <input 
                    id="input-customer-phone"
                    type="text"
                    required
                    placeholder="e.g. 0914xxxx"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ Thư Điện Tử (Email)</label>
                  <input 
                    id="input-customer-email"
                    type="email"
                    placeholder="e.g. binhnv@company.vn"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ Thường Trú</label>
                  <input 
                    id="input-customer-address"
                    type="text"
                    placeholder="e.g. Số 10 Ngõ 4 Đê La Thành, Đống Đa, Hà Nội"
                    value={address}
                    onChange={e => setAddress(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => { setShowAddModal(false); setEditingCustomer(null); }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hỷ bỏ
                  </button>
                  <button 
                    id="btn-confirm-add-customer"
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
                  >
                    {editingCustomer ? 'Lưu Thay Đổi' : 'Tạo hồ sơ khách'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Details Popup Modal */}
      <AnimatePresence>
        {selectedInvoiceForModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 w-full max-w-2xl z-20 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  Chi Tiết Hoá Đơn Bán Hàng
                </h3>
                <button 
                  onClick={() => setSelectedInvoiceForModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">THỊNH PHÁT COMPUTER</h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">Cửa hàng máy tính, sửa chữa & linh kiện chính hãng</p>
                    <p className="text-[10px] text-slate-400 font-medium">Hệ thống chuyển giao chuyên nghiệp</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">HÓA ĐƠN:</p>
                    <p className="text-sm font-mono font-extrabold text-indigo-600">{selectedInvoiceForModal.invoiceNumber}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">Ngày bán: {new Date(selectedInvoiceForModal.createdAt).toLocaleString('vi-VN')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Khách hàng nhận:</p>
                    <p className="font-extrabold text-slate-800 mt-1">{selectedInvoiceForModal.customerName}</p>
                    <p className="text-slate-600 font-semibold mt-0.5">SĐT: {selectedInvoiceForModal.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Thanh toán & Chuyên viên:</p>
                    <p className="font-extrabold text-slate-800 mt-1">💳 {selectedInvoiceForModal.paymentMethod}</p>
                    <p className="text-indigo-600 mt-0.5 font-bold">👤 {selectedInvoiceForModal.processedBy || 'Cửa hàng trưởng'}</p>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <p className="text-[9px] uppercase font-bold text-slate-400 mb-2 tracking-wider">THÀNH PHẦN HOÁ ĐƠN</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] text-left">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase text-[9px]">
                          <th className="py-2">Tên linh kiện / Thiết bị</th>
                          <th className="py-2 text-center w-12">SL</th>
                          <th className="py-2 text-right w-24">Giá bán</th>
                          <th className="py-2 text-right w-28">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedInvoiceForModal.items?.map((item, idx) => (
                          <tr key={idx} className="text-slate-800 font-semibold">
                            <td className="py-2.5 max-w-[220px] truncate">{item.productName}</td>
                            <td className="py-2.5 text-center">{item.quantity}</td>
                            <td className="py-2.5 text-right">{formatVND(item.price)}</td>
                            <td className="py-2.5 text-right font-black text-slate-900">{formatVND(item.price * item.quantity)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex flex-col items-end text-xs space-y-1.5">
                  <div className="flex justify-between w-full max-w-xs text-[11px]">
                    <span className="text-slate-500 font-bold">Cộng tiền gốc:</span>
                    <span className="font-bold text-slate-800">
                      {formatVND(selectedInvoiceForModal.items?.reduce((cur, it) => cur + (it.price * it.quantity), 0) || selectedInvoiceForModal.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between w-full max-w-xs pt-1.5 border-t border-slate-200">
                    <span className="font-extrabold text-slate-950 text-xs">TỔNG ĐÃ THANH TOÁN:</span>
                    <span className="font-black text-indigo-600 text-sm">{formatVND(selectedInvoiceForModal.totalAmount)}</span>
                  </div>
                </div>

                {selectedInvoiceForModal.note && (
                  <div className="border-t border-slate-100 pt-3 bg-white p-3 rounded-xl text-[11px] text-slate-500">
                    <span className="font-bold text-slate-700 block mb-0.5">Chú thích chiết khấu/hậu mãi:</span>
                    <p className="italic font-medium">{selectedInvoiceForModal.note}</p>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white rounded-xl text-xs font-black cursor-pointer shadow-3xs"
                >
                  🖨️ In Hoá Đơn Bán Hàng
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedInvoiceForModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition border border-slate-200"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Repair Ticket Details Popup Modal */}
      <AnimatePresence>
        {selectedRepairForModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 w-full max-w-2xl z-20 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                  Chi Tiết Phiếu Nhận Sửa Chữa
                </h3>
                <button 
                  onClick={() => setSelectedRepairForModal(null)}
                  className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 space-y-4 bg-slate-50/50 text-xs">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">THỊNH PHÁT COMPUTER</h4>
                    <p className="text-[10px] text-slate-500 mt-1 font-semibold">Biên nhận dịch thuật bảo hành & sửa chữa kỹ thuật cao</p>
                  </div>
                  <div className="sm:text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">PHIẾU SỬA CHỮA:</p>
                    <p className="text-sm font-mono font-extrabold text-emerald-600">{selectedRepairForModal.ticketNumber}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1">Lập biên nhận: {new Date(selectedRepairForModal.createdAt).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-slate-200 py-3 text-xs">
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Khách hàng ký gởi máy:</p>
                    <p className="font-extrabold text-slate-800">{selectedRepairForModal.customerName}</p>
                    <p className="text-slate-600 font-bold">SĐT: {selectedRepairForModal.customerPhone}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Thông tin máy ký gởi:</p>
                    <p className="font-extrabold text-slate-800">{selectedRepairForModal.deviceName}</p>
                    <p className="font-mono text-[10px] text-slate-500 font-bold">Serial S/N: {selectedRepairForModal.deviceSerial || 'Không có sẵn'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Tình trạng lỗi chẩn đoán:</p>
                    <p className="bg-rose-50 border border-rose-100/30 p-3 rounded-xl font-semibold text-rose-800 mt-1 leading-normal">
                      {selectedRepairForModal.issueDescription}
                    </p>
                  </div>
                  
                  {selectedRepairForModal.solution && (
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Giải pháp / Đóng gói thay thế:</p>
                      <p className="bg-emerald-50 border border-emerald-100/30 p-3 rounded-xl font-semibold text-emerald-800 mt-1 leading-normal">
                        {selectedRepairForModal.solution}
                      </p>
                    </div>
                  )}

                  {selectedRepairForModal.usedParts && selectedRepairForModal.usedParts.length > 0 && (
                    <div>
                      <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider mb-1">Linh kiện đã thay thế & bảo hành:</p>
                      <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                        <table className="w-full text-left bg-white">
                          <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 text-[10px] uppercase font-bold">
                            <tr>
                              <th className="py-2 px-3">Tên linh kiện</th>
                              <th className="py-2 px-3 text-center">SL</th>
                              <th className="py-2 px-3 text-center">Bảo hành LK</th>
                              <th className="py-2 px-3 text-right">Đơn giá</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {selectedRepairForModal.usedParts.map((item, idx) => {
                              const warrInfo = getPartWarrantyInfo(item, selectedRepairForModal.deliveredAt || selectedRepairForModal.createdAt.slice(0, 10));
                              return (
                                <tr key={idx}>
                                  <td className="py-2 px-3 font-semibold text-slate-800">{item.name}</td>
                                  <td className="py-2 px-3 text-center font-bold text-slate-600">{item.quantity}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className="inline-block px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 font-extrabold text-[10px] rounded">
                                      🛡️ {warrInfo.warrantyText}
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono font-semibold text-slate-700">
                                    {formatVND(item.price)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Trạng thái ký phiếu:</p>
                    <span className={`inline-block mt-1 text-[9px] font-bold px-2 py-0.5 rounded-sm ${
                      selectedRepairForModal.status === 'checking' ? 'bg-slate-100 text-slate-600' :
                      selectedRepairForModal.status === 'repairing' ? 'bg-amber-100 text-amber-800' :
                      selectedRepairForModal.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      'bg-indigo-100 text-indigo-800' // delivered
                    }`}>
                      {selectedRepairForModal.status === 'checking' ? 'MỚI TIẾP NHẬN' :
                       selectedRepairForModal.status === 'repairing' ? 'ĐANG SỬA CHỮA' :
                       selectedRepairForModal.status === 'completed' ? 'ĐÃ XONG - CHỜ GIAO' :
                       'ĐÃ BÀN GIAO MÁY'}
                    </span>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Tổng chi phí máy:</p>
                    <p className="font-extrabold text-slate-900 mt-1 text-sm">
                      {formatVND(selectedRepairForModal.status === 'delivered' ? selectedRepairForModal.actualCost : selectedRepairForModal.estimatedCost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px]">Kỹ thuật phụ trách:</p>
                    <p className="font-extrabold text-slate-800 mt-1">🛠️ {selectedRepairForModal.technician}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-xs text-slate-600 font-semibold">
                  {selectedRepairForModal.deliveredAt && (
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-indigo-50 text-indigo-600 rounded-md">📅</span>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Ngày bàn giao:</p>
                        <p className="text-indigo-600 font-bold">{selectedRepairForModal.deliveredAt}</p>
                      </div>
                    </div>
                  )}
                  {selectedRepairForModal.warrantyUntil && (
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-emerald-50 text-emerald-600 rounded-md">🛡️</span>
                      <div>
                        <p className="text-[9px] text-slate-400 uppercase font-bold">Bảo hành sửa:</p>
                        <p className="text-emerald-600 font-bold">{selectedRepairForModal.warrantyUntil}</p>
                      </div>
                    </div>
                  )}
                </div>

                {selectedRepairForModal.note && (
                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-slate-500 italic">
                    <span className="font-bold text-slate-700 block not-italic mb-0.5">Chú thích ghi nhận:</span>
                    {selectedRepairForModal.note}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center mt-6 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white rounded-xl text-xs font-black cursor-pointer shadow-3xs"
                >
                  🖨️ In Phiếu Sửa Chữa
                </button>
                <button 
                  type="button" 
                  onClick={() => setSelectedRepairForModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition border border-slate-200"
                >
                  Đóng phiểu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Customer Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeletingCustomer(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative border border-slate-100 space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-3 bg-rose-50 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xác Nhận Xóa Khách Hàng</h3>
                  <p className="text-xs text-slate-500 font-medium">Hành động này không thể hoàn tác</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <p><span className="font-bold">Họ tên:</span> {deletingCustomer.name}</p>
                <p><span className="font-bold">SĐT:</span> {deletingCustomer.phone}</p>
                {deletingCustomer.email && <p><span className="font-bold">Email:</span> {deletingCustomer.email}</p>}
              </div>

              <p className="text-xs text-slate-500">
                Bạn có chắc chắn muốn xóa vĩnh viễn hồ sơ khách hàng này khỏi hệ thống không?
              </p>

              <div className="pt-2 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setDeletingCustomer(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer transition"
                >
                  Hủy bỏ
                </button>
                <button 
                  type="button" 
                  id="btn-confirm-delete-customer"
                  onClick={() => {
                    const targetId = deletingCustomer.id;
                    if (activeCustomerId === targetId) setActiveCustomerId(null);
                    onDeleteCustomer?.(targetId);
                    setDeletingCustomer(null);
                  }}
                  className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer shadow-2xs transition"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
