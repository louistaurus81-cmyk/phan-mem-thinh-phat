import React, { useState, useEffect, useCallback } from 'react';
import { 
  Product, 
  SalesInvoice, 
  RepairTicket, 
  WarrantyCard, 
  Customer, 
  Category, 
  User, 
  PrintSettings, 
  ProductIMEI, 
  Debt, 
  Supplier, 
  ImportOrder, 
  StaffActivityLog, 
  computeExpiryDate 
} from './types';
import { 
  INITIAL_PRODUCTS, 
  INITIAL_CUSTOMERS, 
  INITIAL_INVOICES, 
  INITIAL_REPAIRS, 
  INITIAL_WARRANTIES 
} from './mockData';
import { 
  cleanDocumentNumber, 
  isExactDebtInvoiceMatch, 
  isExactDebtRepairMatch, 
  reconcileDebtBalance 
} from './utils/finance';

// Original Components
import Dashboard from './components/Dashboard';
import SalesManager from './components/SalesManager';
import RepairManager from './components/RepairManager';
import WarrantyManager from './components/WarrantyManager';
import CustomerManager from './components/CustomerManager';
import DebtManager from './components/DebtManager';
import SupplierManager from './components/SupplierManager';
import PCBuilder from './components/PCBuilder';
import Login from './components/Login';
import AccountManager from './components/AccountManager';
import PrintSettingsManager from './components/PrintSettingsManager';
import OwnerDashboard from './components/OwnerDashboard';
import ReportManager from './components/ReportManager';
import TPLogo from './components/TPLogo';

import { 
  LayoutDashboard, 
  ShoppingBag, 
  Wrench, 
  ShieldCheck, 
  Users, 
  UserCog, 
  LogOut, 
  Menu, 
  X, 
  Cpu, 
  Printer, 
  ReceiptText, 
  Building2, 
  Crown, 
  Bell, 
  BarChart3 
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
  bankId: "TPB",
  bankAccountNo: "00935024002",
  bankAccountName: "Hà Thanh Thịnh",
  qrCompact: true,
  quoteTitle: "BẢNG BÁO GIÁ KIÊM PHIẾU BẢO HÀNH",
  quoteStockStatusText: "SẴN HÀNG",
  quoteVatNote: "Lưu ý : Bảng giá trên chưa bao gồm phí VAT",
  quoteValidityNote: "Bảng báo giá có hiệu lực 3 ngày kể từ ngày báo"
};

export default function App() {
  const [activeTab, setActiveTab] = useState<string>(
    () => localStorage.getItem('thinhphat_v2_active_tab') || 'sales'
  );

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
  const [debts, setDebts] = useState<Debt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [importOrders, setImportOrders] = useState<ImportOrder[]>([]);
  const [activities, setActivities] = useState<StaffActivityLog[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [dbLoading, setDbLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const syncProductsWithImeis = (prods: Product[], ims: ProductIMEI[]): Product[] => {
    return prods.map(p => {
      if (p.hasImei) {
        const count = ims.filter(i => i.productId === p.id && i.status === 'in_stock').length;
        return p.stock !== count ? { ...p, stock: count } : p;
      }
      return p;
    });
  };

  // Load database state over LAN
  const loadCentralData = useCallback(async (silent = false, overrideToken?: string) => {
    if (!silent) setIsSyncing(true);
    try {
      const token = overrideToken || localStorage.getItem('thinhphat_v2_auth_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/db', { headers });
      const payload = await res.json();

      if (payload.success && payload.db) {
        const { products, customers, invoices, repairs, warranties, categories, users, settings, imeis, debts, suppliers, activities, import_orders } = payload.db;
        const loadedImeis = imeis || [];

        if (Array.isArray(imeis)) setImeis(loadedImeis);
        if (Array.isArray(products)) setProducts(syncProductsWithImeis(products, loadedImeis));
        if (Array.isArray(invoices)) setInvoices(invoices);
        if (Array.isArray(customers)) setCustomers(customers);
        if (Array.isArray(repairs)) setRepairs(repairs);
        if (Array.isArray(warranties)) setWarranties(warranties);
        if (Array.isArray(categories)) setCategories(categories);
        if (Array.isArray(users)) setUsers(users);
        if (Array.isArray(debts)) setDebts(debts);
        if (Array.isArray(suppliers)) setSuppliers(suppliers);
        if (Array.isArray(import_orders)) setImportOrders(import_orders);
        if (Array.isArray(activities)) setActivities(activities);
        if (settings && settings.length > 0) setPrintSettings(settings[0]);
      }
    } catch (e) {
      console.warn("Lỗi tải dữ liệu mạng LAN:", e);
      const storedProducts = localStorage.getItem('thinhphat_v2_products');
      const storedCustomers = localStorage.getItem('thinhphat_v2_customers');
      const storedInvoices = localStorage.getItem('thinhphat_v2_invoices');
      const storedRepairs = localStorage.getItem('thinhphat_v2_repairs');
      const storedWarranties = localStorage.getItem('thinhphat_v2_warranties');
      const storedCategories = localStorage.getItem('thinhphat_v2_categories');
      const storedUsers = localStorage.getItem('thinhphat_v2_users');
      const storedSettings = localStorage.getItem('thinhphat_v2_settings');
      const storedImeis = localStorage.getItem('thinhphat_v2_imeis');
      const storedDebts = localStorage.getItem('thinhphat_v2_debts');
      const storedSuppliers = localStorage.getItem('thinhphat_v2_suppliers');
      const storedActivities = localStorage.getItem('thinhphat_v2_activities');

      if (storedUsers) setUsers(JSON.parse(storedUsers));
      if (storedProducts) setProducts(JSON.parse(storedProducts));
      if (storedCustomers) setCustomers(JSON.parse(storedCustomers));
      if (storedInvoices) setInvoices(JSON.parse(storedInvoices));
      if (storedRepairs) setRepairs(JSON.parse(storedRepairs));
      if (storedWarranties) setWarranties(JSON.parse(storedWarranties));
      if (storedCategories) setCategories(JSON.parse(storedCategories));
      if (storedImeis) setImeis(JSON.parse(storedImeis));
      if (storedDebts) setDebts(JSON.parse(storedDebts));
      if (storedSuppliers) setSuppliers(JSON.parse(storedSuppliers));
      if (storedActivities) setActivities(JSON.parse(storedActivities));
      if (storedSettings) setPrintSettings(JSON.parse(storedSettings));
    } finally {
      setDbLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('thinhphat_v2_current_user');
    if (storedUser) {
      try {
        setCurrentUser(JSON.parse(storedUser));
      } catch {}
    }
    loadCentralData();
  }, [loadCentralData]);

  // Generic Central Persistence to JsonDatabaseEngine Backend API
  const saveCollection = async (type: string, data: any[]) => {
    try {
      const token = localStorage.getItem('thinhphat_v2_auth_token');
      await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token || ''}`
        },
        body: JSON.stringify({ type, data })
      });
      localStorage.setItem(`thinhphat_v2_${type}`, JSON.stringify(data));
    } catch (err) {
      console.error(`Lỗi khi lưu ${type}:`, err);
      localStorage.setItem(`thinhphat_v2_${type}`, JSON.stringify(data));
    }
  };

  const handleAddProduct = (product: Omit<Product, 'id'>) => {
    const newProd: Product = { ...product, id: `prod_${Date.now()}` };
    const updated = [newProd, ...products];
    setProducts(updated);
    saveCollection('products', updated);
  };

  const handleUpdateProduct = (product: Product) => {
    const updated = products.map(p => p.id === product.id ? product : p);
    setProducts(updated);
    saveCollection('products', updated);
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    saveCollection('products', updated);
  };

  const handleAddInvoice = (invoice: SalesInvoice) => {
    const updatedInvoices = [invoice, ...invoices];
    setInvoices(updatedInvoices);
    saveCollection('invoices', updatedInvoices);

    const nowStr = invoice.createdAt.slice(0, 10);
    const newWarranties: WarrantyCard[] = [];

    invoice.items.forEach((item, idx) => {
      const warrantyMonths = item.warrantyMonths || 12;
      const expiryDate = computeExpiryDate(nowStr, warrantyMonths);

      if (item.imeis && item.imeis.length > 0) {
        item.imeis.forEach(imeiCode => {
          newWarranties.push({
            id: `warr_${Date.now()}_${idx}_${Math.random()}`,
            serialNumber: imeiCode,
            productName: item.productName,
            customerName: invoice.customerName,
            customerPhone: invoice.customerPhone,
            purchaseDate: nowStr,
            warrantyMonths,
            expiryDate,
            status: 'active',
            linkedInvoiceId: invoice.id
          });
        });
      } else {
        newWarranties.push({
          id: `warr_${Date.now()}_${idx}`,
          serialNumber: `${invoice.invoiceNumber}-${idx + 1}`,
          productName: item.productName,
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          purchaseDate: nowStr,
          warrantyMonths,
          expiryDate,
          status: 'active',
          linkedInvoiceId: invoice.id
        });
      }
    });

    if (newWarranties.length > 0) {
      const updatedWarrs = [...newWarranties, ...warranties];
      setWarranties(updatedWarrs);
      saveCollection('warranties', updatedWarrs);
    }

    if (invoice.debtAmount && invoice.debtAmount > 0) {
      const dueDate = invoice.debtDueDate || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10);
      const newDebt: Debt = {
        id: `debt_inv_${invoice.id}`,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerId: invoice.customerId,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        amount: invoice.debtAmount,
        remainingAmount: invoice.debtAmount,
        dueDate,
        status: 'pending',
        createdAt: invoice.createdAt,
        note: `Công nợ hóa đơn bán lẻ ${invoice.invoiceNumber}`,
        payments: []
      };
      const updatedDebts = [newDebt, ...debts];
      setDebts(updatedDebts);
      saveCollection('debts', updatedDebts);
    }
  };

  const handleAddCustomer = (customer: Customer) => {
    const updated = [customer, ...customers];
    setCustomers(updated);
    saveCollection('customers', updated);
  };

  const handleEditCustomer = (customer: Customer) => {
    const updated = customers.map(c => c.id === customer.id ? customer : c);
    setCustomers(updated);
    saveCollection('customers', updated);
  };

  const handleAddCategory = (name: string) => {
    const newCat: Category = { id: `cat_${Date.now()}`, name };
    const updated = [...categories, newCat];
    setCategories(updated);
    saveCollection('categories', updated);
  };

  const handleUpdateCategory = (id: string, name: string) => {
    const updated = categories.map(c => c.id === id ? { ...c, name } : c);
    setCategories(updated);
    saveCollection('categories', updated);
  };

  const handleDeleteCategory = (id: string) => {
    const updated = categories.filter(c => c.id !== id);
    setCategories(updated);
    saveCollection('categories', updated);
  };

  const handleAddRepair = (repair: RepairTicket) => {
    const updated = [repair, ...repairs];
    setRepairs(updated);
    saveCollection('repairs', updated);
  };

  const handleUpdateRepair = (repair: RepairTicket) => {
    const updated = repairs.map(r => r.id === repair.id ? repair : r);
    setRepairs(updated);
    saveCollection('repairs', updated);
  };

  const handleUpdateRepairStatus = (
    id: string, 
    status: any, 
    finalDetails?: any
  ) => {
    const updated = repairs.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status,
          ...(finalDetails || {})
        };
      }
      return r;
    });
    setRepairs(updated);
    saveCollection('repairs', updated);
  };

  const handleUpdateImeis = (updatedImeis: ProductIMEI[]) => {
    setImeis(updatedImeis);
    saveCollection('imeis', updatedImeis);
    setProducts(syncProductsWithImeis(products, updatedImeis));
  };

  const handleUpdateDebts = (updatedDebts: Debt[]) => {
    setDebts(updatedDebts);
    saveCollection('debts', updatedDebts);
  };

  const handleUpdateSuppliers = (updatedSuppliers: Supplier[]) => {
    setSuppliers(updatedSuppliers);
    saveCollection('suppliers', updatedSuppliers);
  };

  const handleUpdatePrintSettings = (settings: PrintSettings) => {
    setPrintSettings(settings);
    saveCollection('settings', [settings]);
  };

  const handleAddUser = (user: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = { ...user, id: `usr_${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [...users, newUser];
    setUsers(updated);
    saveCollection('users', updated);
  };

  const handleUpdateUser = (user: User) => {
    const updated = users.map(u => u.id === user.id ? user : u);
    setUsers(updated);
    saveCollection('users', updated);
  };

  const handleDeleteUser = (id: string) => {
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    saveCollection('users', updated);
  };

  const handleLoginSuccess = (user: User, token?: string) => {
    setCurrentUser(user);
    localStorage.setItem('thinhphat_v2_current_user', JSON.stringify(user));
    if (token) localStorage.setItem('thinhphat_v2_auth_token', token);
    loadCentralData(false, token);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('thinhphat_v2_current_user');
    localStorage.removeItem('thinhphat_v2_auth_token');
  };

  if (!currentUser) {
    return (
      <Login 
        users={users}
        onLoginSuccess={handleLoginSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col md:flex-row antialiased selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* ORIGINAL TOP HEADER */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 py-2.5 flex items-center justify-between sticky top-0 z-40 md:hidden">
        <div className="flex items-center gap-2">
          <TPLogo className="w-7 h-7 text-indigo-400" />
          <span className="font-extrabold text-sm tracking-tight">THỊNH PHÁT COMPUTER</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-lg bg-slate-800 text-slate-200"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* ORIGINAL DARK SLATE SIDEBAR (100% ORIGINAL DESIGN) */}
      <nav className={`w-full md:w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 ${isMobileMenuOpen ? 'block' : 'hidden md:flex'}`}>
        <div>
          {/* Logo & Store Info */}
          <div className="p-4 border-b border-slate-800 flex items-center gap-3">
            <TPLogo className="w-9 h-9 text-indigo-500 shrink-0" />
            <div>
              <h2 className="font-black text-white text-sm tracking-tight">{printSettings.storeName}</h2>
              <p className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">{printSettings.storeSlogan}</p>
            </div>
          </div>

          {/* Sidebar Menu Items */}
          <div className="p-2 space-y-1">
            {currentUser.role === 'admin' && (
              <button
                onClick={() => { setActiveTab('owner'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'owner' ? 'bg-amber-500 text-slate-950 font-black shadow-md' : 'text-amber-400 hover:bg-slate-800'
                }`}
              >
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Bảng Chủ Shop 👑</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Bảng Điều Khiển</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                onClick={() => { setActiveTab('reports'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'reports' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>Báo Cáo Doanh Thu</span>
              </button>
            )}

            <button
              onClick={() => { setActiveTab('sales'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Quản Lý Bán Hàng & Kho</span>
            </button>

            <button
              onClick={() => { setActiveTab('buildpc'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'buildpc' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Cpu className="w-4 h-4" />
              <span>Tự Build Cấu Hình PC</span>
            </button>

            <button
              onClick={() => { setActiveTab('repairs'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'repairs' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Tiếp Nhận Sửa Chữa</span>
            </button>

            <button
              onClick={() => { setActiveTab('warranties'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'warranties' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Bảo Hành Điện Tử</span>
            </button>

            <button
              onClick={() => { setActiveTab('suppliers'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'suppliers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Nhà Cung Cấp</span>
            </button>

            <button
              onClick={() => { setActiveTab('debts'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'debts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <ReceiptText className="w-4 h-4" />
              <span>Quản Lý Công Nợ</span>
            </button>

            <button
              onClick={() => { setActiveTab('customers'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'customers' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Quản Lý Khách Hàng</span>
            </button>

            <button
              onClick={() => { setActiveTab('printSettings'); setIsMobileMenuOpen(false); }}
              className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                activeTab === 'printSettings' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Printer className="w-4 h-4" />
              <span>Cấu Hình Mẫu In</span>
            </button>

            {currentUser.role === 'admin' && (
              <button
                onClick={() => { setActiveTab('accounts'); setIsMobileMenuOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2.5 transition cursor-pointer ${
                  activeTab === 'accounts' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <UserCog className="w-4 h-4" />
                <span>Quản Lý Nhân Viên</span>
              </button>
            )}
          </div>
        </div>

        {/* User Info & Logout Footer */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-2 bg-slate-800/80 p-2 rounded-xl">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shrink-0">
              {currentUser.fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-100 truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-slate-400 font-mono capitalize">{currentUser.role}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 rounded-xl font-bold text-xs text-rose-400 hover:bg-rose-950/40 transition cursor-pointer flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng Xuất</span>
          </button>
        </div>
      </nav>

      {/* ORIGINAL PRIMARY MAIN CONTENT STAGE */}
      <main className="flex-1 h-full min-h-0 overflow-hidden px-3 py-3 md:p-4 flex flex-col">
        
        {/* Workspace Dynamic Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3 border-b border-slate-200 pb-3 shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'Bảng Điều Khiển Kinh Doanh'}
              {activeTab === 'owner' && 'Bảng Giám Sát Chủ Cửa Hàng (Owner Dashboard)'}
              {activeTab === 'reports' && 'Báo Cáo Doanh Thu, Công Nợ & Lợi Nhuận'}
              {activeTab === 'sales' && 'Giao Dịch Bán Hàng & Quản Lý Kho'}
              {activeTab === 'buildpc' && 'Tự Build Cấu Hình Máy Tính & Báo Giá'}
              {activeTab === 'repairs' && 'Tiếp Nhận & Sửa Chữa Thiết Bị'}
              {activeTab === 'warranties' && 'Bảo Hành Điện Tử'}
              {activeTab === 'customers' && 'Hồ Sơ Khách Hàng (CRM)'}
              {activeTab === 'debts' && 'Quản Lý Công Nợ'}
              {activeTab === 'suppliers' && 'Quản Lý Nhà Cung Cấp'}
              {activeTab === 'printSettings' && 'Cấu Hình Bản In & QR Thanh Toán'}
              {activeTab === 'accounts' && 'Quản Lý Tài Khoản & Nhân Viên'}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {activeTab === 'dashboard' && 'Báo cáo nhanh doanh số bán hàng, tình trạng sửa chữa thiết bị, dịch vụ bảo hành.'}
              {activeTab === 'owner' && 'Theo dõi realtime đơn hàng đã bán trong ngày, thông báo doanh thu, lợi nhuận & hiệu suất nhân viên.'}
              {activeTab === 'reports' && 'Phân tích doanh thu, lợi nhuận gộp, lịch sử bán hàng và biến động công nợ theo tháng.'}
              {activeTab === 'sales' && 'Thiết lập giỏ nhận thanh toán hóa đơn nhanh, kích hoạt tự động thẻ bảo hành, điều chỉnh số tồn kho.'}
              {activeTab === 'buildpc' && 'Phối ráp CPU, RAM, ổ cứng, giá tùy chỉnh thực tế, bảo hành riêng lẻ và in báo giá.'}
              {activeTab === 'repairs' && 'Ghi chép tiếp quản máy hỏng kỹ thuật, tra cứu tự động nếu có bảo hành, bàn giao máy lưu kho.'}
              {activeTab === 'warranties' && 'Cổng tra cứu bảo hành minh bạch bằng số SKU/IMEI và lưu trữ thẻ quyền lợi bảo vệ khách mua hàng.'}
              {activeTab === 'customers' && 'Kiểm soát thông tin liên hệ, tra cứu lịch sử mua hàng phối hợp tất toán sửa chữa khách hàng cũ.'}
              {activeTab === 'debts' && 'Theo dõi danh sách công nợ khách hàng, kỳ hạn thanh toán và trạng thái tất toán các hóa đơn còn thiếu.'}
              {activeTab === 'suppliers' && 'Quản lý thông tin nhà cung cấp sản phẩm, tra cứu nhanh nguồn gốc nhập hàng để bảo hành dễ dàng.'}
              {activeTab === 'printSettings' && 'Điều chỉnh khuôn khổ in ấn A4/K80/K57, màu thương hiệu nổi bật và tích hợp VietQR.'}
              {activeTab === 'accounts' && 'Kiểm soát danh sách nhân sự bán hàng, kỹ thuật viên hoạt động tại cửa hàng, phân bổ quyền hạn.'}
            </p>
          </div>

          {/* Connection Indicator */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-center">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dbLoading ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${dbLoading ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
            </span>
            <div className="text-left">
              <p className="text-[10px] font-extrabold text-slate-700 leading-none">MÁY CHỦ TRUNG TÂM</p>
              <p className="text-[8px] font-bold text-slate-400 mt-0.5 leading-none">JsonDatabaseEngine Connected</p>
            </div>
            <button
              onClick={() => loadCentralData()}
              disabled={isSyncing}
              className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-[10px] font-extrabold cursor-pointer"
            >
              {isSyncing ? 'Đồng bộ...' : 'Đồng bộ'}
            </button>
          </div>
        </div>

        {/* ORIGINAL STAGE RENDERING FOR ALL ORIGINAL COMPONENTS */}
        <AnimatePresence mode="wait">
          <motion.div 
            key={activeTab}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col"
          >
            {activeTab === 'dashboard' && (
              <Dashboard 
                products={products}
                invoices={invoices}
                repairs={repairs}
                warranties={warranties}
                debts={debts}
                onNavigate={setActiveTab}
                onQuickRepair={() => setActiveTab('repairs')}
                onQuickInvoice={() => setActiveTab('sales')}
              />
            )}

            {activeTab === 'owner' && currentUser.role === 'admin' && (
              <OwnerDashboard 
                products={products}
                invoices={invoices}
                repairs={repairs}
                debts={debts}
                users={users}
                imeis={imeis}
                activities={activities}
                onMarkLogRead={() => {}}
                onClearLogs={() => {}}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'reports' && currentUser.role === 'admin' && (
              <ReportManager 
                products={products}
                invoices={invoices}
                repairs={repairs}
                debts={debts}
                customers={customers}
                users={users}
                printSettings={printSettings}
                onNavigate={setActiveTab}
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
                currentUser={currentUser}
                printSettings={printSettings}
                suppliers={suppliers}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateProductStock={(id, newStock) => {
                  const prod = products.find(p => p.id === id);
                  if (prod) handleUpdateProduct({ ...prod, stock: newStock });
                }}
                onAddInvoice={handleAddInvoice}
                onAddCustomer={handleAddCustomer}
                onAddCategory={handleAddCategory}
                onUpdateCategory={handleUpdateCategory}
                onDeleteCategory={handleDeleteCategory}
                onUpdateImeis={handleUpdateImeis}
              />
            )}

            {activeTab === 'buildpc' && (
              <PCBuilder 
                products={products}
                imeis={imeis}
                customers={customers}
                currentUser={currentUser}
                printSettings={printSettings}
                onAddInvoice={handleAddInvoice}
                onAddCustomer={handleAddCustomer}
                onUpdateProductStock={(id, newStock) => {
                  const prod = products.find(p => p.id === id);
                  if (prod) handleUpdateProduct({ ...prod, stock: newStock });
                }}
                onUpdateImeis={handleUpdateImeis}
              />
            )}

            {activeTab === 'repairs' && (
              <RepairManager 
                repairs={repairs}
                customers={customers}
                warranties={warranties}
                users={users}
                currentUser={currentUser}
                products={products}
                imeis={imeis}
                printSettings={printSettings}
                onUpdateImeis={handleUpdateImeis}
                onAddRepair={handleAddRepair}
                onUpdateRepair={handleUpdateRepair}
                onDeleteRepair={id => {
                  const updated = repairs.filter(r => r.id !== id);
                  setRepairs(updated);
                  saveCollection('repairs', updated);
                }}
                onUpdateRepairStatus={handleUpdateRepairStatus}
                onAddCustomer={handleAddCustomer}
                onUpdateProductStock={(id, newStock) => {
                  const prod = products.find(p => p.id === id);
                  if (prod) handleUpdateProduct({ ...prod, stock: newStock });
                }}
              />
            )}

            {activeTab === 'warranties' && (
              <WarrantyManager 
                warranties={warranties}
                repairs={repairs}
                users={users}
                currentUser={currentUser}
                onAddWarranty={card => {
                  const updated = [card, ...warranties];
                  setWarranties(updated);
                  saveCollection('warranties', updated);
                }}
                invoices={invoices}
                products={products}
              />
            )}

            {activeTab === 'debts' && (
              <DebtManager 
                debts={debts}
                onUpdateDebts={handleUpdateDebts}
                invoices={invoices}
                customers={customers}
                printSettings={printSettings}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'customers' && (
              <CustomerManager 
                customers={customers}
                invoices={invoices}
                repairs={repairs}
                debts={debts}
                onAddCustomer={handleAddCustomer}
                onEditCustomer={handleEditCustomer}
              />
            )}

            {activeTab === 'suppliers' && (
              <SupplierManager 
                suppliers={suppliers}
                onUpdateSuppliers={handleUpdateSuppliers}
                products={products}
                onUpdateProduct={handleUpdateProduct}
                imeis={imeis}
                onUpdateImeis={handleUpdateImeis}
                importOrders={importOrders}
                onUpdateImportOrders={orders => {
                  setImportOrders(orders);
                  saveCollection('import_orders', orders);
                }}
                currentUser={currentUser}
                onReloadData={() => loadCentralData()}
              />
            )}

            {activeTab === 'printSettings' && (
              <PrintSettingsManager 
                printSettings={printSettings}
                onUpdatePrintSettings={handleUpdatePrintSettings}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'accounts' && currentUser.role === 'admin' && (
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
