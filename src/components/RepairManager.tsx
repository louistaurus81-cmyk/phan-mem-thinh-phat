import React, { useState, useMemo } from 'react';
import { RepairTicket, Customer, WarrantyCard, RepairStatus, User, Product, computeExpiryDate, ProductIMEI, PrintSettings, formatAccountName, formatBankName, formatWarrantyText, getPartWarrantyInfo } from '../types';
import { 
  Search, 
  Wrench, 
  Plus, 
  Minus,
  Trash2,
  X, 
  Clock, 
  CheckCircle, 
  Sparkles, 
  ShieldCheck, 
  User as UserIcon, 
  AlertCircle,
  FileCheck2,
  Calendar,
  QrCode,
  Edit3,
  Printer,
  FileText,
  Check,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RepairManagerProps {
  repairs: RepairTicket[];
  customers: Customer[];
  warranties: WarrantyCard[];
  users: User[];
  currentUser: User;
  products: Product[];
  imeis?: ProductIMEI[];
  printSettings?: PrintSettings;
  onUpdateImeis?: (imeis: ProductIMEI[]) => void;
  onAddRepair: (ticket: RepairTicket) => void;
  onUpdateRepair?: (ticket: RepairTicket) => void;
  onUpdateRepairStatus: (id: string, status: RepairStatus, finalDetails?: { solution?: string; actualCost?: number; warrantyUntil?: string; note?: string; deliveredAt?: string; usedParts?: { productId: string; name: string; price: number; quantity: number }[]; debtAmount?: number; debtDueDate?: string }) => void;
  onAddCustomer: (customer: Customer) => void;
  onUpdateProductStock: (id: string, newStock: number) => void;
}

export default function RepairManager({
  repairs,
  customers,
  warranties,
  users,
  currentUser,
  products,
  imeis = [],
  printSettings,
  onUpdateImeis,
  onAddRepair,
  onUpdateRepair,
  onUpdateRepairStatus,
  onAddCustomer,
  onUpdateProductStock
}: RepairManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Modal for receiving new repair
  const [showAddModal, setShowAddModal] = useState(false);
  
  // New Repair Ticket form state
  const [customerMode, setCustomerMode] = useState<'select' | 'new'>('select');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [deviceSerial, setDeviceSerial] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [technician, setTechnician] = useState('');
  const [processedBy, setProcessedBy] = useState<string>(currentUser?.fullName || '');
  const [note, setNote] = useState('');

  React.useEffect(() => {
    const techUsers = users.filter(u => u.role === 'technician');
    if (techUsers.length > 0) {
      setTechnician(techUsers[0].fullName);
    } else if (users.length > 0) {
      setTechnician(users[0].fullName);
    }
  }, [users]);

  React.useEffect(() => {
    if (currentUser) {
      setProcessedBy(currentUser.fullName);
    }
  }, [currentUser]);

  // Selected ticket for side detail drawer
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  // Find active ticket object
  const activeTicket = useMemo(() => {
    return repairs.find(r => r.id === activeTicketId) || null;
  }, [repairs, activeTicketId]);

  // States for updating repair ticket details on statusChange
  const [showStatusBar, setShowStatusBar] = useState(false);
  const [actualCost, setActualCost] = useState(0);
  const [solution, setSolution] = useState('');
  const [usedParts, setUsedParts] = useState<{ productId: string; name: string; price: number; quantity: number; imei?: string; warrantyMonths?: number }[]>([]);
  const [repairWarrantyMonths, setRepairWarrantyMonths] = useState(3); // default 3 months warranty for repair
  const [deliveredAtInput, setDeliveredAtInput] = useState(new Date().toISOString().slice(0, 10));
  const [updateNote, setUpdateNote] = useState('');
  const [selectingImeiForRepair, setSelectingImeiForRepair] = useState<Product | null>(null);

  // Calculate maximum warranty duration among replaced parts in activeTicket or current usedParts state
  const suggestedWarrantyFromParts = useMemo(() => {
    const partsList = (activeTicket?.usedParts && activeTicket.usedParts.length > 0)
      ? activeTicket.usedParts
      : usedParts;

    if (!partsList || partsList.length === 0) return null;

    let maxWarr = 0;
    let hasValidPart = false;

    partsList.forEach(part => {
      const prod = products.find(p => p.id === part.productId || p.sku === part.productId || p.name === part.name);
      let warr = part.warrantyMonths;
      if (warr === undefined && prod && typeof prod.warrantyMonths === 'number') {
        warr = prod.warrantyMonths;
      }
      if (warr === undefined) {
        warr = 0;
      }
      if (typeof warr === 'number') {
        hasValidPart = true;
        if (warr > maxWarr) {
          maxWarr = warr;
        }
      }
    });

    return hasValidPart ? maxWarr : null;
  }, [activeTicket, usedParts, products]);

  // Formatted string listing parts and their individual warranty durations
  const partsWarrantyDetails = useMemo(() => {
    const partsList = (activeTicket?.usedParts && activeTicket.usedParts.length > 0)
      ? activeTicket.usedParts
      : usedParts;

    if (!partsList || partsList.length === 0) return '';

    const details: string[] = [];
    partsList.forEach(part => {
      const prod = products.find(p => p.id === part.productId || p.sku === part.productId || p.name === part.name);
      const warr = part.warrantyMonths ?? prod?.warrantyMonths ?? 0;
      details.push(`${part.name} (${formatWarrantyText(warr)})`);
    });

    return details.join(', ');
  }, [activeTicket, usedParts, products]);

  // Auto-sync repair warranty months when suggestedWarrantyFromParts is available
  React.useEffect(() => {
    if (suggestedWarrantyFromParts !== null) {
      setRepairWarrantyMonths(suggestedWarrantyFromParts);
    }
  }, [suggestedWarrantyFromParts, activeTicketId]);

  // Repair debt states
  const [isRepairDebt, setIsRepairDebt] = useState(false);
  const [repairDebtAmount, setRepairDebtAmount] = useState(0);
  const [repairDebtDueDate, setRepairDebtDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  // Watch for isRepairDebt to initialize the limit amount dynamically
  React.useEffect(() => {
    if (isRepairDebt && activeTicket) {
      const parentCost = activeTicket.actualCost || activeTicket.estimatedCost || 0;
      setRepairDebtAmount(parentCost);
    } else {
      setRepairDebtAmount(0);
    }
  }, [isRepairDebt, activeTicket]);

  // Edit Repair Ticket Modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState<RepairTicket | null>(null);

  // Edit Form Fields
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDeviceName, setEditDeviceName] = useState('');
  const [editDeviceSerial, setEditDeviceSerial] = useState('');
  const [editIssueDescription, setEditIssueDescription] = useState('');
  const [editSolution, setEditSolution] = useState('');
  const [editEstimatedCost, setEditEstimatedCost] = useState<number>(0);
  const [editActualCost, setEditActualCost] = useState<number>(0);
  const [editTechnician, setEditTechnician] = useState('');
  const [editProcessedBy, setEditProcessedBy] = useState('');
  const [editStatus, setEditStatus] = useState<RepairStatus>('checking');
  const [editCreatedAt, setEditCreatedAt] = useState('');
  const [editDeliveredAt, setEditDeliveredAt] = useState('');
  const [editWarrantyUntil, setEditWarrantyUntil] = useState('');
  const [editWarrantyMonthsInput, setEditWarrantyMonthsInput] = useState<number | string>(3);
  const [editNote, setEditNote] = useState('');
  const [editUsedParts, setEditUsedParts] = useState<{ productId: string; name: string; price: number; quantity: number; imei?: string; warrantyMonths?: number }[]>([]);
  const [editPartSearch, setEditPartSearch] = useState('');

  // Print Repair Invoice Modal state
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printingTicket, setPrintingTicket] = useState<RepairTicket | null>(null);

  const calculateMonthsFromDates = (startStr: string, endStr: string): number => {
    if (!startStr || !endStr) return 3;
    const s = new Date(startStr);
    const e = new Date(endStr);
    const diffDays = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24));
    if (diffDays <= 0) return 0;
    if (diffDays <= 4) return 0.1;
    if (diffDays <= 8) return 0.2;
    if (diffDays <= 35) return 1;
    if (diffDays <= 65) return 2;
    if (diffDays <= 100) return 3;
    if (diffDays <= 200) return 6;
    if (diffDays <= 390) return 12;
    if (diffDays <= 750) return 24;
    if (diffDays <= 1120) return 36;
    return Math.max(1, Math.round(diffDays / 30));
  };

  const handleEditWarrantyMonthsChange = (m: number) => {
    setEditWarrantyMonthsInput(m);
    const baseDate = editDeliveredAt || editCreatedAt || new Date().toISOString().slice(0, 10);
    setEditWarrantyUntil(computeExpiryDate(baseDate, m));
  };

  const handleEditWarrantyDateChange = (dateStr: string) => {
    setEditWarrantyUntil(dateStr);
    const baseDate = editDeliveredAt || editCreatedAt || new Date().toISOString().slice(0, 10);
    setEditWarrantyMonthsInput(calculateMonthsFromDates(baseDate, dateStr));
  };

  const handleOpenEditModal = (ticket: RepairTicket) => {
    setEditingTicket(ticket);
    setEditCustomerName(ticket.customerName || '');
    setEditCustomerPhone(ticket.customerPhone || '');
    setEditDeviceName(ticket.deviceName || '');
    setEditDeviceSerial(ticket.deviceSerial || '');
    setEditIssueDescription(ticket.issueDescription || '');
    setEditSolution(ticket.solution || '');
    setEditEstimatedCost(ticket.estimatedCost || 0);
    setEditActualCost(ticket.actualCost || 0);
    setEditTechnician(ticket.technician || '');
    setEditProcessedBy(ticket.processedBy || currentUser?.fullName || '');
    setEditStatus(ticket.status || 'checking');
    const createdStr = ticket.createdAt ? ticket.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
    const deliveredStr = ticket.deliveredAt ? ticket.deliveredAt.slice(0, 10) : '';
    setEditCreatedAt(createdStr);
    setEditDeliveredAt(deliveredStr);

    const parts = ticket.usedParts ? ticket.usedParts.map(p => {
      const prod = products.find(m => m.id === p.productId || m.sku === p.productId || m.name === p.name);
      return {
        ...p,
        warrantyMonths: p.warrantyMonths !== undefined ? p.warrantyMonths : (prod?.warrantyMonths ?? 0)
      };
    }) : [];
    setEditUsedParts(parts);

    const baseDate = deliveredStr || createdStr || new Date().toISOString().slice(0, 10);
    const maxPartW = parts.reduce((max, pt) => Math.max(max, pt.warrantyMonths ?? 0), 0);
    const initialExpiry = ticket.warrantyUntil ? ticket.warrantyUntil.slice(0, 10) : computeExpiryDate(baseDate, maxPartW || 3);
    setEditWarrantyUntil(initialExpiry);
    setEditWarrantyMonthsInput(calculateMonthsFromDates(baseDate, initialExpiry));
    setEditNote(ticket.note || '');
    setShowEditModal(true);
  };

  const handleUpdateEditPartWarranty = (index: number, months: number) => {
    const updated = [...editUsedParts];
    updated[index].warrantyMonths = Math.max(0, months);
    setEditUsedParts(updated);

    const maxW = updated.reduce((max, pt) => Math.max(max, pt.warrantyMonths ?? 0), 0);
    const baseDate = editDeliveredAt || editCreatedAt || new Date().toISOString().slice(0, 10);
    setEditWarrantyMonthsInput(maxW);
    setEditWarrantyUntil(computeExpiryDate(baseDate, maxW));
  };

  const handleUpdatePartWarranty = (index: number, months: number) => {
    const updated = [...usedParts];
    updated[index].warrantyMonths = Math.max(0, months);
    setUsedParts(updated);

    const maxW = updated.reduce((max, pt) => Math.max(max, pt.warrantyMonths ?? 0), 0);
    setRepairWarrantyMonths(maxW);
  };

  const handleAddEditPart = (p: Product) => {
    const warr = p.warrantyMonths !== undefined ? p.warrantyMonths : 0;
    const existingIdx = editUsedParts.findIndex(item => item.productId === p.id && !item.imei);
    let nextParts = [...editUsedParts];
    if (existingIdx > -1) {
      nextParts[existingIdx].quantity += 1;
    } else {
      nextParts.push({ productId: p.id, name: p.name, price: p.price, quantity: 1, warrantyMonths: warr });
    }
    setEditUsedParts(nextParts);
    setEditActualCost(prev => prev + p.price);

    const maxW = nextParts.reduce((max, pt) => Math.max(max, pt.warrantyMonths ?? 0), 0);
    const baseDate = editDeliveredAt || editCreatedAt || new Date().toISOString().slice(0, 10);
    setEditWarrantyMonthsInput(maxW);
    setEditWarrantyUntil(computeExpiryDate(baseDate, maxW));
  };

  const handleRemoveEditPart = (index: number) => {
    const itemToRemove = editUsedParts[index];
    const nextParts = editUsedParts.filter((_, i) => i !== index);
    setEditActualCost(prev => Math.max(0, prev - (itemToRemove.price * itemToRemove.quantity)));
    setEditUsedParts(nextParts);

    const maxW = nextParts.length > 0 ? nextParts.reduce((max, pt) => Math.max(max, pt.warrantyMonths ?? 0), 0) : 0;
    const baseDate = editDeliveredAt || editCreatedAt || new Date().toISOString().slice(0, 10);
    setEditWarrantyMonthsInput(maxW);
    setEditWarrantyUntil(computeExpiryDate(baseDate, maxW));
  };

  const handleUpdateEditPartQty = (index: number, delta: number) => {
    const item = editUsedParts[index];
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
      handleRemoveEditPart(index);
      return;
    }
    const updated = [...editUsedParts];
    updated[index].quantity = newQty;
    setEditUsedParts(updated);
    setEditActualCost(prev => Math.max(0, prev + (delta * item.price)));
  };

  const handleUpdateEditPartPrice = (index: number, price: number) => {
    const updated = [...editUsedParts];
    const oldTotal = updated[index].price * updated[index].quantity;
    updated[index].price = price;
    const newTotal = price * updated[index].quantity;
    setEditUsedParts(updated);
    setEditActualCost(prev => Math.max(0, prev - oldTotal + newTotal));
  };

  const handleIncreasePartQty = (index: number) => {
    const item = usedParts[index];
    const prod = products.find(p => p.id === item.productId);
    if (!prod) return;
    if (prod.stock <= 0) {
      alert(`Linh kiện ${prod.name} đã hết hàng trong kho!`);
      return;
    }
    const updated = [...usedParts];
    updated[index].quantity += 1;
    setUsedParts(updated);
    setActualCost(prev => prev + item.price);
    onUpdateProductStock(item.productId, prod.stock - 1);
  };

  const handleDecreasePartQty = (index: number) => {
    const item = usedParts[index];
    if (item.quantity <= 1) {
      handleRemovePart(index);
      return;
    }
    const prod = products.find(p => p.id === item.productId);
    const updated = [...usedParts];
    updated[index].quantity -= 1;
    setUsedParts(updated);
    setActualCost(prev => Math.max(0, prev - item.price));
    if (prod) {
      onUpdateProductStock(item.productId, prod.stock + 1);
    }
  };

  const handleSaveEditTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;
    if (!editDeviceName.trim() || !editCustomerName.trim()) {
      alert('Vui lòng nhập tên thiết bị và tên khách hàng!');
      return;
    }

    const updated: RepairTicket = {
      ...editingTicket,
      customerName: editCustomerName.trim(),
      customerPhone: editCustomerPhone.trim(),
      deviceName: editDeviceName.trim(),
      deviceSerial: editDeviceSerial.trim(),
      issueDescription: editIssueDescription.trim(),
      solution: editSolution.trim() || undefined,
      estimatedCost: Number(editEstimatedCost) || 0,
      actualCost: Number(editActualCost) || 0,
      technician: editTechnician.trim() || technician,
      processedBy: editProcessedBy.trim() || currentUser?.fullName || 'Hệ thống',
      status: editStatus,
      createdAt: editCreatedAt ? new Date(editCreatedAt).toISOString() : editingTicket.createdAt,
      deliveredAt: editDeliveredAt || undefined,
      warrantyUntil: editWarrantyUntil || undefined,
      note: editNote.trim() || undefined,
      usedParts: editUsedParts,
      updatedAt: new Date().toISOString()
    };

    if (onUpdateRepair) {
      onUpdateRepair(updated);
    } else {
      onUpdateRepairStatus(updated.id, updated.status, {
        solution: updated.solution,
        actualCost: updated.actualCost,
        warrantyUntil: updated.warrantyUntil,
        deliveredAt: updated.deliveredAt,
        note: updated.note,
        usedParts: updated.usedParts
      });
    }

    setShowEditModal(false);
    setEditingTicket(null);
  };

  const handleOpenPrintModal = (ticket: RepairTicket) => {
    setPrintingTicket(ticket);
    setShowPrintModal(true);
  };

  // Search logic and parts selectors
  const [partSearchQuery, setPartSearchQuery] = useState('');

  // Handle addition of replacement component & auto calculate cost
  const handleAddPart = (p: Product, imei?: string) => {
    const warrMonths = p.warrantyMonths !== undefined ? p.warrantyMonths : 0;
    let nextParts = [...usedParts];
    if (imei) {
      // For products with IMEI, we always add them as separate line items to keep track of individual IMEIs
      nextParts.push({ productId: p.id, name: `${p.name} (S/N: ${imei})`, price: p.price, quantity: 1, imei, warrantyMonths: warrMonths });
      
      // Update global IMEI list status to sold
      if (onUpdateImeis) {
        const updatedImeis = imeis.map(item => {
          if (item.imei === imei) {
            return { ...item, status: 'sold' as const };
          }
          return item;
        });
        onUpdateImeis(updatedImeis);
      }
    } else {
      const existingIndex = usedParts.findIndex(item => item.productId === p.id && !item.imei);
      if (existingIndex > -1) {
        nextParts[existingIndex].quantity += 1;
      } else {
        nextParts.push({ productId: p.id, name: p.name, price: p.price, quantity: 1, warrantyMonths: warrMonths });
      }
    }
    setUsedParts(nextParts);

    // Increment the actual repair bill by the product price automatically!
    setActualCost(prev => prev + p.price);
    // Deduct stock for inventory integrity
    onUpdateProductStock(p.id, p.stock - 1);

    // Auto update repair service warranty to max part warranty
    const maxW = nextParts.reduce((max, pt) => Math.max(max, pt.warrantyMonths ?? 0), 0);
    setRepairWarrantyMonths(maxW);
  };

  // Handle deletion of replacement component & restore stock
  const handleRemovePart = (index: number) => {
    const itemToRemove = usedParts[index];
    const originalProd = products.find(p => p.id === itemToRemove.productId);
    
    // Put stock back
    if (originalProd) {
      onUpdateProductStock(itemToRemove.productId, originalProd.stock + itemToRemove.quantity);
    }

    // If it was an IMEI item, restore its status to in_stock
    if (itemToRemove.imei && onUpdateImeis) {
      const updatedImeis = imeis.map(item => {
        if (item.imei === itemToRemove.imei) {
          return { ...item, status: 'in_stock' as const };
        }
        return item;
      });
      onUpdateImeis(updatedImeis);
    }
    
    // Re-verify actual cost
    setActualCost(prev => Math.max(0, prev - (itemToRemove.price * itemToRemove.quantity)));
    
    // Remove from selection array safely
    const nextParts = usedParts.filter((_, i) => i !== index);
    setUsedParts(nextParts);

    // Auto update repair service warranty to max part warranty
    const maxW = nextParts.length > 0 ? nextParts.reduce((max, pt) => Math.max(max, pt.warrantyMonths ?? 0), 0) : 0;
    setRepairWarrantyMonths(maxW);
  };

  // Serial lookup to check if product is currently under warranty
  const serialWarrantyStatus = useMemo(() => {
    if (!deviceSerial.trim()) return null;
    const match = warranties.find(w => w.serialNumber === deviceSerial.trim());
    if (match && match.status === 'active') {
      return match;
    }
    return null;
  }, [warranties, deviceSerial]);

  // Filters logic
  const filteredRepairs = useMemo(() => {
    return repairs.filter(rep => {
      const matchSearch = 
        rep.ticketNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.customerPhone.includes(searchQuery) ||
        rep.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        rep.deviceSerial.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'all' ? true : rep.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [repairs, searchQuery, statusFilter]);

  // Format money to VND
  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Submit new ticket
  const handleSubmitNewRepair = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !issueDescription.trim()) {
      alert('Vui lòng điền đầy đủ tên thiết bị và mô tả lỗi!');
      return;
    }

    let customerInfo = {
      id: '',
      name: '',
      phone: ''
    };

    if (customerMode === 'select') {
      const custObj = customers.find(c => c.id === selectedCustomerId);
      if (!custObj) {
        alert('Vui lòng chọn khách hàng.');
        return;
      }
      customerInfo = {
        id: custObj.id,
        name: custObj.name,
        phone: custObj.phone
      };
    } else {
      if (!newCustName.trim() || !newCustPhone.trim()) {
        alert('Vui lòng nhập tên và SĐT khách mới.');
        return;
      }
      const newCustId = `c_${Date.now()}`;
      const newCustPayload: Customer = {
        id: newCustId,
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        createdAt: new Date().toISOString()
      };
      onAddCustomer(newCustPayload);
      customerInfo = {
        id: newCustId,
        name: newCustPayload.name,
        phone: newCustPayload.phone
      };
    }

    const ticketNumber = `SC-${20001 + repairs.length}`;
    const newTicket: RepairTicket = {
      id: `rep_${Date.now()}`,
      ticketNumber,
      customerId: customerInfo.id,
      customerName: customerInfo.name,
      customerPhone: customerInfo.phone,
      deviceName: deviceName.trim(),
      deviceSerial: deviceSerial.trim(),
      issueDescription: issueDescription.trim(),
      status: 'checking',
      estimatedCost: Number(estimatedCost),
      actualCost: 0,
      technician,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      note: note.trim() || undefined,
      processedBy: processedBy || currentUser.fullName
    };

    onAddRepair(newTicket);
    setShowAddModal(false);

    // Reset fields
    setDeviceName('');
    setDeviceSerial('');
    setIssueDescription('');
    setEstimatedCost(0);
    setNote('');
    alert(`Đã lập biên nhận sửa chữa ${ticketNumber} thành công!`);
  };

  // Triggering status updates (transitions)
  const executeStatusChange = (status: RepairStatus) => {
    if (!activeTicket) return;

    if (status === 'completed') {
      // Need actual costs & solutions
      onUpdateRepairStatus(activeTicket.id, 'completed', {
        solution: solution.trim() || 'Sửa chữa phần cứng hệ thống',
        actualCost: Number(actualCost) || activeTicket.estimatedCost,
        note: updateNote.trim() || undefined,
        usedParts: usedParts
      });
      setShowStatusBar(false);
      setSolution('');
      setActualCost(0);
      setUsedParts([]);
      setUpdateNote('');
    } else if (status === 'delivered') {
      const parentMaxCost = activeTicket.actualCost || activeTicket.estimatedCost || 0;
      if (isRepairDebt && (repairDebtAmount <= 0 || repairDebtAmount > parentMaxCost)) {
        alert('Vui lòng nhập số tiền ghi nợ hợp lệ (lớn hơn 0 và nhỏ hơn hoặc bằng tổng chi phí sửa chữa)');
        return;
      }
      
      const effectiveWarrantyMonths = repairWarrantyMonths;

      // Hands over to client, calculate service warranty
      const expiryDateStr = computeExpiryDate(deliveredAtInput || new Date().toISOString().slice(0, 10), effectiveWarrantyMonths);
      
      onUpdateRepairStatus(activeTicket.id, 'delivered', {
        deliveredAt: deliveredAtInput,
        warrantyUntil: expiryDateStr,
        note: (updateNote.trim() ? `${activeTicket.note || ''}\nBàn giao: ${updateNote.trim()}` : activeTicket.note) + (isRepairDebt ? ` [Ghi nợ sửa chữa: ${formatVND(repairDebtAmount)}, Hạn: ${repairDebtDueDate}]` : ''),
        debtAmount: isRepairDebt ? repairDebtAmount : undefined,
        debtDueDate: isRepairDebt ? repairDebtDueDate : undefined
      });
      setShowStatusBar(false);
      setUpdateNote('');
      setIsRepairDebt(false);
      setRepairDebtAmount(0);
    } else {
      onUpdateRepairStatus(activeTicket.id, status);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters Strip */}
      <div className="bg-white p-4 rounded-2xl border-2 border-slate-200 bento-shadow flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
          <input 
            id="search-repairs"
            type="text"
            placeholder="Tìm theo Mã biên nhận, Tên máy, Serial, IMEI, Tên KH hay Số ĐT..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full text-xs md:text-sm bg-slate-50 border border-slate-100 pl-10 pr-4 py-3 rounded-xl focus:outline-hidden focus:border-indigo-500 transition-colors"
          />
        </div>
        
        {/* Filter badging row */}
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'checking', label: 'Chờ kiểm tra' },
            { value: 'repairing', label: 'Đang sửa' },
            { value: 'completed', label: 'Đã xong' },
            { value: 'delivered', label: 'Đã giao máy' }
          ].map(opt => (
            <button 
              key={opt.value}
              id={`filter-repair-${opt.value}`}
              onClick={() => setStatusFilter(opt.value)}
              className={`text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer ${
                statusFilter === opt.value 
                  ? 'bg-slate-900 text-white' 
                  : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button 
          id="btn-add-repair-modal"
          onClick={() => {
            setCustomerMode('select');
            setShowAddModal(true);
          }}
          className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl cursor-pointer shadow-2xs"
        >
          <Plus className="w-4 h-4" /> Biên Nhận Máy Sửa
        </button>
      </div>

      {/* Main repair body layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Ticket list panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow overflow-hidden">
            <div className="divide-y divide-slate-50">
              {filteredRepairs.map(rep => {
                const isActive = activeTicketId === rep.id;
                return (
                  <div 
                    key={rep.id} 
                    id={`repair-row-${rep.id}`}
                    onClick={() => {
                      setActiveTicketId(rep.id);
                      setShowStatusBar(false);
                    }}
                    className={`p-5 hover:bg-slate-50/50 transition duration-200 cursor-pointer flex justify-between items-start gap-4 ${
                      isActive ? 'bg-indigo-50/30 border-l-4 border-indigo-600 pl-4 bg-slate-50/80' : ''
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm">
                          {rep.ticketNumber}
                        </span>
                        <h4 className="font-bold text-slate-800 text-sm">{rep.deviceName}</h4>
                        {warranties.some(w => w.serialNumber === rep.deviceSerial && w.status === 'active') && (
                          <span className="flex items-center gap-1 text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full font-bold">
                            <ShieldCheck className="w-3 h-3" /> Đang bảo hành
                          </span>
                        )}
                      </div>
                      
                      <p className="text-xs text-slate-500">
                        Khách hàng: <span className="font-semibold text-slate-700">{rep.customerName}</span> ({rep.customerPhone})
                      </p>
                      
                      <div className="flex gap-2 flex-wrap text-[10px] pt-0.5">
                        <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded-sm border border-indigo-100/50">
                          👤 Nhận: {rep.processedBy || 'Hệ thống'}
                        </span>
                        <span className="bg-slate-50/80 text-slate-600 font-semibold px-1.5 py-0.5 rounded-sm border border-slate-200/50">
                          ⚙️ Thợ: {rep.technician}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 italic line-clamp-1">
                        Yêu cầu: {rep.issueDescription}
                      </p>
                    </div>

                    <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                        rep.status === 'checking' ? 'bg-slate-100 text-slate-600' :
                        rep.status === 'repairing' ? 'bg-amber-50 text-amber-700' :
                        rep.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                        'bg-slate-100 text-slate-500' // delivered
                      }`}>
                        {rep.status === 'checking' ? 'MỚI NHẬN' :
                         rep.status === 'repairing' ? 'ĐANG SỬA' :
                         rep.status === 'completed' ? 'XONG - CHỜ GIAO' :
                         'ĐÃ BÀN GIAO'}
                      </span>
                      <p className="text-xs font-bold text-slate-900">
                        {formatVND(rep.status === 'delivered' || rep.status === 'completed' ? rep.actualCost : rep.estimatedCost)}
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(rep);
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 rounded text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer"
                          title="Sửa hóa đơn sửa chữa"
                        >
                          <Edit3 className="w-3 h-3 text-amber-600" /> Sửa
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenPrintModal(rep);
                          }}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-indigo-100 hover:text-indigo-800 text-slate-700 rounded text-[10px] font-bold flex items-center gap-0.5 transition cursor-pointer"
                          title="In phiếu / hóa đơn"
                        >
                          <Printer className="w-3 h-3 text-indigo-600" /> In
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredRepairs.length === 0 && (
                <div className="py-16 text-center text-slate-400">
                  <Wrench className="w-12 h-12 stroke-1 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm">Không tìm thấy yêu cầu sửa chữa nào.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Selected ticket details (Sidebar drawer) */}
        <div className="lg:col-span-1">
          {activeTicket ? (
            <div className="bg-white rounded-[2rem] border-2 border-slate-200 bento-shadow p-6 space-y-6 h-fit sticky top-4">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-black text-indigo-600 uppercase tracking-widest">{activeTicket.ticketNumber}</span>
                  <h3 className="font-bold text-slate-900 text-base mt-1">{activeTicket.deviceName}</h3>
                </div>
                <div className="flex items-center gap-1.5">
                  <button 
                    type="button"
                    onClick={() => handleOpenEditModal(activeTicket)}
                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-lg border border-amber-200 flex items-center gap-1 transition cursor-pointer"
                    title="Chỉnh sửa hóa đơn / thông tin phiếu"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-amber-600" /> Sửa
                  </button>
                  <button 
                    type="button"
                    onClick={() => handleOpenPrintModal(activeTicket)}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs rounded-lg border border-indigo-200 flex items-center gap-1 transition cursor-pointer"
                    title="In hóa đơn / phiếu sửa chữa"
                  >
                    <Printer className="w-3.5 h-3.5 text-indigo-600" /> In
                  </button>
                  <button 
                    onClick={() => setActiveTicketId(null)}
                    className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Status Flow Map */}
              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">THÔNG TIN KHÁCH HÀNG</p>
                <div className="bg-slate-50 p-4 rounded-xl text-xs space-y-1.5 text-slate-600">
                  <p>Họ tên: <span className="font-bold text-slate-900">{activeTicket.customerName}</span></p>
                  <p>Điện thoại: <span className="font-bold text-slate-900">{activeTicket.customerPhone}</span></p>
                  <p className="font-mono text-[10px] text-slate-400">Thiết bị S/N: {activeTicket.deviceSerial || 'Chưa cung cấp'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CHI TIẾT CHẨN ĐOÁN & QUY TRÌNH</p>
                <div className="text-xs space-y-3.5">
                  <div>
                    <p className="text-slate-500 font-medium">Hiện tượng lỗi:</p>
                    <p className="text-slate-800 font-semibold mt-1 bg-rose-50/50 border border-rose-100/30 p-2.5 rounded-lg text-slate-700">{activeTicket.issueDescription}</p>
                  </div>
                  
                  {activeTicket.solution && (
                    <div>
                      <p className="text-slate-500 font-medium">Giải pháp xử lý / Linh kiện:</p>
                      <p className="text-emerald-700 font-semibold mt-1 bg-emerald-50/50 border border-emerald-100/30 p-2.5 rounded-lg">{activeTicket.solution}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 font-medium">Báo giá dự kiến:</p>
                      <p className="text-slate-900 font-bold mt-1 text-sm">{formatVND(activeTicket.estimatedCost)}</p>
                    </div>
                    {activeTicket.actualCost > 0 && (
                      <div>
                        <p className="text-slate-500 font-medium">Tổng hóa đơn thực tế:</p>
                        <p className="text-indigo-600 font-extrabold mt-1 text-sm">{formatVND(activeTicket.actualCost)}</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-slate-500 font-medium">Nhân viên nhận máy:</p>
                      <p className="text-indigo-600 font-bold mt-1 flex items-center gap-1">
                        👤 {activeTicket.processedBy || 'Hệ thống'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Kỹ thuật viên:</p>
                      <p className="text-slate-800 font-semibold mt-1 flex items-center gap-1">
                        ⚙️ {activeTicket.technician}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500 font-medium">Ngày bàn giao máy:</p>
                      {activeTicket.deliveredAt ? (
                        <p className="text-indigo-600 font-bold mt-1 flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" /> {activeTicket.deliveredAt}
                        </p>
                      ) : (
                        <p className="text-slate-400 font-bold mt-1 flex items-center gap-1.5 italic">
                          <Clock className="w-3.5 h-3.5" /> Chưa bàn giao
                        </p>
                      )}
                    </div>
                    {activeTicket.warrantyUntil && (
                      <div>
                        <p className="text-slate-500 font-medium">Hạn bảo hành dịch vụ:</p>
                        <p className="text-emerald-600 font-bold mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" /> {activeTicket.warrantyUntil}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status Action Transitions */}
              {activeTicket.status !== 'delivered' ? (
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">CẬP NHẬT TRẠNG THÁI</p>
                  
                  {!showStatusBar ? (
                    <div className="flex flex-col gap-2">
                      {activeTicket.status === 'checking' && (
                        <button 
                          id="btn-transition-repairing"
                          onClick={() => executeStatusChange('repairing')}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl cursor-pointer duration-200"
                        >
                          <Clock className="w-3.5 h-3.5 animate-pulse" /> Tiến hành sửa chữa
                        </button>
                      )}

                      {activeTicket.status === 'repairing' && (
                        <button 
                          id="btn-trigger-completed-flow"
                          onClick={() => {
                            setActualCost(activeTicket.estimatedCost);
                            setShowStatusBar(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl cursor-pointer duration-200"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Báo cáo sửa xong
                        </button>
                      )}

                      {activeTicket.status === 'completed' && (
                        <button 
                          id="btn-trigger-delivered-flow"
                          onClick={() => {
                            setShowStatusBar(true);
                          }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer duration-200"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" /> Bàn giao khách hàng
                        </button>
                      )}
                    </div>
                  ) : (
                    // In-action setup configuration form inside sidebar drawer
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3.5">
                      {activeTicket.status === 'repairing' && (
                        <>
                          <p className="text-xs font-bold text-slate-800 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-indigo-500" /> BÁO CÁO HOÀN THÀNH SỬA </p>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Phương án xử lý kỹ thuật</label>
                            <input 
                              id="input-repair-solution"
                              type="text"
                              required
                              placeholder="e.g. Ép cáp, thay vỏ, dọn IC..."
                              value={solution}
                              onChange={e => setSolution(e.target.value)}
                              className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Chi phí thực tế (VND)</label>
                            <input 
                              id="input-repair-actual-cost"
                              type="number"
                              required
                              value={actualCost}
                              onChange={e => setActualCost(Number(e.target.value))}
                              className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                            />
                          </div>
                          {/* Part selection UI */}
                          <div className="space-y-2">
                            <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Linh kiện thay thế từ kho</label>
                            
                            {/* Search bar inside part selector */}
                            <div className="relative">
                              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                              <input 
                                type="text"
                                placeholder="Tìm theo tên hoặc SKU..."
                                value={partSearchQuery}
                                onChange={e => setPartSearchQuery(e.target.value)}
                                className="w-full text-xs pl-8 pr-7 py-2 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:border-indigo-505"
                              />
                              {partSearchQuery && (
                                <button 
                                  type="button"
                                  onClick={() => setPartSearchQuery('')}
                                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            {/* Dropdown scroll list */}
                            <div className="bg-white border border-slate-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-slate-100 bento-shadow p-0.5">
                              {products
                                .filter(p => {
                                  const stock = p.hasImei 
                                    ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length
                                    : p.stock;
                                  return stock > 0 && (
                                    p.name.toLowerCase().includes(partSearchQuery.toLowerCase()) || 
                                    p.sku.toLowerCase().includes(partSearchQuery.toLowerCase())
                                  );
                                })
                                .slice(0, 10) 
                                .map(p => (
                                  <button 
                                    key={p.id} 
                                    type="button" 
                                    onClick={() => {
                                      if (p.hasImei) {
                                        setSelectingImeiForRepair(p);
                                      } else {
                                        handleAddPart(p);
                                      }
                                      setPartSearchQuery('');
                                    }} 
                                    className="w-full text-left text-xs px-2 py-1.5 hover:bg-slate-50 font-medium text-slate-705 flex justify-between items-center transition cursor-pointer rounded-xs"
                                  >
                                    <span className="truncate pr-2 flex items-center gap-1">
                                      {p.hasImei && <QrCode className="w-3 h-3 text-indigo-500 shrink-0" />}
                                      {p.name}
                                    </span>
                                    <span className="text-[10px] bg-indigo-50 text-indigo-500 px-1 py-0.5 rounded-sm shrink-0 font-mono">
                                      Kho: {p.hasImei ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length : p.stock} | +{formatVND(p.price)}
                                    </span>
                                  </button>
                                ))
                              }
                              {products.filter(p => {
                                  const stock = p.hasImei 
                                    ? imeis.filter(i => i.productId === p.id && i.status === 'in_stock').length
                                    : p.stock;
                                  const matchQuery = p.name.toLowerCase().includes(partSearchQuery.toLowerCase()) || 
                                                     p.sku.toLowerCase().includes(partSearchQuery.toLowerCase());
                                  return stock > 0 && matchQuery;
                                }).length === 0 && (
                                <div className="text-center py-3 text-[10px] text-slate-400 italic">
                                  Không có sẵn linh kiện còn hàng trong kho
                                </div>
                              )}
                            </div>

                            {/* Selected parts with quantity adjustments & warranty badges */}
                            {usedParts.length > 0 && (
                              <div className="bg-slate-100/80 rounded-lg p-2.5 border border-slate-200/50 space-y-1">
                                <p className="text-[10px] uppercase font-bold text-slate-500">Đã chọn linh kiện ({usedParts.length}):</p>
                                <div className="divide-y divide-slate-200/50 max-h-48 overflow-y-auto">
                                  {usedParts.map((part, idx) => (
                                    <div key={idx} className="flex justify-between items-center py-1.5 text-[11px] font-semibold text-slate-800 gap-2">
                                      <div className="truncate pr-1 flex-1 min-w-0">
                                        <div className="truncate font-bold">{part.name}</div>
                                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                          <span className="text-[9px] text-indigo-600 font-mono font-bold">
                                            {formatVND(part.price)}
                                          </span>
                                          <div className="flex items-center gap-1 bg-white border border-slate-200 px-1 py-0.5 rounded-sm">
                                            <span className="text-[9px] font-bold text-slate-500">🛡️ BH:</span>
                                            <input 
                                              type="number"
                                              min={0}
                                              value={part.warrantyMonths ?? 0}
                                              onChange={e => handleUpdatePartWarranty(idx, Number(e.target.value))}
                                              className="w-10 text-center font-bold text-emerald-700 bg-slate-50 border border-slate-200 rounded-xs text-[10px] focus:outline-hidden"
                                              title="Chỉnh sửa số tháng bảo hành của linh kiện này thủ công"
                                            />
                                            <span className="text-[9px] font-bold text-slate-600">Tháng</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Quantity controls */}
                                      <div className="flex items-center gap-1 shrink-0 bg-white p-0.5 rounded-md border border-slate-200">
                                        <button 
                                          type="button"
                                          onClick={() => handleDecreasePartQty(idx)}
                                          className="w-4 h-4 rounded-sm font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer text-[10px]"
                                          title="Giảm 1"
                                        >-</button>
                                        <span className="w-5 text-center font-bold text-slate-800 text-[10px]">{part.quantity}</span>
                                        <button 
                                          type="button"
                                          onClick={() => handleIncreasePartQty(idx)}
                                          className="w-4 h-4 rounded-sm font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer text-[10px]"
                                          title="Tăng 1"
                                        >+</button>
                                      </div>

                                      <button 
                                        type="button" 
                                        onClick={() => handleRemovePart(idx)}
                                        className="p-1 text-rose-500 hover:bg-rose-50 rounded-sm transition shrink-0 cursor-pointer"
                                        title="Xóa linh kiện"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {activeTicket.status === 'completed' && (
                        <>
                          <p className="text-xs font-bold text-slate-800">BÀN GIAO THIẾT BỊ MÁY</p>

                          {suggestedWarrantyFromParts !== null && (
                            <div className="bg-indigo-50/90 border border-indigo-200/80 p-2.5 rounded-xl space-y-1 my-1.5">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                                  Đồng bộ BH theo linh kiện thay thế
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setRepairWarrantyMonths(suggestedWarrantyFromParts)}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 transition cursor-pointer shadow-2xs shrink-0"
                                >
                                  <RefreshCw className="w-3 h-3" /> Áp dụng ({formatWarrantyText(suggestedWarrantyFromParts)})
                                </button>
                              </div>
                              <p className="text-[11px] text-indigo-700 font-medium">
                                Linh kiện: <span className="font-semibold">{partsWarrantyDetails}</span>
                              </p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ngày bàn giao máy</label>
                              <input 
                                type="date"
                                value={deliveredAtInput}
                                onChange={e => setDeliveredAtInput(e.target.value)}
                                className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Thời gian bảo hành</label>
                              <select 
                                id="select-repair-warranty"
                                value={repairWarrantyMonths}
                                onChange={e => setRepairWarrantyMonths(Number(e.target.value))}
                                className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden cursor-pointer font-bold text-slate-800"
                              >
                                <option value={0}>Không bảo hành (0 ngày)</option>
                                <option value={0.1}>3 ngày bảo hành</option>
                                <option value={0.2}>7 ngày bảo hành</option>
                                <option value={0.3}>Bao test (0 ngày)</option>
                                <option value={1}>1 tháng bảo hành</option>
                                <option value={2}>2 tháng bảo hành</option>
                                <option value={3}>3 tháng bảo hành (Mặc định)</option>
                                <option value={6}>6 tháng bảo hành</option>
                                <option value={12}>12 tháng bảo hành</option>
                                <option value={24}>24 tháng bảo hành</option>
                                <option value={36}>36 tháng bảo hành</option>
                              </select>
                            </div>
                          </div>

                          {/* Repair Debt Fields */}
                          <div className="bg-slate-100 border border-slate-200 p-3 rounded-xl mt-3.5 space-y-2">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={isRepairDebt} 
                                onChange={e => setIsRepairDebt(e.target.checked)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="text-xs font-bold text-slate-700 font-mono">Khách nợ lại tiền dịch vụ sửa</span>
                            </label>

                            {isRepairDebt && (
                              <motion.div 
                                initial={{ opacity: 0, height: 0 }} 
                                animate={{ opacity: 1, height: 'auto' }}
                                className="space-y-2 pt-2 border-t border-slate-200 overflow-hidden"
                              >
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Số tiền ghi nợ (VND)</label>
                                  <input 
                                    type="number" 
                                    max={activeTicket.actualCost || activeTicket.estimatedCost}
                                    min={0}
                                    value={repairDebtAmount} 
                                    onChange={e => setRepairDebtAmount(Math.min(activeTicket.actualCost || activeTicket.estimatedCost || 0, Number(e.target.value)))}
                                    className="w-full text-xs font-bold bg-white border border-slate-200 rounded-lg p-2 focus:outline-hidden text-indigo-600 focus:border-indigo-505"
                                  />
                                  <p className="text-[10px] text-slate-400 mt-0.5">Tổng chi phí: {formatVND(activeTicket.actualCost || activeTicket.estimatedCost || 0)}</p>
                                </div>
                                <div>
                                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-0.5">Hạn thanh toán</label>
                                  <input 
                                    type="date" 
                                    value={repairDebtDueDate}
                                    onChange={e => setRepairDebtDueDate(e.target.value)}
                                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:outline-hidden"
                                  />
                                </div>
                              </motion.div>
                            )}
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Ghi chú bổ sung</label>
                        <textarea 
                          placeholder="Thông tin bảo hành thêm hoặc thanh toán..."
                          value={updateNote}
                          onChange={e => setUpdateNote(e.target.value)}
                          rows={2}
                          className="w-full text-xs bg-white border border-slate-200 p-2 rounded-md focus:outline-hidden"
                        />
                      </div>

                      <div className="flex gap-2 justify-end pt-1">
                        <button 
                          onClick={() => setShowStatusBar(false)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] rounded-lg cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button 
                          id="btn-confirm-status-update"
                          onClick={() => executeStatusChange(activeTicket.status === 'repairing' ? 'completed' : 'delivered')}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] rounded-lg cursor-pointer shadow-3xs"
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 space-y-3">
                  <div className="flex items-start gap-2 text-xs text-emerald-800">
                    <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600" />
                    <div>
                      <p className="font-bold">Thiết bị đã bàn giao xong!</p>
                      <p className="mt-0.5 opacity-90">Hồ sơ sửa chữa đã bàn giao cho khách hàng. Quý khách có thể chỉnh sửa lại hóa đơn hoặc in lại phiếu khi cần.</p>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1 border-t border-emerald-200/60">
                    <button 
                      type="button"
                      onClick={() => handleOpenEditModal(activeTicket)}
                      className="flex-1 py-2 bg-white hover:bg-emerald-100/50 text-emerald-800 font-bold text-xs rounded-lg border border-emerald-300 flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-700" /> Chỉnh sửa hóa đơn
                    </button>
                    <button 
                      type="button"
                      onClick={() => handleOpenPrintModal(activeTicket)}
                      className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition shadow-2xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> In hóa đơn dịch vụ
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 py-16 h-fit">
              <Sparkles className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">Chọn một biên nhận từ danh sách bên cạnh để xem tiến trình và điều dưỡng trạng thái kỹ thuật.</p>
            </div>
          )}
        </div>

      </div>

      {/* Receive Repair Request Modal Dialog */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-xl z-20 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Wrench className="w-5 h-5 text-emerald-600" />
                  Nộp Phiếu Biên Nhận Sửa Chữa Mới
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitNewRepair} className="space-y-4">
                
                {/* Customer Section */}
                <div className="space-y-3">
                  <div className="flex gap-2 border-b border-slate-100 pb-2">
                    <button 
                      type="button" 
                      onClick={() => setCustomerMode('select')}
                      className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition ${customerMode === 'select' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                    >
                      Tìm Khách Hàng Sẵn Có
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCustomerMode('new')}
                      className={`flex-1 py-1 px-3 text-xs font-semibold rounded-md transition ${customerMode === 'new' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500'}`}
                    >
                      Khai Báo Khách Hàng Mới
                    </button>
                  </div>

                  {customerMode === 'select' ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Khách Hàng</label>
                        <select
                          value={selectedCustomerId}
                          onChange={e => setSelectedCustomerId(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                          required
                        >
                          <option value="">-- Chọn khách hàng sẵn có --</option>
                          {customers.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Họ & Tên *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Phạm Thế Anh"
                          value={newCustName}
                          onChange={e => setNewCustName(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Số điện thoại *</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 0938449x"
                          value={newCustPhone}
                          onChange={e => setNewCustPhone(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden focus:border-indigo-500"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Device Repair Section */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Tên Máy Hỏng *</label>
                    <input 
                      id="input-repair-device-name"
                      type="text"
                      required
                      placeholder="e.g. iPhone 14 Pro Max"
                      value={deviceName}
                      onChange={e => setDeviceName(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Số Serial / IMEI</label>
                    <input 
                      id="input-repair-device-serial"
                      type="text"
                      placeholder="e.g. IMEI-357482"
                      value={deviceSerial}
                      onChange={e => setDeviceSerial(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Dynamic alert lookup results inside the dialog */}
                {serialWarrantyStatus && (
                  <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-lg text-xs text-indigo-800 flex gap-1.5 items-center">
                    <AlertCircle className="w-4 h-4 shrink-0 text-indigo-600 animate-bounce" />
                    <div>
                      <p className="font-bold">Thiết bị mang IMEI/{deviceSerial} có thẻ bảo hành hoạt động!</p>
                      <p className="opacity-90">Hạn bảo hành đến ngày: {serialWarrantyStatus.expiryDate}. Có thể đủ điều kiện sửa miễn phí.</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Biểu hiện tình trạng hư hỏng *</label>
                  <textarea 
                    id="input-repair-issue"
                    required
                    rows={2}
                    placeholder="Mô tả lỗi: e.g. Bị ngấm nước, liệt phím nguồn, cảm ứng chập chờn..."
                    value={issueDescription}
                    onChange={e => setIssueDescription(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Báo giá ước tính (VND)</label>
                    <input 
                      id="input-repair-estimate"
                      type="number"
                      value={estimatedCost}
                      onChange={e => setEstimatedCost(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Kỹ thuật viên can thiệp *</label>
                    <select 
                      id="select-repair-technician"
                      value={technician}
                      onChange={e => setTechnician(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
                    >
                      {users.map(u => (
                        <option key={u.id} value={u.fullName}>
                          {u.fullName} ({u.role === 'technician' ? 'Kỹ thuật' : u.role === 'admin' ? 'Chủ' : 'Bán hàng'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Nhân viên tiếp quản tiếp nhận máy *</label>
                  <select
                    id="select-ticket-processed-by"
                    value={processedBy}
                    onChange={e => setProcessedBy(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden cursor-pointer"
                  >
                    {users.map(u => (
                      <option key={u.id} value={u.fullName}>
                        {u.fullName} ({u.role === 'admin' ? 'Chủ' : u.role === 'sales' ? 'Bán hàng' : 'Kỹ thuật'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Ghi chú tiếp quản máy</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Máy trầy nhẹ sườn viền màn hình, không kèm sạc..."
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    id="btn-confirm-add-repair"
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg cursor-pointer shadow-2xs"
                  >
                    Thiết lập phiếu nhận
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* IMEI Selector Modal For Repair Replacement */}
      <AnimatePresence>
        {selectingImeiForRepair && (
          <div className="fixed inset-0 z-51 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectingImeiForRepair(null)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-20 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <QrCode className="w-5 h-5 text-indigo-650" />
                    Chọn IMEI/Serial Linh Kiện Thay Thế
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-1 font-semibold">Sản phẩm: {selectingImeiForRepair.name}</p>
                </div>
                <button 
                  onClick={() => setSelectingImeiForRepair(null)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {imeis.filter(i => i.productId === selectingImeiForRepair.id && i.status === 'in_stock').map(i => (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => {
                      handleAddPart(selectingImeiForRepair, i.imei);
                      setSelectingImeiForRepair(null);
                    }}
                    className="w-full flex items-center justify-between p-3 border border-slate-150 hover:border-indigo-500 hover:bg-indigo-50/30 rounded-xl transition cursor-pointer text-left group"
                  >
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-800 group-hover:text-indigo-600">{i.imei}</span>
                      <span className="ml-2 px-1.5 py-0.5 text-[9px] font-black uppercase bg-emerald-50 text-emerald-650 rounded-sm">Sẵn kho</span>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition" />
                  </button>
                ))}

                {imeis.filter(i => i.productId === selectingImeiForRepair.id && i.status === 'in_stock').length === 0 && (
                  <div className="text-center py-6 text-xs text-slate-400 italic">
                    Không tìm thấy IMEI/Serial trống nào của mặt hàng này còn trong kho hàng
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                <button 
                  type="button" 
                  onClick={() => setSelectingImeiForRepair(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Đóng lại
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Repair Ticket / Invoice Modal */}
      <AnimatePresence>
        {showEditModal && editingTicket && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-2xl z-20 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                    <Edit3 className="w-5 h-5 text-amber-600" />
                    Chỉnh Sửa Hóa Đơn / Phiếu Sửa Chữa #{editingTicket.ticketNumber}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Cập nhật toàn bộ thông tin khách hàng, thiết bị, quy trình và chi phí sửa chữa</p>
                </div>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveEditTicket} className="space-y-4 text-xs">
                {/* Customer Section */}
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <UserIcon className="w-4 h-4 text-indigo-600" /> Thông Tin Khách Hàng
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Tên khách hàng (*)</label>
                      <input 
                        type="text" 
                        required
                        value={editCustomerName}
                        onChange={e => setEditCustomerName(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Số điện thoại (*)</label>
                      <input 
                        type="text" 
                        required
                        value={editCustomerPhone}
                        onChange={e => setEditCustomerPhone(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Device Section */}
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <Wrench className="w-4 h-4 text-indigo-600" /> Thông Tin Thiết Bị Sửa Chữa
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Tên thiết bị (*)</label>
                      <input 
                        type="text" 
                        required
                        value={editDeviceName}
                        onChange={e => setEditDeviceName(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Số Serial / IMEI máy</label>
                      <input 
                        type="text" 
                        value={editDeviceSerial}
                        onChange={e => setEditDeviceSerial(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-mono text-slate-900 focus:outline-hidden focus:border-indigo-500"
                        placeholder="Nhập Serial hoặc IMEI"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Mô tả hiện tượng lỗi / Yêu cầu khách (*)</label>
                    <textarea 
                      rows={2}
                      required
                      value={editIssueDescription}
                      onChange={e => setEditIssueDescription(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Technical & Solution Section */}
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <FileCheck2 className="w-4 h-4 text-indigo-600" /> Phương Án Xử Lý & Báo Giá Hóa Đơn
                  </p>
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">Giải pháp kỹ thuật / Linh kiện đã thay</label>
                    <textarea 
                      rows={2}
                      value={editSolution}
                      onChange={e => setEditSolution(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      placeholder="Mô tả các bước đã sửa chữa hoặc linh kiện thay thế..."
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Báo giá dự kiến (VNĐ)</label>
                      <input 
                        type="number" 
                        min={0}
                        step={1000}
                        value={editEstimatedCost}
                        onChange={e => setEditEstimatedCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Tổng hóa đơn thực tế (VNĐ)</label>
                      <input 
                        type="number" 
                        min={0}
                        step={1000}
                        value={editActualCost}
                        onChange={e => setEditActualCost(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-indigo-700 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Section for Replacement Parts in Edit Ticket Modal */}
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-800 flex items-center gap-1.5 text-sm">
                      <Wrench className="w-4 h-4 text-indigo-600" /> Linh Kiện Thay Thế / Xuất Kho ({editUsedParts.length})
                    </p>
                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                      Đồng bộ Kho & Hoá Đơn Bán
                    </span>
                  </div>

                  {/* Search and Add Component from Warehouse */}
                  <div className="relative">
                    <input 
                      type="text" 
                      placeholder="Tìm linh kiện kho để thêm (Tên, SKU)..."
                      value={editPartSearch}
                      onChange={e => setEditPartSearch(e.target.value)}
                      className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg text-xs font-medium text-slate-800 focus:outline-hidden focus:border-indigo-500"
                    />
                    {editPartSearch.trim().length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto z-20 p-1 divide-y divide-slate-100">
                        {products
                          .filter(p => p.name.toLowerCase().includes(editPartSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(editPartSearch.toLowerCase())))
                          .slice(0, 8)
                          .map(p => (
                            <div 
                              key={p.id}
                              onClick={() => {
                                handleAddEditPart(p);
                                setEditPartSearch('');
                              }}
                              className="p-2 hover:bg-indigo-50 cursor-pointer rounded-lg text-xs flex justify-between items-center transition"
                            >
                              <div>
                                <div className="font-bold text-slate-800">{p.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono">Tồn kho: {p.stock} chiếc | BH: {p.warrantyMonths ?? 0}T</div>
                              </div>
                              <span className="font-bold text-indigo-600">{formatVND(p.price)}</span>
                            </div>
                          ))}
                        {products.filter(p => p.name.toLowerCase().includes(editPartSearch.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(editPartSearch.toLowerCase()))).length === 0 && (
                          <div className="p-3 text-xs text-slate-400 text-center">Không tìm thấy linh kiện phù hợp</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* List of Edit Used Parts */}
                  {editUsedParts.length > 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-2 divide-y divide-slate-100 max-h-52 overflow-y-auto">
                      {editUsedParts.map((pt, idx) => (
                        <div key={idx} className="py-2 flex items-center justify-between text-xs gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 truncate">{pt.name}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                <span className="text-[10px] font-bold text-slate-600 shrink-0">🛡️ BH:</span>
                                <input 
                                  type="number"
                                  min={0}
                                  value={pt.warrantyMonths ?? 0}
                                  onChange={e => handleUpdateEditPartWarranty(idx, Number(e.target.value))}
                                  className="w-12 text-center font-bold text-emerald-700 bg-white border border-slate-200 rounded-sm text-[11px] focus:outline-hidden focus:border-indigo-500"
                                  title="Sửa thời hạn bảo hành cho linh kiện này (Tháng)"
                                />
                                <span className="text-[10px] font-bold text-slate-600 shrink-0">Tháng</span>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-500">Giá:</span>
                                <input 
                                  type="number"
                                  min={0}
                                  step={1000}
                                  value={pt.price}
                                  onChange={e => handleUpdateEditPartPrice(idx, Number(e.target.value))}
                                  className="w-24 bg-slate-50 border border-slate-200 rounded-md px-1.5 py-0.5 text-[10px] font-bold text-slate-700"
                                  title="Sửa đơn giá linh kiện"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Quantity control */}
                          <div className="flex items-center gap-1 shrink-0 bg-slate-100 p-1 rounded-lg border border-slate-200">
                            <button 
                              type="button" 
                              onClick={() => handleUpdateEditPartQty(idx, -1)}
                              className="w-5 h-5 bg-white rounded-md font-bold text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-xs"
                            >-</button>
                            <span className="w-6 text-center font-bold text-slate-800 text-xs">{pt.quantity}</span>
                            <button 
                              type="button" 
                              onClick={() => handleUpdateEditPartQty(idx, 1)}
                              className="w-5 h-5 bg-white rounded-md font-bold text-slate-700 hover:bg-slate-200 flex items-center justify-center cursor-pointer text-xs"
                            >+</button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => handleRemoveEditPart(idx)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-md transition cursor-pointer"
                            title="Xóa linh kiện"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-2 text-xs text-slate-400 italic bg-white border border-dashed border-slate-200 rounded-lg">
                      Chưa chọn linh kiện thay thế nào cho phiếu sửa chữa này
                    </div>
                  )}
                </div>

                {/* Personnel & Status Section */}
                <div className="bg-slate-50 p-3.5 rounded-xl space-y-3">
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-indigo-600" /> Nhân Sự & Trạng Thái Phiếu
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Trạng thái phiếu</label>
                      <select 
                        value={editStatus}
                        onChange={e => setEditStatus(e.target.value as RepairStatus)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-bold text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      >
                        <option value="checking">Mới nhận - Chờ kiểm tra</option>
                        <option value="repairing">Đang sửa chữa</option>
                        <option value="completed">Đã sửa xong - Chờ giao</option>
                        <option value="delivered">Đã hoàn thành & Bàn giao</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Nhân viên nhận máy (*)</label>
                      <select 
                        value={editProcessedBy}
                        onChange={e => setEditProcessedBy(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      >
                        {editProcessedBy && !users.some(u => u.fullName === editProcessedBy) && (
                          <option value={editProcessedBy}>{editProcessedBy}</option>
                        )}
                        {users.map(u => (
                          <option key={u.id} value={u.fullName}>
                            {u.fullName} ({u.role === 'admin' ? 'Chủ' : u.role === 'sales' ? 'Bán hàng' : 'Kỹ thuật'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Kỹ thuật viên phụ trách (*)</label>
                      <select 
                        value={editTechnician}
                        onChange={e => setEditTechnician(e.target.value)}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                      >
                        {editTechnician && !users.some(u => u.fullName === editTechnician) && (
                          <option value={editTechnician}>{editTechnician}</option>
                        )}
                        {users.map(u => (
                          <option key={u.id} value={u.fullName}>
                            {u.fullName} ({u.role === 'technician' ? 'Kỹ thuật' : u.role === 'admin' ? 'Chủ' : 'Bán hàng'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Ngày tiếp nhận</label>
                      <input 
                        type="date" 
                        value={editCreatedAt}
                        onChange={e => {
                          const val = e.target.value;
                          setEditCreatedAt(val);
                          if (editWarrantyMonthsInput !== '') {
                            const baseDate = editDeliveredAt || val || new Date().toISOString().slice(0, 10);
                            setEditWarrantyUntil(computeExpiryDate(baseDate, Number(editWarrantyMonthsInput)));
                          }
                        }}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-600 font-semibold mb-1">Ngày bàn giao</label>
                      <input 
                        type="date" 
                        value={editDeliveredAt}
                        onChange={e => {
                          const val = e.target.value;
                          setEditDeliveredAt(val);
                          if (editWarrantyMonthsInput !== '') {
                            const baseDate = val || editCreatedAt || new Date().toISOString().slice(0, 10);
                            setEditWarrantyUntil(computeExpiryDate(baseDate, Number(editWarrantyMonthsInput)));
                          }
                        }}
                        className="w-full bg-white border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Manual Warranty Customization Box */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-3 mt-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                      <label className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        Tùy Chỉnh Thời Gian & Hạn Bảo Hành Dịch Vụ Sửa Chữa
                      </label>
                      {suggestedWarrantyFromParts !== null && (
                        <button
                          type="button"
                          onClick={() => handleEditWarrantyMonthsChange(suggestedWarrantyFromParts)}
                          className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-md border border-indigo-200 transition cursor-pointer flex items-center gap-1"
                          title="Tự động đồng bộ thời hạn theo linh kiện thay thế cao nhất"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                          Đồng bộ linh kiện ({formatWarrantyText(suggestedWarrantyFromParts)})
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                          Số tháng bảo hành (Nhập thủ công)
                        </label>
                        <div className="relative">
                          <input 
                            type="number" 
                            min={0}
                            step={0.1}
                            value={editWarrantyMonthsInput}
                            onChange={e => handleEditWarrantyMonthsChange(Number(e.target.value))}
                            className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white text-xs"
                            placeholder="e.g. 1, 3, 6, 12, 24"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                            Tháng
                          </span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-slate-600 font-semibold mb-1 text-[11px]">
                          Hạn bảo hành đến ngày (Date picker)
                        </label>
                        <input 
                          type="date" 
                          value={editWarrantyUntil}
                          onChange={e => handleEditWarrantyDateChange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-bold text-slate-800 focus:outline-hidden focus:border-indigo-500 focus:bg-white text-xs"
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400 mb-1.5">Chọn nhanh thời hạn bảo hành:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { label: '0T (Không BH)', m: 0 },
                          { label: '3 Ngày', m: 0.1 },
                          { label: '7 Ngày', m: 0.2 },
                          { label: '1 Tháng', m: 1 },
                          { label: '2 Tháng', m: 2 },
                          { label: '3 Tháng', m: 3 },
                          { label: '6 Tháng', m: 6 },
                          { label: '12 Tháng', m: 12 },
                          { label: '24 Tháng', m: 24 },
                          { label: '36 Tháng', m: 36 },
                        ].map((btn) => (
                          <button
                            key={btn.label}
                            type="button"
                            onClick={() => handleEditWarrantyMonthsChange(btn.m)}
                            className={`px-2 py-1 font-bold text-[11px] rounded-md transition cursor-pointer border ${
                              Number(editWarrantyMonthsInput) === btn.m
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                                : 'bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border-slate-200'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Badge */}
                    {editWarrantyUntil && (
                      <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-lg text-emerald-800 font-bold text-xs flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          Thời gian BH: {formatWarrantyText(Number(editWarrantyMonthsInput) || 0)}
                        </span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-300 text-emerald-700">
                          Hạn đến: {editWarrantyUntil}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">Ghi chú bổ sung</label>
                  <textarea 
                    rows={2}
                    value={editNote}
                    onChange={e => setEditNote(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg font-medium text-slate-900 focus:outline-hidden focus:border-indigo-500"
                    placeholder="Ghi chú điều khoản, bảo hành, linh kiện khách mang tới..."
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" /> Lưu Hóa Đơn Sửa Chữa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Print Repair Invoice Modal */}
      <AnimatePresence>
        {showPrintModal && printingTicket && (
          <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPrintModal(false)}
              className="fixed inset-0 bg-black/40"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-3xl z-10 relative my-auto max-h-[92vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100 no-print">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                  <Printer className="w-5 h-5 text-indigo-600" />
                  Xem Trước & In Hóa Đơn Sửa Chữa #{printingTicket.ticketNumber}
                </h3>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => window.print()}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition"
                  >
                    <Printer className="w-4 h-4" /> In Ngay
                  </button>
                  <button 
                    onClick={() => setShowPrintModal(false)}
                    className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Printable Invoice Container */}
              <div id="printable-repair-invoice" className="p-6 border border-slate-200 rounded-xl bg-white space-y-6 text-slate-900 text-xs font-sans">
                {/* Store Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 gap-4">
                  <div className="flex items-center gap-3">
                    {printSettings?.showLogoSymbol !== false && (
                      <div className="shrink-0">
                        {printSettings?.storeLogoImage ? (
                          <img src={printSettings.storeLogoImage} style={{ width: `${printSettings?.storeLogoWidth || 90}px`, objectFit: 'contain' }} alt="Logo" />
                        ) : (
                          <div 
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-black shadow-xs shrink-0"
                            style={{ backgroundColor: printSettings?.primaryColor || '#4f46e5' }}
                          >
                            <span className="text-lg font-bold">{printSettings?.storeLogoText || "TP"}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div>
                      <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                        {printSettings?.storeName || 'CỬA HÀNG THIẾT BỊ MÁY TÍNH & DỊCH VỤ THỊNH PHÁT'}
                      </h2>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">{printSettings?.storeAddress || 'Địa chỉ: Trung Tâm Kỹ Thuật & Sửa Chữa Máy Tính'}</p>
                      <p className="text-xs text-slate-600 font-medium">Hotline / Zalo: <span className="font-bold text-slate-900">{printSettings?.storePhone || '0900.000.000'}</span></p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block bg-slate-900 text-white font-mono font-bold text-sm px-3 py-1 rounded-sm">
                      {printingTicket.ticketNumber}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Ngày lập: {printingTicket.createdAt ? printingTicket.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10)}
                    </p>
                  </div>
                </div>

                <div className="text-center py-1">
                  <h1 className="text-base font-black uppercase text-slate-900 tracking-wider">HÓA ĐƠN DỊCH VỤ SỬA CHỮA & BẢO HÀNH</h1>
                  <p className="text-[11px] text-slate-500 italic mt-0.5">Biên nhận dịch vụ kỹ thuật, thay thế linh kiện và bảo hành thiết bị</p>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-150">
                  <div className="space-y-1">
                    <p><span className="text-slate-500 font-semibold">Tên khách hàng:</span> <strong className="text-slate-900 text-sm">{printingTicket.customerName}</strong></p>
                    <p><span className="text-slate-500 font-semibold">Số điện thoại:</span> <strong className="text-slate-900">{printingTicket.customerPhone}</strong></p>
                    <p><span className="text-slate-500 font-semibold">Nhân viên nhận:</span> <span className="font-bold">{printingTicket.processedBy || 'Hệ thống'}</span></p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="text-slate-500 font-semibold">Tên thiết bị:</span> <strong className="text-slate-900 text-sm">{printingTicket.deviceName}</strong></p>
                    <p><span className="text-slate-500 font-semibold">Số Serial / IMEI:</span> <span className="font-mono font-bold text-slate-800">{printingTicket.deviceSerial || 'Chưa có'}</span></p>
                    <p><span className="text-slate-500 font-semibold">Kỹ thuật phụ trách:</span> <span className="font-bold">{printingTicket.technician}</span></p>
                  </div>
                </div>

                {/* Fault & Solution */}
                <div className="space-y-2">
                  <div className="border-l-4 border-rose-500 pl-3 py-1 bg-rose-50/50 rounded-r-lg">
                    <p className="text-slate-500 font-semibold text-[11px]">Hiện tượng lỗi tiếp nhận:</p>
                    <p className="font-bold text-slate-800">{printingTicket.issueDescription}</p>
                  </div>
                  {printingTicket.solution && (
                    <div className="border-l-4 border-emerald-500 pl-3 py-1 bg-emerald-50/50 rounded-r-lg">
                      <p className="text-slate-500 font-semibold text-[11px]">Giải pháp xử lý kỹ thuật / Linh kiện:</p>
                      <p className="font-bold text-emerald-800">{printingTicket.solution}</p>
                    </div>
                  )}
                </div>

                {/* Used parts table if any */}
                {printingTicket.usedParts && printingTicket.usedParts.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">Linh kiện thay thế:</p>
                    <table className="w-full text-left border-collapse border border-slate-200">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 text-[11px]">
                          <th className="p-2 border border-slate-200 font-bold text-center">STT</th>
                          <th className="p-2 border border-slate-200 font-bold">Tên linh kiện</th>
                          <th className="p-2 border border-slate-200 font-bold text-center">SL</th>
                          <th className="p-2 border border-slate-200 font-bold text-right">Đơn giá</th>
                          <th className="p-2 border border-slate-200 font-bold text-center">Bảo hành linh kiện</th>
                          <th className="p-2 border border-slate-200 font-bold text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {printingTicket.usedParts.map((part, idx) => {
                          const warrInfo = getPartWarrantyInfo(part, printingTicket.deliveredAt || printingTicket.createdAt.slice(0, 10), products);
                          return (
                            <tr key={idx} className="border-b border-slate-150">
                              <td className="p-2 border border-slate-200 text-center font-medium">{idx + 1}</td>
                              <td className="p-2 border border-slate-200 font-semibold text-slate-900">{part.name}</td>
                              <td className="p-2 border border-slate-200 text-center font-bold">{part.quantity}</td>
                              <td className="p-2 border border-slate-200 text-right font-mono">{formatVND(part.price)}</td>
                              <td className="p-2 border border-slate-200 text-center">
                                <span className="inline-block px-2 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 font-extrabold text-[10.5px] rounded">
                                  🛡️ {warrInfo.warrantyText}
                                </span>
                                {warrInfo.expiryDate && (
                                  <p className="text-[9.5px] text-slate-500 font-medium mt-0.5">Hạn BH: {warrInfo.expiryDate}</p>
                                )}
                              </td>
                              <td className="p-2 border border-slate-200 text-right font-bold text-slate-900 font-mono">{formatVND(part.price * part.quantity)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Costs Summary */}
                <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-end">
                  <div className="space-y-1 text-[11px]">
                    <p><span className="text-slate-500 font-semibold">Ngày bàn giao:</span> <strong className="text-slate-900">{printingTicket.deliveredAt || new Date().toISOString().slice(0, 10)}</strong></p>
                    {printingTicket.warrantyUntil && (
                      <p><span className="text-slate-500 font-semibold">Hạn bảo hành dịch vụ:</span> <strong className="text-emerald-700 font-bold">{printingTicket.warrantyUntil}</strong></p>
                    )}
                    {printingTicket.note && (
                      <p><span className="text-slate-500 font-semibold">Ghi chú:</span> <span className="italic">{printingTicket.note}</span></p>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-xs text-slate-500">Báo giá dự kiến: <span className="font-semibold">{formatVND(printingTicket.estimatedCost)}</span></p>
                    <p className="text-sm font-black text-slate-900 uppercase">
                      TỔNG THANH TOÁN: <span className="text-indigo-700 text-base">{formatVND(printingTicket.actualCost || printingTicket.estimatedCost)}</span>
                    </p>
                  </div>
                </div>

                {/* Bank / QR Payment Section */}
                {printSettings?.bankId && printSettings?.bankAccountNo && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <div>
                      <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-1">Thông tin thanh toán chuyển khoản:</p>
                      <p>Ngân hàng: <strong className="text-slate-900">{formatBankName(printSettings.bankId)}</strong></p>
                      <p>Số tài khoản: <strong className="font-mono text-slate-900">{printSettings.bankAccountNo}</strong></p>
                      <p>Chủ tài khoản: <strong className="text-slate-900 uppercase">{formatAccountName(printSettings.bankAccountName || '')}</strong></p>
                    </div>
                    {printSettings.bankId && printSettings.bankAccountNo && (
                      <div className="shrink-0 text-center">
                        <img 
                          src={`https://img.vietqr.io/image/${printSettings.bankId}-${printSettings.bankAccountNo}-compact.png?amount=${printingTicket.actualCost || printingTicket.estimatedCost}&addInfo=Sua%20chua%20${printingTicket.ticketNumber}&accountName=${encodeURIComponent(formatAccountName(printSettings.bankAccountName || ''))}`}
                          alt="VietQR Chuyển Khoản"
                          className="w-24 h-24 object-contain border border-slate-200 rounded-lg bg-white p-1"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-8 text-center pt-6 text-xs">
                  <div>
                    <p className="font-bold text-slate-900">KHÁCH HÀNG XÁC NHẬN</p>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold text-slate-800">{printingTicket.customerName}</p>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">ĐẠI DIỆN CỬA HÀNG / KỸ THUẬT</p>
                    <p className="text-[10px] text-slate-500 italic mt-0.5">(Ký, ghi rõ họ tên)</p>
                    <div className="h-16"></div>
                    <p className="font-bold text-slate-800">{printingTicket.technician || printingTicket.processedBy || 'Kỹ thuật viên'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end gap-2 no-print">
                <button 
                  type="button" 
                  onClick={() => setShowPrintModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition"
                >
                  Đóng lại
                </button>
                <button 
                  type="button" 
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" /> In Hóa Đơn Sửa Chữa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </div>
  );
}
