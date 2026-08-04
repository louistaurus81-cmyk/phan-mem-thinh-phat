import React, { useState, useMemo } from 'react';
import { WarrantyCard, Customer, User, SalesInvoice, RepairTicket, Product, formatWarrantyText, computeExpiryDate, getPartWarrantyInfo } from '../types';
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
  Phone,
  Wrench
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WarrantyManagerProps {
  warranties: WarrantyCard[];
  repairs: RepairTicket[];
  users: User[];
  currentUser: User;
  onAddWarranty: (card: WarrantyCard) => void;
  invoices: SalesInvoice[];
  products?: Product[];
}

function SmartImeiBadge({ serialNumber, searchQuery = '' }: { serialNumber: string; searchQuery?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (!serialNumber) return null;

  const imeis = serialNumber.split(',').map(s => s.trim()).filter(Boolean);

  if (imeis.length <= 1) {
    return (
      <span className="text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200 inline-block">
        {serialNumber}
      </span>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const matchedImei = query ? imeis.find(i => i.toLowerCase().includes(query)) : null;
  const primaryImei = matchedImei || imeis[0];
  const remainingCount = imeis.length - 1;

  if (!expanded) {
    return (
      <div className="inline-flex items-center gap-1.5 my-0.5" onClick={(e) => e.stopPropagation()}>
        <span className="text-[10px] uppercase font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200">
          {primaryImei}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(true);
          }}
          className="text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 cursor-pointer transition"
          title="Nhấn để xem danh sách IMEI"
        >
          +{remainingCount} IMEI (xem)
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 space-y-1 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold text-slate-500">Danh sách {imeis.length} IMEI:</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setExpanded(false);
          }}
          className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
        >
          Ẩn bớt
        </button>
      </div>
      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 bg-slate-50 border border-slate-200 rounded-md">
        {imeis.map((im, idx) => {
          const isMatch = query && im.toLowerCase().includes(query);
          return (
            <span
              key={idx}
              className={`text-[9.5px] font-mono px-1.5 py-0.5 rounded border ${
                isMatch ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold' : 'bg-white text-slate-700 border-slate-200'
              }`}
            >
              {im}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default function WarrantyManager({
  warranties,
  repairs,
  users,
  currentUser,
  onAddWarranty,
  invoices,
  products = []
 }: WarrantyManagerProps) {
  const [portalSearch, setPortalSearch] = useState('');
  const [activeSearchResult, setActiveSearchResult] = useState<{ type: 'warranty' | 'repair', data: WarrantyCard | RepairTicket } | null>(null);
  const [searched, setSearched] = useState(false);

  // Universal Search Engine for Product IMEI, Warranty Cards, and Invoice Items
  const performWarrantyLookup = (rawQuery: string) => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return;

    // 1. Search Warranty Cards (match S/N, customer, or linked invoice product IMEIs)
    let warrantyMatch = warranties.find(w => {
      if (w.serialNumber.toLowerCase() === query || w.serialNumber.toLowerCase().includes(query)) return true;
      if (w.customerName.toLowerCase().includes(query) || w.customerPhone.includes(query)) return true;
      if (w.productName.toLowerCase().includes(query)) return true;

      if (w.linkedInvoiceId) {
        const inv = invoices.find(i => i.id === w.linkedInvoiceId);
        if (inv) {
          if (inv.invoiceNumber.toLowerCase().includes(query)) return true;
          if (inv.items.some(it => it.imeis?.some(im => im.toLowerCase() === query || im.toLowerCase().includes(query)))) return true;
        }
      }
      return false;
    });

    // 2. If no direct card match, search invoices directly by product IMEI or invoice number
    if (!warrantyMatch) {
      const matchedInvoice = invoices.find(inv => {
        if (inv.invoiceNumber.toLowerCase() === query || inv.invoiceNumber.toLowerCase().includes(query)) return true;
        return inv.items.some(it => it.imeis?.some(im => im.toLowerCase() === query || im.toLowerCase().includes(query)));
      });

      if (matchedInvoice) {
        const matchedItem = matchedInvoice.items.find(it => 
          it.imeis?.some(im => im.toLowerCase() === query || im.toLowerCase().includes(query))
        ) || matchedInvoice.items[0];

        const matchedImeiStr = matchedItem?.imeis?.find(im => im.toLowerCase() === query || im.toLowerCase().includes(query)) || matchedItem?.imeis?.[0] || matchedInvoice.invoiceNumber;
        const warrMonths = matchedItem?.warrantyMonths ?? 12;
        const purchaseDate = matchedInvoice.createdAt.slice(0, 10);
        const expiryDateStr = computeExpiryDate(purchaseDate, warrMonths);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDateStr);
        expiry.setHours(0, 0, 0, 0);

        warrantyMatch = {
          id: `warr_inv_${matchedInvoice.id}`,
          serialNumber: matchedImeiStr,
          productName: matchedItem?.productName || `Hóa đơn ${matchedInvoice.invoiceNumber}`,
          customerName: matchedInvoice.customerName,
          customerPhone: matchedInvoice.customerPhone,
          purchaseDate,
          warrantyMonths: warrMonths,
          expiryDate: expiryDateStr,
          status: expiry.getTime() < today.getTime() ? 'expired' : 'active',
          notes: `Truy xuất theo IMEI sản phẩm thuộc Hoá đơn ${matchedInvoice.invoiceNumber}`,
          linkedInvoiceId: matchedInvoice.id
        };
      }
    }

    if (warrantyMatch) {
      setActiveSearchResult({ type: 'warranty', data: warrantyMatch });
      setSearched(true);
      return;
    }

    // 3. Search Repair Tickets
    const repairMatch = repairs.find(r => 
      r.deviceSerial.toLowerCase().includes(query) ||
      r.ticketNumber.toLowerCase().includes(query) ||
      r.customerName.toLowerCase().includes(query) ||
      r.customerPhone.includes(query)
    );

    if (repairMatch) {
      setActiveSearchResult({ type: 'repair', data: repairMatch });
      setSearched(true);
      return;
    }

    setActiveSearchResult(null);
    setSearched(true);
  };

  // Use Barcode Scanner to quickly set portal search and search instantly
  useBarcodeScanner((barcode) => {
    setPortalSearch(barcode);
    performWarrantyLookup(barcode);
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
  const [viewRepairInvoiceModal, setViewRepairInvoiceModal] = useState<RepairTicket | null>(null);

  // Portal IMEI search processor
  const handlePortalCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalSearch.trim()) return;
    performWarrantyLookup(portalSearch);
  };

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Helper to compute remaining days from today
  const getWarrantyStatus = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDateStr);
    expiry.setHours(0, 0, 0, 0);
    const timeDiff = expiry.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));

    if (daysDiff >= 0) {
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
    const q = dirSearch.trim().toLowerCase();
    return warranties.filter(w => {
      const linkedInvoice = w.linkedInvoiceId ? invoices.find(i => i.id === w.linkedInvoiceId) : null;
      const imeiInInvoice = linkedInvoice?.items.some(it => it.imeis?.some(im => im.toLowerCase().includes(q)));

      const matchText = 
        !q ||
        w.serialNumber.toLowerCase().includes(q) ||
        w.productName.toLowerCase().includes(q) ||
        w.customerName.toLowerCase().includes(q) ||
        w.customerPhone.includes(q) ||
        (linkedInvoice && linkedInvoice.invoiceNumber.toLowerCase().includes(q)) ||
        imeiInInvoice;

      if (statusFilter === 'all') return matchText;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiry = new Date(w.expiryDate);
      expiry.setHours(0, 0, 0, 0);
      const isExpired = expiry.getTime() < today.getTime();
      return matchText && (statusFilter === 'expired' ? isExpired : !isExpired);
    }).sort((a,b) => b.id.localeCompare(a.id));
  }, [warranties, invoices, dirSearch, statusFilter]);

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

    const calculatedExpiryStr = computeExpiryDate(newPurchaseDate, Number(newMonths));
    const calculatedExpiry = new Date(calculatedExpiryStr);
    calculatedExpiry.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isExpired = calculatedExpiry.getTime() < today.getTime();

    const cardPayload: WarrantyCard = {
      id: `war_${Date.now()}`,
      serialNumber: newSerial.trim(),
      productName: newProductName.trim(),
      customerName: newCustName.trim(),
      customerPhone: newCustPhone.trim(),
      purchaseDate: newPurchaseDate,
      warrantyMonths: Number(newMonths),
      expiryDate: calculatedExpiryStr,
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
                  activeSearchResult.type === 'warranty' ? (
                    <div className="bg-white/95 text-slate-800 rounded-2xl p-6 text-left border border-slate-100 shadow-lg space-y-4 max-w-xl mx-auto backdrop-blur-xs">
                      {(() => {
                         const w = activeSearchResult.data as WarrantyCard;
                         const coverage = getWarrantyStatus(w.expiryDate);
                         const linkedInvoice = w.linkedInvoiceId ? invoices.find(i => i.id === w.linkedInvoiceId) : null;

                         return (
                           <>
                             <div className="flex justify-between items-start gap-4">
                               <div 
                                 className={w.linkedInvoiceId ? 'cursor-pointer group' : ''}
                                 onClick={() => {
                                   if (linkedInvoice) setViewInvoiceModal(linkedInvoice);
                                 }}
                               >
                                 <span className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-sm">KÍCH HOẠT HỢP LỆ</span>
                                 <h4 className={`font-bold text-lg mt-1 ${w.linkedInvoiceId ? 'text-indigo-600 group-hover:text-indigo-700 underline decoration-indigo-200 underline-offset-2' : 'text-slate-900'}`}>
                                   {w.productName}
                                 </h4>
                                 <div className="text-xs font-mono font-bold text-slate-600 mt-1 flex items-center gap-1.5 flex-wrap">
                                   <span>Mã S/N - IMEI:</span>
                                   <SmartImeiBadge serialNumber={w.serialNumber} searchQuery={portalSearch} />
                                 </div>
                                 {w.linkedInvoiceId && (
                                    <p className="text-[10px] text-indigo-500 mt-1 italic">👆 Nhấn vào đây để xem chi tiết hoá đơn gốc / cấu hình bán ra</p>
                                 )}
                               </div>
                               <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${coverage.color}`}>
                                 {coverage.text}
                               </span>
                             </div>

                             <div className="border-t border-slate-100 pt-3 grid grid-cols-2 gap-4 text-xs">
                               <div className="space-y-1">
                                 <span className="text-slate-400 font-semibold block uppercase text-[10px]">THÔNG TIN KHÁCH HÀNG</span>
                                 <p className="font-bold text-slate-800 flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-slate-400" /> {w.customerName}</p>
                                 <p className="text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {w.customerPhone}</p>
                                 {w.processedBy && (
                                   <p className="text-[10px] text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-sm px-1.5 py-0.5 w-fit font-bold mt-1">👤 Kích hoạt: {w.processedBy}</p>
                                 )}
                               </div>
                               <div className="space-y-1">
                                 <span className="text-slate-400 font-semibold block uppercase text-[10px]">MỐC THỜI GIAN</span>
                                 <p className="text-slate-700 flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5 text-slate-400" /> Ngày mua: {w.purchaseDate}</p>
                                 <p className="text-slate-700 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-400" /> Hết hạn: {w.expiryDate}</p>
                               </div>
                             </div>

                             {/* Multi-product invoice breakdown */}
                             {linkedInvoice && linkedInvoice.items && linkedInvoice.items.length > 0 && (
                               <div className="border-t border-slate-100 pt-3 mt-1">
                                 <div className="flex justify-between items-center mb-2">
                                   <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1">
                                     <FileCheck className="w-3.5 h-3.5 text-indigo-600" />
                                     Danh sách sản phẩm trong Hóa đơn #{linkedInvoice.invoiceNumber} ({linkedInvoice.items.length} mặt hàng):
                                   </span>
                                   <button
                                     type="button"
                                     onClick={() => setViewInvoiceModal(linkedInvoice)}
                                     className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded cursor-pointer"
                                   >
                                     Xem hoá đơn
                                   </button>
                                 </div>

                                 <div className="bg-slate-50 rounded-xl p-3 space-y-2 border border-slate-200/80 max-h-52 overflow-y-auto divide-y divide-slate-200/60">
                                   {linkedInvoice.items.map((it, idx) => (
                                     <div key={idx} className="pt-2 first:pt-0 flex justify-between items-start text-xs">
                                       <div className="pr-2">
                                         <p className="font-bold text-slate-800">{it.productName}</p>
                                         {it.imeis && it.imeis.length > 0 && (
                                           <div className="mt-1">
                                             <SmartImeiBadge serialNumber={it.imeis.join(', ')} searchQuery={portalSearch} />
                                           </div>
                                         )}
                                       </div>
                                       <div className="text-right whitespace-nowrap">
                                         <span className="text-[10px] font-bold bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded">
                                           SL: {it.quantity}
                                         </span>
                                         <p className="text-[10px] font-bold text-indigo-600 mt-1">
                                           BH: {it.warrantyMonths ? formatWarrantyText(it.warrantyMonths) : 'N/A'}
                                         </p>
                                       </div>
                                     </div>
                                   ))}
                                 </div>
                               </div>
                             )}

                             {w.notes && (
                               <div className="bg-slate-50 p-2.5 rounded-lg text-[11px] text-slate-500 italic border border-slate-100">
                                 Ghi chú: {w.notes}
                               </div>
                             )}
                           </>
                         );
                      })()}
                    </div>
                  ) : (
                    <div className="bg-white/95 text-slate-800 rounded-2xl p-6 text-left border border-slate-100 shadow-lg space-y-4 max-w-xl mx-auto backdrop-blur-xs">
                      {(() => {
                        const r = activeSearchResult.data as RepairTicket;
                        return (
                          <>
                            <div className="flex justify-between items-start gap-4">
                              <div>
                                <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-sm uppercase">Phiếu Sửa Chữa</span>
                                <h4 className="font-bold text-lg mt-1 text-slate-900 line-clamp-1">{r.ticketNumber}</h4>
                                <p className="text-sm font-semibold text-slate-700">{r.deviceName}</p>
                              </div>
                              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${r.status === 'completed' ? 'text-emerald-700 bg-emerald-50' : 'text-amber-700 bg-amber-50'}`}>
                                {r.status === 'completed' ? 'Đã xong' : 'Đang xử lý'}
                              </span>
                            </div>
                            <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-4 text-xs">
                              <div className="space-y-1">
                                <span className="text-slate-400 font-semibold block uppercase text-[10px]">THÔNG TIN KHÁCH HÀNG</span>
                                <p className="font-bold text-slate-800 flex items-center gap-1"><UserIcon className="w-3.5 h-3.5 text-slate-400" /> {r.customerName}</p>
                                <p className="text-slate-500 flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {r.customerPhone}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-slate-400 font-semibold block uppercase text-[10px]">CHI TIẾT DỊCH VỤ</span>
                                <p className="text-slate-700">Kỹ thuật: {r.technician}</p>
                                <p className="text-slate-700 font-bold text-sm">Chi phí: {formatVND(r.actualCost || r.estimatedCost)}</p>
                              </div>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )
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
                
                const matchedRepair = card.linkedRepairId 
                  ? repairs.find(r => r.id === card.linkedRepairId) 
                  : repairs.find(r => 
                      (r.deviceSerial && r.deviceSerial === card.serialNumber) ||
                      (`REP-${r.ticketNumber}` === card.serialNumber) ||
                      (r.ticketNumber === card.serialNumber) ||
                      (card.notes && r.ticketNumber && card.notes.includes(r.ticketNumber)) ||
                      (card.productName.toLowerCase().includes("sửa") && (r.deviceSerial === card.serialNumber || r.ticketNumber === card.serialNumber))
                    );

                const matchedInvoice = card.linkedInvoiceId 
                  ? invoices.find(i => i.id === card.linkedInvoiceId) 
                  : null;

                const isClickable = !!matchedInvoice || !!matchedRepair;

                return (
                  <tr key={card.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4">
                      <div 
                        className={`max-w-md ${isClickable ? 'cursor-pointer hover:bg-slate-100/50 p-1.5 -ml-1.5 rounded-lg transition group' : ''}`}
                        onClick={() => {
                          if (matchedInvoice) {
                            setViewInvoiceModal(matchedInvoice);
                          } else if (matchedRepair) {
                            setViewRepairInvoiceModal(matchedRepair);
                          }
                        }}
                      >
                        <p className={`font-bold ${isClickable ? 'text-indigo-600 group-hover:text-indigo-700' : 'text-slate-800'}`}>
                          {card.productName}
                          {matchedInvoice && <Sparkles className="w-3.5 h-3.5 inline-block ml-1 text-indigo-500" />}
                          {matchedRepair && <Wrench className="w-3.5 h-3.5 inline-block ml-1 text-emerald-500" />}
                        </p>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <SmartImeiBadge serialNumber={card.serialNumber} searchQuery={dirSearch} />
                          {matchedInvoice && (
                            <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-sm border border-indigo-100">
                              HĐ #{matchedInvoice.invoiceNumber} ({matchedInvoice.items.length} sp)
                            </span>
                          )}
                        </div>
                        {matchedInvoice && matchedInvoice.items.length > 1 && (
                          <p className="text-[10px] text-slate-500 font-medium line-clamp-1 mt-1">
                            Gồm: {matchedInvoice.items.map(i => i.productName).join(', ')}
                          </p>
                        )}
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
                      {(() => {
                        if (matchedInvoice && matchedInvoice.items && matchedInvoice.items.length > 0) {
                          const minW = matchedInvoice.items.reduce((min, i) => Math.min(min, i.warrantyMonths ?? 0), matchedInvoice.items[0]?.warrantyMonths ?? 0);
                          const maxW = matchedInvoice.items.reduce((max, i) => Math.max(max, i.warrantyMonths ?? 0), 0);
                          if (minW !== maxW && minW > 0) {
                            return `${formatWarrantyText(minW)} - ${formatWarrantyText(maxW)}`;
                          }
                          if (minW > 0) {
                            return formatWarrantyText(minW);
                          }
                        }
                        return formatWarrantyText(card.warrantyMonths);
                      })()}
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
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Thời hạn bảo hành</label>
                    <select 
                      id="input-warranty-months"
                      required
                      value={newMonths}
                      onChange={e => setNewMonths(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 cursor-pointer"
                    >
                      <option value="0.1">3 ngày</option>
                      <option value="0.2">7 ngày</option>
                      <option value="0.3">Bao test</option>
                      <option value="1">1 Tháng bảo hành</option>
                      <option value="3">3 Tháng bảo hành</option>
                      <option value="6">6 Tháng bảo hành</option>
                      <option value="12">12 Tháng bảo hành (Mặc định)</option>
                      <option value="24">24 Tháng bảo hành</option>
                      <option value="36">36 Tháng bảo hành</option>
                    </select>
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
                          <td className="py-3 px-4 font-semibold text-slate-800">
                            <p className="font-bold text-slate-900">{it.productName}</p>
                            {it.imeis && it.imeis.length > 0 && (
                              <div className="mt-1">
                                <SmartImeiBadge serialNumber={it.imeis.join(', ')} />
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-slate-600">{it.quantity}</td>
                          <td className="py-3 px-4 text-center text-indigo-600 font-bold">{it.warrantyMonths ? formatWarrantyText(it.warrantyMonths) : 'N/A'}</td>
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

      {/* View Repair Invoice Modal */}
      <AnimatePresence>
        {viewRepairInvoiceModal && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewRepairInvoiceModal(null)}
              className="fixed inset-0 bg-black/40"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] p-6 sm:p-8 shadow-2xl w-full max-w-3xl z-10 relative my-auto max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                  Hóa Đơn Dịch Vụ Sửa Chữa Đã Bàn Giao
                </h3>
                <button 
                  onClick={() => setViewRepairInvoiceModal(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div id="print-repair-invoice-block" className="space-y-6">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="text-lg font-black text-slate-900">Mã phiếu sửa: REP-{viewRepairInvoiceModal.ticketNumber}</h4>
                    <p className="text-xs text-slate-500 mt-1">Ngày lập: {new Date(viewRepairInvoiceModal.createdAt).toLocaleDateString('vi-VN')}</p>
                    {viewRepairInvoiceModal.deliveredAt && (
                      <p className="text-xs text-indigo-600 font-bold mt-0.5">Ngày máy giao: {viewRepairInvoiceModal.deliveredAt}</p>
                    )}
                    <p className="text-xs text-slate-500">Thu ngân phụ phụ trách: {viewRepairInvoiceModal.processedBy || 'Hệ thống'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Khách Hàng</p>
                    <p className="text-sm font-bold text-slate-900 mt-0.5">{viewRepairInvoiceModal.customerName}</p>
                    <p className="text-xs text-slate-500">{viewRepairInvoiceModal.customerPhone}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl text-xs">
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Thiết bị gửi sửa:</p>
                    <p className="font-extrabold text-slate-800 mt-0.5">{viewRepairInvoiceModal.deviceName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">S/N: {viewRepairInvoiceModal.deviceSerial || 'Chưa cung cấp'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 font-bold uppercase text-[9px] tracking-wider">Lỗi chẩn đoán:</p>
                    <p className="font-semibold text-rose-700 mt-0.5">{viewRepairInvoiceModal.issueDescription}</p>
                  </div>
                </div>

                {viewRepairInvoiceModal.solution && (
                  <div className="bg-emerald-50/50 border border-emerald-100/30 p-3.5 rounded-xl text-xs">
                    <p className="text-slate-500 font-bold uppercase text-[9.5px]">Biện pháp xử lý & khắc phục:</p>
                    <p className="text-emerald-800 font-semibold mt-1 leading-normal">{viewRepairInvoiceModal.solution}</p>
                  </div>
                )}

                {/* Used Parts detail table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs bg-white">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4 font-bold">Mục lục sửa chữa / linh kiện</th>
                        <th className="py-2.5 px-4 font-bold text-center">SL</th>
                        <th className="py-2.5 px-4 font-bold text-right">Đơn giá</th>
                        <th className="py-2.5 px-4 font-bold text-center">Bảo hành linh kiện</th>
                        <th className="py-2.5 px-4 font-bold text-right">Tổng tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Component listing */}
                      {viewRepairInvoiceModal.usedParts && viewRepairInvoiceModal.usedParts.length > 0 ? (
                        viewRepairInvoiceModal.usedParts.map((item, idx) => {
                          const warrInfo = getPartWarrantyInfo(item, viewRepairInvoiceModal.deliveredAt || viewRepairInvoiceModal.createdAt.slice(0, 10), products);
                          return (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-4 text-slate-800 font-semibold">Linh kiện: {item.name}</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-600">{item.quantity}</td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price)}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold text-[10.5px] rounded">
                                  🛡️ {warrInfo.warrantyText}
                                </span>
                                {warrInfo.expiryDate && (
                                  <p className="text-[9.5px] text-slate-500 font-medium mt-0.5">Hạn: {warrInfo.expiryDate}</p>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.price * item.quantity)}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-2.5 px-4 text-center text-slate-400 italic">
                            Không sử dụng linh kiện rời (hoặc tính gộp trong tiền công)
                          </td>
                        </tr>
                      )}

                      {/* Service Labor calculation */}
                      {(() => {
                        const partsTotal = viewRepairInvoiceModal.usedParts 
                          ? viewRepairInvoiceModal.usedParts.reduce((acc, current) => acc + (current.price * current.quantity), 0)
                          : 0;
                        const totalBill = viewRepairInvoiceModal.actualCost || viewRepairInvoiceModal.estimatedCost || 0;
                        const laborFee = Math.max(0, totalBill - partsTotal);
                        if (laborFee > 0 || !viewRepairInvoiceModal.usedParts || viewRepairInvoiceModal.usedParts.length === 0) {
                          return (
                            <tr className="hover:bg-slate-50/50">
                              <td colSpan={3} className="py-2.5 px-4 text-slate-800 font-semibold italic">
                                Chi phí kỹ thuật & Tiền công dịch vụ
                              </td>
                              <td className="py-2.5 px-4 text-center text-slate-400 font-mono">-</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-800 font-mono">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(laborFee)}
                              </td>
                            </tr>
                          );
                        }
                        return null;
                      })()}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-xs text-slate-400 italic">
                    {viewRepairInvoiceModal.warrantyUntil && (
                      <p className="font-bold text-emerald-600">🛡️ Bảo hành dịch vụ đến: {viewRepairInvoiceModal.warrantyUntil}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Tổng Thanh Toán</p>
                    <p className="text-2xl font-black text-emerald-600 font-mono">
                      {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(viewRepairInvoiceModal.actualCost || viewRepairInvoiceModal.estimatedCost)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('print-repair-invoice-block')?.innerHTML;
                    const originalC = document.body.innerHTML;
                    if (printContents) {
                      document.body.innerHTML = printContents;
                      window.print();
                      document.body.innerHTML = originalC;
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer shadow-3xs flex items-center gap-1.5"
                >
                  🖨️ In Hoá Đơn Dịch Vụ
                </button>
                <button 
                  type="button" 
                  onClick={() => setViewRepairInvoiceModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer transition border border-slate-200"
                >
                  Đóng cửa sổ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
