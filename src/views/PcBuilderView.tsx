import React, { useState, useMemo } from 'react';
import { 
  Product, 
  ProductIMEI, 
  Customer, 
  SalesInvoice, 
  InvoiceItem, 
  User, 
  PrintSettings,
  formatWarrantyText
} from '../types';
import { printElementViaIframe } from '../utils/printHelper';
import { 
  Cpu, 
  Layers, 
  Zap, 
  AlertTriangle, 
  Printer, 
  CheckCircle2, 
  ShoppingCart, 
  UserCheck, 
  Plus, 
  Trash2, 
  Check, 
  X, 
  Info, 
  Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PcBuilderViewProps {
  products: Product[];
  imeis: ProductIMEI[];
  customers: Customer[];
  currentUser: User;
  printSettings?: PrintSettings;
  onAddInvoice: (invoice: SalesInvoice) => void;
  onAddCustomer: (customer: Customer) => void;
}

// 12 Fixed Build Slots
export interface BuildSlot {
  key: string;
  label: string;
  categoryKeywords: string[];
}

const BUILD_SLOTS: BuildSlot[] = [
  { key: 'cpu', label: '1. Vi Xử Lý (CPU)', categoryKeywords: ['CPU', 'Vi xử lý', 'Intel', 'AMD'] },
  { key: 'main', label: '2. Bo Mạch Chủ (Mainboard)', categoryKeywords: ['Mainboard', 'Main', 'Bo mạch chủ'] },
  { key: 'ram', label: '3. Bộ Nhớ RAM', categoryKeywords: ['RAM', 'Bộ nhớ'] },
  { key: 'vga', label: '4. Card Màn Hình (VGA)', categoryKeywords: ['VGA', 'Card màn hình', 'GPU'] },
  { key: 'ssd', label: '5. Ổ Cứng SSD', categoryKeywords: ['SSD', 'Ổ cứng'] },
  { key: 'hdd', label: '6. Ổ Cứng HDD', categoryKeywords: ['HDD'] },
  { key: 'psu', label: '7. Nguồn Máy Tính (PSU)', categoryKeywords: ['Nguồn', 'PSU'] },
  { key: 'case', label: '8. Vỏ Cây (Case)', categoryKeywords: ['Case', 'Vỏ cây', 'Vỏ ca'] },
  { key: 'cooler', label: '9. Tản Nhiệt CPU', categoryKeywords: ['Tản nhiệt', 'Cooler'] },
  { key: 'monitor', label: '10. Màn Hình Máy Tính', categoryKeywords: ['Màn hình', 'Monitor'] },
  { key: 'keyboard', label: '11. Phím / Chuột / Tai Nghe', categoryKeywords: ['Phụ kiện', 'Bàn phím', 'Chuột'] },
  { key: 'fan', label: '12. Quạt Tản Nhiệt / Fan LED', categoryKeywords: ['Fan', 'Quạt'] }
];

export const PcBuilderView: React.FC<PcBuilderViewProps> = ({
  products,
  imeis,
  customers,
  currentUser,
  printSettings,
  onAddInvoice,
  onAddCustomer
}) => {
  // Selected components per slot
  const [selectedBuild, setSelectedBuild] = useState<Record<string, { product: Product; quantity: number }>>({});

  // Customer & Payment Selection
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản' | 'Thẻ' | 'Ghi nợ'>('Chuyển khoản');

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  // Estimate Wattage Requirements
  const estimatedWattage = useMemo(() => {
    let watt = 100; // Base motherboard/system power

    if (selectedBuild.cpu) {
      const name = selectedBuild.cpu.product.name.toUpperCase();
      if (name.includes('I9') || name.includes('RYZEN 9')) watt += 250;
      else if (name.includes('I7') || name.includes('RYZEN 7')) watt += 180;
      else if (name.includes('I5') || name.includes('RYZEN 5')) watt += 125;
      else watt += 65;
    }

    if (selectedBuild.vga) {
      const name = selectedBuild.vga.product.name.toUpperCase();
      if (name.includes('4090') || name.includes('4080')) watt += 350;
      else if (name.includes('4070') || name.includes('3080')) watt += 280;
      else if (name.includes('3060') || name.includes('4060') || name.includes('6600')) watt += 170;
      else watt += 120;
    }

    if (selectedBuild.ram) watt += 15 * selectedBuild.ram.quantity;
    if (selectedBuild.ssd) watt += 10;
    if (selectedBuild.fan) watt += 15 * selectedBuild.fan.quantity;

    return watt;
  }, [selectedBuild]);

  // Selected PSU Rated Wattage
  const selectedPsuWattage = useMemo(() => {
    if (!selectedBuild.psu) return 0;
    const name = selectedBuild.psu.product.name;
    const match = name.match(/(\d{3,4})\s*W/i);
    return match ? parseInt(match[1], 10) : 500;
  }, [selectedBuild.psu]);

  const psuWarning = useMemo(() => {
    if (!selectedBuild.psu) return 'Chưa chọn Nguồn PSU!';
    if (selectedPsuWattage < estimatedWattage + 50) {
      return `Cảnh báo: Nguồn PSU (${selectedPsuWattage}W) không đủ tải cho công suất dự kiến (${estimatedWattage}W)! Nên chọn nguồn tối thiểu ${estimatedWattage + 100}W.`;
    }
    return null;
  }, [selectedBuild.psu, selectedPsuWattage, estimatedWattage]);

  // Total Build Cost
  const totalBuildAmount = useMemo(() => {
    return Object.values(selectedBuild).reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  }, [selectedBuild]);

  // Validation: Must select CPU and Mainboard
  const isBuildValid = useMemo(() => {
    return Boolean(selectedBuild.cpu && selectedBuild.main);
  }, [selectedBuild]);

  // Handle slot component selection
  const handleSelectSlotProduct = (slotKey: string, productId: string) => {
    if (!productId) {
      const updated = { ...selectedBuild };
      delete updated[slotKey];
      setSelectedBuild(updated);
      return;
    }

    const prod = products.find(p => p.id === productId);
    if (prod) {
      setSelectedBuild({
        ...selectedBuild,
        [slotKey]: { product: prod, quantity: 1 }
      });
    }
  };

  // Convert PC Build to Invoice & Submit
  const handleCheckoutBuildInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isBuildValid) {
      alert('Vui lòng chọn ít nhất CPU và Bo mạch chủ (Mainboard) để chốt cấu hình PC!');
      return;
    }

    const items: InvoiceItem[] = Object.values(selectedBuild).map(item => ({
      productId: item.product.id,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price,
      warrantyMonths: item.product.warrantyMonths || 12
    }));

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `HDPC${dateStr}-${randCode}`;

    const newInvoice: SalesInvoice = {
      id: `inv_pc_${Date.now()}`,
      invoiceNumber,
      customerId: selectedCustomerId || `cust_${Date.now()}`,
      customerName: customerSearchInput.trim() || 'Khách build PC',
      customerPhone: '---',
      items,
      totalAmount: totalBuildAmount,
      debtAmount: 0,
      paymentMethod,
      createdAt: now.toISOString(),
      processedBy: currentUser.fullName,
      note: `Bộ cấu hình PC ráp sẵn - Công suất ước tính: ${estimatedWattage}W`
    };

    onAddInvoice(newInvoice);
    setSelectedBuild({});
    setCustomerSearchInput('');
    setSelectedCustomerId('');
    alert(`✅ Đã chốt hóa đơn bán cấu hình PC ${invoiceNumber} thành công!`);
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full min-h-0">
      
      {/* ========================================================================= */}
      {/* LEFT COLUMN: 12 COMPONENT SLOTS (LIGHT THEME) */}
      {/* ========================================================================= */}
      <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200 bento-shadow p-4 overflow-y-auto space-y-3">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              Tự Phối Ráp Cấu Hình Máy Tính PC
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Chọn từng slot linh kiện sẵn hàng trong kho để tự động tính tổng tiền và công suất nguồn.
            </p>
          </div>

          <button
            onClick={() => setSelectedBuild({})}
            className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
          >
            Làm mới cấu hình
          </button>
        </div>

        {/* 12 Slots List */}
        <div className="space-y-2.5">
          {BUILD_SLOTS.map(slot => {
            const currentItem = selectedBuild[slot.key];

            // Filter products in stock matching keywords
            const availableProducts = products.filter(p => {
              if (p.stock <= 0) return false;
              const nameCat = `${p.name} ${p.category}`.toLowerCase();
              return slot.categoryKeywords.some(kw => nameCat.includes(kw.toLowerCase()));
            });

            return (
              <div 
                key={slot.key}
                className={`p-3 rounded-xl border transition ${
                  currentItem ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-700 sm:w-48 shrink-0">{slot.label}</span>

                  <div className="flex-1 flex items-center gap-2">
                    <select
                      value={currentItem?.product.id || ''}
                      onChange={e => handleSelectSlotProduct(slot.key, e.target.value)}
                      className="w-full text-xs font-bold bg-white border border-slate-300 rounded-lg p-2 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="">-- Chọn {slot.label.split('.')[1]} --</option>
                      {availableProducts.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({formatVND(p.price)}) - Tồn: {p.stock}
                        </option>
                      ))}
                    </select>

                    {currentItem && (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono font-black text-emerald-600 whitespace-nowrap">
                          {formatVND(currentItem.product.price * currentItem.quantity)}
                        </span>
                        <button
                          onClick={() => handleSelectSlotProduct(slot.key, '')}
                          className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                          title="Bỏ chọn"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: SUMMARY & WATTAGE CALCULATOR (DARK THEME) */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-96 bg-slate-900 text-white rounded-2xl p-5 bento-shadow flex flex-col justify-between shrink-0 space-y-4">
        
        <div className="space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <h3 className="font-black text-sm uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Tổng Kết Cấu Hình
            </h3>
            <span className="text-xs font-mono text-slate-400">
              {Object.keys(selectedBuild).length} / 12 linh kiện
            </span>
          </div>

          {/* Wattage Calculator Indicator */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> Công suất dự kiến:
              </span>
              <strong className="font-mono text-amber-400 font-bold">{estimatedWattage} Watt</strong>
            </div>

            {psuWarning && (
              <p className="text-[10px] text-rose-400 font-bold flex items-center gap-1 bg-rose-950/50 p-1.5 rounded border border-rose-800/50">
                <AlertTriangle className="w-3 h-3 shrink-0" /> {psuWarning}
              </p>
            )}
          </div>

          {/* Validation checklist */}
          <div className="space-y-1 text-xs">
            <div className={`flex items-center gap-1.5 ${selectedBuild.cpu ? 'text-emerald-400' : 'text-slate-500'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>Vi xử lý CPU: {selectedBuild.cpu ? selectedBuild.cpu.product.name : 'Chưa chọn'}</span>
            </div>
            <div className={`flex items-center gap-1.5 ${selectedBuild.main ? 'text-emerald-400' : 'text-slate-500'}`}>
              <Check className="w-3.5 h-3.5" />
              <span>Mainboard: {selectedBuild.main ? selectedBuild.main.product.name : 'Chưa chọn'}</span>
            </div>
          </div>

          {/* Total Price */}
          <div className="pt-2 border-t border-slate-800">
            <p className="text-xs text-slate-400 uppercase font-bold">Tổng tiền bộ máy PC:</p>
            <h2 className="text-2xl font-black font-mono text-emerald-400 mt-0.5">
              {formatVND(totalBuildAmount)}
            </h2>
          </div>
        </div>

        {/* Customer & Checkout Form */}
        <form onSubmit={handleCheckoutBuildInvoice} className="space-y-3 pt-3 border-t border-slate-800">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1">Tên Khách Hàng (In Báo Giá / Hóa Đơn)</label>
            <input 
              type="text"
              placeholder="e.g. Anh Thành Build PC..."
              value={customerSearchInput}
              onChange={e => setCustomerSearchInput(e.target.value)}
              className="w-full text-xs bg-slate-800 border border-slate-700 rounded-xl p-2.5 font-bold text-white focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={!isBuildValid}
              onClick={() => alert('Đã gửi yêu cầu in bảng báo giá PC!')}
              className="py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center justify-center gap-1 border border-slate-700"
            >
              <Printer className="w-3.5 h-3.5" /> In Báo Giá
            </button>

            <button
              type="submit"
              disabled={!isBuildValid}
              className="py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-lg transition cursor-pointer flex items-center justify-center gap-1"
            >
              Chốt Hóa Đơn
            </button>
          </div>
        </form>

      </div>

    </div>
  );
};

export default PcBuilderView;
