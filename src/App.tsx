import React, { useState, useEffect } from 'react';
import { 
  Product, 
  SalesInvoice, 
  RepairTicket, 
  WarrantyCard, 
  Customer,
  RepairStatus,
  Category,
  User,
  UserRole,
  PrintSettings,
  ProductIMEI
} from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_INVOICES, 
  INITIAL_REPAIRS, 
  INITIAL_WARRANTIES 
} from './mockData';
import Dashboard from './components/Dashboard';
import SalesManager from './components/SalesManager';
import RepairManager from './components/RepairManager';
import WarrantyManager from './components/WarrantyManager';
import CustomerManager from './components/CustomerManager';
import PCBuilder from './components/PCBuilder';
import Login from './components/Login';
import AccountManager from './components/AccountManager';
import PrintSettingsManager from './components/PrintSettingsManager';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Wrench, 
  ShieldCheck, 
  Users, 
  Wrench as LogoIcon,
  UserCog,
  LogOut,
  Menu,
  X,
  Cpu,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  storeName: "THỊNH PHÁT COMPUTER",
  storeSlogan: "HỆ THỐNG MÁY TÍNH & THIẾT BỊ VĂN PHÒNG CHUYÊN NGHIỆP",
  storeAddress: "126 Hồ Tùng Mậu - Hòa Minh - Liên Chiểu - Đà Nẵng",
  storePhone: "0935024002 (Zalo) - 0971682684 - Mr Thịnh",
  storeWebsite: "Hathanhthinh.dspn@gmail.com",
  storeNote: "Báo giá trên chưa bao gồm phí VAT. Có hiệu lực 3 ngày kể từ ngày báo.",
  storeLogoText: "TP",
  primaryColor: "#2e4a88",
  fontSize: "sm",
  showLogoSymbol: true,
  paperSize: "a4",
  bankId: "VCB",
  bankAccountNo: "0041000220324",
  bankAccountName: "HA THANH THINH",
  qrCompact: true
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(() => localStorage.getItem('thinhphat_v2_active_tab') || 'dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('thinhphat_v2_active_tab', activeTab);
  }, [activeTab]);

  // Master local States
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS);
  const [products, setProducts] = useState<Product[]>([]);
  const [imeis, setImeis] = useState<ProductIMEI[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [repairs, setRepairs] = useState<RepairTicket[]>([]);
  const [warranties, setWarranties] = useState<WarrantyCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [dbLoading, setDbLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Load database state from fullstack Express API over LAN
  const loadCentralData = async (silent = false) => {
    if (!silent) setIsSyncing(true);
    try {
      const res = await fetch('/api/db');
      const payload = await res.json();
      if (payload.success && payload.db) {
        const { products, customers, invoices, repairs, warranties, categories, users, settings, imeis } = payload.db;
        if (products && products.length > 0) setProducts(products);
        if (customers && customers.length > 0) setCustomers(customers);
        if (invoices && invoices.length > 0) setInvoices(invoices);
        if (repairs && repairs.length > 0) setRepairs(repairs);
        if (warranties && warranties.length > 0) setWarranties(warranties);
        if (categories && categories.length > 0) setCategories(categories);
        if (users && users.length > 0) setUsers(users);
        if (imeis && imeis.length > 0) setImeis(imeis);
        if (settings && settings.length > 0) {
          setPrintSettings(settings[0]);
        }
      }
    } catch (e) {
      console.warn("Mạng LAN/máy chủ ngoại tuyến, tự động chuyển sang sử dụng LocalStorage cục bộ:", e);
      // Fallback local localStorage pull
      const storedProducts = localStorage.getItem('thinhphat_v2_products');
      const storedCustomers = localStorage.getItem('thinhphat_v2_customers');
      const storedInvoices = localStorage.getItem('thinhphat_v2_invoices');
      const storedRepairs = localStorage.getItem('thinhphat_v2_repairs');
      const storedWarranties = localStorage.getItem('thinhphat_v2_warranties');
      const storedCategories = localStorage.getItem('thinhphat_v2_categories');
      const storedUsers = localStorage.getItem('thinhphat_v2_users');
      const storedSettings = localStorage.getItem('thinhphat_v2_settings');
      const storedImeis = localStorage.getItem('thinhphat_v2_imeis');

      if (storedUsers) setUsers(JSON.parse(storedUsers));
      if (storedProducts) setProducts(JSON.parse(storedProducts));
      if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
      if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
      if (storedRepairs) setRepairs(JSON.parse(storedRepairs));
      if (storedWarranties) setWarranties(JSON.parse(storedWarranties));
      if (storedCategories) setCategories(JSON.parse(storedCategories));
      if (storedImeis) setImeis(JSON.parse(storedImeis));
      if (storedSettings) {
        try {
          setPrintSettings(JSON.parse(storedSettings));
        } catch (err) {}
      }
    } finally {
      setDbLoading(false);
      setIsSyncing(false);
    }
  };

  // 1. Initial State Loading from Express Server API with LocalStorage safeguard
  useEffect(() => {
    const storedCurrent = localStorage.getItem('thinhphat_v2_current_user');
    if (storedCurrent) {
      try {
        setCurrentUser(JSON.parse(storedCurrent));
      } catch (err) {}
    }
    loadCentralData();

    // Auto-poll central data every 15 seconds to ensure real-time multi-device collaboration logic!
    const pollInterval = setInterval(() => {
      loadCentralData(true);
    }, 15000);

    return () => clearInterval(pollInterval);
  }, []);

  // Sync state mutation with express API
  const syncWithServer = async (type: string, data: any[]) => {
    try {
      await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data })
      });
    } catch (err) {
      console.error(`Lỗi đồng bộ dữ liệu ${type} lên máy chủ mạng LAN:`, err);
    }
  };

  // 2. LocalStorage Persistence synchronizers & LAN Server pushes
  const savePrintSettings = (newSettings: PrintSettings) => {
    setPrintSettings(newSettings);
    localStorage.setItem('thinhphat_v2_settings', JSON.stringify(newSettings));
    syncWithServer('settings', [newSettings]);
  };

  const saveProducts = (newProds: Product[]) => {
    setProducts(newProds);
    localStorage.setItem('thinhphat_v2_products', JSON.stringify(newProds));
    syncWithServer('products', newProds);
  };

  const saveImeis = (newImeis: ProductIMEI[]) => {
    setImeis(newImeis);
    localStorage.setItem('thinhphat_v2_imeis', JSON.stringify(newImeis));
    syncWithServer('imeis', newImeis);
  };

  const saveCustomers = (newCusts: Customer[]) => {
    setCustomers(newCusts);
    localStorage.setItem('thinhphat_v2_customers', JSON.stringify(newCusts));
    syncWithServer('customers', newCusts);
  };

  const saveInvoices = (newInvs: SalesInvoice[]) => {
    setInvoices(newInvs);
    localStorage.setItem('thinhphat_v2_invoices', JSON.stringify(newInvs));
    syncWithServer('invoices', newInvs);
  };

  const saveRepairs = (newReps: RepairTicket[]) => {
    setRepairs(newReps);
    localStorage.setItem('thinhphat_v2_repairs', JSON.stringify(newReps));
    syncWithServer('repairs', newReps);
  };

  const saveWarranties = (newWarrs: WarrantyCard[]) => {
    setWarranties(newWarrs);
    localStorage.setItem('thinhphat_v2_warranties', JSON.stringify(newWarrs));
    syncWithServer('warranties', newWarrs);
  };

  const saveCategories = (newCats: Category[]) => {
    setCategories(newCats);
    localStorage.setItem('thinhphat_v2_categories', JSON.stringify(newCats));
    syncWithServer('categories', newCats);
  };

  const saveUsers = (newUsers: User[]) => {
    setUsers(newUsers);
    localStorage.setItem('thinhphat_v2_users', JSON.stringify(newUsers));
    syncWithServer('users', newUsers);
  };

  const handleAddUser = (u: Omit<User, 'id' | 'createdAt'>) => {
    const payload: User = {
      ...u,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    saveUsers([...users, payload]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    saveUsers(updated);
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem('thinhphat_v2_current_user', JSON.stringify(updatedUser));
    }
  };

  const handleDeleteUser = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('thinhphat_v2_current_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('thinhphat_v2_current_user');
  };

  if (!currentUser) {
    return <Login users={users} onLoginSuccess={handleLogin} />;
  }

  // State manipulation triggers
  const handleAddProduct = (newProd: Omit<Product, 'id'>) => {
    const payload: Product = {
      ...newProd,
      id: `p_${Date.now()}`
    };
    saveProducts([...products, payload]);
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const updated = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    saveProducts(updated);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    saveProducts(updated);
  };

  const handleAddCategory = (name: string) => {
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name
    };
    saveCategories([...categories, newCat]);
  };

  const handleUpdateCategory = (id: string, newName: string) => {
    const updated = categories.map(c => c.id === id ? { ...c, name: newName } : c);
    saveCategories(updated);
  };

  const handleDeleteCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    saveCategories(updated);
  };

  const handleUpdateProductStock = (id: string, newStock: number) => {
    const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
    saveProducts(updated);
  };

  const handleAddInvoice = (newInvoice: SalesInvoice) => {
    saveInvoices([...invoices, newInvoice]);

    // Deduct stock for products sold & mark IMEIs as sold
    let hasStockUpdate = false;
    let hasImeiUpdate = false;

    // Use a copy of products and imeis to mutate
    let updatedProducts = [...products];
    let updatedImeis = [...imeis];

    newInvoice.items.forEach(item => {
        const prod = updatedProducts.find(p => p.id === item.productId);
        if (prod) {
            hasStockUpdate = true;
            prod.stock = Math.max(0, prod.stock - item.quantity);
            
            if (prod.hasImei && item.imeis && item.imeis.length > 0) {
                hasImeiUpdate = true;
                item.imeis.forEach(imeiToMark => {
                    const imeiIdx = updatedImeis.findIndex(i => i.imei === imeiToMark && i.status === 'in_stock');
                    if (imeiIdx > -1) {
                        updatedImeis[imeiIdx] = { ...updatedImeis[imeiIdx], status: 'sold', invoiceId: newInvoice.id };
                    }
                });
            }
        }
    });

    if (hasStockUpdate) {
      saveProducts(updatedProducts);
    }
    if (hasImeiUpdate) {
      saveImeis(updatedImeis);
    }

    // Relational auto-provision of active warranty records!
    const updatedWarranties = [...warranties];
    
    // Group PC Build into a single Warranty card using Invoice Number as Serial
    if (newInvoice.invoiceNumber.startsWith('PC-') && newInvoice.items.length > 0) {
        const maxWarr = newInvoice.items.reduce((max, item) => Math.max(max, item.warrantyMonths || 0), 12);
        const purchaseDate = newInvoice.createdAt.slice(0, 10);
        const expiry = new Date(purchaseDate);
        expiry.setMonth(expiry.getMonth() + maxWarr);
        
        const card: WarrantyCard = {
          id: `warr_${Date.now()}_pc`,
          serialNumber: newInvoice.invoiceNumber,
          productName: `Bộ Cấu Hình PC - ${newInvoice.invoiceNumber}`,
          customerName: newInvoice.customerName,
          customerPhone: newInvoice.customerPhone,
          purchaseDate,
          warrantyMonths: maxWarr,
          expiryDate: expiry.toISOString().slice(0, 10),
          status: 'active',
          notes: `Bảo hành theo linh kiện chi tiết trong Hoá đơn ${newInvoice.invoiceNumber}`,
          linkedInvoiceId: newInvoice.id
        };
        updatedWarranties.push(card);
    } else {
      newInvoice.items.forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const warrMonths = item.warrantyMonths !== undefined ? item.warrantyMonths : (prod ? prod.warrantyMonths : 0);
        
        if (warrMonths > 0) {
          const purchaseDate = newInvoice.createdAt.slice(0, 10);
          const expiry = new Date(purchaseDate);
          expiry.setMonth(expiry.getMonth() + warrMonths);
          
          // Formulate a realistic-looking serial/IMEI for electronics warranty
          const randomSerialStr = `IMEI-${Math.floor(10000000000000 + Math.random() * 90000000000000)}`;
          
          const card: WarrantyCard = {
            id: `warr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            serialNumber: randomSerialStr,
            productName: item.productName,
            customerName: newInvoice.customerName,
            customerPhone: newInvoice.customerPhone,
            purchaseDate,
            warrantyMonths: warrMonths,
            expiryDate: expiry.toISOString().slice(0, 10),
            status: 'active',
            notes: `Từ Hoá đơn số ${newInvoice.invoiceNumber}`,
            linkedInvoiceId: newInvoice.id
          };
          updatedWarranties.push(card);
        }
      });
    }

    if (updatedWarranties.length > warranties.length) {
      saveWarranties(updatedWarranties);
    }
  };

  const handleAddRepair = (ticket: RepairTicket) => {
    saveRepairs([...repairs, ticket]);
  };

  // Advanced repair transitions (terminal locking at status='delivered')
  const handleUpdateRepairStatus = (
    id: string, 
    status: RepairStatus, 
    finalDetails?: { solution?: string; actualCost?: number; warrantyUntil?: string; deliveredAt?: string; note?: string }
  ) => {
    const updated = repairs.map(rep => {
      if (rep.id !== id) return rep;
      
      // Block modifying terminal delivered state
      if (rep.status === 'delivered') return rep;

      const payload = {
        ...rep,
        status,
        updatedAt: new Date().toISOString()
      };

      if (finalDetails) {
        if (finalDetails.solution !== undefined) payload.solution = finalDetails.solution;
        if (finalDetails.actualCost !== undefined) payload.actualCost = finalDetails.actualCost;
        if (finalDetails.warrantyUntil !== undefined) payload.warrantyUntil = finalDetails.warrantyUntil;
        if (finalDetails.deliveredAt !== undefined) payload.deliveredAt = finalDetails.deliveredAt;
        if (finalDetails.note !== undefined) payload.note = finalDetails.note;
      }

      if (status === 'delivered' && !payload.deliveredAt) {
        payload.deliveredAt = new Date().toISOString().slice(0, 10);
      }

      // If transition to 'delivered' occurs, also register a service repair warranty card
      if (status === 'delivered' && payload.warrantyUntil) {
        const repairWarrantyCard: WarrantyCard = {
          id: `warr_repaired_${Date.now()}`,
          serialNumber: rep.deviceSerial || `REP-${rep.ticketNumber}`,
          productName: `Dịch vụ sửa máy: ${rep.deviceName}`,
          customerName: rep.customerName,
          customerPhone: rep.customerPhone,
          purchaseDate: new Date().toISOString().slice(0, 10),
          warrantyMonths: 3, // standard 3-month post-repair warranty
          expiryDate: payload.warrantyUntil,
          status: 'active',
          notes: `Bảo hành dịch vụ sửa chữa số ${rep.ticketNumber}. Giải pháp: ${payload.solution || 'Thay thế linh kiện'}`
        };
        
        // Also append this repair service custom warranty card to the master registry!
        setTimeout(() => {
          saveWarranties([...warranties, repairWarrantyCard]);
        }, 10);
      }

      return payload;
    });

    saveRepairs(updated);
  };

  const handleAddWarranty = (card: WarrantyCard) => {
    saveWarranties([...warranties, card]);
  };

  const handleAddCustomer = (customer: Customer) => {
    saveCustomers([...customers, customer]);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row antialiased p-4 md:p-6 gap-6">
      
      {/* 1. MOBILE BRAND HEADER CARD (Bento style, only visible on mobile) */}
      <div className="flex md:hidden items-center justify-between bg-slate-900 text-white rounded-2xl border border-slate-850 p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl">
            <LogoIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-extrabold text-sm tracking-tight leading-none uppercase text-white">THỊNH PHÁT</h2>
            <p className="text-[9px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">COMPUTER SYSTEM</p>
          </div>
        </div>
        <button
          id="mobile-drawer-toggle-btn"
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 hover:bg-slate-800 rounded-xl transition text-slate-400 hover:text-white cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* MOBILE DRAWER OVERLAY (Animated navigation drawer) */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            {/* Slide-out Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute top-0 bottom-0 left-0 w-80 max-w-[90%] bg-slate-900 border-r border-slate-850 p-5 flex flex-col justify-between shadow-2xl"
            >
              <div>
                <div className="flex items-center justify-between pb-5 border-b border-slate-850 mb-6">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-blue-600 rounded-xl">
                      <LogoIcon className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h2 className="font-extrabold text-xs tracking-wider leading-none uppercase text-white">THỊNH PHÁT</h2>
                      <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-widest">COMPUTER SYSTEM</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {[
                    { id: 'dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
                    { id: 'sales', label: 'Bán Hàng & Kho', icon: ShoppingBag },
                    { id: 'buildpc', label: 'Build Cấu Hình', icon: Cpu },
                    { id: 'repairs', label: 'Nhận Sửa Chữa', icon: Wrench },
                    { id: 'warranties', label: 'Tra Cứu Bảo Hành', icon: ShieldCheck },
                    { id: 'customers', label: 'Khách Hàng (CRM)', icon: Users },
                    { id: 'printSettings', label: 'Cấu Hình In & QR', icon: Printer },
                    { id: 'accounts', label: 'Nhân Viên & Quyền', icon: UserCog },
                  ].filter(tab => (tab.id !== 'accounts' && tab.id !== 'printSettings') || currentUser?.role === 'admin').map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button 
                        id={`mobile-nav-tab-${tab.id}`}
                        key={tab.id}
                        onClick={() => {
                          setActiveTab(tab.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-[11px] font-bold tracking-wide transition uppercase cursor-pointer ${
                          isActive 
                            ? 'bg-blue-600 text-white shadow-md border border-blue-500' 
                            : 'text-slate-400 hover:bg-slate-850 hover:text-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* User session status and Logout */}
              <div className="border-t border-slate-850 pt-4 space-y-4">
                <div className="bg-slate-850 p-3 rounded-2xl flex items-center justify-between gap-2 border border-slate-800">
                  <div className="min-w-0">
                    <p className="font-extrabold text-[11px] text-slate-100 truncate">{currentUser.fullName}</p>
                    <p className="text-[9px] font-extrabold mt-0.5 text-blue-400 uppercase tracking-widest leading-none">
                      {currentUser.role === 'admin' && 'Chủ cửa hàng'}
                      {currentUser.role === 'sales' && 'Bán Hàng'}
                      {currentUser.role === 'technician' && 'Kỹ Thuật'}
                    </p>
                  </div>
                  
                  <button 
                    id="mobile-sys-log-logout"
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    title="Đăng xuất"
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="text-center px-1">
                  <p className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wider">THỊNH PHÁT COMPUTER v1.2</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. PRIMARY SYSTEM DESKTOP SIDEBAR RAIL (Only visible on screens md and up) */}
      <nav className="hidden md:flex w-full md:w-64 bg-slate-900 text-white shrink-0 rounded-[2rem] border-2 border-slate-850 p-2 flex-col justify-between bento-shadow">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-8 px-2 py-1">
            <div className="p-2.5 bg-blue-600 rounded-2xl border border-blue-500 shadow-sm">
              <LogoIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-[13px] tracking-wider leading-none uppercase text-white">THỊNH PHÁT</h2>
              <p className="text-[8px] text-slate-400 font-bold mt-1.5 uppercase tracking-widest">COMPUTER SYSTEM</p>
            </div>
          </div>
 
          {/* Navigation Button Links */}
          <div className="space-y-2">
            {[
              { id: 'dashboard', label: 'Bảng Điều Khiển', icon: LayoutDashboard },
              { id: 'sales', label: 'Bán Hàng & Kho', icon: ShoppingBag },
              { id: 'buildpc', label: 'Build Cấu Hình', icon: Cpu },
              { id: 'repairs', label: 'Nhận Sửa Chữa', icon: Wrench },
              { id: 'warranties', label: 'Tra Cứu Bảo Hành', icon: ShieldCheck },
              { id: 'customers', label: 'Khách Hàng (CRM)', icon: Users },
              { id: 'printSettings', label: 'Cấu Hình In & QR', icon: Printer },
              { id: 'accounts', label: 'Nhân Viên & Quyền', icon: UserCog },
            ].filter(tab => (tab.id !== 'accounts' && tab.id !== 'printSettings') || currentUser?.role === 'admin').map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button 
                  id={`nav-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-bold tracking-wide transition uppercase cursor-pointer ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md border border-blue-500' 
                      : 'text-slate-400 hover:bg-slate-850 hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
 
        {/* Footer Current User Session with Log Out */}
        <div className="p-4 border-t border-slate-850 space-y-3">
          <div className="bg-slate-850 p-3 rounded-2xl flex items-center justify-between gap-2 border border-slate-800">
            <div className="min-w-0">
              <p className="font-extrabold text-[11px] text-slate-100 truncate">{currentUser.fullName}</p>
              <p className="text-[9px] font-extrabold mt-0.5 text-blue-400 uppercase tracking-widest leading-none">
                {currentUser.role === 'admin' && 'Chủ cửa hàng'}
                {currentUser.role === 'sales' && 'Bán Hàng'}
                {currentUser.role === 'technician' && 'Kỹ Thuật'}
              </p>
            </div>
            
            <button 
              id="sys-logout-btn"
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-rose-400 rounded-lg transition cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
          
          <div className="text-center md:text-left px-1">
            <p className="text-[9px] text-slate-600 font-extrabold uppercase tracking-wider">THỊNH PHÁT COMPUTER v1.2</p>
          </div>
        </div>
      </nav>
 
      {/* 3. PRIMARY MAIN CONTENT STAGE */}
      <main className="flex-1 overflow-y-auto px-2 py-4 md:p-2">

        
        {/* Workspace dynamic title bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-100 pb-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Bảng Điều Khiển Kinh Doanh'}
              {activeTab === 'sales' && 'Giao Dịch Bán Hàng & Quản Lý Kho'}
              {activeTab === 'buildpc' && 'Tự Build Cấu Hình Máy Tính & Báo Giá'}
              {activeTab === 'repairs' && 'Tiếp Nhận & Sửa Chữa Thiết Bị'}
              {activeTab === 'warranties' && 'Bảo Hành Điện Tử'}
              {activeTab === 'customers' && 'Hồ Sơ Khách Hàng (CRM)'}
              {activeTab === 'printSettings' && 'Cấu Hình Bản In & QR Thanh Toán'}
              {activeTab === 'accounts' && 'Quản Lý Tài Khoản & Nhân Viên'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'dashboard' && 'Báo cáo nhanh doanh số bán hàng, tình trạng sửa chữa thiết bị, dịch vụ bảo hành.'}
              {activeTab === 'sales' && 'Thiết lập giỏ nhận thanh toán hóa đơn nhanh, kích hoạt tự động thẻ bảo hành, điều chỉnh số tồn kho.'}
              {activeTab === 'buildpc' && 'Phối ráp CPU, RAM, ổ cứng, giá tùy chỉnh thực tế, bảo hành riêng lẻ và in báo giá.'}
              {activeTab === 'repairs' && 'Ghi chép tiếp quản máy hỏng kỹ thuật, tra cứu tự động nếu có bảo hành, bàn giao máy lưu kho.'}
              {activeTab === 'warranties' && 'Cổng tra cứu bảo hành minh bạch bằng số SKU/IMEI và lưu trữ thẻ quyền lợi bảo vệ khách mua hàng.'}
              {activeTab === 'customers' && 'Kiểm soát thông tin liên hệ, tra cứu lịch sử mua hàng phối hợp tất toán sửa chữa khách hàng cũ.'}
              {activeTab === 'printSettings' && 'Điều chỉnh khuôn khổ in ấn A4/K80/K57, màu thương hiệu nổi bật, khẩu hiệu cửa hàng và tích hợp VietQR.'}
              {activeTab === 'accounts' && 'Kiểm soát danh sách nhân sự bán hàng, kỹ thuật viên hoạt động tại cửa hàng, phân bổ quyền hạn.'}
            </p>
          </div>

          {/* Centralized LAN Server Sync Controller */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs shrink-0 self-start sm:self-center">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dbLoading ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dbLoading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <div className="text-left font-sans mr-2">
              <p className="text-[10px] font-extrabold text-slate-700 leading-none">MÁY CHỦ TRUNG TÂM</p>
              <p className="text-[8px] font-bold text-slate-400 mt-0.5 leading-none">LAN Database Connected</p>
            </div>
            <button
              onClick={() => loadCentralData()}
              disabled={isSyncing}
              className={`p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 active:scale-95 transition text-[10px] font-extrabold flex items-center gap-1 cursor-pointer select-none bg-slate-50 ${isSyncing ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <svg 
                className={`w-3.5 h-3.5 text-slate-600 ${isSyncing ? 'animate-spin' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 6H16" />
              </svg>
              {isSyncing ? 'Đồng bộ...' : 'Đồng bộ'}
            </button>
          </div>
        </div>

        {/* Active Route Workspace Switch with motion load-in effects */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18 }}
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                products={products}
                invoices={invoices}
                repairs={repairs}
                warranties={warranties}
                onNavigate={setActiveTab}
                onQuickRepair={() => setActiveTab('repairs')}
                onQuickInvoice={() => setActiveTab('sales')}
              />
            )}

            {activeTab === 'sales' && (
              <SalesManager 
                products={products}
                imeis={imeis}
                customers={customers}
                invoices={invoices}
                categories={categories}
                users={users}
                currentUser={currentUser!}
                printSettings={printSettings}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateProductStock={handleUpdateProductStock}
                onAddInvoice={handleAddInvoice}
                onAddCustomer={handleAddCustomer}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateImeis={saveImeis}
              />
            )}

            {activeTab === 'buildpc' && (
              <PCBuilder 
                products={products}
                imeis={imeis}
                customers={customers}
                currentUser={currentUser!}
                printSettings={printSettings}
                onAddInvoice={handleAddInvoice}
                onAddCustomer={handleAddCustomer}
                onUpdateProductStock={handleUpdateProductStock}
                onUpdateImeis={saveImeis}
              />
            )}

            {activeTab === 'repairs' && (
              <RepairManager 
                repairs={repairs}
                customers={customers}
                warranties={warranties}
                users={users}
                currentUser={currentUser!}
                onAddRepair={handleAddRepair}
                onUpdateRepairStatus={handleUpdateRepairStatus}
                onAddCustomer={handleAddCustomer}
              />
            )}

            {activeTab === 'warranties' && (
              <WarrantyManager 
                warranties={warranties}
                users={users}
                currentUser={currentUser!}
                onAddWarranty={handleAddWarranty}
                invoices={invoices}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerManager 
                customers={customers}
                invoices={invoices}
                repairs={repairs}
                onAddCustomer={handleAddCustomer}
              />
            )}

            {activeTab === 'printSettings' && currentUser?.role === 'admin' && (
              <PrintSettingsManager 
                printSettings={printSettings}
                onUpdatePrintSettings={savePrintSettings}
                currentUser={currentUser!}
              />
            )}

            {activeTab === 'accounts' && currentUser?.role === 'admin' && (
              <AccountManager 
                currentUser={currentUser}
                users={users}
                onAddUser={handleAddUser}
                onUpdateUser={handleUpdateUser}
                onDeleteUser={handleDeleteUser}
              />
            )}
          </motion.div>
        </AnimatePresence>

      </main>
    </div>
  );
}
