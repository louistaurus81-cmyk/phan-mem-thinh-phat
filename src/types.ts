export interface ProductIMEI {
  id: string; // Typically a UUID
  productId: string;
  imei: string;
  status: 'in_stock' | 'sold';
  addedAt: string;
  invoiceId?: string; // Links to the invoice when sold
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

