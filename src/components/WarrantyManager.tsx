import React, { useState, useMemo } from 'react';
import { WarrantyCard, Customer, User, SalesInvoice } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { 
  Search, 
  ShieldCheck, 
  ShieldX, 
  Clock, 
  Calendar, 
  Plus, 
  X, 
  Sparkles, 
  FileCheck,
  User as UserIcon,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WarrantyManagerProps {
  warranties: WarrantyCard[];
  users: User[];
  currentUser: User;
  onAddWarranty: (card: WarrantyCard) => void;
  invoices: SalesInvoice[];
}

export default function WarrantyManager({
  warranties,
  users,
  currentUser,
  onAddWarranty,
  invoices
}: WarrantyManagerProps) {
  const [portalSearch, setPortalSearch] = useState('');
  const [activeSearchResult, setActiveSearchResult] = useState<WarrantyCard | null>(null);
  const [searched, setSearched] = useState(false);

  // Use Barcode Scanner to quickly set portal search and search instantly
  useBarcodeScanner((barcode) => {
    setPortalSearch(barcode);
    const match = warranties.find(w => 
      w.serialNumber.toLowerCase() === barcode.trim().toLowerCase()
    );
    setActiveSearchResult(match || null);
    setSearched(true);
  });

  const [processedBy, setProcessedBy] = useState<string>(currentUser?.fullName || '');

  React.useEffect(() => {
    if (currentUser) {
      setProcessedBy(currentUser.fullName);
    }
  }, [currentUser]);

  const [dirSearch, setDirSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired'>('all');

  const [showAddModal, setShowAddModal] = useState(false);

  // New Warranty Card form state
  const [newSerial, setNewSerial] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newPurchaseDate, setNewPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [newMonths, setNewMonths] = useState(12);
  const [newNotes, setNewNotes] = useState('');

  // Invoice view modal state
  const [viewInvoiceModal, setViewInvoiceModal] = useState<SalesInvoice | null>(null);

  // Portal IMEI search processor
  const handlePortalCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalSearch.trim()) return;

    const match = warranties.find(w => 
      w.serialNumber.toLowerCase() === portalSearch.trim().toLowerCase()
    );

    setActiveSearchResult(match || null);
    setSearched(true);
  };

  // Helper to compute remaining days from today (2026-06-13)
  const getWarrantyStatus = (expiryDateStr: string) => {
    const today = new Date('2026-06-13'); // anchor current time
    const expiry = new Date(expiryDateStr);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff > 0) {
      return {
        isUnderWarranty: true,
        daysLeft: daysDiff,
        text: `Còn bảo hành (${daysDiff} ngày)`,
        color: 'text-emerald-700 bg-emerald-50 border-emerald-100'
      };
    } else {
      return {
        isUnderWarranty: false,
        daysLeft: 0,
        text: `Đã hết hạn (${Math.abs(daysDiff)} ngày trước)`,
        color: 'text-rose-700 bg-rose-50 border-rose-100'
      };
    }
  };

  // Directory filter processing
  const filteredWarranties = useMemo(() => {
    return warranties.filter(w => {
      const matchText = 
        w.serialNumber.toLowerCase().includes(dirSearch.toLowerCase()) ||
        w.productName.toLowerCase().includes(dirSearch.toLowerCase()) ||
        w.customerName.toLowerCase().includes(dirSearch.toLowerCase()) ||
        w.customerPhone.includes(dirSearch);

      if (statusFilter === 'all') return matchText;
      const today = new Date('2026-06-13');
      const isExpired = new Date(w.expiryDate).getTime() < today.getTime();
      return matchText && (statusFilter === 'expired' ? isExpired : !isExpired);
    });
  }, [warranties, dirSearch, statusFilter]);

  // Handle Manual Custom Warranty Creation
  const handleCreateWarranty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSerial.trim() || !newProductName.trim() || !newCustName.trim()) {
      alert('Vui lòng nhập đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    // Check duplication
    if (warranties.some(w => w.serialNumber.toLowerCase() === newSerial.trim().toLowerCase())) {
      alert('Số Serial/IMEI này đã được kích hoạt bảo hành điện tử trước đó.');
      return;
    }

    const calculatedExpiry = new Date(newPurchaseDate);
    calculatedExpiry.setMonth(calculatedExpiry.getMonth() + Number(newMonths));

    const today = new Date('2026-06-13');
    const isExpired = calculatedExpiry.getTime() < today.getTime();

    const cardPayload: WarrantyCard = {
      id: `war_${Date.now()}`,
      serialNumber: newSerial.trim(),
      productName: newProductName.trim(),
      customerName: newCustName.trim(),
      customerPhone: newCustPhone.trim(),
      purchaseDate: newPurchaseDate,
      warrantyMonths: Number(newMonths),
      expiryDate: calculatedExpiry.toISOString().slice(0, 10),
      status: isExpired ? 'expired' : 'active',
      notes: newNotes.trim() || undefined,
      processedBy: processedBy || currentUser.fullName
    };

    onAddWarranty(cardPayload);
    setShowAddModal(false);

    // Reset fields
    setNewSerial('');
    setNewProductName('');
    setNewCustName('');
    setNewCustPhone('');
    setNewNotes('');
    alert(`Đã kích hoạt thẻ bảo hành điện tử thành công cho Serial: ${cardPayload.serialNumber}`);
  };

  return (
    <div className="space-y-8">
      
      {/* 1. IMMERSIVE PORTAL GATE */}
      <div className="bg-slate-900 rounded-[2.5rem] border-2 border-slate-800 p-8 md:p-12 text-white bento-shadow relative overflow-hidden flex flex-col items-center justify-center text-center">
        {/* Subtle decorative background spots */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl w-full space-y-6 z-10">
          <div className="mx-auto bg-indigo-500/20 w-16 h-16 rounded-2xl flex items-center justify-center border border-indigo-500/30">
            <ShieldCheck className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">CỔNG TRA CỨU BẢO HÀNH ĐIỆN TỬ</h2>
            <p className="text-slate-300 text-sm mt-2 max-w-md mx-auto">
              Nhập mã Serial, IMEI hoặc mã bảo hành sản phẩm của bạn để thẩm định tình trạng hỗ trợ kỹ thuật trực tiếp.
            </p>
          </div>

          <form onSubmit={handlePortalCheck} className="flex flex-col sm:flex-row gap-3 w-full bg-slate-800/60 p-2 rounded-2xl border border-slate-700">
            <input 
              id="portal-serial-input"
              type="text"
              placeholder="e.g. IMEI-358921839218392 hoặc ANK-65W-2026011"
              value={portalSearch}
              onChange={e => {
                setPortalSearch(e.target.value);
                setSearched(false);
              }}
              className="flex-1 bg-transparent px-4 py-3 text-sm focus:outline-hidden text-white rounded-xl placeholder-slate-400 font-mono tracking-wider"
            />
            <button 
              id="btn-portal-search"
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-semibold px-6 py-3 rounded-xl transition cursor-pointer"
            >
              Kiểm Tra Ngay
            </button>
          </form>

          {/* Electronic Result display */}
          <AnimatePresence mode="wait">
            {searched && (
              <motion.div 
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="pt-4"
              >
                {activeSearchResult ? (
                  <div className="bg-white/95 text-slate-800 rounded-2xl p-6 text-left border border-slate-100 shadow-lg space-y-4 max-w-xl mx-auto backdrop-blur-xs">
                    <div className="flex justify-between items-start gap-4">
                      <div 
                        className={activeSearchResult.linkedInvoiceId ? 'cursor-pointer group' : ''}
                        onClick={() => {
                          if (activeSearchResult.linkedInvoiceId) {
                            const inv = invoices.find(i => i.id === activeSearchResult.linkedInvoiceId);
                            if (inv) setViewInvoiceModal(inv);
                          }
                        }}
                      >
                        <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm">KÍCH HOẠT HỢP LỆ</span>
                        <h4 className={`font-bold text-lg mt-1 line-clamp-1 ${activeSearchResult.linkedInvoiceId ? 'text-indigo-600 group-hover:text-indigo-700 underline decoration-indigo-200 underline-offset-2' : 'text-slate-900'}`}>
                          {activeSearchResult.productName}
                        </h4>
                        {activeSearchResult.linkedInvoiceId && (
                           <p className="text-[10px] text-indigo-500 mt-1 italic">👆 Nhấn vào đây để xem chi tiết hoá đơn / cấu hình</p>
                        )}
                      </div>
                      
                      {/* Live calculated remaining time */}
                      {(() => {
                        const coverage = getWarrantyStatus(activeSearchResult.expiryDate);
                        return (
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${coverage.color}`}>
                            {coverage.text}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <span className="text-slate-400 font-semibold block uppercase text-[10px]">THÔNG TIN KHÁCH HÀNG</span>
                        <p className="font-bold text-slate-800 flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-slate-400" /> {activeSearchResult.customerName}</p>
                        <p className="text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {activeSearchResult.customerPhone}</p>
                        {activeSearchResult.processedBy && (
                          <p className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-sm px-1.5 py-0.5 w-fit font-bold mt-1">👤 Kích hoạt: {activeSearchResult.processedBy}</p>
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className="text-slate-400 font-semibold block uppercase text-[10px]">MỐC THỜI GIAN</span>
                        <p className="text-slate-700 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Nhận máy: {activeSearchResult.purchaseDate}</p>
                        <p className="text-slate-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Hết hạn: {activeSearchResult.expiryDate}</p>
                      </div>
                    </div>

                    {activeSearchResult.notes && (
                      <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-500 italic border border-slate-100">
                        Ghi chú điều khoản: {activeSearchResult.notes}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-rose-50/15 border border-rose-500/20 rounded-2xl p-6 max-w-md mx-auto text-center space-y-2">
                    <ShieldX className="w-10 h-10 text-rose-400 mx-auto" />
                    <p className="text-sm font-bold text-rose-300">Không tìm thấy mã sản phẩm này!</p>
                    <p className="text-xs text-slate-400">Thiết bị chưa được kích hoạt bảo hành điện tử hoặc thẻ đã bị thu hồi từ cơ sở dữ liệu hệ thống.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* 2. LEDGER AND MANUAL SYSTEM RECORDS */}
      <div className="bg-white rounded-[2.5rem] border-2 border-slate-200 p-6 bento-shadow space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Sổ Lưu Trữ Bảo Hành Điện Tử</h3>
            <p className="text-xs text-slate-500">Giám sát toàn bộ các hợp đồng và điều khoản bảo hành từ kho hàng</p>
          </div>
          
          <button 
            id="btn-add-warranty-modal"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-2 rounded-xl transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Kích hoạt tay mới
          </button>
        </div>

        {/* Directory Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input 
              id="search-warranties-ledger"
              type="text"
              placeholder="Tra nhanh Sổ bảo hành theo Tên, SĐT, Số Serial / IMEI..."
              value={dirSearch}
              onChange={e => setDirSearch(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-100 pl-9 pr-4 py-2.5 rounded-xl focus:border-indigo-500 focus:outline-hidden"
            />
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            {[
              { value: 'all', label: 'Tất cả' },
              { value: 'active', label: 'Còn hạn' },
              { value: 'expired', label: 'Hết hạn' }
            ].map(tab => (
              <button 
                key={tab.value}
                onClick={() => setStatusFilter(tab.value as any)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg cursor-pointer ${
                  statusFilter === tab.value ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table Ledger list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs">
                <th className="pb-3">Sản Phẩm & Thông Số Serial</th>
                <th className="pb-3">Khách Hàng Ký</th>
                <th className="pb-3">Hạn Bảo Hành</th>
                <th className="pb-3">Thời Hạn Thẻ</th>
                <th className="pb-3 text-right">Trạng Thái Thẩm Định</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredWarranties.map(card => {
                const statusInfo = getWarrantyStatus(card.expiryDate);
                return (
                  <tr key={card.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <div 
                        className={`max-w-xs ${card.linkedInvoiceId ? 'cursor-pointer hover:bg-slate-100/50 p-1.5 -ml-1.5 rounded-lg transition group' : ''}`}
                        onClick={() => {
                          if (card.linkedInvoiceId) {
                            const inv = invoices.find(i => i.id === card.linkedInvoiceId);
                            if (inv) setViewInvoiceModal(inv);
                          }
                        }}
                      >
                        <p className={`font-bold truncate ${card.linkedInvoiceId ? 'text-indigo-600 group-hover:text-indigo-700' : 'text-slate-800'}`}>
                          {card.productName}
                          {card.linkedInvoiceId && <Sparkles className="w-3 h-3 inline-block ml-1 text-indigo-400" />}
                        </p>
                        <span className="text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm mt-1 inline-block">
                          {card.serialNumber}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <p className="font-semibold text-slate-800">{card.customerName}</p>
                      <p className="text-xs text-slate-400">{card.customerPhone}</p>
                      {card.processedBy && (
                        <div className="text-[10px] text-indigo-600 bg-indigo-50/50 border border-indigo-100/50 px-1.5 py-0.5 rounded-sm w-fit mt-1 font-semibold">
                          👤 Kích hoạt: {card.processedBy}
                        </div>
                      )}
                    </td>
                    <td className="py-4">
                      <p className="text-xs text-slate-700">Ngày mua: <span className="font-semibold">{card.purchaseDate}</span></p>
                      <p className="text-xs text-slate-700">Ngày hết hạn: <span className="font-bold text-slate-900">{card.expiryDate}</span></p>
                    </td>
                    <td className="py-4 text-xs font-bold text-indigo-600">
                      {card.warrantyMonths} Tháng
                    </td>
                    <td className="py-4 text-right">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${statusInfo.color}`}>
                        {statusInfo.isUnderWarranty ? 'BẢO VỆ HOẠT ĐỘNG' : 'HẾT HẠN HỖ TRỢ'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {filteredWarranties.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    Không tìm thấy bản bảo hành điện tử nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Activating Modal */}
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
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-indigo-600" />
                  Kích Hoạt Bảo Hành Điện Tử Bằng Tay
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateWarranty} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã IMEI / Serial *</label>
                    <input 
                      id="input-warranty-serial"
                      type="text"
                      required
                      placeholder="e.g. SN-892318"
                      value={newSerial}
                      onChange={e => setNewSerial(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Sản Phẩm *</label>
                    <input 
                      id="input-warranty-product"
                      type="text"
                      required
                      placeholder="e.g. Tai nghe AirPods Pro"
                      value={newProductName}
                      onChange={e => setNewProductName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Khách Hàng *</label>
                    <input 
                      id="input-warranty-customer"
                      type="text"
                      required
                      placeholder="e.g. Trần Văn Long"
                      value={newCustName}
                      onChange={e => setNewCustName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Điện Thoại</label>
                    <input 
                      id="input-warranty-phone"
                      type="text"
                      placeholder="e.g. 091xxxxx"
                      value={newCustPhone}
                      onChange={e => setNewCustPhone(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Ngày mua hàng *</label>
                    <input 
                      id="input-warranty-date"
                      type="date"
                      required
                      value={newPurchaseDate}
                      onChange={e => setNewPurchaseDate(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Thời hạn bảo hành (Tháng)</label>
                    <input 
                      id="input-warranty-months"
                      type="number"
                      required
                      value={newMonths}
                      onChange={e => setNewMonths(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú thẻ</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Bảo hành 1 đổi 1 phần nguồn..."
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nhân viên kích hoạt *</label>
                  <select
                    id="select-warranty-processed-by"
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

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hỷ bỏ
                  </button>
                  <button 
                    id="btn-confirm-add-warranty"
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer"
                  >
                    Tiến hành kích hoạt
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Invoice/Config Modal */}
      <AnimatePresence>
        {viewInvoiceModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewInvoiceModal(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-8 shadow-2xl w-full max-w-2xl z-10 relative max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <FileCheck className="w-5 h-5 text-indigo-600" />
                  Chi Tiết Hoá Đơn / Cấu Hình Bán Ra
                </h3>
                <button 
                  onClick={() => setViewInvoiceModal(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-black text-slate-900">{viewInvoiceModal.invoiceNumber}</h4>
                    <p className="text-xs text-slate-500 mt-1">Ngày lập: {new Date(viewInvoiceModal.createdAt).toLocaleDateString('vi-VN')}</p>
                    <p className="text-xs text-slate-500">PTTT: {viewInvoiceModal.paymentMethod}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khách Hàng</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{viewInvoiceModal.customerName}</p>
                    <p className="text-xs text-slate-500">{viewInvoiceModal.customerPhone}</p>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs bg-white">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-3 px-4 font-bold">Mô tả sản phẩm / linh kiện</th>
                        <th className="py-3 px-4 font-bold text-center">SL</th>
                        <th className="py-3 px-4 font-bold text-center">Bảo Hành</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewInvoiceModal.items.map((it, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-semibold text-slate-800 max-w-[200px] truncate" title={it.productName}>{it.productName}</td>
                          <td className="py-3 px-4 text-center font-bold text-slate-600">{it.quantity}</td>
                          <td className="py-3 px-4 text-center text-indigo-600 font-bold">{it.warrantyMonths ? `${it.warrantyMonths}T` : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end pt-2">
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Tổng Cộng</p>
                    <p className="text-2xl font-black text-blue-600">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewInvoiceModal.totalAmount)}
                    </p>
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
