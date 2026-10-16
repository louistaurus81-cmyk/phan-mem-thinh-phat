import React, { useState, useMemo } from 'react';
import { 
  Product, 
  ProductIMEI, 
  Customer, 
  SalesInvoice, 
  InvoiceItem, 
  Category, 
  User, 
  PrintSettings,
  formatWarrantyText
} from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { 
  Search, 
  ShoppingCart, 
  Plus, 
  Minus, 
  Receipt, 
  Check, 
  X, 
  Tag, 
  Barcode 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PosViewProps {
  products: Product[];
  imeis: ProductIMEI[];
  customers: Customer[];
  categories: Category[];
  currentUser: User;
  printSettings?: PrintSettings;
  onAddInvoice: (invoice: SalesInvoice) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateImeis?: (imeis: ProductIMEI[]) => void;
}

export const PosView: React.FC<PosViewProps> = ({
  products,
  imeis,
  customers,
  categories,
  currentUser,
  printSettings,
  onAddInvoice,
  onAddCustomer,
  onUpdateImeis
}) => {
  // Category selection & search
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [invoiceNote, setInvoiceNote] = useState('');

  // Payment & Customer States
  const [paymentMethod, setPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản' | 'Thẻ' | 'Quẹt thẻ' | 'Ghi nợ'>('Chuyển khoản');
  const [paymentType, setPaymentType] = useState<'full' | 'debt' | 'partial'>('full');
  const [paidAmountInput, setPaidAmountInput] = useState<number>(0);

  // Customer Autocomplete Search State
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [newCustomerPhoneInput, setNewCustomerPhoneInput] = useState('');

  // Mobile Bottom Sheet State
  const [showMobileCartSheet, setShowMobileCartSheet] = useState(false);

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  // Filter products by category & search query
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategory === 'Tất cả' || p.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = !query || 
        p.name.toLowerCase().includes(query) || 
        (p.sku && p.sku.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Autocomplete matching customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearchInput.trim()) return customers.slice(0, 5);
    const q = customerSearchInput.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.phone.includes(q)
    ).slice(0, 8);
  }, [customers, customerSearchInput]);

  const activeSelectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Cart Calculations
  const subtotalAmount = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotalAmount * (discountPercent || 0)) / 100);
  }, [subtotalAmount, discountPercent]);

  const finalTotalAmount = useMemo(() => {
    return Math.max(0, subtotalAmount - discountAmount);
  }, [subtotalAmount, discountAmount]);

  // Computed Paid & Debt Amounts
  const actualPaidAmount = useMemo(() => {
    if (paymentType === 'full') return finalTotalAmount;
    if (paymentType === 'debt') return 0;
    if (paymentType === 'partial') {
      return Math.min(finalTotalAmount, Number(paidAmountInput) || 0);
    }
    return finalTotalAmount;
  }, [finalTotalAmount, paymentType, paidAmountInput]);

  const actualDebtAmount = useMemo(() => {
    if (paymentType === 'full') return 0;
    if (paymentType === 'debt') return finalTotalAmount;
    if (paymentType === 'partial') {
      return Math.max(0, finalTotalAmount - (Number(paidAmountInput) || 0));
    }
    return 0;
  }, [finalTotalAmount, paymentType, paidAmountInput]);

  // Add product to cart
  const handleAddToCart = (product: Product, specificImei?: string) => {
    // Check stock
    const availableStock = product.hasImei 
      ? imeis.filter(i => i.productId === product.id && i.status === 'in_stock').length
      : product.stock;

    if (availableStock <= 0) {
      alert(`Sản phẩm "${product.name}" hiện tại đã HẾT HÀNG trong kho!`);
      return;
    }

    const existingIdx = cart.findIndex(it => it.productId === product.id);

    if (existingIdx > -1) {
      const currentQty = cart[existingIdx].quantity;
      if (currentQty + 1 > availableStock) {
        alert(`Không thể thêm quá số lượng tồn kho khả dụng (${availableStock} chiếc).`);
        return;
      }

      const updatedCart = [...cart];
      const existingItem = updatedCart[existingIdx];
      let newImeis = existingItem.imeis ? [...existingItem.imeis] : [];

      if (specificImei && !newImeis.includes(specificImei)) {
        newImeis.push(specificImei);
      }

      updatedCart[existingIdx] = {
        ...existingItem,
        quantity: currentQty + 1,
        imeis: newImeis.length > 0 ? newImeis : undefined
      };
      setCart(updatedCart);
    } else {
      const newItem: InvoiceItem = {
        productId: product.id,
        productName: product.name,
        quantity: 1,
        price: product.price,
        warrantyMonths: product.warrantyMonths || 12,
        imeis: specificImei ? [specificImei] : undefined
      };
      setCart([...cart, newItem]);
    }
  };

  // Update item quantity in cart
  const handleUpdateCartQty = (productId: string, delta: number) => {
    const prod = products.find(p => p.id === productId);
    const item = cart.find(i => i.productId === productId);
    if (!item) return;

    const availableStock = prod?.hasImei
      ? imeis.filter(i => i.productId === productId && i.status === 'in_stock').length
      : (prod?.stock || 0);

    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      setCart(cart.filter(i => i.productId !== productId));
      return;
    }

    if (newQty > availableStock) {
      alert(`Kho hiện chỉ còn ${availableStock} sản phẩm.`);
      return;
    }

    setCart(cart.map(i => i.productId === productId ? { ...i, quantity: newQty } : i));
  };

  // Barcode Scanner Listener
  useBarcodeScanner((barcode) => {
    const lower = barcode.trim().toLowerCase();
    
    // 1. Try matching exact IMEI in stock
    const matchedImei = imeis.find(i => i.imei.toLowerCase() === lower && i.status === 'in_stock');
    if (matchedImei) {
      const matchedProd = products.find(p => p.id === matchedImei.productId);
      if (matchedProd) {
        handleAddToCart(matchedProd, matchedImei.imei);
        return;
      }
    }

    // 2. Try matching SKU or Product ID
    const matchedSku = products.find(p => p.sku && p.sku.toLowerCase() === lower);
    if (matchedSku) {
      handleAddToCart(matchedSku);
      return;
    }

    setSearchQuery(barcode);
  });

  // Handle Customer Selection
  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerSearchInput(c.name);
    setNewCustomerPhoneInput(c.phone);
    setShowCustomerDropdown(false);
  };

  // Quick Create Customer on the fly
  const handleCreateNewCustomer = () => {
    const name = customerSearchInput.trim();
    const phone = newCustomerPhoneInput.trim() || '0900000000';
    if (!name) {
      alert('Vui lòng nhập tên khách hàng.');
      return;
    }

    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      name,
      phone,
      createdAt: new Date().toISOString()
    };

    onAddCustomer(newCust);
    setSelectedCustomerId(newCust.id);
    setShowCustomerDropdown(false);
    alert(`Đã thêm nhanh khách hàng "${newCust.name}" thành công!`);
  };

  // Submit Checkout & Create Sales Invoice
  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      alert('Giỏ hàng hiện tại đang rỗng.');
      return;
    }

    // If debt or partial payment, require selected customer
    if (actualDebtAmount > 0 && !selectedCustomerId && !customerSearchInput.trim()) {
      alert('Vui lòng chọn hoặc nhập thông tin Khách Hàng để ghi nhận Công Nợ!');
      return;
    }

    // Check IMEI tracking requirements
    for (const item of cart) {
      const prod = products.find(p => p.id === item.productId);
      if (prod?.hasImei) {
        if (!item.imeis || item.imeis.length !== item.quantity) {
          alert(`Sản phẩm "${item.productName}" yêu cầu chọn đúng ${item.quantity} mã IMEI (Đã chọn: ${item.imeis?.length || 0})!`);
          return;
        }
      }
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `HD${dateStr}-${randCode}`;

    const custName = activeSelectedCustomer?.name || customerSearchInput.trim() || 'Khách vãng lai';
    const custPhone = activeSelectedCustomer?.phone || newCustomerPhoneInput.trim() || '---';

    const newInvoice: SalesInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      customerId: selectedCustomerId || `cust_${Date.now()}`,
      customerName: custName,
      customerPhone: custPhone,
      items: cart,
      totalAmount: finalTotalAmount,
      debtAmount: actualDebtAmount,
      paymentMethod: paymentType === 'debt' ? 'Ghi nợ' : paymentMethod,
      createdAt: now.toISOString(),
      processedBy: currentUser.fullName,
      note: invoiceNote.trim() || undefined
    };

    // Dispatch invoice
    onAddInvoice(newInvoice);

    // Update IMEI status to sold
    if (onUpdateImeis) {
      let updatedImeisList = [...imeis];
      cart.forEach(item => {
        if (item.imeis && item.imeis.length > 0) {
          item.imeis.forEach(im => {
            const idx = updatedImeisList.findIndex(i => i.productId === item.productId && i.imei.toLowerCase() === im.toLowerCase());
            if (idx > -1) {
              updatedImeisList[idx] = {
                ...updatedImeisList[idx],
                status: 'sold',
                invoiceId: newInvoice.id
              };
            }
          });
        }
      });
      onUpdateImeis(updatedImeisList);
    }

    setCart([]);
    setDiscountPercent(0);
    setInvoiceNote('');
    setSelectedCustomerId('');
    setCustomerSearchInput('');
    setNewCustomerPhoneInput('');
    setPaymentType('full');
    setPaidAmountInput(0);
    setShowMobileCartSheet(false);
    alert(`✅ Đã thanh toán và xuất hóa đơn ${invoiceNumber} thành công!`);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row gap-4 h-full min-h-0">
      
      {/* ========================================================================= */}
      {/* LEFT COLUMN: PRODUCT CATALOG & DYNAMIC CATEGORY CHIPS (70% PC Width) */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-slate-200/80 bento-shadow p-3.5 sm:p-4 overflow-hidden">
        
        {/* Top Search & Filter Bar */}
        <div className="space-y-3 pb-3 border-b border-slate-100 shrink-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Tìm sản phẩm theo Tên, SKU, hoặc Quét mã IMEI vạch..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="text-[11px] font-bold text-slate-500 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 shrink-0">
              <Barcode className="w-4 h-4 text-indigo-600" />
              <span>Máy Quét Mã Vạch Sẵn Sàng</span>
            </div>
          </div>

          {/* Dynamic Category Chips Scrollbar */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedCategory('Tất cả')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                selectedCategory === 'Tất cả'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Tag className="w-3 h-3" /> Tất cả ({products.length})
            </button>

            {categories.map(cat => {
              const catCount = products.filter(p => p.category === cat.name).length;
              const isCatActive = selectedCategory === cat.name;

              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1 ${
                    isCatActive
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isCatActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {catCount}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid Stage */}
        <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredProducts.map(prod => {
            const inStock = prod.hasImei 
              ? imeis.filter(i => i.productId === prod.id && i.status === 'in_stock').length 
              : prod.stock;

            const isOutOfStock = inStock <= 0;

            return (
              <div
                key={prod.id}
                onClick={() => !isOutOfStock && handleAddToCart(prod)}
                className={`group relative p-3 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer select-none ${
                  isOutOfStock 
                    ? 'bg-slate-50 border-slate-200 opacity-60 pointer-events-none' 
                    : 'bg-white border-slate-200/80 hover:border-indigo-500 hover:shadow-md hover:shadow-indigo-50/50'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start gap-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase truncate">
                      {prod.sku || 'N/A'}
                    </span>
                    {prod.hasImei && (
                      <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded border border-indigo-100 shrink-0">
                        IMEI
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-xs text-slate-800 mt-1 line-clamp-2 leading-snug group-hover:text-indigo-600 transition">
                    {prod.name}
                  </h4>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black text-emerald-600 font-mono">
                      {formatVND(prod.price)}
                    </p>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                      Tồn: <strong className={isOutOfStock ? 'text-rose-600' : 'text-slate-700 font-mono'}>{inStock} chiếc</strong>
                    </p>
                  </div>

                  <button 
                    disabled={isOutOfStock}
                    className="w-7 h-7 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 flex items-center justify-center transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs italic">
              Không tìm thấy sản phẩm nào phù hợp với từ khóa "{searchQuery}".
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: STICKY CART & CHECKOUT CONTROL PANEL (30% PC Width) */}
      {/* ========================================================================= */}
      <div className="hidden md:flex w-80 lg:w-96 bg-white rounded-2xl border border-slate-200/80 bento-shadow p-4 flex-col justify-between shrink-0">
        
        {/* Cart Header */}
        <div className="space-y-3 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
            <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-indigo-600" />
              Giỏ Hàng POS ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </h3>
            {cart.length > 0 && (
              <button 
                onClick={() => setCart([])}
                className="text-[10px] font-bold text-rose-500 hover:underline cursor-pointer"
              >
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Cart Line Items */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
            {cart.map(item => (
              <div key={item.productId} className="pt-2 text-xs space-y-1.5">
                <div className="flex justify-between items-start font-bold text-slate-800 gap-2">
                  <span className="truncate">{item.productName}</span>
                  <span className="font-mono text-emerald-600 shrink-0">{formatVND(item.price * item.quantity)}</span>
                </div>

                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-[10px] font-mono">{formatVND(item.price)} / sp</span>
                  
                  <div className="flex items-center gap-1.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => handleUpdateCartQty(item.productId, -1)}
                      className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-mono font-bold text-slate-800 px-1.5">{item.quantity}</span>
                    <button 
                      onClick={() => handleUpdateCartQty(item.productId, 1)}
                      className="p-1 hover:bg-white rounded text-slate-600 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="py-12 text-center text-slate-400 text-xs italic space-y-2">
                <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Giỏ hàng hiện đang rỗng. Chọn sản phẩm ở cột trái hoặc quét mã vạch để thêm!</p>
              </div>
            )}
          </div>
        </div>

        {/* Checkout Form & Controls Stage */}
        <form onSubmit={handleCheckoutSubmit} className="pt-3 border-t border-slate-100 space-y-3 shrink-0">
          
          {/* Autocomplete Customer Picker Input */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 mb-1">Khách Hàng (Tìm hoặc gõ tên mới)</label>
            <div className="relative">
              <input 
                type="text"
                placeholder="Nhập tên hoặc số điện thoại KH..."
                value={customerSearchInput}
                onChange={e => {
                  setCustomerSearchInput(e.target.value);
                  setShowCustomerDropdown(true);
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl p-2 pr-7 font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500"
              />
              {selectedCustomerId && (
                <Check className="w-4 h-4 text-emerald-600 absolute right-2.5 top-1/2 -translate-y-1/2" />
              )}
            </div>

            {/* Customer Dropdown Results */}
            {showCustomerDropdown && customerSearchInput.trim() && (
              <div className="absolute left-0 right-0 bottom-full mb-1 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-48 overflow-y-auto p-1 divide-y divide-slate-100">
                {filteredCustomers.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className="p-2 hover:bg-indigo-50 rounded-lg cursor-pointer text-xs flex justify-between items-center"
                  >
                    <div>
                      <p className="font-bold text-slate-800">{c.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{c.phone}</p>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Chọn</span>
                  </div>
                ))}

                {filteredCustomers.length === 0 && (
                  <div className="p-2 text-center text-xs text-slate-500">
                    <p className="italic">Chưa có khách hàng tên "{customerSearchInput}"</p>
                    <button
                      type="button"
                      onClick={handleCreateNewCustomer}
                      className="mt-1.5 w-full py-1 bg-indigo-600 text-white rounded-lg font-bold text-[10px] cursor-pointer"
                    >
                      + Tạo Nhanh Khách Hàng Mới
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Payment Type & Method Selection */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Phương Thức</label>
              <select
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as any)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2 cursor-pointer"
              >
                <option value="Chuyển khoản">Chuyển khoản</option>
                <option value="Tiền mặt">Tiền mặt</option>
                <option value="Thẻ">Quẹt thẻ</option>
                <option value="Ghi nợ">Ghi nợ 100%</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 mb-1">Hình Thức Nợ</label>
              <select
                value={paymentType}
                onChange={e => setPaymentType(e.target.value as any)}
                className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2 cursor-pointer"
              >
                <option value="full">Đủ 100%</option>
                <option value="partial">Thanh toán 1 phần</option>
                <option value="debt">Ghi nợ toàn bộ</option>
              </select>
            </div>
          </div>

          {/* Partial Payment Amount Input */}
          {paymentType === 'partial' && (
            <div className="bg-amber-50 p-2 rounded-xl border border-amber-200">
              <label className="block text-[10px] font-extrabold text-amber-900 mb-1">Khách Thanh Toán Trước (VNĐ)</label>
              <input 
                type="number"
                min={0}
                max={finalTotalAmount}
                value={paidAmountInput || ''}
                onChange={e => setPaidAmountInput(Number(e.target.value))}
                className="w-full text-xs font-mono font-bold bg-white border border-amber-300 rounded-lg p-2 text-rose-600"
              />
              <p className="text-[10px] font-bold text-amber-800 mt-1">
                Tự động ghi nhận nợ: <strong className="text-rose-600 font-mono">{formatVND(actualDebtAmount)}</strong>
              </p>
            </div>
          )}

          {/* Totals Summary */}
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tổng tiền hàng:</span>
              <span className="font-mono font-bold text-slate-800">{formatVND(subtotalAmount)}</span>
            </div>
            <div className="flex justify-between text-emerald-600 font-bold">
              <span>Khách thanh toán:</span>
              <span className="font-mono">{formatVND(actualPaidAmount)}</span>
            </div>
            {actualDebtAmount > 0 && (
              <div className="flex justify-between text-rose-600 font-black">
                <span>Còn nợ chuyển công nợ:</span>
                <span className="font-mono">{formatVND(actualDebtAmount)}</span>
              </div>
            )}
          </div>

          {/* Submit Checkout Button */}
          <button
            type="submit"
            disabled={cart.length === 0}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-200 transition cursor-pointer flex items-center justify-center gap-2"
          >
            <Receipt className="w-4 h-4" />
            <span>Thanh Toán & In Hóa Đơn ({formatVND(finalTotalAmount)})</span>
          </button>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE TRIGGER BAR & BOTTOM SHEET SLIDE-UP FOR CART */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed bottom-16 left-3 right-3 z-30">
        <button
          onClick={() => setShowMobileCartSheet(true)}
          className="w-full bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between min-h-[48px] cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-indigo-400" />
            <span className="text-xs font-bold">Giỏ hàng ({cart.reduce((sum, i) => sum + i.quantity, 0)})</span>
          </div>
          <span className="text-xs font-black font-mono text-emerald-400">{formatVND(finalTotalAmount)}</span>
        </button>
      </div>

    </div>
  );
};

export default PosView;
