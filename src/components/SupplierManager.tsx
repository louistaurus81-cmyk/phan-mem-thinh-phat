import React, { useState, useMemo, useRef } from 'react';
import { Supplier, Product, ProductIMEI, ImportOrder, ImportOrderItem, User, formatWarrantyText, generateRandomIMEI } from '../types';
import { 
  Building2, 
  Search, 
  Plus, 
  User as UserIcon, 
  Phone, 
  Mail, 
  MapPin, 
  Edit3, 
  Trash2, 
  X,
  Package,
  TrendingUp,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Printer,
  Barcode,
  QrCode,
  DollarSign,
  Layers,
  Sparkles,
  ArrowDownLeft,
  XCircle,
  Eye,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupplierManagerProps {
  suppliers: Supplier[];
  onUpdateSuppliers: (updated: Supplier[]) => void;
  products: Product[];
  onUpdateProduct?: (p: Product) => void;
  onUpdateProducts?: (products: Product[]) => void;
  imeis?: ProductIMEI[];
  onUpdateImeis?: (imeis: ProductIMEI[]) => void;
  importOrders?: ImportOrder[];
  onUpdateImportOrders?: (orders: ImportOrder[]) => void;
  currentUser?: User | null;
  onReloadData?: () => void;
}

export default function SupplierManager({ 
  suppliers, 
  onUpdateSuppliers, 
  products, 
  onUpdateProduct,
  onUpdateProducts,
  imeis = [], 
  onUpdateImeis,
  importOrders = [],
  onUpdateImportOrders,
  currentUser,
  onReloadData
}: SupplierManagerProps) {
  // Navigation sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'suppliers' | 'import_orders'>('suppliers');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active selected supplier for inspection
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Supplier Modals
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState<Supplier | null>(null);

  // Supplier Form State (includes taxCode & currentDebt)
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    taxCode: '',
    currentDebt: 0
  });

  // Purchase Order (Nhập Hàng) States
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [selectedOrderForView, setSelectedOrderForView] = useState<ImportOrder | null>(null);
  const [cancellingOrder, setCancellingOrder] = useState<ImportOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

  // Create Purchase Order Form State
  const [orderSupplierId, setOrderSupplierId] = useState('');
  const [orderPaymentMethod, setOrderPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản'>('Chuyển khoản');
  const [orderPaymentType, setOrderPaymentType] = useState<'full' | 'debt' | 'partial'>('full');
  const [orderPaidAmount, setOrderPaidAmount] = useState<number>(0);
  const [orderNote, setOrderNote] = useState('');
  const [orderItems, setOrderItems] = useState<Array<{
    productId: string;
    productName: string;
    sku: string;
    quantity: number;
    importPrice: number; // Giá nhập / giá vốn mới
    hasImei: boolean;
    imeis: string[];
    warrantyMonths: number;
  }>>([]);

  // Line item addition picker state
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>('');
  const [customProductName, setCustomProductName] = useState('');
  const [customProductSku, setCustomProductSku] = useState('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemImportPrice, setItemImportPrice] = useState<number>(0); // GIÁ NHẬP
  const [itemWarrantyMonths, setItemWarrantyMonths] = useState<number>(12);
  const [itemHasImei, setItemHasImei] = useState<boolean>(false);
  const [itemImeis, setItemImeis] = useState<string[]>([]);
  const [rawImeiInput, setRawImeiInput] = useState('');

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  // Filter supplier list
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(query) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query)) ||
      (s.taxCode && s.taxCode.toLowerCase().includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query))
    );
  }, [suppliers, searchQuery]);

  // Filter import orders list
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return importOrders;
    const query = searchQuery.toLowerCase();
    return importOrders.filter(o => 
      o.orderCode.toLowerCase().includes(query) ||
      o.supplierName.toLowerCase().includes(query) ||
      (o.note && o.note.toLowerCase().includes(query)) ||
      o.items.some(it => it.productName.toLowerCase().includes(query) || (it.sku && it.sku.toLowerCase().includes(query)))
    );
  }, [importOrders, searchQuery]);

  // Compute stats for active selected supplier
  const supplierStats = useMemo(() => {
    const stats: Record<string, { productCount: number; totalCostValue: number; totalDebt: number }> = {};
    
    suppliers.forEach(s => {
      stats[s.id] = { productCount: 0, totalCostValue: 0, totalDebt: s.currentDebt || 0 };
    });

    products.forEach(p => {
      if (p.supplierId && stats[p.supplierId]) {
        stats[p.supplierId].productCount += 1;
        stats[p.supplierId].totalCostValue += ((p.cost || 0) * (p.stock || 0));
      }
    });

    return stats;
  }, [suppliers, products]);

  // Overall system supplier metrics
  const totalSupplierDebt = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.currentDebt || 0), 0);
  }, [suppliers]);

  // Handle adding new supplier
  const handleAddSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      alert('Vui lòng nhập tên nhà cung cấp.');
      return;
    }

    const newSupplier: Supplier = {
      id: `supp_${Date.now()}`,
      name: supplierForm.name.trim(),
      contactPerson: supplierForm.contactPerson.trim() || undefined,
      phone: supplierForm.phone.trim() || undefined,
      email: supplierForm.email.trim() || undefined,
      address: supplierForm.address.trim() || undefined,
      taxCode: supplierForm.taxCode.trim() || undefined,
      currentDebt: Number(supplierForm.currentDebt) || 0,
      createdAt: new Date().toISOString()
    };

    onUpdateSuppliers([...suppliers, newSupplier]);
    setShowAddSupplierModal(false);
    setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', taxCode: '', currentDebt: 0 });
    alert(`Đã thêm nhà cung cấp "${newSupplier.name}" thành công!`);
  };

  // Handle editing supplier
  const handleEditSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) {
      alert('Vui lòng nhập tên nhà cung cấp.');
      return;
    }

    const updatedSupplier: Supplier = {
      ...editingSupplier,
      updatedAt: new Date().toISOString()
    };

    const updatedSuppliers = suppliers.map(s => s.id === updatedSupplier.id ? updatedSupplier : s);
    onUpdateSuppliers(updatedSuppliers);
    setShowEditSupplierModal(false);
    setEditingSupplier(null);
    alert('Đã cập nhật thông tin nhà cung cấp thành công!');
  };

  // Handle deleting supplier
  const confirmDeleteSupplier = (sup: Supplier) => {
    if ((sup.currentDebt || 0) > 0) {
      if (!confirm(`Nhà cung cấp "${sup.name}" hiện đang có công nợ ${formatVND(sup.currentDebt || 0)}. Bạn có chắc chắn muốn xóa không?`)) {
        return;
      }
    }
    const updated = suppliers.filter(s => s.id !== sup.id);
    onUpdateSuppliers(updated);
    if (selectedSupplierId === sup.id) setSelectedSupplierId(null);
    setDeletingSupplier(null);
  };

  // Filter products matching current inspection scope
  const linkedProducts = useMemo(() => {
    if (!selectedSupplierId) return [];
    return products.filter(p => p.supplierId === selectedSupplierId);
  }, [products, selectedSupplierId]);

  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  // -------------------------------------------------------------
  // PURCHASE ORDER (NHẬP HÀNG) HELPERS
  // -------------------------------------------------------------

  // Reset Purchase Order creation modal
  const handleOpenCreateOrderModal = (presetSupplierId?: string) => {
    setOrderSupplierId(presetSupplierId || (suppliers.length > 0 ? suppliers[0].id : ''));
    setOrderPaymentMethod('Chuyển khoản');
    setOrderPaymentType('full');
    setOrderPaidAmount(0);
    setOrderNote('');
    setOrderItems([]);
    setSelectedProductToAdd('');
    setCustomProductName('');
    setCustomProductSku('');
    setItemQuantity(1);
    setItemImportPrice(0);
    setItemWarrantyMonths(12);
    setItemHasImei(false);
    setItemImeis([]);
    setRawImeiInput('');
    setShowCreateOrderModal(true);
  };

  // When user picks a product from warehouse to add to PO
  const handleSelectProductForPO = (productId: string) => {
    setSelectedProductToAdd(productId);
    if (!productId) {
      setCustomProductName('');
      setCustomProductSku('');
      setItemImportPrice(0);
      setItemHasImei(false);
      setItemWarrantyMonths(12);
      return;
    }
    const p = products.find(prod => prod.id === productId);
    if (p) {
      setCustomProductName(p.name);
      setCustomProductSku(p.sku);
      // Pre-fill existing cost if set, else retail price * 0.8
      setItemImportPrice(p.cost && p.cost > 0 ? p.cost : Math.round(p.price * 0.8));
      setItemWarrantyMonths(p.warrantyMonths || 12);
      setItemHasImei(Boolean(p.hasImei));
      setItemImeis([]);
      setRawImeiInput('');
    }
  };

  // Add line item to PO
  const handleAddLineItemToPO = () => {
    const finalName = customProductName.trim();
    if (!finalName) {
      alert('Vui lòng chọn hoặc nhập tên sản phẩm cần nhập hàng.');
      return;
    }
    if (itemQuantity <= 0) {
      alert('Số lượng nhập phải lớn hơn 0.');
      return;
    }
    if (itemImportPrice < 0) {
      alert('Giá nhập không được âm.');
      return;
    }

    // If product tracks IMEI, require exactly itemQuantity IMEIs
    if (itemHasImei) {
      if (itemImeis.length !== itemQuantity) {
        alert(`Sản phẩm này quản lý theo Serial/IMEI. Bạn cần nhập đúng ${itemQuantity} mã IMEI (hiện có ${itemImeis.length} mã)!`);
        return;
      }
    }

    const prodId = selectedProductToAdd || `prod_${Date.now()}`;
    const newItem = {
      productId: prodId,
      productName: finalName,
      sku: customProductSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      quantity: Number(itemQuantity),
      importPrice: Number(itemImportPrice), // GIÁ NHẬP
      hasImei: itemHasImei,
      imeis: itemHasImei ? [...itemImeis] : [],
      warrantyMonths: Number(itemWarrantyMonths) || 12
    };

    setOrderItems([...orderItems, newItem]);

    // Reset line inputs
    setSelectedProductToAdd('');
    setCustomProductName('');
    setCustomProductSku('');
    setItemQuantity(1);
    setItemImportPrice(0);
    setItemWarrantyMonths(12);
    setItemHasImei(false);
    setItemImeis([]);
    setRawImeiInput('');
  };

  const handleRemoveLineItemFromPO = (idx: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== idx));
  };

  // Generate IMEIs quickly for tracked items
  const handleAutoGenerateImeis = () => {
    const needed = itemQuantity;
    const generated: string[] = [];
    for (let i = 0; i < needed; i++) {
      generated.push(generateRandomIMEI());
    }
    setItemImeis(generated);
    setRawImeiInput(generated.join('\n'));
  };

  // Handle manual / paste IMEI inputs
  const handleApplyRawImeis = (val: string) => {
    setRawImeiInput(val);
    const parsed = val
      .split(/[\n,;]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
    // Remove duplicates within the batch
    const unique = Array.from(new Set(parsed));
    setItemImeis(unique);
  };

  // Total order value
  const totalPOAmount = useMemo(() => {
    return orderItems.reduce((sum, it) => sum + (it.quantity * it.importPrice), 0);
  }, [orderItems]);

  // Actual debt generated based on payment type
  const computedDebtAmount = useMemo(() => {
    if (orderPaymentType === 'full') return 0;
    if (orderPaymentType === 'debt') return totalPOAmount;
    if (orderPaymentType === 'partial') {
      return Math.max(0, totalPOAmount - (Number(orderPaidAmount) || 0));
    }
    return 0;
  }, [totalPOAmount, orderPaymentType, orderPaidAmount]);

  const computedPaidAmount = useMemo(() => {
    if (orderPaymentType === 'full') return totalPOAmount;
    if (orderPaymentType === 'debt') return 0;
    if (orderPaymentType === 'partial') {
      return Math.min(totalPOAmount, Number(orderPaidAmount) || 0);
    }
    return totalPOAmount;
  }, [totalPOAmount, orderPaymentType, orderPaidAmount]);

  // SUBMIT PURCHASE ORDER TO BACKEND
  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderSupplierId) {
      alert('Vui lòng chọn Nhà Cung Cấp cho phiếu nhập.');
      return;
    }
    if (orderItems.length === 0) {
      alert('Vui lòng thêm ít nhất một sản phẩm vào phiếu nhập.');
      return;
    }

    const sup = suppliers.find(s => s.id === orderSupplierId);
    if (!sup) {
      alert('Nhà cung cấp không tồn tại.');
      return;
    }

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(100 + Math.random() * 900);
    const orderCode = `PN${dateStr}-${randNum}`;

    const newOrder: ImportOrder = {
      id: `po_${Date.now()}`,
      orderCode,
      supplierId: sup.id,
      supplierName: sup.name,
      items: orderItems.map(it => ({
        productId: it.productId,
        productName: it.productName,
        sku: it.sku,
        quantity: it.quantity,
        importPrice: it.importPrice, // GIÁ NHẬP / GIÁ VỐN
        subtotal: it.quantity * it.importPrice,
        hasImei: it.hasImei,
        imeis: it.imeis,
        warrantyMonths: it.warrantyMonths
      })),
      totalAmount: totalPOAmount,
      paidAmount: computedPaidAmount,
      debtAmount: computedDebtAmount,
      paymentMethod: orderPaymentMethod,
      paymentStatus: computedDebtAmount === 0 ? 'paid' : computedPaidAmount === 0 ? 'debt' : 'partial',
      status: 'completed',
      note: orderNote.trim() || undefined,
      createdBy: {
        userId: currentUser?.id || 'admin',
        userName: currentUser?.fullName || 'Quản trị viên'
      },
      createdAt: now.toISOString()
    };

    setIsSubmittingOrder(true);
    try {
      const res = await fetch('/api/import-orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('thinhphat_v2_auth_token') || ''}`
        },
        body: JSON.stringify({ order: newOrder })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Lỗi khi lưu phiếu nhập hàng');
      }

      alert(`✅ Tạo thành công Phiếu Nhập Hàng ${orderCode}!\n- Đã cập nhật tồn kho & Giá vốn mới (cost)\n- Đã nạp Serial/IMEI vào kho\n- Đã ghi nhận công nợ NCC: ${formatVND(computedDebtAmount)}`);
      setShowCreateOrderModal(false);

      // Reload central state or trigger update
      if (onReloadData) {
        onReloadData();
      } else {
        if (onUpdateImportOrders) onUpdateImportOrders([newOrder, ...importOrders]);
      }
    } catch (err: any) {
      console.error('Lỗi khi tạo phiếu nhập hàng:', err);
      alert(`Đã xảy ra lỗi: ${err.message}`);
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  // CANCEL PURCHASE ORDER (WITH VALIDATION)
  const handleConfirmCancelOrder = async () => {
    if (!cancellingOrder) return;
    try {
      const res = await fetch(`/api/import-orders/${cancellingOrder.id}/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('thinhphat_v2_auth_token') || ''}`
        },
        body: JSON.stringify({ reason: cancelReason.trim() || 'Hủy phiếu nhập hàng' })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Không thể hủy phiếu nhập');
      }

      alert(`✅ ${data.message}`);
      setCancellingOrder(null);
      setCancelReason('');
      if (selectedOrderForView?.id === cancellingOrder.id) {
        setSelectedOrderForView(null);
      }
      if (onReloadData) {
        onReloadData();
      }
    } catch (err: any) {
      alert(`⚠️ ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Tab Switcher */}
      <div className="bg-white p-4 rounded-xl border-2 border-slate-200 bento-shadow flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 font-bold">🏢</span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Quản Lý Nhập Hàng & Nhà Cung Cấp</h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Theo dõi đối tác, lập phiếu nhập hàng, quản lý <strong>Giá nhập (Giá vốn)</strong>, nạp mã IMEI và kiểm soát công nợ NCC.
              </p>
            </div>
          </div>
        </div>

        {/* Sub-tab Navigation Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveSubTab('suppliers')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'suppliers'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Nhà Cung Cấp ({suppliers.length})
            </button>

            <button
              onClick={() => setActiveSubTab('import_orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeSubTab === 'import_orders'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Phiếu Nhập Hàng ({importOrders.length})
            </button>
          </div>

          <button 
            id="btn-open-create-purchase-order"
            onClick={() => handleOpenCreateOrderModal()}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-200"
          >
            <ArrowDownLeft className="w-4 h-4" />
            Tạo Phiếu Nhập Hàng
          </button>

          {activeSubTab === 'suppliers' && (
            <button 
              id="btn-add-supplier-modal"
              onClick={() => {
                setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '', taxCode: '', currentDebt: 0 });
                setShowAddSupplierModal(true);
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              Thêm Nhà Cung Cấp
            </button>
          )}
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Tổng Nhà Cung Cấp</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{suppliers.length} đối tác</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Tổng Phiếu Nhập Hàng</p>
            <h3 className="text-xl font-black text-slate-800 mt-0.5">{importOrders.length} phiếu</h3>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 bento-shadow flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase text-slate-400">Tổng Nợ Nhà Cung Cấp</p>
            <h3 className={`text-xl font-black mt-0.5 ${totalSupplierDebt > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {formatVND(totalSupplierDebt)}
            </h3>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${totalSupplierDebt > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DANH SÁCH NHÀ CUNG CẤP & CÔNG NỢ */}
      {/* ========================================================================= */}
      {activeSubTab === 'suppliers' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Supplier List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 bento-shadow p-5 space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input 
                    type="text" 
                    placeholder="Tìm tên NCC, người liên hệ, SĐT, mã số thuế..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium"
                  />
                </div>
              </div>

              {/* Suppliers List */}
              <div className="space-y-3">
                {filteredSuppliers.map(sup => {
                  const stats = supplierStats[sup.id] || { productCount: 0, totalCostValue: 0, totalDebt: 0 };
                  const isSelected = selectedSupplierId === sup.id;

                  return (
                    <div 
                      key={sup.id}
                      onClick={() => setSelectedSupplierId(sup.id)}
                      className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-50/30 shadow-xs ring-2 ring-indigo-200' 
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="space-y-1 w-full max-w-md">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                          <span>{sup.name}</span>
                          {stats.productCount > 0 && (
                            <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono font-bold">
                              {stats.productCount} SP nhập
                            </span>
                          )}
                          {(sup.currentDebt || 0) > 0 ? (
                            <span className="text-[10px] bg-rose-50 text-rose-600 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                              Nợ: {formatVND(sup.currentDebt || 0)}
                            </span>
                          ) : (
                            <span className="text-[10px] bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-bold">
                              Hết nợ
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500 font-medium text-[11px] pt-1">
                          {sup.contactPerson && <div className="flex items-center gap-1 truncate"><UserIcon className="w-3 h-3 text-slate-400 shrink-0" /> {sup.contactPerson}</div>}
                          {sup.phone && <div className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3 text-slate-400 shrink-0" /> {sup.phone}</div>}
                          {sup.taxCode && <div className="flex items-center gap-1 font-mono text-slate-600 col-span-2"><Barcode className="w-3 h-3 text-slate-400 shrink-0" /> MST: {sup.taxCode}</div>}
                          {sup.address && <div className="flex items-center gap-1 col-span-2 truncate"><MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {sup.address}</div>}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <div className="text-right sm:block hidden mr-2">
                          <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Tổng nhập kho</div>
                          <div className="text-xs font-bold text-slate-800">{formatVND(stats.totalCostValue)}</div>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenCreateOrderModal(sup.id);
                          }}
                          className="p-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer border border-emerald-200"
                          title="Nhập hàng từ NCC này"
                        >
                          <ArrowDownLeft className="w-3 h-3" /> Nhập hàng
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingSupplier(sup);
                            setShowEditSupplierModal(true);
                          }}
                          className="p-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition text-[11px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                          title="Sửa thông tin"
                        >
                          <Edit3 className="w-3 h-3" /> Sửa
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingSupplier(sup);
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-lg transition cursor-pointer"
                          title="Xóa nhà phân phối"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {filteredSuppliers.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs italic">
                    Không tìm thấy nhà phân phối nào phù hợp. Nhấp "Thêm Nhà Cung Cấp" để lưu đối tác mới.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Supplier Detail & Linked Products with GIÁ NHẬP */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 bento-shadow p-5 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
                <Package className="w-4 h-4 text-amber-500" /> Hàng Hóa Phân Phối & Giá Nhập
              </h3>

              {activeSupplier ? (
                <div className="space-y-4">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-xs font-bold text-slate-900">{activeSupplier.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      LH: {activeSupplier.contactPerson || 'Không rõ'} | ĐT: {activeSupplier.phone || 'N/A'}
                    </div>
                    {activeSupplier.taxCode && (
                      <div className="text-[10px] text-slate-600 font-mono">
                        Mã số thuế: {activeSupplier.taxCode}
                      </div>
                    )}
                    <div className="text-[11px] font-bold pt-1 flex justify-between items-center">
                      <span className="text-slate-500">Công nợ hiện tại:</span>
                      <span className={`font-mono ${(activeSupplier.currentDebt || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formatVND(activeSupplier.currentDebt || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-[11px] font-bold text-slate-500 uppercase">
                        Sản phẩm đã gán nguồn ({linkedProducts.length})
                      </p>
                      <button
                        onClick={() => handleOpenCreateOrderModal(activeSupplier.id)}
                        className="text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Nhập thêm hàng
                      </button>
                    </div>
                    
                    <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100 space-y-2 pr-1">
                      {linkedProducts.map(p => (
                        <div key={p.id} className="pt-2 text-xs space-y-1">
                          <div className="font-bold text-slate-800 flex justify-between items-start gap-2">
                            <span className="truncate">{p.name}</span>
                            <span className="shrink-0 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-mono">
                              {formatWarrantyText(p.warrantyMonths || 0)}
                            </span>
                          </div>
                          
                          {/* Highlight GIÁ NHẬP / GIÁ VỐN */}
                          <div className="flex justify-between items-center text-[11px] bg-amber-50/60 p-1.5 rounded border border-amber-150">
                            <span className="text-amber-900 font-bold">
                              🏷️ Giá nhập: <strong className="text-rose-600 font-mono font-black">{p.cost ? formatVND(p.cost) : 'Chưa có'}</strong>
                            </span>
                            <span className="text-slate-600 font-bold">
                              Giá bán: <span className="text-emerald-700 font-mono">{formatVND(p.price)}</span>
                            </span>
                          </div>

                          <div className="flex justify-between text-slate-400 font-mono text-[10px] px-0.5">
                            <span>SKU: {p.sku}</span>
                            <span>Kho còn: <strong className="text-slate-700">{p.stock} pcs</strong></span>
                          </div>
                        </div>
                      ))}
                      {linkedProducts.length === 0 && (
                        <p className="text-center py-6 text-slate-400 italic text-[11px]">
                          Chưa có sản phẩm nào gán liên kết với nhà cung cấp "{activeSupplier.name}".
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 italic text-xs space-y-2">
                  <p>Nhấp vào một đối tác nhà cung cấp ở cột trái để tra cứu chi tiết những dòng sản phẩm, linh kiện và giá nhập kho.</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ PHIẾU NHẬP HÀNG (PURCHASE ORDERS) */}
      {/* ========================================================================= */}
      {activeSubTab === 'import_orders' && (
        <div className="bg-white rounded-2xl border border-slate-200 bento-shadow p-5 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                placeholder="Tìm mã phiếu nhập (e.g. PN2026...), tên NCC, tên linh kiện..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-500 font-medium"
              />
            </div>

            <button 
              onClick={() => handleOpenCreateOrderModal()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-emerald-200"
            >
              <Plus className="w-4 h-4" />
              Lập Phiếu Nhập Hàng Mới
            </button>
          </div>

          {/* Orders Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Mã Phiếu</th>
                  <th className="py-3 px-3">Ngày Nhập</th>
                  <th className="py-3 px-3">Nhà Cung Cấp</th>
                  <th className="py-3 px-3">Hàng Hóa & Giá Nhập</th>
                  <th className="py-3 px-3 text-right">Tổng Tiền Hàng</th>
                  <th className="py-3 px-3 text-center">Thanh Toán</th>
                  <th className="py-3 px-3 text-center">Trạng Thái</th>
                  <th className="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map(order => {
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <tr 
                      key={order.id} 
                      className={`hover:bg-slate-50/50 transition ${isCancelled ? 'opacity-60 bg-rose-50/20' : ''}`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {order.orderCode}
                      </td>

                      <td className="py-3 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString('vi-VN')} {new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800">
                        {order.supplierName}
                      </td>

                      <td className="py-3 px-3">
                        <div className="space-y-0.5 max-w-xs">
                          {order.items.slice(0, 2).map((it, idx) => (
                            <div key={idx} className="flex justify-between items-center text-[11px] gap-2">
                              <span className="font-semibold text-slate-700 truncate">{it.productName}</span>
                              <span className="font-mono text-slate-500 shrink-0">
                                {it.quantity} x <strong className="text-rose-600 font-bold">{formatVND(it.importPrice)}</strong>
                              </span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <span className="text-[10px] text-indigo-600 font-semibold italic">
                              + {order.items.length - 2} mặt hàng khác...
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right font-mono font-bold text-sm text-slate-900 whitespace-nowrap">
                        {formatVND(order.totalAmount)}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {order.debtAmount > 0 ? (
                          <div className="text-[10px] font-bold">
                            <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              Nợ: {formatVND(order.debtAmount)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            Đã thanh toán đủ
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {isCancelled ? (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md flex items-center justify-center gap-1">
                            <XCircle className="w-3 h-3" /> Đã Hủy
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Hoàn Tất
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedOrderForView(order)}
                            className="p-1 px-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition"
                            title="Xem chi tiết phiếu nhập"
                          >
                            <Eye className="w-3.5 h-3.5" /> Xem
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => {
                                setCancellingOrder(order);
                                setCancelReason('');
                              }}
                              className="p-1 px-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition border border-rose-200"
                              title="Hủy phiếu nhập hàng và hoàn nguyên tồn kho, IMEI, công nợ"
                            >
                              <XCircle className="w-3.5 h-3.5" /> Hủy
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Chưa có phiếu nhập hàng nào được lập. Bấm "Lập Phiếu Nhập Hàng Mới" để bắt đầu!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TẠO PHIẾU NHẬP HÀNG MỚI (PURCHASE ORDER CREATION) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showCreateOrderModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-4xl w-full p-5 sm:p-6 bento-shadow border border-slate-100 max-h-[92vh] overflow-y-auto space-y-5"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg flex items-center gap-2">
                    <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                    Lập Phiếu Nhập Hàng & Đồng Bộ Kho
                  </h3>
                  <p className="text-slate-500 text-xs">
                    Tự động cập nhật <strong>Giá vốn (cost)</strong>, tăng tồn kho và nạp mã Serial/IMEI vào kho.
                  </p>
                </div>
                <button 
                  onClick={() => setShowCreateOrderModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitPurchaseOrder} className="space-y-4">
                
                {/* 1. Chọn Nhà Cung Cấp */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    1. Nhà Cung Cấp (Nguồn nhập chính thức) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={orderSupplierId}
                    onChange={e => setOrderSupplierId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Chọn nhà cung cấp phân phối --</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.taxCode ? `(MST: ${s.taxCode})` : ''} - Hiện nợ: {formatVND(s.currentDebt || 0)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Thêm Danh Sách Mặt Hàng Nhập */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">
                      2. Danh Sách Sản Phẩm Nhập Kho ({orderItems.length}) <span className="text-rose-500">*</span>
                    </label>
                  </div>

                  {/* Input form for adding line item */}
                  <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2.5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Chọn từ kho hàng</label>
                        <select
                          value={selectedProductToAdd}
                          onChange={e => handleSelectProductForPO(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-1.5 font-medium"
                        >
                          <option value="">-- Hoặc nhập tên mới bên dưới --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Tên sản phẩm *</label>
                        <input 
                          type="text"
                          placeholder="Tên linh kiện, thiết bị..."
                          value={customProductName}
                          onChange={e => setCustomProductName(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-1.5 font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Mã SKU</label>
                        <input 
                          type="text"
                          placeholder="Mã SKU (tự sinh nếu để trống)"
                          value={customProductSku}
                          onChange={e => setCustomProductSku(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-1.5 font-mono"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Số lượng nhập *</label>
                        <input 
                          type="number"
                          min={1}
                          value={itemQuantity}
                          onChange={e => setItemQuantity(Math.max(1, Number(e.target.value)))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-1.5 font-mono font-bold"
                        />
                      </div>

                      {/* NỔI BẬT: MỤC GIÁ NHẬP / GIÁ VỐN */}
                      <div className="sm:col-span-2 bg-amber-50/70 p-1.5 rounded-lg border border-amber-200">
                        <label className="block text-[10px] font-extrabold text-amber-900 mb-0.5 flex items-center gap-1">
                          💰 GIÁ NHẬP (GIÁ VỐN MỚI - VNĐ) <span className="text-rose-500">*</span>
                        </label>
                        <input 
                          type="number"
                          min={0}
                          step={1000}
                          placeholder="Nhập giá vốn nhập vào..."
                          value={itemImportPrice || ''}
                          onChange={e => setItemImportPrice(Number(e.target.value))}
                          className="w-full text-xs bg-white border border-amber-300 rounded-md p-1.5 font-mono font-black text-rose-600 focus:outline-hidden focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">Thời hạn bảo hành</label>
                        <select
                          value={itemWarrantyMonths}
                          onChange={e => setItemWarrantyMonths(Number(e.target.value))}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-md p-1.5 font-semibold"
                        >
                          <option value={1}>1 Tháng</option>
                          <option value={3}>3 Tháng</option>
                          <option value={6}>6 Tháng</option>
                          <option value={12}>12 Tháng (Mặc định)</option>
                          <option value={24}>24 Tháng</option>
                          <option value={36}>36 Tháng</option>
                          <option value={48}>48 Tháng (4 Năm)</option>
                          <option value={60}>60 Tháng (5 Năm)</option>
                        </select>
                      </div>
                    </div>

                    {/* Quản lý IMEI checkbox & scanning panel */}
                    <div className="pt-1 border-t border-slate-100 space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                        <input 
                          type="checkbox"
                          checked={itemHasImei}
                          onChange={e => setItemHasImei(e.target.checked)}
                          className="rounded text-indigo-600 border-slate-300"
                        />
                        <span>Sản phẩm quản lý theo Serial/IMEI riêng lẻ (Bắt buộc nạp danh sách IMEI)</span>
                      </label>

                      {itemHasImei && (
                        <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-2">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-indigo-900">
                              Nhập/Quét IMEI ({itemImeis.length}/{itemQuantity}):
                            </span>
                            <button
                              type="button"
                              onClick={handleAutoGenerateImeis}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded cursor-pointer flex items-center gap-1"
                            >
                              <Sparkles className="w-3 h-3" /> Tự động sinh {itemQuantity} IMEI
                            </button>
                          </div>

                          <textarea 
                            rows={3}
                            placeholder="Quét mã vạch hoặc dán danh sách IMEI (mỗi IMEI trên một dòng hoặc cách nhau bởi dấu phẩy)..."
                            value={rawImeiInput}
                            onChange={e => handleApplyRawImeis(e.target.value)}
                            className="w-full text-xs font-mono bg-white border border-slate-200 rounded p-2 focus:outline-hidden focus:border-indigo-500"
                          />

                          {itemImeis.length > 0 && (
                            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                              {itemImeis.map((im, idx) => (
                                <span key={idx} className="text-[10px] font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded text-slate-700">
                                  #{idx + 1}: {im}
                                </span>
                              ))}
                            </div>
                          )}

                          {itemImeis.length !== itemQuantity && (
                            <p className="text-[10px] text-amber-700 font-bold">
                              ⚠️ Vui lòng nhập đủ {itemQuantity} mã IMEI trước khi bấm thêm vào phiếu (hiện có: {itemImeis.length}).
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={handleAddLineItemToPO}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm Vào Phiếu Nhập
                      </button>
                    </div>
                  </div>

                  {/* List of currently added items */}
                  {orderItems.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden divide-y divide-slate-100">
                      {orderItems.map((it, idx) => (
                        <div key={idx} className="p-2.5 flex justify-between items-center text-xs gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-800 truncate">{it.productName}</div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2 flex-wrap">
                              <span>SKU: {it.sku}</span>
                              <span>BH: {it.warrantyMonths}T</span>
                              {it.hasImei && (
                                <span className="text-indigo-600 bg-indigo-50 px-1 rounded font-bold">
                                  {it.imeis.length} IMEI
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-mono text-slate-600 font-bold">
                              {it.quantity} x <span className="text-rose-600">{formatVND(it.importPrice)}</span>
                            </div>
                            <div className="font-mono text-xs font-black text-slate-900">
                              = {formatVND(it.quantity * it.importPrice)}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveLineItemFromPO(idx)}
                            className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer transition shrink-0"
                            title="Xóa dòng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Thanh Toán & Ghi Nhận Công Nợ NCC */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-700">
                      3. Thanh Toán & Ghi Nhận Công Nợ NCC
                    </label>
                    <span className="font-mono text-sm font-black text-slate-900">
                      Tổng tiền hàng: {formatVND(totalPOAmount)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Hình thức thanh toán</label>
                      <select
                        value={orderPaymentType}
                        onChange={e => setOrderPaymentType(e.target.value as any)}
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-md p-2 cursor-pointer"
                      >
                        <option value="full">✅ Thanh toán đủ 100%</option>
                        <option value="debt">📝 Nợ toàn bộ (Ghi nợ 100%)</option>
                        <option value="partial">⚖️ Thanh toán một phần (Ghi nợ phần còn lại)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">Phương thức thanh toán</label>
                      <select
                        value={orderPaymentMethod}
                        onChange={e => setOrderPaymentMethod(e.target.value as any)}
                        className="w-full text-xs font-bold bg-white border border-slate-200 rounded-md p-2 cursor-pointer"
                      >
                        <option value="Chuyển khoản">Chuyển khoản ngân hàng</option>
                        <option value="Tiền mặt">Tiền mặt tại kho</option>
                      </select>
                    </div>

                    {orderPaymentType === 'partial' && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-1">Số tiền thanh toán trước (VNĐ)</label>
                        <input 
                          type="number"
                          min={0}
                          max={totalPOAmount}
                          value={orderPaidAmount || ''}
                          onChange={e => setOrderPaidAmount(Number(e.target.value))}
                          className="w-full text-xs font-mono font-bold bg-white border border-slate-200 rounded-md p-2"
                        />
                      </div>
                    )}
                  </div>

                  {/* Summary of Debt */}
                  <div className="flex justify-between items-center text-xs p-2 rounded-lg bg-white border border-slate-200">
                    <span className="font-semibold text-slate-600">Đã trả NCC: <strong className="text-emerald-600 font-mono">{formatVND(computedPaidAmount)}</strong></span>
                    <span className="font-semibold text-slate-600">
                      Ghi nhận nợ NCC: <strong className={`font-mono ${computedDebtAmount > 0 ? 'text-rose-600 font-black' : 'text-slate-700'}`}>{formatVND(computedDebtAmount)}</strong>
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 mb-1">Ghi chú phiếu nhập</label>
                    <input 
                      type="text"
                      placeholder="e.g. Nhập lô mainboard và SSD đợt 1, linh kiện nguyên seal..."
                      value={orderNote}
                      onChange={e => setOrderNote(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-200 rounded-md p-2 font-medium"
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowCreateOrderModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                  >
                    Hủy Bỏ
                  </button>
                  <button 
                    type="submit"
                    disabled={isSubmittingOrder}
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition cursor-pointer shadow-md shadow-emerald-200 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isSubmittingOrder ? 'Đang Xử Lý & Đồng Bộ...' : 'Xác Nhận Nhập Hàng & Đồng Bộ Kho'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: XEM CHI TIẾT PHIẾU NHẬP HÀNG */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {selectedOrderForView && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full p-6 bento-shadow border border-slate-100 max-h-[90vh] overflow-y-auto space-y-4"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-slate-900">{selectedOrderForView.orderCode}</span>
                    {selectedOrderForView.status === 'cancelled' ? (
                      <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                        Đã Hủy
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Hoàn Tất
                      </span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    NCC: <strong>{selectedOrderForView.supplierName}</strong> | Ngày lập: {new Date(selectedOrderForView.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <button 
                  onClick={() => setSelectedOrderForView(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-700 uppercase">Danh sách hàng hóa nhập:</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedOrderForView.items.map((it, idx) => (
                    <div key={idx} className="p-3 text-xs space-y-1">
                      <div className="flex justify-between items-start font-bold text-slate-900">
                        <span>{it.productName} ({it.sku})</span>
                        <span className="font-mono text-rose-600">{formatVND(it.subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-slate-500">
                        <span>Số lượng: <strong>{it.quantity}</strong> x Giá nhập: <strong className="text-slate-800 font-mono">{formatVND(it.importPrice)}</strong></span>
                        <span>BH: {formatWarrantyText(it.warrantyMonths || 12)}</span>
                      </div>

                      {/* Display IMEIs if tracked */}
                      {it.hasImei && it.imeis && it.imeis.length > 0 && (
                        <div className="pt-1.5">
                          <p className="text-[10px] font-bold text-indigo-600">Danh sách mã IMEI đã nạp kho ({it.imeis.length}):</p>
                          <div className="flex flex-wrap gap-1 mt-0.5 max-h-24 overflow-y-auto">
                            {it.imeis.map((im, imIdx) => (
                              <span key={imIdx} className="font-mono text-[9px] bg-slate-100 border border-slate-200 px-1 py-0.2 rounded text-slate-700">
                                {im}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment details */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Tổng tiền hàng:</span>
                  <span className="font-mono font-bold text-slate-900">{formatVND(selectedOrderForView.totalAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Đã thanh toán:</span>
                  <span className="font-mono font-bold text-emerald-600">{formatVND(selectedOrderForView.paidAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Công nợ ghi nhận:</span>
                  <span className={`font-mono font-bold ${selectedOrderForView.debtAmount > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    {formatVND(selectedOrderForView.debtAmount)}
                  </span>
                </div>
                <div className="flex justify-between pt-1 border-t border-slate-200 text-[11px]">
                  <span className="text-slate-500">Phương thức:</span>
                  <span className="font-semibold text-slate-700">{selectedOrderForView.paymentMethod}</span>
                </div>
                {selectedOrderForView.note && (
                  <div className="pt-1 border-t border-slate-200 text-[11px] text-slate-600">
                    Ghi chú: {selectedOrderForView.note}
                  </div>
                )}
                {selectedOrderForView.cancelReason && (
                  <div className="pt-1 border-t border-rose-200 text-[11px] text-rose-600 font-semibold">
                    Lý do hủy: {selectedOrderForView.cancelReason}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5" /> In Phiếu
                </button>

                <div className="flex gap-2">
                  {selectedOrderForView.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={() => {
                        setCancellingOrder(selectedOrderForView);
                        setCancelReason('');
                      }}
                      className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Hủy Phiếu Này
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedOrderForView(null)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: XÁC NHẬN HỦY PHIẾU NHẬP HÀNG (WITH IMEI VALIDATION) */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {cancellingOrder && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 bento-shadow border border-slate-100 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertTriangle className="w-6 h-6 shrink-0" />
                <h3 className="font-black text-slate-900 text-base">
                  Xác Nhận Hủy Phiếu Nhập {cancellingOrder.orderCode}?
                </h3>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p>
                  Khi hủy phiếu nhập hàng:
                </p>
                <ul className="list-disc list-inside space-y-1 text-slate-700 bg-rose-50/60 p-2.5 rounded-lg border border-rose-200">
                  <li>Tự động <strong>trừ lại số lượng tồn kho</strong> của các sản phẩm trong phiếu.</li>
                  <li>Tự động <strong>xóa các Serial/IMEI</strong> đã nạp (nếu chưa xuất bán).</li>
                  <li>Tự động <strong>trừ lại công nợ NCC</strong> tương ứng: {formatVND(cancellingOrder.debtAmount)}.</li>
                </ul>
                <p className="text-[11px] text-amber-800 font-bold">
                  🛡️ Hệ thống sẽ tự động chặn việc hủy nếu bất kỳ mã IMEI nào trong phiếu này đã được bán cho khách hàng.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Lý do hủy phiếu</label>
                <input 
                  type="text"
                  placeholder="e.g. NCC giao nhầm mẫu, trả lại hàng..."
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancellingOrder(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Không Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCancelOrder}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition cursor-pointer shadow-sm shadow-rose-200"
                >
                  Xác Nhận Hủy Phiếu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: THÊM NHÀ CUNG CẤP */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showAddSupplierModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 bento-shadow border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Thêm Nhà Cung Cấp Mới</h3>
                <button 
                  onClick={() => setShowAddSupplierModal(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddSupplierSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Nhà Cung Cấp *</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Công ty TNHH Phân Phối SPC"
                    value={supplierForm.name}
                    onChange={e => setSupplierForm({...supplierForm, name: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Số Thuế (MST)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0102030405"
                      value={supplierForm.taxCode}
                      onChange={e => setSupplierForm({...supplierForm, taxCode: e.target.value})}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Nợ Hiện Tại (VNĐ)</label>
                    <input 
                      type="number" 
                      min={0}
                      placeholder="0"
                      value={supplierForm.currentDebt || ''}
                      onChange={e => setSupplierForm({...supplierForm, currentDebt: Number(e.target.value)})}
                      className="w-full text-xs font-mono font-bold text-rose-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Người Liên Hệ</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Anh Tuấn - Sales SPC"
                      value={supplierForm.contactPerson}
                      onChange={e => setSupplierForm({...supplierForm, contactPerson: e.target.value})}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Điện Thoại</label>
                    <input 
                      type="text" 
                      placeholder="0988.xxx.xxx"
                      value={supplierForm.phone}
                      onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input 
                    type="email" 
                    placeholder="kinhdoanh@nhaphanphoi.com"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm({...supplierForm, email: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ / Văn Phòng Bảo Hành</label>
                  <input 
                    type="text" 
                    placeholder="Số 10 phố Thái Hà, Đống Đa, Hà Nội"
                    value={supplierForm.address}
                    onChange={e => setSupplierForm({...supplierForm, address: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowAddSupplierModal(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Lưu Nhà Cung Cấp
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: SỬA NHÀ CUNG CẤP */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {showEditSupplierModal && editingSupplier && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 bento-shadow border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-bold text-slate-900 text-base">Sửa Thông Tin Nhà Cung Cấp</h3>
                <button 
                  onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditSupplierSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Nhà Cung Cấp *</label>
                  <input 
                    type="text" 
                    required
                    value={editingSupplier.name}
                    onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã Số Thuế (MST)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 0102030405"
                      value={editingSupplier.taxCode || ''}
                      onChange={e => setEditingSupplier({...editingSupplier, taxCode: e.target.value})}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Công Nợ Hiện Tại (VNĐ)</label>
                    <input 
                      type="number" 
                      min={0}
                      value={editingSupplier.currentDebt ?? ''}
                      onChange={e => setEditingSupplier({...editingSupplier, currentDebt: Number(e.target.value)})}
                      className="w-full text-xs font-mono font-bold text-rose-600 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Người Liên Hệ</label>
                    <input 
                      type="text" 
                      value={editingSupplier.contactPerson || ''}
                      onChange={e => setEditingSupplier({...editingSupplier, contactPerson: e.target.value})}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Điện Thoại</label>
                    <input 
                      type="text" 
                      value={editingSupplier.phone || ''}
                      onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value})}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={editingSupplier.email || ''}
                    onChange={e => setEditingSupplier({...editingSupplier, email: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Địa Chỉ / Văn Phòng Bảo Hành</label>
                  <input 
                    type="text" 
                    value={editingSupplier.address || ''}
                    onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => { setShowEditSupplierModal(false); setEditingSupplier(null); }}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition cursor-pointer"
                  >
                    Cập Nhật
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================================= */}
      {/* MODAL: XÓA NHÀ CUNG CẤP */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {deletingSupplier && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 bento-shadow border border-slate-100 space-y-4"
            >
              <div className="flex items-center gap-2 text-rose-600">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="font-bold text-slate-900 text-sm">Xóa Nhà Phân Phối?</h3>
              </div>
              <p className="text-xs text-slate-500">
                Bạn có chắc chắn muốn xóa đối tác <strong>{deletingSupplier.name}</strong> không? Thông tin nguồn nhập của các sản phẩm liên đới sẽ trở về chưa gán.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  onClick={() => setDeletingSupplier(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => confirmDeleteSupplier(deletingSupplier)}
                  className="px-4 py-2 text-xs font-bold bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition cursor-pointer"
                >
                  Xác Nhận Xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
