import React, { useState, useMemo } from 'react';
import { 
  Product, 
  Category, 
  Supplier, 
  ProductIMEI, 
  User, 
  formatWarrantyText, 
  getUserPermissions 
} from '../types';
import { 
  Package, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  X, 
  Layers 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  imeis: ProductIMEI[];
  currentUser: User;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (id: string) => void;
  onAddCategory: (name: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onUpdateImeis: (imeis: ProductIMEI[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  suppliers,
  imeis,
  currentUser,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onUpdateImeis
}) => {
  // Active sub-tab ('products' | 'categories')
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('Tất cả');

  // Add Product Modal State
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    sku: '',
    price: 0,
    cost: 0,
    stock: 10,
    warrantyMonths: 12,
    category: '',
    hasImei: false,
    supplierId: ''
  });

  // Edit Product Modal State
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Category Management States
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const formatVND = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value || 0);
  };

  // Filter products by search & category
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchCat = selectedCategoryFilter === 'Tất cả' || p.category === selectedCategoryFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchQuery = !q || p.name.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q));
      return matchCat && matchQuery;
    });
  }, [products, selectedCategoryFilter, searchQuery]);

  // Handle Add Product Submit with AUTO SKU GENERATION
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim()) {
      alert('Vui lòng nhập tên sản phẩm.');
      return;
    }

    // AUTO SKU GENERATION if left empty
    const autoSku = newProductForm.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`;
    const cat = newProductForm.category || (categories.length > 0 ? categories[0].name : 'Khác');

    onAddProduct({
      name: newProductForm.name.trim(),
      sku: autoSku,
      price: Number(newProductForm.price) || 0,
      cost: Number(newProductForm.cost) || 0,
      // If no IMEI, stock increments normally from input!
      stock: newProductForm.hasImei ? 0 : Number(newProductForm.stock) || 0,
      warrantyMonths: Number(newProductForm.warrantyMonths) || 12,
      category: cat,
      hasImei: Boolean(newProductForm.hasImei),
      supplierId: newProductForm.supplierId || undefined
    });

    setShowAddProductModal(false);
    setNewProductForm({
      name: '',
      sku: '',
      price: 0,
      cost: 0,
      stock: 10,
      warrantyMonths: 12,
      category: '',
      hasImei: false,
      supplierId: ''
    });
    alert(`Đã thêm sản phẩm "${newProductForm.name}" thành công (SKU: ${autoSku})!`);
  };

  // Handle Edit Product Submit
  const handleEditProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !editingProduct.name.trim()) return;

    onUpdateProduct({
      ...editingProduct
    });

    setShowEditProductModal(false);
    setEditingProduct(null);
    alert('Đã cập nhật sản phẩm thành công!');
  };

  // Handle Category Deletion with Product Attachment Constraint Check
  const handleDeleteCategoryConfirm = (cat: Category) => {
    // Check if any product is using this category
    const usedProducts = products.filter(p => p.category === cat.name);
    if (usedProducts.length > 0) {
      alert(`⚠️ Không thể xóa danh mục "${cat.name}" vì đang có ${usedProducts.length} sản phẩm đang gắn danh mục này! Vui lòng chuyển các sản phẩm sang danh mục khác trước khi xóa.`);
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn xóa danh mục "${cat.name}" không?`)) {
      onDeleteCategory(cat.id);
      alert(`Đã xóa danh mục "${cat.name}".`);
    }
  };

  // Add Category
  const handleAddCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCategoryInput.trim();
    if (!name) return;

    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert(`Danh mục "${name}" đã tồn tại!`);
      return;
    }

    onAddCategory(name);
    setNewCategoryInput('');
    alert(`Đã thêm danh mục "${name}"!`);
  };

  // Direct Stock Adjustment for Non-IMEI items (Bug Fix)
  const handleDirectStockIncrement = (product: Product, delta: number) => {
    if (product.hasImei) {
      alert('Sản phẩm quản lý theo Serial/IMEI. Vui lòng thêm/xóa mã IMEI trong bảng quản lý IMEI.');
      return;
    }

    const newStock = Math.max(0, product.stock + delta);
    onUpdateProduct({
      ...product,
      stock: newStock
    });
  };

  return (
    <div className="space-y-4">
      
      {/* Top Banner & Sub-tab Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 bento-shadow flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" />
            Quản Lý Kho Hàng & Danh Mục Sản Phẩm
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Kiểm soát tồn kho thực tế, bảo lưu giá vốn, sinh mã SKU tự động và quản lý mã Serial/IMEI.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 border border-slate-200">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'products'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Sản Phẩm ({products.length})
            </button>

            <button
              onClick={() => setActiveTab('categories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'categories'
                  ? 'bg-white text-indigo-700 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Danh Mục ({categories.length})
            </button>
          </div>

          {activeTab === 'products' && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-sm shadow-indigo-200"
            >
              <Plus className="w-4 h-4" />
              Thêm Sản Phẩm Mới
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PRODUCT LIST & KHO HÀNG */}
      {/* ========================================================================= */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-2xl border border-slate-200 bento-shadow p-4 space-y-3">
          
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Tìm theo tên linh kiện, mã SKU..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:border-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Danh mục:</span>
              <select
                value={selectedCategoryFilter}
                onChange={e => setSelectedCategoryFilter(e.target.value)}
                className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl p-2 cursor-pointer"
              >
                <option value="Tất cả">Tất cả danh mục</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3 px-3">Mã SKU</th>
                  <th className="py-3 px-3">Tên Linh Kiện / Sản Phẩm</th>
                  <th className="py-3 px-3">Danh Mục</th>
                  {currentUser.role === 'admin' && (
                    <th className="py-3 px-3 text-rose-600">Giá Nhập (Vốn)</th>
                  )}
                  <th className="py-3 px-3 text-emerald-600">Giá Bán Lẻ</th>
                  <th className="py-3 px-3">Bảo Hành</th>
                  <th className="py-3 px-3">Tồn Kho</th>
                  <th className="py-3 px-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(prod => {
                  const inStock = prod.hasImei 
                    ? imeis.filter(i => i.productId === prod.id && i.status === 'in_stock').length 
                    : prod.stock;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-3 font-mono font-bold text-slate-600">
                        {prod.sku || '---'}
                      </td>

                      <td className="py-3 px-3 font-semibold text-slate-800">
                        <div>{prod.name}</div>
                        {prod.hasImei && (
                          <span className="text-[9px] font-extrabold bg-indigo-50 text-indigo-600 px-1.5 py-0.2 rounded border border-indigo-100 inline-block mt-0.5">
                            Quản lý IMEI
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium text-[11px]">
                          {prod.category}
                        </span>
                      </td>

                      {currentUser.role === 'admin' && (
                        <td className="py-3 px-3 font-mono font-bold text-rose-600">
                          {prod.cost ? formatVND(prod.cost) : '---'}
                        </td>
                      )}

                      <td className="py-3 px-3 font-mono font-bold text-emerald-600">
                        {formatVND(prod.price)}
                      </td>

                      <td className="py-3 px-3 text-slate-500">
                        {formatWarrantyText(prod.warrantyMonths || 12)}
                      </td>

                      {/* Stock Adjustment Controls */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1.5">
                          {!prod.hasImei && (
                            <button
                              onClick={() => handleDirectStockIncrement(prod, -1)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer font-bold"
                              title="Giảm 1 tồn kho"
                            >
                              -
                            </button>
                          )}
                          <span className="font-mono font-black text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                            {inStock} pcs
                          </span>
                          {!prod.hasImei && (
                            <button
                              onClick={() => handleDirectStockIncrement(prod, 1)}
                              className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer font-bold"
                              title="Cộng 1 tồn kho"
                            >
                              +
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingProduct(prod);
                              setShowEditProductModal(true);
                            }}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                            title="Chỉnh sửa sản phẩm"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {currentUser.role === 'admin' && (
                            <button
                              onClick={() => {
                                if (confirm(`Xóa sản phẩm "${prod.name}"?`)) {
                                  onDeleteProduct(prod.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer border border-rose-200"
                              title="Xóa sản phẩm"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                      Không tìm thấy sản phẩm nào trong kho.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUẢN LÝ DANH MỤC SẢN PHẨM */}
      {/* ========================================================================= */}
      {activeTab === 'categories' && (
        <div className="bg-white rounded-2xl border border-slate-200 bento-shadow p-5 space-y-4 max-w-2xl mx-auto">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Thêm & Quản Lý Danh Mục Nhóm Hóa
          </h3>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategorySubmit} className="flex gap-2">
            <input 
              type="text"
              placeholder="Nhập tên danh mục mới (e.g. Card Màn Hình, SSD NVMe...)"
              value={newCategoryInput}
              onChange={e => setNewCategoryInput(e.target.value)}
              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-hidden focus:border-indigo-500"
            />
            <button
              type="submit"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition cursor-pointer"
            >
              + Thêm Danh Mục
            </button>
          </form>

          {/* Category List */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {categories.map(cat => {
              const productCount = products.filter(p => p.category === cat.name).length;

              return (
                <div key={cat.id} className="p-3 text-xs flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <span className="font-bold text-slate-800">{cat.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      ({productCount} sản phẩm đang dùng)
                    </span>
                  </div>

                  <button
                    onClick={() => handleDeleteCategoryConfirm(cat)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg cursor-pointer border border-rose-200"
                    title="Xóa danh mục"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL THÊM SẢN PHẨM MỚI */}
      <AnimatePresence>
        {showAddProductModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full p-5 bento-shadow space-y-4"
            >
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="font-bold text-slate-900 text-sm">Thêm Sản Phẩm Mới Vào Kho</h3>
                <button onClick={() => setShowAddProductModal(false)} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddProductSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tên sản phẩm *</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Card màn hình RTX 4060..."
                    value={newProductForm.name}
                    onChange={e => setNewProductForm({ ...newProductForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Mã SKU (Tự sinh nếu trống)</label>
                    <input 
                      type="text"
                      placeholder="SKU-XXXX"
                      value={newProductForm.sku}
                      onChange={e => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Danh mục *</label>
                    <select
                      value={newProductForm.category}
                      onChange={e => setNewProductForm({ ...newProductForm, category: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold cursor-pointer"
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-rose-600 mb-1">Giá vốn (Giá nhập)</label>
                    <input 
                      type="number"
                      placeholder="e.g. 5000000"
                      value={newProductForm.cost || ''}
                      onChange={e => setNewProductForm({ ...newProductForm, cost: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-rose-600"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-emerald-600 mb-1">Giá bán lẻ *</label>
                    <input 
                      type="number"
                      required
                      placeholder="e.g. 6500000"
                      value={newProductForm.price || ''}
                      onChange={e => setNewProductForm({ ...newProductForm, price: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-emerald-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tồn kho ban đầu</label>
                    <input 
                      type="number"
                      min={0}
                      value={newProductForm.stock}
                      onChange={e => setNewProductForm({ ...newProductForm, stock: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Thời gian bảo hành</label>
                    <select
                      value={newProductForm.warrantyMonths}
                      onChange={e => setNewProductForm({ ...newProductForm, warrantyMonths: Number(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold cursor-pointer"
                    >
                      <option value={12}>12 Tháng</option>
                      <option value={24}>24 Tháng</option>
                      <option value={36}>36 Tháng</option>
                      <option value={60}>60 Tháng (5 Năm)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowAddProductModal(false)}
                    className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Hủy Bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl"
                  >
                    Xác Nhận Lưu Kho
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default InventoryView;
