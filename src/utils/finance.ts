import { Product, SalesInvoice, RepairTicket, Debt, InvoiceItem, DebtPayment } from '../types';

/**
 * Single Source of Truth for all Financial, Inventory, and Debt calculations
 * across Thịnh Phát Computer POS System.
 */

// Format VND currency consistently across all views
export const formatVND = (value: number): string => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
};

// Safe local date string extraction (YYYY-MM-DD) avoiding timezone shifts
export const getLocalDateStr = (dateInput?: string | Date): string => {
  if (!dateInput) return new Date().toISOString().slice(0, 10);
  if (typeof dateInput === 'string') {
    if (dateInput.includes('T')) return dateInput.split('T')[0];
    if (dateInput.length >= 10) return dateInput.slice(0, 10);
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Check if a SalesInvoice represents a synchronized Repair Ticket
 * This prevents double-counting repair revenue in both Invoices and Repairs.
 */
export const isRepairInvoice = (inv: SalesInvoice): boolean => {
  if (!inv) return false;
  if (inv.id && inv.id.startsWith('inv_repair_')) return true;
  if (inv.invoiceNumber && (inv.invoiceNumber.startsWith('HD-REP-') || inv.invoiceNumber.includes('REP-'))) return true;
  if (inv.note && (inv.note.includes('sửa chữa #REP') || inv.note.includes('Xuất kho linh kiện & sửa chữa #'))) return true;
  return false;
};

/**
 * Clean document number preserving prefixes (e.g. HD-1001, REP-2001, PC-3001)
 * DO NOT strip document type prefixes because HD-1001 and REP-1001 are separate documents!
 */
export const cleanDocumentNumber = (str?: string): string => {
  if (!str) return '';
  return str.replace(/^#+/, '').trim().toUpperCase();
};

/**
 * Match a Debt record with a SalesInvoice strictly and safely
 */
export const isExactDebtInvoiceMatch = (debt: Debt, inv: SalesInvoice): boolean => {
  if (!debt || !inv) return false;

  // 1. Direct Invoice ID match
  if (debt.invoiceId && (debt.invoiceId === inv.id || debt.invoiceId === inv.invoiceNumber)) {
    return true;
  }
  if (debt.id && (debt.id === `debt_${inv.id}` || debt.id.includes(`inv_${inv.id}`))) {
    return true;
  }

  // 2. Strict document number match (both must be present and identical)
  const cleanDebtDoc = cleanDocumentNumber(debt.invoiceNumber);
  const cleanInvDoc = cleanDocumentNumber(inv.invoiceNumber);
  if (cleanDebtDoc && cleanInvDoc && cleanDebtDoc === cleanInvDoc) {
    return true;
  }

  // 3. Fallback matching ONLY if both lack document numbers or have exact matching ID
  if (debt.customerId && inv.customerId === debt.customerId) {
    if (
      inv.debtAmount &&
      inv.debtAmount > 0 &&
      (debt.amount === inv.debtAmount || debt.remainingAmount === inv.debtAmount) &&
      inv.createdAt === debt.createdAt
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Match a Debt record with a RepairTicket strictly and safely
 */
export const isExactDebtRepairMatch = (debt: Debt, rep: RepairTicket): boolean => {
  if (!debt || !rep) return false;

  // 1. Direct Repair ID match
  if (debt.invoiceId && (debt.invoiceId === `inv_repair_${rep.id}` || debt.invoiceId === rep.id)) {
    return true;
  }
  if (debt.id && debt.id.includes(`rep_${rep.id}`)) {
    return true;
  }

  // 2. Exact ticket number match
  const cleanDebtDoc = cleanDocumentNumber(debt.invoiceNumber);
  const cleanTicketDoc = cleanDocumentNumber(rep.ticketNumber);
  if (cleanDebtDoc && cleanTicketDoc) {
    if (cleanDebtDoc === cleanTicketDoc || cleanDebtDoc === `HD-REP-${cleanTicketDoc}` || cleanDebtDoc === `REP-${cleanTicketDoc}`) {
      return true;
    }
  }

  // 3. Fallback matching if exact customer, debt amount, and createdAt
  if (debt.customerId && rep.customerId === debt.customerId) {
    if (
      rep.debtAmount &&
      rep.debtAmount > 0 &&
      (debt.amount === rep.debtAmount || debt.remainingAmount === rep.debtAmount) &&
      rep.createdAt === debt.createdAt
    ) {
      return true;
    }
  }

  return false;
};

/**
 * Find matching catalog product with fallback normalizations
 */
export const findMatchingProduct = (
  products: Product[],
  productId?: string,
  productName?: string
): Product | undefined => {
  if (!products || products.length === 0) return undefined;

  // 1. Exact ID or SKU match
  if (productId) {
    const direct = products.find(p => p.id === productId || (p.sku && p.sku === productId));
    if (direct) return direct;
  }

  // 2. Exact or normalized name match
  if (productName) {
    const cleanName = productName
      .replace(/^\[PC Build - [^\]]+\]\s*/i, '')
      .replace(/^Linh kiện:\s*/i, '')
      .replace(/\s*\(S\/N:[^)]+\)/i, '')
      .trim();

    const byName = products.find(p => 
      p.name === productName || 
      p.name === cleanName ||
      (cleanName.length > 3 && p.name.toLowerCase() === cleanName.toLowerCase())
    );
    if (byName) return byName;
  }

  return undefined;
};

/**
 * Calculate accurate unit cost price for an item
 */
export const getItemCostPrice = (
  item: { productId?: string; productName?: string; price: number },
  products: Product[]
): number => {
  const prod = findMatchingProduct(products, item.productId, item.productName);
  if (prod && typeof prod.cost === 'number' && prod.cost > 0) {
    return prod.cost;
  }
  // Standard wholesale fallback: 70% of retail price
  return Math.round(Number(item.price || 0) * 0.7);
};

/**
 * Calculate cost of a SalesInvoice
 */
export const calculateInvoiceCost = (inv: SalesInvoice, products: Product[]): number => {
  if (!inv || !inv.items || inv.items.length === 0) return 0;
  return inv.items.reduce((sum, item) => {
    const unitCost = getItemCostPrice(item, products);
    return sum + (unitCost * Number(item.quantity || 1));
  }, 0);
};

/**
 * Calculate parts cost used in a RepairTicket
 */
export const calculateRepairPartsCost = (rep: RepairTicket, products: Product[]): number => {
  if (!rep || !rep.usedParts || rep.usedParts.length === 0) return 0;
  return rep.usedParts.reduce((sum, part) => {
    const unitCost = getItemCostPrice(part, products);
    return sum + (unitCost * Number(part.quantity || 1));
  }, 0);
};

/**
 * Calculate total parts selling value in a RepairTicket
 */
export const calculateRepairPartsSelling = (rep: RepairTicket): number => {
  if (!rep || !rep.usedParts || rep.usedParts.length === 0) return 0;
  return rep.usedParts.reduce((sum, part) => {
    return sum + (Number(part.price || 0) * Number(part.quantity || 1));
  }, 0);
};

/**
 * Calculate revenue for a RepairTicket
 */
export const calculateRepairRevenue = (rep: RepairTicket): number => {
  if (!rep) return 0;
  // Completed or delivered tickets produce realized revenue
  if (rep.status === 'completed' || rep.status === 'delivered') {
    return Number(rep.actualCost || rep.estimatedCost || 0);
  }
  return 0;
};

/**
 * Calculate profit for a RepairTicket
 * Standard formula: Repair Revenue - Cost of Replaced Hardware Parts
 */
export const calculateRepairProfit = (rep: RepairTicket, products: Product[]): number => {
  const rev = calculateRepairRevenue(rep);
  if (rev <= 0) return 0;
  const partsCost = calculateRepairPartsCost(rep, products);
  return Math.max(0, rev - partsCost);
};

/**
 * Reconcile and audit a Debt record mathematically.
 * STRICT ENFORCEMENT: A debt CANNOT be marked paid or zeroed out
 * unless total verified payments equal or exceed the debt amount!
 */
export const reconcileDebtBalance = (debt: Debt): Debt => {
  const payments = debt.payments || [];
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const debtPrincipal = Math.max(0, Number(debt.amount) || 0);
  const remaining = Math.max(0, debtPrincipal - totalPaid);

  const status: 'pending' | 'partial' | 'paid' = 
    remaining === 0 ? 'paid' : (totalPaid > 0 ? 'partial' : 'pending');

  return {
    ...debt,
    amount: debtPrincipal,
    remainingAmount: remaining,
    status,
    payments
  };
};

/**
 * Master Financial Aggregator
 * Single Source of Truth for Dashboard, OwnerDashboard, and ReportManager
 */
export interface FinancialStats {
  // Pure Sales (excluding repair invoices to prevent double counting)
  salesRevenue: number;
  salesCost: number;
  salesProfit: number;
  salesCount: number;
  orderCount: number; // ergonomic alias
  cashSales: number;
  bankSales: number;
  debtSales: number;

  // Repairs
  repairsRevenue: number;
  repairsPartsCost: number;
  repairsLaborRevenue: number;
  repairsProfit: number;
  repairsCount: number;
  repairCount: number; // ergonomic alias

  // Grand Totals
  totalRevenue: number;
  totalCost: number;
  grossProfit: number;
  totalProfit: number; // ergonomic alias
  profitMargin: number;

  // Debts in Period
  newDebtsCreated: number;
  totalDebtsCreated: number; // ergonomic alias
  debtsCollected: number;
  totalDebtCollected: number; // ergonomic alias
  outstandingDebts: number;
  totalRemainingDebt: number; // ergonomic alias

  // Repair status metrics
  activeRepairsCount: number;
  repairDistribution: Record<string, number>;

  // Daily Trend (Real data, no hardcoded mock numbers)
  dailyBreakdown: Array<{
    date: string;
    dayLabel: string;
    salesRevenue: number;
    repairsRevenue: number;
    totalRevenue: number;
    profit: number;
  }>;

  // Top Products Breakdown
  productProfitBreakdown: Array<{
    id: string;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>;
}

export const calculateFinancialStats = (params: {
  invoices: SalesInvoice[];
  repairs: RepairTicket[];
  products: Product[];
  debts: Debt[];
  startDate?: string;
  endDate?: string;
}): FinancialStats => {
  const { invoices = [], repairs = [], products = [], debts = [], startDate, endDate } = params;

  // 1. Filter Pure Sales Invoices in Range (Excluding synced repair invoices)
  const rangeSalesInvoices = invoices.filter(inv => {
    if (isRepairInvoice(inv)) return false; // Exclude repair invoices to avoid double counting!
    const d = getLocalDateStr(inv.createdAt);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  // 2. Filter Completed / Delivered Repairs in Range
  const rangeRepairs = repairs.filter(rep => {
    const isCompleted = rep.status === 'completed' || rep.status === 'delivered';
    if (!isCompleted) return false;
    const d = getLocalDateStr(rep.deliveredAt || rep.updatedAt || rep.createdAt);
    if (startDate && d < startDate) return false;
    if (endDate && d > endDate) return false;
    return true;
  });

  // 3. Sales Aggregates
  let salesRevenue = 0;
  let salesCost = 0;
  let cashSales = 0;
  let bankSales = 0;
  let debtSales = 0;

  const productStatsMap = new Map<string, {
    id: string;
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    cost: number;
    profit: number;
  }>();

  rangeSalesInvoices.forEach(inv => {
    salesRevenue += Number(inv.totalAmount || 0);

    const invDebt = Number(inv.debtAmount || 0);
    if (invDebt > 0) {
      debtSales += invDebt;
    }

    const paidPart = Math.max(0, Number(inv.totalAmount || 0) - invDebt);
    if (inv.paymentMethod === 'Tiền mặt' || inv.paymentMethod === 'Ghi nợ') {
      cashSales += paidPart;
    } else {
      bankSales += paidPart;
    }

    // Items calculation
    (inv.items || []).forEach(item => {
      const unitCost = getItemCostPrice(item, products);
      const qty = Number(item.quantity || 1);
      const itemCost = unitCost * qty;
      const itemRev = Number(item.price || 0) * qty;
      const itemProfit = itemRev - itemCost;

      salesCost += itemCost;

      const prod = findMatchingProduct(products, item.productId, item.productName);
      const key = prod ? prod.id : (item.productName || 'unknown');
      const cleanName = item.productName.replace(/^\[PC Build - [^\]]+\]\s*/i, '').trim();

      const existing = productStatsMap.get(key) || {
        id: key,
        name: cleanName || item.productName,
        category: prod?.category || 'Linh kiện PC',
        quantity: 0,
        revenue: 0,
        cost: 0,
        profit: 0
      };

      existing.quantity += qty;
      existing.revenue += itemRev;
      existing.cost += itemCost;
      existing.profit += itemProfit;
      productStatsMap.set(key, existing);
    });
  });

  const salesProfit = salesRevenue - salesCost;

  // 4. Repairs Aggregates
  let repairsRevenue = 0;
  let repairsPartsCost = 0;
  let repairsPartsSelling = 0;

  rangeRepairs.forEach(rep => {
    const rev = calculateRepairRevenue(rep);
    const pCost = calculateRepairPartsCost(rep, products);
    const pSell = calculateRepairPartsSelling(rep);

    repairsRevenue += rev;
    repairsPartsCost += pCost;
    repairsPartsSelling += pSell;
  });

  const repairsLaborRevenue = Math.max(0, repairsRevenue - repairsPartsSelling);
  const repairsProfit = Math.max(0, repairsRevenue - repairsPartsCost);

  // 5. Grand Totals
  const totalRevenue = salesRevenue + repairsRevenue;
  const totalCost = salesCost + repairsPartsCost;
  const grossProfit = salesProfit + repairsProfit;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // 6. Debts in range
  let newDebtsCreated = 0;
  let debtsCollected = 0;
  let outstandingDebts = 0;

  debts.forEach(d => {
    const reconciled = reconcileDebtBalance(d);
    const createdDate = getLocalDateStr(reconciled.createdAt);
    if ((!startDate || createdDate >= startDate) && (!endDate || createdDate <= endDate)) {
      newDebtsCreated += reconciled.amount;
    }

    if (reconciled.remainingAmount > 0) {
      outstandingDebts += reconciled.remainingAmount;
    }

    (reconciled.payments || []).forEach(p => {
      const paidDate = getLocalDateStr(p.paidAt);
      if ((!startDate || paidDate >= startDate) && (!endDate || paidDate <= endDate)) {
        debtsCollected += Number(p.amount || 0);
      }
    });
  });

  // 7. Daily Trend Generation (Real daily numbers)
  const dailyBreakdown: FinancialStats['dailyBreakdown'] = [];

  // Generate date list between startDate and endDate or last 7 days
  const dateList: string[] = [];
  if (startDate && endDate) {
    let curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end && dateList.length < 90) { // Limit to 90 days max for chart safety
      dateList.push(curr.toISOString().slice(0, 10));
      curr.setDate(curr.getDate() + 1);
    }
  } else {
    // Default last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dateList.push(d.toISOString().slice(0, 10));
    }
  }

  const dayOfWeekNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  dateList.forEach(dStr => {
    const daySales = rangeSalesInvoices
      .filter(inv => getLocalDateStr(inv.createdAt) === dStr)
      .reduce((s, inv) => s + Number(inv.totalAmount || 0), 0);

    const dayRepairs = rangeRepairs
      .filter(rep => getLocalDateStr(rep.deliveredAt || rep.updatedAt || rep.createdAt) === dStr)
      .reduce((s, rep) => s + calculateRepairRevenue(rep), 0);

    const dayTotal = daySales + dayRepairs;

    const daySalesCost = rangeSalesInvoices
      .filter(inv => getLocalDateStr(inv.createdAt) === dStr)
      .reduce((s, inv) => s + calculateInvoiceCost(inv, products), 0);

    const dayRepairCost = rangeRepairs
      .filter(rep => getLocalDateStr(rep.deliveredAt || rep.updatedAt || rep.createdAt) === dStr)
      .reduce((s, rep) => s + calculateRepairPartsCost(rep, products), 0);

    const dayProfit = (daySales - daySalesCost) + (dayRepairs - dayRepairCost);

    const dateObj = new Date(dStr);
    const dayName = dayOfWeekNames[dateObj.getDay()];
    const dateFormatted = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`;

    dailyBreakdown.push({
      date: dStr,
      dayLabel: `${dayName} (${dateFormatted})`,
      salesRevenue: daySales,
      repairsRevenue: dayRepairs,
      totalRevenue: dayTotal,
      profit: dayProfit
    });
  });

  const productProfitBreakdown = Array.from(productStatsMap.values())
    .sort((a, b) => b.profit - a.profit);

  const activeRepairsCount = repairs.filter(r => 
    r.status === 'checking' || 
    r.status === 'repairing'
  ).length;

  const repairDistribution: Record<string, number> = {
    checking: repairs.filter(r => r.status === 'checking').length,
    repairing: repairs.filter(r => r.status === 'repairing').length,
    completed: repairs.filter(r => r.status === 'completed').length,
    delivered: repairs.filter(r => r.status === 'delivered').length,
  };

  return {
    salesRevenue,
    salesCost,
    salesProfit,
    salesCount: rangeSalesInvoices.length,
    orderCount: rangeSalesInvoices.length,
    cashSales,
    bankSales,
    debtSales,
    repairsRevenue,
    repairsPartsCost,
    repairsLaborRevenue,
    repairsProfit,
    repairsCount: rangeRepairs.length,
    repairCount: rangeRepairs.length,
    totalRevenue,
    totalCost,
    grossProfit,
    totalProfit: grossProfit,
    profitMargin,
    newDebtsCreated,
    totalDebtsCreated: newDebtsCreated,
    debtsCollected,
    totalDebtCollected: debtsCollected,
    outstandingDebts,
    totalRemainingDebt: outstandingDebts,
    activeRepairsCount,
    repairDistribution,
    dailyBreakdown,
    productProfitBreakdown
  };
};
