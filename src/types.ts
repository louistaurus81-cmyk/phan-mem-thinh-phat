export interface ProductIMEI {
  id: string; // Typically a UUID
  productId: string;
  imei: string;
  status: 'in_stock' | 'sold';
  addedAt: string;
  invoiceId?: string; // Links to the invoice when sold
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  cost: number;
  stock: number;
  warrantyMonths: number;
  category: string;
  location?: string;
  minStock?: number;
  hasImei?: boolean; // Indicates if this product tracks specific IMEIs
  supplierId?: string; // ADDED: Links to supplier
}

export interface Category {
  id: string;
  name: string;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  warrantyMonths?: number;
  imeis?: string[]; // Array of IMEIs specifically sold in this invoice item
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  items: InvoiceItem[];
  totalAmount: number;
  paymentMethod: 'Tiền mặt' | 'Chuyển khoản' | 'Thẻ';
  createdAt: string;
  note?: string;
  processedBy?: string;
  debtAmount?: number; // ADDED: Amount still owed
}

export interface Debt {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  remainingAmount: number;
  dueDate: string;
  status: 'pending' | 'paid' | 'partial';
  createdAt: string;
  note?: string;
}

export type UserRole = 'admin' | 'sales' | 'technician';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  createdAt: string;
}

export type RepairStatus = 'checking' | 'repairing' | 'completed' | 'delivered';


export interface RepairTicket {
  id: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  deviceName: string;
  deviceSerial: string;
  issueDescription: string;
  solution?: string;
  status: RepairStatus;
  estimatedCost: number;
  actualCost: number;
  technician: string;
  createdAt: string;
  updatedAt: string;
  warrantyUntil?: string;
  deliveredAt?: string;
  note?: string;
  processedBy?: string;
  linkedInvoiceId?: string; // ADDED: Link to original invoice
  usedParts?: { productId: string, name: string, quantity: number, price: number }[]; // ADDED: Parts used in repair
}

export interface WarrantyCard {
  id: string;
  serialNumber: string;
  productName: string;
  customerName: string;
  customerPhone: string;
  purchaseDate: string;
  warrantyMonths: number;
  expiryDate: string;
  status: 'active' | 'expired';
  notes?: string;
  processedBy?: string;
  linkedInvoiceId?: string;
  linkedRepairId?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  createdAt: string;
}

export interface PrintSettings {
  storeName: string;
  storeSlogan: string;
  storeAddress: string;
  storePhone: string;
  storeWebsite: string;
  storeNote: string;
  storeLogoText?: string;
  storeLogoImage?: string;
  storeLogoWidth?: number;
  primaryColor: string;
  fontSize: 'sm' | 'md' | 'lg';
  showLogoSymbol: boolean;
  paperSize: 'a4' | 'k80' | 'k57';
  bankId: string;
  bankAccountNo: string;
  bankAccountName: string;
  qrCompact: boolean;
}

export function formatWarrantyText(months: number): string {
  if (months === 0.1) return '3 Ngày';
  if (months === 0.2) return '7 Ngày';
  if (months === 0.3 || months === 0.35 || months === 0.25) return 'Bao test';
  if (months === 0) return 'Không bảo hành';
  return `${months} Tháng`;
}

export function computeExpiryDate(startDateStr: string, months: number): string {
  const d = new Date(startDateStr);
  if (isNaN(d.getTime())) {
    return startDateStr;
  }
  if (months === 0.1) {
    d.setDate(d.getDate() + 3);
  } else if (months === 0.2) {
    d.setDate(d.getDate() + 7);
  } else if (months === 0.3 || months === 0.35 || months === 0.25) {
    // "Bao test": test and buy on-the-spot, no warranty period
    // Do not add any days; expiry date is the purchase date itself
  } else {
    d.setMonth(d.getMonth() + months);
  }
  return d.toISOString().slice(0, 10);
}

export function generateRandomIMEI(): string {
  // Generate a standard TAC code (990000 custom used block) with random digits
  let imei = '990000' + Math.floor(10000000 + Math.random() * 90000000).toString().substring(0, 8);
  
  // Calculate Luhn checksum for authentic-looking 15-digit IMEI
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let digit = parseInt(imei[i], 10);
    if (i % 2 !== 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return imei + checksum;
}

export function generateRandomBarcode(categoryName?: string): string {
  const d = new Date();
  const year = d.getFullYear().toString().slice(-2);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const cateSlug = categoryName ? categoryName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '') : 'GEN';
  const cleanSlug = cateSlug || 'GEN';
  const random = Math.floor(1000 + Math.random() * 9000).toString();
  return `USED-${cleanSlug}-${year}${month}${day}-${random}`;
}

export function renderCode39SVG(text: string): string {
  const code = text.toUpperCase().replace(/[^0-9A-Z\-\. \$\/\+\%]/g, '-');
  const fullText = `*${code}*`;
  
  // Character patterns for Code 39 (1 is black bar, 0 is white space)
  const charEncodings: Record<string, string> = {
    '1': '110100101011', '2': '101100101011', '3': '110110010101', '4': '101001101011',
    '5': '110100110101', '6': '101100110101', '7': '101001011011', '8': '110100101101',
    '9': '101100101101', '0': '101001101101', 'A': '110101001011', 'B': '101101001011',
    'C': '110110100101', 'D': '101011001011', 'E': '110101100101', 'F': '101101100101',
    'G': '101010011011', 'H': '110101001101', 'I': '101101001101', 'J': '101011001101',
    'K': '110101010011', 'L': '101101010011', 'M': '110110101001', 'N': '101011010011',
    'O': '110101101001', 'P': '101101101001', 'Q': '101010110011', 'R': '110101011001',
    'S': '101101011001', 'T': '101011011001', 'U': '110010101011', 'V': '100110101011',
    'W': '110011010101', 'X': '100101101011', 'Y': '110010110101', 'Z': '100111010101',
    '-': '100101011011', '.': '110010101101', ' ': '100110101101', '*': '100101101101',
    '$': '100100100101', '/': '100100101001', '+': '100101001001', '%': '101001001001'
  };

  let binaryPattern = '';
  for (let i = 0; i < fullText.length; i++) {
    const char = fullText[i];
    const pattern = charEncodings[char] || charEncodings['-'];
    binaryPattern += pattern + '0'; // narrow gap
  }

  const barWidth = 1.8;
  const height = 48;
  let svgPaths = '';
  let currentX = 15; // Left margin

  for (let i = 0; i < binaryPattern.length; i++) {
    if (binaryPattern[i] === '1') {
      svgPaths += `<rect x="${currentX}" y="4" width="${barWidth}" height="${height}" fill="black" />`;
    }
    currentX += barWidth;
  }

  const svgWidth = currentX + 15; // Right margin
  return `
    <svg width="100%" height="76" viewBox="0 0 ${svgWidth} 76" xmlns="http://www.w3.org/2000/svg">
      <style>
        .barcode-text { font-family: monospace; font-size: 11px; fill: #1e293b; font-weight: bold; text-anchor: middle; }
      </style>
      <rect width="100%" height="100%" fill="white" />
      ${svgPaths}
      <text x="${svgWidth / 2}" y="${height + 18}" class="barcode-text">${text}</text>
    </svg>
  `;
}


