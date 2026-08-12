import React, { useState, useEffect } from 'react';
import { 
  Product, 
  SalesInvoice, 
  InvoiceItem,
  RepairTicket, 
  WarrantyCard, 
  Customer,
  RepairStatus,
  Category,
  User,
  UserRole,
  PrintSettings,
  ProductIMEI,
  Debt,
  DebtPayment,
  Supplier,
  StaffActivityLog,
  ActivityType,
  computeExpiryDate
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
import DebtManager from './components/DebtManager';
import SupplierManager from './components/SupplierManager';
import PCBuilder from './components/PCBuilder';
import Login from './components/Login';
import AccountManager from './components/AccountManager';
import PrintSettingsManager from './components/PrintSettingsManager';
import OwnerDashboard from './components/OwnerDashboard';
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
  Factory,
  Crown,
  Bell,
  CheckCheck
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
  quoteValidityNote: "Bảng báo giá có hiệu lực 3 ngày kể từ ngày báo",
  quoteWarrantyTerms: [
    "Sản phẩm phân phối chính hãng phải còn nguyên tem bảo hành, không bị rách, chắp vá hay cạo sửa.",
    "Sản phẩm không có dấu hiệu bị rách tem hoặc tác động cơ học hỏng hóc vật lý.",
    "Không bảo hành trong các trường hợp cháy nổ, rơi vỡ, vô nước, côn trùng, hoặc thiên tai.",
    "Hỗ trợ xử lý phần mềm, cài Win miễn phí trong vòng 1 năm đầu mua máy.",
    "Hàng bán ra được đổi mới trong 7 ngày đầu nếu có lỗi phần cứng từ nhà sản xuất."
  ],
  showQuoteWarrantyTerms: true,
  showQuoteBankInfo: true,
  showQuoteQrCode: false,
  showQuoteSignatures: true,
  showQuoteStockColumn: true,
  showQuoteWarrantyColumn: true,
  quoteColSttLabel: "STT",
  quoteColProductLabel: "TÊN LINH KIỆN - SẢN PHẨM",
  quoteColQtyLabel: "SL",
  quoteColUnitPriceLabel: "ĐƠN GIÁ",
  quoteColAmountLabel: "THÀNH TIỀN",
  quoteColWarrantyLabel: "BẢO HÀNH",
  quoteColStockLabel: "TÌNH TRẠNG HÀNG",
  quoteTotalLabel: "TỔNG CỘNG CẤU HÌNH BAO GỒM VAT:",
  quoteWarrantyTermsHeader: "MỘT SỐ QUY ĐỊNH BẢO HÀNH:",
  quoteBankHeader: "Thông tin chuyển khoản:",
  quoteSignatureCustomerLabel: "Khách hàng",
  quoteSignatureStoreLabel: "CỬA HÀNG"
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
  const [debts, setDebts] = useState<Debt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activities, setActivities] = useState<StaffActivityLog[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  
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
        const { products, customers, invoices, repairs, warranties, categories, users, settings, imeis, debts, suppliers, activities } = payload.db;
        const loadedImeis = imeis || [];
        if (Array.isArray(imeis)) setImeis(imeis);
        if (Array.isArray(products)) {
          const syncedProds = syncProductsStockWithImeis(products, loadedImeis);
          setProducts(syncedProds);
        }
        if (Array.isArray(invoices)) setInvoices(invoices);
        if (Array.isArray(customers)) setCustomers(customers);
        if (Array.isArray(repairs)) setRepairs(repairs);
        if (Array.isArray(warranties)) setWarranties(warranties);
        if (Array.isArray(categories)) setCategories(categories);
        if (Array.isArray(users)) setUsers(users);
        if (Array.isArray(debts)) setDebts(debts);
        if (Array.isArray(suppliers)) setSuppliers(suppliers);
        if (Array.isArray(activities)) setActivities(activities);
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

  const syncProductsStockWithImeis = (prods: Product[], ims: ProductIMEI[]): Product[] => {
    return prods.map(p => {
      if (p.hasImei) {
        const count = ims.filter(i => i.productId === p.id && i.status === 'in_stock').length;
        if (p.stock !== count) {
          return { ...p, stock: count };
        }
      }
      return p;
    });
  };

  const saveProducts = (newProds: Product[]) => {
    const synced = syncProductsStockWithImeis(newProds, imeis);
    setProducts(synced);
    localStorage.setItem('thinhphat_v2_products', JSON.stringify(synced));
    syncWithServer('products', synced);
  };

  const saveImeis = (newImeis: ProductIMEI[]) => {
    setImeis(newImeis);
    localStorage.setItem('thinhphat_v2_imeis', JSON.stringify(newImeis));
    syncWithServer('imeis', newImeis);

    // Synchronize product stock for products with hasImei
    setProducts(prevProducts => {
      const synced = syncProductsStockWithImeis(prevProducts, newImeis);
      localStorage.setItem('thinhphat_v2_products', JSON.stringify(synced));
      syncWithServer('products', synced);
      return synced;
    });
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

  const createSalesInvoiceFromRepair = (rep: RepairTicket, productsList: Product[]): SalesInvoice => {
    const invoiceItems: InvoiceItem[] = [];

    if (rep.usedParts && rep.usedParts.length > 0) {
      rep.usedParts.forEach(part => {
        const prod = productsList.find(p => p.id === part.productId || p.sku === part.productId || p.name === part.name);
        const warrMonths = part.warrantyMonths ?? prod?.warrantyMonths ?? 0;
        invoiceItems.push({
          productId: part.productId,
          productName: `Linh kiện: ${part.name}`,
          quantity: part.quantity,
          price: part.price,
          warrantyMonths: warrMonths,
          imeis: part.imei ? [part.imei] : undefined
        });
      });
    }

    const partsTotal = rep.usedParts ? rep.usedParts.reduce((sum, p) => sum + p.price * p.quantity, 0) : 0;
    const totalCost = rep.actualCost || rep.estimatedCost || 0;
    const laborFee = Math.max(0, totalCost - partsTotal);

    if (laborFee > 0 || invoiceItems.length === 0) {
      let laborWarrMonths = 0;
      if (rep.warrantyUntil) {
        const startDateStr = rep.deliveredAt || rep.createdAt.slice(0, 10);
        const startDate = new Date(startDateStr);
        const endDate = new Date(rep.warrantyUntil);
        const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 0) {
          if (diffDays <= 4) laborWarrMonths = 0.1;
          else if (diffDays <= 8) laborWarrMonths = 0.2;
          else if (diffDays <= 35) laborWarrMonths = 1;
          else if (diffDays <= 65) laborWarrMonths = 2;
          else if (diffDays <= 100) laborWarrMonths = 3;
          else if (diffDays <= 200) laborWarrMonths = 6;
          else if (diffDays <= 390) laborWarrMonths = 12;
          else if (diffDays <= 750) laborWarrMonths = 24;
          else if (diffDays <= 1120) laborWarrMonths = 36;
          else laborWarrMonths = Math.max(1, Math.round(diffDays / 30));
        }
      }

      invoiceItems.push({
        productId: `repair_labor_${rep.id}`,
        productName: `Chi phí kỹ thuật & sửa chữa: ${rep.deviceName}`,
        quantity: 1,
        price: laborFee > 0 ? laborFee : totalCost,
        warrantyMonths: laborWarrMonths
      });
    }

    const cleanTicketNum = rep.ticketNumber.replace(/^REP-/, '');
    const invoiceNum = `HD-REP-${cleanTicketNum}`;

    const linkedDebt = debts.find(d => 
      (d.invoiceId && (d.invoiceId === `inv_repair_${rep.id}` || d.invoiceId === rep.id)) ||
      (d.invoiceNumber && (d.invoiceNumber === invoiceNum || d.invoiceNumber === rep.ticketNumber || d.invoiceNumber.includes(cleanTicketNum))) ||
      (d.note && (d.note.includes(rep.ticketNumber) || d.note.includes(cleanTicketNum)))
    );

    const hasDebt = !!(rep.debtAmount && rep.debtAmount > 0) || !!(linkedDebt && linkedDebt.remainingAmount > 0);
    const calcDebtAmount = (rep.debtAmount && rep.debtAmount > 0) ? rep.debtAmount : (linkedDebt && linkedDebt.remainingAmount > 0 ? linkedDebt.remainingAmount : 0);

    return {
      id: `inv_repair_${rep.id}`,
      invoiceNumber: invoiceNum,
      customerId: rep.customerId,
      customerName: rep.customerName,
      customerPhone: rep.customerPhone,
      items: invoiceItems,
      totalAmount: totalCost,
      paymentMethod: hasDebt ? 'Ghi nợ' : 'Tiền mặt',
      createdAt: rep.deliveredAt ? new Date(rep.deliveredAt).toISOString() : rep.createdAt,
      note: `Xuất kho linh kiện & sửa chữa #${rep.ticketNumber} (${rep.deviceName}). Giải pháp: ${rep.solution || 'Thay thế linh kiện'}` + (hasDebt && calcDebtAmount ? ` [Ghi nợ sửa chữa: ${calcDebtAmount}₫]` : ''),
      processedBy: rep.processedBy || rep.technician || 'Kỹ thuật viên',
      debtAmount: hasDebt ? calcDebtAmount : 0,
      debtDueDate: rep.debtDueDate || linkedDebt?.dueDate
    };
  };

  // Auto-correct any PC build or Repair service warranty card duration if invoice items / replacement parts specify different warranty months & sync real IMEIs
  useEffect(() => {
    if (dbLoading) return;

    let hasWarrChange = false;
    let hasRepairChange = false;

    // 1. Sync repair tickets if warranty is empty and they have usedParts
    const updatedRepairs = repairs.map(rep => {
      if (!rep.warrantyUntil && rep.usedParts && rep.usedParts.length > 0) {
        let maxPartW = 0;
        rep.usedParts.forEach(pt => {
          const prod = products.find(p => p.id === pt.productId || p.sku === pt.productId || p.name === pt.name);
          const ptW = pt.warrantyMonths ?? prod?.warrantyMonths ?? 0;
          if (ptW > maxPartW) maxPartW = ptW;
        });

        if (maxPartW > 0) {
          const baseDate = rep.deliveredAt || rep.createdAt.slice(0, 10);
          const computedPartExpiry = computeExpiryDate(baseDate, maxPartW);

          hasRepairChange = true;
          return {
            ...rep,
            warrantyUntil: computedPartExpiry
          };
        }
      }
      return rep;
    });

    if (hasRepairChange) {
      saveRepairs(updatedRepairs);
    }

    // 2. Sync warranty cards
    if (warranties.length > 0) {
      let hasWarrChange = false;

      // Filter out orphaned warranty cards whose linked sales invoice has been deleted
      const cleanedWarranties = warranties.filter(w => {
        if (w.linkedInvoiceId && !invoices.some(i => i.id === w.linkedInvoiceId)) {
          hasWarrChange = true;
          return false;
        }

        const textToSearch = `${w.notes || ''} ${w.serialNumber || ''} ${w.productName || ''}`;
        const matchInvNum = textToSearch.match(/(HD-\d+|PC-\d+)/i);
        if (matchInvNum && matchInvNum[0]) {
          const referencedInvNum = matchInvNum[0].toUpperCase();
          const invExists = invoices.some(i => i.invoiceNumber.toUpperCase() === referencedInvNum);
          if (!invExists) {
            const isInvoiceGenerated = 
              !!w.linkedInvoiceId || 
              (w.notes && (w.notes.includes('Hoá đơn') || w.notes.includes('Hóa đơn') || w.notes.includes('Kích hoạt theo'))) ||
              w.productName.startsWith('Bộ Cấu Hình PC') ||
              w.serialNumber.includes('-HD-');

            if (isInvoiceGenerated) {
              hasWarrChange = true;
              return false;
            }
          }
        }
        return true;
      });

      const syncedWarrs = cleanedWarranties.map(w => {
        // First check if it's a repair service warranty card
        const matchedRepair = repairs.find(r => {
          if (w.linkedRepairId && r.id === w.linkedRepairId) return true;
          if (r.deviceSerial && w.serialNumber === r.deviceSerial) return true;
          if (r.ticketNumber) {
            const cleanTicket = r.ticketNumber.replace(/^REP-/, '');
            if (w.serialNumber.includes(cleanTicket) || w.serialNumber.includes(r.ticketNumber)) return true;
            if (w.notes && (w.notes.includes(cleanTicket) || w.notes.includes(r.ticketNumber))) return true;
          }
          if (w.customerName === r.customerName && (w.customerPhone === r.customerPhone || !w.customerPhone) && 
             (w.productName.includes(r.deviceName) || w.productName.includes('Dịch vụ'))) return true;
          return false;
        });

        if (matchedRepair) {
          let maxPartW = 0;
          if (matchedRepair.usedParts && matchedRepair.usedParts.length > 0) {
            matchedRepair.usedParts.forEach(pt => {
              const prod = products.find(p => 
                p.id === pt.productId || 
                p.sku === pt.productId || 
                p.name === pt.name ||
                pt.name.startsWith(p.name) ||
                p.name.startsWith(pt.name.split(' (S/N:')[0])
              );
              const ptW = pt.warrantyMonths ?? prod?.warrantyMonths ?? 0;
              if (ptW > maxPartW) maxPartW = ptW;
            });
          }

          if (maxPartW > 0) {
            const purchaseDate = w.purchaseDate || matchedRepair.deliveredAt || matchedRepair.createdAt.slice(0, 10);
            const correctPartExpiry = computeExpiryDate(purchaseDate, maxPartW);

            if (w.warrantyMonths !== maxPartW || w.expiryDate !== correctPartExpiry || w.linkedRepairId !== matchedRepair.id) {
              hasWarrChange = true;
              return {
                ...w,
                warrantyMonths: maxPartW,
                expiryDate: correctPartExpiry,
                linkedRepairId: matchedRepair.id
              };
            }
          }
        }

        // Next check PC builds and sales invoices
        const matchedInv = invoices.find(i => 
          (w.linkedInvoiceId && i.id === w.linkedInvoiceId) || 
          (w.serialNumber && w.serialNumber === i.invoiceNumber) ||
          (i.invoiceNumber.startsWith('PC-') && w.productName.includes(i.invoiceNumber))
        );

        if (matchedInv && matchedInv.items && matchedInv.items.length > 0) {
          if (matchedInv.invoiceNumber.startsWith('PC-') || w.productName.startsWith('Bộ Cấu Hình PC')) {
            const correctMaxWarr = matchedInv.items.reduce((max, item) => Math.max(max, item.warrantyMonths ?? 0), 0);
            const purchaseDate = w.purchaseDate || matchedInv.createdAt.slice(0, 10);
            const correctExpiryDate = computeExpiryDate(purchaseDate, correctMaxWarr);

            if (w.warrantyMonths !== correctMaxWarr || w.expiryDate !== correctExpiryDate) {
              hasWarrChange = true;
              return {
                ...w,
                warrantyMonths: correctMaxWarr,
                expiryDate: correctExpiryDate
              };
            }
          } else {
            // If a warranty card currently has a fake generated serial "IMEI-14digits" but the invoice item has real IMEIs, update serialNumber
            const matchedItem = matchedInv.items.find(it => it.productName === w.productName || it.productId === w.productName);
            if (matchedItem && matchedItem.imeis && matchedItem.imeis.length > 0) {
              const realImeisStr = matchedItem.imeis.join(', ');
              if (w.serialNumber !== realImeisStr && w.serialNumber.startsWith('IMEI-') && !matchedItem.imeis.includes(w.serialNumber)) {
                hasWarrChange = true;
                return {
                  ...w,
                  serialNumber: realImeisStr
                };
              }
            }
          }
        }
        return w;
      });

      if (hasWarrChange) {
        saveWarranties(syncedWarrs);
      }
    }

    // 3. Auto-sync repair tickets into sales invoices (Hoá đơn đã bán)
    let hasInvoiceSync = false;
    let nextInvoices = [...invoices];

    repairs.forEach(rep => {
      if ((rep.usedParts && rep.usedParts.length > 0) || rep.status === 'delivered' || rep.status === 'completed' || rep.actualCost > 0) {
        const repairInvId = `inv_repair_${rep.id}`;
        const cleanTicketNum = rep.ticketNumber ? rep.ticketNumber.replace(/^REP-/, '') : '';
        const existingIdx = nextInvoices.findIndex(inv => 
          inv.id === repairInvId || 
          inv.invoiceNumber === `HD-REP-${cleanTicketNum}` ||
          (inv.note && inv.note.includes(rep.ticketNumber))
        );

        const hasLinkedDebt = debts.some(d => 
          (d.invoiceId && (d.invoiceId === repairInvId || d.invoiceId === rep.id)) ||
          (d.invoiceNumber && d.invoiceNumber.includes(cleanTicketNum)) ||
          (d.note && d.note.includes(rep.ticketNumber))
        );

        if (existingIdx > -1) {
          const repairInv = createSalesInvoiceFromRepair(rep, products);
          const curr = nextInvoices[existingIdx];
          if (
            curr.totalAmount !== repairInv.totalAmount ||
            curr.items.length !== repairInv.items.length ||
            curr.customerName !== repairInv.customerName ||
            curr.customerPhone !== repairInv.customerPhone ||
            curr.paymentMethod !== repairInv.paymentMethod ||
            curr.debtAmount !== repairInv.debtAmount
          ) {
            nextInvoices[existingIdx] = {
              ...curr,
              ...repairInv,
              id: curr.id
            };
            hasInvoiceSync = true;
          }
        } else if ((rep.debtAmount && rep.debtAmount > 0) || hasLinkedDebt) {
          const repairInv = createSalesInvoiceFromRepair(rep, products);
          nextInvoices.unshift(repairInv);
          hasInvoiceSync = true;
        }
      }
    });

    if (hasInvoiceSync) {
      saveInvoices(nextInvoices);
    }

    // 4. Auto-sync & deduplicate debts with repair tickets and sales invoices
    let nextDebts = [...debts];

    repairs.forEach(rep => {
      if (rep.debtAmount && rep.debtAmount > 0) {
        const cleanTicketNum = cleanDocNumber(rep.ticketNumber);
        const invId = `inv_repair_${rep.id}`;
        const invNum = `HD-REP-${cleanTicketNum}`;

        const existingIdx = nextDebts.findIndex(d => isRepairMatchDebt(rep, d));

        if (existingIdx === -1) {
          nextDebts.unshift({
            id: `debt_${Date.now()}_rep_${rep.id}`,
            invoiceId: invId,
            invoiceNumber: invNum,
            customerId: rep.customerId,
            customerName: rep.customerName,
            customerPhone: rep.customerPhone,
            amount: rep.actualCost || rep.estimatedCost,
            remainingAmount: rep.debtAmount,
            dueDate: rep.debtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            status: rep.debtAmount === (rep.actualCost || rep.estimatedCost) ? 'pending' : 'partial',
            createdAt: rep.deliveredAt ? new Date(rep.deliveredAt).toISOString() : rep.createdAt,
            note: `Công nợ sửa chữa thiết bị: ${rep.deviceName} (#${rep.ticketNumber})`
          });
        }
      }
    });

    nextInvoices.forEach(inv => {
      if (inv.debtAmount && inv.debtAmount > 0) {
        const existingIdx = nextDebts.findIndex(d => isInvoiceMatchDebt(inv, d));

        if (existingIdx === -1) {
          nextDebts.unshift({
            id: `debt_${Date.now()}_inv_${inv.id}`,
            invoiceId: inv.id,
            invoiceNumber: inv.invoiceNumber,
            customerId: inv.customerId,
            customerName: inv.customerName,
            customerPhone: inv.customerPhone,
            amount: inv.totalAmount,
            remainingAmount: inv.debtAmount,
            dueDate: inv.debtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            status: inv.debtAmount === inv.totalAmount ? 'pending' : 'partial',
            createdAt: inv.createdAt,
            note: `Công nợ hóa đơn #${inv.invoiceNumber}` + (inv.note ? ` - ${inv.note}` : '')
          });
        }
      }
    });

    // Run deep deduplication & 2-way sync across all debts/invoices/repairs
    const { cleanedDebts, cleanedInvoices, cleanedRepairs, hasChanged } = deduplicateAndSyncDebts(
      nextDebts,
      nextInvoices,
      repairs
    );

    if (hasChanged || cleanedDebts.length !== debts.length) {
      saveDebts(cleanedDebts);
    }
    if (cleanedInvoices.some((inv, idx) => inv.debtAmount !== nextInvoices[idx]?.debtAmount)) {
      saveInvoices(cleanedInvoices);
    }
    if (cleanedRepairs.some((rep, idx) => rep.debtAmount !== repairs[idx]?.debtAmount)) {
      saveRepairs(cleanedRepairs);
    }
  }, [dbLoading, invoices, warranties, repairs, products, debts]);

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

  const saveDebts = (newDebts: Debt[]) => {
    setDebts(newDebts);
    localStorage.setItem('thinhphat_v2_debts', JSON.stringify(newDebts));
    syncWithServer('debts', newDebts);
  };

  const saveSuppliers = (newSuppliers: Supplier[]) => {
    setSuppliers(newSuppliers);
    localStorage.setItem('thinhphat_v2_suppliers', JSON.stringify(newSuppliers));
    syncWithServer('suppliers', newSuppliers);
  };

  const saveActivities = (newActivities: StaffActivityLog[]) => {
    setActivities(newActivities);
    localStorage.setItem('thinhphat_v2_activities', JSON.stringify(newActivities));
    syncWithServer('activities', newActivities);
  };

  const logActivity = (
    type: ActivityType,
    title: string,
    details: string,
    amount?: number,
    severity: 'info' | 'success' | 'warning' | 'danger' = 'info',
    actorOverride?: { id: string; name: string; role: UserRole }
  ) => {
    const actorName = actorOverride?.name || currentUser?.fullName || 'Nhân viên';
    const actorId = actorOverride?.id || currentUser?.id || 'unknown';
    const actorRole = actorOverride?.role || currentUser?.role || 'sales';

    const newLog: StaffActivityLog = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      userId: actorId,
      userName: actorName,
      userRole: actorRole,
      type,
      title,
      details,
      amount,
      readByOwner: false,
      severity
    };

    setActivities(prev => {
      const updated = [newLog, ...prev].slice(0, 300);
      localStorage.setItem('thinhphat_v2_activities', JSON.stringify(updated));
      syncWithServer('activities', updated);
      return updated;
    });
  };

  const handleMarkLogRead = (id?: string) => {
    setActivities(prev => {
      const updated = prev.map(a => (!id || a.id === id ? { ...a, readByOwner: true } : a));
      localStorage.setItem('thinhphat_v2_activities', JSON.stringify(updated));
      syncWithServer('activities', updated);
      return updated;
    });
  };

  const handleClearLogs = () => {
    setActivities([]);
    localStorage.setItem('thinhphat_v2_activities', JSON.stringify([]));
    syncWithServer('activities', []);
  };

  const handleAddUser = (u: Omit<User, 'id' | 'createdAt'>) => {
    const payload: User = {
      ...u,
      id: `usr_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    saveUsers([...users, payload]);
    logActivity('user', 'Thêm tài khoản nhân viên mới', `Họ tên: ${u.fullName} (@${u.username}) - Vai trò: ${u.role}`, undefined, 'warning');
  };

  const handleUpdateUser = (updatedUser: User) => {
    const updated = users.map(u => u.id === updatedUser.id ? updatedUser : u);
    saveUsers(updated);
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUser(updatedUser);
      localStorage.setItem('thinhphat_v2_current_user', JSON.stringify(updatedUser));
    }
    logActivity('user', 'Cập nhật tài khoản & phân quyền nhân viên', `Họ tên: ${updatedUser.fullName} (@${updatedUser.username}) - Vai trò: ${updatedUser.role}`, undefined, 'warning');
  };

  const handleDeleteUser = (id: string) => {
    const targetUser = users.find(u => u.id === id);
    const updated = users.filter(u => u.id !== id);
    saveUsers(updated);
    logActivity('user', 'Xóa tài khoản nhân viên', `Tài khoản: ${targetUser ? targetUser.fullName : id}`, undefined, 'danger');
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
    saveProducts([payload, ...products]);
    logActivity('inventory', 'Thêm sản phẩm mới vào kho', `Tên: ${newProd.name} (SKU: ${newProd.sku || '---'}) - Giá bán: ${newProd.price.toLocaleString('vi-VN')}đ - Tồn ban đầu: ${newProd.stock}`, newProd.price, 'info');
  };

  const handleUpdateProduct = (updatedProd: Product) => {
    const updated = products.map(p => p.id === updatedProd.id ? updatedProd : p);
    saveProducts(updated);
    logActivity('inventory', 'Chỉnh sửa thông tin sản phẩm', `Sản phẩm: ${updatedProd.name} (SKU: ${updatedProd.sku || '---'}) - Giá: ${updatedProd.price.toLocaleString('vi-VN')}đ`, updatedProd.price, 'info');
  };

  const handleDeleteProduct = (id: string) => {
    const targetProd = products.find(p => p.id === id);
    const updated = products.filter(p => p.id !== id);
    saveProducts(updated);
    logActivity('inventory', 'Xóa sản phẩm khỏi kho', `Đã xóa sản phẩm: ${targetProd ? targetProd.name : id}`, undefined, 'danger');
  };

  const handleAddCategory = (name: string) => {
    const newCat: Category = {
      id: `cat_${Date.now()}`,
      name
    };
    saveCategories([...categories, newCat]);
    logActivity('inventory', 'Thêm danh mục sản phẩm', `Danh mục mới: ${name}`, undefined, 'info');
  };

  const handleUpdateCategory = (id: string, newName: string) => {
    const updated = categories.map(c => c.id === id ? { ...c, name: newName } : c);
    saveCategories(updated);
    logActivity('inventory', 'Cập nhật danh mục sản phẩm', `Đổi tên danh mục -> ${newName}`, undefined, 'info');
  };

  const handleDeleteCategory = (id: string) => {
    const targetCat = categories.find(c => c.id === id);
    const updated = categories.filter(c => c.id !== id);
    saveCategories(updated);
    logActivity('inventory', 'Xóa danh mục sản phẩm', `Danh mục: ${targetCat ? targetCat.name : id}`, undefined, 'danger');
  };

  const handleUpdateProductStock = (id: string, newStock: number) => {
    const targetProd = products.find(p => p.id === id);
    const updated = products.map(p => p.id === id ? { ...p, stock: newStock } : p);
    saveProducts(updated);
    logActivity('inventory', 'Điều chỉnh số lượng hàng tồn kho', `Sản phẩm: ${targetProd ? targetProd.name : id} -> Tồn kho mới: ${newStock}`, undefined, 'warning');
  };

  const handleAddInvoice = (newInvoice: SalesInvoice) => {
    saveInvoices([...invoices, newInvoice]);
    logActivity('sale', 'Bán hàng - Tạo hóa đơn POS mới', `Số HĐ: #${newInvoice.invoiceNumber} - Khách: ${newInvoice.customerName} - SĐT: ${newInvoice.customerPhone || 'Không có'} - ${newInvoice.items.length} mặt hàng`, newInvoice.totalAmount, 'success');

    // Track debt if debtAmount > 0
    if (newInvoice.debtAmount && newInvoice.debtAmount > 0) {
      const newDebt: Debt = {
        id: `debt_${Date.now()}`,
        invoiceId: newInvoice.id,
        invoiceNumber: newInvoice.invoiceNumber,
        customerId: newInvoice.customerId,
        customerName: newInvoice.customerName,
        customerPhone: newInvoice.customerPhone,
        amount: newInvoice.totalAmount,
        remainingAmount: newInvoice.debtAmount,
        dueDate: newInvoice.debtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        status: newInvoice.debtAmount === newInvoice.totalAmount ? 'pending' : 'partial',
        createdAt: newInvoice.createdAt,
        note: `Công nợ hóa đơn #${newInvoice.invoiceNumber}` + (newInvoice.note ? ` - ${newInvoice.note}` : '')
      };
      saveDebts([...debts, newDebt]);
    }

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
        const maxWarr = newInvoice.items.reduce((max, item) => Math.max(max, item.warrantyMonths ?? 0), 0);
        const purchaseDate = newInvoice.createdAt.slice(0, 10);
        const expiryDateStr = computeExpiryDate(purchaseDate, maxWarr);
        
        const card: WarrantyCard = {
          id: `warr_${Date.now()}_pc`,
          serialNumber: newInvoice.invoiceNumber,
          productName: `Bộ Cấu Hình PC - ${newInvoice.invoiceNumber}`,
          customerName: newInvoice.customerName,
          customerPhone: newInvoice.customerPhone,
          purchaseDate,
          warrantyMonths: maxWarr,
          expiryDate: expiryDateStr,
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
          const expiryDateStr = computeExpiryDate(purchaseDate, warrMonths);
          
          if (item.imeis && item.imeis.length > 0) {
            // Create warranty record for each actual product IMEI
            item.imeis.forEach((imeiStr, iIdx) => {
              const card: WarrantyCard = {
                id: `warr_${Date.now()}_${iIdx}_${Math.random().toString(36).substr(2, 5)}`,
                serialNumber: imeiStr.trim(),
                productName: item.productName,
                customerName: newInvoice.customerName,
                customerPhone: newInvoice.customerPhone,
                purchaseDate,
                warrantyMonths: warrMonths,
                expiryDate: expiryDateStr,
                status: 'active',
                notes: `Kích hoạt theo Hoá đơn ${newInvoice.invoiceNumber}`,
                linkedInvoiceId: newInvoice.id
              };
              updatedWarranties.push(card);
            });
          } else {
            // Product item without IMEI
            const serialStr = prod?.sku ? `${prod.sku}-${newInvoice.invoiceNumber}` : `${newInvoice.invoiceNumber}-${item.productId}`;
            const card: WarrantyCard = {
              id: `warr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
              serialNumber: serialStr,
              productName: item.productName,
              customerName: newInvoice.customerName,
              customerPhone: newInvoice.customerPhone,
              purchaseDate,
              warrantyMonths: warrMonths,
              expiryDate: expiryDateStr,
              status: 'active',
              notes: `Từ Hoá đơn số ${newInvoice.invoiceNumber}`,
              linkedInvoiceId: newInvoice.id
            };
            updatedWarranties.push(card);
          }
        }
      });
    }

    if (updatedWarranties.length > warranties.length) {
      saveWarranties(updatedWarranties);
    }
  };

  const handleUpdateInvoice = (updatedInvoice: SalesInvoice) => {
    const oldInvoice = invoices.find(inv => inv.id === updatedInvoice.id);
    if (!oldInvoice) return;

    let updatedProducts = [...products];
    let updatedImeis = [...imeis];

    // Revert old items stock & IMEIs
    oldInvoice.items.forEach(item => {
      const prod = updatedProducts.find(p => p.id === item.productId);
      if (prod) {
        if (!prod.hasImei) {
          prod.stock += item.quantity;
        }
        if (prod.hasImei && item.imeis && item.imeis.length > 0) {
          item.imeis.forEach(im => {
            const idx = updatedImeis.findIndex(i => i.productId === prod.id && i.imei === im);
            if (idx > -1) {
              updatedImeis[idx] = { ...updatedImeis[idx], status: 'in_stock', invoiceId: undefined };
            }
          });
        }
      }
    });

    // Deduct new items stock & IMEIs
    updatedInvoice.items.forEach(item => {
      const prod = updatedProducts.find(p => p.id === item.productId);
      if (prod) {
        if (!prod.hasImei) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
        }
        if (prod.hasImei && item.imeis && item.imeis.length > 0) {
          item.imeis.forEach(im => {
            const idx = updatedImeis.findIndex(i => i.productId === prod.id && i.imei === im);
            if (idx > -1) {
              updatedImeis[idx] = { ...updatedImeis[idx], status: 'sold', invoiceId: updatedInvoice.id };
            }
          });
        }
      }
    });

    updatedProducts = syncProductsStockWithImeis(updatedProducts, updatedImeis);

    saveProducts(updatedProducts);
    saveImeis(updatedImeis);

    const nextInvoices = invoices.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv);
    saveInvoices(nextInvoices);

    // Sync linked debt if exists
    const existingDebtIdx = debts.findIndex(d => isInvoiceMatchDebt(updatedInvoice, d));

    if (updatedInvoice.debtAmount && updatedInvoice.debtAmount > 0) {
      if (existingDebtIdx > -1) {
        const nextDebts = [...debts];
        const existing = nextDebts[existingDebtIdx];
        const totalPaid = (existing.payments || []).reduce((sum, p) => sum + p.amount, 0);
        const newRemaining = Math.max(0, updatedInvoice.debtAmount - totalPaid);

        nextDebts[existingDebtIdx] = {
          ...existing,
          amount: updatedInvoice.totalAmount,
          remainingAmount: newRemaining,
          status: newRemaining === 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending'),
          customerName: updatedInvoice.customerName,
          customerPhone: updatedInvoice.customerPhone,
          note: `Công nợ hóa đơn #${updatedInvoice.invoiceNumber}` + (updatedInvoice.note ? ` - ${updatedInvoice.note}` : '')
        };
        saveDebts(nextDebts);
      } else {
        const newDebt: Debt = {
          id: `debt_${Date.now()}`,
          invoiceId: updatedInvoice.id,
          invoiceNumber: updatedInvoice.invoiceNumber,
          customerId: updatedInvoice.customerId,
          customerName: updatedInvoice.customerName,
          customerPhone: updatedInvoice.customerPhone,
          amount: updatedInvoice.totalAmount,
          remainingAmount: updatedInvoice.debtAmount,
          dueDate: updatedInvoice.debtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: updatedInvoice.debtAmount === updatedInvoice.totalAmount ? 'pending' : 'partial',
          createdAt: updatedInvoice.createdAt,
          note: `Công nợ hóa đơn #${updatedInvoice.invoiceNumber}` + (updatedInvoice.note ? ` - ${updatedInvoice.note}` : '')
        };
        saveDebts([...debts, newDebt]);
      }
    } else if (existingDebtIdx > -1) {
      const nextDebts = [...debts];
      const existing = nextDebts[existingDebtIdx];
      nextDebts[existingDebtIdx] = {
        ...existing,
        remainingAmount: 0,
        status: 'paid'
      };
      saveDebts(nextDebts);
    }

    // Sync linked warranty cards if updated
    const linkedWarrIdx = warranties.findIndex(w => 
      (w.linkedInvoiceId && w.linkedInvoiceId === updatedInvoice.id) ||
      (w.serialNumber && w.serialNumber === updatedInvoice.invoiceNumber) ||
      (updatedInvoice.invoiceNumber.startsWith('PC-') && w.productName.includes(updatedInvoice.invoiceNumber))
    );
    if (linkedWarrIdx > -1) {
      const nextWarrs = [...warranties];
      const targetWarr = nextWarrs[linkedWarrIdx];
      const correctMaxWarr = updatedInvoice.items.length > 0 
        ? updatedInvoice.items.reduce((max, item) => Math.max(max, item.warrantyMonths ?? 0), 0)
        : 0;
      const purchaseDate = targetWarr.purchaseDate || updatedInvoice.createdAt.slice(0, 10);
      const correctExpiryDate = computeExpiryDate(purchaseDate, correctMaxWarr);

      nextWarrs[linkedWarrIdx] = {
        ...targetWarr,
        customerName: updatedInvoice.customerName,
        customerPhone: updatedInvoice.customerPhone,
        warrantyMonths: correctMaxWarr,
        expiryDate: correctExpiryDate
      };
      saveWarranties(nextWarrs);
    }

    logActivity(
      'sale',
      'Chỉnh sửa hóa đơn bán hàng',
      `Cập nhật thông tin hóa đơn ${updatedInvoice.invoiceNumber} (${updatedInvoice.customerName}) - Tổng tiền: ${updatedInvoice.totalAmount.toLocaleString('vi-VN')}đ`,
      updatedInvoice.totalAmount,
      'warning'
    );
  };

  const handleDeleteInvoice = (invoiceId: string) => {
    const targetInvoice = invoices.find(inv => inv.id === invoiceId);
    if (!targetInvoice) return;

    let updatedProducts = [...products];
    let updatedImeis = [...imeis];

    // Revert stock & IMEIs
    targetInvoice.items.forEach(item => {
      const prod = updatedProducts.find(p => p.id === item.productId);
      if (prod) {
        if (!prod.hasImei) {
          prod.stock += item.quantity;
        }
        if (prod.hasImei && item.imeis && item.imeis.length > 0) {
          item.imeis.forEach(im => {
            const idx = updatedImeis.findIndex(i => i.productId === prod.id && i.imei === im);
            if (idx > -1) {
              updatedImeis[idx] = { ...updatedImeis[idx], status: 'in_stock', invoiceId: undefined };
            }
          });
        }
      }
    });

    updatedProducts = syncProductsStockWithImeis(updatedProducts, updatedImeis);

    saveProducts(updatedProducts);
    saveImeis(updatedImeis);

    const nextInvoices = invoices.filter(inv => inv.id !== invoiceId);
    saveInvoices(nextInvoices);

    const nextDebts = debts.filter(d => !isInvoiceMatchDebt(targetInvoice, d));
    saveDebts(nextDebts);

    // Also clear debtAmount on any linked repair ticket
    let repairsChanged = false;
    const nextRepairs = repairs.map(rep => {
      if (
        targetInvoice.id === `inv_repair_${rep.id}` ||
        (targetInvoice.invoiceNumber && (targetInvoice.invoiceNumber.includes(rep.ticketNumber) || targetInvoice.invoiceNumber.includes(rep.ticketNumber.replace(/^REP-/, '')))) ||
        (targetInvoice.note && targetInvoice.note.includes(rep.ticketNumber))
      ) {
        if (rep.debtAmount && rep.debtAmount > 0) {
          repairsChanged = true;
          return {
            ...rep,
            debtAmount: 0,
            debtDueDate: undefined
          };
        }
      }
      return rep;
    });

    if (repairsChanged) {
      saveRepairs(nextRepairs);
    }

    // Also remove linked warranty cards
    const invNum = targetInvoice.invoiceNumber;
    const nextWarranties = warranties.filter(w => !(
      (w.linkedInvoiceId && w.linkedInvoiceId === targetInvoice.id) ||
      (w.serialNumber && (w.serialNumber === invNum || w.serialNumber.endsWith(`-${invNum}`))) ||
      (w.notes && invNum && w.notes.includes(invNum)) ||
      (invNum && w.productName.includes(invNum))
    ));
    saveWarranties(nextWarranties);

    logActivity(
      'sale',
      'Xóa hóa đơn bán hàng',
      `Đã xóa vĩnh viễn hóa đơn ${targetInvoice.invoiceNumber} (${targetInvoice.customerName}) - Hoàn trả tồn kho & thu hồi bảo hành`,
      targetInvoice.totalAmount,
      'danger'
    );
  };

  const handleDeleteWarranty = (id: string) => {
    const targetWarr = warranties.find(w => w.id === id);
    const nextWarranties = warranties.filter(w => w.id !== id);
    saveWarranties(nextWarranties);
    if (targetWarr) {
      logActivity(
        'sale',
        'Xóa thẻ bảo hành',
        `Admin ${currentUser?.fullName || ''} đã xóa thẻ bảo hành ${targetWarr.productName} (S/N: ${targetWarr.serialNumber})`,
        0,
        'danger'
      );
    }
  };

  const cleanDocNumber = (str?: string) => {
    if (!str) return '';
    return str
      .replace(/^#+/, '')
      .trim()
      .replace(/^(HD|REP|PC|HD-REP|HD-PC|BUILD|PC-BUILD)-?/i, '')
      .replace(/^#+/, '')
      .trim();
  };

  const isInvoiceMatchDebt = (i: SalesInvoice, targetDebt: Debt) => {
    if (!i || !targetDebt) return false;

    if (targetDebt.invoiceId && (i.id === targetDebt.invoiceId || targetDebt.invoiceId.endsWith(i.id) || i.id.endsWith(targetDebt.invoiceId))) {
      return true;
    }
    if (targetDebt.id && (targetDebt.id.includes(i.id) || i.id.includes(targetDebt.id))) {
      return true;
    }

    const cleanDebtNum = cleanDocNumber(targetDebt.invoiceNumber);
    const cleanInvNum = cleanDocNumber(i.invoiceNumber);

    // If both have document numbers, check if clean numbers match. If both exist and differ, DO NOT match!
    if (cleanDebtNum && cleanInvNum) {
      if (cleanDebtNum === cleanInvNum || cleanDebtNum.endsWith(cleanInvNum) || cleanInvNum.endsWith(cleanDebtNum)) {
        return true;
      }
      return false; // Different document numbers MUST NOT match!
    }

    if (targetDebt.invoiceNumber && i.invoiceNumber) {
      if (targetDebt.invoiceNumber === i.invoiceNumber) return true;
      return false;
    }

    if (targetDebt.note && (i.invoiceNumber && targetDebt.note.includes(i.invoiceNumber) || (cleanInvNum && targetDebt.note.includes(cleanInvNum)))) {
      return true;
    }
    if (i.note && (targetDebt.invoiceNumber && i.note.includes(targetDebt.invoiceNumber) || (cleanDebtNum && i.note.includes(cleanDebtNum)))) {
      return true;
    }

    // Only if document numbers are missing on one or both, fallback to customer + totalAmount + createdAt match
    if (targetDebt.customerId && i.customerId === targetDebt.customerId) {
      if (i.totalAmount === targetDebt.amount && i.createdAt === targetDebt.createdAt) {
        return true;
      }
    }

    return false;
  };

  const isRepairMatchDebt = (r: RepairTicket, targetDebt: Debt) => {
    if (!r || !targetDebt) return false;

    if (targetDebt.invoiceId && (targetDebt.invoiceId === `inv_repair_${r.id}` || targetDebt.invoiceId.includes(r.id))) {
      return true;
    }
    if (targetDebt.id && targetDebt.id.includes(r.id)) {
      return true;
    }

    const cleanTicketNum = cleanDocNumber(r.ticketNumber);
    const cleanDebtNum = cleanDocNumber(targetDebt.invoiceNumber);

    if (cleanDebtNum && cleanTicketNum) {
      if (cleanDebtNum === cleanTicketNum || cleanDebtNum.endsWith(cleanTicketNum) || cleanTicketNum.endsWith(cleanDebtNum)) {
        return true;
      }
      return false; // Different ticket/debt numbers MUST NOT match!
    }

    if (targetDebt.invoiceNumber && (targetDebt.invoiceNumber === `HD-REP-${cleanTicketNum}` || targetDebt.invoiceNumber.includes(r.ticketNumber))) {
      return true;
    }

    if (targetDebt.note && (r.ticketNumber && targetDebt.note.includes(r.ticketNumber) || (cleanTicketNum && targetDebt.note.includes(cleanTicketNum)))) {
      return true;
    }

    if (targetDebt.customerId && r.customerId === targetDebt.customerId) {
      if ((r.actualCost || r.estimatedCost) === targetDebt.amount && r.createdAt === targetDebt.createdAt) {
        return true;
      }
    }

    return false;
  };

  const deduplicateAndSyncDebts = (
    allDebts: Debt[],
    allInvoices: SalesInvoice[],
    allRepairs: RepairTicket[]
  ): {
    cleanedDebts: Debt[];
    cleanedInvoices: SalesInvoice[];
    cleanedRepairs: RepairTicket[];
    hasChanged: boolean;
  } => {
    let hasChanged = false;
    let nextInvoices = [...allInvoices];
    let nextRepairs = [...allRepairs];

    // 1. Group duplicate debts together
    const debtGroups: Debt[][] = [];

    allDebts.forEach(debt => {
      const cleanNum = cleanDocNumber(debt.invoiceNumber);

      const matchingGroup = debtGroups.find(group => {
        return group.some(existing => {
          if (existing.id === debt.id) return true;

          const existingClean = cleanDocNumber(existing.invoiceNumber);

          // If both have document numbers, check if clean numbers match. If both exist and differ, DO NOT group!
          if (cleanNum && existingClean) {
            return cleanNum === existingClean || cleanNum.endsWith(existingClean) || existingClean.endsWith(cleanNum);
          }

          if (debt.invoiceId && existing.invoiceId && (debt.invoiceId === existing.invoiceId || debt.invoiceId.endsWith(existing.invoiceId) || existing.invoiceId.endsWith(debt.invoiceId))) return true;

          if (debt.invoiceNumber && existing.invoiceNumber && debt.invoiceNumber === existing.invoiceNumber) return true;

          if (!cleanNum && !existingClean && debt.customerId && existing.customerId && debt.customerId === existing.customerId) {
            if (debt.amount === existing.amount && debt.createdAt === existing.createdAt) return true;
          }

          return false;
        });
      });

      if (matchingGroup) {
        matchingGroup.push(debt);
      } else {
        debtGroups.push([debt]);
      }
    });

    // 2. Consolidate each group
    const consolidatedDebts: Debt[] = debtGroups.map(group => {
      if (group.length === 1) return group[0];

      hasChanged = true;

      // Prefer paid record or record with payments or lowest remaining amount
      group.sort((a, b) => {
        if (a.remainingAmount !== b.remainingAmount) return a.remainingAmount - b.remainingAmount;
        const aPayments = (a.payments || []).length;
        const bPayments = (b.payments || []).length;
        if (aPayments !== bPayments) return bPayments - aPayments;
        return b.id.localeCompare(a.id);
      });

      const primary = group[0];

      // Merge all unique payments
      const allPayments: DebtPayment[] = [];
      group.forEach(g => {
        (g.payments || []).forEach(p => {
          if (!allPayments.some(ap => ap.id === p.id || (ap.paidAt === p.paidAt && ap.amount === p.amount))) {
            allPayments.push(p);
          }
        });
      });

      const totalPaidFromPayments = allPayments.reduce((sum, p) => sum + p.amount, 0);
      const newRemaining = Math.max(0, primary.amount - totalPaidFromPayments);

      return {
        ...primary,
        remainingAmount: newRemaining,
        status: newRemaining === 0 ? ('paid' as const) : (totalPaidFromPayments > 0 ? ('partial' as const) : ('pending' as const)),
        payments: allPayments
      };
    });

    // 3. Two-way strict sync between consolidatedDebts and Invoices/Repairs
    consolidatedDebts.forEach((debt, dIdx) => {
      // Find matching invoice
      const invIdx = nextInvoices.findIndex(i => isInvoiceMatchDebt(i, debt));
      if (invIdx > -1) {
        const inv = nextInvoices[invIdx];
        if (inv.debtAmount === 0 && debt.remainingAmount > 0) {
          consolidatedDebts[dIdx] = {
            ...debt,
            remainingAmount: 0,
            status: 'paid'
          };
          hasChanged = true;
        } else if (debt.remainingAmount === 0 && inv.debtAmount && inv.debtAmount > 0) {
          nextInvoices[invIdx] = {
            ...inv,
            debtAmount: 0,
            paymentMethod: inv.paymentMethod === 'Ghi nợ' ? 'Tiền mặt' : inv.paymentMethod
          };
          hasChanged = true;
        } else if (inv.debtAmount !== debt.remainingAmount) {
          nextInvoices[invIdx] = {
            ...inv,
            debtAmount: debt.remainingAmount
          };
          hasChanged = true;
        }
      }

      // Find matching repair
      const repIdx = nextRepairs.findIndex(r => isRepairMatchDebt(r, debt));
      if (repIdx > -1) {
        const rep = nextRepairs[repIdx];
        if (rep.debtAmount === 0 && debt.remainingAmount > 0) {
          consolidatedDebts[dIdx] = {
            ...debt,
            remainingAmount: 0,
            status: 'paid'
          };
          hasChanged = true;
        } else if (debt.remainingAmount === 0 && rep.debtAmount && rep.debtAmount > 0) {
          nextRepairs[repIdx] = {
            ...rep,
            debtAmount: 0
          };
          hasChanged = true;
        } else if (rep.debtAmount !== debt.remainingAmount) {
          nextRepairs[repIdx] = {
            ...rep,
            debtAmount: debt.remainingAmount
          };
          hasChanged = true;
        }
      }
    });

    return {
      cleanedDebts: consolidatedDebts,
      cleanedInvoices: nextInvoices,
      cleanedRepairs: nextRepairs,
      hasChanged
    };
  };

  const handleUpdateDebts = (updatedDebts: Debt[]) => {
    const { cleanedDebts, cleanedInvoices, cleanedRepairs } = deduplicateAndSyncDebts(
      updatedDebts,
      invoices,
      repairs
    );

    saveInvoices(cleanedInvoices);
    saveRepairs(cleanedRepairs);
    saveDebts(cleanedDebts);
  };

  const handleDeleteDebt = (debtId: string) => {
    const targetDebt = debts.find(d => d.id === debtId);
    if (!targetDebt) return;

    const nextDebts = debts.filter(d => d.id !== debtId);
    handleUpdateDebts(nextDebts);

    logActivity(
      'debt',
      'Xóa bản ghi công nợ',
      `Admin ${currentUser?.fullName || ''} đã xóa bản ghi công nợ #${targetDebt.invoiceNumber || targetDebt.id} - Khách: ${targetDebt.customerName}`,
      targetDebt.remainingAmount,
      'danger'
    );
  };

  const handleAddRepair = (ticket: RepairTicket) => {
    saveRepairs([...repairs, ticket]);
    logActivity('repair', 'Tiếp nhận thiết bị sửa chữa mới', `Mã phiếu: #${ticket.ticketNumber} - Khách: ${ticket.customerName} (${ticket.customerPhone}) - Thiết bị: ${ticket.deviceName} - Lỗi: ${ticket.issueDescription}`, ticket.estimatedCost, 'info');
  };

  const handleUpdateRepairTicket = (updatedTicket: RepairTicket) => {
    const updated = repairs.map(rep => rep.id === updatedTicket.id ? updatedTicket : rep);
    saveRepairs(updated);

    // Sync linked debt if exists
    const cleanTicketNum = updatedTicket.ticketNumber.replace(/^REP-/, '');
    const invId = `inv_repair_${updatedTicket.id}`;
    const invNum = `HD-REP-${cleanTicketNum}`;

    const existingDebtIdx = debts.findIndex(d => 
      (d.invoiceId && d.invoiceId === invId) ||
      (d.invoiceNumber && d.invoiceNumber === invNum) ||
      (d.note && (d.note.includes(updatedTicket.ticketNumber) || d.note.includes(cleanTicketNum)))
    );

    if (updatedTicket.debtAmount && updatedTicket.debtAmount > 0) {
      if (existingDebtIdx > -1) {
        const nextDebts = [...debts];
        nextDebts[existingDebtIdx] = {
          ...nextDebts[existingDebtIdx],
          invoiceId: invId,
          invoiceNumber: invNum,
          customerId: updatedTicket.customerId,
          customerName: updatedTicket.customerName,
          customerPhone: updatedTicket.customerPhone,
          amount: updatedTicket.actualCost || updatedTicket.estimatedCost,
          remainingAmount: updatedTicket.debtAmount,
          dueDate: updatedTicket.debtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          note: `Công nợ sửa chữa thiết bị: ${updatedTicket.deviceName} (#${updatedTicket.ticketNumber})`
        };
        saveDebts(nextDebts);
      } else {
        const newDebt: Debt = {
          id: `debt_${Date.now()}`,
          invoiceId: invId,
          invoiceNumber: invNum,
          customerId: updatedTicket.customerId,
          customerName: updatedTicket.customerName,
          customerPhone: updatedTicket.customerPhone,
          amount: updatedTicket.actualCost || updatedTicket.estimatedCost,
          remainingAmount: updatedTicket.debtAmount,
          dueDate: updatedTicket.debtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: updatedTicket.debtAmount === (updatedTicket.actualCost || updatedTicket.estimatedCost) ? 'pending' : 'partial',
          createdAt: updatedTicket.deliveredAt ? new Date(updatedTicket.deliveredAt).toISOString() : new Date().toISOString(),
          note: `Công nợ sửa chữa thiết bị: ${updatedTicket.deviceName} (#${updatedTicket.ticketNumber})`
        };
        saveDebts([...debts, newDebt]);
      }
    } else if (existingDebtIdx > -1) {
      const nextDebts = debts.filter((_, idx) => idx !== existingDebtIdx);
      saveDebts(nextDebts);
    }

    if (updatedTicket.warrantyUntil) {
      const startDateStr = updatedTicket.deliveredAt || updatedTicket.createdAt.slice(0, 10);
      const endDateStr = updatedTicket.warrantyUntil;
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const diffDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
      let computedMonths = 3;
      if (diffDays <= 4) computedMonths = 0.1;
      else if (diffDays <= 8) computedMonths = 0.2;
      else if (diffDays <= 35) computedMonths = 1;
      else if (diffDays <= 65) computedMonths = 2;
      else if (diffDays <= 100) computedMonths = 3;
      else if (diffDays <= 200) computedMonths = 6;
      else if (diffDays <= 390) computedMonths = 12;
      else if (diffDays <= 750) computedMonths = 24;
      else if (diffDays <= 1120) computedMonths = 36;
      else computedMonths = Math.max(1, Math.round(diffDays / 30));

      const existingIdx = warranties.findIndex(w => w.linkedRepairId === updatedTicket.id || w.serialNumber === (updatedTicket.deviceSerial || `REP-${updatedTicket.ticketNumber}`));
      if (existingIdx > -1) {
        const nextWarrs = [...warranties];
        nextWarrs[existingIdx] = {
          ...nextWarrs[existingIdx],
          customerName: updatedTicket.customerName,
          customerPhone: updatedTicket.customerPhone,
          purchaseDate: startDateStr,
          warrantyMonths: computedMonths,
          expiryDate: endDateStr,
          notes: `Bảo hành dịch vụ sửa chữa số ${updatedTicket.ticketNumber}. Giải pháp: ${updatedTicket.solution || 'Thay thế linh kiện'}`
        };
        saveWarranties(nextWarrs);
      } else if (updatedTicket.status === 'delivered' || updatedTicket.status === 'completed') {
        const newWarr: WarrantyCard = {
          id: `warr_repaired_${updatedTicket.id}`,
          serialNumber: updatedTicket.deviceSerial || `REP-${updatedTicket.ticketNumber}`,
          productName: `Dịch vụ sửa máy: ${updatedTicket.deviceName}`,
          customerName: updatedTicket.customerName,
          customerPhone: updatedTicket.customerPhone,
          purchaseDate: startDateStr,
          warrantyMonths: computedMonths,
          expiryDate: endDateStr,
          status: 'active',
          notes: `Bảo hành dịch vụ sửa chữa số ${updatedTicket.ticketNumber}. Giải pháp: ${updatedTicket.solution || 'Thay thế linh kiện'}`,
          linkedRepairId: updatedTicket.id
        };
        saveWarranties([newWarr, ...warranties]);
      }
    }

    logActivity('repair', 'Chỉnh sửa phiếu / hóa đơn sửa chữa', `Mã phiếu: #${updatedTicket.ticketNumber} - Khách: ${updatedTicket.customerName} - Thiết bị: ${updatedTicket.deviceName}`, updatedTicket.actualCost || updatedTicket.estimatedCost, 'info');
  };

  // Advanced repair transitions
  const handleUpdateRepairStatus = (
    id: string, 
    status: RepairStatus, 
    finalDetails?: { 
      solution?: string; 
      actualCost?: number; 
      warrantyUntil?: string; 
      deliveredAt?: string; 
      note?: string;
      usedParts?: { productId: string; name: string; quantity: number; price: number; warrantyMonths?: number; imei?: string }[];
      debtAmount?: number;
      debtDueDate?: string;
    }
  ) => {
    let debtToSave: Debt | null = null;
    let targetTicket: RepairTicket | undefined;

    const updated = repairs.map(rep => {
      if (rep.id !== id) return rep;
      targetTicket = rep;

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
        if (finalDetails.usedParts !== undefined) payload.usedParts = finalDetails.usedParts;
        if (finalDetails.debtAmount !== undefined) payload.debtAmount = finalDetails.debtAmount;
        if (finalDetails.debtDueDate !== undefined) payload.debtDueDate = finalDetails.debtDueDate;
      }

      if (status === 'delivered' && !payload.deliveredAt) {
        payload.deliveredAt = new Date().toISOString().slice(0, 10);
      }

      if (status === 'delivered' && finalDetails?.debtAmount && finalDetails.debtAmount > 0) {
        const cleanTicketNum = rep.ticketNumber.replace(/^REP-/, '');
        const invId = `inv_repair_${rep.id}`;
        const invNum = `HD-REP-${cleanTicketNum}`;
        debtToSave = {
          id: `debt_${Date.now()}`,
          invoiceId: invId,
          invoiceNumber: invNum,
          customerId: rep.customerId,
          customerName: rep.customerName,
          customerPhone: rep.customerPhone,
          amount: finalDetails.actualCost || rep.estimatedCost,
          remainingAmount: finalDetails.debtAmount,
          dueDate: finalDetails.debtDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
          status: finalDetails.debtAmount === (finalDetails.actualCost || rep.estimatedCost) ? 'pending' : 'partial',
          createdAt: finalDetails.deliveredAt ? new Date(finalDetails.deliveredAt).toISOString() : new Date().toISOString(),
          note: `Công nợ sửa chữa thiết bị: ${rep.deviceName} (#${rep.ticketNumber})`
        };
      }

      // If transition to 'delivered' occurs, also register or update a service repair warranty card
      if (status === 'delivered' && payload.warrantyUntil) {
        let maxPartWarranty = 0;
        if (payload.usedParts && payload.usedParts.length > 0) {
          payload.usedParts.forEach(pt => {
            const prod = products.find(p => p.id === pt.productId || p.sku === pt.productId || p.name === pt.name);
            const w = pt.warrantyMonths ?? prod?.warrantyMonths ?? 0;
            if (w > maxPartWarranty) maxPartWarranty = w;
          });
        }

        const startDateStr = payload.deliveredAt || new Date().toISOString().slice(0, 10);
        let finalExpiryDateStr = payload.warrantyUntil;

        if (maxPartWarranty > 0 && !payload.warrantyUntil) {
          const computedExpiryWithParts = computeExpiryDate(startDateStr, maxPartWarranty);
          finalExpiryDateStr = computedExpiryWithParts;
          payload.warrantyUntil = computedExpiryWithParts;
        }

        const startDate = new Date(startDateStr);
        const expiryDate = new Date(finalExpiryDateStr);
        const diffDays = Math.round((expiryDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24));
        let computedMonths = maxPartWarranty || 3;
        if (diffDays <= 4) computedMonths = 0.1;
        else if (diffDays <= 8) computedMonths = 0.2;
        else if (diffDays <= 35) computedMonths = 1;
        else if (diffDays <= 65) computedMonths = 2;
        else if (diffDays <= 100) computedMonths = 3;
        else if (diffDays <= 200) computedMonths = 6;
        else if (diffDays <= 390) computedMonths = 12;
        else if (diffDays <= 750) computedMonths = 24;
        else if (diffDays <= 1120) computedMonths = 36;
        else computedMonths = Math.max(1, Math.round(diffDays / 30));

        if (maxPartWarranty > 0 && computedMonths < maxPartWarranty) {
          computedMonths = maxPartWarranty;
        }

        const repairWarrantyCard: WarrantyCard = {
          id: `warr_repaired_${rep.id}`,
          serialNumber: rep.deviceSerial || `REP-${rep.ticketNumber}`,
          productName: `Dịch vụ sửa máy: ${rep.deviceName}`,
          customerName: rep.customerName,
          customerPhone: rep.customerPhone,
          purchaseDate: startDateStr,
          warrantyMonths: computedMonths,
          expiryDate: finalExpiryDateStr,
          status: 'active',
          notes: `Bảo hành dịch vụ sửa chữa số ${rep.ticketNumber}. Giải pháp: ${payload.solution || 'Thay thế linh kiện'}`,
          linkedRepairId: rep.id
        };
        
        // Upsert into warranties list
        setTimeout(() => {
          setWarranties(prevWarr => {
            const existingIdx = prevWarr.findIndex(w => 
              w.linkedRepairId === rep.id || 
              (rep.deviceSerial && w.serialNumber === rep.deviceSerial) ||
              w.serialNumber === `REP-${rep.ticketNumber}` ||
              (w.notes && w.notes.includes(rep.ticketNumber))
            );
            let nextWarrs: WarrantyCard[];
            if (existingIdx >= 0) {
              nextWarrs = [...prevWarr];
              nextWarrs[existingIdx] = {
                ...nextWarrs[existingIdx],
                ...repairWarrantyCard,
                id: nextWarrs[existingIdx].id
              };
            } else {
              nextWarrs = [repairWarrantyCard, ...prevWarr];
            }
            saveWarranties(nextWarrs);
            return nextWarrs;
          });
        }, 10);
      }

      return payload;
    });

    saveRepairs(updated);

    const statusMap: Record<string, string> = {
      pending: 'Đang chờ xử lý',
      inspecting: 'Đang kiểm tra / báo giá',
      repairing: 'Đang tiến hành sửa chữa',
      completed: 'Đã sửa xong (chờ nhận)',
      delivered: 'Đã hoàn thành & Bàn giao máy',
      cancelled: 'Đã hủy phiếu'
    };

    logActivity('repair', 'Cập nhật trạng thái phiếu sửa chữa', `Mã phiếu: #${targetTicket?.ticketNumber || id} - Khách: ${targetTicket?.customerName || 'N/A'} -> Trạng thái: ${statusMap[status] || status}`, finalDetails?.actualCost, 'info');

    if (debtToSave) {
      setTimeout(() => {
        setDebts(prevDebts => {
          const cleanTicketNum = targetTicket?.ticketNumber?.replace(/^REP-/, '') || '';
          const existingIdx = prevDebts.findIndex(d => 
            (debtToSave?.invoiceId && d.invoiceId === debtToSave.invoiceId) ||
            (debtToSave?.invoiceNumber && d.invoiceNumber === debtToSave.invoiceNumber) ||
            (cleanTicketNum && d.note && d.note.includes(cleanTicketNum))
          );
          let nextDebts: Debt[];
          if (existingIdx > -1) {
            nextDebts = [...prevDebts];
            nextDebts[existingIdx] = {
              ...nextDebts[existingIdx],
              ...debtToSave,
              id: nextDebts[existingIdx].id
            };
          } else {
            nextDebts = [debtToSave!, ...prevDebts];
          }
          saveDebts(nextDebts);
          return nextDebts;
        });
      }, 50);
    }
  };

  const handleAddWarranty = (card: WarrantyCard) => {
    saveWarranties([...warranties, card]);
  };

  const handleAddCustomer = (customer: Customer) => {
    saveCustomers([...customers, customer]);
    logActivity('customer', 'Thêm khách hàng mới', `Tên: ${customer.name} - SĐT: ${customer.phone}`, undefined, 'info');
  };

  const handleEditCustomer = (customer: Customer) => {
    saveCustomers(customers.map(c => c.id === customer.id ? customer : c));
    logActivity('customer', 'Cập nhật hồ sơ khách hàng', `Tên: ${customer.name} - SĐT: ${customer.phone}`, undefined, 'info');
  };

  const handleDeleteCustomer = (id: string) => {
    const targetCust = customers.find(c => c.id === id);
    const updated = customers.filter(c => c.id !== id);
    saveCustomers(updated);
    logActivity('customer', 'Xóa hồ sơ khách hàng', `Đã xóa khách hàng: ${targetCust ? targetCust.name : id} (SĐT: ${targetCust?.phone || 'N/A'})`, undefined, 'danger');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col md:flex-row antialiased p-4 md:p-6 gap-6">
      
      {/* 1. MOBILE BRAND HEADER CARD (Bento style, only visible on mobile) */}
      <div className="flex md:hidden items-center justify-between bg-slate-900 text-white rounded-2xl border border-slate-850 p-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
            <TPLogo className="w-8 h-8 shrink-0" />
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
                    <div className="p-1.5 bg-white rounded-xl shadow-sm flex items-center justify-center shrink-0">
                      <TPLogo className="w-7 h-7 shrink-0" />
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
                    { id: 'owner', label: 'Bảng Chủ Shop 👑', icon: Crown },
                    { id: 'sales', label: 'Bán Hàng & Kho', icon: ShoppingBag },
                    { id: 'buildpc', label: 'Build Cấu Hình', icon: Cpu },
                    { id: 'repairs', label: 'Nhận Sửa Chữa', icon: Wrench },
                    { id: 'warranties', label: 'Tra Cứu Bảo Hành', icon: ShieldCheck },
                    { id: 'customers', label: 'Khách Hàng (CRM)', icon: Users },
                    { id: 'debts', label: 'Công Nợ', icon: ReceiptText },
                    { id: 'suppliers', label: 'Nhà Cung Cấp', icon: Factory },
                    { id: 'printSettings', label: 'Cấu Hình In & QR', icon: Printer },
                    { id: 'accounts', label: 'Nhân Viên & Quyền', icon: UserCog },
                  ].filter(tab => !['accounts', 'printSettings', 'owner'].includes(tab.id) || currentUser?.role === 'admin').map(tab => {
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
            <div className="p-2 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center shrink-0">
              <TPLogo className="w-8 h-8 shrink-0" />
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
              { id: 'owner', label: 'Bảng Chủ Shop 👑', icon: Crown },
              { id: 'sales', label: 'Bán Hàng & Kho', icon: ShoppingBag },
              { id: 'buildpc', label: 'Build Cấu Hình', icon: Cpu },
              { id: 'repairs', label: 'Nhận Sửa Chữa', icon: Wrench },
              { id: 'warranties', label: 'Tra Cứu Bảo Hành', icon: ShieldCheck },
              { id: 'customers', label: 'Khách Hàng (CRM)', icon: Users },
              { id: 'debts', label: 'Công Nợ', icon: ReceiptText },
              { id: 'suppliers', label: 'Nhà Cung Cấp', icon: Factory },
              { id: 'printSettings', label: 'Cấu Hình In & QR', icon: Printer },
              { id: 'accounts', label: 'Nhân Viên & Quyền', icon: UserCog },
            ].filter(tab => !['accounts', 'printSettings', 'owner'].includes(tab.id) || currentUser?.role === 'admin').map(tab => {
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
              {activeTab === 'owner' && 'Bảng Giám Sát Chủ Cửa Hàng (Owner Dashboard)'}
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
              {activeTab === 'sales' && 'Thiết lập giỏ nhận thanh toán hóa đơn nhanh, kích hoạt tự động thẻ bảo hành, điều chỉnh số tồn kho.'}
              {activeTab === 'buildpc' && 'Phối ráp CPU, RAM, ổ cứng, giá tùy chỉnh thực tế, bảo hành riêng lẻ và in báo giá.'}
              {activeTab === 'repairs' && 'Ghi chép tiếp quản máy hỏng kỹ thuật, tra cứu tự động nếu có bảo hành, bàn giao máy lưu kho.'}
              {activeTab === 'warranties' && 'Cổng tra cứu bảo hành minh bạch bằng số SKU/IMEI và lưu trữ thẻ quyền lợi bảo vệ khách mua hàng.'}
              {activeTab === 'customers' && 'Kiểm soát thông tin liên hệ, tra cứu lịch sử mua hàng phối hợp tất toán sửa chữa khách hàng cũ.'}
              {activeTab === 'debts' && 'Theo dõi danh sách công nợ khách hàng, kỳ hạn thanh toán và trạng thái tất toán các hóa đơn còn thiếu.'}
              {activeTab === 'suppliers' && 'Quản lý thông tin nhà cung cấp sản phẩm, tra cứu nhanh nguồn gốc nhập hàng để bảo hành dễ dàng.'}
              {activeTab === 'printSettings' && 'Điều chỉnh khuôn khổ in ấn A4/K80/K57, màu thương hiệu nổi bật, khẩu hiệu cửa hàng và tích hợp VietQR.'}
              {activeTab === 'accounts' && 'Kiểm soát danh sách nhân sự bán hàng, kỹ thuật viên hoạt động tại cửa hàng, phân bổ quyền hạn.'}
            </p>
          </div>

          {/* Centralized LAN Server Sync Controller & Owner Notification Bell */}
          <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
            {currentUser?.role === 'admin' && (
              <div className="relative">
                <button
                  id="btn-owner-notification-bell"
                  onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer flex items-center gap-2 border border-slate-700 shadow-2xs relative"
                  title="Thông báo thao tác nhân viên realtime"
                >
                  <div className="relative">
                    <Bell className="w-4 h-4 text-amber-400" />
                    {activities.filter(a => !a.readByOwner).length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping" />
                    )}
                  </div>
                  <span className="hidden sm:inline text-xs font-bold text-slate-100">Thông Báo Staff</span>
                  {activities.filter(a => !a.readByOwner).length > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.2 rounded-full">
                      {activities.filter(a => !a.readByOwner).length > 99 ? '99+' : activities.filter(a => !a.readByOwner).length}
                    </span>
                  )}
                </button>

                {/* Floating Realtime Activity Notification Dropdown */}
                <AnimatePresence>
                  {showNotifDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 overflow-hidden"
                    >
                      <div className="p-3.5 bg-slate-900 text-white flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Bell className="w-4 h-4 text-amber-400" />
                          <h4 className="font-extrabold text-xs uppercase tracking-wider">Thao Tác Nhân Viên</h4>
                        </div>
                        {activities.filter(a => !a.readByOwner).length > 0 && (
                          <button
                            onClick={() => handleMarkLogRead()}
                            className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                          >
                            Đánh dấu đã đọc ({activities.filter(a => !a.readByOwner).length})
                          </button>
                        )}
                      </div>

                      <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 p-1">
                        {activities.length === 0 ? (
                          <div className="p-6 text-center text-xs text-slate-400 font-medium">
                            Chưa có thao tác mới nào từ nhân viên
                          </div>
                        ) : (
                          activities.slice(0, 10).map(act => (
                            <div
                              key={act.id}
                              onClick={() => handleMarkLogRead(act.id)}
                              className={`p-3 rounded-xl transition cursor-pointer text-xs space-y-1 ${
                                !act.readByOwner ? 'bg-amber-50/80 border-l-4 border-amber-500' : 'hover:bg-slate-50'
                              }`}
                            >
                              <div className="flex justify-between items-start gap-2">
                                <span className="font-black text-slate-900 truncate">{act.userName}</span>
                                <span className="text-[10px] text-slate-400 font-medium shrink-0">
                                  {new Date(act.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <p className="font-bold text-slate-800">{act.title}</p>
                              <p className="text-[11px] text-slate-500 leading-snug truncate">{act.details}</p>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                        <button
                          onClick={() => {
                            setActiveTab('owner');
                            setShowNotifDropdown(false);
                          }}
                          className="text-xs font-bold text-indigo-600 hover:underline w-full cursor-pointer"
                        >
                          Xem toàn bộ nhật ký tại Bảng Chủ Shop 👑
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200/80 shadow-xs">
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

            {activeTab === 'owner' && currentUser?.role === 'admin' && (
              <OwnerDashboard 
                products={products}
                invoices={invoices}
                repairs={repairs}
                debts={debts}
                users={users}
                imeis={imeis}
                activities={activities}
                onMarkLogRead={handleMarkLogRead}
                onClearLogs={handleClearLogs}
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
                currentUser={currentUser!}
                printSettings={printSettings}
                suppliers={suppliers}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onUpdateProductStock={handleUpdateProductStock}
                onAddInvoice={handleAddInvoice}
                onUpdateInvoice={handleUpdateInvoice}
                onDeleteInvoice={handleDeleteInvoice}
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
                onUpdatePrintSettings={setPrintSettings}
              />
            )}

            {activeTab === 'repairs' && (
              <RepairManager 
                repairs={repairs}
                customers={customers}
                warranties={warranties}
                users={users}
                currentUser={currentUser!}
                products={products}
                imeis={imeis}
                printSettings={printSettings}
                onUpdateImeis={saveImeis}
                onAddRepair={handleAddRepair}
                onUpdateRepair={handleUpdateRepairTicket}
                onUpdateRepairStatus={handleUpdateRepairStatus}
                onAddCustomer={handleAddCustomer}
                onUpdateProductStock={handleUpdateProductStock}
              />
            )}

            {activeTab === 'warranties' && (
              <WarrantyManager 
                warranties={warranties}
                repairs={repairs}
                users={users}
                currentUser={currentUser!}
                onAddWarranty={handleAddWarranty}
                onDeleteWarranty={handleDeleteWarranty}
                invoices={invoices}
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
                onDeleteCustomer={handleDeleteCustomer}
              />
            )}

            {activeTab === 'debts' && (
              <DebtManager 
                debts={debts}
                onUpdateDebts={handleUpdateDebts}
                onDeleteDebt={handleDeleteDebt}
                customers={customers}
                invoices={invoices}
                printSettings={printSettings}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'suppliers' && (
              <SupplierManager 
                suppliers={suppliers}
                onUpdateSuppliers={saveSuppliers}
                products={products}
                onUpdateProduct={handleUpdateProduct}
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
