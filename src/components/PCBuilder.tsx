import React, { useState, useMemo, useEffect } from 'react';
import { Product, Customer, SalesInvoice, InvoiceItem, PrintSettings, ProductIMEI, formatWarrantyText, formatAccountName, formatBankName } from '../types';
import { 
  Cpu, 
  Trash2, 
  Plus, 
  Search, 
  X, 
  Receipt, 
  Sparkles, 
  ShieldCheck, 
  Printer, 
  Edit3,
  RefreshCw,
  PlusCircle,
  FileCheck2,
  Calendar,
  Sliders,
  Save,
  Check,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PCBuilderProps {
  products: Product[];
  imeis: ProductIMEI[];
  customers: Customer[];
  onAddInvoice: (invoice: SalesInvoice) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateProductStock: (id: string, newStock: number) => void;
  onUpdateImeis: (imeis: ProductIMEI[]) => void;
  currentUser: { fullName: string; role: string };
  printSettings?: PrintSettings;
  onUpdatePrintSettings?: (settings: PrintSettings) => void;
}

interface BuildItem {
  slotId: string;
  slotName: string;
  productId: string;
  productName: string;
  selectedImei?: string;
  selectedImeis?: string[];
  price: number;
  originalPrice: number;
  quantity: number;
  warrantyMonths: number;
}

const DEFAULT_SLOTS = [
  { id: 'cpu', name: 'Bộ vi xử lý (CPU)', icon: '⚙️' },
  { id: 'main', name: 'Bo mạch chủ (Mainboard)', icon: '🔌' },
  { id: 'ram', name: 'Bộ nhớ trong (RAM)', icon: '🧠' },
  { id: 'vga', name: 'Card màn hình (VGA)', icon: '🎮' },
  { id: 'ssd', name: 'Ổ cứng lưu trữ (SSD/HDD)', icon: '💾' },
  { id: 'psu', name: 'Nguồn máy tính (PSU)', icon: '⚡' },
  { id: 'case', name: 'Vỏ máy tính (Case)', icon: '📦' },
  { id: 'fancase', name: 'Quạt tản nhiệt (FAN CASE)', icon: '🌀' },
  { id: 'cooling', name: 'Tản nhiệt (CPU Cooler)', icon: '❄️' },
  { id: 'monitor', name: 'Màn hình máy tính', icon: '🖥️' },
  { id: 'accessories', name: 'Bàn phím, chuột & phím', icon: '⌨️' }
];

export default function PCBuilder({
  products,
  imeis,
  customers,
  onAddInvoice,
  onAddCustomer,
  onUpdateProductStock,
  onUpdateImeis,
  currentUser,
  printSettings,
  onUpdatePrintSettings
}: PCBuilderProps) {
  // Master build lists state
  const [build, setBuild] = useState<BuildItem[]>(
    DEFAULT_SLOTS.map(slot => ({
      slotId: slot.id,
      slotName: slot.name,
      productId: '',
      productName: '',
      selectedImei: '',
      price: 0,
      originalPrice: 0,
      quantity: 1,
      warrantyMonths: 36 // default 36 months for hardware components
    }))
  );

  // IMEI Selection state
  const [selectingImeiFor, setSelectingImeiFor] = useState<{
    product: Product;
    slotId: string;
    maxQty: number;
  } | null>(null);
  const [tempSelectedImeis, setTempSelectedImeis] = useState<string[]>([]);

  // Search/selection states for picking products
  const [activeSlotId, setActiveSlotId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom manual text item states
  const [useCustomWriteIn, setUseCustomWriteIn] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualWarranty, setManualWarranty] = useState('12');

  // Customer info for quote
  const [customerMode, setCustomerMode] = useState<'guest' | 'select' | 'new'>('guest');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('Khách xem báo giá');
  const [customerPhone, setCustomerPhone] = useState('');
  
  // Overall bill attributes
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'Tiền mặt' | 'Chuyển khoản' | 'Thẻ' | 'Ghi nợ'>('Chuyển khoản');
  const [debtAmount, setDebtAmount] = useState<number>(0);
  const [debtDueDate, setDebtDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [buildNote, setBuildNote] = useState('');
  
  // Printable results overview modal modal trigger
  const [printedQuoteInvoice, setPrintedQuoteInvoice] = useState<boolean>(false);
  const [savedBuildInvoice, setSavedBuildInvoice] = useState<SalesInvoice | null>(null);

  // Print Template Customizer States for Quotation Cum Warranty
  const [showPrintCustomizer, setShowPrintCustomizer] = useState(false);
  const [customQuoteTitle, setCustomQuoteTitle] = useState(
    printSettings?.quoteTitle || 'BẢNG BÁO GIÁ KIÊM PHIẾU BẢO HÀNH'
  );
  const [customStockStatusText, setCustomStockStatusText] = useState(
    printSettings?.quoteStockStatusText || 'SẴN HÀNG'
  );
  const [customVatNote, setCustomVatNote] = useState(
    printSettings?.quoteVatNote || 'Lưu ý : Bảng giá trên chưa bao gồm phí VAT'
  );
  const [customValidityNote, setCustomValidityNote] = useState(
    printSettings?.quoteValidityNote || 'Bảng báo giá có hiệu lực 3 ngày kể từ ngày báo'
  );
  const [customWarrantyTerms, setCustomWarrantyTerms] = useState<string[]>(
    printSettings?.quoteWarrantyTerms || [
      "Sản phẩm phân phối chính hãng phải còn nguyên tem bảo hành, không bị rách, chắp vá hay cạo sửa.",
      "Sản phẩm không có dấu hiệu bị rách tem hoặc tác động cơ học hỏng hóc vật lý.",
      "Không bảo hành trong các trường hợp cháy nổ, rơi vỡ, vô nước, côn trùng, hoặc thiên tai.",
      "Hỗ trợ xử lý phần mềm, cài Win miễn phí trong vòng 1 năm đầu mua máy.",
      "Hàng bán ra được đổi mới trong 7 ngày đầu nếu có lỗi phần cứng từ nhà sản xuất."
    ]
  );
  const [showWarrantyTerms, setShowWarrantyTerms] = useState(
    printSettings?.showQuoteWarrantyTerms !== undefined ? printSettings.showQuoteWarrantyTerms : true
  );
  const [showBankInfo, setShowBankInfo] = useState(
    printSettings?.showQuoteBankInfo !== undefined ? printSettings.showQuoteBankInfo : true
  );
  const [showQrCode, setShowQrCode] = useState(
    printSettings?.showQuoteQrCode !== undefined ? printSettings.showQuoteQrCode : false
  );
  const [showSignatures, setShowSignatures] = useState(
    printSettings?.showQuoteSignatures !== undefined ? printSettings.showQuoteSignatures : true
  );
  const [showStockColumn, setShowStockColumn] = useState(
    printSettings?.showQuoteStockColumn !== undefined ? printSettings.showQuoteStockColumn : true
  );
  const [showWarrantyColumn, setShowWarrantyColumn] = useState(
    printSettings?.showQuoteWarrantyColumn !== undefined ? printSettings.showQuoteWarrantyColumn : true
  );

  // Column labels & section titles
  const [customColSttLabel, setCustomColSttLabel] = useState(printSettings?.quoteColSttLabel || 'STT');
  const [customColProductLabel, setCustomColProductLabel] = useState(printSettings?.quoteColProductLabel || 'TÊN SẢN PHẨM');
  const [customColQtyLabel, setCustomColQtyLabel] = useState(printSettings?.quoteColQtyLabel || 'SL');
  const [customColUnitPriceLabel, setCustomColUnitPriceLabel] = useState(printSettings?.quoteColUnitPriceLabel || 'ĐƠN GIÁ');
  const [customColAmountLabel, setCustomColAmountLabel] = useState(printSettings?.quoteColAmountLabel || 'THÀNH TIỀN');
  const [customColWarrantyLabel, setCustomColWarrantyLabel] = useState(printSettings?.quoteColWarrantyLabel || 'BẢO HÀNH');
  const [customColStockLabel, setCustomColStockLabel] = useState(printSettings?.quoteColStockLabel || 'TÌNH TRẠNG HÀNG');
  const [customTotalLabel, setCustomTotalLabel] = useState(printSettings?.quoteTotalLabel || 'TỔNG CỘNG CẤU HÌNH BAO GỒM VAT:');
  const [customWarrantyTermsHeader, setCustomWarrantyTermsHeader] = useState(printSettings?.quoteWarrantyTermsHeader || 'MỘT SỐ QUY ĐỊNH BẢO HÀNH:');
  const [customBankHeader, setCustomBankHeader] = useState(printSettings?.quoteBankHeader || 'Thông tin chuyển khoản:');
  const [customSignatureCustomerLabel, setCustomSignatureCustomerLabel] = useState(printSettings?.quoteSignatureCustomerLabel || 'Khách hàng');
  const [customSignatureStoreLabel, setCustomSignatureStoreLabel] = useState(printSettings?.quoteSignatureStoreLabel || 'CỬA HÀNG');

  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync with printSettings when changed externally
  useEffect(() => {
    if (printSettings) {
      if (printSettings.quoteTitle) setCustomQuoteTitle(printSettings.quoteTitle);
      if (printSettings.quoteStockStatusText) setCustomStockStatusText(printSettings.quoteStockStatusText);
      if (printSettings.quoteVatNote) setCustomVatNote(printSettings.quoteVatNote);
      if (printSettings.quoteValidityNote) setCustomValidityNote(printSettings.quoteValidityNote);
      if (printSettings.quoteWarrantyTerms) setCustomWarrantyTerms(printSettings.quoteWarrantyTerms);
      if (printSettings.showQuoteWarrantyTerms !== undefined) setShowWarrantyTerms(printSettings.showQuoteWarrantyTerms);
      if (printSettings.showQuoteBankInfo !== undefined) setShowBankInfo(printSettings.showQuoteBankInfo);
      if (printSettings.showQuoteQrCode !== undefined) setShowQrCode(printSettings.showQuoteQrCode);
      if (printSettings.showQuoteSignatures !== undefined) setShowSignatures(printSettings.showQuoteSignatures);
      if (printSettings.showQuoteStockColumn !== undefined) setShowStockColumn(printSettings.showQuoteStockColumn);
      if (printSettings.showQuoteWarrantyColumn !== undefined) setShowWarrantyColumn(printSettings.showQuoteWarrantyColumn);
      if (printSettings.quoteColSttLabel) setCustomColSttLabel(printSettings.quoteColSttLabel);
      if (printSettings.quoteColProductLabel) setCustomColProductLabel(printSettings.quoteColProductLabel);
      if (printSettings.quoteColQtyLabel) setCustomColQtyLabel(printSettings.quoteColQtyLabel);
      if (printSettings.quoteColUnitPriceLabel) setCustomColUnitPriceLabel(printSettings.quoteColUnitPriceLabel);
      if (printSettings.quoteColAmountLabel) setCustomColAmountLabel(printSettings.quoteColAmountLabel);
      if (printSettings.quoteColWarrantyLabel) setCustomColWarrantyLabel(printSettings.quoteColWarrantyLabel);
      if (printSettings.quoteColStockLabel) setCustomColStockLabel(printSettings.quoteColStockLabel);
      if (printSettings.quoteTotalLabel) setCustomTotalLabel(printSettings.quoteTotalLabel);
      if (printSettings.quoteWarrantyTermsHeader) setCustomWarrantyTermsHeader(printSettings.quoteWarrantyTermsHeader);
      if (printSettings.quoteBankHeader) setCustomBankHeader(printSettings.quoteBankHeader);
      if (printSettings.quoteSignatureCustomerLabel) setCustomSignatureCustomerLabel(printSettings.quoteSignatureCustomerLabel);
      if (printSettings.quoteSignatureStoreLabel) setCustomSignatureStoreLabel(printSettings.quoteSignatureStoreLabel);
    }
  }, [printSettings]);

  const handleSavePrintTemplate = () => {
    if (onUpdatePrintSettings && printSettings) {
      onUpdatePrintSettings({
        ...printSettings,
        quoteTitle: customQuoteTitle,
        quoteStockStatusText: customStockStatusText,
        quoteVatNote: customVatNote,
        quoteValidityNote: customValidityNote,
        quoteWarrantyTerms: customWarrantyTerms,
        showQuoteWarrantyTerms: showWarrantyTerms,
        showQuoteBankInfo: showBankInfo,
        showQuoteQrCode: showQrCode,
        showQuoteSignatures: showSignatures,
        showQuoteStockColumn: showStockColumn,
        showQuoteWarrantyColumn: showWarrantyColumn,
        quoteColSttLabel: customColSttLabel,
        quoteColProductLabel: customColProductLabel,
        quoteColQtyLabel: customColQtyLabel,
        quoteColUnitPriceLabel: customColUnitPriceLabel,
        quoteColAmountLabel: customColAmountLabel,
        quoteColWarrantyLabel: customColWarrantyLabel,
        quoteColStockLabel: customColStockLabel,
        quoteTotalLabel: customTotalLabel,
        quoteWarrantyTermsHeader: customWarrantyTermsHeader,
        quoteBankHeader: customBankHeader,
        quoteSignatureCustomerLabel: customSignatureCustomerLabel,
        quoteSignatureStoreLabel: customSignatureStoreLabel
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  // Filter products by active slot matching rules and search text
  const [showAllProducts, setShowAllProducts] = useState(false);

  const isProductMatchingSlot = (p: Product, slotId: string): boolean => {
    const name = p.name.toLowerCase();
    const cat = (p.category || '').toLowerCase();

    switch (slotId) {
      case 'cpu': {
        if (
          name.includes('main') || name.includes('bo mạch') || name.includes('vga') || 
          name.includes('card') || name.includes('ram') || name.includes('tản nhiệt') ||
          name.includes('nguồn') || name.includes('psu') || name.includes('vỏ case') || name.includes('màn hình')
        ) return false;

        return (
          cat.includes('cpu') || cat.includes('vi xử lý') || cat.includes('vi xu ly') || cat.includes('chip') ||
          name.includes('cpu') || name.includes('intel') || name.includes('ryzen') || 
          name.includes('core i') || name.includes('vi xử lý') || name.includes('pentium') ||
          name.includes('celeron') || name.includes('xeon') || name.includes('athlon')
        );
      }

      case 'main': {
        if (
          name.includes('vga') || name.includes('rtx') || name.includes('gtx') || 
          name.includes('radeon') || name.includes('rx ') || name.includes('rx6') || name.includes('rx7') ||
          name.includes('card màn hình') || name.includes('card đồ họa') || name.includes('card do hoa') ||
          cat.includes('vga') || cat.includes('card') ||
          name.includes('cpu') || name.includes('ryzen') || name.includes('core i3') || name.includes('core i5') || name.includes('core i7') || name.includes('core i9') ||
          (name.includes('ram') && !name.includes('ddr')) ||
          name.includes('ssd') || name.includes('hdd') || name.includes('nvme') ||
          name.includes('nguồn') || name.includes('psu') || name.includes('màn hình') || name.includes('monitor')
        ) return false;

        return (
          cat.includes('main') || cat.includes('bo mạch') || cat.includes('bo mach') || cat.includes('motherboard') ||
          name.includes('mainboard') || name.includes('bo mạch') || name.includes('bo mach') || name.includes('motherboard') ||
          name.includes('main ') || name.startsWith('main ') || name.startsWith('mainboard') ||
          name.includes('h610') || name.includes('b760') || name.includes('b650') || name.includes('z790') || 
          name.includes('z690') || name.includes('b550') || name.includes('b450') || name.includes('a520') || 
          name.includes('a620') || name.includes('x670') || name.includes('h510') || name.includes('h410') || 
          name.includes('b365') || name.includes('b360') || name.includes('h310') || name.includes('b660') ||
          name.includes('z890') || name.includes('b860')
        );
      }

      case 'ram': {
        if (
          name.includes('vga') || name.includes('rtx') || name.includes('gtx') || name.includes('rx ') ||
          name.includes('mainboard') || name.includes('bo mạch') || name.includes('ssd') || name.includes('màn hình')
        ) return false;

        return (
          cat.includes('ram') || cat.includes('bộ nhớ') || cat.includes('bo nho') ||
          name.includes('ram') || name.includes('bộ nhớ') || name.includes('ddr4') || name.includes('ddr5') ||
          name.includes('ddr3') || name.includes('bus 3200') || name.includes('bus 3600') || name.includes('bus 5600')
        );
      }

      case 'vga': {
        if (
          name.includes('mainboard') || name.includes('bo mạch') || name.includes('cpu') || 
          name.includes('ssd') || name.includes('hdd') || name.includes('nguồn') || name.includes('psu')
        ) return false;

        return (
          cat.includes('vga') || cat.includes('card') || cat.includes('đồ họa') || cat.includes('do hoa') ||
          name.includes('vga') || name.includes('card màn hình') || name.includes('card đồ họa') || 
          name.includes('rtx') || name.includes('gtx') || name.includes('radeon') || name.includes('rx ') || 
          name.includes('rx6') || name.includes('rx7') || name.includes('rx5') || name.includes('geforce') ||
          name.includes('quadro') || name.includes('arc a') || name.includes('gt 1030') || name.includes('gt 730')
        );
      }

      case 'ssd': {
        if (
          name.includes('ram') || name.includes('vga') || name.includes('rtx') || name.includes('mainboard') || 
          name.includes('cpu') || name.includes('màn hình') || name.includes('chuột') || name.includes('bàn phím')
        ) return false;

        return (
          cat.includes('ssd') || cat.includes('hdd') || cat.includes('ổ cứng') || cat.includes('o cung') || cat.includes('lưu trữ') ||
          name.includes('ssd') || name.includes('hdd') || name.includes('ổ cứng') || name.includes('o cung') || 
          name.includes('nvme') || name.includes('sata') || name.includes('m.2') || name.includes('m2')
        );
      }

      case 'psu': {
        if (
          name.includes('vga') || name.includes('rtx') || name.includes('mainboard') || name.includes('cpu') || name.includes('vỏ case')
        ) return false;

        return (
          cat.includes('nguồn') || cat.includes('nguon') || cat.includes('psu') || cat.includes('power') ||
          name.includes('nguồn') || name.includes('nguon') || name.includes('psu') || name.includes('power supply') ||
          /\b(450w|500w|550w|600w|650w|700w|750w|800w|850w|1000w|1200w)\b/i.test(name)
        );
      }

      case 'case': {
        if (
          name.includes('fan case') || name.includes('quạt case') || name.includes('tản nhiệt') || name.includes('nguồn') || name.includes('vga')
        ) return false;

        return (
          cat.includes('case') || cat.includes('vỏ') || cat.includes('vo may') || cat.includes('thùng') ||
          name.includes('vỏ case') || name.includes('vo case') || name.includes('vỏ máy') || name.includes('vo may') || 
          name.includes('case') || name.includes('chassis') || name.includes('thùng máy')
        );
      }

      case 'fancase': {
        if (name.includes('tản nhiệt cpu') || name.includes('aio') || name.includes('tản khí') || name.includes('vỏ case')) return false;

        return (
          cat.includes('fan') || cat.includes('quạt') || cat.includes('quat') ||
          name.includes('fan case') || name.includes('quạt case') || name.includes('quat case') || 
          name.includes('fan 12cm') || name.includes('fan 14cm') || name.includes('fan argb') || name.includes('fan rgb') ||
          name.includes('pack 3 fan') || name.includes('pack 5 fan') || name.includes('fan ')
        );
      }

      case 'cooling': {
        if (name.includes('fan case') || name.includes('quạt case') || name.includes('vỏ case') || name.includes('mainboard')) return false;

        return (
          cat.includes('tản') || cat.includes('tan') || cat.includes('cooler') || cat.includes('cooling') ||
          name.includes('tản nhiệt') || name.includes('tan nhiet') || name.includes('cooler') || 
          name.includes('aio') || name.includes('tản khí') || name.includes('tản nước') || name.includes('liquid cooling')
        );
      }

      case 'monitor': {
        if (
          name.includes('card màn hình') || name.includes('card man hinh') || name.includes('vga') || 
          name.includes('rtx') || name.includes('gtx') || name.includes('radeon')
        ) return false;

        return (
          cat.includes('màn hình') || cat.includes('man hinh') || cat.includes('monitor') || cat.includes('display') ||
          (name.includes('màn hình') && !name.includes('card')) || name.includes('man hinh') || name.includes('monitor') || 
          /\b(22|24|27|32|34)\s*inch\b/i.test(name) || /\b(144hz|165hz|180hz|240hz)\b/i.test(name)
        );
      }

      case 'accessories': {
        if (name.includes('màn hình') || name.includes('vga') || name.includes('mainboard') || name.includes('cpu')) return false;

        return (
          cat.includes('phím') || cat.includes('chuột') || cat.includes('tai nghe') || cat.includes('phụ kiện') || cat.includes('gear') ||
          name.includes('bàn phím') || name.includes('keyboard') || name.includes('chuột') || name.includes('mouse') || 
          name.includes('tai nghe') || name.includes('headset') || name.includes('lót chuột') || name.includes('pad chuột') || name.includes('webcam')
        );
      }

      default:
        return true;
    }
  };

  const filteredProductsToChoose = useMemo(() => {
    if (!activeSlotId) return [];
    
    // Filter available in-stock items
    const availableProducts = products.filter(p => {
      const available = p.hasImei ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length : p.stock;
      return available > 0;
    });

    let slotProducts = availableProducts;
    if (!showAllProducts) {
      slotProducts = availableProducts.filter(p => isProductMatchingSlot(p, activeSlotId));
      if (slotProducts.length === 0) {
        slotProducts = availableProducts;
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      slotProducts = slotProducts.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    }

    return slotProducts;
  }, [products, imeis, activeSlotId, searchQuery, showAllProducts]);

  // Money format
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Clear a specific slot
  const handleClearSlot = (slotId: string) => {
    setBuild(prev => 
      prev.map(item => 
        item.slotId === slotId 
          ? { ...item, productId: '', productName: '', selectedImei: '', selectedImeis: [], price: 0, originalPrice: 0, quantity: 1, warrantyMonths: 12 }
          : item
      )
    );
  };

  // Trigger modal selection
  const handleOpenPicker = (slotId: string) => {
    setActiveSlotId(slotId);
    setSearchQuery('');
    setShowAllProducts(false);
    setUseCustomWriteIn(false);
    setManualName('');
    setManualPrice('');
    setManualWarranty('36');
  };

  // Open IMEI selection modal for a product in a slot
  const handleOpenImeiModalForProduct = (slotId: string, product: Product) => {
    const slotItem = build.find(it => it.slotId === slotId);
    
    const existingImeis = (slotItem && slotItem.productId === product.id && slotItem.selectedImeis)
      ? slotItem.selectedImeis
      : (slotItem?.selectedImei ? [slotItem.selectedImei] : []);

    const inStockForProd = imeis.filter(i => i.productId === product.id && i.status === 'in_stock').map(i => i.imei);
    const initialImeis = existingImeis.filter(im => inStockForProd.includes(im));

    setSelectingImeiFor({ product, slotId, maxQty: 9999 });
    setTempSelectedImeis(initialImeis);
  };

  const handleToggleImeiSelection = (imeiStr: string) => {
    setTempSelectedImeis(prev => {
      if (prev.includes(imeiStr)) {
        return prev.filter(x => x !== imeiStr);
      } else {
        return [...prev, imeiStr];
      }
    });
  };

  const handleConfirmImeiSelection = () => {
    if (!selectingImeiFor) return;
    const { product, slotId } = selectingImeiFor;
    const newQty = Math.max(1, tempSelectedImeis.length);

    setBuild(prev => 
      prev.map(item => 
        item.slotId === slotId 
          ? { 
              ...item, 
              productId: product.id, 
              productName: product.name, 
              selectedImeis: tempSelectedImeis,
              selectedImei: tempSelectedImeis[0] || '',
              quantity: newQty,
              price: product.price, 
              originalPrice: product.price, 
              warrantyMonths: product.warrantyMonths || 36 
            }
          : item
      )
    );
    setSelectingImeiFor(null);
    setActiveSlotId(null);
  };

  // Confirm slot item selection
  const handleSelectProduct = (product: Product) => {
    if (!activeSlotId) return;

    if (product.hasImei) {
      handleOpenImeiModalForProduct(activeSlotId, product);
      return;
    }
    
    setBuild(prev => 
      prev.map(item => 
        item.slotId === activeSlotId 
          ? { 
              ...item, 
              productId: product.id, 
              productName: product.name, 
              selectedImeis: [],
              selectedImei: '',
              price: product.price, 
              originalPrice: product.price, 
              quantity: 1, 
              warrantyMonths: product.warrantyMonths || 36 
            }
          : item
      )
    );
    setActiveSlotId(null);
  };

  // Select custom manual item
  const handleChooseCustomWriteIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSlotId || !manualName.trim()) {
      alert('Vui lòng nhập tên linh kiện tùy chọn này!');
      return;
    }

    const priceNum = Number(manualPrice) || 0;
    const warrMonths = Number(manualWarranty) || 12;

    setBuild(prev => 
      prev.map(item => 
        item.slotId === activeSlotId 
          ? { 
              ...item, 
              productId: `custom_${Date.now()}`, 
              productName: manualName.trim(), 
              price: priceNum, 
              originalPrice: priceNum, 
              quantity: 1, 
              warrantyMonths: warrMonths 
            }
          : item
      )
    );
    setActiveSlotId(null);
  };

  // Edit build item property directly (price, warranty, quantity)
  const handleUpdateItemProperty = (slotId: string, property: 'price' | 'warrantyMonths' | 'quantity', value: number) => {
    setBuild(prev => 
      prev.map(item => {
        if (item.slotId !== slotId) return item;

        if (property === 'quantity') {
          const newQty = Math.max(1, value);
          let newSelectedImeis = item.selectedImeis ? [...item.selectedImeis] : (item.selectedImei ? [item.selectedImei] : []);
          const prod = products.find(p => p.id === item.productId);
          
          if (prod?.hasImei) {
            if (newSelectedImeis.length > newQty) {
              newSelectedImeis = newSelectedImeis.slice(0, newQty);
            }
          }

          return { 
            ...item, 
            quantity: newQty,
            selectedImeis: newSelectedImeis,
            selectedImei: newSelectedImeis[0] || ''
          };
        }

        return { ...item, [property]: value };
      })
    );
  };

  // Presets load templates
  const applyPresetTemplate = (type: 'office' | 'gaming' | 'designer') => {

    if (type === 'office') {
      // Look up cheap office parts if available or simulate them
      setBuild([
        { slotId: 'cpu', slotName: 'Bộ vi xử lý (CPU)', productId: 'sim_cpu1', productName: 'Intel Core i3-12100 (Upto 4.3Ghz, 4 Nhân 8 Luồng)', price: 2350000, originalPrice: 2350000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'main', slotName: 'Bo mạch chủ (Mainboard)', productId: 'sim_main1', productName: 'Mainboard H610M-K DDR4 PRO', price: 1690000, originalPrice: 1690000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'ram', slotName: 'Bộ nhớ trong (RAM)', productId: 'sim_ram1', productName: 'RAM Kingston Fury Beast 8GB DDR4 3200Mhz', price: 650000, originalPrice: 650000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'vga', slotName: 'Card màn hình (VGA)', productId: '', productName: 'Intel UHD Graphics tích hợp (Không dùng VGA rời)', price: 0, originalPrice: 0, quantity: 1, warrantyMonths: 0 },
        { slotId: 'ssd', slotName: 'Ổ cứng lưu trữ (SSD/HDD)', productId: 'sim_ssd1', productName: 'SSD Lexar NM620 256GB M.2 NVMe', price: 680000, originalPrice: 680000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'psu', slotName: 'Nguồn máy tính (PSU)', productId: 'sim_psu1', productName: 'Nguồn Xigmatek X-Power III 450W', price: 550000, originalPrice: 550000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'case', slotName: 'Vỏ máy tính (Case)', productId: 'sim_case1', productName: 'Vỏ máy tính Văn phòng Xigmatek', price: 290000, originalPrice: 290000, quantity: 1, warrantyMonths: 12 },
        { slotId: 'cooling', slotName: 'Tản nhiệt (CPU Cooler)', productId: '', productName: 'Intel Box Cooler kèm CPU', price: 0, originalPrice: 0, quantity: 1, warrantyMonths: 12 },
        { slotId: 'monitor', slotName: 'Màn hình máy tính', productId: 'sim_mon1', productName: 'Màn hình Asus VY249HE 23.8 inch IPS 75Hz', price: 2450000, originalPrice: 2450000, quantity: 1, warrantyMonths: 24 },
        { slotId: 'accessories', slotName: 'Bàn phím, chuột & phím', productId: 'sim_acc1', productName: 'Combo Phím Chuột Văn Phòng Rapoo X120PRO', price: 220000, originalPrice: 220000, quantity: 1, warrantyMonths: 12 }
      ]);
    } else if (type === 'gaming') {
      setBuild([
        { slotId: 'cpu', slotName: 'Bộ vi xử lý (CPU)', productId: 'sim_cpu2', productName: 'Intel Core i5-12400F (Upto 4.4Ghz, 6 Nhân 12 Luồng)', price: 2950000, originalPrice: 2950000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'main', slotName: 'Bo mạch chủ (Mainboard)', productId: 'sim_main2', productName: 'ASUS PRIME B760M-K DDR4 Intel LGA1700', price: 2650000, originalPrice: 2650000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'ram', slotName: 'Bộ nhớ trong (RAM)', productId: 'sim_ram2', productName: 'RAM Corsair Vengeance LPX 16GB (2x8GB) DDR4 3200Mhz', price: 1100000, originalPrice: 1100000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'vga', slotName: 'Card màn hình (VGA)', productId: 'sim_vga2', productName: 'Gigabyte GeForce RTX 3050 Windforce OC 8G', price: 5490000, originalPrice: 5490000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'ssd', slotName: 'Ổ cứng lưu trữ (SSD/HDD)', productId: 'sim_ssd2', productName: 'SSD Samsung 980 500GB PCIe NVMe M.2', price: 1250000, originalPrice: 1250000, quantity: 1, warrantyMonths: 60 },
        { slotId: 'psu', slotName: 'Nguồn máy tính (PSU)', productId: 'sim_psu2', productName: 'Nguồn MSI MAG A650BN 650W 80 Plus Bronze', price: 1450000, originalPrice: 1450000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'case', slotName: 'Vỏ máy tính (Case)', productId: 'sim_case2', productName: 'Vỏ kính cường lực Xigmatek Gaming với 3 Fan LED', price: 590000, originalPrice: 590000, quantity: 1, warrantyMonths: 12 },
        { slotId: 'cooling', slotName: 'Tản nhiệt (CPU Cooler)', productId: 'sim_cool2', productName: 'Tản nhiệt khí Jonsbo CR-1000 Evo RGB', price: 350000, originalPrice: 350000, quantity: 1, warrantyMonths: 12 },
        { slotId: 'monitor', slotName: 'Màn hình máy tính', productId: 'sim_mon2', productName: 'Màn hình Gaming AOC 24G4 23.8 inch IPS 180Hz G-Sync', price: 3150000, originalPrice: 3150000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'accessories', slotName: 'Bàn phím, chuột & phím', productId: '', productName: 'Chưa trang bị', price: 0, originalPrice: 0, quantity: 1, warrantyMonths: 0 }
      ]);
    } else if (type === 'designer') {
      setBuild([
        { slotId: 'cpu', slotName: 'Bộ vi xử lý (CPU)', productId: 'sim_cpu3', productName: 'Intel Core i7-13700F (Upto 5.2Ghz, 16 Nhân 24 Luồng)', price: 8950000, originalPrice: 8950000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'main', slotName: 'Bo mạch chủ (Mainboard)', productId: 'sim_main3', productName: 'MSI MAG B760M Mortar Wifi DDR5', price: 4450000, originalPrice: 4450000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'ram', slotName: 'Bộ nhớ trong (RAM)', productId: 'sim_ram3', productName: 'RAM Kingston Fury Beast RGB 32GB (2x16GB) DDR5 5600Mhz', price: 3250000, originalPrice: 3250000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'vga', slotName: 'Card màn hình (VGA)', productId: 'sim_vga3', productName: 'ASUS Dual GeForce RTX 4060 OC 8GB GDDR6', price: 8550000, originalPrice: 8550000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'ssd', slotName: 'Ổ cứng lưu trữ (SSD/HDD)', productId: 'sim_ssd3', productName: 'SSD WD Black SN850X 1TB PCIe Gen4 NVMe M.2', price: 2650000, originalPrice: 2650000, quantity: 1, warrantyMonths: 60 },
        { slotId: 'psu', slotName: 'Nguồn máy tính (PSU)', productId: 'sim_psu3', productName: 'Nguồn Corsair RM750e 750W 80 Plus Gold Full Modular', price: 2750000, originalPrice: 2750000, quantity: 1, warrantyMonths: 84 },
        { slotId: 'case', slotName: 'Vỏ máy tính (Case)', productId: 'sim_case3', productName: 'Vỏ case bể cá HYTE Y40 cao cấp', price: 3600000, originalPrice: 3600000, quantity: 1, warrantyMonths: 24 },
        { slotId: 'cooling', slotName: 'Tản nhiệt (CPU Cooler)', productId: 'sim_cool3', productName: 'Tản nhiệt nước AIO Deepcool LT520 240mm', price: 2150000, originalPrice: 2150000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'monitor', slotName: 'Màn hình máy tính', productId: 'sim_mon3', productName: 'Màn hình Dell UltraSharp U2424H 23.8 inch IPS sRGB 100%', price: 5490000, originalPrice: 5490000, quantity: 1, warrantyMonths: 36 },
        { slotId: 'accessories', slotName: 'Bàn phím, chuột & phím', productId: '', productName: 'Chưa lựa chọn', price: 0, originalPrice: 0, quantity: 1, warrantyMonths: 0 }
      ]);
    }
  };

  // Reset build to empty
  const handleResetBuild = () => {
    setBuild(
      DEFAULT_SLOTS.map(slot => ({
        slotId: slot.id,
        slotName: slot.name,
        productId: '',
        productName: '',
        price: 0,
        originalPrice: 0,
        quantity: 1,
        warrantyMonths: 36
      }))
    );
  };

  // Calculate Subtotal & Total
  const subtotalSum = useMemo(() => {
    return build.reduce((sum, item) => sum + (item.productName ? item.price * item.quantity : 0), 0);
  }, [build]);

  const discAmount = useMemo(() => {
    return Math.round((subtotalSum * discountPercent) / 100);
  }, [subtotalSum, discountPercent]);

  const totalBuildValue = useMemo(() => {
    return Math.max(0, subtotalSum - discAmount);
  }, [subtotalSum, discAmount]);

  // Submit quotation or checkout build configurations (transforms build list to actual Invoice details)
  const handleCheckoutBuild = (isQuoteOnly: boolean = false) => {
    const filledItems = build.filter(item => item.productName);
    if (filledItems.length === 0) {
      alert('Vui lòng chọn hoặc tự nhập ít nhất 1 linh kiện trước khi in hóa đơn cấu hình!');
      return;
    }

    // Capture customer id or create new
    let targetId = `guest_${Date.now()}`;
    let targetName = customerName.trim() || 'Khách Vãng Lai';
    let targetPhone = customerPhone.trim() || 'Trống';

    if (customerMode === 'select') {
      const selected = customers.find(c => c.id === selectedCustomerId);
      if (selected) {
        targetId = selected.id;
        targetName = selected.name;
        targetPhone = selected.phone;
      }
    } else if (customerMode === 'new') {
      if (!customerName.trim() || !customerPhone.trim()) {
        alert('Vui lòng điền đầy đủ Tên và SĐT khách hàng cần tạo!');
        return;
      }
      if (!isQuoteOnly) {
        targetId = `c_${Date.now()}`;
        onAddCustomer({
          id: targetId,
          name: customerName,
          phone: customerPhone,
          createdAt: new Date().toISOString()
        });
      }
    }

    if (!isQuoteOnly && paymentMethod === 'Ghi nợ') {
      if (customerMode === 'guest' && (!customerName.trim() || customerName === 'Khách xem báo giá' || !customerPhone.trim())) {
        alert('Giao dịch Ghi nợ (Công nợ) yêu cầu thông tin Tên và SĐT khách hàng! Vui lòng nhập thông tin khách hàng hoặc chọn từ danh bạ CRM.');
        return;
      }
    }

    // Convert build items into invoice invoiceItem mapping
    const invoiceItems: InvoiceItem[] = filledItems.map(item => {
      const selectedList = item.selectedImeis && item.selectedImeis.length > 0
        ? item.selectedImeis
        : (item.selectedImei ? [item.selectedImei] : undefined);

      return {
        productId: item.productId || `custom_${item.slotId}`,
        productName: `[PC Build - ${item.slotName}] ${item.productName}`,
        quantity: item.quantity,
        price: item.price,
        warrantyMonths: item.warrantyMonths,
        imeis: selectedList
      };
    });

    const isDebt = paymentMethod === 'Ghi nợ';
    const finalDebtAmt = isDebt ? (debtAmount > 0 ? debtAmount : totalBuildValue) : undefined;

    // Form note indicating custom PC configuration list
    const parsedNote = `PC BUILD QUOTE & WARRANTY COMBO. ${discountPercent > 0 ? `Chiết khấu ${discountPercent}%. ` : ''}${buildNote ? `Ghi chú: ${buildNote}` : ''}`;

    const configInvoice: SalesInvoice = {
      id: `build_inv_${Date.now()}`,
      invoiceNumber: isQuoteOnly ? `BG-${Math.floor(Math.random() * 8999)}` : `PC-${3001 + Math.floor(Math.random() * 8999)}`,
      customerId: targetId,
      customerName: targetName,
      customerPhone: targetPhone,
      items: invoiceItems,
      totalAmount: totalBuildValue,
      paymentMethod,
      createdAt: new Date().toISOString(),
      note: isQuoteOnly ? `[BẢN BÁO GIÁ] ${parsedNote}` : parsedNote + (isDebt ? ` [Ghi nợ: ${formatVND(finalDebtAmt!)}, Hạn nợ: ${debtDueDate}]` : ''),
      processedBy: currentUser?.fullName || 'Hệ thống THỊNH PHÁT',
      debtAmount: !isQuoteOnly && isDebt ? finalDebtAmt : undefined,
      debtDueDate: !isQuoteOnly && isDebt ? debtDueDate : undefined
    };

    // Save and commit this build invoice into sales lists only if not a quote
    if (!isQuoteOnly) {
      onAddInvoice(configInvoice);
    }
    
    setSavedBuildInvoice(configInvoice);
    setPrintedQuoteInvoice(true);
  };

  return (
    <div className="space-y-6">
      
      {/* 3 Hot Template Presets Shortcut bar */}
      <div className="bg-white p-5 rounded-[2rem] border-2 border-slate-200 bento-shadow flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-indigo-600 animate-pulse shrink-0" />
            <span>Mẫu cấu hình tham khảo sẵn có</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">Áp dụng một trong các bộ combo dưới đây để điền nhanh quy trình phối ráp máy tính.</p>
        </div>
        <div className="flex gap-2.5 flex-wrap">
          <button 
            onClick={() => applyPresetTemplate('office')}
            className="text-[11px] font-bold py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
          >
            Combo Văn Phòng (~11 triệu)
          </button>
          <button 
            onClick={() => applyPresetTemplate('gaming')}
            className="text-[11px] font-bold py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl transition cursor-pointer"
          >
            Combo Gaming Mid (~20 triệu)
          </button>
          <button 
            onClick={() => applyPresetTemplate('designer')}
            className="text-[11px] font-bold py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl transition cursor-pointer"
          >
            Combo Đồ Họa Master (~45 triệu)
          </button>
          <button 
            onClick={handleResetBuild}
            title="Làm trống toàn bộ"
            className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl transition cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* BUILD WORKSPACE GRID */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/40">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wider">CẤU CẤU PHÂN CÔNG LINH KIỆN</span>
              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-sm">SLOT SYSTEM: {DEFAULT_SLOTS.length}</span>
            </div>

            <div className="divide-y divide-slate-100">
              {build.map(item => {
                const isSelected = !!item.productName;
                return (
                  <div key={item.slotId} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition hover:bg-slate-50/20">
                    
                    {/* Component Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs shrink-0">{DEFAULT_SLOTS.find(s => s.id === item.slotId)?.icon}</span>
                      <div className="min-w-0">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider leading-none">{item.slotName}</span>
                        {isSelected ? (
                          <div className="mt-1">
                            <h4 className="font-bold text-slate-900 text-xs truncate">{item.productName}</h4>
                            {(() => {
                              const matchedProd = products.find(p => p.id === item.productId);
                              const isImeiProd = matchedProd?.hasImei || (item.selectedImeis && item.selectedImeis.length > 0) || item.selectedImei;
                              if (!isImeiProd) return null;

                              const selectedList = item.selectedImeis && item.selectedImeis.length > 0
                                ? item.selectedImeis
                                : (item.selectedImei ? [item.selectedImei] : []);

                              const isFullySelected = selectedList.length === item.quantity;

                              return (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => matchedProd && handleOpenImeiModalForProduct(item.slotId, matchedProd)}
                                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 transition cursor-pointer ${
                                      isFullySelected
                                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                        : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                                    }`}
                                  >
                                    <span>
                                      IMEI ({selectedList.length}/{item.quantity}): {selectedList.length > 0 ? selectedList.join(', ') : 'Chưa chọn'}
                                    </span>
                                    <Edit3 className="w-3 h-3 text-indigo-500" />
                                  </button>
                                </div>
                              );
                            })()}
                          </div>
                        ) : (
                          <p onClick={() => handleOpenPicker(item.slotId)} className="text-slate-400 italic text-[11px] mt-1 cursor-pointer hover:text-indigo-600 hover:underline">Chưa cắm linh kiện. Bấm để lắp ráp...</p>
                        )}
                      </div>
                    </div>

                    {/* interactive value sliders */}
                    {isSelected ? (
                      <div className="w-full sm:w-auto flex flex-wrap sm:flex-nowrap items-center justify-end gap-3 shrink-0">
                        
                        {/* Custom Price editable */}
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Giá bán tùy chỉnh (VND)</span>
                          <div className="flex items-center gap-1.5 bg-slate-100/80 px-2 py-1 rounded-lg border border-slate-200/50">
                            <input 
                              type="number" 
                              value={item.price}
                              onChange={e => handleUpdateItemProperty(item.slotId, 'price', Number(e.target.value))}
                              className="w-24 text-right bg-transparent text-xs font-black text-slate-900 focus:outline-hidden"
                            />
                            {item.price !== item.originalPrice && item.originalPrice > 0 && (
                              <button 
                                onClick={() => handleUpdateItemProperty(item.slotId, 'price', item.originalPrice)}
                                title={`Đặt lại giá gốc: ${formatVND(item.originalPrice)}`}
                                className="text-[9px] hover:bg-slate-200 text-indigo-600 font-bold px-1 rounded-sm cursor-pointer"
                              >
                                Reset
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quantity slider */}
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">SL</span>
                          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg p-1">
                            <button 
                              onClick={() => item.quantity > 1 && handleUpdateItemProperty(item.slotId, 'quantity', item.quantity - 1)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-slate-200 text-slate-500 rounded-md font-bold text-xs cursor-pointer"
                            >
                              -
                            </button>
                            <span className="text-[11px] font-bold text-slate-800 w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => handleUpdateItemProperty(item.slotId, 'quantity', item.quantity + 1)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-slate-200 text-slate-500 rounded-md font-bold text-xs cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Warranty Months slider */}
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Bảo hành (tháng)</span>
                          <input 
                            type="number" 
                            value={item.warrantyMonths}
                            onChange={e => handleUpdateItemProperty(item.slotId, 'warrantyMonths', Number(e.target.value))}
                            className="w-14 text-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold p-1 focus:outline-hidden"
                          />
                        </div>

                        {/* Remove button */}
                        <button 
                          onClick={() => handleClearSlot(item.slotId)}
                          className="p-1.5 hover:bg-rose-50 text-rose-500 rounded-lg transition shrink-0 self-end sm:self-center cursor-pointer mt-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        id={`btn-pick-pc-${item.slotId}`}
                        onClick={() => handleOpenPicker(item.slotId)}
                        className="w-full sm:w-auto flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider font-extrabold bg-slate-900 max-sm:py-2 text-white hover:bg-blue-600 px-3.5 py-1.5 rounded-xl cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm
                      </button>
                    )}

                  </div>
                );
              })}
            </div>

          </div>
        </div>

        {/* QUOTATION SUMMARIES & CUSTOMER PANEL */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="bg-slate-900 border-2 border-slate-850 rounded-[2rem] p-6 text-white bento-shadow space-y-6">
            <h3 className="font-extrabold text-sm tracking-wider uppercase">TỔNG HỢP & BÁO GIÁ CẤU HÌNH</h3>
            
            {/* Money block list */}
            <div className="space-y-3.5 border-b border-slate-800 pb-5 text-slate-400 text-xs">
              <div className="flex justify-between">
                <span>Cộng tiền linh kiện:</span>
                <span className="font-bold text-white text-sm">{formatVND(subtotalSum)}</span>
              </div>
              
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-rose-400 font-semibold">
                  <span>Chiết khấu hoá đơn (%):</span>
                  <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700 w-16">
                    <input 
                      type="number" 
                      min={0}
                      max={100}
                      value={discountPercent}
                      onChange={e => setDiscountPercent(Math.min(100, Math.max(0, Number(e.target.value))))}
                      className="w-full text-right bg-transparent border-0 font-bold text-xs pr-1 text-white focus:outline-hidden"
                    />
                    <span className="text-[10px] text-slate-500 pr-1">%</span>
                  </div>
                </div>
                {discAmount > 0 && (
                  <p className="text-right text-[10px] font-medium text-rose-400">- {formatVND(discAmount)}</p>
                )}
              </div>

              {/* Payment selection */}
              <div className="flex justify-between items-center pt-2">
                <span>Thanh toán bằng:</span>
                <select 
                  value={paymentMethod}
                  onChange={e => {
                    const newMethod = e.target.value as any;
                    setPaymentMethod(newMethod);
                    if (newMethod === 'Ghi nợ' && (debtAmount === 0 || debtAmount > totalBuildValue)) {
                      setDebtAmount(totalBuildValue);
                    }
                  }}
                  className="bg-slate-800 text-white rounded-lg text-xs font-semibold p-1.5 focus:outline-hidden border border-slate-700"
                >
                  <option value="Chuyển khoản">Chuyển khoản</option>
                  <option value="Tiền mặt">Tiền mặt</option>
                  <option value="Thẻ">Thẻ ATM/Vùng thẻ</option>
                  <option value="Ghi nợ">📝 Ghi nợ (Công nợ)</option>
                </select>
              </div>

              {paymentMethod === 'Ghi nợ' && (
                <div className="bg-slate-800/80 p-3 rounded-xl border border-amber-500/40 space-y-2.5 text-xs mt-2">
                  <div className="flex justify-between items-center text-amber-400 font-bold text-[11px]">
                    <span>📝 Giao Dịch Ghi Nợ (Công Nợ)</span>
                    <span className="text-[10px] text-amber-300/80 font-normal">Tự động đồng bộ Sổ Nợ</span>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Số tiền ghi nợ (VND):</label>
                    <input 
                      type="number"
                      value={debtAmount}
                      onChange={e => setDebtAmount(Number(e.target.value))}
                      placeholder={totalBuildValue.toString()}
                      className="w-full bg-slate-900 border border-slate-700 text-amber-400 font-bold text-xs p-2 rounded-lg focus:outline-hidden focus:border-amber-500"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                      <span>Khách trả trước: <span className="font-bold text-emerald-400">{formatVND(Math.max(0, totalBuildValue - (debtAmount || 0)))}</span></span>
                      <span>Tổng đơn: {formatVND(totalBuildValue)}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 font-bold mb-1">Hạn thanh toán công nợ:</label>
                    <input 
                      type="date"
                      value={debtDueDate}
                      onChange={e => setDebtDueDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white text-xs p-2 rounded-lg focus:outline-hidden focus:border-amber-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* GRAND TOTAL */}
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">TỔNG CHI PHÍ PHẢI TRẢ:</p>
                <p className="text-xl font-black text-blue-400 tracking-tight mt-1">{formatVND(totalBuildValue)}</p>
              </div>
              <span className="text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">Hợp lệ</span>
            </div>

            {/* CUSTOMER SECTION */}
            <div className="space-y-4 pt-4 border-t border-slate-800 text-xs">
              <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">KHÁCH NHẬN BÁO GIÁ</span>
              
              <div className="grid grid-cols-3 gap-1 bg-slate-955 p-1 rounded-xl">
                {['guest', 'select', 'new'].map(mode => (
                  <button 
                    key={mode}
                    onClick={() => {
                      setCustomerMode(mode as any);
                      if (mode === 'guest') {
                        setCustomerName('Khách xem báo giá');
                        setCustomerPhone('');
                      } else {
                        setCustomerName('');
                      }
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[9px] font-bold text-center uppercase tracking-wide transition transition-all cursor-pointer ${
                      customerMode === mode 
                        ? 'bg-blue-600 text-white' 
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {mode === 'guest' && 'Khách vãng'}
                    {mode === 'select' && 'CRM cũ'}
                    {mode === 'new' && 'Khách mới'}
                  </button>
                ))}
              </div>

              {customerMode === 'select' && (
                <div className="space-y-2">
                  <label className="block text-[10px] text-slate-500 uppercase font-bold">Tìm trong danh bạ khách</label>
                  <select 
                    value={selectedCustomerId}
                    onChange={e => setSelectedCustomerId(e.target.value)}
                    className="w-full bg-slate-800 border-0 border-slate-700 text-white text-xs p-2 rounded-lg focus:outline-hidden font-medium"
                    required
                  >
                    <option value="">-- Chọn khách hàng sẵn có --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
              )}

              {customerMode === 'new' && (
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Nhập họ tên khách hàng..."
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white text-xs p-2.5 rounded-lg focus:outline-hidden"
                  />
                  <input 
                    type="text" 
                    placeholder="Nhập số điện thoại..."
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white text-xs p-2.5 rounded-lg focus:outline-hidden"
                  />
                </div>
              )}

              {customerMode === 'guest' && (
                <div className="space-y-2">
                  <input 
                    type="text" 
                    placeholder="Nhập tên khách hàng (Tùy chọn)..."
                    value={customerName === 'Khách xem báo giá' ? '' : customerName}
                    onChange={e => setCustomerName(e.target.value || 'Khách xem báo giá')}
                    className="w-full bg-slate-800 border-slate-700 text-white text-xs p-2.5 rounded-lg focus:outline-hidden"
                  />
                  <input 
                    type="text" 
                    placeholder="Nhập số điện thoại liên hệ..."
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-800 border-slate-700 text-white text-xs p-2.5 rounded-lg focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Ghi chú bổ sung báo giá</label>
                <textarea 
                  placeholder="Thời hạn báo giá, ưu đãi khuyến mại hay tặng chuột..."
                  value={buildNote}
                  onChange={e => setBuildNote(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-800 text-white text-xs p-2 rounded-lg border-0 focus:outline-hidden resize-none"
                />
              </div>
            </div>

            {/* ACTIONS */}
            <div className="flex flex-col gap-2">
              <button 
                onClick={() => handleCheckoutBuild(true)}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black py-3 rounded-2xl cursor-pointer shadow-md tracking-wider uppercase transition duration-150 border border-slate-700"
              >
                <Printer className="w-4 h-4" /> Chỉ In Báo Giá (Không Lưu DB)
              </button>
              
              <button 
                id="btn-checkout-pc-build"
                onClick={() => handleCheckoutBuild(false)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black py-3 rounded-2xl cursor-pointer shadow-md tracking-wider uppercase transition duration-150"
              >
                <FileCheck2 className="w-4 h-4" /> Chốt Cấu Hình & Lưu Hoá Đơn
              </button>
            </div>

          </div>
          
        </div>

      </div>

      {/* MODAL PICKER DIALOG */}
      <AnimatePresence>
        {activeSlotId !== null && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveSlotId(null)}
              className="fixed inset-0 bg-black"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 w-full max-w-xl z-20 relative max-h-[85vh] flex flex-col"
            >
              
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 shrink-0">
                <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                  <Cpu className="w-4 h-4 text-indigo-600" />
                  Chọn Linh Kiện: {DEFAULT_SLOTS.find(s => s.id === activeSlotId)?.name}
                </h3>
                <button 
                  onClick={() => setActiveSlotId(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toggle custom write in option */}
              <div className="flex gap-2 border-b border-slate-100 pb-3 shrink-0 text-xs">
                <button 
                  onClick={() => setUseCustomWriteIn(false)}
                  className={`flex-1 py-1.5 px-3 font-extrabold rounded-xl transition cursor-pointer ${!useCustomWriteIn ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Kho linh kiện sẵn có
                </button>
                <button 
                  onClick={() => setUseCustomWriteIn(true)}
                  className={`flex-1 py-1.5 px-3 font-extrabold rounded-xl transition cursor-pointer ${useCustomWriteIn ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  Nhập mã tự do
                </button>
              </div>

              {!useCustomWriteIn ? (
                // SEARCH & SELECT DATABASE
                <div className="flex-1 flex flex-col min-h-0 space-y-4 pt-3">
                  <div className="relative shrink-0">
                    <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Gõ mã, linh kiện, thông số cần tìm..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-100 pl-10 pr-4 py-2.5 rounded-xl focus:outline-hidden"
                    />
                  </div>

                  {/* Category Filter Mode Status Bar */}
                  <div className="flex items-center justify-between text-xs bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 shrink-0">
                    <div className="flex items-center gap-1.5 text-slate-600 font-medium truncate">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Bộ lọc:</span>
                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md text-[11px]">
                        {showAllProducts ? '🌐 Tất cả sản phẩm' : `🎯 ${DEFAULT_SLOTS.find(s => s.id === activeSlotId)?.name || 'Chuẩn danh mục'}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAllProducts(!showAllProducts)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 cursor-pointer px-2.5 py-1 rounded-lg border border-indigo-200 shrink-0 transition"
                    >
                      {showAllProducts ? '🎯 Lọc đúng danh mục' : '🌐 Hiển thị tất cả sản phẩm'}
                    </button>
                  </div>

                  {/* List results scroll */}
                  <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
                    {filteredProductsToChoose.map(p => (
                      <div 
                        key={p.id}
                        onClick={() => handleSelectProduct(p)}
                        className="p-3 bg-slate-50 hover:bg-indigo-50/40 rounded-xl border border-slate-100 hover:border-indigo-100/50 flex justify-between items-center cursor-pointer transition text-xs"
                      >
                        <div className="min-w-0 pr-4">
                          <h5 className="font-bold text-slate-800 truncate leading-snug">{p.name}</h5>
                          <p className="text-[10px] text-slate-400 font-mono mt-1">SKU/ID: {p.sku} | Tồn: <span className="font-bold text-slate-600">{p.hasImei ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length : p.stock}</span> | BH: {p.warrantyMonths}T</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-extrabold text-slate-900">{formatVND(p.price)}</p>
                          <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded-sm uppercase tracking-wider">Chọn</span>
                        </div>
                      </div>
                    ))}

                    {filteredProductsToChoose.length === 0 && (
                      <p className="text-center py-10 text-slate-400 text-xs">Không tìm thấy linh kiện phù hợp khớp từ khóa.</p>
                    )}
                  </div>
                </div>
              ) : (
                // CUSTOM MANUAL WRITE IN FORM
                <form onSubmit={handleChooseCustomWriteIn} className="space-y-4 pt-4 shrink-0">
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Tên linh kiện rắp ráp tùy chỉnh *</label>
                      <input 
                        type="text" 
                        required
                        placeholder="e.g. Gigabyte GeForce RTX 4070 Ti 12GB Aero"
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden font-medium text-slate-800"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Giá bán dự toán (VND)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 18500000"
                          value={manualPrice}
                          onChange={e => setManualPrice(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden font-bold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Thời hạn bảo hành (tháng)</label>
                        <input 
                          type="number" 
                          placeholder="e.g. 36"
                          value={manualWarranty}
                          onChange={e => setManualWarranty(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden font-semibold"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setActiveSlotId(null)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Bỏ qua
                    </button>
                    <button 
                      type="submit" 
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Gắn ráp linh kiện
                    </button>
                  </div>
                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PRINT DIALOG BLUEPRINT (BÁO GIÁ KIÊM PHIẾU BẢO HÀNH) */}
      <AnimatePresence>
        {printedQuoteInvoice && savedBuildInvoice && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2.5rem] border-2 border-slate-300 shadow-2xl p-8 w-full max-w-3xl z-20 relative max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 tracking-wider uppercase">VĂN BẢN TRÌNH IN THỊNH PHÁT</span>
                  <button
                    type="button"
                    onClick={() => setShowPrintCustomizer(!showPrintCustomizer)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                      showPrintCustomizer ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    {showPrintCustomizer ? 'Ẩn bộ chỉnh sửa' : 'Chỉnh sửa mẫu in'}
                  </button>
                </div>
                <button 
                  onClick={() => setPrintedQuoteInvoice(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* EXPANDABLE PRINT CUSTOMIZER EDITOR */}
              {showPrintCustomizer && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6 text-xs space-y-4 shadow-inner"
                >
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                    <h4 className="font-extrabold text-slate-800 flex items-center gap-1.5">
                      <Settings className="w-4 h-4 text-indigo-600" />
                      Chỉnh sửa thông tin & Bố cục mẫu in Phiếu báo giá
                    </h4>
                    {onUpdatePrintSettings && (
                      <button
                        type="button"
                        onClick={handleSavePrintTemplate}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold flex items-center gap-1 transition cursor-pointer"
                      >
                        {saveSuccess ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Save className="w-3.5 h-3.5" />}
                        {saveSuccess ? 'Đã lưu mẫu!' : 'Lưu mẫu in mặc định'}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Tiêu đề phiếu in</label>
                      <input 
                        type="text" 
                        value={customQuoteTitle} 
                        onChange={e => setCustomQuoteTitle(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Nội dung cột Tình trạng hàng</label>
                      <input 
                        type="text" 
                        value={customStockStatusText} 
                        onChange={e => setCustomStockStatusText(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs"
                        placeholder="VD: SẴN HÀNG"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Ghi chú VAT</label>
                      <input 
                        type="text" 
                        value={customVatNote} 
                        onChange={e => setCustomVatNote(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Thời hạn báo giá</label>
                      <input 
                        type="text" 
                        value={customValidityNote} 
                        onChange={e => setCustomValidityNote(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-semibold text-slate-800 text-xs"
                      />
                    </div>
                  </div>

                  {/* CUSTOM COLUMN HEADERS & TITLES */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-2">Tên các tiêu đề cột trong bảng</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Cột STT</span>
                        <input type="text" value={customColSttLabel} onChange={e => setCustomColSttLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Cột Sản phẩm</span>
                        <input type="text" value={customColProductLabel} onChange={e => setCustomColProductLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Cột SL</span>
                        <input type="text" value={customColQtyLabel} onChange={e => setCustomColQtyLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Cột Đơn giá</span>
                        <input type="text" value={customColUnitPriceLabel} onChange={e => setCustomColUnitPriceLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Cột Thành tiền</span>
                        <input type="text" value={customColAmountLabel} onChange={e => setCustomColAmountLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Cột Bảo hành</span>
                        <input type="text" value={customColWarrantyLabel} onChange={e => setCustomColWarrantyLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Cột Tình trạng</span>
                        <input type="text" value={customColStockLabel} onChange={e => setCustomColStockLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-semibold">Dòng Tổng tiền</span>
                        <input type="text" value={customTotalLabel} onChange={e => setCustomTotalLabel(e.target.value)} className="w-full px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-semibold" />
                      </div>
                    </div>
                  </div>

                  {/* Toggle column & block switches */}
                  <div className="pt-2 border-t border-slate-200">
                    <label className="block text-[10px] font-bold uppercase text-slate-600 mb-2">Ẩn / Hiện các cột & phần thông tin</label>
                    <div className="flex flex-wrap gap-4 text-slate-700 font-semibold">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showWarrantyColumn} onChange={e => setShowWarrantyColumn(e.target.checked)} className="rounded text-indigo-600" />
                        <span>Cột Bảo hành</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showStockColumn} onChange={e => setShowStockColumn(e.target.checked)} className="rounded text-indigo-600" />
                        <span>Cột Tình trạng hàng</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showWarrantyTerms} onChange={e => setShowWarrantyTerms(e.target.checked)} className="rounded text-indigo-600" />
                        <span>Quy định bảo hành</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showBankInfo} onChange={e => setShowBankInfo(e.target.checked)} className="rounded text-indigo-600" />
                        <span>Thông tin ngân hàng</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showQrCode} onChange={e => setShowQrCode(e.target.checked)} className="rounded text-indigo-600" />
                        <span>Mã QR VietQR</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" checked={showSignatures} onChange={e => setShowSignatures(e.target.checked)} className="rounded text-indigo-600" />
                        <span>Khối Chữ ký</span>
                      </label>
                    </div>
                  </div>

                  {/* Warranty rules list editor */}
                  {showWarrantyTerms && (
                    <div className="pt-2 border-t border-slate-200">
                      <div className="flex justify-between items-center mb-1.5">
                        <label className="block text-[10px] font-bold uppercase text-slate-600">Nội dung quy định bảo hành</label>
                        <button
                          type="button"
                          onClick={() => setCustomWarrantyTerms([...customWarrantyTerms, ""])}
                          className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> Thêm điều khoản
                        </button>
                      </div>
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {customWarrantyTerms.map((term, index) => (
                          <div key={index} className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-slate-400 w-4 text-center shrink-0">{index + 1}.</span>
                            <input
                              type="text"
                              value={term}
                              onChange={e => {
                                const updated = [...customWarrantyTerms];
                                updated[index] = e.target.value;
                                setCustomWarrantyTerms(updated);
                              }}
                              className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-md font-medium text-slate-800 text-[11px]"
                              placeholder="Nhập điều khoản bảo hành..."
                            />
                            <button
                              type="button"
                              onClick={() => setCustomWarrantyTerms(customWarrantyTerms.filter((_, i) => i !== index))}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Printable Invoice Container */}
              <div 
                id="print-pc-quote-block" 
                className="bg-white text-slate-800 shadow-xl border border-slate-200 relative p-6 font-sans mx-auto transition-all duration-300 leading-normal"
                style={{ 
                  fontSize: printSettings?.fontSize === 'sm' ? '11px' : printSettings?.fontSize === 'lg' ? '15px' : '13px',
                  width: printSettings?.paperSize === 'k80' ? '320px' : printSettings?.paperSize === 'k57' ? '260px' : '100%',
                  maxWidth: '700px'
                }}
              >
                {/* BRANDING TOP HIGHLIGHT LINE */}
                <div className="h-1.5 w-full rounded-t" style={{ backgroundColor: printSettings?.primaryColor || '#bd1e24' }}></div>
                
                {/* Brand header */}
                <div className={`flex ${printSettings?.paperSize !== 'a4' ? 'flex-col items-center text-center gap-2' : 'flex-row items-center justify-start gap-4'} pb-4 border-b border-dashed border-slate-300 mt-4`}>
                  {printSettings?.showLogoSymbol && (
                    <div className="flex-shrink-0 flex items-center justify-center">
                      {printSettings?.storeLogoImage ? (
                        <img src={printSettings.storeLogoImage} style={{ width: printSettings?.paperSize === 'a4' ? `${printSettings?.storeLogoWidth || 120}px` : `${(printSettings?.storeLogoWidth || 120)*0.5}px`, objectFit: 'contain' }} alt="Logo" />
                      ) : (
                        <div 
                          className={`rounded-full flex items-center justify-center font-bold text-white ring-4 ring-slate-100 ${printSettings?.paperSize === 'a4' ? 'w-16 h-16 text-3xl' : 'w-10 h-10 text-sm'}`}
                          style={{ backgroundColor: printSettings?.primaryColor || '#bd1e24', width: printSettings?.paperSize === 'a4' ? `${printSettings?.storeLogoWidth || 120}px` : `${(printSettings?.storeLogoWidth || 120)*0.5}px`, height: printSettings?.paperSize === 'a4' ? `${printSettings?.storeLogoWidth || 120}px` : `${(printSettings?.storeLogoWidth || 120)*0.5}px` }}
                        >
                          {printSettings?.storeLogoText || "TP"}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div className={`flex-1 font-serif ${printSettings?.paperSize !== 'a4' ? 'text-center' : 'text-left'}`} style={{ fontFamily: '"Times New Roman", Times, serif' }}>
                    <h2 className={`font-bold uppercase leading-snug tracking-wide ${printSettings?.paperSize === 'a4' ? 'text-xl' : 'text-sm'}`} style={{ color: printSettings?.primaryColor || '#bd1e24' }}>
                      {printSettings?.storeName || 'THỊNH PHÁT COMPUTER'}
                    </h2>
                    
                    {printSettings?.storeSlogan && (
                      <p className={`text-slate-600 font-bold italic tracking-wide mt-0.5 ${printSettings?.paperSize === 'a4' ? 'text-[0.7rem]' : 'text-[8px]'}`}>{printSettings.storeSlogan}</p>
                    )}

                    <div className={`font-semibold text-black leading-tight mt-1 space-y-0.5 ${printSettings?.paperSize === 'a4' ? 'text-[0.95rem]' : 'text-[9px]'}`}>
                      <p><span className="font-bold">Địa chỉ:</span> {printSettings?.storeAddress || '126 Hồ Tùng Mậu - Hòa Minh - Liên Chiểu - Đà Nẵng'}</p>
                      <p><span className="font-bold">Tel:</span> {printSettings?.storePhone || '0935024002 (Zalo) - 0971682684 - Mr Thịnh'}</p>
                      {printSettings?.storeWebsite && <p><span className="font-bold">Email:</span> {printSettings.storeWebsite}</p>}
                    </div>
                  </div>
                </div>

                {/* Main Document Title */}
                <div className="text-center mb-4">
                  <h3 className="text-[1.25em] font-black uppercase" style={{ color: printSettings?.primaryColor || '#bd1e24' }}>
                    {customQuoteTitle || (savedBuildInvoice.invoiceNumber.startsWith('BG-') ? 'BẢNG BÁO GIÁ CẤU HÌNH PC' : 'BẢNG BÁO GIÁ KIÊM PHIẾU BẢO HÀNH')}
                  </h3>
                  <p className="text-[0.75em] font-bold text-slate-400 mt-1">Ngày lập: {new Date(savedBuildInvoice.createdAt).toLocaleDateString('vi-VN')} - Tên NV: {savedBuildInvoice.processedBy || currentUser?.fullName || 'Nhân viên'}</p>
                </div>

                {/* Customer Section */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-[0.85em] font-semibold space-y-1 block leading-normal mb-4">
                  <p className="text-[0.75em] font-black text-slate-400 uppercase tracking-widest">Thông tin người nhận báo giá:</p>
                  <p>Khách hàng: <span className="font-bold text-slate-900">{savedBuildInvoice.customerName}</span></p>
                  <p>Số điện thoại: <span className="font-bold text-slate-900">{savedBuildInvoice.customerPhone}</span></p>
                  {savedBuildInvoice.note && <p>Yêu cầu/Ghi chú: <span className="text-slate-600">{savedBuildInvoice.note.replace('[BẢN BÁO GIÁ]', '').trim()}</span></p>}
                </div>

                {/* Spreadsheet Matrix matching screenshot format */}
                <div className="overflow-x-auto w-full mb-4">
                  <table className="w-full border-collapse border border-slate-300 text-[0.85em]">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-300 py-2 w-8 text-center uppercase tracking-tighter">{customColSttLabel}</th>
                        <th className="border border-slate-300 py-2 px-2 text-left uppercase">{customColProductLabel}</th>
                        <th className="border border-slate-300 py-2 w-10 text-center uppercase">{customColQtyLabel}</th>
                        <th className="border border-slate-300 py-2 w-20 text-center uppercase">{customColUnitPriceLabel}</th>
                        <th className="border border-slate-300 py-2 w-20 text-center uppercase">{customColAmountLabel}</th>
                        {showWarrantyColumn && (
                          <th className="border border-slate-300 py-2 w-12 text-center uppercase tracking-tighter">{customColWarrantyLabel}</th>
                        )}
                        {showStockColumn && (
                          <th className="border border-slate-300 py-2 w-16 text-center uppercase tracking-tighter text-blue-800">{customColStockLabel}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="text-slate-900 font-medium pb-2">
                      {(() => {
                        const activeItems = build.filter(it => it.productName);
                        // Make sure we have exactly 12 rows minimum like image
                        const limitRows = Math.max(12, activeItems.length);
                        
                        return (
                          <>
                            {Array.from({ length: limitRows }).map((_, idx) => {
                              if (idx < activeItems.length) {
                                 const item = activeItems[idx];
                                 return (
                                   <tr key={idx} className="h-8 hover:bg-slate-50">
                                     <td className="border border-slate-300 py-1.5 text-center">{idx + 1}</td>
                                     <td className="border border-slate-300 py-1.5 px-3 font-semibold text-slate-900">{item.productName}</td>
                                     <td className="border border-slate-300 py-1.5 text-center font-bold">{item.quantity}</td>
                                     <td className="border border-slate-300 py-1.5 text-right px-2 font-semibold text-slate-700">{formatVND(item.price)}</td>
                                     <td className="border border-slate-300 py-1.5 text-right px-2 font-bold">{formatVND(item.price * item.quantity)}</td>
                                     {showWarrantyColumn && (
                                       <td className="border border-slate-300 py-1.5 text-center text-slate-800">{item.warrantyMonths > 0 ? formatWarrantyText(item.warrantyMonths) : '03TH'}</td>
                                     )}
                                     {showStockColumn && (
                                       <td className="border border-slate-300 py-1.5 text-center font-extrabold text-blue-700 uppercase">{customStockStatusText || 'SẴN HÀNG'}</td>
                                     )}
                                   </tr>
                                 );
                              } else {
                                 return (
                                   <tr key={idx} className="h-8">
                                     <td className="border border-slate-300 py-1.5 text-center">{idx + 1}</td>
                                     <td className="border border-slate-300 py-1.5 px-3"></td>
                                     <td className="border border-slate-300 py-1.5 text-center"></td>
                                     <td className="border border-slate-300 py-1.5 text-right px-2"></td>
                                     <td className="border border-slate-300 py-1.5 text-right px-2"></td>
                                     {showWarrantyColumn && <td className="border border-slate-300 py-1.5 text-center"></td>}
                                     {showStockColumn && <td className="border border-slate-300 py-1.5 text-center"></td>}
                                   </tr>
                                 );
                              }
                            })}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                  
                  {/* Total Value */}
                  <div className="flex justify-between items-center text-[1em] font-black border-b border-t border-dashed border-slate-300 py-3 mt-4">
                    <span className="uppercase" style={{ color: printSettings?.primaryColor || '#bd1e24' }}>{customTotalLabel || 'TỔNG CỘNG CẤU HÌNH BAO GỒM VAT:'}</span>
                    <span className="text-slate-900 font-black text-[1.1em]">{formatVND(totalBuildValue)}</span>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="pt-2 text-[0.8em] text-slate-800 space-y-4 font-medium">
                  
                  {/* Warranty Terms and Policies */}
                  {showWarrantyTerms && customWarrantyTerms.length > 0 && (
                    <div className="space-y-1">
                      <p className="font-bold uppercase text-[1.1em]" style={{ color: printSettings?.primaryColor || '#bd1e24' }}>{customWarrantyTermsHeader || 'MỘT SỐ QUY ĐỊNH BẢO HÀNH:'}</p>
                      <ul className="list-decimal pl-4 space-y-0.5">
                        {customWarrantyTerms.filter(t => t.trim()).map((term, i) => (
                          <li key={i}>{term}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-6 my-6 border-t border-slate-200 mt-4 pt-4">
                    {/* Left Column: Rules & Bank Info */}
                    <div className="space-y-3">
                      {(customVatNote || customValidityNote) && (
                        <div className="space-y-0.5 font-bold text-[0.9em] text-slate-600">
                          {customVatNote && <p>{customVatNote}</p>}
                          {customValidityNote && <p>{customValidityNote}</p>}
                        </div>
                      )}

                      {showBankInfo && (
                        <div className="space-y-1 pt-2">
                          <p className="font-extrabold uppercase text-[0.9em]" style={{ color: printSettings?.primaryColor || '#bd1e24' }}>{customBankHeader || 'Thông tin chuyển khoản:'}</p>
                          <p>Tên tài khoản: <span className="font-bold text-slate-900">{formatAccountName(printSettings?.bankAccountName || "Hà Thanh Thịnh")}</span></p>
                          <p>Số tài khoản: <span className="font-bold text-slate-900">{printSettings?.bankAccountNo || "0041000220324"}</span></p>
                          <p>Ngân hàng: <span className="font-bold text-slate-900">{formatBankName(printSettings?.bankId || 'TPB')}</span></p>
                          
                          {/* Visual QR quick pay - Only render if showQrCode is true */}
                          {showQrCode && printSettings?.bankAccountNo && (
                            <div className="mt-2 w-fit select-none">
                              <img 
                                src={`https://img.vietqr.io/image/${printSettings.bankId || 'VCB'}-${printSettings.bankAccountNo}-${printSettings?.qrCompact ? 'compact2' : 'qr_only'}.png?amount=${totalBuildValue}&addInfo=${encodeURIComponent(`Thanh toan don PC ${savedBuildInvoice.invoiceNumber}`)}&accountName=${encodeURIComponent(printSettings.bankAccountName || '')}`} 
                                alt="VietQR Quickpay"
                                referrerPolicy="no-referrer"
                                className="w-[85px] h-[85px] object-contain border-2 border-slate-200 p-0.5 rounded-sm"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right Column: Date & Signatures */}
                    {showSignatures && (
                      <div className="flex flex-col items-center justify-start text-center">
                        <p className="italic text-[0.9em]">
                          Ngày {String(new Date(savedBuildInvoice.createdAt).getDate()).padStart(2, '0')} tháng {String(new Date(savedBuildInvoice.createdAt).getMonth() + 1).padStart(2, '0')} năm {new Date(savedBuildInvoice.createdAt).getFullYear()}
                        </p>
                        
                        <div className="grid grid-cols-2 w-full pt-4 gap-2">
                          <div>
                            <p className="font-bold text-[1em]">Khách hàng</p>
                            <p className="text-[0.8em] italic text-slate-500">(Ký, ghi rõ họ tên)</p>
                            <div className="h-16"></div>
                            <p className="font-bold text-[0.9em]">{savedBuildInvoice.customerName}</p>
                          </div>
                          <div>
                            <p className="font-bold flex items-center justify-center uppercase text-[0.9em]">{printSettings?.storeName || "CƯẢ HÀNG"}</p>
                            <p className="text-[0.8em] italic text-slate-500">(Ký, đóng dấu)</p>
                            <div className="h-16"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {printSettings?.storeNote && (
                    <p className="italic text-center w-full block mt-2 pt-2 border-t border-slate-100 text-[0.8em] text-slate-500">
                      {printSettings.storeNote}
                    </p>
                  )}
                </div>

              </div>

              {/* Controls */}
              <div className="flex justify-between items-center mt-6">
                <button
                  type="button"
                  onClick={() => {
                    const printContents = document.getElementById('print-pc-quote-block')?.innerHTML;
                    const originalContents = document.body.innerHTML;
                    if (printContents) {
                      document.body.innerHTML = printContents;
                      window.print();
                      document.body.innerHTML = originalContents;
                      window.location.reload(); // reload safely since state needs reset
                    }
                  }}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> In Ngay Bản Báo Giá Hóa Đơn
                </button>
                <button 
                  type="button" 
                  onClick={() => {
                    setPrintedQuoteInvoice(false);
                    // Clear the build so they can make a new one
                    setBuild(
                      DEFAULT_SLOTS.map(slot => ({
                        slotId: slot.id,
                        slotName: slot.name,
                        productId: '',
                        productName: '',
                        price: 0,
                        originalPrice: 0,
                        quantity: 1,
                        warrantyMonths: 36
                      }))
                    );
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer transition border border-slate-200"
                >
                  Đóng & Kết thúc build
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMEI Selector Modal */}
      <AnimatePresence>
        {selectingImeiFor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setSelectingImeiFor(null)} />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl p-6 relative w-full max-w-lg z-10 border border-slate-200"
            >
              <div className="flex justify-between items-start mb-4 pb-3 border-b border-slate-100">
                 <div>
                   <h2 className="text-base font-extrabold text-slate-900">Chọn IMEI cho {selectingImeiFor.product.name}</h2>
                   <p className="text-xs text-slate-500 font-medium mt-0.5">
                     Đã chọn: <span className="font-bold text-indigo-600">{tempSelectedImeis.length} IMEI</span>
                     <span className="text-slate-400 font-normal ml-1.5">(Số lượng linh kiện sẽ tự động là {Math.max(1, tempSelectedImeis.length)})</span>
                   </p>
                 </div>
                 <button onClick={() => setSelectingImeiFor(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5"/></button>
              </div>

              {/* Action shortcuts */}
              {(() => {
                const inStockList = imeis.filter(i => i.productId === selectingImeiFor.product.id && i.status === 'in_stock');
                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="text-xs text-slate-600 font-medium">Kho hiện có: <strong className="text-slate-900">{inStockList.length} IMEI</strong></span>
                      <div className="flex gap-2">
                        {inStockList.length > 0 && tempSelectedImeis.length < inStockList.length && (
                          <button
                            type="button"
                            onClick={() => setTempSelectedImeis(inStockList.map(x => x.imei))}
                            className="text-[11px] font-bold text-indigo-600 hover:bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200 transition cursor-pointer"
                          >
                            Chọn tất cả ({inStockList.length})
                          </button>
                        )}
                        {tempSelectedImeis.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setTempSelectedImeis([])}
                            className="text-[11px] font-bold text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-lg border border-rose-200 transition cursor-pointer"
                          >
                            Bỏ chọn tất cả
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {inStockList.map(i => {
                        const isChecked = tempSelectedImeis.includes(i.imei);
                        return (
                          <div
                            key={i.id}
                            onClick={() => handleToggleImeiSelection(i.imei)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                              isChecked
                                ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 font-bold shadow-xs'
                                : 'bg-white border-slate-200 hover:border-indigo-200 text-slate-700'
                            }`}
                          >
                            <span className="font-mono font-bold tracking-wide">{i.imei}</span>
                            <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <ShieldCheck className="w-3.5 h-3.5" />}
                            </div>
                          </div>
                        );
                      })}

                      {inStockList.length === 0 && (
                        <p className="text-center text-slate-400 py-6 text-xs">Không có IMEI nào đang sẵn kho cho sản phẩm này.</p>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setSelectingImeiFor(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmImeiSelection}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold cursor-pointer shadow-md"
                      >
                        Xác nhận ({tempSelectedImeis.length} IMEI)
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
