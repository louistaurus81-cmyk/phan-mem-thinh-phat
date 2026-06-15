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


