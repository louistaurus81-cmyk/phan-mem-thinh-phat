import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Product, SalesInvoice, InvoiceItem, Customer, Category, User, PrintSettings, ProductIMEI } from '../types';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { 
  Plus, 
  Trash2, 
  ShoppingCart, 
  Search, 
  Receipt, 
  X, 
  ChevronRight, 
  PlusCircle, 
  Check, 
  FileText,
  AlertTriangle,
  Edit,
  MapPin,
  FolderOpen,
  QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SalesManagerProps {
  products: Product[];
  imeis: ProductIMEI[];
  customers: Customer[];
  invoices: SalesInvoice[];
  categories: Category[];
  users: User[];
  currentUser: User;
  printSettings?: PrintSettings;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onUpdateProductStock: (id: string, newStock: number) => void;
  onAddInvoice: (invoice: SalesInvoice) => void;
  onAddCustomer: (customer: Customer) => void;
  onAddCategory: (name: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateImeis: (imeis: ProductIMEI[]) => void;
}

export default function SalesManager({
  products,
  imeis,
  customers,
  invoices,
  categories,
  users,
  currentUser,
  printSettings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onUpdateProductStock,
  onAddInvoice,
  onAddCustomer,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateImeis
}: SalesManagerProps) {
  // Navigation inside SalesManager (either 'pos' or 'invoices' or 'products' or 'categories')
  const [subTab, setSubTab] = useState<'pos' | 'invoices' | 'products' | 'categories'>(
    () => (localStorage.getItem('thinhphat_v2_sales_subtab') as any) || 'pos'
  );
  
  useEffect(() => {
    localStorage.setItem('thinhphat_v2_sales_subtab', subTab);
  }, [subTab]);
  
  // Category filter state for catalog navigation
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  
  // Show only products below threshold
  const [showLowStockOnly, setShowLowStockOnly] = useState<boolean>(false);

  // Search parameters
  const [productSearch, setProductSearch] = useState('');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  
  // Cart state
  const [cart, setCart] = useState<InvoiceItem[]>([]);
  
  // Checkout customer state
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản' | 'Thẻ'>('Chuyển khoản');
  const [invoiceNote, setInvoiceNote] = useState('');
  const [processedBy, setProcessedBy] = useState<string>(currentUser?.fullName || '');
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  React.useEffect(() => {
    if (currentUser) {
      setProcessedBy(currentUser.fullName);
    }
  }, [currentUser]);
  
  // Modal for adding a new product directly
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    price: 0,
    cost: 0,
    stock: 10,
    warrantyMonths: 12,
    category: '',
    location: '',
    minStock: 5
  });

  // Modal for editing an existing product
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Category management dynamic list states
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  // Modal for looking at invoice details
  const [activeInvoiceDetails, setActiveInvoiceDetails] = useState<SalesInvoice | null>(null);
  
  // IMEI Management State
  const [managingImeisFor, setManagingImeisFor] = useState<Product | null>(null);
  const [selectingImeiFor, setSelectingImeiFor] = useState<Product | null>(null);

  // Global Barcode Scanner Listener
  useBarcodeScanner((barcode) => {
    if (showAddProductModal) {
      setNewProduct(prev => ({ ...prev, sku: barcode }));
    } else if (showEditProductModal && editingProduct) {
      setEditingProduct({ ...editingProduct, sku: barcode });
    } else {
      setProductSearch(barcode);
      // Auto-add to cart if exact IMEI match or SKU match is found in inventory
      const lowercode = barcode.trim().toLowerCase();
      const matchedImei = imeis.find(i => i.imei.toLowerCase() === lowercode && i.status === 'in_stock');
      
      if (matchedImei) {
        const prod = products.find(p => p.id === matchedImei.productId);
        if (prod) {
          addToCart(prod, matchedImei.imei);
          setProductSearch('');
          return;
        }
      }
      
      const exactMatch = products.find(p => p.sku.toLowerCase() === lowercode);
      if (exactMatch) {
         if (exactMatch.hasImei) {
            // Instead of just alert, perhaps open the selector
            setSelectingImeiFor(exactMatch);
            return;
         }
         addToCart(exactMatch);
         setProductSearch(''); // Clear search after auto-adding
      }
    }
  });

  // Filter products based on search, category selection, and low stock warning status
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const term = productSearch.toLowerCase();
      const matchesImeiInStock = p.hasImei && imeis.some(i => i.productId === p.id && i.status === 'in_stock' && i.imei.toLowerCase().includes(term));
      
      const matchesSearch = 
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term) ||
        (p.location && p.location.toLowerCase().includes(term)) ||
        matchesImeiInStock;
      
      const matchesCategory = selectedCategory === 'Tất cả' || p.category === selectedCategory;
      const matchesLowStock = !showLowStockOnly || (p.hasImei ? (imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length) : p.stock) <= (p.minStock ?? 5);

      return matchesSearch && matchesCategory && matchesLowStock;
    });
  }, [products, imeis, productSearch, selectedCategory, showLowStockOnly]);

  // Filter invoices based on search
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => 
      inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.customerPhone.includes(invoiceSearch)
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [invoices, invoiceSearch]);

  // Format money to VND
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Cart operations
  const addToCart = (product: Product, imeiToBind?: string) => {
    if (product.hasImei && !imeiToBind) {
      alert(`Sản phẩm này cần được chọn/quét theo IMEI cụ thể chứ không thêm vào số lượng chung.`);
      return;
    }

    const availableStock = product.hasImei 
      ? imeis.filter(i => i.productId === product.id && i.status === 'in_stock').length 
      : product.stock;

    if (availableStock <= 0) return;
    
    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === product.id);
      const currentQtyInCart = existing ? existing.quantity : 0;
      
      // Prevent adding the same IMEI twice
      if (imeiToBind && existing && existing.imeis?.includes(imeiToBind)) {
        alert('Mã IMEI/Serial này đã có trong giỏ hàng!');
        return prevCart;
      }
      
      // Stock boundary check
      if (currentQtyInCart >= availableStock) {
        alert(`Không thể thêm thêm! Chỉ còn ${availableStock} sản phẩm trong kho.`);
        return prevCart;
      }

      if (existing) {
        return prevCart.map(item => 
          item.productId === product.id 
            ? { 
                ...item, 
                quantity: item.quantity + 1,
                imeis: imeiToBind ? [...(item.imeis || []), imeiToBind] : item.imeis
              }
            : item
        );
      } else {
        return [...prevCart, {
          productId: product.id,
          productName: product.name,
          quantity: 1,
          price: product.price,
          warrantyMonths: product.warrantyMonths,
          imeis: imeiToBind ? [imeiToBind] : []
        }];
      }
    });
  };

  const updateCartQuantity = (productId: string, qty: number) => {
    const prod = products.find(p => p.id === productId);
    if (!prod) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (prod.hasImei) {
      setCart(prev => prev.map(item => {
        if (item.productId === productId) {
          if (qty > item.quantity) {
            alert('Sản phẩm này quản lý theo IMEI. Vui lòng quét hoặc nhập mã IMEI của bản thể sản phẩm để thêm!');
            return item;
          } else {
            const nextImeis = item.imeis ? item.imeis.slice(0, qty) : [];
            return {
              ...item,
              quantity: qty,
              imeis: nextImeis
            };
          }
        }
        return item;
      }));
      return;
    }

    if (qty > prod.stock) {
      alert(`Chỉ có sẵn ${prod.stock} sản phẩm trong kho.`);
      return;
    }

    setCart(prev => prev.map(item => 
      item.productId === productId ? { ...item, quantity: qty } : item
    ));
  };

  const updateCartPrice = (productId: string, price: number) => {
    setCart(prev => prev.map(item => 
      item.productId === productId ? { ...item, price } : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const discAmount = useMemo(() => {
    return Math.round((cartSubtotal * discountPercent) / 100);
  }, [cartSubtotal, discountPercent]);

  const cartGrandTotal = useMemo(() => {
    return Math.max(0, cartSubtotal - discAmount);
  }, [cartSubtotal, discAmount]);

  // Handling Checkout Process
  const handleCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert('Vui lòng thêm sản phẩm vào giỏ hàng.');
      return;
    }

    let customerInfo = {
      id: '',
      name: '',
      phone: ''
    };

    if (customerMode === 'select') {
      const existingCust = customers.find(c => c.id === selectedCustomerId);
      if (!existingCust) {
        alert('Vui lòng chọn khách hàng.');
        return;
      }
      customerInfo = {
        id: existingCust.id,
        name: existingCust.name,
        phone: existingCust.phone
      };
    } else {
      if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
        alert('Vui lòng điền đầy đủ tên và số điện thoại khách hàng.');
        return;
      }
      // Create and save new customer first
      const newCustId = `c_${Date.now()}`;
      const newCust: Customer = {
        id: newCustId,
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim(),
        createdAt: new Date().toISOString()
      };
      onAddCustomer(newCust);
      customerInfo = {
        id: newCustId,
        name: newCust.name,
        phone: newCust.phone
      };
    }

    // Double check inventory bounds
    for (const item of cart) {
      const prod = products.find(p => p.id === item.productId);
      if (!prod || prod.stock < item.quantity) {
        alert(`Sản phẩm ${item.productName} không đủ tồn kho để thực hiện giao dịch!`);
        return;
      }
    }

    // Formulate new SalesInvoice
    const newInvoiceNumber = `HD-${10001 + invoices.length}`;
    const invoicePayload: SalesInvoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber: newInvoiceNumber,
      customerId: customerInfo.id,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      items: [...cart],
      totalAmount: cartGrandTotal,
      paymentMethod,
      createdAt: new Date().toISOString(),
      note: (invoiceNote.trim() || '') + (discountPercent > 0 ? ` [Chiết khấu hoá đơn giảm ${discountPercent}%]` : ''),
      processedBy: processedBy || currentUser.fullName
    };

    // Commit invoice and deduct stock
    onAddInvoice(invoicePayload);
    
    // Update IMEIs
    let updatedImeis = [...imeis];
    let imeisChanged = false;

    cart.forEach(item => {
      const prod = products.find(p => p.id === item.productId);
      if (prod) {
        
        if (item.imeis && item.imeis.length > 0) {
          item.imeis.forEach(imeiToMark => {
            const index = updatedImeis.findIndex(i => i.imei === imeiToMark && i.status === 'in_stock');
            if (index > -1) {
              updatedImeis[index] = {
                ...updatedImeis[index],
                status: 'sold',
                invoiceId: invoicePayload.id
              };
              imeisChanged = true;
            }
          });
        }
      }
    });

    if (imeisChanged) {
      onUpdateImeis(updatedImeis);
    }

    // Clear cart and reset states
    setCart([]);
    setSelectedCustomerId('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setInvoiceNote('');
    setDiscountPercent(0);
    setCustomerMode('select');
    
    // Show success notice
    alert(`Tạo thành công hóa đơn ${newInvoiceNumber}! Sổ bảo hành cũng đã được tự động kích hoạt.`);
    setSubTab('invoices');
  };

  // Create new product submission
  const handleCreateProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.sku) {
      alert('Vui lòng nhập tên và mã SKU sản phẩm');
      return;
    }
    
    const selectedCat = newProduct.category || (categories[0]?.name || 'Điện thoại');

    onAddProduct({
      name: newProduct.name,
      sku: newProduct.sku,
      category: selectedCat,
      price: Number(newProduct.price),
      cost: Number(newProduct.cost),
      stock: Number(newProduct.stock),
      warrantyMonths: Number(newProduct.warrantyMonths),
      location: newProduct.location || undefined,
      minStock: Number(newProduct.minStock) || 5
    });

    setNewProduct({
      name: '',
      sku: '',
      price: 0,
      cost: 0,
      stock: 10,
      warrantyMonths: 12,
      category: '',
      location: '',
      minStock: 5
    });
    setShowAddProductModal(false);
  };

  // Edit product submission
  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name || !editingProduct.sku) {
      alert('Vui lòng nhập tên và mã SKU sản phẩm');
      return;
    }
    onUpdateProduct(editingProduct);
    setEditingProduct(null);
    setShowEditProductModal(false);
    alert('Cập nhật linh kiện/sản phẩm thành công!');
  };

  return (
    <div className="space-y-6">
      
      {/* Tab bar header specific to Sales Module */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border-2 border-slate-200 bento-shadow">
        <div className="flex flex-wrap gap-2">
          <button 
            id="tab-btn-pos"
            onClick={() => setSubTab('pos')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              subTab === 'pos' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Quầy Thu Ngân (POS)
          </button>
          <button 
            id="tab-btn-invoices"
            onClick={() => setSubTab('invoices')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              subTab === 'invoices' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Hóa Đơn Đã Bán
          </button>
          <button 
            id="tab-btn-products"
            onClick={() => setSubTab('products')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              subTab === 'products' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Kho & Kho Hàng
          </button>
          <button 
            id="tab-btn-categories"
            onClick={() => setSubTab('categories')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition cursor-pointer ${
              subTab === 'categories' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Danh Mục Linh Kiện
          </button>
        </div>
        
        {subTab === 'products' && (
          <button 
            id="btn-add-product-modal"
            onClick={() => {
              setNewProduct({
                name: '',
                sku: '',
                price: 0,
                cost: 0,
                stock: 10,
                warrantyMonths: 12,
                category: categories[0]?.name || '',
                location: '',
                minStock: 5
              });
              setShowAddProductModal(true);
            }}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3 py-2 rounded-lg transition cursor-pointer font-bold leading-none shrink-0"
          >
            <Plus className="w-4 h-4" /> Thêm linh kiện mới
          </button>
        )}
      </div>

      {subTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main POS Interface (Left & Center: Products Catalog) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input 
                id="search-pos-products"
                type="text"
                placeholder="Tìm kiếm sản phẩm theo tên, SKU, danh mục hoặc quét mã IMEI/Serial..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    const valueTrimmed = productSearch.trim();
                    if (!valueTrimmed) return;
                    
                    const lower = valueTrimmed.toLowerCase();
                    // Try to find if it matches an IMEI
                    const matchedImei = imeis.find(i => i.imei.toLowerCase() === lower && i.status === 'in_stock');
                    if (matchedImei) {
                      const prod = products.find(p => p.id === matchedImei.productId);
                      if (prod) {
                        addToCart(prod, matchedImei.imei);
                        setProductSearch('');
                        return;
                      }
                    }
                    
                    // Try to find if it matches a SKU
                    const exactMatch = products.find(p => p.sku.toLowerCase() === lower);
                    if (exactMatch) {
                      if (exactMatch.hasImei) {
                        alert('Sản phẩm này quản lý bằng IMEI. Vui lòng nhập/quét chính xác mã IMEI/Serial của bản thể sản phẩm!');
                        return;
                      }
                      addToCart(exactMatch);
                      setProductSearch('');
                    }
                  }
                }}
                className="w-full text-sm bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-hidden focus:border-indigo-500 transition-colors shadow-2xs"
              />
            </div>

            {/* Dynamic Category Navigation Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
              <button
                type="button"
                onClick={() => setSelectedCategory('Tất cả')}
                className={`px-3 py-1.5 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === 'Tất cả' 
                    ? 'bg-slate-900 text-white border border-slate-950 shadow-xs' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Tất cả ({products.length})
              </button>
              {categories.map(cat => {
                const count = products.filter(p => p.category === cat.name).length;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-xl whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat.name 
                        ? 'bg-slate-900 text-white border border-slate-950 shadow-xs' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredProducts.map(prod => {
                const inStockAmt = prod.hasImei ? imeis.filter(i => i.productId === prod.id && i.status === 'in_stock').length : prod.stock;
                const isLowStock = inStockAmt <= (prod.minStock ?? 5);

                return (
                <div 
                  key={prod.id} 
                  className={`bg-white p-5 rounded-[2rem] border-2 border-slate-200 flex flex-col justify-between hover:border-blue-500 hover:shadow-md transition duration-200 ${
                    inStockAmt === 0 ? 'opacity-65 bg-slate-50/50' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-sm">
                        {prod.category}
                      </span>
                      <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-sm">
                        {prod.sku}
                      </span>
                    </div>
                    <h4 className="font-semibold text-slate-800 text-sm mt-2 line-clamp-1">{prod.name}</h4>
                    <p className="text-xs text-slate-500 mt-1">Bảo hành: <span className="font-semibold text-indigo-600">{prod.warrantyMonths} tháng</span></p>
                    {prod.location && (
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>Vị trí: <span className="font-bold text-slate-600">{prod.location}</span></span>
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      Tồn kho: <span className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-700'}`}>{inStockAmt} chiếc</span>
                      {isLowStock && (
                        <span className="text-[9px] text-rose-600 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded-sm font-bold ml-1.5 inline-block">
                          Dưới mức tối thiểu! ({prod.minStock ?? 5})
                        </span>
                      )}
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                    <span className="font-bold text-indigo-600 text-sm">{formatVND(prod.price)}</span>
                    
                    {inStockAmt > 0 ? (
                      <button 
                        id={`btn-add-to-cart-${prod.id}`}
                        onClick={() => {
                          if (prod.hasImei) {
                            setSelectingImeiFor(prod);
                          } else {
                            addToCart(prod);
                          }
                        }}
                        className="flex items-center gap-1 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        {prod.hasImei ? <QrCode className="w-3.5 h-3.5" /> : <ShoppingCart className="w-3.5 h-3.5" />} 
                        {prod.hasImei ? 'Quét IMEI' : 'Thêm'}
                      </button>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs font-medium text-rose-500">
                        <AlertTriangle className="w-3.5 h-3.5" /> Cháy hàng
                      </span>
                    )}
                  </div>
                </div>
              )})}
              {filteredProducts.length === 0 && (
                <div className="sm:col-span-2 bg-slate-50 p-6 rounded-xl text-center text-slate-500">
                  Không tìm thấy sản phẩm nào khớp với từ khoá.
                </div>
              )}
            </div>
          </div>

          {/* Cart Sidebar (Right: Receipt details and checkout) */}
          <div className="bg-white p-6 rounded-[2rem] border-2 border-slate-200 bento-shadow h-fit space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-indigo-600" />
                Giỏ Hàng <span className="bg-indigo-50 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">{cart.length}</span>
              </h3>
              {cart.length > 0 && (
                <button 
                  onClick={() => setCart([])}
                  className="text-slate-400 hover:text-rose-500 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Xoá sạch
                </button>
              )}
            </div>

            {/* Cart Items list */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <ShoppingCart className="w-12 h-12 stroke-1 mx-auto text-slate-300" />
                <p className="text-sm">Chưa có sản phẩm nào được chọn.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto pr-1">
                {cart.map(item => {
                  const matchingProd = products.find(p => p.id === item.productId);
                  const maxStock = matchingProd ? matchingProd.stock : 99;

                  return (
                    <div key={item.productId} className="py-3 flex flex-col justify-between gap-1.5 border-b border-slate-100 last:border-b-0 pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <span className="text-xs font-semibold text-slate-800 line-clamp-1">{item.productName}</span>
                          {item.imeis && item.imeis.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {item.imeis.map(im => (
                                <span key={im} className="inline-flex items-center gap-1 text-[9px] bg-indigo-50 text-indigo-700 font-mono font-bold px-1.5 py-0.5 rounded-md border border-indigo-100">
                                  {im}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextImeis = item.imeis?.filter(xi => xi !== im) || [];
                                      if (nextImeis.length === 0) {
                                        removeFromCart(item.productId);
                                      } else {
                                        setCart(prev => prev.map(c => 
                                          c.productId === item.productId 
                                            ? { ...c, quantity: nextImeis.length, imeis: nextImeis } 
                                            : c
                                        ));
                                      }
                                    }}
                                    className="text-indigo-400 hover:text-indigo-900 font-bold ml-1 cursor-pointer"
                                    title="Xóa IMEI này khỏi giỏ hàng"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button 
                          onClick={() => removeFromCart(item.productId)}
                          className="text-slate-300 hover:text-rose-500 p-0.5 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-100 px-1.5 py-0.5 rounded-md">
                          <button 
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 w-4 h-4 flex items-center justify-center cursor-pointer"
                            onClick={() => updateCartQuantity(item.productId, item.quantity - 1)}
                          >-</button>
                          <span className="text-xs font-semibold text-slate-700 w-6 text-center">{item.quantity}</span>
                          <button 
                            className="text-xs font-bold text-slate-500 hover:text-slate-800 w-4 h-4 flex items-center justify-center cursor-pointer"
                            onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                          >+</button>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-bold text-slate-400">Đơn giá:</span>
                          <input 
                            type="number"
                            value={item.price}
                            onChange={e => updateCartPrice(item.productId, Number(e.target.value) || 0)}
                            className="w-20 text-[10px] font-bold text-slate-800 bg-slate-100 border border-slate-200 rounded px-1.5 focus:outline-hidden"
                          />
                          <span className="text-[10px] text-slate-400">x {item.quantity}</span>
                        </div>
                        <span className="text-xs font-bold text-slate-900">{formatVND(item.price * item.quantity)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Price Calculations */}
            {cart.length > 0 && (
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex justify-between font-bold text-slate-700 text-xs">
                  <span>Cộng tiền sản phẩm:</span>
                  <span>{formatVND(cartSubtotal)}</span>
                </div>

                <div className="flex justify-between items-center text-rose-600 font-bold text-xs">
                  <span>Chiết khấu tổng bill (%):</span>
                  <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-0.5 border border-slate-200 w-16">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full text-right bg-transparent border-0 font-bold text-xs pr-1 focus:outline-hidden text-slate-800"
                    />
                    <span className="text-[10px] text-slate-400 pr-1">%</span>
                  </div>
                </div>

                {discAmount > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-rose-500">
                    <span>Số tiền bớt giảm bh:</span>
                    <span>-{formatVND(discAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between font-black text-slate-950 text-sm pt-2.5 border-t border-slate-100">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="text-indigo-600 text-base">{formatVND(cartGrandTotal)}</span>
                </div>

                {/* Customer Checkout options */}
                <form onSubmit={handleCheckout} className="space-y-4 pt-2">
                  <div className="flex gap-2 border-b border-slate-100 pb-3">
                    <button 
                      type="button" 
                      onClick={() => setCustomerMode('select')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${customerMode === 'select' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Chọn Khách Cũ
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCustomerMode('new')}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${customerMode === 'new' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                      Thống Tin Khách Mới
                    </button>
                  </div>

                  {customerMode === 'select' ? (
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Khách Hàng</label>
                      <select 
                        value={selectedCustomerId}
                        onChange={e => setSelectedCustomerId(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-indigo-500"
                        required
                      >
                        <option value="">-- Chọn khách hàng đã có --</option>
                        {customers.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-0.5">Tên Khách Hàng</label>
                        <input 
                          type="text" 
                          placeholder="Nguyễn Văn A"
                          value={newCustomerName}
                          onChange={e => setNewCustomerName(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-0.5">Số Điện Thoại</label>
                        <input 
                          type="text" 
                          placeholder="09xxxxxxxx"
                          value={newCustomerPhone}
                          onChange={e => setNewCustomerPhone(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Payment Method selection */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Phương thức thanh toán</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['Tiền mặt', 'Chuyển khoản', 'Thẻ'] as const).map(method => (
                        <button 
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-1.5 text-center text-xs font-medium rounded-lg border transition cursor-pointer ${
                            paymentMethod === method 
                              ? 'bg-slate-900 border-slate-900 text-white shadow-2xs' 
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {method}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú đơn hàng</label>
                    <textarea 
                      placeholder="e.g. Khách lấy quà khuyến mãi, hẹn sang tuần lấy hoá đơn đỏ..."
                      value={invoiceNote}
                      onChange={e => setInvoiceNote(e.target.value)}
                      rows={2}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Nhân viên thực hiện *</label>
                    <select
                      id="pos-select-processed-by"
                      value={processedBy}
                      onChange={e => setProcessedBy(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:outline-hidden focus:border-indigo-500 font-medium cursor-pointer"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.fullName}>
                          {u.fullName} ({u.role === 'admin' ? 'Chủ' : u.role === 'sales' ? 'Bán hàng' : 'Kỹ thuật'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <button 
                    id="btn-pos-checkout"
                    type="submit"
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition cursor-pointer shadow-sm"
                  >
                    Xác nhận thanh toán & Tạo hoá đơn
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {subTab === 'invoices' && (
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input 
              id="search-invoices"
              type="text"
              placeholder="Tìm lịch sử hoá đơn theo Mã, Tên Khách hay SĐT..."
              value={invoiceSearch}
              onChange={e => setInvoiceSearch(e.target.value)}
              className="w-full text-sm bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-hidden focus:border-indigo-500 transition-colors shadow-2xs"
            />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium text-xs">
                  <th className="pb-3 pt-1">Số Hoá Đơn</th>
                  <th className="pb-3 pt-1">Khách Hàng</th>
                  <th className="pb-3 pt-1">Sản Phẩm</th>
                  <th className="pb-3 pt-1">Thời Gian</th>
                  <th className="pb-3 pt-1">Phương Thức</th>
                  <th className="pb-3 pt-1">Doanh Thu</th>
                  <th className="pb-3 pt-1 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-indigo-700">
                      <div>{inv.invoiceNumber}</div>
                      {inv.processedBy && (
                        <div className="text-[10px] text-slate-500 font-sans font-medium mt-1 bg-slate-100 rounded-md px-2 py-0.5 w-fit">
                          👤 {inv.processedBy}
                        </div>
                      )}
                    </td>
                    <td className="py-3">
                      <p className="font-semibold text-slate-800">{inv.customerName}</p>
                      <p className="text-xs text-slate-500">{inv.customerPhone}</p>
                    </td>
                    <td className="py-3">
                      <p className="font-medium text-slate-800 max-w-64 truncate">
                        {inv.items.map(item => `${item.productName} (x${item.quantity})`).join(', ')}
                      </p>
                    </td>
                    <td className="py-3 text-xs text-slate-500">
                      {new Date(inv.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="py-3">
                      <span className="text-xs bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-md">
                        {inv.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 font-bold text-slate-900">{formatVND(inv.totalAmount)}</td>
                    <td className="py-3 text-right">
                      <button 
                        id={`btn-open-invoice-${inv.id}`}
                        onClick={() => setActiveInvoiceDetails(inv)}
                        className="text-xs font-semibold text-slate-500 hover:text-indigo-600 p-1 cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4 ml-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      Không tìm thấy hoá đơn nào.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'products' && (
        <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6">
            {/* Search Box */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input 
                id="search-inventory-products"
                type="text"
                placeholder="Tìm sản phẩm theo SKU, Tên, Danh mục, Vị trí..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
              />
            </div>

            {/* Category selection selector */}
            <div className="w-full md:w-auto">
              <select
                id="filter-inventory-category"
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 focus:outline-hidden font-semibold text-slate-700 focus:bg-white cursor-pointer"
              >
                <option value="Tất cả">Tất cả danh mục ({products.length})</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Dynamic minimal stock warning control box */}
            <button
              id="toggle-low-stock-alert"
              type="button"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold select-none transition cursor-pointer border w-full md:w-auto justify-center ${
                showLowStockOnly 
                  ? 'bg-rose-500 text-white border-rose-600 shadow-xs' 
                  : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Cảnh báo tồn tối thiểu ({products.filter(p => p.stock <= (p.minStock ?? 5)).length})</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 font-medium text-xs">
                  <th className="pb-3">Mã SKU</th>
                  <th className="pb-3">Tên Linh Kiện / Sản Phẩm</th>
                  <th className="pb-3">Danh Mục</th>
                  <th className="pb-3">Vị Trí Kho</th>
                  <th className="pb-3">Giá Nhập</th>
                  <th className="pb-3">Giá Xuất</th>
                  <th className="pb-3">Bảo Hành</th>
                  <th className="pb-3">Mức Tối Thiểu</th>
                  <th className="pb-3">Tồn Kho</th>
                  <th className="pb-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(prod => {
                  const inStockAmt = prod.hasImei ? imeis.filter(i => i.productId === prod.id && i.status === 'in_stock').length : prod.stock;
                  const isLowStock = inStockAmt <= (prod.minStock ?? 5);
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-mono font-semibold text-slate-500">{prod.sku}</td>
                      <td className="py-3.5">
                        <div className="font-semibold text-slate-800">{prod.name}</div>
                        {prod.hasImei && (
                          <div className="text-[10px] text-indigo-600 bg-indigo-50 inline-block px-1.5 py-0.5 rounded-sm mt-1 font-semibold uppercase border border-indigo-100">
                            Quản lý IMEI
                          </div>
                        )}
                      </td>
                      <td className="py-3.5">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium">
                          {prod.category}
                        </span>
                      </td>
                      <td className="py-3.5">
                        {prod.location ? (
                          <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            {prod.location}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Chưa xếp kệ</span>
                        )}
                      </td>
                      <td className="py-3.5 font-semibold text-rose-500">{formatVND(prod.cost)}</td>
                      <td className="py-3.5 font-bold text-emerald-600">{formatVND(prod.price)}</td>
                      <td className="py-3.5 text-xs text-slate-500">{prod.warrantyMonths} tháng</td>
                      <td className="py-3.5 text-xs font-semibold text-slate-600">{prod.minStock ?? 5} chiếc</td>
                      <td className="py-3.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          isLowStock 
                            ? 'text-rose-600 bg-rose-50 border border-rose-100 animate-pulse' 
                            : 'text-slate-700 bg-slate-100'
                        }`}>
                          {inStockAmt} chiếc {isLowStock && '⚠️'}
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Stock adjusting tool */}
                          {prod.hasImei ? (
                             <button
                               onClick={() => setManagingImeisFor(prod)}
                               className="text-[11px] font-bold bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-md border border-indigo-100 hover:bg-indigo-100 transition whitespace-nowrap cursor-pointer"
                             >
                               IMEI ({inStockAmt})
                             </button>
                          ) : (
                            <div className="inline-flex gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                              <button 
                                id={`btn-dev-ded-stock-${prod.id}`}
                              onClick={() => {
                                const nextStock = Math.max(0, prod.stock - 1);
                                onUpdateProductStock(prod.id, nextStock);
                                if (nextStock <= (prod.minStock ?? 5)) {
                                  // alert warning
                                }
                              }}
                              title="Giảm 1"
                              className="px-1.5 py-0.5 bg-white border border-slate-200 font-bold hover:shadow-2xs rounded-md text-[10px] cursor-pointer"
                            >-</button>
                            <button 
                              id={`btn-dev-inc-stock-${prod.id}`}
                              onClick={() => onUpdateProductStock(prod.id, prod.stock + 1)}
                              title="Tăng 1"
                              className="px-1.5 py-0.5 bg-white border border-slate-200 font-bold hover:shadow-2xs rounded-md text-[10px] cursor-pointer"
                            >+</button>
                          </div>
                          )}

                          {/* Edit logic */}
                          <button
                            id={`btn-edit-product-${prod.id}`}
                            onClick={() => {
                              setEditingProduct({...prod});
                              setShowEditProductModal(true);
                            }}
                            title="Sửa thông tin"
                            className="p-1 px-1.5 bg-slate-50 border border-slate-200 text-indigo-600 hover:bg-slate-100 hover:border-indigo-200 rounded-lg transition cursor-pointer text-xs flex items-center gap-1"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete logic */}
                          <button
                            id={`btn-delete-product-${prod.id}`}
                            onClick={() => {
                              if (confirm(`Bạn chắc chắn muốn xoá vĩnh viễn sản phẩm/linh kiện "${prod.name}" này chứ?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            title="Xoá vĩnh viễn"
                            className="p-1 px-1.5 bg-rose-50 border border-rose-100 text-rose-600 hover:bg-rose-100 rounded-lg transition cursor-pointer text-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400 font-medium">
                      Không tìm thấy linh kiện, sản phẩm nào phù hợp bộ lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {subTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left section: Create form */}
          <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 h-fit space-y-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-indigo-600" />
              Thêm Danh Mục Mới
            </h3>
            <p className="text-xs text-slate-500">
              Phân loại linh kiện sửa chữa và hàng hóa như mainboard, ram, ổ cứng, nguồn... giúp thợ kỹ thuật tìm kiếm siêu nhanh khi sửa và thanh toán.
            </p>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) {
                  alert('Vui lòng nhập tên danh mục');
                  return;
                }
                const nameTrimmed = newCategoryName.trim();
                if (categories.some(c => c.name.toLowerCase() === nameTrimmed.toLowerCase())) {
                  alert('Danh mục này đã tồn tại!');
                  return;
                }
                onAddCategory(nameTrimmed);
                setNewCategoryName('');
                alert('Đã thêm danh mục mới thành công!');
              }}
              className="space-y-3 pt-2"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Danh Mục *</label>
                <input 
                  id="input-new-category-name"
                  type="text"
                  placeholder="e.g. Card màn hình, Chip CPU"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl p-2.5 focus:outline-hidden focus:border-indigo-500"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-slate-900 text-white font-semibold py-2.5 px-4 rounded-xl text-xs transition duration-200 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-4 h-4" />
                Thêm Vào Danh Sách
              </button>
            </form>
          </div>

          {/* Right section: List of categories with edit/delete controls */}
          <div className="md:col-span-2 bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6">
            <h3 className="font-bold text-slate-800 text-base mb-4 flex items-center gap-2">
               📂 Danh Sách Danh Mục Hiện Tại
            </h3>

            <div className="divide-y divide-slate-100">
              {categories.map((cat) => {
                const productCount = products.filter(p => p.category === cat.name).length;
                const isEditing = editingCategoryId === cat.id;

                return (
                  <div key={cat.id} className="py-4 flex items-center justify-between gap-4">
                    {isEditing ? (
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          if (!editingCategoryName.trim()) {
                            alert('Tên danh mục không thể để trống');
                            return;
                          }
                          const updatedTrimmed = editingCategoryName.trim();
                          if (categories.some(c => c.id !== cat.id && c.name.toLowerCase() === updatedTrimmed.toLowerCase())) {
                            alert('Danh mục với tên này đã tồn tại!');
                            return;
                          }
                          onUpdateCategory(cat.id, updatedTrimmed);
                          setEditingCategoryId(null);
                          setEditingCategoryName('');
                          alert('Cập nhật danh mục thành công!');
                        }}
                        className="flex-1 flex gap-2 items-center"
                      >
                        <input 
                          id={`input-edit-category-${cat.id}`}
                          type="text"
                          required
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          className="flex-1 text-sm bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 focus:outline-hidden focus:border-indigo-500 font-medium"
                        />
                        <button 
                          type="submit"
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          Lưu
                        </button>
                        <button 
                          type="button"
                          onClick={() => {
                            setEditingCategoryId(null);
                            setEditingCategoryName('');
                          }}
                          className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition cursor-pointer"
                        >
                          Hủy
                        </button>
                      </form>
                    ) : (
                      <>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 text-sm">{cat.name}</p>
                          <p className="text-xs text-slate-500">Có <span className="font-bold text-indigo-600">{productCount}</span> linh kiện/sản phẩm thuộc danh mục này</p>
                        </div>

                        <div className="flex gap-2 items-center">
                          <button 
                            id={`btn-edit-cat-${cat.id}`}
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                            }}
                            className="p-1.5 text-indigo-600 hover:bg-slate-50 border border-slate-100 hover:border-indigo-200 rounded-lg transition cursor-pointer"
                            title="Sửa tên danh mục"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          
                          <button 
                            id={`btn-delete-cat-${cat.id}`}
                            onClick={() => {
                              if (productCount > 0) {
                                alert(`Không thể xoá danh mục này vì đang có ${productCount} sản phẩm liên kết tới nó! Hãy đổi danh mục cho các sản phẩm đó trước.`);
                                return;
                              }
                              if (confirm(`Bạn chắc chắn muốn xoá danh mục "${cat.name}"?`)) {
                                onDeleteCategory(cat.id);
                              }
                            }}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 border border-slate-100 hover:border-rose-200 rounded-lg transition cursor-pointer"
                            title="Xóa danh mục"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {categories.length === 0 && (
                <div className="py-8 text-center text-slate-400 font-medium">
                  Chưa có danh mục nào được khởi tạo.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Product Modal Overlay */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddProductModal(false)}
              className="fixed inset-0 bg-black"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Thêm Sản Phẩm Mới</h3>
                <button 
                  onClick={() => setShowAddProductModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Sản Phẩm *</label>
                  <input 
                    id="input-product-name"
                    type="text"
                    required
                    placeholder="e.g. iPhone 15 Pro Max 512GB"
                    value={newProduct.name}
                    onChange={e => setNewProduct({...newProduct, name: e.target.value})}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã SKU / Barcode / IMEI *</label>
                    <input 
                      id="input-product-sku"
                      type="text"
                      required
                      placeholder="e.g. IP15PM-512"
                      value={newProduct.sku}
                      onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Danh Mục</label>
                    <select 
                      id="select-product-category"
                      value={newProduct.category}
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                      {categories.length === 0 && (
                        <option value="">(Chưa có danh mục)</option>
                      )}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vị Trí Lưu Kho (Vị trí phân loại)</label>
                    <input 
                      id="input-product-location"
                      type="text"
                      placeholder="e.g. Kệ A-3, Hộp B-12"
                      value={newProduct.location}
                      onChange={e => setNewProduct({...newProduct, location: e.target.value})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cảnh Báo Khi Tồn Kho Dưới (Cài đặt)</label>
                    <input 
                      id="input-product-minstock"
                      type="number"
                      required
                      placeholder="e.g. 5"
                      value={newProduct.minStock}
                      onChange={e => setNewProduct({...newProduct, minStock: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={newProduct.hasImei}
                      onChange={e => setNewProduct({...newProduct, hasImei: e.target.checked, stock: e.target.checked ? 0 : newProduct.stock})}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-700 w-full whitespace-nowrap">Sản phẩm này quản lý bảo hành theo mã IMEI/Serial riêng lẻ</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Giá Vốn (Giá nhập - VNĐ)</label>
                    <input 
                      id="input-product-cost"
                      type="number"
                      required
                      placeholder="e.g. 25000000"
                      value={newProduct.cost}
                      onChange={e => setNewProduct({...newProduct, cost: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Giá Bán Lẻ (Giá xuất - VNĐ)</label>
                    <input 
                      id="input-product-price"
                      type="number"
                      required
                      placeholder="e.g. 29000000"
                      value={newProduct.price}
                      onChange={e => setNewProduct({...newProduct, price: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Lượng Nhập Kho Ban Đầu</label>
                    <input 
                      id="input-product-stock"
                      type="number"
                      required
                      value={newProduct.stock}
                      onChange={e => setNewProduct({...newProduct, stock: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn Bảo Hành (Tháng)</label>
                    <input 
                      id="input-product-warranty"
                      type="number"
                      required
                      value={newProduct.warrantyMonths}
                      onChange={e => setNewProduct({...newProduct, warrantyMonths: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowAddProductModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    id="btn-create-product-submit"
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer shadow-2xs"
                  >
                    Tạo sản phẩm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Product Modal Overlay */}
      <AnimatePresence>
        {showEditProductModal && editingProduct && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditProductModal(false);
                setEditingProduct(null);
              }}
              className="fixed inset-0 bg-black"
            />
            
            {/* Modal Body */}
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-lg z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">Sửa Sản Phẩm / Linh Kiện</h3>
                <button 
                  onClick={() => {
                    setShowEditProductModal(false);
                    setEditingProduct(null);
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleEditProductSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Sản Phẩm *</label>
                  <input 
                    id="edit-product-name"
                    type="text"
                    required
                    placeholder="e.g. iPhone 15 Pro Max"
                    value={editingProduct.name}
                    onChange={e => setEditingProduct({...editingProduct, name: e.target.value})}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Mã SKU / Barcode / IMEI *</label>
                    <input 
                      id="edit-product-sku"
                      type="text"
                      required
                      placeholder="e.g. IP15PM"
                      value={editingProduct.sku}
                      onChange={e => setEditingProduct({...editingProduct, sku: e.target.value})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Danh Mục</label>
                    <select 
                      id="edit-product-category"
                      value={editingProduct.category}
                      onChange={e => setEditingProduct({...editingProduct, category: e.target.value})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Vị Trí Lưu Kho (Vị trí phân loại)</label>
                    <input 
                      id="edit-product-location"
                      type="text"
                      placeholder="e.g. Kệ A-3, Hộp B-12"
                      value={editingProduct.location || ''}
                      onChange={e => setEditingProduct({...editingProduct, location: e.target.value})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Cảnh Báo Khi Tồn Kho Dưới</label>
                    <input 
                      id="edit-product-minstock"
                      type="number"
                      required
                      placeholder="e.g. 5"
                      value={editingProduct.minStock ?? 5}
                      onChange={e => setEditingProduct({...editingProduct, minStock: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editingProduct.hasImei || false}
                      onChange={e => setEditingProduct({...editingProduct, hasImei: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-semibold text-slate-700 w-full whitespace-nowrap">Sản phẩm này quản lý bảo hành theo mã IMEI/Serial riêng lẻ</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Giá Vốn (Giá nhập - VNĐ)</label>
                    <input 
                      id="edit-product-cost"
                      type="number"
                      required
                      placeholder="e.g. 25000000"
                      value={editingProduct.cost}
                      onChange={e => setEditingProduct({...editingProduct, cost: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Giá Bán Lẻ (Giá xuất - VNĐ)</label>
                    <input 
                      id="edit-product-price"
                      type="number"
                      required
                      placeholder="e.g. 29000000"
                      value={editingProduct.price}
                      onChange={e => setEditingProduct({...editingProduct, price: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Lượng Tồn Kho</label>
                    <input 
                      id="edit-product-stock"
                      type="number"
                      required
                      value={editingProduct.stock}
                      onChange={e => setEditingProduct({...editingProduct, stock: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn Bảo Hành (Tháng)</label>
                    <input 
                      id="edit-product-warranty"
                      type="number"
                      required
                      value={editingProduct.warrantyMonths}
                      onChange={e => setEditingProduct({...editingProduct, warrantyMonths: Number(e.target.value)})}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditProductModal(false);
                      setEditingProduct(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    id="btn-edit-product-submit"
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer shadow-2xs"
                  >
                    Cập nhật sản phẩm
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Invoice Details Overlay Modal */}
      <AnimatePresence>
        {activeInvoiceDetails && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveInvoiceDetails(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-xl z-10 relative"
            >
              <div className="flex justify-between items-center mb-6 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900">Chi Tiết Hóa Đơn {activeInvoiceDetails.invoiceNumber}</h3>
                </div>
                <button 
                  onClick={() => setActiveInvoiceDetails(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Invoice Layout Mockups */}
              <div 
                id="print-retail-invoice-section" 
                className={`space-y-4 bg-white p-6 rounded-xl border border-slate-200 text-slate-800 ${
                  printSettings?.paperSize === 'k80' ? 'max-w-[320px] mx-auto text-xs p-3' : 
                  printSettings?.paperSize === 'k57' ? 'max-w-[240px] mx-auto text-[10px] p-2' : 
                  'max-w-full text-sm'
                }`}
              >
                {/* Header Branded Section */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 border-b border-dashed border-slate-300 pb-4">
                  <div className={`flex ${printSettings?.paperSize !== 'a4' ? 'flex-col items-center text-center gap-2' : 'flex-row items-center justify-start gap-4'}`}>
                    {printSettings?.showLogoSymbol !== false && (
                      <div className={`flex-shrink-0 flex items-center justify-center`}>
                        {printSettings?.storeLogoImage ? (
                          <img src={printSettings.storeLogoImage} style={{ width: printSettings?.paperSize === 'a4' ? `${printSettings?.storeLogoWidth || 120}px` : `${(printSettings?.storeLogoWidth || 120) * 0.5}px`, objectFit: 'contain' }} alt="logo" />
                        ) : (
                          <div 
                            className={`rounded-full flex items-center justify-center font-bold text-white ring-2 ring-slate-100 ${printSettings?.paperSize === 'a4' ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-sm'}`}
                            style={{ backgroundColor: printSettings?.primaryColor || '#4f46e5', width: printSettings?.paperSize === 'a4' ? `${printSettings?.storeLogoWidth || 120}px` : `${(printSettings?.storeLogoWidth || 120) * 0.5}px`, height: printSettings?.paperSize === 'a4' ? `${printSettings?.storeLogoWidth || 120}px` : `${(printSettings?.storeLogoWidth || 120) * 0.5}px` }}
                          >
                            {printSettings?.storeLogoText || "TP"}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`font-serif ${printSettings?.paperSize !== 'a4' ? 'text-center' : 'text-left'}`} style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                      <h4 className={`font-bold uppercase tracking-tight leading-tight ${printSettings?.paperSize === 'a4' ? 'text-[1.1rem]' : 'text-[12px]'}`} style={{ color: printSettings?.primaryColor || '#1e293b' }}>
                        {printSettings?.storeName || "THỊNH PHÁT COMPUTER"}
                      </h4>
                      {printSettings?.storeSlogan && (
                        <p className={`text-slate-600 font-bold italic tracking-wide mt-0.5 ${printSettings?.paperSize === 'a4' ? 'text-[0.65rem]' : 'text-[8px]'}`}>
                          {printSettings.storeSlogan}
                        </p>
                      )}
                      <div className={`text-slate-800 font-medium mt-1 space-y-0.5 leading-snug ${printSettings?.paperSize === 'a4' ? 'text-[0.85rem]' : 'text-[9px]'}`}>
                        {printSettings?.storeAddress && <p><span className="font-bold">Địa chỉ:</span> {printSettings.storeAddress}</p>}
                        {printSettings?.storePhone && <p><span className="font-bold">Tel:</span> {printSettings.storePhone}</p>}
                        {printSettings?.storeWebsite && <p><span className="font-bold">Email:</span> {printSettings.storeWebsite}</p>}
                      </div>
                    </div>
                  </div>
                  <div className={`flex-shrink-0 ${printSettings?.paperSize !== 'a4' ? 'text-center' : 'sm:text-right'}`}>
                  </div>
                </div>
                
                {/* Customer Details */}
                <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-tight">
                  <p className="font-black text-slate-400 uppercase text-[8px] tracking-wider mb-1">Khách nhận bàn giao:</p>
                  <p className="text-xs">Họ tên: <span className="font-bold text-slate-900">{activeInvoiceDetails.customerName}</span></p>
                  <p className="text-xs">Số điện thoại: <span className="font-bold text-slate-900">{activeInvoiceDetails.customerPhone}</span></p>
                  {activeInvoiceDetails.processedBy && (
                    <p className="text-xs text-indigo-700 font-bold mt-1">👤 Phụ trách bàn giao: {activeInvoiceDetails.processedBy}</p>
                  )}
                </div>
                
                {/* Product/Item Breakdown */}
                <div>
                  <p className="text-[8px] uppercase tracking-wider font-extrabold text-slate-400 mb-2">Thông tin mặt hàng bàn giao:</p>
                  <div className="space-y-2 text-xs divide-y divide-dashed divide-slate-150">
                    {activeInvoiceDetails.items.map((item, index) => (
                      <div key={index} className="flex justify-between font-semibold pt-1.5 first:pt-0">
                        <div className="pr-2">
                          <p className="text-slate-950 font-bold">{item.productName}</p>
                          <p className="text-[10px] text-slate-500 font-bold">Số lượng: {item.quantity} × {formatVND(item.price)}</p>
                          {item.imeis && item.imeis.length > 0 && (
                            <p className="text-[10px] text-indigo-700 font-bold mt-0.5">IMEIs: {item.imeis.join(', ')}</p>
                          )}
                        </div>
                        <span className="font-extrabold text-slate-900 flex-shrink-0 align-bottom self-end">{formatVND(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                </div>
 
                <div className="border-t border-dashed border-slate-300 my-2" />
 
                {/* Financial Summary */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-semibold text-slate-500 gap-2">
                  <span>Phương thức: <span className="font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">💳 {activeInvoiceDetails.paymentMethod}</span></span>
                  <div className="sm:text-right w-full sm:w-auto">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">TỔNG CỘNG THANH TOÁN:</p>
                    <p className="text-lg font-black mt-0.5" style={{ color: printSettings?.primaryColor || '#4f46e5' }}>
                      {formatVND(activeInvoiceDetails.totalAmount)}
                    </p>
                  </div>
                </div>

                {/* Optional payment QR integration */}
                {printSettings?.bankAccountNo && (
                  <div className="my-3 bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 flex flex-col items-center justify-center text-center">
                    <p className="text-[9px] font-black uppercase text-indigo-700 tracking-wider mb-1.5">Mẹo quét mã QR thanh toán nhanh</p>
                    <img 
                      src={`https://img.vietqr.io/image/${printSettings.bankId || 'MB'}-${printSettings.bankAccountNo}-${printSettings.qrCompact !== false ? 'compact' : 'qr_only'}.png?amount=${activeInvoiceDetails.totalAmount}&addInfo=${encodeURIComponent(`Thanh toan don hang ${activeInvoiceDetails.invoiceNumber}`)}&accountName=${encodeURIComponent(printSettings.bankAccountName || '')}`} 
                      alt="VietQR Payment Code"
                      referrerPolicy="no-referrer"
                      className="w-32 h-32 object-contain bg-white p-1.5 border border-slate-200 rounded-lg shadow-2xs"
                    />
                    <div className="text-[9px] text-slate-500 mt-1.5 font-bold">
                      <p className="uppercase text-slate-850">{printSettings.bankId} • {printSettings.bankAccountNo}</p>
                      <p className="uppercase text-slate-500 mt-0.5">Chủ TK: {printSettings.bankAccountName}</p>
                    </div>
                  </div>
                )}
 
                {/* Footer Custom Slogan Note & Terms */}
                {activeInvoiceDetails.note && (
                  <div className="mt-3 bg-white p-3 text-[11px] text-slate-600 rounded-xl border border-slate-200/60 font-semibold italic">
                    Ghi chú kèm đơn: {activeInvoiceDetails.note}
                  </div>
                )}

                <div className="text-[10px] text-slate-500 border-t border-dashed border-slate-300 pt-2.5 text-center leading-relaxed font-semibold italic">
                  {printSettings?.storeNote || "Cảm ơn quý khách đã tin tưởng và mua sắm! Sản phẩm được bảo hành chính hãng theo thỏa thuận."}
                  <div className="mt-2 text-[8px] text-slate-400 uppercase tracking-widest text-center">
                    Mã HĐ: {activeInvoiceDetails.invoiceNumber} | Ngày lập: {new Date(activeInvoiceDetails.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
 
              <div className="pt-4 flex gap-3 justify-between items-center mt-4 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => {
                    const printC = document.getElementById('print-retail-invoice-section')?.innerHTML;
                    const originalC = document.body.innerHTML;
                    if (printC) {
                      document.body.innerHTML = printC;
                      window.print();
                      document.body.innerHTML = originalC;
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white font-extrabold text-xs rounded-xl cursor-pointer"
                >
                  🖨️ In Hóa Đơn Bán Hàng
                </button>
                <button 
                  onClick={() => setActiveInvoiceDetails(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer border border-slate-250 transition"
                >
                  Đóng lại
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMEI Manager Modal */}
      <AnimatePresence>
        {managingImeisFor && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-center items-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Quản Lý Mã Bản Thể (IMEI/Serial)
                  </h3>
                  <p className="text-sm font-semibold text-slate-500 mt-0.5">Sản phẩm: {managingImeisFor.name} - {managingImeisFor.sku}</p>
                </div>
                <button 
                  onClick={() => setManagingImeisFor(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mb-4">
                <input 
                  type="text"
                  placeholder="Quét hoặc nhập mã IMEI/Serial mới và nhấn Enter..."
                  className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl p-3 focus:outline-hidden focus:border-indigo-500 font-mono focus:bg-white transition-all shadow-xs"
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.trim();
                      if (!val) return;
                      // Check duplicate across everything
                      if (imeis.some(i => i.imei.toLowerCase() === val.toLowerCase())) {
                         alert('Mã IMEI này đã tồn tại trong hệ thống!');
                         return;
                      }
                      const newImei: ProductIMEI = {
                        id: `imei_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                        productId: managingImeisFor.id,
                        imei: val,
                        status: 'in_stock',
                        addedAt: new Date().toISOString()
                      };
                      onUpdateImeis([...imeis, newImei]);
                      e.currentTarget.value = '';
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 bg-slate-50 rounded-xl p-2 border border-slate-100">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th className="pb-2 pl-2">Mã định danh (IMEI)</th>
                      <th className="pb-2">Ngày nhập</th>
                      <th className="pb-2">Trạng thái</th>
                      <th className="pb-2 text-right pr-2">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 placeholder-slate-400">
                    {imeis.filter(i => i.productId === managingImeisFor.id).length === 0 ? (
                       <tr>
                         <td colSpan={4} className="py-6 text-center text-slate-400 font-semibold italic">Chưa có mã bảo hành cá thể nào. Bắt đầu quét mã!</td>
                       </tr>
                    ) : (
                      imeis.filter(i => i.productId === managingImeisFor.id).sort((a,b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()).map(im => (
                        <tr key={im.id} className="hover:bg-slate-100/60 transition-colors">
                          <td className="py-3 pl-2 font-mono font-bold text-slate-800">{im.imei}</td>
                          <td className="py-3 text-slate-500">{new Date(im.addedAt).toLocaleDateString('vi-VN')}</td>
                          <td className="py-3">
                            {im.status === 'in_stock' ? (
                              <span className="bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded text-xs uppercase">Trong kho</span>
                            ) : (
                              <span className="bg-slate-200 text-slate-500 font-bold px-2 py-0.5 rounded text-xs uppercase">Đã bán</span>
                            )}
                          </td>
                          <td className="py-3 text-right pr-2">
                             {im.status === 'in_stock' && (
                               <button 
                                 onClick={() => {
                                   if (confirm('Xóa mã định danh này khỏi kho hàng?')) {
                                     onUpdateImeis(imeis.filter(xi => xi.id !== im.id));
                                   }
                                 }}
                                 className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition"
                                 title="Xóa IMEI này"
                               >
                                 <Trash2 className="w-4 h-4" />
                               </button>
                             )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMEI Selector Modal */}
      <AnimatePresence>
        {selectingImeiFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={() => setSelectingImeiFor(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl p-6 relative w-full max-w-lg z-10"
            >
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-bold">Chọn IMEI cho {selectingImeiFor.name}</h2>
                 <button onClick={() => setSelectingImeiFor(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-2">
                {imeis.filter(i => i.productId === selectingImeiFor.id && i.status === 'in_stock').map(i => (
                  <button
                    key={i.id}
                    onClick={() => {
                      addToCart(selectingImeiFor, i.imei);
                      setSelectingImeiFor(null);
                    }}
                    className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition"
                  >
                    <span className="font-mono font-bold text-slate-800">{i.imei}</span>
                  </button>
                ))}
                {imeis.filter(i => i.productId === selectingImeiFor.id && i.status === 'in_stock').length === 0 && (
                  <p className="text-center text-slate-500 py-4">Không có IMEI nào đang sẵn kho.</p>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
