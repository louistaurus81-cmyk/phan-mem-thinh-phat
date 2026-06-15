import React, { useState, useMemo } from 'react';
import { Supplier, Product } from '../types';
import { 
  Building2, 
  Search, 
  Plus, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Edit3, 
  Trash2, 
  X,
  Package,
  TrendingUp,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SupplierManagerProps {
  suppliers: Supplier[];
  onUpdateSuppliers: (updated: Supplier[]) => void;
  products: Product[];
  onUpdateProduct?: (p: Product) => void;
}

export default function SupplierManager({ suppliers, onUpdateSuppliers, products }: SupplierManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Active selected supplier to inspect custom products imports
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Modals controllers
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Form states
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: ''
  });

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  };

  // Filter supplier list
  const filteredSuppliers = useMemo(() => {
    if (!searchQuery.trim()) return suppliers;
    const query = searchQuery.toLowerCase();
    return suppliers.filter(s => 
      s.name.toLowerCase().includes(query) ||
      (s.contactPerson && s.contactPerson.toLowerCase().includes(query)) ||
      (s.phone && s.phone.includes(query)) ||
      (s.address && s.address.toLowerCase().includes(query))
    );
  }, [suppliers, searchQuery]);

  // Compute stats for active selected supplier
  const supplierStats = useMemo(() => {
    const stats: Record<string, { productCount: number; totalCostValue: number }> = {};
    
    suppliers.forEach(s => {
      stats[s.id] = { productCount: 0, totalCostValue: 0 };
    });

    products.forEach(p => {
      if (p.supplierId && stats[p.supplierId]) {
        stats[p.supplierId].productCount += 1;
        stats[p.supplierId].totalCostValue += (p.cost * p.stock);
      }
    });

    return stats;
  }, [suppliers, products]);

  // Handle adding new supplier
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.name.trim()) {
      alert('Vui lòng nhập tên nhà cung cấp.');
      return;
    }

    const newSupplier: Supplier = {
      id: `supp_${Date.now()}`,
      name: supplierForm.name.trim(),
      contactPerson: supplierForm.contactPerson.trim() || undefined,
      phone: supplierForm.phone.trim() || undefined,
      email: supplierForm.email.trim() || undefined,
      address: supplierForm.address.trim() || undefined
    };

    onUpdateSuppliers([...suppliers, newSupplier]);
    setShowAddModal(false);
    setSupplierForm({ name: '', contactPerson: '', phone: '', email: '', address: '' });
    alert(`Đã thêm nhà cung cấp ${newSupplier.name} thành công!`);
  };

  // Handle editing supplier
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name.trim()) {
      alert('Vui lòng nhập tên nhà cung cấp.');
      return;
    }

    const updatedSuppliers = suppliers.map(s => s.id === editingSupplier.id ? editingSupplier : s);
    onUpdateSuppliers(updatedSuppliers);
    setShowEditModal(false);
    setEditingSupplier(null);
    alert('Đã cập nhật thông tin nhà cung cấp thành công!');
  };

  // Handle deleting supplier
  const handleDeleteSupplier = (id: string, name: string) => {
    const isUsed = products.some(p => p.supplierId === id);
    if (isUsed) {
      alert(`Không thể xóa nhà cung cấp "${name}" vì đang có sản phẩm trong kho được nhập từ đối tác này. Hãy đổi nhà cung cấp của sản phẩm trước.`);
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${name}" khỏi danh mục không?`)) {
      return;
    }

    const updated = suppliers.filter(s => s.id !== id);
    onUpdateSuppliers(updated);
    if (selectedSupplierId === id) setSelectedSupplierId(null);
    alert('Đã xóa nhà cung cấp khỏi hệ thống.');
  };

  // Filter products matching current inspection scope
  const linkedProducts = useMemo(() => {
    if (!selectedSupplierId) return [];
    return products.filter(p => p.supplierId === selectedSupplierId);
  }, [products, selectedSupplierId]);

  const activeSupplier = useMemo(() => {
    return suppliers.find(s => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId]);

  return (
    <div className="space-y-6">
      
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-xl border-2 border-slate-200 bento-shadow">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">🏢</span> Quản Lý Nhà Cung Cấp & Bảo Hành
          </h2>
          <p className="text-slate-500 text-xs mt-0.5 font-sans">Tìm kiếm nhà phân phối xuất xứ linh kiện, quản lý quan hệ đối tác và tra cứu nguồn bảo hành chính hãng.</p>
        </div>
        <button 
          id="btn-add-supplier"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition px-3.5 py-2.5 rounded-xl cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" /> Thêm nhà cung cấp mới
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Suppliers Database List: Left column (col-span-2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 bento-shadow overflow-hidden">
            <div className="p-4 bg-slate-50/60 border-b border-slate-100 flex justify-between items-center gap-4">
              <span className="text-xs font-bold text-slate-800 uppercase font-mono">Đối Tác Đã Hợp Tác ({suppliers.length})</span>
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Tìm đối tác..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden"
                />
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {filteredSuppliers.map(sup => {
                const isSelected = selectedSupplierId === sup.id;
                const stats = supplierStats[sup.id] || { productCount: 0, totalCostValue: 0 };
                return (
                  <div 
                    key={sup.id}
                    onClick={() => setSelectedSupplierId(sup.id)}
                    className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition duration-150 cursor-pointer ${
                      isSelected ? 'bg-indigo-50/50 border-l-4 border-indigo-600' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="space-y-1 w-full max-w-md">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                        {sup.name}
                        {stats.productCount > 0 && (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full font-mono font-bold">
                            {stats.productCount} SP nhập
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-500 font-medium text-[11px]">
                        {sup.contactPerson && <div className="flex items-center gap-1 truncate"><User className="w-3 h-3 text-slate-400" /> {sup.contactPerson}</div>}
                        {sup.phone && <div className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3 text-slate-400" /> {sup.phone}</div>}
                        {sup.email && <div className="flex items-center gap-1 truncate"><Mail className="w-3 h-3 text-slate-400" /> {sup.email}</div>}
                        {sup.address && <div className="flex items-center gap-1 col-span-2 truncate"><MapPin className="w-3 h-3 text-slate-400" /> {sup.address}</div>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      <div className="text-right sm:block hidden">
                        <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Tổng nhập kho</div>
                        <div className="text-xs font-bold text-slate-800">{formatVND(stats.totalCostValue)}</div>
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingSupplier(sup);
                          setShowEditModal(true);
                        }}
                        className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition text-[11px] font-bold inline-flex items-center gap-0.5 cursor-pointer"
                        title="Sửa thông tin"
                      >
                        <Edit3 className="w-3 h-3" /> Sửa
                      </button>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSupplier(sup.id, sup.name);
                        }}
                        className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-500 rounded-md transition cursor-pointer"
                        title="Xóa nhà phân phối"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredSuppliers.length === 0 && (
                <div className="text-center py-10 text-slate-400 italic text-xs">
                  Không tìm thấy nhà phân phối nào phù hợp. Nhấp "Thêm nhà cung cấp mới" để lưu trữ đối tác mới.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product warranty inventory inspection tool: Right column */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 bento-shadow p-5 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1.5">
              <Package className="w-4 h-4 text-amber-500" /> Tra Cứu Bảo Hành Nguồn Hàng
            </h3>

            {activeSupplier ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150">
                  <div className="text-xs font-bold text-slate-800">{activeSupplier.name}</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-mono">
                    LH: {activeSupplier.contactPerson || 'Không rõ'} | ĐT: {activeSupplier.phone || 'N/A'}
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Danh sách hàng hóa nhập ({linkedProducts.length})</p>
                  
                  <div className="max-h-[300px] overflow-y-auto divide-y divide-slate-100 space-y-2 pr-1">
                    {linkedProducts.map(p => (
                      <div key={p.id} className="pt-2 text-xs">
                        <div className="font-bold text-slate-800 flex justify-between items-start gap-2">
                          <span className="truncate">{p.name}</span>
                          <span className="shrink-0 text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px] font-mono">{p.warrantyMonths}T Bảo hành</span>
                        </div>
                        <div className="flex justify-between text-slate-400 font-mono mt-0.5 text-[10px]">
                          <span>SKU: {p.sku}</span>
                          <span>Kho còn: <strong className="text-slate-600">{p.stock} pcs</strong></span>
                        </div>
                      </div>
                    ))}
                    {linkedProducts.length === 0 && (
                      <p className="text-center py-6 text-slate-400 italic text-[11px]">
                        Nhập kho chưa gán liên kết sản phẩm này với nhà cung cấp "{activeSupplier.name}"
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 italic text-xs space-y-2">
                <p>Nhấp vào một đối tác nhà cung cấp ở cột trái để tra cứu chi tiết những dòng sản phẩm, linh kiện chính hãng do họ phân phối phục vụ bảo hành.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Add Supplier Modal */}
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
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase">Thêm Nhà Cung Cấp Đối Tác</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tên nhà cung cấp / Nhà phân phối *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Tổng kho phụ kiện miền nam"
                    value={supplierForm.name}
                    onChange={e => setSupplierForm({...supplierForm, name: e.target.value})}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden text-indigo-600 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Người liên hệ chính</label>
                    <input 
                      type="text"
                      placeholder="e.g. Anh Nguyễn Công Danh"
                      value={supplierForm.contactPerson}
                      onChange={e => setSupplierForm({...supplierForm, contactPerson: e.target.value})}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Số điện thoại</label>
                    <input 
                      type="text"
                      placeholder="e.g. 091xxxxx"
                      value={supplierForm.phone}
                      onChange={e => setSupplierForm({...supplierForm, phone: e.target.value})}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Địa chỉ hòm thư Email</label>
                  <input 
                    type="email"
                    placeholder="e.g. distribution@domain.com"
                    value={supplierForm.email}
                    onChange={e => setSupplierForm({...supplierForm, email: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Văn phòng / Địa chỉ gửi bảo hành</label>
                  <input 
                    type="text"
                    placeholder="e.g. Số 123 Đường Điện Biên Phủ, Quận 10, TP.HCM"
                    value={supplierForm.address}
                    onChange={e => setSupplierForm({...supplierForm, address: e.target.value})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="pt-4 border-t border-slate-150 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Tạo nhà cung cấp
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Supplier Modal */}
      <AnimatePresence>
        {showEditModal && editingSupplier && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowEditModal(false);
                setEditingSupplier(null);
              }}
              className="fixed inset-0 bg-black"
            />
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-md z-10 relative"
            >
              <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase">Sửa Thông Tin: {editingSupplier.name}</h3>
                <button 
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSupplier(null);
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Tên nhà cung cấp / Nhà phân phối *</label>
                  <input 
                    type="text"
                    required
                    value={editingSupplier.name}
                    onChange={e => setEditingSupplier({...editingSupplier, name: e.target.value})}
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden text-indigo-600 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Người liên hệ chính</label>
                    <input 
                      type="text"
                      value={editingSupplier.contactPerson || ''}
                      onChange={e => setEditingSupplier({...editingSupplier, contactPerson: e.target.value || undefined})}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Số điện thoại</label>
                    <input 
                      type="text"
                      value={editingSupplier.phone || ''}
                      onChange={e => setEditingSupplier({...editingSupplier, phone: e.target.value || undefined})}
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Địa chỉ hòm thư Email</label>
                  <input 
                    type="email"
                    value={editingSupplier.email || ''}
                    onChange={e => setEditingSupplier({...editingSupplier, email: e.target.value || undefined})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Văn phòng / Địa chỉ gửi bảo hành</label>
                  <input 
                    type="text"
                    value={editingSupplier.address || ''}
                    onChange={e => setEditingSupplier({...editingSupplier, address: e.target.value || undefined})}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-hidden"
                  />
                </div>

                <div className="pt-4 border-t border-slate-150 flex gap-3 justify-end">
                  <button 
                    type="button" 
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingSupplier(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
