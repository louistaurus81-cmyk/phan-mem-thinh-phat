import React, { useState, useMemo } from 'react';
import { RepairTicket, Customer, WarrantyCard, RepairStatus, User } from '../types';
import { 
  Search, 
  Wrench, 
  Plus, 
  X, 
  Clock, 
  CheckCircle, 
  Sparkles, 
  ShieldCheck, 
  User as UserIcon, 
  AlertCircle,
  FileCheck2,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RepairManagerProps {
  repairs: RepairTicket[];
  customers: Customer[];
  warranties: WarrantyCard[];
  users: User[];
  currentUser: User;
  onAddRepair: (ticket: RepairTicket) => void;
  onUpdateRepairStatus: (id: string, status: RepairStatus, finalDetails?: { solution?: string; actualCost?: number; warrantyUntil?: string; note?: string; deliveredAt?: string }) => void;
  onAddCustomer: (customer: Customer) => void;
}

export default function RepairManager({
  repairs,
  customers,
  warranties,
  users,
  currentUser,
  onAddRepair,
  onUpdateRepairStatus,
  onAddCustomer
}: RepairManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal for receiving new repair
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Repair Ticket form state
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [technician, setTechnician] = useState('');
  const [processedBy, setProcessedBy] = useState<string>(currentUser?.fullName || '');
  const [note, setNote] = useState('');

  React.useEffect(() => {
    const techUsers = users.filter(u => u.role === 'technician');
    if (techUsers.length > 0) {
      setTechnician(techUsers[0].fullName);
    } else if (users.length > 0) {
      setTechnician(users[0].fullName);
    }
  }, [users]);

  React.useEffect(() => {
    if (currentUser) {
      setProcessedBy(currentUser.fullName);
    }
  }, [currentUser]);

  // Selected ticket for side detail drawer
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // States for updating repair ticket details on statusChange
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [actualCost, setActualCost] = useState(0);
  const [solution, setSolution] = useState('');
  const [repairWarrantyMonths, setRepairWarrantyMonths] = useState(3); // default 3 months warranty for repair
  const [deliveredAtInput, setDeliveredAtInput] = useState(new Date().toISOString().slice(0, 10));
  const [updateNote, setUpdateNote] = useState('');

  // Find active ticket object
  const activeTicket = useMemo(() => {
    return repairs.find(r => r.id === activeTicketId) || null;
  }, [repairs, activeTicketId]);

  // Serial lookup to check if product is currently under warranty
  const serialWarrantyStatus = useMemo(() => {
    if (!deviceSerial.trim()) return null;
    const match = warranties.find(w => w.serialNumber === deviceSerial.trim());
    if (match && match.status === 'active') {
      return match;
    }
    return null;
  }, [warranties, deviceSerial]);

  // Filters logic
  const filteredRepairs = useMemo(() => {
    return repairs.filter(rep => {
      const matchSearch = 
        rep.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.customerPhone.includes(searchQuery) ||
        rep.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.deviceSerial.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'all' ? true : rep.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [repairs, searchQuery, statusFilter]);

  // Format money to VND
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Submit new ticket
  const handleSubmitNewRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !issueDescription.trim()) {
      alert('Vui lòng điền đầy đủ tên thiết bị và mô tả lỗi!');
      return;
    }

    let customerInfo = {
      id: '',
      name: '',
      phone: ''
    };

    if (customerMode === 'select') {
      const custObj = customers.find(c => c.id === selectedCustomerId);
      if (!custObj) {
        alert('Vui lòng chọn khách hàng.');
        return;
      }
      customerInfo = {
        id: custObj.id,
        name: custObj.name,
        phone: custObj.phone
      };
    } else {
      if (!newCustName.trim() || !newCustPhone.trim()) {
        alert('Vui lòng nhập tên và SĐT khách mới.');
        return;
      }
      const newCustId = `c_${Date.now()}`;
      const newCustPayload: Customer = {
        id: newCustId,
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        createdAt: new Date().toISOString()
      };
      onAddCustomer(newCustPayload);
      customerInfo = {
        id: newCustId,
        name: newCustPayload.name,
        phone: newCustPayload.phone
      };
    }

    const ticketNumber = `SC-${20001 + repairs.length}`;
    const newTicket: RepairTicket = {
      id: `rep_${Date.now()}`,
      ticketNumber,
      customerId: customerInfo.id,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      deviceName: deviceName.trim(),
      deviceSerial: deviceSerial.trim(),
      issueDescription: issueDescription.trim(),
      status: 'checking',
      estimatedCost: Number(estimatedCost),
      actualCost: 0,
      technician,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: note.trim() || undefined,
      processedBy: processedBy || currentUser.fullName
    };

    onAddRepair(newTicket);
    setShowAddModal(false);

    // Reset fields
    setDeviceName('');
    setDeviceSerial('');
    setIssueDescription('');
    setEstimatedCost(0);
    setNote('');
    alert(`Đã lập biên nhận sửa chữa ${ticketNumber} thành công!`);
  };

  // Triggering status updates (transitions)
  const executeStatusChange = (status: RepairStatus) => {
    if (!activeTicket) return;

    if (status === 'completed') {
      // Need actual costs & solutions
      onUpdateRepairStatus(activeTicket.id, 'completed', {
        solution: solution.trim() || 'Sửa chữa phần cứng hệ thống',
        actualCost: Number(actualCost) || activeTicket.estimatedCost,
        note: updateNote.trim() || undefined
      });
      setShowStatusBar(false);
      setSolution('');
      setActualCost(0);
      setUpdateNote('');
    } else if (status === 'delivered') {
      // Hands over to client, calculate service warranty
      const expiryDate = new Date(deliveredAtInput || new Date());
      expiryDate.setMonth(expiryDate.getMonth() + repairWarrantyMonths);
      
      onUpdateRepairStatus(activeTicket.id, 'delivered', {
        deliveredAt: deliveredAtInput,
        warrantyUntil: expiryDate.toISOString().slice(0, 10),
        note: updateNote.trim() ? `${activeTicket.note || ''}\nBàn giao: ${updateNote.trim()}` : activeTicket.note
      });
      setShowStatusBar(false);
      setUpdateNote('');
    } else {
      onUpdateRepairStatus(activeTicket.id, status);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 bento-shadow flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            id="search-repairs"
            type="text"
            placeholder="Tìm theo Mã biên nhận, Tên máy, Serial, IMEI hay Khách hàng..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs md:text-sm bg-slate-50 border border-slate-100 pl-10 pr-4 py-3 rounded-xl focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>
        
        {/* Filter badging row */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'checking', label: 'Chờ kiểm tra' },
            { value: 'repairing', label: 'Đang sửa' },
            { value: 'completed', label: 'Đã xong' },
            { value: 'delivered', label: 'Đã giao máy' }
          ].map(opt => (
            <button 
              key={opt.value}
              id={`filter-repair-${opt.value}`}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
                statusFilter === opt.value 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button 
          id="btn-add-repair-modal"
          onClick={() => {
            setCustomerMode('select');
            setShowAddModal(true);
          }}
          className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4" /> Biên Nhận Máy Sửa
        </button>
      </div>

      {/* Main repair body layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ticket list panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow overflow-hidden">
            <div className="divide-y divide-slate-50">
              {filteredRepairs.map(rep => {
                const isActive = activeTicketId === rep.id;
                return (
                  <div 
                    key={rep.id} 
                    id={`repair-row-${rep.id}`}
                    onClick={() => {
                      setActiveTicketId(rep.id);
                      setShowStatusBar(false);
                    }}
                    className={`p-5 hover:bg-slate-50/50 transition duration-200 cursor-pointer flex justify-between items-start gap-4 ${
                      isActive ? 'bg-indigo-50/30 border-l-4 border-indigo-600 pl-4 bg-slate-50/80' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm">
                          {rep.ticketNumber}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{rep.deviceName}</h4>
                        {warranties.some(w => w.serialNumber === rep.deviceSerial && w.status === 'active') && (
                          <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
                            <ShieldCheck className="w-3 h-3" /> Đang bảo hành
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-500">
                        Khách hàng: <span className="font-semibold text-slate-700">{rep.customerName}</span> ({rep.customerPhone})
                      </p>
                      
                      <div className="flex gap-2 flex-wrap text-[10px] pt-0.5">
                        <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-sm border border-indigo-100/50">
                          👤 Nhận: {rep.processedBy || 'Hệ thống'}
                        </span>
                        <span className="bg-slate-50/80 text-slate-600 font-semibold px-1.5 py-0.5 rounded-sm border border-slate-200/50">
                          ⚙️ Thợ: {rep.technician}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 italic line-clamp-1">
                        Yêu cầu: {rep.issueDescription}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-2 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        rep.status === 'checking' ? 'bg-slate-100 text-slate-600' :
                        rep.status === 'repairing' ? 'bg-amber-50 text-amber-700' :
                        rep.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-slate-100 text-slate-500' // delivered
                      }`}>
                        {rep.status === 'checking' ? 'MỚI NHẬN' :
                         rep.status === 'repairing' ? 'ĐANG SỬA' :
                         rep.status === 'completed' ? 'XONG - CHỜ GIAO' :
                         'ĐÃ BÀN GIAO'}
                      </span>
                      <p className="text-xs font-bold text-slate-900">
                        {formatVND(rep.status === 'delivered' || rep.status === 'completed' ? rep.actualCost : rep.estimatedCost)}
                      </p>
                    </div>
                  </div>
                );
              })}
              {filteredRepairs.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <Wrench className="w-12 h-12 stroke-1 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm">Không tìm thấy yêu cầu sửa chữa nào.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected ticket details (Sidebar drawer) */}
        <div className="lg:col-span-1">
          {activeTicket ? (
            <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 space-y-6 h-fit sticky top-4">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-widest">{activeTicket.ticketNumber}</span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">{activeTicket.deviceName}</h3>
                </div>
                <button 
                  onClick={() => setActiveTicketId(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Flow Map */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">THÔNG TIN KHÁCH HÀNG</p>
                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 text-slate-600">
                  <p>Họ tên: <span className="font-bold text-slate-900">{activeTicket.customerName}</span></p>
                  <p>Điện thoại: <span className="font-bold text-slate-900">{activeTicket.customerPhone}</span></p>
                  <p className="font-mono text-[10px] text-slate-400">Thiết bị S/N: {activeTicket.deviceSerial || 'Chưa cung cấp'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CHI TIẾT CHẨN ĐOÁN & QUY TRÌNH</p>
                <div className="text-xs space-y-3.5">
                  <div>
                    <p className="text-slate-500 font-medium">Hiện tượng lỗi:</p>
                    <p className="text-slate-800 font-semibold mt-1 bg-rose-50/50 border border-rose-100/30 p-2.5 rounded-lg text-slate-700">{activeTicket.issueDescription}</p>
                  </div>
                  
                  {activeTicket.solution && (
                    <div>
                      <p className="text-slate-500 font-medium">Giải pháp xử lý / Linh kiện:</p>
                      <p className="text-emerald-700 font-semibold mt-1 bg-emerald-50/50 border border-emerald-100/30 p-2.5 rounded-lg">{activeTicket.solution}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 font-medium">Báo giá dự kiến:</p>
                      <p className="text-slate-900 font-bold mt-1 text-sm">{formatVND(activeTicket.estimatedCost)}</p>
                    </div>
                    {activeTicket.actualCost > 0 && (
                      <div>
                        <p className="text-slate-500 font-medium">Tổng hóa đơn thực tế:</p>
                        <p className="text-indigo-600 font-extrabold mt-1 text-sm">{formatVND(activeTicket.actualCost)}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 font-medium">Nhân viên nhận máy:</p>
                      <p className="text-indigo-600 font-bold mt-1 flex items-center gap-1">
                        👤 {activeTicket.processedBy || 'Hệ thống'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Kỹ thuật viên:</p>
                      <p className="text-slate-800 font-semibold mt-1 flex items-center gap-1">
                        ⚙️ {activeTicket.technician}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Ngày bàn giao máy:</p>
                      {activeTicket.deliveredAt ? (
                        <p className="text-indigo-600 font-bold mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {activeTicket.deliveredAt}
                        </p>
                      ) : (
                        <p className="text-slate-400 font-bold mt-1 flex items-center gap-1.5 italic">
                          <Clock className="w-3.5 h-3.5" /> Chưa bàn giao
                        </p>
                      )}
                    </div>
                    {activeTicket.warrantyUntil && (
                      <div>
                        <p className="text-slate-500 font-medium">Hạn bảo hành dịch vụ:</p>
                        <p className="text-emerald-600 font-bold mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> {activeTicket.warrantyUntil}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Action Transitions */}
              {activeTicket.status !== 'delivered' ? (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CẬP NHẬT TRẠNG THÁI</p>
                  
                  {!showStatusBar ? (
                    <div className="flex flex-col gap-2">
                      {activeTicket.status === 'checking' && (
                        <button 
                          id="btn-transition-repairing"
                          onClick={() => executeStatusChange('repairing')}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer duration-200"
                        >
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Tiến hành sửa chữa
                        </button>
                      )}

                      {activeTicket.status === 'repairing' && (
                        <button 
                          id="btn-trigger-completed-flow"
                          onClick={() => {
                            setActualCost(activeTicket.estimatedCost);
                            setShowStatusBar(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer duration-200"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Báo cáo sửa xong
                        </button>
                      )}

                      {activeTicket.status === 'completed' && (
                        <button 
                          id="btn-trigger-delivered-flow"
                          onClick={() => {
                            setShowStatusBar(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer duration-200"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" /> Bàn giao khách hàng
                        </button>
                      )}
                    </div>
                  ) : (
                    // In-action setup configuration form inside sidebar drawer
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3.5">
                      {activeTicket.status === 'repairing' && (
                        <>
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-indigo-500" /> BÁO CÁO HOÀN THÀNH SỬA </p>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Phương án xử lý kỹ thuật</label>
                            <input 
                              id="input-repair-solution"
                              type="text"
                              required
                              placeholder="e.g. Ép cáp, thay vỏ, dọn IC..."
                              value={solution}
                              onChange={e => setSolution(e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Chi phí thực tế (VND)</label>
                            <input 
                              id="input-repair-actual-cost"
                              type="number"
                              required
                              value={actualCost}
                              onChange={e => setActualCost(Number(e.target.value))}
                              className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                            />
                          </div>
                        </>
                      )}

                      {activeTicket.status === 'completed' && (
                        <>
                          <p className="text-xs font-bold text-slate-800">BÀN GIAO THIẾT BỊ MÁY</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ngày bàn giao máy</label>
                              <input 
                                type="date"
                                value={deliveredAtInput}
                                onChange={e => setDeliveredAtInput(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Thời gian bảo hành</label>
                              <select 
                                id="select-repair-warranty"
                                value={repairWarrantyMonths}
                                onChange={e => setRepairWarrantyMonths(Number(e.target.value))}
                                className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden cursor-pointer"
                              >
                                <option value={1}>1 tháng bảo hành</option>
                                <option value={3}>3 tháng bảo hành (Mặc định)</option>
                                <option value={6}>6 tháng bảo hành</option>
                                <option value={12}>12 tháng bảo hành</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ghi chú bổ sung</label>
                        <textarea 
                          placeholder="Thông tin bảo hành thêm hoặc thanh toán..."
                          value={updateNote}
                          onChange={e => setUpdateNote(e.target.value)}
                          rows={2}
                          className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button 
                          onClick={() => setShowStatusBar(false)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button 
                          id="btn-confirm-status-update"
                          onClick={() => executeStatusChange(activeTicket.status === 'repairing' ? 'completed' : 'delivered')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg cursor-pointer shadow-3xs"
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-start gap-2 text-xs text-emerald-800">
                  <CheckCircle className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="font-bold">Thiết bị đã bàn giao xong!</p>
                    <p className="mt-0.5 opacity-90">Hồ sơ này đã được kích hoạt trạng thái lưu trữ cuối độc quyền. Không thể sửa đổi trực tiếp chi phí hoặc quy trình.</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 py-16 h-fit">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">Chọn một biên nhận từ danh sách bên cạnh để xem tiến trình và điều dưỡng trạng thái kỹ thuật.</p>
            </div>
          )}
        </div>

      </div>

      {/* Receive Repair Request Modal Dialog */}
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
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-xl z-20 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                  Nộp Phiếu Biên Nhận Sửa Chữa Mới
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewRepair} className="space-y-4">
                
                {/* Customer Section */}
                <div className="space-y-3">
                  <div className="flex gap-2 border-b border-slate-100 pb-2">
                    <button 
                      type="button" 
                      onClick={() => setCustomerMode('select')}
                      className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition ${customerMode === 'select' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                    >
                      Tìm Khách Hàng Sẵn Có
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCustomerMode('new')}
                      className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition ${customerMode === 'new' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                    >
                      Khai Báo Khách Hàng Mới
                    </button>
                  </div>

                  {customerMode === 'select' ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Khách Hàng</label>
                      <select 
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                        required
                      >
                        <option value="">-- Chọn khách hàng sẵn có --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Họ & Tên *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Phạm Thế Anh"
                          value={newCustName}
                          onChange={e => setNewCustName(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 0938449x"
                          value={newCustPhone}
                          onChange={e => setNewCustPhone(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Device Repair Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Máy Hỏng *</label>
                    <input 
                      id="input-repair-device-name"
                      type="text"
                      required
                      placeholder="e.g. iPhone 14 Pro Max"
                      value={deviceName}
                      onChange={e => setDeviceName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Serial / IMEI</label>
                    <input 
                      id="input-repair-device-serial"
                      type="text"
                      placeholder="e.g. IMEI-357482"
                      value={deviceSerial}
                      onChange={e => setDeviceSerial(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Dynamic alert lookup results inside the dialog */}
                {serialWarrantyStatus && (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-800 flex gap-1.5 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600 animate-bounce" />
                    <div>
                      <p className="font-bold">Thiết bị mang IMEI/{deviceSerial} có thẻ bảo hành hoạt động!</p>
                      <p className="opacity-90">Hạn bảo hành đến ngày: {serialWarrantyStatus.expiryDate}. Có thể đủ điều kiện sửa miễn phí.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Biểu hiện tình trạng hư hỏng *</label>
                  <textarea 
                    id="input-repair-issue"
                    required
                    rows={2}
                    placeholder="Mô tả lỗi: e.g. Bị ngấm nước, liệt phím nguồn, cảm ứng chập chờn..."
                    value={issueDescription}
                    onChange={e => setIssueDescription(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Báo giá ước tính (VND)</label>
                    <input 
                      id="input-repair-estimate"
                      type="number"
                      value={estimatedCost}
                      onChange={e => setEstimatedCost(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Kỹ thuật viên can thiệp *</label>
                    <select 
                      id="select-repair-technician"
                      value={technician}
                      onChange={e => setTechnician(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.fullName}>
                          {u.fullName} ({u.role === 'technician' ? 'Kỹ thuật' : u.role === 'admin' ? 'Chủ' : 'Bán hàng'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nhân viên tiếp quản tiếp nhận máy *</label>
                  <select
                    id="select-ticket-processed-by"
                    value={processedBy}
                    onChange={e => setProcessedBy(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.fullName}>
                        {u.fullName} ({u.role === 'admin' ? 'Chủ' : u.role === 'sales' ? 'Bán hàng' : 'Kỹ thuật'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú tiếp quản máy</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Máy trầy nhẹ sườn viền màn hình, không kèm sạc..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    id="btn-confirm-add-repair"
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer shadow-2xs"
                  >
                    Thiết lập phiếu nhận
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
